/**
 * yjsLatencyHelper.js
 * 专为 Yjs + y-websocket 场景设计的延迟测量工具
 * 
 * 原理：利用 Yjs 的 awareness 机制传递时间戳，不污染文档数据
 */

import { getSyncClock } from './SyncClock';

let helperInstance = null;

class YjsLatencyHelper {
  constructor(doc, provider, options = {}) {
    this.doc = doc;
    this.provider = provider;
    this.awareness = provider.awareness;
    this.syncClock = getSyncClock({
      httpBaseUrl: options.httpBaseUrl || 'http://192.168.31.252:3000'
    });
    
    this.clientId = this.awareness.clientID;
    this.isRunning = false;
    this.latencyHistory = [];
    this.maxHistory = options.maxHistory || 100;
    
    // 绑定 awareness 监听
    this._onAwarenessChange = this._onAwarenessChange.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // 启动时钟同步
    this.syncClock.start();
    
    // 监听 awareness 变化
    this.awareness.on('change', this._onAwarenessChange);
    
    console.log(`[YjsLatency] 已启动 | clientId=${this.clientId}`);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.awareness.off('change', this._onAwarenessChange);
    this.syncClock.stop();
  }

  /**
   * 记录一个本地操作（在 transact 之前调用）
   * @param {string} action - 操作名称，如 'createCube', 'delete', 'transform'
   * @param {object} meta - 额外信息（可选）
   */
  recordAction(action, meta = {}) {
    if (!this.isRunning) {
      console.warn('[YjsLatency] 尚未启动，先调用 start()');
      return;
    }
    
    const sendTime = this.syncClock.now();
    const seq = `${this.clientId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    // 写入 awareness 本地状态，会自动同步给其他客户端
    this.awareness.setLocalStateField('lastAction', {
      action,
      seq,
      sendTime,
      clientId: this.clientId,
      ...meta
    });
    
    // 同时记录到本地历史
    this._addRecord({
      seq,
      action,
      sendTime,
      direction: 'send',
      clientId: this.clientId
    });
    
    return { seq, sendTime };
  }

  /**
   * 包装一个操作函数，自动记录时间戳
   * @param {string} action - 操作名称
   * @param {Function} fn - 要执行的函数（通常是 doc.transact(...)）
   */
  measure(action, fn) {
    this.recordAction(action);
    return fn();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const records = this.latencyHistory.filter(r => r.direction === 'recv');
    if (records.length === 0) {
      return { count: 0, avg: null, min: null, max: null };
    }
    
    const latencies = records.map(r => r.latency);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    
    return {
      count: records.length,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      clockOffset: this.syncClock.offset,
      clockSynced: this.syncClock.isSynced
    };
  }

  /**
   * 打印报告
   */
  printReport() {
    const stats = this.getStats();
    console.log('%c[YjsLatency 报告]', 'color: #409EFF; font-weight: bold; font-size: 14px');
    console.table({
      '操作延迟样本数': stats.count,
      '平均延迟': stats.avg !== null ? `${stats.avg} ms` : '暂无数据',
      '最小延迟': stats.min !== null ? `${stats.min} ms` : '暂无数据',
      '最大延迟': stats.max !== null ? `${stats.max} ms` : '暂无数据',
      '时钟同步状态': stats.clockSynced ? '✅ 已同步' : '❌ 未同步',
      '时钟偏移': stats.clockOffset !== null ? `${Math.round(stats.clockOffset)} ms` : 'N/A'
    });
  }

  // ========== 内部方法 ==========

  _onAwarenessChange(changed, type) {
    // 获取所有客户端状态
    const states = this.awareness.getStates();
    
    states.forEach((state, clientId) => {
      // 跳过自己
      if (clientId === this.clientId) return;
      
      const action = state.lastAction;
      if (!action || !action.sendTime || !action.seq) return;
      
      // 检查是否已记录过（去重）
      const alreadyRecorded = this.latencyHistory.some(r => 
        r.seq === action.seq && r.fromClientId === clientId
      );
      if (alreadyRecorded) return;
      
      const recvTime = this.syncClock.now();
      const latency = recvTime - action.sendTime;
      
      const record = {
        seq: action.seq,
        action: action.action,
        sendTime: action.sendTime,
        recvTime,
        latency: Math.max(0, latency),
        fromClientId: clientId,
        direction: 'recv'
      };
      
      this._addRecord(record);
      
      console.log(
        `%c[YjsLatency] ${action.action} | 来自 client ${clientId} | 延迟: ${Math.max(0, latency).toFixed(2)} ms`,
        'color: #67C23A'
      );
    });
  }

  _addRecord(record) {
    this.latencyHistory.push(record);
    if (this.latencyHistory.length > this.maxHistory) {
      this.latencyHistory.shift();
    }
  }
}

/**
 * 初始化（在 initYjs 中调用）
 */
export function initYjsLatencyHelper(doc, provider, options) {
  if (helperInstance) {
    helperInstance.stop();
  }
  helperInstance = new YjsLatencyHelper(doc, provider, options);
  helperInstance.start();
  return helperInstance;
}

/**
 * 记录操作（在发送操作前调用）
 */
export function recordYjsAction(action, meta) {
  if (!helperInstance) {
    console.warn('[YjsLatency] 未初始化');
    return;
  }
  return helperInstance.recordAction(action, meta);
}

/**
 * 包装测量（自动记录 + 执行）
 */
export function measureYjsAction(action, fn) {
  if (!helperInstance) {
    return fn();
  }
  return helperInstance.measure(action, fn);
}

/**
 * 打印报告
 */
export function printYjsLatencyReport() {
  if (!helperInstance) {
    console.warn('[YjsLatency] 未初始化');
    return;
  }
  helperInstance.printReport();
}

/**
 * 获取统计
 */
export function getYjsLatencyStats() {
  return helperInstance ? helperInstance.getStats() : null;
}

/**
 * 获取实例（高级用法）
 */
export function getYjsLatencyHelper() {
  return helperInstance;
}
