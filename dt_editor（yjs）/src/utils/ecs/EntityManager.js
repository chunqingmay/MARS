import * as Y from 'yjs'

let entityIdCounter = 0

export class EntityManager {
  constructor() {
    this.entities = new Map()
    this.entityComponents = new Map()
    this.yjsDoc = null
    this.yjsEntitiesMap = null
  }

  initYjs(doc, mapName = 'entities') {
    this.yjsDoc = doc
    this.yjsEntitiesMap = doc.getMap(mapName)
  }

  generateEntityId(prefix = 'entity') {
    entityIdCounter++
    return `${prefix}_${entityIdCounter}`
  }

  createEntity(id = null, name = null, components = {}) {
    const entityId = id || this.generateEntityId()
    
    const entity = {
      id: entityId,
      name: name || `Entity ${entityId}`,
      active: true,
      components: {}
    }

    this.entities.set(entityId, entity)
    this.entityComponents.set(entityId, new Map())

    for (const [componentType, componentData] of Object.entries(components)) {
      this.addComponent(entityId, componentType, componentData)
    }

    if (this.yjsEntitiesMap && !this.yjsEntitiesMap.has(entityId)) {
      const yjsEntityMap = new Y.Map()
      this.yjsEntitiesMap.set(entityId, yjsEntityMap)
    }

    return entity
  }

  removeEntity(entityId) {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    this.entities.delete(entityId)
    this.entityComponents.delete(entityId)

    if (this.yjsEntitiesMap && this.yjsEntitiesMap.has(entityId)) {
      this.yjsEntitiesMap.delete(entityId)
    }

    return true
  }

  getEntity(entityId) {
    return this.entities.get(entityId)
  }

  getAllEntities() {
    return Array.from(this.entities.values())
  }

  getEntitiesWithComponent(componentType) {
    const result = []
    for (const [entityId, components] of this.entityComponents) {
      if (components.has(componentType)) {
        const entity = this.entities.get(entityId)
        if (entity && entity.active) {
          result.push(entity)
        }
      }
    }
    return result
  }

  hasComponent(entityId, componentType) {
    const components = this.entityComponents.get(entityId)
    return components ? components.has(componentType) : false
  }

  addComponent(entityId, componentType, componentData) {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    let components = this.entityComponents.get(entityId)
    if (!components) {
      components = new Map()
      this.entityComponents.set(entityId, components)
    }

    components.set(componentType, componentData)
    entity.components[componentType] = componentData

    if (this.yjsEntitiesMap && this.yjsEntitiesMap.has(entityId)) {
      const yjsEntityMap = this.yjsEntitiesMap.get(entityId)
      yjsEntityMap.set(componentType, componentData)
    }

    return true
  }

  removeComponent(entityId, componentType) {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    const components = this.entityComponents.get(entityId)
    if (!components) return false

    components.delete(componentType)
    delete entity.components[componentType]

    if (this.yjsEntitiesMap && this.yjsEntitiesMap.has(entityId)) {
      const yjsEntityMap = this.yjsEntitiesMap.get(entityId)
      yjsEntityMap.delete(componentType)
    }

    return true
  }

  getComponent(entityId, componentType) {
    const components = this.entityComponents.get(entityId)
    return components ? components.get(componentType) : undefined
  }

  setComponent(entityId, componentType, componentData) {
    if (this.hasComponent(entityId, componentType)) {
      return this.updateComponent(entityId, componentType, componentData)
    } else {
      return this.addComponent(entityId, componentType, componentData)
    }
  }

  updateComponent(entityId, componentType, updateFn) {
    const component = this.getComponent(entityId, componentType)
    if (!component) return false

    if (typeof updateFn === 'function') {
      updateFn(component)
    } else {
      Object.assign(component, updateFn)
    }

    if (this.yjsEntitiesMap && this.yjsEntitiesMap.has(entityId)) {
      const yjsEntityMap = this.yjsEntitiesMap.get(entityId)
      yjsEntityMap.set(componentType, component)
    }

    return true
  }

  getEntityWithComponents(componentTypes) {
    const entities = []
    for (const entity of this.getAllEntities()) {
      const hasAll = componentTypes.every(type => 
        this.hasComponent(entity.id, type)
      )
      if (hasAll) {
        entities.push(entity)
      }
    }
    return entities
  }

  clear() {
    const entityIds = Array.from(this.entities.keys())
    for (const id of entityIds) {
      this.removeEntity(id)
    }
    entityIdCounter = 0
  }

  toJSON() {
    const data = {}
    for (const [entityId, entity] of this.entities) {
      data[entityId] = {
        id: entity.id,
        name: entity.name,
        active: entity.active,
        components: {}
      }
      const components = this.entityComponents.get(entityId)
      if (components) {
        for (const [type, comp] of components) {
          data[entityId].components[type] = comp
        }
      }
    }
    return data
  }

  fromJSON(data) {
    this.clear()
    for (const [entityId, entityData] of Object.entries(data)) {
      this.createEntity(entityId, entityData.name, {
        ...entityData.components,
        _active: entityData.active
      })
    }
  }
}

export const entityManager = new EntityManager()
