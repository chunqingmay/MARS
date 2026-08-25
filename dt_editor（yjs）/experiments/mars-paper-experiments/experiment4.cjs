"use strict";

/**
 * 实验四:多表示 vs. 单一表示消融实验
 * ---------------------------------
 * 验证多表示模式带来的性能开销是否可接受。
 *  完整版:每实体挂载原型实现的全部 3 种视图(Mesh/Voxel/CloudPoint)
 *  消融版:每实体仅保留 MeshView,移除其他视图组件
 * 在 S3 场景(500 实体)下对比同步延迟、内存、FPS。
 */

const model = require("./mars-model.cjs");
const stats = require("./statistics.cjs");
const { runScenarioRound } = require("./experiment2.cjs");

/**
 * 运行实验四(默认 S3 场景,重复 rounds 轮)
 */
async function runAblation(options) {
  const {
    repeats = 30,
    durationSec = 10,
    opHz = 2,
    syncWaitMs = 1000,
    sampleRateHz = 60,
    seed = 20260815,
  } = options;

  const scene = model.SCENES.S3;
  const fullScene = { ...scene, name: "S3-full" };
  const ablationScene = { ...scene, name: "S3-abl", viewCount: 1 };

  const rows = [];
  const repeatsSummary = { full: [], ablation: [] };

  const e4Start = Date.now();
  console.log(`  [E4] S3 消融开始(full=3视图 vs ablation=1视图, ${repeats}轮 × ${durationSec}s)...`);
  for (let repeat = 1; repeat <= repeats; repeat += 1) {
    const fullResult = runScenarioRound({
      scene: fullScene,
      durationSec,
      opHz,
      syncWaitMs,
      sampleRateHz,
      seed: seed + repeat,
      experimentId: "E4",
    });
    const ablationResult = runScenarioRound({
      scene: ablationScene,
      durationSec,
      opHz,
      syncWaitMs,
      sampleRateHz,
      seed: seed + repeat,
      experimentId: "E4",
    });

    for (const row of fullResult.rows) {
      rows.push({ ...row, condition: "full" });
    }
    for (const row of ablationResult.rows) {
      rows.push({ ...row, condition: "ablation" });
    }
    repeatsSummary.full.push({ ...fullResult.summary, condition: "full" });
    repeatsSummary.ablation.push({ ...ablationResult.summary, condition: "ablation" });
    if (repeat % 5 === 0 || repeat === repeats) {
      const elapsedSec = ((Date.now() - e4Start) / 1000).toFixed(1);
      console.log(`    E4 完成 ${repeat}/${repeats} 轮(已用 ${elapsedSec}s)`);
    }
  }

  const full = repeatsSummary.full;
  const ablation = repeatsSummary.ablation;

  const diffPercent = (key) =>
    (stats.mean(full.map((item) => item[key])) - stats.mean(ablation.map((item) => item[key]))) /
    Math.max(1e-9, stats.mean(ablation.map((item) => item[key]))) *
    100;

  const paired = (key) =>
    stats.pairedTTest(
      full.map((item) => item[key]),
      ablation.map((item) => item[key]),
    );

  return {
    experiment: "E4",
    rows,
    repeats: repeatsSummary,
    summary: {
      experiment_id: "E4",
      scene_config: `S3:E=500,full=3views,ablation=1view,U=20,RTT=200ms`,
      durationSec,
      metrics: {
        syncLatencyMs: {
          full: stats.formatMeanStd(full.map((item) => item.avgConvergenceMs)),
          ablation: stats.formatMeanStd(ablation.map((item) => item.avgConvergenceMs)),
          diffPct: diffPercent("avgConvergenceMs"),
          test: paired("avgConvergenceMs"),
        },
        localMergeMsPerOp: {
          full: stats.formatMeanStd(full.map((item) => item.localMergeMsPerOp)),
          ablation: stats.formatMeanStd(ablation.map((item) => item.localMergeMsPerOp)),
          diffPct: diffPercent("localMergeMsPerOp"),
          test: paired("localMergeMsPerOp"),
        },
        memoryMB: {
          full: stats.formatMeanStd(full.map((item) => item.memoryMB)),
          ablation: stats.formatMeanStd(ablation.map((item) => item.memoryMB)),
          diffPct: diffPercent("memoryMB"),
          test: paired("memoryMB"),
        },
        fps: {
          full: stats.formatMeanStd(full.map((item) => item.avgFps)),
          ablation: stats.formatMeanStd(ablation.map((item) => item.avgFps)),
          diffPct: diffPercent("avgFps"),
          test: paired("avgFps"),
        },
        semanticBandwidthKbps: {
          full: stats.formatMeanStd(full.map((item) => item.semanticBandwidthKbps)),
          ablation: stats.formatMeanStd(ablation.map((item) => item.semanticBandwidthKbps)),
          diffPct: diffPercent("semanticBandwidthKbps"),
          test: paired("semanticBandwidthKbps"),
        },
      },
    },
  };
}

module.exports = { runAblation };
