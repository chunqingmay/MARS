"use strict";

/**
 * 实验五（论文精简版中的“实验三”）：增量同步 vs 派生重建成本
 * -----------------------------------------------------------
 * 目的：量化 MARS 格式平等的性能依据。
 *   - 主从派生模式：MeshView 修改后全量重建 VoxelView / CloudPointView；
 *     重建计算时间、重建数据量、Yjs 写入耗时均为真实测量（不再是 calibration 常数）。
 *   - MARS 模式：只修改视图字段并编码/合并一次 Yjs 增量；
 *     记录本地编辑耗时、增量编码耗时、增量字节数、接收端合并耗时。
 *
 * 几何模型使用真实计算：
 *   - MeshView：单位球面三角网格（顶点数组 + 索引数组）；
 *   - VoxelView：对网格进行 AABB 体素化，生成 Uint8Array 占位体素；
 *   - CloudPointView：在网格表面按面积均匀采样点云，生成 Float32Array。
 *
 * 注意：MARS 的视图组件在原型中保存的是轻量句柄/URI，而不是重型几何数据，
 * 因此 Yjs 增量体积不随几何复杂度增长是设计预期，也是本实验要验证的结论。
 */

const { performance } = require("perf_hooks");
const Y = require("yjs");
const model = require("./mars-model.cjs");
const stats = require("./statistics.cjs");

// 复杂度档位：网格三角形数 / 体素分辨率 / 点云点数
const DEFAULT_LEVELS = [
  { name: "L1", triangles: 1000, voxelRes: 16, pointCount: 1000 },
  { name: "L2", triangles: 10000, voxelRes: 32, pointCount: 10000 },
  { name: "L3", triangles: 50000, voxelRes: 64, pointCount: 50000 },
  { name: "L4", triangles: 100000, voxelRes: 128, pointCount: 100000 },
  { name: "L5", triangles: 500000, voxelRes: 256, pointCount: 500000 },
];

// ---------------------------------------------------------------------------
// 网格构造：单位球面三角网格
// ---------------------------------------------------------------------------

function createSphereMesh(targetTriangleCount) {
  const segments = Math.max(4, Math.round(Math.sqrt(targetTriangleCount / 2)));
  const rings = Math.max(3, Math.floor(targetTriangleCount / (2 * segments)) + 1);

  const positions = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const phi = (Math.PI * ring) / (rings - 1);
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = (2 * Math.PI * segment) / segments;
      positions.push(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
    }
  }

  const indices = [];
  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * segments + segment;
      const b = ring * segments + ((segment + 1) % segments);
      const c = (ring + 1) * segments + segment;
      const d = (ring + 1) * segments + ((segment + 1) % segments);
      indices.push(a, b, c, b, d, c);
    }
  }

  return {
    vertices: new Float32Array(positions),
    indices: new Uint32Array(indices),
    triangleCount: indices.length / 3,
  };
}

// ---------------------------------------------------------------------------
// 全量重建：Mesh -> Voxel / Mesh -> PointCloud
// ---------------------------------------------------------------------------

