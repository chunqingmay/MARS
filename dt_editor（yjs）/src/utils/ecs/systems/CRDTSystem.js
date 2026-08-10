import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes, createAppearanceComponent, createDeletedComponent } from '../Components.js'
import { MarsCrdtMapper } from '../sync/MarsCrdtMapper.js'

export class CRDTSystem extends BaseSystem {
  constructor(doc) {
    super('CRDTSystem')
    this.priority = 200
    this.doc = doc
    this.pendingUpdates = []
    this.syncInterval = null
    this.entityMapName = 'entities'
    this.entitiesMap = null
    this.scene = null
    this.onEntityCreated = null
    this.onEntityRemoved = null
    this.mapper = new MarsCrdtMapper(doc, null)
  }

  init() {
    if (!this.doc) return
    console.log('[CRDTSystem] Initialized')
    this.entitiesMap = this.doc.getMap(this.entityMapName)
    this.mapper.setEntitiesMap(this.entitiesMap)
    this.setupObservers()
    this.syncAllExistingEntities()
  }

  setScene(scene) {
    this.scene = scene
  }

  setupObservers() {
    if (!this.entitiesMap) return

    this.entitiesMap.observe((event) => {
      if (event.transaction && event.transaction.local) return

      if (event.keysChanged) {
        event.keysChanged.forEach(entityId => {
          const yjsEntity = this.entitiesMap.get(entityId)
          if (yjsEntity && !entityManager.getEntity(entityId)) {
            this.syncFullEntityFromYjs(entityId, yjsEntity)
            console.log(`[CRDTSystem] Remote entity created: ${entityId}`)
          }
        })
      }
    })

    this.entitiesMap.observeDeep((events, transaction) => {
      if (transaction.local) return

      events.forEach(event => {
        if (event.path && event.path.length >= 1) {
          const entityId = event.path[0]
          const changedKey = event.path.length >= 2 ? event.path[1] : null
          if (changedKey && this.entitiesMap.has(entityId)) {
            const yjsEntity = this.entitiesMap.get(entityId)
            this.syncComponentFromYjs(entityId, changedKey, yjsEntity.get(changedKey))
          }
        }
      })
    })
  }

  syncAllExistingEntities() {
    if (!this.entitiesMap) return
    this.entitiesMap.forEach((yjsEntity, entityId) => {
      if (!entityManager.getEntity(entityId)) {
        this.syncFullEntityFromYjs(entityId, yjsEntity)
      }
    })
  }

  handleEntityChange(entityId) {
    const yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) {
      this.handleEntityRemoved(entityId)
      return
    }

