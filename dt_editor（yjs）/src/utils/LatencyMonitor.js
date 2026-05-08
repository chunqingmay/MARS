/**
 * LatencyMonitor.js
 * 协同操作延迟测量工具
 * 
 * 功能：
 * 1. WebSocket RTT 实时测量（ping-pong）
 * 2. 操作同步延迟测量（同一操作到达两端的时间差）
 * 3. 事件序列号追踪
 */

import { getSyncClock } from './SyncClock';

class LatencyMonitor {
  constructor(ws, options = {}) {
    this.ws = ws;
    this.syncClock = getSyncClock();
    
    // 配置
    this.pingInterval = options.pingInterval || 2000; // 每2秒测一次RTT
    this.maxHistory = options.maxHistory || 100; // 保留最近100条记录
    
    // 状态
    this.isRunning = false;
    this.rtt = null; // 当前RTT
    this.rttHistory = []; // RTT历史
    this.opLatencyHistory = []; // 操作延迟历史
    this.pendingPings = new Map(); // 待回复的ping
    
    // 事件计数器
    this.localEventSeq = 0;
    this.receivedEvents = new Map(); // seq -> {sendTime, recvTime}
    
    // 定时器
    this.pingTimer = null;
    
    // 绑定消息处理
    this._handleMessage = this._handleMessage.bind(this);
    if (this.ws) {
      this.ws.addEventListener('message', this._handleMessage);
    }
  }

  /**
   * 开始测量
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // 等待时钟同步完成后开始ping
    this.syncClock.sync().then(() => {
      this._startPingLoop();
    });
  }

  /**
   * 停止测量
   */
  stop() {
    this.isRunning = false;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.removeEventListener('message', this._handleMessage);
    }
  }

  /**
   * 发送一个带时间戳的操作，用于测量同步延迟
   * @param {string} action - 操作类型，如 'insert', 'delete'
   * @param {object} payload - 操作数据
   */
  sendOperation(action, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[LatencyMonitor] WebSocket 未连接');
      return null;
    }
    
    this.localEventSeq++;
    const seq = this.localEventSeq;
    const sendTime = this.syncClock.now();
    
    const message = {
      type: 'broadcast',
      action,
      seq,
      sendTime,
      payload
    };
    
    this.ws.send(JSON.stringify(message));
    
    // 记录发送
    this.receivedEvents.set(`local_${seq}`, {
      seq,
      action,
      sendTime,
      direction: 'send'
    });
    
    return { seq, sendTime };
  }

  /**
   * 收到远程操作时的处理（测量延迟）
   * 调用此方法记录远程操作的到达时间
   */
  onRemoteOperation(seq, sendTime, action = 'unknown') {
    const recvTime = this.syncClock.now();
    const latency = recvTime - sendTime;
    
    const record = {
      seq,
      action,
      sendTime,
      recvTime,
      latency: Math.max(0, latency), // 防止负值（时钟微调时）
      timestamp: Date.now()
    };
    
    this.opLatencyHistory.push(record);
    if (this.opLatencyHistory.length > this.maxHistory) {
      this.opLatencyHistory.shift();
    }
    
    console.log(`[LatencyMonitor] 操作延迟 | ${action}#${seq} | ${latency.toFixed(2)}ms`);
    return record;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const rttStats = this._calcStats(this.rttHistory.map(r => r.rtt));
    const opStats = this._calcStats(this.opLatencyHistory.map(r => r.latency));
    
    return {
      rtt: {
        current: this.rtt,
        ...rttStats
      },
      operationLatency: opStats,
      clock: this.syncClock.getStatus(),
      samples: {
        rtt: this.rttHistory.length,
        operations: this.opLatencyHistory.length
      }
    };
  }

  /**
   * 打印统计报告到控制台
   */
  printReport() {
    const stats = this.getStats();
    console.table({
      '当前 RTT': `${stats.rtt.current?.toFixed(2) ?? 'N/A'} ms`,
      'RTT 平均': `${stats.rtt.avg?.toFixed(2) ?? 'N/A'} ms`,
      'RTT 最小': `${stats.rtt.min?.toFixed(2) ?? 'N/A'} ms`,
      'RTT 最大': `${stats.rtt.max?.toFixed(2) ?? 'N/A'} ms`,
      '---': '---',
      '操作延迟平均': `${stats.operationLatency.avg?.toFixed(2) ?? 'N/A'} ms`,
      '操作延迟最小': `${stats.operationLatency.min?.toFixed(2) ?? 'N/A'} ms`,
      '操作延迟最大': `${stats.operationLatency.max?.toFixed(2) ?? 'N/A'} ms`,
      '操作延迟标准差': `${stats.operationLatency.std?.toFixed(2) ?? 'N/A'} ms`,
      '---2': '---',
      '时钟偏移': `${stats.clock.offset?.toFixed(2) ?? 'N/A'} ms`,
      '本地漂移': `${stats.clock.drift?.toFixed(2) ?? 'N/A'} ms`
    });
  }

  // ============ 内部方法 ============

  _startPingLoop() {
    this.pingTimer = setInterval(() => this._ping(), this.pingInterval);
    this._ping(); // 立即执行一次
  }

  _ping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const id = Math.random().toString(36).slice(2);
    const t0 = performance.now();
    
    this.pendingPings.set(id, { t0 });
    this.ws.send(JSON.stringify({ type: 'ping', id }));
    
    // 超时清理
    setTimeout(() => {
      if (this.pendingPings.has(id)) {
        this.pendingPings.delete(id);
      }
    }, 5000);
  }

  _handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      // 二进制消息（Yjs），忽略
      return;
    }
    
    // 处理 pong（RTT 测量）
    if (data.type === 'pong') {
      const pending = this.pendingPings.get(data.id);
      if (pending) {
        const rtt = performance.now() - pending.t0;
        this.rtt = rtt;
        this.rttHistory.push({ rtt, timestamp: Date.now() });
        if (this.rttHistory.length > this.maxHistory) {
          this.rttHistory.shift();
        }
        this.pendingPings.delete(data.id);
      }
      return;
    }
    
    // 处理广播消息（操作延迟测量）
    if (data.type === 'broadcast' && data.sendTime && data.seq) {
      // 不是自己发的消息才计算延迟
      this.onRemoteOperation(data.seq, data.sendTime, data.action);
    }
  }

  _calcStats(values) {
    if (values.length === 0) {
      return { avg: null, min: null, max: null, std: null };
    }
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    return { avg, min, max, std };
  }
}

export default LatencyMonitor;
