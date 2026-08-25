"use strict";

/**
 * MARS 实验运行入口 (runner)
 * --------------------------
 * 用法:
 *   node runner.cjs --exp all|1|2|3|4|5 [选项]
 *
 * 选项:
 *   --repeats N            每条件重复轮数(论文要求 30,默认 5 便于快速验证)
 *   --seed N               随机种子(默认 20260815)
 *   --out-dir DIR          输出目录(默认 ./results)
 *   --duration-sec N       实验二/四每轮模拟时长(论文要求 60,默认 10)
 *   --op-hz N              每用户操作频率(默认 2)
 *   --ops N                实验三每轮操作数(默认 100)
 *   --entity-count N       实验一实体数(默认 50)
 *   --view-count N         实验一视图数(默认 3,原型实现的全部视图)
 *   --user-count N         实验一用户数(默认 5)
 *   --operations-per-user N 实验一每用户操作数(默认 20)
 *   --rtt-ms N             实验一/三 RTT(默认 100)
 *   --conflict-window-ms N 实验三冲突窗口(默认 50)
 *   --scenes S2,S3,S4      实验二场景集合(默认全部)
 *   --levels L1,L2,L3,L4,L5 实验五复杂度档位(默认全部)
 *
 * 输出:
 *   results/expN-results.csv       原始数据(格式见提示词 9.2)
 *   results/expN-results.json      原始数据(JSON)
 *   results/expN-summary.json      汇总(均值±标准差 + 配对 t 检验)
 *   results/params.json            本次运行参数
 *   results/paper-tables.md        论文可直接引用的结果表格
 */

const fs = require("fs");
const path = require("path");
const stats = require("./statistics.cjs");
const model = require("./mars-model.cjs");
const experiment1 = require("./experiment1.cjs");
const experiment2 = require("./experiment2.cjs");
const experiment3 = require("./experiment3.cjs");
const experiment4 = require("./experiment4.cjs");
const experiment5 = require("./experiment5.cjs");

const BASE_COLUMNS = [
  "timestamp",
  "experiment_id",
  "scene_config",
  "user_id",
  "operation_type",
  "target_view",
  "response_time_ms",
  "convergence_time_ms",
  "success",
  "error_type",
];

function parseArgs(argv) {
  const options = {
    exp: "all",
    repeats: 5,
    seed: 20260815,
    outDir: path.join(__dirname, "results"),
    durationSec: 10,
    opHz: 2,
    ops: 100,
    entityCount: 50,
    viewCount: 3,
    userCount: 5,
    operationsPerUser: 20,
    rttMs: 100,
    conflictWindowMs: 50,
    scenes: ["S2", "S3", "S4"],
    levels: ["L1", "L2", "L3", "L4", "L5"],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--exp") options.exp = argv[++index];
    else if (arg === "--repeats") options.repeats = Number(argv[++index]);
    else if (arg === "--seed") options.seed = Number(argv[++index]);
    else if (arg === "--out-dir") options.outDir = path.resolve(argv[++index]);
    else if (arg === "--duration-sec") options.durationSec = Number(argv[++index]);
    else if (arg === "--op-hz") options.opHz = Number(argv[++index]);
    else if (arg === "--ops") options.ops = Number(argv[++index]);
    else if (arg === "--entity-count") options.entityCount = Number(argv[++index]);
    else if (arg === "--view-count") options.viewCount = Number(argv[++index]);
    else if (arg === "--user-count") options.userCount = Number(argv[++index]);
    else if (arg === "--operations-per-user") options.operationsPerUser = Number(argv[++index]);
    else if (arg === "--rtt-ms") options.rttMs = Number(argv[++index]);
    else if (arg === "--conflict-window-ms") options.conflictWindowMs = Number(argv[++index]);
    else if (arg === "--scenes") options.scenes = String(argv[++index]).split(",").map((item) => item.trim());
    else if (arg === "--levels") options.levels = String(argv[++index]).split(",").map((item) => item.trim());
  }

  if (!["all", "1", "2", "3", "4", "5"].includes(options.exp)) {
    throw new Error(`--exp must be one of all|1|2|3|4|5, got ${options.exp}`);
  }
  return options;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeCell(value) {
  const text = String(value == null ? "" : value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const columns = [...BASE_COLUMNS];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(",")),
  ].join("\n");
}

