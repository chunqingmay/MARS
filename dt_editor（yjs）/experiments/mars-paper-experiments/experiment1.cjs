"use strict";

/**
 * 实验一:视图操作独立性验证
 * -------------------------
 * 验证对某一视图的操作不会污染其他视图的数据状态。
 *
 * 步骤(对应提示词 5.2):
 *  1. 每个实体挂载原型实际实现的全部 3 种视图组件
 *  2. 对每个视图执行其特有操作(共 9 种)
 *  3. 操作前后记录所有视图的状态哈希值(SHA-256)
 *  4. 断言:目标视图哈希值改变,其他视图哈希值不变
 *  5. S2 场景下多用户并发执行
 *
 * 度量指标(5.3):视图隔离正确率、误污染率、操作响应时间
 */

const { performance } = require("perf_hooks");
const model = require("./mars-model.cjs");
const stats = require("./statistics.cjs");

/**
 * 执行一轮视图独立性测试
 * @returns 每操作一行记录 + 该轮汇总
 */
function runRound({ entityCount, viewCount, userCount, operationsPerUser, rttMs, seed, round }) {
  const rng = model.createRng(seed * 1000 + round);
  const viewTypes = model.VIEW_TYPES.slice(0, viewCount);

  // leader 创建场景,其余客户端接收同一份完整文档(模拟初始同步)
  const leader = model.createClient("U0");
  model.initializeScene(leader, { entityCount, viewCount, seed: seed + round });
  const fullUpdate = model.encodeFullDocument(leader);
  const clients = [leader];
  for (let user = 1; user < userCount; user += 1) {
    const client = model.createClient(`U${user}`);
    model.applyUpdate(client, fullUpdate);
    clients.push(client);
  }

  const rows = [];
  let totalChecks = 0;
  let correctCount = 0;
  let pollutionEvents = 0;
  let responseSum = 0;

  // Phase A:视图操作隔离(目标视图变化,同实体其他视图/共享属性/其他实体均不变)
  for (let user = 0; user < userCount; user += 1) {
    const client = clients[user];
    for (let operation = 0; operation < operationsPerUser; operation += 1) {
      const entityId = `e${1 + Math.floor(rng() * entityCount)}`;
      const otherId = `e${1 + Math.floor(rng() * entityCount)}`;
      const viewType = viewTypes[Math.floor(rng() * viewTypes.length)];
      const opNames = Object.keys(model.VIEW_OPERATIONS[viewType]);
      const opName = opNames[Math.floor(rng() * opNames.length)];
      const viewKey = model.VIEW_KEYS[viewType];

      // 操作前哈希(同实体 + 随机其他实体)
      const before = model.hashEntityViews(client.doc, entityId);
      const otherBefore = otherId !== entityId ? model.hashEntityViews(client.doc, otherId) : null;

      // 执行操作,记录本地响应时间
      const preOpStateVector = model.encodeStateVector(client);
      const start = performance.now();
      const result = model.applyViewOperation(client.doc, entityId, viewType, opName, rng, "equality");
      const responseMs = performance.now() - start;
      const delta = model.encodeDeltaSince(client, preOpStateVector);

      // 操作后哈希
      const after = model.hashEntityViews(client.doc, entityId);
      const otherAfter = otherBefore ? model.hashEntityViews(client.doc, otherId) : null;

      // 断言
      const targetChanged = after[viewKey] !== before[viewKey];
      const pollutedViews = viewTypes.filter(
        (view) => view !== viewType && after[model.VIEW_KEYS[view]] !== before[model.VIEW_KEYS[view]],
      );
      const sharedChanged =
        after.transform !== before.transform || after.appearance !== before.appearance;
      const crossPolluted =
        otherBefore != null &&
        Object.keys(otherBefore).some((key) => otherBefore[key] !== otherAfter[key]);

      let isolated =
        result.applied && targetChanged && pollutedViews.length === 0 && !sharedChanged && !crossPolluted;

      // 同步到所有副本,验证跨客户端也无污染
      const oneWayMs = model.getRttMs("S2", rttMs) / 2;
      let convergenceMs = oneWayMs;
      for (const peer of clients) {
        if (peer === client) continue;
        const mergeStart = performance.now();
        model.applyUpdate(peer, delta);
        convergenceMs = Math.max(convergenceMs, oneWayMs + (performance.now() - mergeStart));
        const peerAfter = model.hashEntityViews(peer.doc, entityId);
        for (const view of viewTypes) {
          if (peerAfter[model.VIEW_KEYS[view]] !== after[model.VIEW_KEYS[view]]) {
            isolated = false;
          }
        }
      }

      totalChecks += 1;
      responseSum += responseMs;
      if (isolated) {
        correctCount += 1;
      } else {
        pollutionEvents += 1;
      }

      rows.push({
        timestamp: new Date().toISOString(),
        experiment_id: "E1",
        scene_config: `E=${entityCount},V=${viewCount},U=${userCount},RTT=${rttMs}ms`,
        round,
        user_id: client.label,
        operation_type: opName,
        target_view: viewType,
        response_time_ms: Number(responseMs.toFixed(3)),
        convergence_time_ms: Number(convergenceMs.toFixed(3)),
        success: isolated ? 1 : 0,
        error_type: isolated
          ? ""
          : pollutedViews.length > 0
            ? `polluted:${pollutedViews.join("+")}`
            : sharedChanged
              ? "shared_attr_changed"
              : crossPolluted
                ? `cross_entity_polluted:${otherId}`
                : "target_unchanged",
      });
    }
  }

  // Phase B:反向隔离(修改共享属性 Transform,所有视图哈希必须不变)
  let reverseChecks = 0;
  let reverseCorrect = 0;
  const reverseRounds = Math.max(1, Math.round((userCount * operationsPerUser) / 5));
  for (let index = 0; index < reverseRounds; index += 1) {
    const client = clients[Math.floor(rng() * clients.length)];
    const entityId = `e${1 + Math.floor(rng() * entityCount)}`;
    const before = model.hashEntityViews(client.doc, entityId);

    const preOpStateVector = model.encodeStateVector(client);
    const start = performance.now();
    model.applyTransformOp(client.doc, entityId, "translate", client.label, rng);
    const responseMs = performance.now() - start;
    const delta = model.encodeDeltaSince(client, preOpStateVector);

    const after = model.hashEntityViews(client.doc, entityId);
    const viewsUnchanged = viewTypes.every(
      (view) => after[model.VIEW_KEYS[view]] === before[model.VIEW_KEYS[view]],
    );
    let ok = viewsUnchanged;

    const oneWayMs = model.getRttMs("S2", rttMs) / 2;
    let convergenceMs = oneWayMs;
    for (const peer of clients) {
      if (peer === client) continue;
      const mergeStart = performance.now();
      model.applyUpdate(peer, delta);
      convergenceMs = Math.max(convergenceMs, oneWayMs + (performance.now() - mergeStart));
      const peerAfter = model.hashEntityViews(peer.doc, entityId);
      for (const view of viewTypes) {
        if (peerAfter[model.VIEW_KEYS[view]] !== after[model.VIEW_KEYS[view]]) {
          ok = false;
        }
      }
    }

    reverseChecks += 1;
    if (ok) reverseCorrect += 1;

    rows.push({
      timestamp: new Date().toISOString(),
      experiment_id: "E1",
      scene_config: `E=${entityCount},V=${viewCount},U=${userCount},RTT=${rttMs}ms`,
      round,
      user_id: client.label,
      operation_type: "shared_transform_check",
      target_view: "AllViews",
      response_time_ms: Number(responseMs.toFixed(3)),
      convergence_time_ms: Number(convergenceMs.toFixed(3)),
      success: ok ? 1 : 0,
      error_type: ok ? "" : "view_polluted_by_transform",
    });
  }

  // Phase C:并发隔离(两个客户端对同一实体不同视图并发编辑,交换增量后互不污染)
  // 每对从统一基线新建两个客户端,保证起始状态一致;只测并发隔离,不影响主客户端状态。
  let concurrentPairs = 0;
  let concurrentCorrect = 0;
  const concurrentRounds = Math.max(1, Math.round((userCount * operationsPerUser) / 10));
  const phaseCBase = model.encodeFullDocument(clients[0]);
  for (let index = 0; index < concurrentRounds; index += 1) {
    const a = model.createClient(`CA${index + 1}`);
    const b = model.createClient(`CB${index + 1}`);
    model.applyUpdate(a, phaseCBase);
    model.applyUpdate(b, phaseCBase);
    const entityId = `e${1 + Math.floor(rng() * entityCount)}`;
    const viewA = viewTypes[Math.floor(rng() * viewTypes.length)];
    let viewB = viewTypes[Math.floor(rng() * viewTypes.length)];
    if (viewB === viewA) viewB = viewTypes[(viewTypes.indexOf(viewA) + 1) % viewTypes.length];
    const opNamesA = Object.keys(model.VIEW_OPERATIONS[viewA]);
    const opNamesB = Object.keys(model.VIEW_OPERATIONS[viewB]);
    const opA = opNamesA[Math.floor(rng() * opNamesA.length)];
    const opB = opNamesB[Math.floor(rng() * opNamesB.length)];

    const beforeA = model.hashEntityViews(a.doc, entityId);
    const beforeB = model.hashEntityViews(b.doc, entityId);

    const svA = model.encodeStateVector(a);
    const svB = model.encodeStateVector(b);
    const rA = model.applyViewOperation(a.doc, entityId, viewA, opA, rng, "equality");
    const rB = model.applyViewOperation(b.doc, entityId, viewB, opB, rng, "equality");

    // 交换前:各自本地应用后,只允许自己的目标视图变化
    const localAfterA = model.hashEntityViews(a.doc, entityId);
    const localAfterB = model.hashEntityViews(b.doc, entityId);
    const aIsolated =
      rA.applied &&
      localAfterA[model.VIEW_KEYS[viewA]] !== beforeA[model.VIEW_KEYS[viewA]] &&
      viewTypes.every(
        (view) => view === viewA || localAfterA[model.VIEW_KEYS[view]] === beforeA[model.VIEW_KEYS[view]],
      ) &&
      localAfterA.transform === beforeA.transform &&
      localAfterA.appearance === beforeA.appearance;
    const bIsolated =
      rB.applied &&
      localAfterB[model.VIEW_KEYS[viewB]] !== beforeB[model.VIEW_KEYS[viewB]] &&
      viewTypes.every(
        (view) => view === viewB || localAfterB[model.VIEW_KEYS[view]] === beforeB[model.VIEW_KEYS[view]],
      ) &&
      localAfterB.transform === beforeB.transform &&
      localAfterB.appearance === beforeB.appearance;

    const deltaA = model.encodeDeltaSince(a, svA);
    const deltaB = model.encodeDeltaSince(b, svB);
    model.applyUpdate(b, deltaA);
    model.applyUpdate(a, deltaB);

    // 交换后:双方最终状态必须完全一致
    const afterA = model.hashEntityViews(a.doc, entityId);
    const afterB = model.hashEntityViews(b.doc, entityId);
    const peerConsistent = Object.keys(afterA).every((key) => afterA[key] === afterB[key]);

    const ok = aIsolated && bIsolated && peerConsistent;
    concurrentPairs += 1;
    if (ok) concurrentCorrect += 1;

    rows.push({
      timestamp: new Date().toISOString(),
      experiment_id: "E1",
      scene_config: `E=${entityCount},V=${viewCount},U=${userCount},RTT=${rttMs}ms`,
      round,
      user_id: `${a.label}+${b.label}`,
      operation_type: "concurrent_cross_view",
      target_view: `${viewA}+${viewB}`,
      response_time_ms: 0,
      convergence_time_ms: 0,
      success: ok ? 1 : 0,
      error_type: ok ? "" : "concurrent_isolation_failed",
    });
  }

  return {
    rows,
    roundSummary: {
      round,
      correctRate: correctCount / totalChecks,
      pollutionRate: pollutionEvents / totalChecks,
      avgResponseMs: responseSum / totalChecks,
      reverseIsolationCorrectRate: reverseCorrect / reverseChecks,
      reverseChecks,
      concurrentIsolationCorrectRate: concurrentCorrect / concurrentPairs,
      concurrentPairs,
    },
  };
}

