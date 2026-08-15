import * as Y from 'yjs'
import { PointCloudEditor } from './PointCloudEditor'
import { VoxelEditor } from './VoxelEditor'
import { MeshEditor } from './MeshEditor'
import {
  ViewEditUndoManager,
  PointCloudDeleteCommand,
  PointCloudAddCommand,
  VoxelPlaceCommand,
  VoxelBreakCommand,
  MeshDeleteCommand,
  MeshSubdivideCommand
} from './ViewEditCommand'
import { findOfficeViewObject } from './officeViewHelpers'

// ============================================
// 编辑器工厂
// ============================================

export function createPointCloudEditor(vm, entityId) {
  const points = findOfficeViewObject(vm.objects, entityId, 'CloudPointView')
  if (!points || !points.isPoints) {
    console.warn(`[createPointCloudEditor] 找不到 CloudPointView Points: ${entityId}`)
    return null
  }
  return new PointCloudEditor(points, entityId)
}

export function createVoxelEditor(vm, entityId) {
  const mesh = findOfficeViewObject(vm.objects, entityId, 'VoxelView')
  if (!mesh) {
    console.warn(`[createVoxelEditor] 找不到 VoxelView Mesh: ${entityId}`)
    return null
  }
  const editor = new VoxelEditor(mesh, entityId, 32, vm.scene)
  editor.createPreviewBox()
  return editor
}

export function createMeshEditor(vm, entityId) {
  const mesh = findOfficeViewObject(vm.objects, entityId, 'GridView')
  if (!mesh) {
    console.warn(`[createMeshEditor] 找不到 GridView Mesh: ${entityId}`)
    return null
  }
  return new MeshEditor(mesh, entityId)
}

// ============================================
// 撤销管理器工厂
// ============================================

export function createViewEditUndoManager(maxSize = 50) {
  return new ViewEditUndoManager(maxSize)
}

// ============================================
// CRDT 写入辅助
// ============================================

/**
 * 推送点云操作到 CRDT
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {string} opType - 'delete_box' | 'add_brush'
 * @param {object} params
 */
export function pushCloudPointOp(vm, entityId, opType, params) {
  if (!vm.marsEntities || !vm.marsEntities.has(entityId)) return
  const entityMap = vm.marsEntities.get(entityId)

  // 确保 cloudPointOps 存在（Y.Array）
  let ops = entityMap.get('cloudPointOps')
  if (!(ops instanceof Y.Array)) {
    ops = new Y.Array()
    entityMap.set('cloudPointOps', ops)
  }

  const op = {
    opId: generateOpId(),
    type: opType,
    params,
    timestamp: Date.now()
  }

  vm.doc1.transact(() => {
    ops.push([op])
  })
}

/**
 * 推送体素操作到 CRDT
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {string} opType - 'place' | 'break'
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function pushVoxelOp(vm, entityId, opType, x, y, z) {
  if (!vm.marsEntities || !vm.marsEntities.has(entityId)) return
  const entityMap = vm.marsEntities.get(entityId)

  // 确保 voxelOps 存在（Y.Array）
  let ops = entityMap.get('voxelOps')
  if (!(ops instanceof Y.Array)) {
    ops = new Y.Array()
    entityMap.set('voxelOps', ops)
  }

  const op = {
    op: opType,
    x, y, z,
    timestamp: Date.now()
  }

  vm.doc1.transact(() => {
    ops.push([op])
  })
}

/**
 * 推送网格操作到 CRDT
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {string} opType - 'delete_face' | 'subdivide_face'
 * @param {number} faceId - 全局原始面 index（稳定标识）
 */
export function pushMeshOp(vm, entityId, opType, faceId) {
  if (!vm.marsEntities || !vm.marsEntities.has(entityId)) return
  const entityMap = vm.marsEntities.get(entityId)

  // 确保 meshOps 存在（Y.Array）
  let ops = entityMap.get('meshOps')
  if (!(ops instanceof Y.Array)) {
    ops = new Y.Array()
    entityMap.set('meshOps', ops)
  }

  const op = {
    opId: generateOpId(),
    op: opType,
    face: faceId,
    timestamp: Date.now()
  }

  vm.doc1.transact(() => {
    ops.push([op])
  })
}

// ============================================
// CRDT 同步处理（远程操作应用到本地）
// ============================================

/**
 * 从 CRDT 同步点云操作到本地
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {Array} operations
 */