    if (!entityManager.getEntity(entityId)) {
      this.syncFullEntityFromYjs(entityId, yjsEntity)
    } else {
      yjsEntity.forEach((value, key) => this.syncComponentFromYjs(entityId, key, value))
    }
  }

  syncFullEntityFromYjs(entityId, yjsEntity) {
    const { name, components } = this.mapper.createComponentsFromYjs(entityId, yjsEntity)
    const entity = entityManager.createEntity(entityId, name, components)
    this.mapper.addAppearanceFromYjs(entityId, yjsEntity)

    if (this.onEntityCreated) {
      this.onEntityCreated(entityId, yjsEntity)
    }

    return entity
  }

  syncComponentFromYjs(entityId, key, value) {
    if (key === 'transform') return this.syncTransformFromYjs(entityId, value)
    if (key === 'layer') return this.syncLayerFromYjs(entityId, value)
    if (key === 'deleted') return this.syncDeletedFromYjs(entityId, value)
    if (key === 'type') return this.syncTypeFromYjs(entityId, value)
    if (key === 'activeView') return this.syncActiveViewFromYjs(entityId, value)
    if (key === 'appearance') return this.syncAppearanceFromYjs(entityId, value)
  }

  syncTransformFromYjs(entityId, value) {
    const str = this._getTextValue(value)
    if (!str) return

    try {
      const t = JSON.parse(str)
      const transform = entityManager.getComponent(entityId, ComponentTypes.TRANSFORM)
      if (transform) {
        transform.position.set(t.x || 0, t.y || 0, t.z || 0)
        transform.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0)
        transform.scale.set(t.sx || 1, t.sy || 1, t.sz || 1)
        transform._dirty = true
        this.pendingUpdates.push({ entityId, componentType: ComponentTypes.TRANSFORM, data: 'synced' })
      }
    } catch (e) {}
  }

  syncLayerFromYjs(entityId, value) {
    const str = this._getTextValue(value)
    if (!str) return

    const layer = entityManager.getComponent(entityId, ComponentTypes.LAYER)
    if (layer) {
      layer.layer = parseInt(str) || 1
      this.pendingUpdates.push({ entityId, componentType: ComponentTypes.LAYER, data: 'synced' })
    }
  }

  syncDeletedFromYjs(entityId, value) {
    if (this._getTextValue(value) === 'true') {
      this.handleEntityRemoved(entityId)
    }
  }

  syncTypeFromYjs(entityId, value) {
    const str = this._getTextValue(value)
    if (!str) return

    const typeComp = entityManager.getComponent(entityId, ComponentTypes.TYPE)
    if (typeComp) typeComp.type = str
  }

  syncActiveViewFromYjs(entityId, value) {
    const str = this._getTextValue(value)
    if (!str) return

    const viewRep = entityManager.getComponent(entityId, ComponentTypes.VIEW_REPRESENTATION)
    if (viewRep) viewRep.activeView = str
  }

  syncAppearanceFromYjs(entityId, value) {
    const str = this._getTextValue(value)
    if (!str) return

    try {
      const data = JSON.parse(str)
      let appearance = entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)

      if (!appearance) {
        appearance = this.createRemoteAppearanceEntity(entityId, data)
      }

      if (appearance) {
        if (data.color !== undefined) appearance.color = data.color
        if (data.opacity !== undefined) appearance.opacity = data.opacity
        if (data.metalness !== undefined) appearance.metalness = data.metalness
        if (data.roughness !== undefined) appearance.roughness = data.roughness
        if (data.transparent !== undefined) appearance.transparent = data.transparent
        if (data.wireframe !== undefined) appearance.wireframe = data.wireframe
        appearance._dirty = true
        this.pendingUpdates.push({ entityId, componentType: ComponentTypes.APPEARANCE, data: 'synced' })
      }
    } catch (e) {
      console.warn('[CRDTSystem] Failed to parse appearance:', e)
    }
  }

  createRemoteAppearanceEntity(entityId, data) {
    let meshName = `Remote_${entityId}`
    if (this.scene) {
      this.scene.traverse(child => {
        if (child.userData && child.userData.entityId === entityId) {
          meshName = child.name || meshName
        }
      })
    }

    entityManager.createEntity(entityId, meshName, {
      [ComponentTypes.APPEARANCE]: createAppearanceComponent({
        color: data.color || '#ffffff',
        opacity: data.opacity !== undefined ? data.opacity : 1.0,
        metalness: data.metalness !== undefined ? data.metalness : 0.3,
        roughness: data.roughness !== undefined ? data.roughness : 0.7,
        transparent: data.transparent || false,
        wireframe: data.wireframe || false
      })
    })

    return entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)
  }

  syncEntityToYjs(entityId) {
    return this.mapper.syncEntityToYjs(entityId)
  }

  ensureMarsEntityMap(entityId, entityKind = 'digital') {
    return this.mapper.ensureMarsEntityMap(entityId, entityKind)
  }

  syncMarsEntityToYjs(entityId, entityKind = 'digital') {
    return this.mapper.syncMarsEntityToYjs(entityId, entityKind)
  }

  handleEntityRemoved(entityId) {
    const render = entityManager.getComponent(entityId, ComponentTypes.RENDER)
    if (render && render.mesh && this.scene) {
      this.scene.remove(render.mesh)
    }
    entityManager.removeEntity(entityId)
    if (this.onEntityRemoved) {
      this.onEntityRemoved(entityId)
    }
  }

  markEntityDeleted(entityId) {
    if (!this.entitiesMap) return
    const yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) return
    this._setYTextValue(yjsEntity, 'deleted', 'true')
    entityManager.addComponent(entityId, ComponentTypes.DELETED, createDeletedComponent(true))
    this.handleEntityRemoved(entityId)
  }

  _getYTextValue(yjsEntity, key) {
    return this.mapper.getYTextValue(yjsEntity, key)
  }

  _getTextValue(value) {
    return this.mapper.getTextValue(value)
  }

  _setYTextValue(yjsEntity, key, strValue) {
    return this.mapper.setYTextValue(yjsEntity, key, strValue)
  }

  update(deltaTime, currentTime) {
    while (this.pendingUpdates.length > 0) {
      this.pendingUpdates.shift()
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
  }
}
