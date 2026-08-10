import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class PhygitalSyncSystem extends BaseSystem {
  constructor() {
    super('PhygitalSyncSystem')
    this.priority = 80
  }

  init() {
    console.log('[PhygitalSyncSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.BINDING)
    for (const entity of entities) {
      const binding = entityManager.getComponent(entity.id, ComponentTypes.BINDING)
      if (!binding || !binding.physicalRef) continue
      const physicalEntity = entityManager.getEntity(binding.physicalRef)
      if (!physicalEntity) continue
      const physData = entityManager.getComponent(binding.physicalRef, ComponentTypes.PHYSICAL_DATA)
      const physTrans = entityManager.getComponent(binding.physicalRef, ComponentTypes.TRANSFORM)
      const digiTrans = entityManager.getComponent(entity.id, ComponentTypes.TRANSFORM)
      if (physData && physTrans && digiTrans) {
        digiTrans.position.copy(physTrans.position)
        digiTrans.rotation.copy(physTrans.rotation)
      }
    }
  }
}
