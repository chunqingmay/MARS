import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class RenderSystem extends BaseSystem {
  constructor() {
    super('RenderSystem')
    this.priority = 50
  }

  init() {
    console.log('[RenderSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.RENDER)
    
    for (const entity of entities) {
      const render = entityManager.getComponent(entity.id, ComponentTypes.RENDER)
      if (render.mesh) {
        render.mesh.visible = render.visible
      }
    }
  }

  addToScene(mesh, scene) {
    if (scene && mesh) {
      scene.add(mesh)
    }
  }

  removeFromScene(mesh, scene) {
    if (scene && mesh) {
      scene.remove(mesh)
    }
  }
}


