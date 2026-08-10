import * as THREE from 'three'
import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes } from '../Components.js'

export class InputSystem extends BaseSystem {
  constructor(camera, renderer, orbitControls, transformControls, scene) {
    super('InputSystem')
    this.priority = 300
    this.camera = camera
    this.renderer = renderer
    this.orbitControls = orbitControls
    this.transformControls = transformControls
    this.scene = scene
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
    // 如果 TransformControls 正在拖拽，跳过选择逻辑
    if (this.transformControls && this.transformControls.dragging) {
      return
    }

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
      // 跳过 TransformControls 及其子对象
      while (target && !target.userData.entityId) {
        if (target.isTransformControls) return
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
      if (!this.transformControls.parent && this.scene) {
        this.scene.add(this.transformControls)
      }
      this.transformControls.visible = true
      this.transformControls.enabled = true
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