function meshBounds(mesh) {
  const { vertices } = mesh;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * 轻量体素化：对每个三角形计算重心所在的体素并标记占用，
 * 同时分配完整的 resolution^3 体素数组以反映重建数据量。
 * 返回 { voxels, occupiedCount }。
 * 该算法保留“三角形越多 -> 重建计算越重；分辨率越高 -> 重建数据量越大”的复杂度特征，
 * 同时避免高分辨率下逐三角形 AABB 光栅化导致单轮实验耗时过长。
 */
function voxelizeMesh(mesh, resolution) {
  const { vertices, indices } = mesh;
  const { minX, minY, minZ, maxX, maxY, maxZ } = meshBounds(mesh);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const spanZ = Math.max(1e-6, maxZ - minZ);
  const scaleX = (resolution - 1) / spanX;
  const scaleY = (resolution - 1) / spanY;
  const scaleZ = (resolution - 1) / spanZ;

  const voxels = new Uint8Array(resolution * resolution * resolution);
  let occupiedCount = 0;

  const res = resolution;
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t] * 3;
    const i1 = indices[t + 1] * 3;
    const i2 = indices[t + 2] * 3;

    const cx = (vertices[i0] + vertices[i1] + vertices[i2]) / 3;
    const cy = (vertices[i0 + 1] + vertices[i1 + 1] + vertices[i2 + 1]) / 3;
    const cz = (vertices[i0 + 2] + vertices[i1 + 2] + vertices[i2 + 2]) / 3;

    const gx = Math.max(0, Math.min(res - 1, Math.floor((cx - minX) * scaleX)));
    const gy = Math.max(0, Math.min(res - 1, Math.floor((cy - minY) * scaleY)));
    const gz = Math.max(0, Math.min(res - 1, Math.floor((cz - minZ) * scaleZ)));

    const index = gz * res * res + gy * res + gx;
    if (voxels[index] === 0) {
      voxels[index] = 1;
      occupiedCount += 1;
    }
  }

  return { voxels, occupiedCount };
}

/**
 * 点云重建：在网格表面按三角形面积均匀采样。
 * 返回 Float32Array，长度 pointCount * 3。
 */
function samplePointCloud(mesh, pointCount, rng) {
  const { vertices, indices } = mesh;
  const triangleCount = indices.length / 3;
  const points = new Float32Array(pointCount * 3);

  // 预计算三角形面积权重与累计前缀和（用于 O(log T) 加权采样）
  const weights = new Float64Array(triangleCount);
  const prefix = new Float64Array(triangleCount + 1);
  let totalWeight = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t] * 3;
    const i1 = indices[t + 1] * 3;
    const i2 = indices[t + 2] * 3;
    const ax = vertices[i1] - vertices[i0];
    const ay = vertices[i1 + 1] - vertices[i0 + 1];
    const az = vertices[i1 + 2] - vertices[i0 + 2];
    const bx = vertices[i2] - vertices[i0];
    const by = vertices[i2 + 1] - vertices[i0 + 1];
    const bz = vertices[i2 + 2] - vertices[i0 + 2];
    const crossX = ay * bz - az * by;
    const crossY = az * bx - ax * bz;
    const crossZ = ax * by - ay * bx;
    const weight = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ) / 2;
    weights[t / 3] = weight;
    totalWeight += weight;
    prefix[t / 3 + 1] = totalWeight;
  }

  for (let p = 0; p < pointCount; p += 1) {
    // 按面积权重选三角形（二分查找）
    const target = rng() * totalWeight;
    let lo = 0;
    let hi = triangleCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (prefix[mid + 1] < target) lo = mid + 1;
      else hi = mid;
    }
    const tri = Math.min(lo, triangleCount - 1);

    const i0 = indices[tri * 3] * 3;
    const i1 = indices[tri * 3 + 1] * 3;
    const i2 = indices[tri * 3 + 2] * 3;

    const u = Math.sqrt(rng());
    const v = rng();
    const a = 1 - u;
    const b = u * (1 - v);
    const c = u * v;

    points[p * 3] = a * vertices[i0] + b * vertices[i1] + c * vertices[i2];
    points[p * 3 + 1] = a * vertices[i0 + 1] + b * vertices[i1 + 1] + c * vertices[i2 + 1];
    points[p * 3 + 2] = a * vertices[i0 + 2] + b * vertices[i1 + 2] + c * vertices[i2 + 2];
  }

  return points;
}

// ---------------------------------------------------------------------------
// 主从派生：全量重建测量
// ---------------------------------------------------------------------------

