/**
 * SyncClock.js
 * NTP 简化版时钟同步模块
 * 
 * 核心思想：
 * 1. 不依赖本地系统时间，而是通过与服务端通信计算时钟偏移量（offset）
 * 2. 所有时间戳统一换算成"服务端相对时间"
 * 3. 使用 performance.now() 做本地间隔测量（不受系统时间调整影响）
 */

class SyncClock {
  constructor(options = {}) {
    this.httpBaseUrl = options.httpBaseUrl || 'http://localhost:3000';
    this.syncInterval = options.syncInterval || 30000; // 每30秒重新同步一次
    this.maxSamples = options.maxSamples || 10; // 采样次数
    
    // 时钟偏移量：serverTime = localTime + offset
    this.offset = 0;
    
    // 网络往返延迟（RTT）
    this.rtt = 0;
    
    // 同步状态
    this.isSynced = false;
    this.syncPromise = null;
    
    // 本地基准
    this.localBaseTime = performance.now();
    this.serverBaseTime = 0;
    
    // 自动同步定时器
    this.timer = null;
  }

  /**
   * 启动自动同步
   */
  start() {
    this.sync();
    this.timer = setInterval(() => this.sync(), this.syncInterval);
  }

  /**
   * 停止自动同步
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 执行一次时钟同步（NTP 简化算法）
   * 采样多次，取 RTT 最小的那次（网络最稳定）
   */
  async sync() {
    if (this.syncPromise) return this.syncPromise;
    
    this.syncPromise = this._doSync();
    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
    return this.isSynced;
  }

  async _doSync() {
    const samples = [];
    
    for (let i = 0; i < this.maxSamples; i++) {
      const sample = await this._sample();
      if (sample) samples.push(sample);
      
      // 采样间隔 200ms，避免网络突发
      if (i < this.maxSamples - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    if (samples.length === 0) {
      console.error('[SyncClock] 所有采样失败，无法同步时钟');
      return false;
    }
    
    // 取 RTT 最小的样本（网络最稳定的时刻）
    const best = samples.reduce((min, s) => s.rtt < min.rtt ? s : min);
    
    this.offset = best.offset;
    this.rtt = best.rtt;
    this.localBaseTime = performance.now();
    this.serverBaseTime = best.serverTime;
    this.isSynced = true;
    
    console.log(`[SyncClock] 同步完成 | offset=${this.offset.toFixed(2)}ms | rtt=${this.rtt.toFixed(2)}ms`);
    return true;
  }

  /**
   * 单次采样
   * t0: 发送请求
   * t1: 服务器接收（我们用服务器返回的时间近似）
   * t2: 服务器发送响应
   * t3: 客户端接收
   * 
   * rtt = (t3 - t0) - (t2 - t1)  ≈ t3 - t0（简化）
   * offset = ((t1 - t0) + (t2 - t3)) / 2
   *        = serverTime - (t0 + rtt/2)
   */
  async _sample() {
    const t0 = performance.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.httpBaseUrl}/sync/time`, {
        method: 'GET',
        signal: controller.signal,
        // 禁用缓存
        cache: 'no-store'
      });
      
      clearTimeout(timeout);
      const t3 = performance.now();
      
      if (!res.ok) return null;
      
      const { serverTime } = await res.json();
      const rtt = t3 - t0;
      
      // 假设网络对称，offset = serverTime - (t0 + rtt/2)
      const offset = serverTime - (t0 + rtt / 2);
      
      return { offset, rtt, serverTime };
    } catch (err) {
      console.warn('[SyncClock] 采样失败:', err.message);
      return null;
    }
  }

  /**
   * 获取当前统一时间（基于服务端时间基准）
   * 用这个替代 Date.now() 做跨端比较
   */
  now() {
    if (!this.isSynced) {
      console.warn('[SyncClock] 时钟尚未同步，返回本地时间（可能不准确）');
      return Date.now();
    }
    
    // serverBaseTime + 本地经过的时间
    const elapsed = performance.now() - this.localBaseTime;
    return this.serverBaseTime + elapsed + this.offset;
  }

  /**
   * 将本地 performance.now() 时间戳转换为统一时间
   */
  toUnifiedTime(localPerformanceTime) {
    if (!this.isSynced) return Date.now();
    const elapsed = localPerformanceTime - this.localBaseTime;
    return this.serverBaseTime + elapsed + this.offset;
  }

  /**
   * 获取本地时间与统一时间的差值
   */
  getLocalDrift() {
    return Date.now() - this.now();
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isSynced: this.isSynced,
      offset: this.offset,
      rtt: this.rtt,
      drift: this.isSynced ? this.getLocalDrift() : null
    };
  }
}

// 单例模式，全局共享一个时钟实例
let instance = null;

export function getSyncClock(options) {
  if (!instance) {
    instance = new SyncClock(options);
  }
  return instance;
}

export function resetSyncClock() {
  if (instance) {
    instance.stop();
    instance = null;
  }
}

export { SyncClock };
export default SyncClock;
