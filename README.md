# DT-Editor: MARS — Multi-representation Adaptive Real-time Sync 3D Collaborative Editor

[![Vue](https://img.shields.io/badge/Vue-2.6.14-4FC08D)](https://vuejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.124.0-000000)](https://threejs.org/)
[![Yjs](https://img.shields.io/badge/Yjs-13.5.42-2C8EBB)](https://yjs.dev/)
[![Node](https://img.shields.io/badge/Node-Express-green)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-local-47A248)](https://mongodb.com/)

A real-time collaborative 3D modeling editor built on the **MARS framework** — enabling multi-representation editing with CRDT-based decentralized synchronization across heterogeneous clients.

> **MARS** (Multi-representation Adaptive Real-time Sync) unifies heterogeneous 3D representations (mesh, voxel, point cloud) under a shared CRDT-backed data model, decoupling logical entities from visual presentation to achieve strong eventual consistency.

---

## ✨ Features

### 🎨 3D Modeling
- **Primitive Geometry** — Cube, Sphere, Cylinder, Torus, and Polyhedra (Tetrahedron/Octahedron/Dodecahedron)
- **Boolean Operations** — CSG Intersect, Union, and Subtract
- **Object Grouping** — Logical grouping with shared transforms
- **Layer Management** — 5-layer system with per-layer visibility and color coding

### 👥 Real-time Collaboration
- **Yjs CRDT** — Conflict-free Replicated Data Types for automatic conflict resolution
- **WebSocket Sync** — y-websocket transport layer
- **Live Cursors** — Multi-user cursor awareness with cross-device calibration
- **Concurrent Editing** — Multi-user transform operations converge to consistent state

### 📦 Multi-representation (MARS)
- **Mesh View (GridView)** — GLB polygonal mesh for desktop rendering
- **Voxel View** — Volumetric grid for spatial queries
- **Point Cloud View** — PLY point cloud for lightweight mobile display
- **ActiveView** — Each client independently manages its own active view without affecting others
- **On-demand View Loading** — Resources loaded lazily when switching ActiveView

### 📁 Import / Export
- **Import** — Local file (STL, FBX, GLTF, OBJ, Blender) + part library + model library
- **Export** — GLTF, STL, OBJ formats

### 🧩 Self-contained ECS World
- **Entity-Component-System** — Decoupled 3D scene management with 19 component types
- **10 Systems** — Transform, Render, Mesh, CRDT, Input, Export, Layer, Physic, ViewEdit, PhygitalSync
- **Own Render Loop** — ECSWorld owns `requestAnimationFrame` cycle and `renderer.render()`
- **Lifecycle API** — `start()` / `stop()` / `onBeforeRender` / `onAfterRender` hooks

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   index.vue (UI Layer)                     │
│          Vue.js + Element UI + dat.GUI                     │
├────────────────────────────────────────────────────────────┤
│              ECSWorld (Self-contained Runtime)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │Transform │ │  Mesh    │ │  Input   │ │   CRDT       │ │
│  │ System   │ │ System   │ │ System   │ │   System     │ │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────────┤ │
│  │ Render   │ │  Layer   │ │ Export   │ │ PhygitalSync │ │
│  │ System   │ │ System   │ │ System   │ │              │ │
│  ├──────────┤ ├──────────┤ └──────────┘ └──────────────┘ │
│  │ Physic   │ │ViewEdit  │                                 │
│  └──────────┘ └──────────┘                                 │
│         ↓                                                 │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────────┐ │
│  │EntityManager │  │ Components │  │ THREE.Scene +     │ │
│  │  (CRUD+Sync) │  │ (19 types) │  │ THREE.Group       │ │
│  └──────────────┘  └────────────┘  └───────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                    Yjs CRDT Layer                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ doc.getMap('entities') — LWW-Register / LWW-Set     │  │
│  │ y-websocket Provider                                │  │
│  └─────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│                 Backend (Node.js + Express)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ User API │ │ Doc API  │ │Model API │ │ File Upload  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │
│  ┌─────────────────────────────────────────────────────┐  │
│  │     MongoDB (users, documents, models, modelFiles)  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 🧪 CRDT Data Model (MARS)

Each `MarsDigitalEntity` is a Y.Map containing LWW-Register and LWW-Set entries:

```json
"chair_1": {
  "meshView":    { "value": "../chair.glb",   "type": "LWW-Register" },
  "voxelView":   { "value": "../chair.vox",   "type": "LWW-Register" },
  "cloudPointView": { "value": "../chair.ply","type": "LWW-Register" },
  "transform":   { "value": {"x":0,"y":0,"z":0,...}, "type": "LWW-Register" },
  "appearance":  { "value": {"color":"#8B4513","opacity":1.0}, "type": "LWW-Register" },
  "layer":       { "value": 1,                "type": "LWW-Register" },
  "groupGroupId":{ "value": 5,                "type": "LWW-Register" },
  "groupMembers":{ "value": ["u1","u2"],      "type": "LWW-Set" },
  "binding":     { "value": "physical_1",     "type": "LWW-Register" },
  "deleted":     { "value": "false",          "type": "LWW-Register" },
  "type":        { "value": "cube",           "type": "LWW-Register" }
}
```

> **Note**: ActiveView is intentionally **not synchronized** across clients — each client independently chooses which view representation to display, enabling heterogeneous rendering without forcing view uniformity.

---

## 🔬 Experiments

Three verification experiments validate MARS correctness against the paper's specifications:

| Exp | Description | Target | Auto-verify |
|:---:|-------------|:------:|:-----------:|
| 1 | Chair Y-axis translation (+15) | Position error < 0.01 | ✅ PASS/FAIL |
| 2 | Chair Z-axis rotation (45°) | Rotation error < 0.1° | ✅ PASS/FAIL |
| 3 | Async MeshView load (500ms) + 3 deferred edits | State cache & merge | ✅ PASS/FAIL |

Each experiment logs to the **Operation Log** panel and displays a PASS ✓ / FAIL ✗ verdict with quantified error values.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 14
- **MongoDB** running on `localhost:27017`

### Setup

```bash
# Clone
git clone https://github.com/your-username/dt-editor.git
cd dt-editor

# Frontend
cd "dt_editor（yjs）"
npm install

# Backend
cd ../server/server
npm install

# Start MongoDB
mongod

# Terminal 1 — Backend
cd server/server && node app.js

# Terminal 2 — Yjs WebSocket
cd "dt_editor（yjs）" && node ws-server.js

# Terminal 3 — Dev server
cd "dt_editor（yjs）" && npm run serve
```

Open [http://localhost:8080](http://localhost:8080).

### Multi-user Testing

Open two browser tabs → Register/Login → Navigate to the same document's modeling page → Create shapes or click "Initialize Experiment" → Drag objects to observe real-time sync.

---

## 📁 Project Structure

```
dt_editor/
├── dt_editor（yjs）/              # Frontend (Vue 2 + Three.js)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── modeling/
│   │   │   │   ├── index.vue      # Main editor (~8200 lines)
│   │   │   │   └── Ball.vue       # Cursor component
│   │   │   ├── home/ login/ register/ files/
│   │   ├── utils/
│   │   │   ├── ecs/               # ECS framework
│   │   │   │   ├── index.js       # ECSWorld + 9 systems
│   │   │   │   ├── Components.js  # 19 component types
│   │   │   │   ├── EntityManager.js
│   │   │   │   ├── SystemManager.js
│   │   │   │   └── LayerSystem.js
│   │   │   ├── SyncClock.js       # Clock sync
│   │   │   └── LatencyMonitor.js
│   │   ├── router/ store/
│   ├── ws-server.js               # Yjs WS server
│   ├── vue.config.js
│   └── public/modelingsrc/        # 3D assets
│       ├── 网格/ (Mesh/GLB)       # 5 office models
│       ├── 体素/ (Voxel/GLB)      # 5 office models
│       └── 点云/ (PointCloud/PLY) # 5 office models
├── server/server/                 # Backend (Express+MongoDB)
│   ├── app.js controllers/ models/ routers/
│   └── uploads/
└── MARS初稿v0.3.doc              # MARS paper
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue.js 2 + Vue Router + Vuex |
| **3D Engine** | Three.js r124 |
| **UI** | Element UI + dat.GUI |
| **CRDT** | Yjs (LWW-Register, LWW-Set, Y.Text, Y.Array) |
| **Transport** | y-websocket + WebSocket |
| **ECS** | Custom ECSWorld (self-contained render loop) |
| **Backend** | Node.js + Express |
| **Database** | MongoDB + Mongoose |

---

## 📚 References

- **MARS Framework** — Multi-representation Adaptive Real-time Sync Framework for Heterogeneous 3D Collaborative Environments (`MARS初稿v0.3.doc`)
- **Yjs** — [yjs.dev](https://yjs.dev)
- **Three.js** — [threejs.org](https://threejs.org)
- **VMesh** — Guo et al., SIGGRAPH Asia 2023 — Hybrid volume-mesh for view synthesis
- **3D Gaussian Splatting** — Kerbl et al., ACM TOG 2023

---

## 📄 License

This project is developed for academic research purposes. See the MARS paper for the theoretical framework and design rationale.
