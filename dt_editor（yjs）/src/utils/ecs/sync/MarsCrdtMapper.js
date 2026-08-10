import * as Y from 'yjs'
import { entityManager } from '../EntityManager.js'
import {
  ComponentTypes,
  createTransformComponent,
  createLayerComponent,
  createNameComponent,
  createAppearanceComponent,
  createViewPathComponent,
  createDeletedComponent,
  createTypeComponent
} from '../Components.js'

export class MarsCrdtMapper {
  constructor(doc, entitiesMap) {
    this.doc = doc
    this.entitiesMap = entitiesMap
  }

  setEntitiesMap(entitiesMap) {
    this.entitiesMap = entitiesMap
  }

  createComponentsFromYjs(entityId, yjsEntity) {
    const components = {}
    const typeValue = this.getYTextValue(yjsEntity, 'type')
    const name = typeValue || entityId

    components[ComponentTypes.NAME] = createNameComponent(name)
    components[ComponentTypes.TYPE] = createTypeComponent(typeValue || '')

    const transformStr = this.getYTextValue(yjsEntity, 'transform')
    if (transformStr) {
      try {
        const t = JSON.parse(transformStr)
        components[ComponentTypes.TRANSFORM] = createTransformComponent(t.x, t.y, t.z, t.rx, t.ry, t.rz, t.sx, t.sy, t.sz)
      } catch (e) {
        components[ComponentTypes.TRANSFORM] = createTransformComponent()
      }
    }

    const layerStr = this.getYTextValue(yjsEntity, 'layer')
    if (layerStr) {
      components[ComponentTypes.LAYER] = createLayerComponent(parseInt(layerStr) || 1)
    }

    const deletedStr = this.getYTextValue(yjsEntity, 'deleted')
    if (deletedStr) {
      components[ComponentTypes.DELETED] = createDeletedComponent(deletedStr === 'true')
    }

    const meshView = this.getYTextValue(yjsEntity, 'meshView')
    const voxelView = this.getYTextValue(yjsEntity, 'voxelView')
    const cloudPointView = this.getYTextValue(yjsEntity, 'cloudPointView')
    if (meshView || voxelView || cloudPointView) {
      components[ComponentTypes.VIEW_PATH] = createViewPathComponent()
      if (meshView) components[ComponentTypes.VIEW_PATH].meshView = meshView
      if (voxelView) components[ComponentTypes.VIEW_PATH].voxelView = voxelView
      if (cloudPointView) components[ComponentTypes.VIEW_PATH].cloudPointView = cloudPointView
    }

    return { name, components }
  }

  addAppearanceFromYjs(entityId, yjsEntity) {
    const appearanceStr = this.getYTextValue(yjsEntity, 'appearance')
    if (!appearanceStr) return

    try {
      const appearance = JSON.parse(appearanceStr)
      entityManager.addComponent(entityId, ComponentTypes.APPEARANCE, createAppearanceComponent(appearance))
    } catch (e) {}
  }

