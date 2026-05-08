import * as THREE from 'three'
import * as Y from 'yjs'
import { entityManager, EntityManager } from './EntityManager.js'
import { systemManager, SystemManager, BaseSystem } from './SystemManager.js'
import { LayerSystem } from './LayerSystem.js'
import { 
  ComponentTypes,
  createTransformComponent,
  createRenderComponent,
  createMeshComponent,
  createLayerComponent,
  createViewRepresentationComponent,
  createGroupComponent,
  createMaterialComponent,
  createColliderComponent,
  createBasicGeometries,
  createPrimitiveGeometry,
  createNameComponent,
  createLightComponent,
  createAppearanceComponent,
  createViewPathComponent,
  createDeletedComponent,
  createTypeComponent,
  createBindingComponent,
  createPhysicalDataComponent,
  createEntityKindComponent
} from './Components.js'

export {
  ComponentTypes,
  createTransformComponent,
  createRenderComponent,
  createMeshComponent,
  createLayerComponent,
  createViewRepresentationComponent,
  createGroupComponent,
  createMaterialComponent,
  createColliderComponent,
  createBasicGeometries,
  createPrimitiveGeometry,
  createNameComponent,
  createLightComponent,
  createAppearanceComponent,
  createViewPathComponent,
  createDeletedComponent,
  createTypeComponent,
  createBindingComponent,
  createPhysicalDataComponent,
  createEntityKindComponent,
  entityManager,
  systemManager,
  BaseSystem,
  LayerSystem
}

export class TransformSystem extends BaseSystem {
  constructor(scene) {
    super('TransformSystem')
    this.priority = 100
    this.scene = scene
  }

  init() {
    console.log('[TransformSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.TRANSFORM)

    for (const entity of entities) {
      const transform = entityManager.getComponent(entity.id, ComponentTypes.TRANSFORM)
      const render = entityManager.getComponent(entity.id, ComponentTypes.RENDER)

      if (!transform || !render || !render.mesh) continue

      const mesh = render.mesh

      if (transform._dirty) {
        transform._dirty = false
        transform.updateQuaternion()
        mesh.position.copy(transform.position)
        mesh.quaternion.copy(transform.quaternion)
        mesh.scale.copy(transform.scale)
      } else {
        transform.position.copy(mesh.position)
        transform.rotation.copy(mesh.rotation)
        transform.scale.copy(mesh.scale)
      }
    }
  }

  setScene(scene) {
    this.scene = scene
  }
}

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

export class MeshSystem extends BaseSystem {
  constructor(scene, objectsGroup = null) {
    super('MeshSystem')
    this.priority = 75
    this.scene = scene
    this.objectsGroup = objectsGroup
    this.geometries = createBasicGeometries()
    this.onEntityCreated = null
  }

  init() {
    console.log('[MeshSystem] Initialized')
  }

  _createMeshEntity(name, primitiveType, x, y, z, options = {}) {
    const geometry = createPrimitiveGeometry(primitiveType, options)
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0x409eff,
      metalness: options.metalness || 0.3,
      roughness: options.roughness || 0.7
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.entityId = null

    const entity = entityManager.createEntity(null, name, {
      [ComponentTypes.TRANSFORM]: createTransformComponent(x, y, z),
      [ComponentTypes.LAYER]: createLayerComponent(options.layer || 1),
      [ComponentTypes.TYPE]: createTypeComponent(primitiveType)
    })
    mesh.userData.entityId = entity.id
    mesh.userData.layer = options.layer || 1
    mesh.renderOrder = (options.layer || 1) * 1000
    mesh.name = primitiveType

    entityManager.addComponent(entity.id, ComponentTypes.MESH, { geometry, material })
    entityManager.addComponent(entity.id, ComponentTypes.RENDER, { mesh, visible: true })

    if (this.scene) {
      this.scene.add(mesh)
    }
    if (this.objectsGroup) {
      this.objectsGroup.add(mesh)
    }

    if (this.onEntityCreated) {
      this.onEntityCreated(entity.id, mesh)
    }

    return entity
  }

  createCube(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Cube', 'cube', x, y, z, options)
  }

  createSphere(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Sphere', 'sphere', x, y, z, options)
  }

  createCylinder(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Cylinder', 'cylinder', x, y, z, options)
  }

  createTorus(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Torus', 'torus', x, y, z, options)
  }

