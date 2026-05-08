# 时钟同步与延迟测量接入指南

## 一、服务端修改（已完成）

### 1. Express 服务端（端口 3000）
已在 `server/server/app.js` 中增加接口：
```
GET http://localhost:3000/sync/time
返回：{ serverTime: 1714301234567 }
```

### 2. WebSocket 服务端（端口 1234）
已修改 `ws-server.js`，支持两种消息：
- `ping` → 返回 `pong`（带 serverTime）
- `broadcast` → 带 `relayTime` 转发

> 如果你使用的是 `start-websocket.js`（y-websocket 原版），需要手动把 ping-pong 逻辑加进去，或者只使用 HTTP 同步方案。

---

## 二、客户端接入步骤

### 步骤 1：在 WebSocket 连接成功后初始化

找到你项目中创建 WebSocket 的地方（通常在某个 Vue 组件或 store 中），加入：

```javascript
import { initLatencyMonitor, sendMeasuredOperation, printLatencyReport } from '@/utils/useLatencyMonitor';

// 假设这是你的 WebSocket
const ws = new WebSocket('ws://192.168.31.252:1234');

ws.onopen = () => {
  // WebSocket 连接成功后，初始化延迟监测
  initLatencyMonitor(ws, {
    httpBaseUrl: 'http://192.168.31.252:3000',  // 你的 Express 服务器地址
    pingInterval: 2000  // 每2秒测一次RTT
  });
};
```

### 步骤 2：替换操作发送方式

**原来这样写（无法测延迟）：**
```javascript
// ❌ 旧写法
ws.send(JSON.stringify({ type: 'createCube', data: {...} }));
```

**改成这样（可测延迟）：**
```javascript
import { sendMeasuredOperation } from '@/utils/useLatencyMonitor';

// ✅ 新写法
sendMeasuredOperation('createCube', { data: {...} });
```

这会自动：
1. 在消息中附加 `sendTime`（统一时间戳）和 `seq`（序列号）
2. 通过 WebSocket 广播给所有端

### 步骤 3：查看延迟报告

在浏览器的 Console 中，随时执行：
```javascript
import { printLatencyReport } from '@/utils/useLatencyMonitor';
printLatencyReport();
```

会输出类似这样的表格：
```
┌─────────────────┬─────────────────────┐
│ 当前 RTT        │ 23.50 ms            │
│ RTT 平均        │ 28.30 ms            │
│ RTT 最小        │ 18.00 ms            │
│ RTT 最大        │ 45.00 ms            │
│ 操作延迟平均    │ 35.20 ms            │
│ 操作延迟最小    │ 22.00 ms            │
│ 操作延迟最大    │ 68.00 ms            │
│ 时钟偏移        │ -4123.50 ms         │  ← 这就是两端系统时间差！
│ 本地漂移        │ 4123.50 ms          │
└─────────────────┴─────────────────────┘
```

**如果 "时钟偏移" 有 4000ms，但 "操作延迟" 只有 30ms，说明你的体感是对的——实际网络延迟很小，只是系统时间差了 4 秒。**

---

## 三、Yjs 场景的特殊处理

如果你用的是 y-websocket（二进制协议），上面的 `broadcast` 方式可能会和 Yjs 消息冲突。**推荐以下方案：**

### 方案 A：Yjs + 独立测量通道（推荐）

不改 Yjs 消息，单独开一条"测量通道"：

```javascript
// 在你的 Vue 组件中
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getSyncClock } from '@/utils/SyncClock';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('ws://192.168.31.252:1234', 'room-name', ydoc);

// 只同步时钟，不走 Yjs 通道
getSyncClock({ httpBaseUrl: 'http://192.168.31.252:3000' }).start();

// 监听 Yjs 变化，用统一时间戳记录
provider.on('sync', (isSynced) => {
  if (isSynced) console.log('Yjs 同步完成');
});

ydoc.on('update', (update, origin) => {
  const now = getSyncClock().now();
  console.log(`[Yjs Update] 统一时间: ${now}, origin: ${origin}`);
  
  // 你可以在这里把 update 和时间戳一起发到服务器做记录
});
```

### 方案 B：用 awareness 状态传时间戳

Yjs 的 provider.awareness 可以存储本地状态，自动同步给其他客户端：

```javascript
import { getSyncClock } from '@/utils/SyncClock';

// 当执行操作时，先把时间戳写入 awareness
function onLocalOperation(action) {
  const sendTime = getSyncClock().now();
  
  provider.awareness.setLocalStateField('lastAction', {
    action,
    sendTime,
    seq: Math.random().toString(36).slice(2)
  });
  
  // 然后执行真正的 Yjs 操作
  ydoc.transact(() => {
    // ... 你的操作
  });
}

// 监听其他人的 awareness 变化
provider.awareness.on('change', (changed, type, origin) => {
  const states = provider.awareness.getStates();
  states.forEach((state, clientId) => {
    if (clientId === provider.awareness.clientID) return; // 跳过自己
    
    const action = state.lastAction;
    if (action && action.sendTime) {
      const recvTime = getSyncClock().now();
      const latency = recvTime - action.sendTime;
      console.log(`[Awareness] ${action.action} 延迟: ${latency.toFixed(2)}ms`);
    }
  });
});
```

**awareness 的优势**：
- 不污染 Yjs 文档数据
- 自动广播给所有客户端
- 适合测量"操作发起时间"到"其他端收到"的延迟

---

## 四、FAQ

### Q1: 为什么不用 Date.now() 了？
因为两端系统时间可能差几秒甚至几分钟。我们用 NTP 简化算法算出一个统一的"虚拟时钟"，所有端都用这个时间来比较。

### Q2: `performance.now()` 和 `Date.now()` 有什么区别？
- `Date.now()`：返回系统时间（1970年以来的毫秒数），会被用户手动调整、NTP 同步跳变
- `performance.now()`：返回页面加载后的毫秒数，单调递增，**不受系统时间调整影响**

我们在模块内部用 `performance.now()` 做间隔测量，用 HTTP 同步的偏移量做跨端时间换算。

### Q3: 时钟同步精度有多高？
在局域网（WiFi）环境下，通常能达到 **±10ms** 以内的精度。如果你的 RTT 很大（>200ms），精度会下降到 ±(RTT/2) 左右。

### Q4: 移动端和电脑端都要改吗？
**是的**。两端都要引入 `SyncClock.js` 并启动同步，这样才能使用统一的时间基准。

---

## 五、调试技巧

### 查看当前时钟状态
```javascript
import { getSyncClock } from '@/utils/SyncClock';
console.log(getSyncClock().getStatus());
// { isSynced: true, offset: -4123.5, rtt: 23, drift: 4123.5 }
```

### 手动触发重新同步
```javascript
getSyncClock().sync();
```

### 对比本地时间和统一时间
```javascript
console.log('本地时间:', Date.now());
console.log('统一时间:', getSyncClock().now());
console.log('差值:', Date.now() - getSyncClock().now());
```
