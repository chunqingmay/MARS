import * as Y from 'yjs'
import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class CollabSyncSystem extends BaseSystem {
  constructor(doc, crdtSystem = null, entitiesMapName = 'entities') {
    super('CollabSyncSystem')
    this.priority = 150
    this.doc = doc
    this.crdtSystem = crdtSystem
    this.entitiesMapName = entitiesMapName
    this.entitiesMap = null
    this.componentChangeQueue = []
    this.syncBatchSize = 10
    this.pendingSyncs = new Set()
  }

  init() {
    if (!this.doc) return
    console.log('[CollabSyncSystem] Initialized')
    this.entitiesMap = this.doc.getMap(this.entitiesMapName)
    // CRDTSystem handles remote observers; this system pushes local changes.
  }

  // 璁剧疆 CRDT 瑙傚療鑰咃紝鐩戝惉杩滅▼鍙樻洿
  setupObservers() {
    if (!this.entitiesMap) return

    this.entitiesMap.observeDeep((events, transaction) => {
      // 杩囨护鏈湴鍙戣捣鐨勪簨鍔★紝閬垮厤鍥炵幆
      if (transaction.local) return

      events.forEach(event => {
        if (event.path && event.path.length >= 1) {
          const entityId = event.path[0]
          const changedKey = event.path.length >= 2 ? event.path[1] : null
          
          if (changedKey && changedKey !== 'transform' && changedKey !== 'layer') {
            // 闈?Transform/Layer 鐨勫彉鏇寸敱 CollabSyncSystem 澶勭悊
            this.handleRemoteChange(entityId, changedKey)
          }
        }
      })
    })
  }

  // 澶勭悊杩滅▼鍙樻洿
  handleRemoteChange(entityId, componentKey) {
    const yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) return

    const entity = entityManager.getEntity(entityId)
    if (!entity) {
      // 鏂板疄浣擄紝瑙﹀彂鍒涘缓
      if (this.onEntityCreated) {
        this.onEntityCreated(entityId, yjsEntity)
      }
      return
    }

    // 鍚屾鐗瑰畾缁勪欢
    this.syncComponentFromRemote(entityId, componentKey, yjsEntity.get(componentKey))
  }

  // Sync one component from a remote CRDT value.
  syncComponentFromRemote(entityId, key, value) {
    if (key === 'appearance') {
      this.syncAppearanceFromRemote(entityId, value)
    } else if (key === 'activeView') {
      this.syncActiveViewFromRemote(entityId, value)
    }
  }

  // 鍚屾澶栬缁勪欢
  syncAppearanceFromRemote(entityId, value) {
    const appearance = entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)
    if (!appearance || !value) return

    const strValue = this._getValueAsString(value)
    if (!strValue) return

    try {
      const data = JSON.parse(strValue)
      if (data.color !== undefined) appearance.color = data.color
      if (data.opacity !== undefined) appearance.opacity = data.opacity
      if (data.metalness !== undefined) appearance.metalness = data.metalness
      if (data.roughness !== undefined) appearance.roughness = data.roughness
      if (data.transparent !== undefined) appearance.transparent = data.transparent
      if (data.wireframe !== undefined) appearance.wireframe = data.wireframe
      
      // 鏍囪涓鸿剰锛岃Е鍙?ViewEditSystem/RenderSystem 閲嶆柊娓叉煋
      appearance._dirty = true
    } catch (e) {
      console.warn('[CollabSyncSystem] Failed to parse appearance:', e)
    }
  }

  // 鍚屾娲昏穬瑙嗗浘
  syncActiveViewFromRemote(entityId, value) {
    const viewRep = entityManager.getComponent(entityId, ComponentTypes.VIEW_REPRESENTATION)
    if (!viewRep) return

    const strValue = this._getValueAsString(value)
    if (strValue) {
      viewRep.activeView = strValue
    }
  }

  // Convert a Yjs value to a string.
  _getValueAsString(value) {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (value.toString && value.constructor && value.constructor.name === 'YText') {
      return value.toString()
    }
    if (value.toJSON) return String(value.toJSON())
    return String(value)
  }

  // 澧為噺鍚屾锛氬皢鏈湴缁勪欢鍙樻洿鎺ㄩ€佸埌 CRDT
  pushComponentChange(entityId, componentType, data) {
    this.componentChangeQueue.push({ entityId, componentType, data })
  }

  // 鎵归噺澶勭悊鍙樻洿闃熷垪
  flushChangeQueue() {
    while (this.componentChangeQueue.length > 0) {
      const change = this.componentChangeQueue.shift()
      this.applyComponentChange(change.entityId, change.componentType, change.data)
    }
  }

  // 搴旂敤缁勪欢鍙樻洿鍒?CRDT
  applyComponentChange(entityId, componentType, data) {
    if (!this.entitiesMap) return

    let yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) {
      yjsEntity = new Y.Map()
      this.entitiesMap.set(entityId, yjsEntity)
    }

    if (componentType === ComponentTypes.APPEARANCE) {
      this._setYTextValue(yjsEntity, 'appearance', JSON.stringify(data))
    }
  }

  // Set a string value in a Y.Text field.
  _setYTextValue(yjsEntity, key, strValue) {
    let existing = yjsEntity.get(key)
    if (!existing || existing.constructor.name !== 'YText') {
      existing = new Y.Text()
      yjsEntity.set(key, existing)
    }
    this.doc.transact(() => {
      existing.delete(0, existing.length)
      existing.insert(0, strValue)
    })
  }

  update(deltaTime, currentTime) {
    // 姣忓抚澶勭悊鍙樻洿闃熷垪
    this.flushChangeQueue()
  }

  destroy() {
    this.componentChangeQueue = []
    this.pendingSyncs.clear()
  }
}

