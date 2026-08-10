import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class PhysicSystem extends BaseSystem {
  constructor() {
    super('PhysicSystem')
    this.priority = 90
  }

  init() {
    console.log('[PhysicSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.PHYSICAL_DATA)
    for (const entity of entities) {
      const physicalData = entityManager.getComponent(entity.id, ComponentTypes.PHYSICAL_DATA)
      const transform = entityManager.getComponent(entity.id, ComponentTypes.TRANSFORM)
      if (!physicalData || !transform) continue
    }
  }
}
