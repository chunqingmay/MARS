"use strict";

/**
 * MARS 实验文档模型
 * -------------------
 * 与原型保持一致:
 *  - 一个逻辑实体 MarsDigitalEntity 映射为一个 CRDT Map
 *  - 实体挂载多个视图组件 (原型实际实现的 MeshView / VoxelView / CloudPointView)
 *  - Transform 与 Appearance 为跨视图共享属性
 *  - 各视图的几何数据相互独立,位于 entity.views.<viewKey>
 *
 * 同时提供主从派生模式 (master-slave) 的实现:
 *  - 规则1: MeshView 强制设为主表示
 *  - 规则2: 从表示(VoxelView/CloudPointView)禁止直接编辑
 *  - 规则3: MeshView 修改后,从表示全量重新生成(同步等待,计入重建耗时)
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const Y = require("yjs");

// 原型(ECS Components.js)实际实现的视图组件
const VIEW_TYPES = ["MeshView", "VoxelView", "CloudPointView"];

// 视图类型 -> 组件挂载名(与 ECS Components.js 的命名一致)
const VIEW_KEYS = {
  MeshView: "meshView",
  VoxelView: "voxelView",
  CloudPointView: "cloudPointView",
};

// 4.2 基准场景定义。原型仅实现 3 种视图,S3/S4 场景按实际可用视图数配置
const SCENES = {
  S2: { name: "S2", entityCount: 50, viewCount: 3, userCount: 5, rttMs: 100 },
  S3: { name: "S3", entityCount: 500, viewCount: 3, userCount: 20, rttMs: 200 },
  S4: { name: "S4", entityCount: 1000, viewCount: 3, userCount: 50, rttMs: 200 },
};

// ---------------------------------------------------------------------------
// 确定性随机数(与 mars-sync-benchmark 一致)
// ---------------------------------------------------------------------------

function createRng(seed) {
  let value = seed >>> 0;
  return function rng() {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 客户端与场景
// ---------------------------------------------------------------------------

// 确定性 clientID:消除 Yjs 随机 clientID 的 varint 长度差异对带宽对比的影响
function deterministicClientId(label) {
  const match = /^U(\d+)$/.exec(label);
  if (match) return Number(match[1]) + 1;
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return (hash % 0xffff) + 1;
}

function createClient(label) {
  const doc = new Y.Doc({ guid: `mars-paper-${label}-${Date.now()}-${Math.random()}` });
  doc.clientID = deterministicClientId(label);
  return { label, doc };
}

function createTransformMap(values = {}) {
  const transform = new Y.Map();
  transform.set("x", values.x || 0);
  transform.set("y", values.y || 0);
  transform.set("z", values.z || 0);
  transform.set("rx", values.rx || 0);
  transform.set("ry", values.ry || 0);
  transform.set("rz", values.rz || 0);
  transform.set("sx", values.sx || 1);
  transform.set("sy", values.sy || 1);
  transform.set("sz", values.sz || 1);
  transform.set("lastWriter", values.lastWriter || "init");
  return transform;
}

function createViewMap(viewType) {
  const view = new Y.Map();
  view.set("type", viewType);
  view.set("version", 0);
  switch (viewType) {
    case "MeshView":
      view.set("triangles", 12000);
      view.set("vertices", 6000);
      view.set("segments", 1);
      view.set("uvChannels", 1);
      break;
    case "VoxelView":
      view.set("resolution", 32);
      view.set("octreeDepth", 5);
      view.set("voxels", 32768);
      break;
    case "CloudPointView":
      view.set("density", 100);
      view.set("points", 10000);
      view.set("normalEstimated", false);
      break;
    default:
      break;
  }
  return view;
}

function createEntity(doc, entityId, viewTypes, rng) {
  const entities = doc.getMap("entities");
  const entity = new Y.Map();

  const transform = createTransformMap({
    x: Math.round(rng() * 2000) / 100 - 10,
    y: Math.round(rng() * 2000) / 100 - 10,
    z: Math.round(rng() * 2000) / 100 - 10,
  });

  const appearance = new Y.Map([
    ["color", `#${Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0")}`],
    ["opacity", 1],
    ["material", "default"],
  ]);

  const views = new Y.Map();
  for (const viewType of viewTypes) {
    views.set(VIEW_KEYS[viewType], createViewMap(viewType));
  }

  entity.set("entityKind", "MarsDigitalEntity");
  entity.set("activeView", viewTypes[0] || "MeshView");
  entity.set("transform", transform);
  entity.set("appearance", appearance);
  entity.set("views", views);
  entities.set(entityId, entity);
}

/** 按实体数/视图数创建测试场景(同一场景可在多个客户端间用完整文档同步复制) */
function initializeScene(client, { entityCount, viewCount, seed }) {
  const rng = createRng(seed);
  const viewTypes = VIEW_TYPES.slice(0, Math.max(1, Math.min(viewCount, VIEW_TYPES.length)));
  for (let index = 1; index <= entityCount; index += 1) {
    createEntity(client.doc, `e${index}`, viewTypes, rng);
  }
  return viewTypes;
}