export function syncCloudPointOpsFromCRDT(vm, entityId, operations) {
  if (!vm.pointCloudEditors) return
  const editor = ensurePointCloudEditor(vm, entityId)
  if (!editor) return

  for (const op of operations) {
    if (!op || !op.type) continue
    try {
      switch (op.type) {
        case 'delete_box': {
          const { min, max } = op.params || {}
          if (min && max) {
            const box3 = new THREE.Box3(
              new THREE.Vector3(min.x, min.y, min.z),
              new THREE.Vector3(max.x, max.y, max.z)
            )
            editor.deletePointsInBox(box3)
          }
          break
        }
        case 'add_brush': {
          const { center, radius, count } = op.params || {}
          if (center && radius && count) {
            editor.addPointsAtPosition(
              new THREE.Vector3(center.x, center.y, center.z),
              radius,
              count
            )
          }
          break
        }
      }
    } catch (e) {
      console.warn('[syncCloudPointOpsFromCRDT] 操作失败:', op, e)
    }
  }
}

/**
 * 从 CRDT 同步体素操作到本地
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {Array} operations
 */
export function syncVoxelOpsFromCRDT(vm, entityId, operations) {
  if (!vm.voxelEditors) return
  const editor = ensureVoxelEditor(vm, entityId)
  if (!editor) return

  for (const op of operations) {
    if (!op || !op.op) continue
    try {
      switch (op.op) {
        case 'place':
          editor.setVoxel(op.x, op.y, op.z, true)
          break
        case 'break':
          editor.setVoxel(op.x, op.y, op.z, false)
          break
      }
    } catch (e) {
      console.warn('[syncVoxelOpsFromCRDT] 操作失败:', op, e)
    }
  }

  // 批量重建一次
  editor.rebuildMesh()
}

/**
 * 从 CRDT 同步网格操作到本地
 * @param {VueComponent} vm
 * @param {string} entityId
 * @param {Array} operations
 */
export function syncMeshOpsFromCRDT(vm, entityId, operations) {
  if (!vm.meshEditors) return
  const editor = ensureMeshEditor(vm, entityId)
  if (!editor) return

  for (const op of operations) {
    if (!op || !op.op) continue
    try {
      switch (op.op) {
        case 'delete_face':
          editor.deleteFace(op.face)
          break
        case 'subdivide_face':
          editor.subdivideFace(op.face)
          break
      }
    } catch (e) {
      console.warn('[syncMeshOpsFromCRDT] 操作失败:', op, e)
    }
  }
}

// ============================================
// 命令执行辅助（带 CRDT 同步 + 懒创建编辑器）
// ============================================

function ensurePointCloudEditor(vm, entityId) {
  if (!entityId) return null
  let editor = vm.pointCloudEditors[entityId]
  if (!editor) {
    editor = createPointCloudEditor(vm, entityId)
    if (editor && vm.$set) {
      vm.$set(vm.pointCloudEditors, entityId, editor)
    } else if (editor) {
      vm.pointCloudEditors[entityId] = editor
    }
  }
  return editor
}

function ensureVoxelEditor(vm, entityId) {
  if (!entityId) return null
  let editor = vm.voxelEditors[entityId]
  if (!editor) {
    editor = createVoxelEditor(vm, entityId)
    if (editor && vm.$set) {
      vm.$set(vm.voxelEditors, entityId, editor)
    } else if (editor) {
      vm.voxelEditors[entityId] = editor
    }
  }
  return editor
}

function ensureMeshEditor(vm, entityId) {
  if (!entityId) return null
  let editor = vm.meshEditors[entityId]
  if (!editor) {
    editor = createMeshEditor(vm, entityId)
    if (editor && vm.$set) {
      vm.$set(vm.meshEditors, entityId, editor)
    } else if (editor) {
      vm.meshEditors[entityId] = editor
    }
  }
  return editor
}

/**
 * 执行点云删除命令并同步到 CRDT
 */