  createCone(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Cone', 'cone', x, y, z, options)
  }

  createTetrahedron(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Tetrahedron', 'tetrahedron', x, y, z, options)
  }

  createOctahedron(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Octahedron', 'octahedron', x, y, z, options)
  }

  createDodecahedron(x = 0, y = 0, z = 0, options = {}) {
    return this._createMeshEntity('Dodecahedron', 'dodecahedron', x, y, z, options)
  }

  createPrimitive(type, x = 0, y = 0, z = 0, options = {}) {
    switch (type) {
      case 'cube': return this.createCube(x, y, z, options)
      case 'sphere': return this.createSphere(x, y, z, options)
      case 'cylinder': return this.createCylinder(x, y, z, options)
      case 'torus': return this.createTorus(x, y, z, options)
      case 'cone': return this.createCone(x, y, z, options)
      case 'tetrahedron': return this.createTetrahedron(x, y, z, options)
      case 'octahedron': return this.createOctahedron(x, y, z, options)
      case 'dodecahedron': return this.createDodecahedron(x, y, z, options)
      default: return this.createCube(x, y, z, options)
    }
  }

  createFromLoadedModel(model, entityId = null, name = 'Model') {
    const entity = entityManager.createEntity(entityId, name, {
      [ComponentTypes.VIEW_REPRESENTATION]: createViewRepresentationComponent(),
      [ComponentTypes.GROUP]: createGroupComponent(),
      [ComponentTypes.TYPE]: createTypeComponent('loadedModel')
    })

    if (model.userData) {
      model.userData.entityId = entity.id
    }

    entityManager.addComponent(entity.id, ComponentTypes.MESH, {
      geometry: null,
      material: null,
      loadedModel: model
    })

    entityManager.addComponent(entity.id, ComponentTypes.RENDER, {
      mesh: model,
      visible: true
    })

    if (this.scene) {
      this.scene.add(model)
    }

    return entity
  }

  removeEntity(entityId) {
    const render = entityManager.getComponent(entityId, ComponentTypes.RENDER)
    if (render && render.mesh && this.scene) {
      this.scene.remove(render.mesh)
      if (render.mesh.geometry) render.mesh.geometry.dispose()
      if (render.mesh.material) render.mesh.material.dispose()
    }
    return entityManager.removeEntity(entityId)
  }

  setScene(scene) {
    this.scene = scene
  }
}

export class CRDTSystem extends BaseSystem {
  constructor(doc) {
    super('CRDTSystem')
    this.priority = 200
    this.doc = doc
    this.pendingUpdates = []
    this.syncInterval = null
    this.entityMapName = 'entities'
    this.entitiesMap = null
    this.scene = null
    this.onEntityCreated = null
    this.onEntityRemoved = null
  }

  init() {
    if (!this.doc) return
    console.log('[CRDTSystem] Initialized')
    this.entitiesMap = this.doc.getMap(this.entityMapName)
    this.setupObservers()
    this.syncAllExistingEntities()
  }

  setScene(scene) {
    this.scene = scene
  }

  setupObservers() {
    if (!this.entitiesMap) return

    this.entitiesMap.observeDeep((events, transaction) => {
      events.forEach(event => {
        if (event.path && event.path.length >= 1) {
          const entityId = event.path[0]
          if (this.entitiesMap.has(entityId)) {
            this.handleEntityChange(entityId, transaction)
          }
        }
      })
    })
  }

  syncAllExistingEntities() {
    if (!this.entitiesMap) return
    this.entitiesMap.forEach((yjsEntity, entityId) => {
      if (!entityManager.getEntity(entityId)) {
        this.syncFullEntityFromYjs(entityId, yjsEntity)
      }
    })
  }

  handleEntityChange(entityId, transaction) {
    const yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) {
      this.handleEntityRemoved(entityId)
      return
    }

    const entity = entityManager.getEntity(entityId)
    if (!entity) {
      this.syncFullEntityFromYjs(entityId, yjsEntity)
    } else {
      yjsEntity.forEach((value, key) => {
        this.syncComponentFromYjs(entityId, key, value)
      })
    }
  }

