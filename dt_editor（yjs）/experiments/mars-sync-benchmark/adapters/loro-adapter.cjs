const { LoroDoc } = require("loro-crdt");

const ENTITY_ID = "mars-sync-benchmark-entity";

function createClient(label) {
  const doc = new LoroDoc();
  doc.setPeerId(label === "A" ? 1001 : 1002);
  return { label, doc };
}

function getEntity(client) {
  return client.doc.getMap("entities").get(ENTITY_ID);
}

function initializeScene(client) {
  const entities = client.doc.getMap("entities");
  const entity = entities.ensureMergeableMap(ENTITY_ID);
  const transform = entity.ensureMergeableMap("transform");
  const views = entity.ensureMergeableMap("views");
  const meshView = views.ensureMergeableMap("meshView");

  entity.set("entityKind", "MarsDigitalEntity");
  entity.set("viewKind", "MarsPhysicalEntity");
  entity.set("activeView", "MeshView");

  transform.set("x", 0);
  transform.set("y", 0);
  transform.set("z", 0);
  transform.set("rx", 0);
  transform.set("ry", 0);
  transform.set("rz", 0);
  transform.set("sx", 1);
  transform.set("sy", 1);
  transform.set("sz", 1);
  transform.set("lastWriter", "init");
  transform.set("trial", 0);

  meshView.set("type", "MeshView");
  meshView.set("enabled", true);
  meshView.set("geometry", "box");
  meshView.set("material", "benchmark-default");

  client.doc.commit();
}

function applyTransformDelta(client, deltaX, metadata) {
  const transform = getEntity(client).get("transform");
  const currentX = transform.get("x") || 0;
  transform.set("x", currentX + deltaX);
  transform.set("lastWriter", client.label);
  transform.set("trial", metadata.trial);
  transform.set("intervalMs", metadata.intervalMs);
  client.doc.commit();
}

function encodeUpdate(sender, receiver) {
  return sender.doc.export({ mode: "update", from: receiver.doc.version() });
}

function encodeFullDocument(client) {
  return client.doc.export({ mode: "snapshot" });
}

function applyUpdate(receiver, update) {
  receiver.doc.import(update);
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
  engineName: "Loro",
  crdtName: "Loro",
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
