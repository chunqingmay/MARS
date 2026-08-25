"use strict";

/**
 * 实验三:格式平等 vs. 主从派生架构对比
 * -----------------------------------
 * 在 S2 场景下对比:
 *  条件 A: MARS(格式平等,所有视图可独立编辑)
 *  条件 B: MARS-MasterSlave(主从派生,MeshView 为主表示)
 *
 * 主从派生规则(提示词 7.2):
 *  规则1: MeshView 强制设为主表示
 *  规则2: VoxelView/CloudPointView 等从表示禁止直接编辑
 *  规则3: MeshView 修改时,从表示全量重新生成
 *  规则4: 从表示编辑请求被拒绝,或触发主→从重建
 *
 * 并发模型:同一实体在冲突窗口内被两个用户写入视为冲突。
 *  - MARS:CRDT 消解,双方操作均成功,冲突数记为 0(用户无感知)
 *  - 主从派生:并发写主表示丢失更新,后写者失败(记为冲突)
 */

const { performance } = require("perf_hooks");
const model = require("./mars-model.cjs");
const stats = require("./statistics.cjs");

/**
 * 运行一轮对比(两个条件各执行一次)
 */
function runComparisonRound({ opsPerRun, conflictWindowMs, rttMs, seed, round }) {
  const scene = model.SCENES.S2;
  const results = {};

  for (const condition of ["mars", "master-slave"]) {
    const rng = model.createRng(seed * 10000 + round * 10 + (condition === "mars" ? 1 : 2));
    const mode = condition === "mars" ? "equality" : "master-slave";

    // leader 创建场景,其余客户端接收同一份完整文档(模拟初始同步)
    const leader = model.createClient("U0");
    model.initializeScene(leader, {
      entityCount: scene.entityCount,
      viewCount: scene.viewCount,
      seed: seed + round,
    });
    const fullUpdate = model.encodeFullDocument(leader);
    const clients = [leader];
    for (let user = 1; user < scene.userCount; user += 1) {
      const client = model.createClient(`U${user}`);
      model.applyUpdate(client, fullUpdate);
      clients.push(client);
    }

    const rows = [];
    let successCount = 0;
    let rejectCount = 0;
    let conflictCount = 0;
    let rebuildBatches = 0;
    let rebuildEvents = 0;
    let successResponseSum = 0;
    let rejectResponseSum = 0;
    let rebuildComputeSum = 0;
    let rebuildYjsWriteSum = 0;
    let waitSum = 0;
    const meshOpCount = Math.round(opsPerRun * 0.6); // 用户 1-3 编辑 MeshView 占 60%

    // ---- 顺序混合负载(成功/拒绝响应时间分开统计) ----
    for (let opIndex = 1; opIndex <= opsPerRun; opIndex += 1) {
      // 用户 1-3 编辑 MeshView,用户 4-5 编辑 VoxelView/CloudPointView
      const userIdx =
        opIndex <= meshOpCount ? (opIndex - 1) % 3 : 3 + ((opIndex - meshOpCount - 1) % 2);
      const client = clients[userIdx];
      const entityId = `e${1 + Math.floor(rng() * scene.entityCount)}`;
      const viewType = userIdx < 3 ? "MeshView" : userIdx === 3 ? "VoxelView" : "CloudPointView";
      const opNames = Object.keys(model.VIEW_OPERATIONS[viewType]);
      const opName = opNames[Math.floor(rng() * opNames.length)];

      let success = true;
      let errorType = "";
      let responseMs = 0;
      let waitMs = 0;
      let rebuildComputeMs = 0;
      let rebuildYjsWriteMs = 0;

      const preOpStateVector = model.encodeStateVector(client);
      const start = performance.now();
      const result = model.applyViewOperation(client.doc, entityId, viewType, opName, rng, mode);
      responseMs = performance.now() - start;

      if (!result.applied) {
        success = false;
        rejectCount += 1;
        errorType = result.error || "slave_view_not_editable";
        rejectResponseSum += responseMs;
      } else {
        successCount += 1;
        if (mode === "master-slave") {
          // 规则 3:主表示修改 → 从表示全量重建(同步等待)。
          // computeMs 为模型/校准值,yjsWriteMs 为真实 Yjs 字段写入耗时。
          rebuildBatches += 1;
          rebuildEvents += result.rebuilds.length;
          rebuildComputeMs = result.rebuilds.reduce((sum, item) => sum + item.computeMs, 0);
          rebuildYjsWriteMs = result.rebuilds.reduce((sum, item) => sum + item.yjsWriteMs, 0);
          waitMs = rebuildComputeMs + rebuildYjsWriteMs;
          waitSum += waitMs;
          rebuildComputeSum += rebuildComputeMs;
          rebuildYjsWriteSum += rebuildYjsWriteMs;
          responseMs += waitMs;
        }
        successResponseSum += responseMs;
      }

      // 成功操作同步到其他副本(各客户端在顺序阶段保持状态一致)
      let convergenceMs = 0;
      if (success) {
        const delta = model.encodeDeltaSince(client, preOpStateVector);
        const oneWayMs = model.getRttMs(scene.name, rttMs) / 2;
        convergenceMs = oneWayMs;
        for (const peer of clients) {
          if (peer === client) continue;
          const mergeStart = performance.now();
          model.applyUpdate(peer, delta);
          convergenceMs = Math.max(convergenceMs, oneWayMs + (performance.now() - mergeStart));
        }
      }

      rows.push({
        timestamp: new Date().toISOString(),
        experiment_id: "E3",
        scene_config: `${scene.name}:E=${scene.entityCount},V=${scene.viewCount},U=${scene.userCount},RTT=${scene.rttMs}ms`,
        round,
        condition,
        user_id: client.label,
        operation_type: opName,
        target_view: viewType,
        response_time_ms: Number(responseMs.toFixed(3)),
        convergence_time_ms: Number(convergenceMs.toFixed(3)),
        success: success ? 1 : 0,
        error_type: errorType,
        has_conflict: 0,
        rebuild_count: result.rebuilds.length,
      });
    }

    // ---- 真并发冲突阶段:双客户端不交换增量,并发写同一实体 MeshView ----
    // 每对从统一基线新建两个客户端,保证起始状态一致(否则上一对的增量未广播会导致假冲突)。
    const concurrentPairs = Math.max(1, Math.round(opsPerRun * 0.1));
    const concurrentBase = model.encodeFullDocument(clients[0]);
    for (let pair = 1; pair <= concurrentPairs; pair += 1) {
      const a = model.createClient(`${condition}-CA${pair}`);
      const b = model.createClient(`${condition}-CB${pair}`);
      model.applyUpdate(a, concurrentBase);
      model.applyUpdate(b, concurrentBase);
      const entityId = `e${1 + Math.floor(rng() * scene.entityCount)}`;
      const opNames = Object.keys(model.VIEW_OPERATIONS.MeshView);
      const opName = opNames[Math.floor(rng() * opNames.length)];

      const svA = model.encodeStateVector(a);
      const svB = model.encodeStateVector(b);
      const rA = model.applyViewOperation(a.doc, entityId, "MeshView", opName, rng, mode);
      const rB = model.applyViewOperation(b.doc, entityId, "MeshView", opName, rng, mode);
      const deltaA = model.encodeDeltaSince(a, svA);
      const deltaB = model.encodeDeltaSince(b, svB);

      if (mode === "equality") {
        // MARS:CRDT 消解,双方交换增量后都成功,最终状态一致 → 冲突数 0 是测出来的
        model.applyUpdate(b, deltaA);
        model.applyUpdate(a, deltaB);
        const finalA = model.hashEntityViews(a.doc, entityId);
        const finalB = model.hashEntityViews(b.doc, entityId);
        const keys = Object.keys(finalA);
        const consistent = keys.every((key) => finalA[key] === finalB[key]);
        const bothSucceeded = rA.applied && rB.applied;
        if (bothSucceeded && consistent) {
          successCount += 2;
        } else {
          conflictCount += 1;
        }
        rows.push({
          timestamp: new Date().toISOString(),
          experiment_id: "E3",
          scene_config: `${scene.name}:E=${scene.entityCount},V=${scene.viewCount},U=${scene.userCount},RTT=${scene.rttMs}ms`,
          round,
          condition,
          user_id: `${a.label}+${b.label}`,
          operation_type: "concurrent_mesh_write",
          target_view: "MeshView",
          response_time_ms: 0,
          convergence_time_ms: 0,
          success: bothSucceeded && consistent ? 1 : 0,
          error_type: bothSucceeded && consistent ? "" : "concurrent_state_mismatch",
          has_conflict: 1,
          rebuild_count: 0,
        });
      } else {
        // 主从派生:并发写主表示 → 丢失更新,按规则 4 后写者(b)失败
        conflictCount += 1;
        successCount += 1;
        rejectCount += 1;
        // 后写者 b 应用胜者 a 的增量(模拟 b 的本地更新被覆盖;策略模拟,非 CRDT 回滚)
        model.applyUpdate(b, deltaA);
        rows.push({
          timestamp: new Date().toISOString(),
          experiment_id: "E3",
          scene_config: `${scene.name}:E=${scene.entityCount},V=${scene.viewCount},U=${scene.userCount},RTT=${scene.rttMs}ms`,
          round,
          condition,
          user_id: a.label,
          operation_type: "concurrent_mesh_write",
          target_view: "MeshView",
          response_time_ms: 0,
          convergence_time_ms: 0,
          success: 1,
          error_type: "",
          has_conflict: 1,
          rebuild_count: 0,
        });
        rows.push({
          timestamp: new Date().toISOString(),
          experiment_id: "E3",
          scene_config: `${scene.name}:E=${scene.entityCount},V=${scene.viewCount},U=${scene.userCount},RTT=${scene.rttMs}ms`,
          round,
          condition,
          user_id: b.label,
          operation_type: "concurrent_mesh_write",
          target_view: "MeshView",
          response_time_ms: 0,
          convergence_time_ms: 0,
          success: 0,
          error_type: "concurrent_edit_conflict",
          has_conflict: 1,
          rebuild_count: 0,
        });
      }
    }

    const totalAttempts = opsPerRun + concurrentPairs * 2;
    results[condition] = {
      condition,
      rows,
      summary: {
        condition,
        successRate: successCount / totalAttempts,
        successCount,
        rejectCount,
        successResponseMs: successCount > 0 ? successResponseSum / successCount : 0,
        rejectResponseMs: rejectCount > 0 ? rejectResponseSum / rejectCount : 0,
        conflictCount,
        rebuildBatches,
        rebuildEvents,
        rebuildComputeMsPerBatch: rebuildBatches > 0 ? rebuildComputeSum / rebuildBatches : 0,
        rebuildYjsWriteMsPerBatch: rebuildBatches > 0 ? rebuildYjsWriteSum / rebuildBatches : 0,
        avgWaitMs: successCount > 0 ? waitSum / successCount : 0,
      },
    };
  }

  return results;
}

