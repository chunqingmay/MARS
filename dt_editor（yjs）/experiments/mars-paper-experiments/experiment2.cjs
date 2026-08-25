"use strict";

/**
 * 实验二:协同一致性基准测试
 * -------------------------
 * 验证共享属性(Transform)的跨视图同步正确性和系统可扩展性。
 *
 * 步骤(对应提示词 6.2):
 *  1. 在 S2/S3/S4 三个场景下部署 MARS
 *  2. 所有用户并发对随机实体的 Transform 执行平移/旋转/缩放
 *  3. 以 60Hz 采样率记录各客户端实体的 Transform 值
 *  4. 等待 T_sync = 1s 后,比较所有客户端状态
 *  5. 记录收敛时间、收敛率、空间一致性误差、FPS、内存、带宽
 *
 * 收敛时间定义:某操作从本地应用到所有副本都应用了该更新(含合并耗时)的时间。
 */

const { performance } = require("perf_hooks");
const Y = require("yjs");
const model = require("./mars-model.cjs");
const stats = require("./statistics.cjs");

const TRANSFORM_KINDS = ["translate", "rotate", "scale"];

/** 每用户泊松过程事件流 */
function generatePoissonEvents(opHz, durationSec, entityCount, rng) {
  const events = [];
  let timeMs = 0;
  const meanIntervalMs = 1000 / opHz;
  while (timeMs < durationSec * 1000) {
    timeMs += -Math.log(1 - rng()) * meanIntervalMs;
    if (timeMs >= durationSec * 1000) break;
    events.push({
      tMs: timeMs,
      entityId: `e${1 + Math.floor(rng() * entityCount)}`,
      kind: TRANSFORM_KINDS[Math.floor(rng() * TRANSFORM_KINDS.length)],
    });
  }
  return events;
}

/**
 * 运行一个场景的一轮一致性测试
 */