  syncFullEntityFromYjs(entityId, yjsEntity) {
    const components = {}
    const typeValue = this._getYTextValue(yjsEntity, 'type')
    const name = typeValue || entityId

    components[ComponentTypes.NAME] = createNameComponent(name)
    components[ComponentTypes.TYPE] = createTypeComponent(typeValue || '')

    const transformStr = this._getYTextValue(yjsEntity, 'transform')
    if (transformStr) {
      try {
        const t = JSON.parse(transformStr)
        components[ComponentTypes.TRANSFORM] = createTransformComponent(t.x, t.y, t.z, t.rx, t.ry, t.rz, t.sx, t.sy, t.sz)
      } catch (e) {
        components[ComponentTypes.TRANSFORM] = createTransformComponent()
      }
    }

    const layerStr = this._getYTextValue(yjsEntity, 'layer')
    if (layerStr) {
      components[ComponentTypes.LAYER] = createLayerComponent(parseInt(layerStr) || 1)
    }

    const deletedStr = this._getYTextValue(yjsEntity, 'deleted')
    if (deletedStr) {
      components[ComponentTypes.DELETED] = createDeletedComponent(deletedStr === 'true')
    }

    const viewPaths = {}
    const meshView = this._getYTextValue(yjsEntity, 'meshView')
    const voxelView = this._getYTextValue(yjsEntity, 'voxelView')
    const cloudPointView = this._getYTextValue(yjsEntity, 'cloudPointView')
    if (meshView || voxelView || cloudPointView) {
      components[ComponentTypes.VIEW_PATH] = createViewPathComponent()
      if (meshView) components[ComponentTypes.VIEW_PATH].meshView = meshView
      if (voxelView) components[ComponentTypes.VIEW_PATH].voxelView = voxelView
      if (cloudPointView) components[ComponentTypes.VIEW_PATH].cloudPointView = cloudPointView
    }

    const entity = entityManager.createEntity(entityId, name, components)

    const appearanceStr = this._getYTextValue(yjsEntity, 'appearance')
    if (appearanceStr) {
      try {
        const a = JSON.parse(appearanceStr)
        entityManager.addComponent(entityId, ComponentTypes.APPEARANCE, createAppearanceComponent(a))
      } catch (e) {}
    }

    if (this.onEntityCreated) {
      this.onEntityCreated(entityId, yjsEntity)
    }

    return entity
  }

