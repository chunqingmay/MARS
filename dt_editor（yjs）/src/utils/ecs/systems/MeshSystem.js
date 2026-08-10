import * as THREE from 'three'
import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import {
  ComponentTypes,
  createTransformComponent,
  createLayerComponent,
  createViewRepresentationComponent,
  createGroupComponent,
  createBasicGeometries,
  createPrimitiveGeometry,
  createAppearanceComponent,
  createTypeComponent
} from '../Components.js'

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
      [ComponentTypes.TYPE]: createTypeComponent(primitiveType),
      [ComponentTypes.APPEARANCE]: createAppearanceComponent({
        color: options.color ? '#' + options.color.toString(16).padStart(6, '0') : '#409eff',
        metalness: options.metalness || 0.3,
        roughness: options.roughness || 0.7,
        transparent: options.transparent || false,
        wireframe: options.wireframe || false
      })
    })
    mesh.userData.entityId = entity.id
    mesh.userData.layer = options.layer || 1
    mesh.renderOrder = (options.layer || 1) * 1000
    mesh.name = primitiveType
    mesh.position.set(x, y, z)

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