function runRebuildRound(level, mesh, rng) {
  // 重建计算（真实计算：体素化 + 点云采样）
  const rebuildStart = performance.now();
  const { voxels, occupiedCount } = voxelizeMesh(mesh, level.voxelRes);
  const points = samplePointCloud(mesh, level.pointCount, rng);
  const rebuildMs = performance.now() - rebuildStart;

  // 重建产生的数据量
  const rebuildBytes = voxels.length + points.length * Float32Array.BYTES_PER_ELEMENT;
  const rebuildKB = rebuildBytes / 1024;

  // 重建结果写入 Yjs（视图组件只保存轻量摘要字段，与原型一致）
  const doc = new Y.Doc();
  doc.clientID = 1;
  const entities = doc.getMap("entities");
  const entity = new Y.Map();
  const views = new Y.Map();
  const voxelView = new Y.Map();
  const cloudView = new Y.Map();

  voxelView.set("type", "VoxelView");
  voxelView.set("resolution", level.voxelRes);
  voxelView.set("voxelCount", occupiedCount);
  voxelView.set("version", 1);

  cloudView.set("type", "CloudPointView");
  cloudView.set("pointCount", level.pointCount);
  cloudView.set("version", 1);

  views.set("voxelView", voxelView);
  views.set("cloudPointView", cloudView);
  entity.set("entityKind", "MarsDigitalEntity");
  entity.set("views", views);
  entities.set("e1", entity);

  const yjsWriteStart = performance.now();
  voxelView.set("resolution", level.voxelRes);
  voxelView.set("voxelCount", occupiedCount);
  voxelView.set("version", 2);
  cloudView.set("pointCount", level.pointCount);
  cloudView.set("version", 2);
  const yjsWriteMs = performance.now() - yjsWriteStart;

  return {
    rebuildMs,
    rebuildKB,
    yjsWriteMs,
    occupiedVoxels: occupiedCount,
    pointCount: level.pointCount,
  };
}

// ---------------------------------------------------------------------------
// MARS：增量同步测量
// ---------------------------------------------------------------------------

function runIncrementalRound(level) {
  const sourceDoc = new Y.Doc();
  const receiverDoc = new Y.Doc();
  sourceDoc.clientID = 1;
  receiverDoc.clientID = 2;

  const entities = sourceDoc.getMap("entities");
  const entity = new Y.Map();
  const views = new Y.Map();
  const meshView = new Y.Map();

  meshView.set("type", "MeshView");
  meshView.set("version", 0);
  meshView.set("segments", 1);
  meshView.set("triangles", level.triangles);
  meshView.set("vertices", Math.round(level.triangles * 0.5));

  views.set("meshView", meshView);
  entity.set("entityKind", "MarsDigitalEntity");
  entity.set("views", views);
  entities.set("e1", entity);

  // 初始完整同步到接收端
  const fullUpdate = Y.encodeStateAsUpdate(sourceDoc);
  Y.applyUpdate(receiverDoc, fullUpdate);

  // 本地视图编辑（例如网格细分）
  const preStateVector = Y.encodeStateVector(sourceDoc);
  const editStart = performance.now();
  meshView.set("segments", (meshView.get("segments") || 1) + 1);
  meshView.set("triangles", Math.round((meshView.get("triangles") || level.triangles) * 1.5));
  meshView.set("version", (meshView.get("version") || 0) + 1);
  const editMs = performance.now() - editStart;

  // 增量编码
  const encodeStart = performance.now();
  const delta = Y.encodeStateAsUpdate(sourceDoc, preStateVector);
  const encodeMs = performance.now() - encodeStart;

  // 接收端合并
  const mergeStart = performance.now();
  Y.applyUpdate(receiverDoc, delta);
  const mergeMs = performance.now() - mergeStart;

  return {
    editMs,
    encodeMs,
    mergeMs,
    deltaBytes: delta.byteLength,
  };
}

// ---------------------------------------------------------------------------
// 实验主流程
// ---------------------------------------------------------------------------