  syncComponentFromYjs(entityId, key, value) {
    if (key === 'transform') {
      const str = this._getTextValue(value)
      if (!str) return
      try {
        const t = JSON.parse(str)
        const transform = entityManager.getComponent(entityId, ComponentTypes.TRANSFORM)
        if (transform) {
          transform.position.set(t.x || 0, t.y || 0, t.z || 0)
          transform.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0)
          transform.scale.set(t.sx || 1, t.sy || 1, t.sz || 1)
          transform._dirty = true
          this.pendingUpdates.push({ entityId, componentType: ComponentTypes.TRANSFORM, data: 'synced' })
        }
      } catch (e) {}
    } else if (key === 'layer') {
      const str = this._getTextValue(value)
      if (!str) return
      const layer = entityManager.getComponent(entityId, ComponentTypes.LAYER)
      if (layer) {
        layer.layer = parseInt(str) || 1
        this.pendingUpdates.push({ entityId, componentType: ComponentTypes.LAYER, data: 'synced' })
      }
    } else if (key === 'deleted') {
      const str = this._getTextValue(value)
      if (str === 'true') {
        this.handleEntityRemoved(entityId)
      }
    } else if (key === 'type') {
      const str = this._getTextValue(value)
      if (str) {
        const typeComp = entityManager.getComponent(entityId, ComponentTypes.TYPE)
        if (typeComp) typeComp.type = str
      }
    } else if (key === 'activeView') {
      const str = this._getTextValue(value)
      if (str) {
        const viewRep = entityManager.getComponent(entityId, ComponentTypes.VIEW_REPRESENTATION)
        if (viewRep) viewRep.activeView = str
      }
    }
  }

  syncEntityToYjs(entityId) {
    if (!this.entitiesMap) return
    let yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) {
      yjsEntity = new Y.Map()
      this.entitiesMap.set(entityId, yjsEntity)
    }

    const transform = entityManager.getComponent(entityId, ComponentTypes.TRANSFORM)
    if (transform) {
      const t = {
        x: transform.position.x, y: transform.position.y, z: transform.position.z,
        rx: transform.rotation.x, ry: transform.rotation.y, rz: transform.rotation.z,
        sx: transform.scale.x, sy: transform.scale.y, sz: transform.scale.z
      }
      this._setYTextValue(yjsEntity, 'transform', JSON.stringify(t))
    }

    const layer = entityManager.getComponent(entityId, ComponentTypes.LAYER)
    if (layer) {
      this._setYTextValue(yjsEntity, 'layer', String(layer.layer))
    }

    const typeComp = entityManager.getComponent(entityId, ComponentTypes.TYPE)
    if (typeComp && typeComp.type) {
      this._setYTextValue(yjsEntity, 'type', typeComp.type)
    }

    const viewPath = entityManager.getComponent(entityId, ComponentTypes.VIEW_PATH)
    if (viewPath) {
      if (viewPath.meshView) this._setYTextValue(yjsEntity, 'meshView', viewPath.meshView)
      if (viewPath.voxelView) this._setYTextValue(yjsEntity, 'voxelView', viewPath.voxelView)
      if (viewPath.cloudPointView) this._setYTextValue(yjsEntity, 'cloudPointView', viewPath.cloudPointView)
    }

    const deleted = entityManager.getComponent(entityId, ComponentTypes.DELETED)
    if (deleted) {
      this._setYTextValue(yjsEntity, 'deleted', String(deleted.deleted))
    }
  }

  handleEntityRemoved(entityId) {
    const render = entityManager.getComponent(entityId, ComponentTypes.RENDER)
    if (render && render.mesh && this.scene) {
      this.scene.remove(render.mesh)
    }
    entityManager.removeEntity(entityId)
    if (this.onEntityRemoved) {
      this.onEntityRemoved(entityId)
    }
  }

  markEntityDeleted(entityId) {
    if (!this.entitiesMap) return
    const yjsEntity = this.entitiesMap.get(entityId)
    if (!yjsEntity) return
    this._setYTextValue(yjsEntity, 'deleted', 'true')
    entityManager.addComponent(entityId, ComponentTypes.DELETED, createDeletedComponent(true))
    this.handleEntityRemoved(entityId)
  }

  _getYTextValue(yjsEntity, key) {
    if (!yjsEntity) return ''
    const value = yjsEntity.get(key)
    return this._getTextValue(value)
  }

  _getTextValue(value) {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (value.toString && value.constructor && value.constructor.name === 'YText') {
      return value.toString()
    }
    if (value.toJSON) return String(value.toJSON())
    return String(value)
  }

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
    while (this.pendingUpdates.length > 0) {
      this.pendingUpdates.shift()
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
  }
}

export class InputSystem extends BaseSystem {
  constructor(camera, renderer, orbitControls, transformControls) {
    super('InputSystem')
    this.priority = 300
    this.camera = camera
    this.renderer = renderer
    this.orbitControls = orbitControls
    this.transformControls = transformControls
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.selectedEntity = null
  }

  init() {
    console.log('[InputSystem] Initialized')
    this.setupEventListeners()
  }

  setupEventListeners() {
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this))
      this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    }
  }

  onPointerDown(event) {
    this.updateMouse(event)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.RENDER)
    const meshes = entities
      .map(e => entityManager.getComponent(e.id, ComponentTypes.RENDER))
      .filter(r => r && r.mesh)
      .map(r => r.mesh)

    const intersects = this.raycaster.intersectObjects(meshes, true)

    if (intersects.length > 0) {
      let target = intersects[0].object
      while (target && !target.userData.entityId) {
        target = target.parent
      }
      
      if (target && target.userData.entityId) {
        this.selectEntity(target.userData.entityId)
        return
      }
    }
  }

  onMouseMove(event) {
    this.updateMouse(event)
  }

  updateMouse(event) {
    if (this.renderer) {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
  }

  selectEntity(entityId) {
    this.selectedEntity = entityId
    const render = entityManager.getComponent(entityId, ComponentTypes.RENDER)
    
    if (render && render.mesh && this.transformControls) {
      this.transformControls.attach(render.mesh)
    }
  }

  deselectEntity() {
    this.selectedEntity = null
    if (this.transformControls) {
      this.transformControls.detach()
    }
  }

  update(deltaTime, currentTime) {
    // Update controls
    if (this.orbitControls) {
      this.orbitControls.update()
    }
  }

  setCamera(camera) {
    this.camera = camera
  }

  setRenderer(renderer) {
    this.renderer = renderer
    this.setupEventListeners()
  }

  setOrbitControls(controls) {
    this.orbitControls = controls
  }

  setTransformControls(controls) {
    this.transformControls = controls
  }
}

