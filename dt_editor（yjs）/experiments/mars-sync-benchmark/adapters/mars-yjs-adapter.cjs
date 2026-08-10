const Y = require("yjs");

const ENTITY_ID = "mars-sync-benchmark-entity";

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
  transform.set("trial", values.trial || 0);
  return transform;
}

function getEntity(client) {
  return client.doc.getMap("entities").get(ENTITY_ID);
}

function createClient(label) {
  return {
    label,
    doc: new Y.Doc({ guid: `mars-yjs-${label}-${Date.now()}-${Math.random()}` }),
  };
}

function initializeScene(client) {
  const entities = client.doc.getMap("entities");
  const entity = new Y.Map();
  const viewComponents = new Y.Map();

  viewComponents.set("meshView", new Y.Map([
    ["type", "MeshView"],
    ["enabled", true],
    ["geometry", "box"],
    ["material", "benchmark-default"],
  ]));

  entity.set("entityKind", "MarsDigitalEntity");
  entity.set("viewKind", "MarsPhysicalEntity");
  entity.set("activeView", "MeshView");
  entity.set("transform", createTransformMap());
  entity.set("views", viewComponents);

  entities.set(ENTITY_ID, entity);
}

function applyTransformDelta(client, deltaX, metadata) {
  const transform = getEntity(client).get("transform");
  const currentX = transform.get("x") || 0;
  transform.set("x", currentX + deltaX);
  transform.set("lastWriter", client.label);
  transform.set("trial", metadata.trial);
  transform.set("intervalMs", metadata.intervalMs);
}

function encodeUpdate(sender, receiver) {
  const receiverState = Y.encodeStateVector(receiver.doc);
  return Y.encodeStateAsUpdate(sender.doc, receiverState);
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

function readTransformX(client) {
  return getEntity(client).get("transform").get("x");
}

function readTransformSnapshot(client) {
  const transform = getEntity(client).get("transform");
  return {
    x: transform.get("x"),
    y: transform.get("y"),
    z: transform.get("z"),
    lastWriter: transform.get("lastWriter"),
    trial: transform.get("trial"),
    intervalMs: transform.get("intervalMs"),
  };
}

module.exports = {
  engineName: "MARS",
  crdtName: "Yjs",
  createClient,
  initializeScene,
  applyTransformDelta,
  encodeUpdate,
  encodeFullDocument,
  applyUpdate,
  encodedDocumentSize,
  readTransformX,
  readTransformSnapshot,
};