function meanStd(values) {
  return {
    mean: stats.mean(values),
    std: stats.std(values),
  };
}

async function runIncrementalVsRebuild(options = {}) {
  const {
    repeats = 5,
    seed = 20260815,
    levels = DEFAULT_LEVELS,
  } = options;

  const rows = [];
  const levelSummaries = [];

  for (const level of levels) {
    const rng = model.createRng(seed + level.name.length * 1000);
    const mesh = createSphereMesh(level.triangles);

    const rebuildMsList = [];
    const rebuildKBList = [];
    const yjsWriteMsList = [];
    const editMsList = [];
    const encodeMsList = [];
    const mergeMsList = [];
    const deltaBytesList = [];

    for (let repeat = 1; repeat <= repeats; repeat += 1) {
      const rebuild = runRebuildRound(level, mesh, rng);
      const incremental = runIncrementalRound(level);

      rebuildMsList.push(rebuild.rebuildMs);
      rebuildKBList.push(rebuild.rebuildKB);
      yjsWriteMsList.push(rebuild.yjsWriteMs);
      editMsList.push(incremental.editMs);
      encodeMsList.push(incremental.encodeMs);
      mergeMsList.push(incremental.mergeMs);
      deltaBytesList.push(incremental.deltaBytes);

      const timestamp = new Date().toISOString();
      rows.push({
        timestamp,
        experiment_id: "E5",
        scene_config: `${level.name}:tri=${level.triangles},vox=${level.voxelRes},pts=${level.pointCount}`,
        user_id: "master-slave",
        operation_type: "rebuild",
        target_view: "VoxelView+CloudPointView",
        response_time_ms: Number(rebuild.rebuildMs.toFixed(3)),
        convergence_time_ms: Number(rebuild.yjsWriteMs.toFixed(3)),
        success: 1,
        error_type: "",
        level: level.name,
        condition: "master-slave",
        rebuild_ms: Number(rebuild.rebuildMs.toFixed(3)),
        rebuild_kb: Number(rebuild.rebuildKB.toFixed(3)),
        yjs_write_ms: Number(rebuild.yjsWriteMs.toFixed(3)),
        occupied_voxels: rebuild.occupiedVoxels,
        point_count: rebuild.pointCount,
      });
      rows.push({
        timestamp,
        experiment_id: "E5",
        scene_config: `${level.name}:tri=${level.triangles},vox=${level.voxelRes},pts=${level.pointCount}`,
        user_id: "mars",
        operation_type: "incremental_mesh_edit",
        target_view: "MeshView",
        response_time_ms: Number((incremental.editMs + incremental.encodeMs).toFixed(3)),
        convergence_time_ms: Number(incremental.mergeMs.toFixed(3)),
        success: 1,
        error_type: "",
        level: level.name,
        condition: "mars",
        edit_ms: Number(incremental.editMs.toFixed(3)),
        encode_ms: Number(incremental.encodeMs.toFixed(3)),
        merge_ms: Number(incremental.mergeMs.toFixed(3)),
        delta_bytes: incremental.deltaBytes,
      });
    }

    levelSummaries.push({
      level: level.name,
      triangles: level.triangles,
      voxelRes: level.voxelRes,
      pointCount: level.pointCount,
      rebuildMs: meanStd(rebuildMsList),
      rebuildKB: meanStd(rebuildKBList),
      yjsWriteMs: meanStd(yjsWriteMsList),
      editMs: meanStd(editMsList),
      encodeMs: meanStd(encodeMsList),
      mergeMs: meanStd(mergeMsList),
      deltaBytes: meanStd(deltaBytesList),
    });
  }

  return {
    experiment: "E5",
    rows,
    summary: {
      experiment_id: "E5",
      repeats,
      levels: levelSummaries,
    },
  };
}

module.exports = { runIncrementalVsRebuild, DEFAULT_LEVELS, createSphereMesh, voxelizeMesh, samplePointCloud };
