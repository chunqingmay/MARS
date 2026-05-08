/**
 * useLatencyMonitor.js
 * 在 Vue 组件中使用延迟测量的示例封装
 * 
 * 用法：
 * 1. 在创建 WebSocket / Yjs Provider 时初始化
 * 2. 在发送协同操作时调用 sendOperation
 * 3. 在收到远程操作时自动计算延迟
 */

import { getSyncClock } from './SyncClock';
import LatencyMonitor from './LatencyMonitor';

let monitorInstance = null;

/**
 * 初始化延迟测量（在建立 WebSocket 连接后调用）
 * @param {WebSocket} ws - 你的 WebSocket 实例（可以是原生 WS，也可以是 y-websocket 的 ws）
 * @param {object} options - 配置项
 */
export function initLatencyMonitor(ws, options = {}) {
  // 先启动时钟同步
  const syncClock = getSyncClock({
    httpBaseUrl: options.httpBaseUrl || 'http://192.168.31.252:3000'
  });
  syncClock.start();

  // 再启动延迟监测
  monitorInstance = new LatencyMonitor(ws, {
    pingInterval: options.pingInterval || 2000
  });
  monitorInstance.start();

  console.log('[LatencyMonitor] 已初始化');
  return monitorInstance;
}

/**
 * 发送一个可测量的协同操作
 * @param {string} action - 操作名，如 'createCube', 'delete', 'transform'
 * @param {object} payload - 操作数据
 */
export function sendMeasuredOperation(action, payload = {}) {
  if (!monitorInstance) {
    console.warn('[LatencyMonitor] 尚未初始化');
    return null;
  }
  return monitorInstance.sendOperation(action, payload);
}

/**
 * 获取当前统计信息
 */
export function getLatencyStats() {
  if (!monitorInstance) return null;
  return monitorInstance.getStats();
}

/**
 * 打印延迟报告到控制台
 */
export function printLatencyReport() {
  if (!monitorInstance) {
    console.warn('[LatencyMonitor] 尚未初始化');
    return;
  }
  monitorInstance.printReport();
}

/**
 * 停止测量
 */
export function stopLatencyMonitor() {
  if (monitorInstance) {
    monitorInstance.stop();
    monitorInstance = null;
  }
  getSyncClock().stop();
}

/**
 * 暴露 monitor 实例（高级用法）
 */
export function getMonitorInstance() {
  return monitorInstance;
}
