import { entityManager } from '../EntityManager.js'
import {
  ComponentTypes,
  createTransformComponent,
  createNameComponent,
  createAppearanceComponent,
  createViewPathComponent,
  createViewRepresentationComponent,
  createEntityKindComponent,
  createPhysicalDataComponent,
  createActiveViewComponent,
  createMeshViewComponent,
  createVoxelViewComponent,
  createCloudPointViewComponent
} from '../Components.js'

export class MarsEntity {
  constructor(id, name = 'MarsEntity', kind = 'digital', manager = entityManager) {
    this.id = id
    this.name = name
    this.kind = kind
    this.entityManager = manager
  }

  create(baseComponents = {}) {
    const entity = this.entityManager.createEntity(this.id, this.name, {
      [ComponentTypes.NAME]: createNameComponent(this.name),
      [ComponentTypes.ENTITY_KIND]: createEntityKindComponent(this.kind),
      [ComponentTypes.TRANSFORM]: createTransformComponent(),
      ...baseComponents
    })
    this.id = entity.id
    return entity
  }

  addComponent(componentType, componentData) {
    return this.entityManager.addComponent(this.id, componentType, componentData)
  }

  getComponent(componentType) {
    return this.entityManager.getComponent(this.id, componentType)
  }

  getEntity() {
    return this.entityManager.getEntity(this.id)
  }
}

export class MarsPhysicalEntity extends MarsEntity {
  constructor(id, name = 'MarsPhysicalEntity', options = {}, manager = entityManager) {
    super(id, name, 'physical', manager)
    this.options = options
  }

  create(baseComponents = {}) {
    return super.create({
      [ComponentTypes.PHYSICAL_DATA]: createPhysicalDataComponent(this.options.physicalData || {}),
      ...baseComponents
    })
  }
}

export class MarsDigitalEntity extends MarsEntity {
  constructor(id, name = 'MarsDigitalEntity', options = {}, manager = entityManager) {
    super(id, name, 'digital', manager)
    this.options = options
  }

  create(baseComponents = {}) {
    return super.create({
      [ComponentTypes.ACTIVE_VIEW]: createActiveViewComponent(this.options.activeView || 'GridView'),
      [ComponentTypes.VIEW_REPRESENTATION]: createViewRepresentationComponent(),
      [ComponentTypes.VIEW_PATH]: createViewPathComponent(),
      [ComponentTypes.APPEARANCE]: createAppearanceComponent({
        color: '#000000',
        ...(this.options.appearance || {})
      }),
      ...baseComponents
    })
  }

  attachView(viewType, object, options = {}) {
    const viewRep = this.getComponent(ComponentTypes.VIEW_REPRESENTATION) || createViewRepresentationComponent()
    viewRep.setRepresentation(viewType, object)
    this.addComponent(ComponentTypes.VIEW_REPRESENTATION, viewRep)

    if (object && object.userData) {
      object.userData.entityId = this.id
      object.userData.viewType = viewType
    }

    const viewComponentMap = {
      GridView: ComponentTypes.MESH_VIEW,
      MeshView: ComponentTypes.MESH_VIEW,
      VoxelView: ComponentTypes.VOXEL_VIEW,
      CloudPointView: ComponentTypes.CLOUD_POINT_VIEW
    }
    const factoryMap = {
      GridView: createMeshViewComponent,
      MeshView: createMeshViewComponent,
      VoxelView: createVoxelViewComponent,
      CloudPointView: createCloudPointViewComponent
    }

    const componentType = viewComponentMap[viewType]
    const factory = factoryMap[viewType]
    if (componentType && factory) {
      this.addComponent(componentType, factory(object, options))
    }

    const viewPath = this.getComponent(ComponentTypes.VIEW_PATH) || createViewPathComponent()
    if (options.path) {
      if (viewType === 'GridView' || viewType === 'MeshView') {
        viewPath.meshView = options.path
      } else if (viewType === 'VoxelView') {
        viewPath.voxelView = options.path
      } else if (viewType === 'CloudPointView') {
        viewPath.cloudPointView = options.path
      }
      this.addComponent(ComponentTypes.VIEW_PATH, viewPath)
    }
  }

  setActiveView(viewType) {
    const activeView = this.getComponent(ComponentTypes.ACTIVE_VIEW) || createActiveViewComponent()
    activeView.setActiveView(viewType)
    this.addComponent(ComponentTypes.ACTIVE_VIEW, activeView)

    const viewRep = this.getComponent(ComponentTypes.VIEW_REPRESENTATION)
    if (viewRep) {
      viewRep.activeView = viewType
    }
  }
}