// ---------------------------------------------------------------------------
// 视图特有操作:3 种视图 × 3 种操作 = 9 种(原型实际实现的视图)
// ---------------------------------------------------------------------------

const VIEW_OPERATIONS = {
  MeshView: {
    meshSubdivide: {
      desc: "网格细分",
      apply(view) {
        view.set("segments", (view.get("segments") || 1) + 1);
        view.set("triangles", Math.round((view.get("triangles") || 12000) * 1.5));
      },
    },
    meshDecimate: {
      desc: "三角面删减",
      apply(view) {
        view.set("triangles", Math.round((view.get("triangles") || 12000) * 0.7));
      },
    },
    meshUnwrap: {
      desc: "UV 展开",
      apply(view) {
        view.set("uvChannels", (view.get("uvChannels") || 1) + 1);
      },
    },
  },
  VoxelView: {
    voxelResolution: {
      desc: "体素分辨率调整",
      apply(view) {
        const resolution = Math.min(256, (view.get("resolution") || 32) * 2);
        view.set("resolution", resolution);
        view.set("voxels", resolution * resolution * resolution);
      },
    },
    voxelOctree: {
      desc: "八叉树优化",
      apply(view) {
        view.set("octreeDepth", (view.get("octreeDepth") || 5) + 1);
      },
    },
    voxelHollow: {
      desc: "体素挖空",
      apply(view) {
        view.set("hollow", !view.get("hollow"));
      },
    },
  },
  CloudPointView: {
    cloudDensity: {
      desc: "点云密度调节",
      apply(view) {
        view.set("density", (view.get("density") || 100) * 2);
        view.set("points", Math.round((view.get("points") || 10000) * 2));
      },
    },
    cloudNormal: {
      desc: "点法向估计",
      apply(view) {
        view.set("normalEstimated", true);
      },
    },
    cloudDownsample: {
      desc: "点云抽稀",
      apply(view) {
        view.set("points", Math.round((view.get("points") || 10000) * 0.5));
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 视图操作执行 + 主从派生模式
// ---------------------------------------------------------------------------

// 主从派生架构下,从表示全量重建的耗时模型(ms)。原型中无直接测量,
// 以"重建 = 按分辨率/点数重算几何"的经验成本近似,并在 README 中说明。
// 可用 calibration.json 覆盖为原型实测值(source 改为 measured)。
const REBUILD_BASE_MS = {
  MeshView: 0,
  VoxelView: 280,
  CloudPointView: 110,
};

// ---------------------------------------------------------------------------
// 校准文件:模型量与实测值分离
// ---------------------------------------------------------------------------
// calibration.json 结构:
// {
//   "networkRttMs": { "S2": 100, ..., "source": "modeled" },
//   "fps":         { "S2": null, ..., "source": "modeled" },
//   "rebuildMs":   { "VoxelView": 280, ..., "source": "modeled" }
// }
// 优先读校准值;缺文件或缺字段时回退到代码默认值(来源为 modeled)。
let CALIBRATION = { networkRttMs: {}, fps: {}, rebuildMs: {} };
try {
  CALIBRATION = JSON.parse(fs.readFileSync(path.join(__dirname, "calibration.json"), "utf8"));
} catch (_) {
  CALIBRATION = { networkRttMs: {}, fps: {}, rebuildMs: {} };
}

function getRttMs(sceneName, fallback) {
  const v = CALIBRATION.networkRttMs && CALIBRATION.networkRttMs[sceneName];
  return Number.isFinite(v) ? v : fallback;
}

function getRttSource(sceneName) {
  const src = CALIBRATION.networkRttMs && CALIBRATION.networkRttMs.source;
  return Number.isFinite(CALIBRATION.networkRttMs && CALIBRATION.networkRttMs[sceneName])
    ? src || "measured"
    : "modeled";
}

function getMeasuredFps(sceneName) {
  const v = CALIBRATION.fps && CALIBRATION.fps[sceneName];
  return Number.isFinite(v) ? v : null;
}

function getFpsSource(sceneName) {
  return Number.isFinite(CALIBRATION.fps && CALIBRATION.fps[sceneName]) ? "measured" : "modeled";
}

function getRebuildBaseMs(viewType) {
  const v = CALIBRATION.rebuildMs && CALIBRATION.rebuildMs[viewType];
  return Number.isFinite(v) ? v : (REBUILD_BASE_MS[viewType] || 0);
}

function getRebuildSource() {
  return (CALIBRATION.rebuildMs && CALIBRATION.rebuildMs.source) || "modeled";
}

function rebuildCostMs(viewType, rng) {
  return getRebuildBaseMs(viewType) * (0.9 + rng() * 0.2);
}

/**
 * 主从派生模式下,由主表示(MeshView)全量重建从表示。
 * 该函数执行真实的 Yjs 从表示字段写入(可测量),计算耗时部分由校准值给定。
 */
function regenerateSlaveFromMaster(entity, slaveType) {
  const views = entity.get("views");
  const mesh = views.get(VIEW_KEYS.MeshView);
  const slave = views.get(VIEW_KEYS[slaveType]);
  if (!mesh || !slave) return false;
  if (slaveType === "VoxelView") {
    slave.set("resolution", (mesh.get("triangles") || 12000) > 10000 ? 64 : 32);
    slave.set("voxels", slave.get("resolution") ** 3);
  } else if (slaveType === "CloudPointView") {
    slave.set("points", Math.round((mesh.get("vertices") || 6000) * 1.5));
    slave.set("density", 100);
  }
  slave.set("version", (slave.get("version") || 0) + 1);
  return true;
}

/**
 * 对指定实体的指定视图执行视图特有操作。
 * mode = "equality"      : MARS 格式平等模式,直接操作目标视图
 * mode = "master-slave"  : 主从派生模式,遵循规则 1-4
 *
 * 返回 { applied, error, rebuilds }
 */
function applyViewOperation(doc, entityId, viewType, opName, rng, mode = "equality") {
  const opDef = VIEW_OPERATIONS[viewType] && VIEW_OPERATIONS[viewType][opName];
  if (!opDef) {
    return { applied: false, error: `unknown_operation:${viewType}.${opName}`, rebuilds: [] };
  }

  const entity = doc.getMap("entities").get(entityId);
  if (!entity) {
    return { applied: false, error: `entity_missing:${entityId}`, rebuilds: [] };
  }
  const views = entity.get("views");
  const view = views.get(VIEW_KEYS[viewType]);
  if (!view) {
    return { applied: false, error: `view_missing:${viewType}`, rebuilds: [] };
  }

  // 规则 2:主从派生架构下,从表示禁止直接编辑
  if (mode === "master-slave" && viewType !== "MeshView") {
    return { applied: false, error: "slave_view_not_editable", rebuilds: [] };
  }

  opDef.apply(view);
  view.set("version", (view.get("version") || 0) + 1);

  const rebuilds = [];
  if (mode === "master-slave") {
    // 规则 3:主表示修改后,所有从表示全量重新生成(同步等待)。
    // Yjs 字段写入为真实测量;计算耗时(网格重建等)来自校准值/经验常数。
    for (const slaveType of VIEW_TYPES) {
      if (slaveType === viewType) continue;
      const slave = views.get(VIEW_KEYS[slaveType]);
      if (!slave) continue;
      const computeMs = rebuildCostMs(slaveType, rng);
      const writeStart = performance.now();
      regenerateSlaveFromMaster(entity, slaveType);
      const yjsWriteMs = performance.now() - writeStart;
      rebuilds.push({
        view: slaveType,
        computeMs: Math.round(computeMs * 100) / 100,
        yjsWriteMs: Number(yjsWriteMs.toFixed(3)),
      });
    }
  }

  return { applied: true, error: "", rebuilds };
}

// ---------------------------------------------------------------------------
// Transform 共享属性操作(实验二)
// ---------------------------------------------------------------------------

const TRANSFORM_OPS = {
  translate(transform, rng) {
    const axis = ["x", "y", "z"][Math.floor(rng() * 3)];
    const value = Math.round(((transform.get(axis) || 0) + (rng() * 2 - 1)) * 100) / 100;
    transform.set(axis, value);
    return { key: axis, value };
  },
  rotate(transform, rng) {
    const axis = ["rx", "ry", "rz"][Math.floor(rng() * 3)];
    const value = Math.round(((transform.get(axis) || 0) + (rng() * 120 - 60) * (Math.PI / 180)) * 1e6) / 1e6;
    transform.set(axis, value);
    return { key: axis, value };
  },
  scale(transform, rng) {
    const axis = ["sx", "sy", "sz"][Math.floor(rng() * 3)];
    const value = Math.round(Math.max(0.1, (transform.get(axis) || 1) * (0.8 + rng() * 0.4)) * 100) / 100;
    transform.set(axis, value);
    return { key: axis, value };
  },
};

function applyTransformOp(doc, entityId, kind, label, rng) {
  const transform = doc.getMap("entities").get(entityId).get("transform");
  const { key, value } = TRANSFORM_OPS[kind](transform, rng);
  transform.set("lastWriter", label);
  return { transform, key, value, lastWriter: label };
}

// ---------------------------------------------------------------------------
// 哈希与一致性检查
// ---------------------------------------------------------------------------

function toPlain(value) {
  if (value instanceof Y.Map) {
    const plain = {};
    value.forEach((child, key) => {
      plain[key] = toPlain(child);
    });
    return plain;
  }
  if (value instanceof Y.Array) {
    return value.toArray().map(toPlain);
  }
  return value;
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hashMap(map) {
  return sha256Hex(JSON.stringify(toPlain(map)));
}

/** 返回实体全部视图 + 共享属性的状态哈希,键与 VIEW_KEYS 一致 */
function hashEntityViews(doc, entityId) {
  const entity = doc.getMap("entities").get(entityId);
  const hashes = {
    transform: hashMap(entity.get("transform")),
    appearance: hashMap(entity.get("appearance")),
  };
  entity.get("views").forEach((view, key) => {
    hashes[key] = hashMap(view);
  });
  return hashes;
}

// ---------------------------------------------------------------------------
// Yjs 同步原语
// ---------------------------------------------------------------------------

function encodeUpdate(sender, receiver) {
  return Y.encodeStateAsUpdate(sender.doc, Y.encodeStateVector(receiver.doc));
}

/** 取客户端当前状态向量(用于增量编码) */
function encodeStateVector(client) {
  return Y.encodeStateVector(client.doc);
}

/** 相对某个旧状态向量编码增量更新:只包含该向量之后的新增项 */
function encodeDeltaSince(client, preStateVector) {
  return Y.encodeStateAsUpdate(client.doc, preStateVector);
}

function encodeFullDocument(client) {
  return Y.encodeStateAsUpdate(client.doc);
}

function applyUpdate(receiver, update) {
  Y.applyUpdate(receiver.doc, update);
}

function encodedDocumentSize(client) {
  return encodeFullDocument(client).byteLength;
}

function readTransform(doc, entityId) {
  const transform = doc.getMap("entities").get(entityId).get("transform");
  return {
    x: transform.get("x"),
    y: transform.get("y"),
    z: transform.get("z"),
    rx: transform.get("rx"),
    ry: transform.get("ry"),
    rz: transform.get("rz"),
    sx: transform.get("sx"),
    sy: transform.get("sy"),
    sz: transform.get("sz"),
    lastWriter: transform.get("lastWriter"),
  };
}

function positionError(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

// ---------------------------------------------------------------------------
// 性能模型(无浏览器环境下对渲染帧率的近似,README 中说明)
// ---------------------------------------------------------------------------

/**
 * 渲染帧率经验模型:base 4ms + 每实体 0.02ms + 每实体每视图 0.015ms,
 * 另加每帧平均 CRDT 合并耗时,上限 60 FPS。
 */
function estimateFps(entityCount, viewCount, avgMergeMsPerFrame) {
  const renderMs = 4 + entityCount * (0.02 + 0.015 * viewCount);
  const frameMs = Math.max(0.1, renderMs + (avgMergeMsPerFrame || 0));
  return Math.min(60, 1000 / frameMs);
}

module.exports = {
  VIEW_TYPES,
  VIEW_KEYS,
  VIEW_OPERATIONS,
  SCENES,
  REBUILD_BASE_MS,
  createRng,
  createClient,
  initializeScene,
  applyViewOperation,
  applyTransformOp,
  hashEntityViews,
  hashMap,
  encodeUpdate,
  encodeStateVector,
  encodeDeltaSince,
  encodeFullDocument,
  applyUpdate,
  encodedDocumentSize,
  readTransform,
  positionError,
  estimateFps,
  rebuildCostMs,
  regenerateSlaveFromMaster,
  getRttMs,
  getRttSource,
  getMeasuredFps,
  getFpsSource,
  getRebuildBaseMs,
  getRebuildSource,
};
