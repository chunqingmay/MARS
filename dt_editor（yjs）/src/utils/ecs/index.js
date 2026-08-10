export * from './Components.js'
export { EntityManager, entityManager } from './EntityManager.js'
export { SystemManager, BaseSystem, systemManager } from './SystemManager.js'
export { LayerSystem } from './LayerSystem.js'

export { ECSWorld } from './core/ECSWorld.js'

export { TransformSystem } from './systems/TransformSystem.js'
export { RenderSystem } from './systems/RenderSystem.js'
export { ViewRepresentationSystem } from './systems/ViewRepresentationSystem.js'
export { MeshSystem } from './systems/MeshSystem.js'
export { CRDTSystem } from './systems/CRDTSystem.js'
export { InputSystem } from './systems/InputSystem.js'
export { ExportSystem } from './systems/ExportSystem.js'
export { PhysicSystem } from './systems/PhysicSystem.js'
export { ViewEditSystem } from './systems/ViewEditSystem.js'
export { PhygitalSyncSystem } from './systems/PhygitalSyncSystem.js'
export { CollabSyncSystem } from './systems/CollabSyncSystem.js'
export { MarsCrdtMapper } from './sync/MarsCrdtMapper.js'

export {
  MarsEntity,
  MarsPhysicalEntity,
  MarsDigitalEntity
} from './mars/MarsEntity.js'
export { MarsWorld } from './mars/MarsWorld.js'

import { ECSWorld } from './core/ECSWorld.js'
import { MarsWorld } from './mars/MarsWorld.js'

export const ecsWorld = new ECSWorld()
export const marsWorld = new MarsWorld()