/**
 * 运行实验三(默认 100 次操作,重复 rounds 轮,配对 t 检验)
 */
async function runComparison(options) {
  const {
    opsPerRun = 100,
    rounds = 30,
    conflictWindowMs = 50,
    rttMs = model.SCENES.S2.rttMs,
    seed = 20260815,
  } = options;

  const rows = [];
  const repeats = { mars: [], "master-slave": [] };

  const e3Start = Date.now();
  console.log(`  [E3] 架构对比开始(${rounds}轮)...`);
  for (let round = 1; round <= rounds; round += 1) {
    const result = runComparisonRound({ opsPerRun, conflictWindowMs, rttMs, seed, round });
    rows.push(...result.mars.rows, ...result["master-slave"].rows);
    repeats.mars.push(result.mars.summary);
    repeats["master-slave"].push(result["master-slave"].summary);
    if (round % 5 === 0 || round === rounds) {
      const elapsedSec = ((Date.now() - e3Start) / 1000).toFixed(1);
      console.log(`    E3 完成 ${round}/${rounds} 轮(已用 ${elapsedSec}s)`);
    }
  }

  const pairs = repeats.mars.map((mars, index) => ({
    mars,
    slave: repeats["master-slave"][index],
  }));
  const tests = {
    successRate: stats.pairedTTest(
      pairs.map((item) => item.mars.successRate),
      pairs.map((item) => item.slave.successRate),
    ),
    successResponseMs: stats.pairedTTest(
      pairs.map((item) => item.mars.successResponseMs),
      pairs.map((item) => item.slave.successResponseMs),
    ),
    rejectResponseMs: stats.pairedTTest(
      pairs.map((item) => item.mars.rejectResponseMs),
      pairs.map((item) => item.slave.rejectResponseMs),
    ),
    conflictCount: stats.pairedTTest(
      pairs.map((item) => item.mars.conflictCount),
      pairs.map((item) => item.slave.conflictCount),
    ),
    rebuildBatches: stats.pairedTTest(
      pairs.map((item) => item.mars.rebuildBatches),
      pairs.map((item) => item.slave.rebuildBatches),
    ),
    rebuildComputeMsPerBatch: stats.pairedTTest(
      pairs.map((item) => item.mars.rebuildComputeMsPerBatch),
      pairs.map((item) => item.slave.rebuildComputeMsPerBatch),
    ),
    rebuildYjsWriteMsPerBatch: stats.pairedTTest(
      pairs.map((item) => item.mars.rebuildYjsWriteMsPerBatch),
      pairs.map((item) => item.slave.rebuildYjsWriteMsPerBatch),
    ),
    avgWaitMs: stats.pairedTTest(
      pairs.map((item) => item.mars.avgWaitMs),
      pairs.map((item) => item.slave.avgWaitMs),
    ),
  };

  const summarize = (key, { percent = false } = {}) => {
    const format = (values) =>
      percent
        ? `${(stats.mean(values) * 100).toFixed(1)}% ± ${(stats.std(values) * 100).toFixed(1)}%`
        : stats.formatMeanStd(values);
    return {
      mars: format(pairs.map((item) => item.mars[key])),
      slave: format(pairs.map((item) => item.slave[key])),
      t: tests[key].t,
      p: tests[key].p,
      significant: tests[key].significant,
      ci95: tests[key].ci95,
    };
  };

  return {
    experiment: "E3",
    rows,
    repeats,
    tests,
    summary: {
      experiment_id: "E3",
      scene_config: `S2:E=50,V=3,U=5,RTT=100ms`,
      opsPerRun,
      conflictWindowMs,
      concurrentPairsPerRound: Math.max(1, Math.round(opsPerRun * 0.1)),
      metrics: {
        successRate: summarize("successRate", { percent: true }),
        successResponseMs: summarize("successResponseMs"),
        rejectResponseMs: summarize("rejectResponseMs"),
        conflictCount: summarize("conflictCount"),
        rebuildBatches: summarize("rebuildBatches"),
        rebuildComputeMsPerBatch: summarize("rebuildComputeMsPerBatch"),
        rebuildYjsWriteMsPerBatch: summarize("rebuildYjsWriteMsPerBatch"),
        avgWaitMs: summarize("avgWaitMs"),
      },
    },
  };
}

module.exports = { runComparison };
