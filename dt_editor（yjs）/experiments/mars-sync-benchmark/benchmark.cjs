const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { WebSocketBenchmarkTransport } = require("./transports/websocket-transport.cjs");

const DEFAULT_INTERVALS = [10, 30, 100, 500, 1000];
const DEFAULT_REPEATS = 50;
const DEFAULT_DURATION_MS = 60000;
const DEFAULT_CONFLICT_WINDOW_MS = 50;
const DEFAULT_SEED = 20260625;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bytesOf(update) {
  if (typeof update === "string") {
    return Buffer.byteLength(update);
  }
  return update.byteLength || update.length || Buffer.byteLength(Buffer.from(update));
}

function roundMs(value) {
  return Number(value.toFixed(3));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createRng(seed) {
  let value = seed >>> 0;
  return function rng() {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleExponential(meanMs, rng) {
  return -Math.log(1 - rng()) * meanMs;
}

function generatePoissonEvents(clientLabel, meanIntervalMs, durationMs, rng) {
  const events = [];
  let timeMs = 0;

  while (timeMs < durationMs) {
    timeMs += sampleExponential(meanIntervalMs, rng);
    if (timeMs <= durationMs) {
      events.push({
        clientLabel,
        timeMs,
        deltaX: clientLabel === "A" ? 2 : -2,
      });
    }
  }

  return events;
}

function parseList(value) {
  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

function parseArgs(argv) {
  const options = {
    repeats: DEFAULT_REPEATS,
    intervals: DEFAULT_INTERVALS,
    realTime: false,
    transport: "direct",
    wsPort: 0,
    durationMs: DEFAULT_DURATION_MS,
    conflictWindowMs: DEFAULT_CONFLICT_WINDOW_MS,
    seed: DEFAULT_SEED,
    outDir: path.join(__dirname, "results"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repeats") {
      options.repeats = Number(argv[++index]);
    } else if (arg === "--intervals") {
      options.intervals = parseList(argv[++index]);
    } else if (arg === "--real-time") {
      options.realTime = true;
    } else if (arg === "--transport") {
      options.transport = argv[++index];
    } else if (arg === "--ws-port") {
      options.wsPort = Number(argv[++index]);
    } else if (arg === "--duration-ms") {
      options.durationMs = Number(argv[++index]);
    } else if (arg === "--conflict-window-ms") {
      options.conflictWindowMs = Number(argv[++index]);
    } else if (arg === "--seed") {
      options.seed = Number(argv[++index]);
    } else if (arg === "--out-dir") {
      options.outDir = path.resolve(argv[++index]);
    }
  }

  if (!Number.isInteger(options.repeats) || options.repeats <= 0) {
    throw new Error("--repeats must be a positive integer");
  }
  if (!options.intervals.length) {
    throw new Error("--intervals must contain at least one non-negative number");
  }
  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
    throw new Error("--duration-ms must be a positive number");
  }
  if (!Number.isFinite(options.conflictWindowMs) || options.conflictWindowMs < 0) {
    throw new Error("--conflict-window-ms must be a non-negative number");
  }
  if (!Number.isInteger(options.seed)) {
    throw new Error("--seed must be an integer");
  }
  if (!["direct", "websocket"].includes(options.transport)) {
    throw new Error("--transport must be either direct or websocket");
  }
  if (!Number.isInteger(options.wsPort) || options.wsPort < 0) {
    throw new Error("--ws-port must be a non-negative integer");
  }

  return options;
}

async function deliverUpdate({ adapter, update, sourceLabel, targetLabel, receiver, context }) {
  const sendStart = performance.now();
  if (context.transport) {
    const messageId = `${adapter.engineName}-${context.intervalMs}-${context.messageSeq++}`;
    const sendResult = await context.transport.send({
      source: sourceLabel,
      target: targetLabel,
      messageId,
      update,
      sentAt: sendStart,
    });
    const received = await sendResult.received;
    const mergeStart = performance.now();
    adapter.applyUpdate(receiver, received.update);
    const mergeEnd = performance.now();

    return {
      sendStart,
      mergeStart,
      mergeEnd,
      syncLatencyMs: mergeEnd - sendStart,
      crdtMergeMs: mergeEnd - mergeStart,
      networkTransferMs: mergeStart - sendStart,
      networkMessageBytes: sendResult.networkMessageBytes,
    };
  }

  const mergeStart = performance.now();
  adapter.applyUpdate(receiver, update);
  const mergeEnd = performance.now();
  return {
    sendStart,
    mergeStart,
    mergeEnd,
    syncLatencyMs: mergeEnd - sendStart,
    crdtMergeMs: mergeEnd - mergeStart,
    networkTransferMs: 0,
    networkMessageBytes: bytesOf(update),
  };
}

async function runEvent(adapter, intervalMs, eventIndex, event, context) {
  const clientA = adapter.activeClientA;
  const clientB = adapter.activeClientB;
  const conflictField = "entities.mars-sync-benchmark-entity.transform.x";
  const source = event.clientLabel === "A" ? clientA : clientB;
  const receiver = event.clientLabel === "A" ? clientB : clientA;
  const targetLabel = event.clientLabel === "A" ? "B" : "A";
  const otherLabel = event.clientLabel === "A" ? "B" : "A";
  const lastOtherWriteAt = context.lastWriteAtByClient[otherLabel];
  const hasConflict =
    Number.isFinite(lastOtherWriteAt) &&
    event.timeMs - lastOtherWriteAt <= context.conflictWindowMs;

  adapter.applyTransformDelta(source, event.deltaX, {
    trial: eventIndex,
    intervalMs,
    eventTimeMs: event.timeMs,
  });
  context.lastWriteAtByClient[event.clientLabel] = event.timeMs;

  const update = adapter.encodeUpdate(source, receiver);
  const updateBytes = bytesOf(update);
  const delivery = await deliverUpdate({
    adapter,
    update,
    sourceLabel: event.clientLabel,
    targetLabel,
    receiver,
    context,
  });
  const syncLatencyMs = delivery.syncLatencyMs;
  const conflictResolutionLatencyMs = hasConflict ? delivery.syncLatencyMs : 0;

  const finalTransformA = adapter.readTransformSnapshot(clientA);
  const finalTransformB = adapter.readTransformSnapshot(clientB);
  const converged = JSON.stringify(finalTransformA) === JSON.stringify(finalTransformB);
  const conflictResolved = hasConflict && converged;
  const winner = converged ? finalTransformA.lastWriter : "diverged";

  return {
    engine: adapter.engineName,
    crdt: adapter.crdtName,
    intervalMs,
    trial: eventIndex,
    eventIndex,
    simulationTimeMs: roundMs(event.timeMs),
    sourceClient: event.clientLabel,
    operationDeltaX: event.deltaX,
    syncLatencyMs: roundMs(syncLatencyMs),
    networkTransferMs: roundMs(delivery.networkTransferMs),
    crdtMergeMs: roundMs(delivery.crdtMergeMs),
    avgUpdateSizeBytes: updateBytes,
    maxUpdateSizeBytes: updateBytes,
    networkMessageBytes: delivery.networkMessageBytes,
    encodedDocSizeBytes: "",
    hasConflict,
    conflictField,
    conflictType: "write-write",
    conflictResolved,
    conflictResolutionLatencyMs: roundMs(conflictResolutionLatencyMs),
    convergenceSuccess: converged,
    conflictWinner: winner,
    latencyABMs: event.clientLabel === "A" ? roundMs(syncLatencyMs) : "",
    latencyBAMs: event.clientLabel === "B" ? roundMs(syncLatencyMs) : "",
    updateABBytes: event.clientLabel === "A" ? updateBytes : "",
    updateBABytes: event.clientLabel === "B" ? updateBytes : "",
    finalXClientA: finalTransformA.x,
    finalXClientB: finalTransformB.x,
    finalLastWriterClientA: finalTransformA.lastWriter,
    finalLastWriterClientB: finalTransformB.lastWriter,
  };
}

async function runEngine(adapter, options) {
  const rows = [];
  const summaries = [];

  for (const intervalMs of options.intervals) {
    const rng = createRng(options.seed + intervalMs * 97 + adapter.engineName.length);
    const events = [
      ...generatePoissonEvents("A", intervalMs, options.durationMs, rng),
      ...generatePoissonEvents("B", intervalMs, options.durationMs, rng),
    ].sort((left, right) => left.timeMs - right.timeMs);

    const clientA = adapter.createClient("A");
    const clientB = adapter.createClient("B");
    adapter.activeClientA = clientA;
    adapter.activeClientB = clientB;

    adapter.initializeScene(clientA);
    adapter.applyUpdate(clientB, adapter.encodeFullDocument(clientA));

    const intervalRows = [];
    const transport = options.transport === "websocket"
      ? new WebSocketBenchmarkTransport({ port: options.wsPort })
      : null;
    if (transport) {
      await transport.start();
    }

    const context = {
      transport,
      intervalMs,
      messageSeq: 1,
      conflictWindowMs: options.conflictWindowMs,
      lastWriteAtByClient: {
        A: Number.NEGATIVE_INFINITY,
        B: Number.NEGATIVE_INFINITY,
      },
    };

    try {
      for (let eventIndex = 1; eventIndex <= events.length; eventIndex += 1) {
        const row = await runEvent(adapter, intervalMs, eventIndex, events[eventIndex - 1], context);
        rows.push(row);
        intervalRows.push(row);
      }
    } finally {
      if (transport) {
        await transport.stop();
      }
    }

    const operationCountA = events.filter((event) => event.clientLabel === "A").length;
    const operationCountB = events.filter((event) => event.clientLabel === "B").length;

    summaries.push({
      engine: adapter.engineName,
      crdt: adapter.crdtName,
      intervalMs,
      repeats: options.repeats,
      simulationDurationMs: options.durationMs,
      conflictWindowMs: options.conflictWindowMs,
      totalOperationCount: events.length,
      operationCountA,
      operationCountB,
      expectedOperationCountPerClient: roundMs(options.durationMs / intervalMs),
      transport: options.transport,
      avgSyncLatencyMs: roundMs(average(intervalRows.map((row) => row.syncLatencyMs))),
      avgNetworkTransferMs: roundMs(average(intervalRows.map((row) => row.networkTransferMs))),
      avgCrdtMergeMs: roundMs(average(intervalRows.map((row) => row.crdtMergeMs))),
      avgUpdateSizeBytes: roundMs(average(intervalRows.map((row) => row.avgUpdateSizeBytes))),
      avgNetworkMessageBytes: roundMs(average(intervalRows.map((row) => row.networkMessageBytes))),
      maxUpdateSizeBytes: intervalRows.length
        ? Math.max(...intervalRows.map((row) => row.maxUpdateSizeBytes))
        : 0,
      finalEncodedDocSizeBytes: adapter.encodedDocumentSize(clientA),
      conflictCount: intervalRows.filter((row) => row.hasConflict).length,
      conflictRate: roundMs(
        intervalRows.length
          ? intervalRows.filter((row) => row.hasConflict).length / intervalRows.length
          : 0,
      ),
      resolvedConflictCount: intervalRows.filter((row) => row.hasConflict && row.conflictResolved).length,
      conflictResolutionRate: roundMs(
        intervalRows.filter((row) => row.hasConflict).length
          ? intervalRows.filter((row) => row.conflictResolved).length /
              intervalRows.filter((row) => row.hasConflict).length
          : 0,
      ),
      convergenceSuccessCount: intervalRows.filter((row) => row.convergenceSuccess).length,
      convergenceSuccessRate: roundMs(
        intervalRows.length
          ? intervalRows.filter((row) => row.convergenceSuccess).length / intervalRows.length
          : 0,
      ),
      avgConflictResolutionLatencyMs: roundMs(
        average(
          intervalRows
            .filter((row) => row.hasConflict)
            .map((row) => row.conflictResolutionLatencyMs),
        ),
      ),
      finalXClientA: adapter.readTransformX(clientA),
      finalXClientB: adapter.readTransformX(clientB),
    });
  }

  delete adapter.activeClientA;
  delete adapter.activeClientB;

  return { rows, summaries };
}

function toCsv(rows) {
  const headers = [
    "engine",
    "crdt",
    "intervalMs",
    "trial",
    "eventIndex",
    "simulationTimeMs",
    "sourceClient",
    "operationDeltaX",
    "syncLatencyMs",
    "networkTransferMs",
    "crdtMergeMs",
    "avgUpdateSizeBytes",
    "maxUpdateSizeBytes",
    "networkMessageBytes",
    "encodedDocSizeBytes",
    "hasConflict",
    "conflictField",
    "conflictType",
    "conflictResolved",
    "conflictResolutionLatencyMs",
    "convergenceSuccess",
    "conflictWinner",
    "latencyABMs",
    "latencyBAMs",
    "updateABBytes",
    "updateBABytes",
    "finalXClientA",
    "finalXClientB",
    "finalLastWriterClientA",
    "finalLastWriterClientB",
  ];

  const escapeCell = (value) => {
    const text = String(value == null ? "" : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeResults(result, options, baseName) {
  ensureDir(options.outDir);
  let jsonPath = path.join(options.outDir, `${baseName}.json`);
  let csvPath = path.join(options.outDir, `${baseName}.csv`);
  let summaryPath = path.join(options.outDir, `${baseName}-summary.json`);

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(result.rows, null, 2));
    fs.writeFileSync(csvPath, toCsv(result.rows));
    fs.writeFileSync(summaryPath, JSON.stringify(result.summaries, null, 2));
  } catch (error) {
    if (error.code !== "EBUSY" && error.code !== "EPERM") {
      throw error;
    }

    const suffix = new Date().toISOString().replace(/[:.]/g, "-");
    jsonPath = path.join(options.outDir, `${baseName}-${suffix}.json`);
    csvPath = path.join(options.outDir, `${baseName}-${suffix}.csv`);
    summaryPath = path.join(options.outDir, `${baseName}-${suffix}-summary.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result.rows, null, 2));
    fs.writeFileSync(csvPath, toCsv(result.rows));
    fs.writeFileSync(summaryPath, JSON.stringify(result.summaries, null, 2));
  }

  return { jsonPath, csvPath, summaryPath };
}

function printSummary(summaries) {
  console.table(summaries.map((summary) => ({
    engine: summary.engine,
    intervalMs: summary.intervalMs,
    ops: summary.totalOperationCount,
    opsA: summary.operationCountA,
    opsB: summary.operationCountB,
    transport: summary.transport,
    avgLatencyMs: summary.avgSyncLatencyMs,
    avgNetworkMs: summary.avgNetworkTransferMs,
    avgMergeMs: summary.avgCrdtMergeMs,
    avgUpdateBytes: summary.avgUpdateSizeBytes,
    avgFrameBytes: summary.avgNetworkMessageBytes,
    maxUpdateBytes: summary.maxUpdateSizeBytes,
    finalDocBytes: summary.finalEncodedDocSizeBytes,
    conflictRate: summary.conflictRate,
    resolutionRate: summary.conflictResolutionRate,
    convergenceRate: summary.convergenceSuccessRate,
  })));
}

module.exports = {
  parseArgs,
  runEngine,
  writeResults,
  printSummary,
};