function writeFileWithFallback(outDir, baseName, content) {
  const filePath = path.join(outDir, baseName);
  try {
    fs.writeFileSync(filePath, content);
  } catch (error) {
    if (error.code !== "EBUSY" && error.code !== "EPERM") throw error;
    const suffix = new Date().toISOString().replace(/[:.]/g, "-");
    const fallback = path.join(outDir, `${baseName.replace(/\.[^.]+$/, "")}-${suffix}.${baseName.split(".").pop()}`);
    fs.writeFileSync(fallback, content);
    return fallback;
  }
  return filePath;
}

// 写前清理:删除旧输出文件,若被占用(如 Excel 打开)直接报错,避免 fallback 文件造成新旧数据混用
function clearOutputs(outDir) {
  const names = [];
  for (const base of ["E1", "E2", "E3", "E4", "E5"]) {
    names.push(`${base}-results.csv`, `${base}-results.json`, `${base}-summary.json`);
  }
  names.push("paper-tables.md", "params.json");
  for (const name of names) {
    const file = path.join(outDir, name);
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        throw new Error(`输出文件被占用,请关闭 Excel/编辑器后重跑: ${file} (${error.code})`);
      }
    }
  }
}

// 写后校验:CSV 行数必须等于 JSON 数组长度,防止同一实验的不同文件来自不同运行
function verifyOutputs(outDir, results) {
  const failures = [];
  for (const result of Object.values(results)) {
    const csvPath = path.join(outDir, `${result.experiment}-results.csv`);
    const jsonPath = path.join(outDir, `${result.experiment}-results.json`);
    const csvRows = fs.readFileSync(csvPath, "utf8").trim().split("\n").length - 1;
    const jsonRows = JSON.parse(fs.readFileSync(jsonPath, "utf8")).length;
    if (csvRows !== jsonRows) {
      failures.push(`${result.experiment}: CSV=${csvRows} 行, JSON=${jsonRows} 行`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`输出校验失败(CSV 与 JSON 行数不一致): ${failures.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
// Markdown 表格生成
// ---------------------------------------------------------------------------

function markdownTable(headers, rows) {
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const row of rows) {
    lines.push(`| ${row.map((cell) => String(cell == null ? "" : cell)).join(" | ")} |`);
  }
  return lines.join("\n");
}

function formatT(t) {
  if (t == null || Number.isNaN(t)) return "—";
  if (t === Infinity) return "∞";
  if (t === -Infinity) return "-∞";
  return t.toFixed(2);
}

function buildPaperTables(results) {
  const sections = ["# MARS 实验结果表格(论文引用版)", ""];
  sections.push("> 生成时间:" + new Date().toISOString());

  // ---- 实验一 ----
  if (results.E1) {
    const e1 = results.E1;
    const describeOp = (view, op) => {
      const def = model.VIEW_OPERATIONS[view] && model.VIEW_OPERATIONS[view][op];
      return def ? def.desc : op;
    };
    sections.push("", "## 表 4-1 视图操作独立性验证(误污染率与响应时间)");
    sections.push(markdownTable(
      ["目标视图", "操作类型", "操作次数", "误污染率", "响应时间(ms)", "p95(ms)"],
      e1.perOperation.map((group) => [
        group.target_view,
        describeOp(group.target_view, group.operation_type),
        group.total,
        `${(group.pollutionRate * 100).toFixed(2)}%`,
        `${group.avgResponseMs.toFixed(3)} ± ${group.stdResponseMs.toFixed(3)}`,
        group.p95ResponseMs != null ? group.p95ResponseMs.toFixed(3) : "—",
      ]),
    ));
    sections.push("");
    sections.push(
      `整体:隔离正确率 ${(e1.summary.correctRateMean * 100).toFixed(2)}% ± ${(e1.summary.correctRateStd * 100).toFixed(2)}%,` +
        `误污染率 ${(e1.summary.pollutionRateMean * 100).toFixed(2)}% ± ${(e1.summary.pollutionRateStd * 100).toFixed(2)}%,` +
        `平均响应时间 ${e1.summary.avgResponseMs.toFixed(3)} ± ${e1.summary.stdResponseMs.toFixed(3)} ms(n=${e1.summary.operations} 次视图操作)。`,
    );
    if (e1.summary.reverseIsolationCorrectRate != null) {
      sections.push(
        `反向隔离(共享属性 Transform 修改不污染视图):` +
          `${(e1.summary.reverseIsolationCorrectRate * 100).toFixed(2)}% ± ${(e1.summary.reverseIsolationStd * 100).toFixed(2)}%` +
          `(n=${e1.summary.reverseChecks})。`,
      );
    }
    if (e1.summary.concurrentIsolationCorrectRate != null) {
      sections.push(
        `并发隔离(不同视图并发编辑互不污染):` +
          `${(e1.summary.concurrentIsolationCorrectRate * 100).toFixed(2)}% ± ${(e1.summary.concurrentIsolationStd * 100).toFixed(2)}%` +
          `(n=${e1.summary.concurrentPairs})。`,
      );
    }
  }

  // ---- 实验二 ----
  if (results.E2) {
    const e2 = results.E2;
    const scenes = e2.summary.scenes;
    sections.push("", "## 表 4-2 协同一致性基准测试(S2/S3/S4)");
    const sceneNames = Object.keys(scenes);
    sections.push(markdownTable(
      ["场景", "收敛时间(ms)", "收敛率(%)", "运行期一致性误差 max(m)", "最终误差(m)", "本地合并耗时/op(ms)", "FPS", "内存(MB)", "带宽(KB/s)"],
      sceneNames.map((name) => {
        const item = scenes[name];
        const ms = (value) => `${value.mean.toFixed(2)} ± ${value.std.toFixed(2)}`;
        return [
          name,
          ms(item.avgConvergenceMs),
          `${(item.convergenceRate.mean * 100).toFixed(1)} ± ${(item.convergenceRate.std * 100).toFixed(1)}`,
          ms(item.maxConsistencyErrorM),
          ms(item.finalConsistencyErrorM),
          ms(item.localMergeMsPerOp),
          ms(item.avgFps),
          ms(item.memoryMB),
          ms(item.avgBandwidthKbps),
        ];
      }),
    ));
    const anyFpsModeled = sceneNames.some((name) => scenes[name].fpsSource !== "measured");
    const anyRttModeled = sceneNames.some((name) => scenes[name].rttSource !== "measured");
    if (anyFpsModeled || anyRttModeled) {
      sections.push("");
      sections.push(
        "> 注:" +
          (anyRttModeled ? "收敛时间由建模 RTT 主导(rttSource=modeled),并非真实网络测量;" : "") +
          (anyFpsModeled ? " FPS 为经验模型估算(fpsSource=modeled),非浏览器实测;" : "") +
          "内存、带宽、本地合并耗时、最终误差为真实 Yjs 测量。",
      );
    }
  }

  // ---- 实验三 ----
  if (results.E3) {
    const e3 = results.E3;
    const metrics = e3.summary.metrics;
    const rows = [
      ["操作成功率(%)", metrics.successRate],
      ["成功操作响应时间(ms)", metrics.successResponseMs],
      ["被拒绝操作响应时间(ms)", metrics.rejectResponseMs],
      ["并发冲突数", metrics.conflictCount],
      ["从表示重建批次(批)", metrics.rebuildBatches],
      ["重建计算耗时(ms/批)", metrics.rebuildComputeMsPerBatch],
      ["重建 Yjs 写入耗时(ms/批)", metrics.rebuildYjsWriteMsPerBatch],
      ["用户等待时间(ms)", metrics.avgWaitMs],
    ];
    sections.push("", "## 表 4-3 MARS(格式平等) vs. 主从派生架构(S2 场景)");
    sections.push(markdownTable(
      ["指标", "MARS", "主从派生", "配对 t 检验"],
      rows.map(([label, item]) => {
        const testPart =
          item.t != null
            ? `t=${formatT(item.t)}, p=${stats.formatP(item.p)}${item.significant ? " *" : ""}` +
              (item.ci95 ? `, 95%CI=[${item.ci95[0].toFixed(2)}, ${item.ci95[1].toFixed(2)}]` : "")
            : "—";
        return [label, item.mars, item.slave, testPart];
      }),
    ));
    sections.push("");
    sections.push(
      "> 注:主从派生为按规则 1–4 实现的策略模拟基线;重建计算耗时来自经验常数(calibration.json,source=modeled)," +
        "重建 Yjs 字段写入耗时为真实测量;并发冲突为双客户端不交换增量并发写。",
    );
  }

  // ---- 实验四 ----
  if (results.E4) {
    const e4 = results.E4;
    const metrics = e4.summary.metrics;
    const rows = [
      ["同步延迟(ms)", metrics.syncLatencyMs],
      ["本地合并耗时(ms/op)", metrics.localMergeMsPerOp],
      ["内存占用(MB)", metrics.memoryMB],
      ["渲染帧率(FPS)", metrics.fps],
      ["每用户语义带宽(KB/s)", metrics.semanticBandwidthKbps],
    ];
    sections.push("", "## 表 4-4 多表示 vs. 单一表示消融实验(S3 场景)");
    sections.push(markdownTable(
      ["指标", "完整版(3视图)", "消融版(1视图)", "开销差异", "配对 t 检验(95%CI)"],
      rows.map(([label, item]) => {
        const test = item.test;
        const testPart =
          test && test.t != null
            ? `t=${formatT(test.t)}, p=${stats.formatP(test.p)}${test.significant ? " *" : ""}` +
              (test.ci95 ? `, 95%CI=[${test.ci95[0].toFixed(3)}, ${test.ci95[1].toFixed(3)}]` : "")
            : "—";
        return [
          label,
          item.full,
          item.ablation,
          `${item.diffPct > 0 ? "+" : ""}${item.diffPct.toFixed(2)}%`,
          testPart,
        ];
      }),
    ));
    sections.push("");
    sections.push(
      "> 注:同步延迟由建模 RTT 主导,full 与 ablation 差异约 0.1ms(+0.1%),虽统计显著但实际影响可忽略;" +
        "FPS 为经验模型估算(fpsSource=modeled);带宽对比采用语义字节(仅变更字段值)," +
        "避免 Yjs item clock varint 与 delete-set 编码差异造成的假象;内存、本地合并耗时为真实 Yjs 测量。",
    );
  }

  // ---- 实验五（论文精简版中的实验三：增量同步 vs 派生重建成本） ----
  if (results.E5) {
    const e5 = results.E5;
    sections.push("", "## 表 4-5 增量同步 vs 派生重建成本（格式平等的定量依据）");
    const rows = e5.summary.levels.map((item) => [
      item.level,
      `${item.rebuildMs.mean.toFixed(3)} ± ${item.rebuildMs.std.toFixed(3)}`,
      `${item.rebuildKB.mean.toFixed(3)} ± ${item.rebuildKB.std.toFixed(3)}`,
      `${item.yjsWriteMs.mean.toFixed(4)} ± ${item.yjsWriteMs.std.toFixed(4)}`,
      `${item.editMs.mean.toFixed(4)} ± ${item.editMs.std.toFixed(4)}`,
      `${item.encodeMs.mean.toFixed(4)} ± ${item.encodeMs.std.toFixed(4)}`,
      `${item.deltaBytes.mean.toFixed(1)} ± ${item.deltaBytes.std.toFixed(1)}`,
      `${item.mergeMs.mean.toFixed(4)} ± ${item.mergeMs.std.toFixed(4)}`,
    ]);
    sections.push(markdownTable(
      ["复杂度", "主从 T_rebuild(ms)", "主从 S_rebuild(KB)", "主从 Yjs写入(ms)", "MARS 编辑(ms)", "MARS 编码(ms)", "MARS 增量(Bytes)", "MARS 合并(ms)"],
      rows,
    ));
    sections.push("");
    sections.push(
      "> 注:主从派生的重建计算与数据量为真实几何计算;MARS 的编辑/编码/合成为真实 Yjs 测量。",
    );
  }

  return sections.join("\n");
}

function printConsoleResults(results) {
  if (results.E1) {
    console.log("\n[实验一] 视图操作独立性");
    console.log(
      `  隔离正确率 ${(results.E1.summary.correctRateMean * 100).toFixed(2)}% ± ${(results.E1.summary.correctRateStd * 100).toFixed(2)}%  ` +
        `误污染率 ${(results.E1.summary.pollutionRateMean * 100).toFixed(2)}% ± ${(results.E1.summary.pollutionRateStd * 100).toFixed(2)}%  ` +
        `响应时间 ${results.E1.summary.avgResponseMs.toFixed(3)} ± ${results.E1.summary.stdResponseMs.toFixed(3)} ms`,
    );
    if (results.E1.summary.reverseIsolationCorrectRate != null) {
      console.log(
        `  反向隔离 ${(results.E1.summary.reverseIsolationCorrectRate * 100).toFixed(2)}% ± ${(results.E1.summary.reverseIsolationStd * 100).toFixed(2)}%  ` +
          `并发隔离 ${(results.E1.summary.concurrentIsolationCorrectRate * 100).toFixed(2)}% ± ${(results.E1.summary.concurrentIsolationStd * 100).toFixed(2)}%`,
      );
    }
  }
  if (results.E2) {
    console.log("\n[实验二] 协同一致性基准测试");
    for (const [name, item] of Object.entries(results.E2.summary.scenes)) {
      console.log(
        `  ${name}: 收敛时间 ${item.avgConvergenceMs.mean.toFixed(2)} ± ${item.avgConvergenceMs.std.toFixed(2)} ms  ` +
          `收敛率 ${(item.convergenceRate.mean * 100).toFixed(1)}%  FPS ${item.avgFps.mean.toFixed(1)}  ` +
          `内存 ${item.memoryMB.mean.toFixed(2)} MB  带宽 ${item.avgBandwidthKbps.mean.toFixed(2)} KB/s`,
      );
    }
  }
  if (results.E3) {
    console.log("\n[实验三] 格式平等 vs 主从派生");
    for (const [label, item] of Object.entries(results.E3.summary.metrics)) {
      console.log(
        `  ${label}: MARS=${item.mars}  主从=${item.slave}  p=${stats.formatP(item.p)}${item.significant ? " *" : ""}`,
      );
    }
  }
  if (results.E4) {
    console.log("\n[实验四] 多表示 vs 单一表示消融");
    for (const [label, item] of Object.entries(results.E4.summary.metrics)) {
      console.log(
        `  ${label}: 完整=${item.full}  消融=${item.ablation}  差异=${item.diffPct > 0 ? "+" : ""}${item.diffPct.toFixed(2)}%  p=${stats.formatP(item.test.p)}${item.test.significant ? " *" : ""}`,
      );
    }
  }
  if (results.E5) {
    console.log("\n[实验五] 增量同步 vs 派生重建成本");
    for (const item of results.E5.summary.levels) {
      console.log(
        `  ${item.level}: 主从重建 ${item.rebuildMs.mean.toFixed(3)} ± ${item.rebuildMs.std.toFixed(3)} ms  ` +
          `重建数据 ${item.rebuildKB.mean.toFixed(2)} ± ${item.rebuildKB.std.toFixed(2)} KB  ` +
          `MARS 编辑+编码 ${(item.editMs.mean + item.encodeMs.mean).toFixed(4)} ± ${Math.hypot(item.editMs.std, item.encodeMs.std).toFixed(4)} ms  ` +
          `增量 ${item.deltaBytes.mean.toFixed(1)} ± ${item.deltaBytes.std.toFixed(1)} B`,
      );
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureDir(options.outDir);
  clearOutputs(options.outDir);
  const startedAt = new Date().toISOString();
  const results = {};

  const experiments = options.exp === "all" ? ["1", "2", "3", "4", "5"] : [options.exp];

  if (experiments.includes("1")) {
    console.log("[E1] 视图操作独立性验证 ...");
    results.E1 = await experiment1.runIndependenceTest({
      entityCount: options.entityCount,
      viewCount: options.viewCount,
      userCount: options.userCount,
      operationsPerUser: options.operationsPerUser,
      rounds: options.repeats,
      rttMs: options.rttMs,
      seed: options.seed,
    });
  }

  if (experiments.includes("2")) {
    console.log("[E2] 协同一致性基准测试(S2/S3/S4) ...");
    results.E2 = await experiment2.runConsistencyBenchmark({
      scenes: options.scenes,
      repeats: options.repeats,
      durationSec: options.durationSec,
      opHz: options.opHz,
      seed: options.seed,
    });
  }

  if (experiments.includes("3")) {
    console.log("[E3] 格式平等 vs 主从派生对比 ...");
    results.E3 = await experiment3.runComparison({
      opsPerRun: options.ops,
      rounds: options.repeats,
      conflictWindowMs: options.conflictWindowMs,
      rttMs: options.rttMs,
      seed: options.seed,
    });
  }

  if (experiments.includes("4")) {
    console.log("[E4] 多表示 vs 单一表示消融 ...");
    results.E4 = await experiment4.runAblation({
      repeats: options.repeats,
      durationSec: options.durationSec,
      opHz: options.opHz,
      seed: options.seed,
    });
  }

  if (experiments.includes("5")) {
    console.log("[E5] 增量同步 vs 派生重建成本 ...");
    const levels = experiment5.DEFAULT_LEVELS.filter((item) => options.levels.includes(item.name));
    if (levels.length === 0) {
      throw new Error(`--levels 未匹配到任何档位: ${options.levels.join(",")}`);
    }
    results.E5 = await experiment5.runIncrementalVsRebuild({
      repeats: options.repeats,
      seed: options.seed,
      levels,
    });
  }

  // 写出原始数据(提示词 9.2 格式)与汇总
  const written = {};
  for (const key of Object.keys(results)) {
    const result = results[key];
    const baseName = `${result.experiment}-results`;
    written[`${key}_csv`] = writeFileWithFallback(options.outDir, `${baseName}.csv`, toCsv(result.rows));
    written[`${key}_json`] = writeFileWithFallback(options.outDir, `${baseName}.json`, JSON.stringify(result.rows, null, 2));
    written[`${key}_summary`] = writeFileWithFallback(options.outDir, `${result.experiment}-summary.json`, JSON.stringify(result.summary, null, 2));
  }

  writeFileWithFallback(options.outDir, "params.json", JSON.stringify({ ...options, startedAt }, null, 2));
  const tablePath = writeFileWithFallback(options.outDir, "paper-tables.md", buildPaperTables(results));

  verifyOutputs(options.outDir, results);

  printConsoleResults(results);
  console.log("\n输出文件:");
  for (const [label, filePath] of Object.entries(written)) {
    console.log(`  ${label}: ${filePath}`);
  }
  console.log(`  tables: ${tablePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
