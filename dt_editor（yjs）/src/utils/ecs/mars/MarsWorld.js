import { ComponentTypes, createActiveViewComponent, createTransformComponent } from '../Components.js'
import { ECSWorld } from '../core/ECSWorld.js'
import { MarsDigitalEntity, MarsPhysicalEntity } from './MarsEntity.js'

export class MarsWorld extends ECSWorld {
  constructor(options = {}) {
    super(options)
    this.name = 'MarsWorld'
    this.marsEntities = new Map()
    this.crdtSystem = options.crdtSystem || null
  }

  setCRDTSystem(crdtSystem) {
    this.crdtSystem = crdtSystem
  }

  createMarsDigitalEntity(id, name = 'MarsDigitalEntity', options = {}) {
    const marsEntity = new MarsDigitalEntity(id, name, options, this.entityManager)
    const entity = marsEntity.create(options.components || {})
    this.marsEntities.set(entity.id, marsEntity)

    if (this.crdtSystem) {
      this.crdtSystem.syncMarsEntityToYjs(entity.id, 'digital')
    }

    return marsEntity
  }

  createMarsPhysicalEntity(id, name = 'MarsPhysicalEntity', options = {}) {
    const marsEntity = new MarsPhysicalEntity(id, name, options, this.entityManager)
    const entity = marsEntity.create(options.components || {})
    this.marsEntities.set(entity.id, marsEntity)

    if (this.crdtSystem) {
      this.crdtSystem.syncMarsEntityToYjs(entity.id, 'physical')
    }

    return marsEntity
  }

  attachView(entityId, viewType, object, options = {}) {
    let marsEntity = this.marsEntities.get(entityId)
    if (!marsEntity) {
      marsEntity = this.createMarsDigitalEntity(entityId, entityId)
    }

    if (!(marsEntity instanceof MarsDigitalEntity)) {
      console.warn(`[MarsWorld] Entity ${entityId} is not a digital entity`)
      return
    }

    marsEntity.attachView(viewType, object, options)

    if (object) {
      const transform = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM) || createTransformComponent()
      transform.position.copy(object.position)
      transform.rotation.copy(object.rotation)
      transform.scale.copy(object.scale)
      transform.updateQuaternion()
      this.entityManager.addComponent(entityId, ComponentTypes.TRANSFORM, transform)
    }

    if (this.crdtSystem) {
      this.crdtSystem.syncMarsEntityToYjs(entityId, 'digital')
    }
  }

  setActiveView(entityId, viewType) {
    const marsEntity = this.marsEntities.get(entityId)
    if (marsEntity && marsEntity instanceof MarsDigitalEntity) {
      marsEntity.setActiveView(viewType)
    } else {
      const activeView = this.entityManager.getComponent(entityId, ComponentTypes.ACTIVE_VIEW) || createActiveViewComponent()
      activeView.setActiveView(viewType)
      this.entityManager.addComponent(entityId, ComponentTypes.ACTIVE_VIEW, activeView)
    }

    if (this.crdtSystem) {
      const yjsEntity = this.crdtSystem.ensureMarsEntityMap(entityId, 'digital')
      if (yjsEntity) {
        this.crdtSystem._setYTextValue(yjsEntity, 'activeView', viewType)
      }
    }
  }
}
