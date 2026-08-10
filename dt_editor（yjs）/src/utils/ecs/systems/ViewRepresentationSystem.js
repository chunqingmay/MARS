import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class ViewRepresentationSystem extends BaseSystem {
  constructor() {
    super('ViewRepresentationSystem')
    this.priority = 55
  }

  init() {
    console.log('[ViewRepresentationSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.VIEW_REPRESENTATION)

    for (const entity of entities) {
      const viewRep = entityManager.getComponent(entity.id, ComponentTypes.VIEW_REPRESENTATION)
      const activeView = entityManager.getComponent(entity.id, ComponentTypes.ACTIVE_VIEW)
      const activeType = activeView ? activeView.activeView : viewRep.activeView

      if (!viewRep || !viewRep.representations) continue
      viewRep.activeView = activeType

      Object.entries(viewRep.representations).forEach(([viewType, object]) => {
        if (object) {
          object.visible = viewType === activeType
        }
      })
    }
  }
}


