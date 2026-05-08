import * as THREE from 'three'

export const ComponentTypes = {
  TRANSFORM: 'transform',
  RENDER: 'render',
  MESH: 'mesh',
  LIGHT: 'light',
  GROUP: 'group',
  LAYER: 'layer',
  MATERIAL: 'material',
  VIEW_REPRESENTATION: 'viewRepresentation',
  COLLIDER: 'collider',
  CHILDREN: 'children',
  PARENT: 'parent',
  NAME: 'name',
  APPEARANCE: 'appearance',
  VIEW_PATH: 'viewPath',
  DELETED: 'deleted',
  TYPE: 'type',
  BINDING: 'binding',
  PHYSICAL_DATA: 'physicalData',
  ENTITY_KIND: 'entityKind'
}

export function createTransformComponent(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return {
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Euler(rx, ry, rz),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(sx, sy, sz),
    updateQuaternion() {
      this.quaternion.setFromEuler(this.rotation)
    }
  }
}

export function createRenderComponent() {
  return {
    visible: true,
    castShadow: true,
    receiveShadow: true
  }
}

export function createMeshComponent(geometry = null, material = null) {
  return {
    geometry,
    material,
    createMesh() {
      if (!this.geometry || !this.material) return null
      return new THREE.Mesh(this.geometry, this.material)
    }
  }
}

export function createLayerComponent(layer = 1) {
  return {
    layer,
    mask: 1 << (layer - 1)
  }
}

export function createViewRepresentationComponent() {
  return {
    activeView: 'GridView',
    representations: {
      GridView: null,
      VoxelView: null,
      CloudPointView: null
    },
    setRepresentation(viewType, object) {
      this.representations[viewType] = object
    },
    getRepresentation(viewType) {
      return this.representations[viewType]
    }
  }
}

export function createGroupComponent() {
  return {
    groupIds: [],
    groupOffsets: new Map()
  }
}

export function createMaterialComponent(options = {}) {
  return {
    color: options.color || 0x409eff,
    metalness: options.metalness || 0.3,
    roughness: options.roughness || 0.7,
    opacity: options.opacity || 1,
    transparent: options.transparent || false,
    wireframe: options.wireframe || false,
    createMaterial() {
      return new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: this.metalness,
        roughness: this.roughness,
        transparent: this.transparent,
        opacity: this.opacity,
        wireframe: this.wireframe
      })
    }
  }
}

export function createColliderComponent(type = 'box') {
  return {
    type,
    bounds: new THREE.Box3(),
    updateBounds(mesh) {
      if (mesh) {
        this.bounds.setFromObject(mesh)
      }
    }
  }
}

export function createBasicGeometries() {
  return {
    cube: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 32, 32),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
    cone: new THREE.ConeGeometry(0.5, 1, 32),
    torus: new THREE.TorusGeometry(0.5, 0.2, 16, 100),
    tetrahedron: new THREE.TetrahedronGeometry(0.5),
    octahedron: new THREE.OctahedronGeometry(0.5),
    dodecahedron: new THREE.DodecahedronGeometry(0.5),
    plane: new THREE.PlaneGeometry(1, 1)
  }
}

export function createPrimitiveGeometry(type, params = {}) {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(
        params.width || 1,
        params.height || 1,
        params.depth || 1
      )
    case 'sphere':
      return new THREE.SphereGeometry(
        params.radius || 0.5,
        params.widthSegments || 32,
        params.heightSegments || 32
      )
    case 'cylinder':
      return new THREE.CylinderGeometry(
        params.radiusTop || 0.5,
        params.radiusBottom || 0.5,
        params.height || 1,
        params.radialSegments || 32
      )
    case 'cone':
      return new THREE.ConeGeometry(
        params.radius || 0.5,
        params.height || 1,
        params.radialSegments || 32
      )
    case 'torus':
      return new THREE.TorusGeometry(
        params.radius || 0.5,
        params.tube || 0.2,
        params.radialSegments || 16,
        params.tubularSegments || 100
      )
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(params.radius || 0.5)
    case 'octahedron':
      return new THREE.OctahedronGeometry(params.radius || 0.5)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(params.radius || 0.5)
    case 'plane':
      return new THREE.PlaneGeometry(
        params.width || 1,
        params.height || 1
      )
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

export function createNameComponent(name = 'Entity') {
  return { name }
}

export function createLightComponent(type = 'ambient', options = {}) {
  return {
    type,
    color: options.color || 0xffffff,
    intensity: options.intensity || 1,
    distance: options.distance || 0,
    angle: options.angle || Math.PI / 3,
    penumbra: options.penumbra || 0,
    decay: options.decay || 1,
    shadow: options.shadow || false,
    createLight() {
      switch (this.type) {
        case 'ambient':
          return new THREE.AmbientLight(this.color, this.intensity)
        case 'point':
          return new THREE.PointLight(this.color, this.intensity, this.distance, this.decay)
        case 'directional':
          const dirLight = new THREE.DirectionalLight(this.color, this.intensity)
          if (this.shadow) {
            dirLight.castShadow = true
          }
          return dirLight
        case 'spot':
          return new THREE.SpotLight(this.color, this.intensity, this.distance, this.angle, this.penumbra, this.decay)
        default:
          return new THREE.AmbientLight(this.color, this.intensity)
      }
    }
  }
}

export function createAppearanceComponent(options = {}) {
  return {
    color: options.color || '#ffffff',
    opacity: options.opacity || 1.0
  }
}

export function createViewPathComponent() {
  return {
    meshView: '',
    voxelView: '',
    cloudPointView: ''
  }
}

export function createDeletedComponent(deleted = false) {
  return {
    deleted
  }
}

export function createTypeComponent(type = '') {
  return {
    type
  }
}

export function createBindingComponent(physicalRef = '') {
  return {
    physicalRef
  }
}

export function createPhysicalDataComponent(options = {}) {
  return {
    mass: options.mass || 1,
    friction: options.friction || 0.5,
    restitution: options.restitution || 0.3,
    shape: options.shape || 'box'
  }
}

export function createEntityKindComponent(kind = 'digital') {
  return {
    kind
  }
}