function runScenarioRound({ scene, durationSec, opHz, syncWaitMs, sampleRateHz, seed, experimentId = "E2" }) {
  const rng = model.createRng(seed);
  const userCount = scene.userCount;
  const viewTypes = model.VIEW_TYPES.slice(0, scene.viewCount);

  // 客户端:leader 创建场景,其余客户端接收同一份完整文档(模拟初始同步)
  const leader = model.createClient("U0");
  model.initializeScene(leader, {
    entityCount: scene.entityCount,
    viewCount: scene.viewCount,
    seed,
  });
  const fullUpdate = model.encodeFullDocument(leader);
  const clients = [leader];
  for (let user = 1; user < userCount; user += 1) {
    const client = model.createClient(`U${user}`);
    model.applyUpdate(client, fullUpdate);
    clients.push(client);
  }

  // 生成所有用户的操作事件(按虚拟时间排序)
  const events = [];
  for (let user = 0; user < userCount; user += 1) {
    for (const event of generatePoissonEvents(opHz, durationSec, scene.entityCount, rng)) {
      events.push({ type: "op", tMs: event.tMs, userIdx: user, ...event });
    }
  }
  events.sort((left, right) => left.tMs - right.tMs);
  events.forEach((event, index) => {
    event.opId = index + 1;
  });

  // 预生成投递事件:投递时间 = 操作时间 + 单向网络延迟(模型:RTT/2)
  const deliveries = [];
  for (const event of events) {
    const oneWayMs = scene.rttMs / 2;
    for (let user = 0; user < userCount; user += 1) {
      if (user === event.userIdx) continue;
      deliveries.push({
        type: "delivery",
        tMs: event.tMs + oneWayMs,
        targetIdx: user,
        sourceIdx: event.userIdx,
        opId: event.opId,
        update: null,
      });
    }
  }
  deliveries.sort((left, right) => left.tMs - right.tMs || left.opId - right.opId);

  // 采样时刻(60Hz)
  const sampleIntervalMs = 1000 / sampleRateHz;
  const sampleTimes = [];
  for (let time = sampleIntervalMs; time <= durationSec * 1000; time += sampleIntervalMs) {
    sampleTimes.push(time);
  }
  const sampledEntities = [];
  for (let index = 0; index < 10; index += 1) {
    sampledEntities.push(`e${1 + Math.floor(rng() * scene.entityCount)}`);
  }

  const heapStart = process.memoryUsage().heapUsed;
  const rows = new Map(); // opId -> 待补全的 row
  const opMeta = new Map(); // opId -> { tOp, pending, maxEndMs }
  const deltasByOpId = new Map(); // opId -> 增量更新(操作执行时编码一次)
  const errorSamples = [];
  let totalMergeMs = 0;
  let totalBytes = 0;
  let totalComparableBytes = 0;
  let totalSemanticBytes = 0;
  const bytesByUser = new Array(userCount).fill(0);
  const comparableBytesByUser = new Array(userCount).fill(0);
  const semanticBytesByUser = new Array(userCount).fill(0);
  let sampleIndex = 0;
  let lastEventSampleMs = -Infinity;
  let nowMs = 0;

  // 当前跨客户端一致性误差(采样实体位置误差最大值)
  function sampleMaxError() {
    let maxError = 0;
    for (const entityId of sampledEntities) {
      const base = model.readTransform(clients[0].doc, entityId);
      for (let user = 1; user < userCount; user += 1) {
        const other = model.readTransform(clients[user].doc, entityId);
        maxError = Math.max(maxError, model.positionError(base, other));
      }
    }
    return maxError;
  }

  // 合并事件流与投递流
  const timeline = [...events, ...deliveries].sort(
    (left, right) => left.tMs - right.tMs || left.opId - right.opId,
  );

  for (const item of timeline) {
    nowMs = item.tMs;

    // 固定采样点:处理所有早于当前时刻的采样点
    while (sampleIndex < sampleTimes.length && sampleTimes[sampleIndex] < nowMs) {
      errorSamples.push({ tMs: sampleTimes[sampleIndex], maxError: sampleMaxError() });
      sampleIndex += 1;
    }

    if (item.type === "op") {
      // 本地应用 + 测量响应时间;增量更新只编码一次,广播给所有副本
      const source = clients[item.userIdx];
      const preOpStateVector = model.encodeStateVector(source);
      const start = performance.now();
      const opResult = model.applyTransformOp(source.doc, item.entityId, item.kind, source.label, rng);
      const responseMs = performance.now() - start;
      const delta = model.encodeDeltaSince(source, preOpStateVector);
      deltasByOpId.set(item.opId, delta);
      // 语义字节:只统计变更字段值,与 Yjs 编码(clock varint/delete-set)无关,用于消融对比
      const semanticBytes = Buffer.byteLength(
        JSON.stringify({ entityId: item.entityId, key: opResult.key, value: opResult.value, lastWriter: opResult.lastWriter }),
      );
      totalSemanticBytes += semanticBytes;
      semanticBytesByUser[item.userIdx] += semanticBytes;

      rows.set(item.opId, {
        timestamp: new Date().toISOString(),
        experiment_id: experimentId,
        scene_config: `${scene.name}:E=${scene.entityCount},V=${scene.viewCount},U=${userCount},RTT=${scene.rttMs}ms`,
        user_id: clients[item.userIdx].label,
        operation_type: item.kind,
        target_view: "Transform",
        response_time_ms: Number(responseMs.toFixed(3)),
        convergence_time_ms: null,
        success: null,
        error_type: "",
        entity_id: item.entityId,
      });
      opMeta.set(item.opId, { tOp: item.tMs, pending: userCount - 1, maxEndMs: 0 });
    } else {
      // 投递:应用该操作的增量更新
      const target = clients[item.targetIdx];
      const delta = deltasByOpId.get(item.opId);
      const mergeStart = performance.now();
      model.applyUpdate(target, delta);
      const mergeMs = performance.now() - mergeStart;
      totalMergeMs += mergeMs;
      totalBytes += delta.byteLength;
      bytesByUser[item.sourceIdx] += delta.byteLength;
      bytesByUser[item.targetIdx] += delta.byteLength;
      // 可比口径:排除 leader(sourceIdx=0)作为 source 的 delta。
      // leader 的 item clock 受文档历史影响,full/ablation 下 varint 编码字节不同,不是真实带宽开销。
      if (item.sourceIdx !== 0) {
        totalComparableBytes += delta.byteLength;
        comparableBytesByUser[item.sourceIdx] += delta.byteLength;
        comparableBytesByUser[item.targetIdx] += delta.byteLength;
      }

      // 事件驱动采样:投递应用后按 60Hz 间隔记录误差,捕捉并发窗口内的最大分歧
      if (nowMs + mergeMs - lastEventSampleMs >= sampleIntervalMs) {
        errorSamples.push({ tMs: nowMs + mergeMs, maxError: sampleMaxError() });
        lastEventSampleMs = nowMs + mergeMs;
      }

      const meta = opMeta.get(item.opId);
      meta.pending -= 1;
      meta.maxEndMs = Math.max(meta.maxEndMs, nowMs + mergeMs);
      if (meta.pending === 0) {
        const row = rows.get(item.opId);
        row.convergence_time_ms = Number((meta.maxEndMs - meta.tOp).toFixed(3));
        row.success = meta.maxEndMs - meta.tOp <= syncWaitMs ? 1 : 0;
      }
    }
  }

  // 处理剩余采样点,并做最终一致性检查(等待 T_sync 后)
  while (sampleIndex < sampleTimes.length) {
    errorSamples.push({ tMs: sampleTimes[sampleIndex], maxError: sampleMaxError() });
    sampleIndex += 1;
  }
  let finalError = 0;
  for (const entityId of sampledEntities) {
    const base = model.readTransform(clients[0].doc, entityId);
    for (let user = 1; user < userCount; user += 1) {
      const other = model.readTransform(clients[user].doc, entityId);
      finalError = Math.max(finalError, model.positionError(base, other));
    }
  }
  // 全量最终一致性:所有客户端状态向量一致 ⇔ 文档完全一致(比抽样位置误差更强)
  const stateVectors = clients.map((client) =>
    Buffer.from(model.encodeStateVector(client)).toString("base64"),
  );
  const finalStateIdentical = stateVectors.every((sv) => sv === stateVectors[0]);

  // 汇总指标
  const opRows = [...rows.values()];
  const convergenceTimes = opRows.map((row) => row.convergence_time_ms);
  const maxErrorDuringRun = errorSamples.length ? Math.max(...errorSamples.map((item) => item.maxError)) : 0;
  const avgErrorDuringRun = stats.mean(errorSamples.map((item) => item.maxError));
  const frames = Math.max(1, sampleTimes.length);
  const avgMergeMsPerFrame = totalMergeMs / frames;
  const memoryBytes = stats.mean(clients.map((client) => model.encodedDocumentSize(client)));
  const heapDeltaMB = (process.memoryUsage().heapUsed - heapStart) / 1024 / 1024;

  const summary = {
    scene: scene.name,
    entityCount: scene.entityCount,
    viewCount: scene.viewCount,
    userCount,
    rttMs: scene.rttMs,
    ops: opRows.length,
    convergenceRate: opRows.filter((row) => row.success).length / opRows.length,
    avgConvergenceMs: stats.mean(convergenceTimes),
    stdConvergenceMs: stats.std(convergenceTimes),
    maxConsistencyErrorM: maxErrorDuringRun,
    avgConsistencyErrorM: avgErrorDuringRun,
    finalConsistencyErrorM: finalError,
    finalStateIdentical,
    localMergeMsPerOp: deliveries.length ? totalMergeMs / deliveries.length : 0,
    avgFps: (() => {
      const measuredFps = model.getMeasuredFps(scene.name);
      if (measuredFps != null) return measuredFps;
      return model.estimateFps(scene.entityCount, scene.viewCount, avgMergeMsPerFrame);
    })(),
    fpsSource: model.getFpsSource(scene.name),
    rttSource: model.getRttSource(scene.name),
    memoryBytes,
    memoryMB: memoryBytes / 1024 / 1024,
    heapDeltaMB,
    avgBandwidthKbps: (stats.mean(bytesByUser) / 1024) / durationSec,
    comparableBandwidthKbps: (stats.mean(comparableBytesByUser) / 1024) / durationSec,
    semanticBandwidthKbps: (stats.mean(semanticBytesByUser) / 1024) / durationSec,
    totalBytes,
    totalComparableBytes,
    totalSemanticBytes,
    avgMergeMsPerFrame,
  };

  return { rows: opRows, summary };
}