/**
 * 运行实验一(默认 S2 场景参数,挂载原型实际实现的全部 3 种视图,重复 rounds 轮)
 */
function percentile(sorted, q) {
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * q;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

async function runIndependenceTest(options) {
  const {
    entityCount = model.SCENES.S2.entityCount,
    viewCount = model.VIEW_TYPES.length, // 挂载原型实际实现的全部视图组件
    userCount = model.SCENES.S2.userCount,
    operationsPerUser = 20,
    rounds = 30,
    rttMs = model.SCENES.S2.rttMs,
    seed = 20260815,
  } = options;
  const viewTypes = model.VIEW_TYPES.slice(0, viewCount);

  const rows = [];
  const roundSummaries = [];

  const e1Start = Date.now();
  console.log(`  [E1] 视图独立性开始(${rounds}轮)...`);
  for (let round = 1; round <= rounds; round += 1) {
    const result = runRound({
      entityCount,
      viewCount,
      userCount,
      operationsPerUser,
      rttMs,
      seed,
      round,
    });
    rows.push(...result.rows);
    roundSummaries.push(result.roundSummary);
    if (round % 5 === 0 || round === rounds) {
      const elapsedSec = ((Date.now() - e1Start) / 1000).toFixed(1);
      console.log(`    E1 完成 ${round}/${rounds} 轮(已用 ${elapsedSec}s)`);
    }
  }

  const correctRates = roundSummaries.map((item) => item.correctRate);
  const pollutionRates = roundSummaries.map((item) => item.pollutionRate);
  const responseTimes = roundSummaries.map((item) => item.avgResponseMs);
  const reverseRates = roundSummaries.map((item) => item.reverseIsolationCorrectRate);
  const concurrentRates = roundSummaries.map((item) => item.concurrentIsolationCorrectRate);

  // 按 (视图 × 操作) 分组统计,供论文表格使用(仅统计 Phase A 的 9 种视图操作)
  const perOperation = new Map();
  for (const row of rows) {
    if (!viewTypes.includes(row.target_view)) continue;
    const key = `${row.target_view}.${row.operation_type}`;
    if (!perOperation.has(key)) {
      perOperation.set(key, { target_view: row.target_view, operation_type: row.operation_type, total: 0, success: 0, response: [] });
    }
    const group = perOperation.get(key);
    group.total += 1;
    group.success += row.success;
    group.response.push(row.response_time_ms);
  }

  const viewOrder = viewTypes.reduce((order, view, index) => {
    order[view] = index;
    return order;
  }, {});

  const phaseAOperations = rows.filter((row) => viewTypes.includes(row.target_view)).length;

  return {
    experiment: "E1",
    rows,
    roundSummaries,
    perOperation: [...perOperation.values()]
      .sort(
        (left, right) =>
          (viewOrder[left.target_view] ?? 99) - (viewOrder[right.target_view] ?? 99) ||
          left.operation_type.localeCompare(right.operation_type),
      )
      .map((group) => {
        const sorted = [...group.response].sort((a, b) => a - b);
        return {
          ...group,
          pollutionRate: 1 - group.success / group.total,
          avgResponseMs: stats.mean(group.response),
          stdResponseMs: stats.std(group.response),
          p50ResponseMs: percentile(sorted, 0.5),
          p95ResponseMs: percentile(sorted, 0.95),
        };
      }),
    summary: {
      experiment_id: "E1",
      scene_config: `E=${entityCount},V=${viewCount},U=${userCount},RTT=${rttMs}ms`,
      operations: phaseAOperations,
      correctRateMean: stats.mean(correctRates),
      correctRateStd: stats.std(correctRates),
      pollutionRateMean: stats.mean(pollutionRates),
      pollutionRateStd: stats.std(pollutionRates),
      avgResponseMs: stats.mean(responseTimes),
      stdResponseMs: stats.std(responseTimes),
      reverseIsolationCorrectRate: stats.mean(reverseRates),
      reverseIsolationStd: stats.std(reverseRates),
      reverseChecks: roundSummaries.reduce((sum, item) => sum + item.reverseChecks, 0),
      concurrentIsolationCorrectRate: stats.mean(concurrentRates),
      concurrentIsolationStd: stats.std(concurrentRates),
      concurrentPairs: roundSummaries.reduce((sum, item) => sum + item.concurrentPairs, 0),
    },
  };
}

module.exports = { runIndependenceTest };
