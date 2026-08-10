const { WebSocket, WebSocketServer } = require("ws");
const { performance } = require("perf_hooks");

function encodeFrame(meta, update) {
  const metaBuffer = Buffer.from(JSON.stringify(meta), "utf8");
  const updateBuffer = Buffer.from(update);
  const frame = Buffer.allocUnsafe(4 + metaBuffer.length + updateBuffer.length);
  frame.writeUInt32BE(metaBuffer.length, 0);
  metaBuffer.copy(frame, 4);
  updateBuffer.copy(frame, 4 + metaBuffer.length);
  return frame;
}

function decodeFrame(data) {
  const frame = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const metaLength = frame.readUInt32BE(0);
  const meta = JSON.parse(frame.subarray(4, 4 + metaLength).toString("utf8"));
  const update = frame.subarray(4 + metaLength);
  return { meta, update };
}

function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
}

class WebSocketBenchmarkTransport {
  constructor({ port = 0 } = {}) {
    this.port = port;
    this.serverClients = new Map();
    this.clientSockets = new Map();
    this.pending = new Map();
  }

  async start() {
    this.wss = new WebSocketServer({ port: this.port, host: "127.0.0.1" });

    this.wss.on("connection", (socket, request) => {
      const url = new URL(request.url, "ws://127.0.0.1");
      const clientLabel = url.searchParams.get("client");
      this.serverClients.set(clientLabel, socket);

      socket.on("message", (data) => {
        const { meta } = decodeFrame(data);
        const target = this.serverClients.get(meta.target);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(data);
        }
      });
    });

    await new Promise((resolve) => this.wss.once("listening", resolve));
    const address = this.wss.address();
    this.port = address.port;

    await Promise.all([
      this.connectClient("A"),
      this.connectClient("B"),
    ]);
  }

  async connectClient(clientLabel) {
    const socket = new WebSocket(`ws://127.0.0.1:${this.port}?client=${clientLabel}`);
    socket.on("message", (data) => {
      const { meta, update } = decodeFrame(data);
      const pending = this.pending.get(meta.messageId);
      if (!pending) return;

      this.pending.delete(meta.messageId);
      pending.resolve({
        meta,
        update,
        receivedAt: performance.now(),
      });
    });

    await waitForOpen(socket);
    this.clientSockets.set(clientLabel, socket);
  }

  async send({ source, target, messageId, update, sentAt }) {
    const sourceSocket = this.clientSockets.get(source);
    if (!sourceSocket || sourceSocket.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket client ${source} is not open`);
    }

    const frame = encodeFrame({ messageId, source, target, sentAt }, update);
    const received = new Promise((resolve, reject) => {
      this.pending.set(messageId, { resolve, reject });
    });

    sourceSocket.send(frame);
    return {
      networkMessageBytes: frame.byteLength,
      received,
    };
  }

  async stop() {
    for (const socket of this.clientSockets.values()) {
      socket.close();
    }
    this.clientSockets.clear();

    if (this.wss) {
      await new Promise((resolve) => this.wss.close(resolve));
      this.wss = null;
    }
  }
}

module.exports = {
  WebSocketBenchmarkTransport,
};