export function executePointCloudDelete(vm, entityId, box3) {
  const editor = ensurePointCloudEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new PointCloudDeleteCommand({ editor, box3, entityId, viewType: 'CloudPointView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result && result.deletedPoints && result.deletedPoints.length > 0) {
    const min = box3.min
    const max = box3.max
    pushCloudPointOp(vm, entityId, 'delete_box', {
      min: { x: min.x, y: min.y, z: min.z },
      max: { x: max.x, y: max.y, z: max.z }
    })
  }

  return result
}

/**
 * 执行点云添加命令并同步到 CRDT
 */
export function executePointCloudAdd(vm, entityId, center, radius, count) {
  const editor = ensurePointCloudEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new PointCloudAddCommand({ editor, center, radius, count, entityId, viewType: 'CloudPointView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result && result.addedCount > 0) {
    pushCloudPointOp(vm, entityId, 'add_brush', {
      center: { x: center.x, y: center.y, z: center.z },
      radius,
      count
    })
  }

  return result
}

/**
 * 执行体素放置命令并同步到 CRDT
 */
export function executeVoxelPlace(vm, entityId, worldPos) {
  const editor = ensureVoxelEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new VoxelPlaceCommand({ editor, worldPos, entityId, viewType: 'VoxelView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result) {
    pushVoxelOp(vm, entityId, 'place', result.x, result.y, result.z)
  }

  return result
}

/**
 * 执行体素破坏命令并同步到 CRDT
 */
export function executeVoxelBreak(vm, entityId, worldPos) {
  const editor = ensureVoxelEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new VoxelBreakCommand({ editor, worldPos, entityId, viewType: 'VoxelView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result) {
    pushVoxelOp(vm, entityId, 'break', result.x, result.y, result.z)
  }

  return result
}

/**
 * 执行网格删面命令并同步到 CRDT
 */
export function executeMeshDelete(vm, entityId, faceId) {
  const editor = ensureMeshEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new MeshDeleteCommand({ editor, faceId, entityId, viewType: 'GridView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result && result.affected && result.affected.length > 0) {
    pushMeshOp(vm, entityId, 'delete_face', faceId)
  }

  return result
}

/**
 * 执行网格细分命令并同步到 CRDT
 */
export function executeMeshSubdivide(vm, entityId, faceId) {
  const editor = ensureMeshEditor(vm, entityId)
  if (!editor || !vm.viewEditUndoManager) return null

  const cmd = new MeshSubdivideCommand({ editor, faceId, entityId, viewType: 'GridView' })
  const result = vm.viewEditUndoManager.execute(cmd)

  // 同步到 CRDT
  if (result && result.affected && result.affected.length > 0) {
    pushMeshOp(vm, entityId, 'subdivide_face', faceId)
  }

  return result
}

// ============================================
// 工具函数
// ============================================

let _opIdCounter = 0
function generateOpId() {
  return `op_${Date.now()}_${++_opIdCounter}`
}

/**
 * 屏幕坐标转 NDC
 */
export function screenToNDC(event, renderer) {
  const rect = renderer.domElement.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  }
}

/**
 * 初始化所有实体的编辑器
 */
export function initViewEditors(vm) {
  if (!vm.objects || !vm.objects.children) return

  // 收集所有有 CloudPointView 或 VoxelView 的实体
  const entityIds = new Set()
  vm.objects.children.forEach(obj => {
    if (obj.userData && obj.userData.entityId && obj.userData.viewType) {
      entityIds.add(obj.userData.entityId)
    }
  })

  // 为每个实体创建编辑器
  entityIds.forEach(entityId => {
    if (!vm.pointCloudEditors[entityId]) {
      const pcEditor = createPointCloudEditor(vm, entityId)
      if (pcEditor) {
        vm.$set(vm.pointCloudEditors, entityId, pcEditor)
      }
    }
    if (!vm.voxelEditors[entityId]) {
      const vEditor = createVoxelEditor(vm, entityId)
      if (vEditor) {
        vm.$set(vm.voxelEditors, entityId, vEditor)
      }
    }
  })

  console.log('[initViewEditors] 初始化完成, entityIds:', Array.from(entityIds))
}

/**
 * 清理编辑器资源
 */
export function disposeViewEditors(vm) {
  if (vm.pointCloudEditors) {
    Object.values(vm.pointCloudEditors).forEach(editor => {
      if (editor && typeof editor.dispose === 'function') editor.dispose()
    })
  }
  if (vm.voxelEditors) {
    Object.values(vm.voxelEditors).forEach(editor => {
      if (editor && typeof editor.dispose === 'function') editor.dispose()
    })
  }
  if (vm.meshEditors) {
    Object.values(vm.meshEditors).forEach(editor => {
      if (editor && typeof editor.dispose === 'function') editor.dispose()
    })
  }
}
