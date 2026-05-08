const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 处理WebSocket连接
wss.on('connection', (ws) => {
  console.log('新的WebSocket连接');
  
  // 处理消息
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      // 如果不是 JSON，按原来的方式广播（兼容 Yjs 二进制消息）
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      return;
    }

    // 处理时钟同步相关的 ping-pong
    if (data.type === 'ping') {
      ws.send(JSON.stringify({
        type: 'pong',
        id: data.id,
        serverTime: Date.now()
      }));
      return;
    }

    // 处理广播消息（带 sender 标记，用于延迟测量）
    if (data.type === 'broadcast') {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            ...data,
            relayTime: Date.now() // 服务器转发时间
          }));
        }
      });
      return;
    }

    // 默认：原样广播
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  
  // 处理连接关闭
  ws.on('close', () => {
    console.log('WebSocket连接关闭');
  });
});

// 启动服务器
const PORT = 1234;
server.listen(PORT, () => {
  console.log(`WebSocket服务器运行在 http://localhost:${PORT}`);
});
