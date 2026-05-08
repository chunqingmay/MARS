const { createServer } = require('http');
const { Server } = require('ws');

let clientCounter = 0;

const httpServer = createServer((req, res) => {
  // 处理 CORS 预检请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/username') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ userName: 'user' + (++clientCounter) }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new Server({ server: httpServer });

// Yjs WebSocket server implementation
wss.on('connection', (ws) => {
  // Handle Yjs protocol
  ws.on('message', (message) => {
    // Broadcast to all other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });
});

const PORT = 1234;
httpServer.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on port ${PORT}`);
});
