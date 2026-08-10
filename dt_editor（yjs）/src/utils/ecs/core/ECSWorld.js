import * as THREE from 'three'
import { entityManager } from '../EntityManager.js'
import { systemManager } from '../SystemManager.js'

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