/**
 * 运行实验二:S2/S3/S4 三个场景,每场景重复 rounds 轮
 */
async function runConsistencyBenchmark(options) {
  const {
    scenes = ["S2", "S3", "S4"],
    repeats = 30,
    durationSec = 10,
    opHz = 2,
    syncWaitMs = 1000,
    sampleRateHz = 60,
    seed = 20260815,
  } = options;

  const rows = [];
  const summaries = {}; // scene -> repeat 汇总数组

  for (const sceneName of scenes) {
    const scene = model.SCENES[sceneName];
    console.log(`  [E2] ${sceneName} 开始(实体=${scene.entityCount}, 用户=${scene.userCount}, ${repeats}轮 × ${durationSec}s)...`);
    const sceneStart = Date.now();
    summaries[sceneName] = [];
    for (let repeat = 1; repeat <= repeats; repeat += 1) {
      const result = runScenarioRound({
        scene,
        durationSec,
        opHz,
        syncWaitMs,
        sampleRateHz,
        seed: seed + sceneName.length * 1000 + repeat,
      });
      rows.push(...result.rows);
      summaries[sceneName].push(result.summary);
      if (repeat % 5 === 0 || repeat === repeats) {
        const elapsedSec = ((Date.now() - sceneStart) / 1000).toFixed(1);
        console.log(`    ${sceneName} 完成 ${repeat}/${repeats} 轮(已用 ${elapsedSec}s)`);
      }
    }
  }

  // 聚合:每场景均值 ± 标准差
  const aggregated = {};
  for (const sceneName of scenes) {
    const list = summaries[sceneName];
    aggregated[sceneName] = {
      scene: sceneName,
      repeats: list.length,
      convergenceRate: {
        mean: stats.mean(list.map((item) => item.convergenceRate)),
        std: stats.std(list.map((item) => item.convergenceRate)),
      },
      avgConvergenceMs: {
        mean: stats.mean(list.map((item) => item.avgConvergenceMs)),
        std: stats.std(list.map((item) => item.avgConvergenceMs)),
      },
      maxConsistencyErrorM: {
        mean: stats.mean(list.map((item) => item.maxConsistencyErrorM)),
        std: stats.std(list.map((item) => item.maxConsistencyErrorM)),
      },
      finalConsistencyErrorM: {
        mean: stats.mean(list.map((item) => item.finalConsistencyErrorM)),
        std: stats.std(list.map((item) => item.finalConsistencyErrorM)),
      },
      finalStateIdenticalRate: {
        mean: stats.mean(list.map((item) => (item.finalStateIdentical ? 1 : 0))),
        std: stats.std(list.map((item) => (item.finalStateIdentical ? 1 : 0))),
      },
      localMergeMsPerOp: {
        mean: stats.mean(list.map((item) => item.localMergeMsPerOp)),
        std: stats.std(list.map((item) => item.localMergeMsPerOp)),
      },
      avgFps: {
        mean: stats.mean(list.map((item) => item.avgFps)),
        std: stats.std(list.map((item) => item.avgFps)),
      },
      fpsSource: list[0] && list[0].fpsSource,
      rttSource: list[0] && list[0].rttSource,
      memoryMB: {
        mean: stats.mean(list.map((item) => item.memoryMB)),
        std: stats.std(list.map((item) => item.memoryMB)),
      },
      avgBandwidthKbps: {
        mean: stats.mean(list.map((item) => item.avgBandwidthKbps)),
        std: stats.std(list.map((item) => item.avgBandwidthKbps)),
      },
      comparableBandwidthKbps: {
        mean: stats.mean(list.map((item) => item.comparableBandwidthKbps)),
        std: stats.std(list.map((item) => item.comparableBandwidthKbps)),
      },
      semanticBandwidthKbps: {
        mean: stats.mean(list.map((item) => item.semanticBandwidthKbps)),
        std: stats.std(list.map((item) => item.semanticBandwidthKbps)),
      },
    };
  }

  return {
    experiment: "E2",
    rows,
    repeats: summaries,
    summary: {
      experiment_id: "E2",
      durationSec,
      opHz,
      syncWaitMs,
      sampleRateHz,
      scenes: aggregated,
    },
  };
}

module.exports = { runConsistencyBenchmark, runScenarioRound };