export class ExportSystem extends BaseSystem {
  constructor() {
    super('ExportSystem')
    this.priority = 10
  }

  init() {
    console.log('[ExportSystem] Initialized')
  }

  exportToGLTF(scene, options = {}) {
    const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter')
    const exporter = new GLTFExporter()
    
    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => resolve(gltf),
        (error) => reject(error),
        options
      )
    })
  }

  exportToSTL(scene, options = {}) {
    const { STLExporter } = require('three/examples/jsm/exporters/STLExporter')
    const exporter = new STLExporter()
    
    return new Promise((resolve, reject) => {
      try {
        const stl = exporter.parse(scene, options)
        resolve(stl)
      } catch (error) {
        reject(error)
      }
    })
  }

  exportToOBJ(scene, options = {}) {
    const { OBJExporter } = require('three/examples/jsm/exporters/OBJExporter')
    const exporter = new OBJExporter()
    
    return new Promise((resolve, reject) => {
      try {
        const obj = exporter.parse(scene, options)
        resolve(obj)
      } catch (error) {
        reject(error)
      }
    })
  }
}

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

export class ViewEditSystem extends BaseSystem {
  constructor() {
    super('ViewEditSystem')
    this.priority = 85
  }

  init() {
    console.log('[ViewEditSystem] Initialized')
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.APPEARANCE)
    for (const entity of entities) {
      const appearance = entityManager.getComponent(entity.id, ComponentTypes.APPEARANCE)
      if (!appearance) continue
    }
  }
}

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
      if (physTrans && digiTrans) {
        digiTrans.position.copy(physTrans.position)
        digiTrans.rotation.copy(physTrans.rotation)
      }
    }
  }
}

export class ECSWorld {
  constructor(options = {}) {
    this.entityManager = entityManager
    this.systemManager = systemManager
    this.clock = new THREE.Clock()
    this.running = false
    this._animFrameId = null
    this.onBeforeRender = null
    this.onAfterRender = null

    if (options.container) {
      this._createInternal(options.container)
    } else {
      this.scene = options.scene || null
      this.camera = options.camera || null
      this.renderer = options.renderer || null
      this.objectsGroup = options.objectsGroup || new THREE.Group()
    }
  }

  _createInternal(container) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)
    this.objectsGroup = new THREE.Group()
    this.scene.add(this.objectsGroup)

    window.addEventListener('resize', () => {
      const w = container.clientWidth
      const h = container.clientHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
    })
  }

  init(scene, camera, renderer) {
    if (!this.scene) this.scene = scene
    if (!this.camera) this.camera = camera
    if (!this.renderer) this.renderer = renderer
    if (!this.scene) this.scene = new THREE.Scene()
    if (!this.camera) this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    if (!this.renderer) this.renderer = new THREE.WebGLRenderer({ antialias: true })
  }

  getScene() { return this.scene }
  getCamera() { return this.camera }
  getRenderer() { return this.renderer }
  getObjectsGroup() { return this.objectsGroup }

  addSystem(system) {
    return this.systemManager.registerSystem(system)
  }

  removeSystem(system) {
    return this.systemManager.unregisterSystem(system)
  }

  update() {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()
    this.systemManager.update(delta, elapsed)
  }

  start() {
    if (this.running) return
    this.running = true
    this.animate()
  }

  stop() {
    this.running = false
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId)
      this._animFrameId = null
    }
  }

  animate() {
    if (!this.running) return
    this._animFrameId = requestAnimationFrame(() => this.animate())
    this.update()
    if (this.onBeforeRender) this.onBeforeRender()
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
    if (this.onAfterRender) this.onAfterRender()
  }

  createEntity(id, name, components) {
    return this.entityManager.createEntity(id, name, components)
  }

  removeEntity(entityId) {
    return this.entityManager.removeEntity(entityId)
  }

  getEntity(entityId) {
    return this.entityManager.getEntity(entityId)
  }

  addComponent(entityId, componentType, componentData) {
    return this.entityManager.addComponent(entityId, componentType, componentData)
  }

  getComponent(entityId, componentType) {
    return this.entityManager.getComponent(entityId, componentType)
  }
}

export const ecsWorld = new ECSWorld()
