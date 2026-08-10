import * as Y from 'yjs'
import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class TransformSystem extends BaseSystem {
  constructor(scene, crdtSystem = null) {
    super('TransformSystem')
    this.priority = 100
    this.scene = scene
    this.crdtSystem = crdtSystem
    this._prevTransforms = new Map()
    this.transformControls = null
  }

  init() {
    console.log('[TransformSystem] Initialized')
  }

  setCRDTSystem(crdtSystem) {
    this.crdtSystem = crdtSystem
  }

  setTransformControls(controls) {
    this.transformControls = controls
  }

  _isMeshControlledByTransformControls(mesh) {
    if (!this.transformControls) return false
    return this.transformControls.object === mesh
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.TRANSFORM)

    for (const entity of entities) {
      const transform = entityManager.getComponent(entity.id, ComponentTypes.TRANSFORM)
      const render = entityManager.getComponent(entity.id, ComponentTypes.RENDER)

      if (!transform || !render || !render.mesh) continue

      const mesh = render.mesh
      const isBeingDragged = this._isMeshControlledByTransformControls(mesh)

      if (transform._dirty) {
        // Transform was changed from CRDT, apply to mesh
        // But skip if user is currently dragging this mesh (avoid overwriting user interaction)
        if (!isBeingDragged) {
          transform._dirty = false
          transform.updateQuaternion()
          mesh.position.copy(transform.position)
          mesh.quaternion.copy(transform.quaternion)
          mesh.scale.copy(transform.scale)
          this._applyTransformToViewObjects(entity.id, transform)
        }
      } else {
        // Mesh was changed (e.g., by user interaction), sync to transform
        // Skip reverse sync when TransformControls is actively controlling this mesh
        // to avoid competing with the change-event-driven CRDT sync in the Vue component
        if (isBeingDragged) continue

        const positionChanged = !transform.position.equals(mesh.position)
        const rotationChanged = !transform.rotation.equals(mesh.rotation)
        const scaleChanged = !transform.scale.equals(mesh.scale)

        if (positionChanged || rotationChanged || scaleChanged) {
          transform.position.copy(mesh.position)
          transform.rotation.copy(mesh.rotation)
          transform.scale.copy(mesh.scale)
          this._applyTransformToViewObjects(entity.id, transform, mesh)

          // Sync transform to CRDT
          this._syncTransformToCRDT(entity.id, transform)
        }
      }
    }
  }

  _applyTransformToViewObjects(entityId, transform, sourceObject = null) {
    const viewRep = entityManager.getComponent(entityId, ComponentTypes.VIEW_REPRESENTATION)
    if (!viewRep || !viewRep.representations) return

    Object.values(viewRep.representations).forEach(object => {
      if (!object || object === sourceObject) return
      object.position.copy(transform.position)
      object.rotation.copy(transform.rotation)
      object.scale.copy(transform.scale)
    })
  }

  _syncTransformToCRDT(entityId, transform) {
    if (!this.crdtSystem || !this.crdtSystem.entitiesMap) {
      console.warn('[TransformSystem] No CRDT system available for sync')
      return
    }

    let yjsEntity = this.crdtSystem.entitiesMap.get(entityId)
    if (!yjsEntity) {
      // Auto-create entity in Yjs if it doesn't exist
      console.log(`[TransformSystem] Creating Yjs entity for ${entityId}`)
      yjsEntity = new Y.Map()
      this.crdtSystem.entitiesMap.set(entityId, yjsEntity)
    }

    // Check if transform has actually changed from last sync to avoid redundant writes
    const key = `transform_${entityId}`
    const prev = this._prevTransforms.get(key)
    const current = `${transform.position.x},${transform.position.y},${transform.position.z},${transform.rotation.x},${transform.rotation.y},${transform.rotation.z},${transform.scale.x},${transform.scale.y},${transform.scale.z}`
    
    if (prev === current) return
    this._prevTransforms.set(key, current)

    const t = {
      x: transform.position.x, y: transform.position.y, z: transform.position.z,
      rx: transform.rotation.x, ry: transform.rotation.y, rz: transform.rotation.z,
      sx: transform.scale.x, sy: transform.scale.y, sz: transform.scale.z
    }
    this.crdtSystem._setYTextValue(yjsEntity, 'transform', JSON.stringify(t))
  }

  setScene(scene) {
    this.scene = scene
  }
}