  syncEntityToYjs(entityId) {
    const yjsEntity = this.ensureEntityMap(entityId)
    if (!yjsEntity) return

    const transform = entityManager.getComponent(entityId, ComponentTypes.TRANSFORM)
    if (transform) {
      this.setYTextValue(yjsEntity, 'transform', JSON.stringify({
        x: transform.position.x, y: transform.position.y, z: transform.position.z,
        rx: transform.rotation.x, ry: transform.rotation.y, rz: transform.rotation.z,
        sx: transform.scale.x, sy: transform.scale.y, sz: transform.scale.z
      }))
    }

    const layer = entityManager.getComponent(entityId, ComponentTypes.LAYER)
    if (layer) this.setYTextValue(yjsEntity, 'layer', String(layer.layer))

    const typeComp = entityManager.getComponent(entityId, ComponentTypes.TYPE)
    if (typeComp && typeComp.type) this.setYTextValue(yjsEntity, 'type', typeComp.type)

    const viewPath = entityManager.getComponent(entityId, ComponentTypes.VIEW_PATH)
    if (viewPath) {
      if (viewPath.meshView) this.setYTextValue(yjsEntity, 'meshView', viewPath.meshView)
      if (viewPath.voxelView) this.setYTextValue(yjsEntity, 'voxelView', viewPath.voxelView)
      if (viewPath.cloudPointView) this.setYTextValue(yjsEntity, 'cloudPointView', viewPath.cloudPointView)
    }

    const deleted = entityManager.getComponent(entityId, ComponentTypes.DELETED)
    if (deleted) this.setYTextValue(yjsEntity, 'deleted', String(deleted.deleted))

    const appearance = entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)
    if (appearance) {
      this.setYTextValue(yjsEntity, 'appearance', JSON.stringify({
        color: appearance.color,
        opacity: appearance.opacity,
        metalness: appearance.metalness,
        roughness: appearance.roughness,
        transparent: appearance.transparent,
        wireframe: appearance.wireframe
      }))
    }
  }

  ensureMarsEntityMap(entityId, entityKind = 'digital') {
    const yjsEntity = this.ensureEntityMap(entityId)
    if (!yjsEntity) return null

    this.setYTextValue(yjsEntity, 'entityKind', entityKind)
    if (!yjsEntity.has('activeView')) this.setYTextValue(yjsEntity, 'activeView', 'GridView')
    if (!yjsEntity.has('meshView')) this.setYTextValue(yjsEntity, 'meshView', '')
    if (!yjsEntity.has('voxelView')) this.setYTextValue(yjsEntity, 'voxelView', '')
    if (!yjsEntity.has('cloudPointView')) this.setYTextValue(yjsEntity, 'cloudPointView', '')
    if (!yjsEntity.has('groupMembers')) yjsEntity.set('groupMembers', new Y.Array())

    return yjsEntity
  }

  syncMarsEntityToYjs(entityId, entityKind = 'digital') {
    const yjsEntity = this.ensureMarsEntityMap(entityId, entityKind)
    if (!yjsEntity) return

    const componentMap = {
      [ComponentTypes.TRANSFORM]: 'transform',
      [ComponentTypes.ACTIVE_VIEW]: 'activeView',
      [ComponentTypes.APPEARANCE]: 'appearance',
      [ComponentTypes.LAYER]: 'layer',
      [ComponentTypes.BINDING]: 'binding',
      [ComponentTypes.PHYSICAL_DATA]: 'physicalData',
      [ComponentTypes.DELETED]: 'deleted',
      [ComponentTypes.TYPE]: 'type',
      [ComponentTypes.ENTITY_KIND]: 'entityKind'
    }

    Object.entries(componentMap).forEach(([componentType, crdtKey]) => {
      const component = entityManager.getComponent(entityId, componentType)
      if (component) this.setMarsComponentValue(yjsEntity, crdtKey, component)
    })

    const viewPath = entityManager.getComponent(entityId, ComponentTypes.VIEW_PATH)
    if (viewPath) {
      this.setYTextValue(yjsEntity, 'meshView', viewPath.meshView || '')
      this.setYTextValue(yjsEntity, 'voxelView', viewPath.voxelView || '')
      this.setYTextValue(yjsEntity, 'cloudPointView', viewPath.cloudPointView || '')
    }
  }

  setMarsComponentValue(yjsEntity, crdtKey, component) {
    if (crdtKey === 'transform') {
      this.setYTextValue(yjsEntity, crdtKey, JSON.stringify({
        x: component.position.x, y: component.position.y, z: component.position.z,
        rx: component.rotation.x, ry: component.rotation.y, rz: component.rotation.z,
        sx: component.scale.x, sy: component.scale.y, sz: component.scale.z
      }))
      return
    }

    if (crdtKey === 'activeView') return this.setYTextValue(yjsEntity, crdtKey, component.activeView || 'GridView')
    if (crdtKey === 'layer') return this.setYTextValue(yjsEntity, crdtKey, String(component.layer || 1))
    if (crdtKey === 'deleted') return this.setYTextValue(yjsEntity, crdtKey, String(!!component.deleted))
    if (crdtKey === 'type') return this.setYTextValue(yjsEntity, crdtKey, component.type || '')
    if (crdtKey === 'entityKind') return this.setYTextValue(yjsEntity, crdtKey, component.kind || 'digital')
    if (crdtKey === 'binding') return this.setYTextValue(yjsEntity, crdtKey, component.physicalRef || '')

    this.setYTextValue(yjsEntity, crdtKey, JSON.stringify(component))
  }

  ensureEntityMap(entityId) {
    if (!this.entitiesMap) return null

    let yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) {
      yjsEntity = new Y.Map()
      this.entitiesMap.set(entityId, yjsEntity)
    }

    return yjsEntity
  }

  getYTextValue(yjsEntity, key) {
    if (!yjsEntity) return ''
    return this.getTextValue(yjsEntity.get(key))
  }

  getTextValue(value) {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (value.toString && value.constructor && value.constructor.name === 'YText') return value.toString()
    if (value.toJSON) return String(value.toJSON())
    return String(value)
  }

  setYTextValue(yjsEntity, key, strValue) {
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
}
