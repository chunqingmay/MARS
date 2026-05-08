import { BaseSystem } from './SystemManager.js'
import { entityManager } from './EntityManager.js'
import { ComponentTypes } from './Components.js'

export class LayerSystem extends BaseSystem {
  constructor(objectsGroup) {
    super('LayerSystem')
    this.priority = 60
    this.objectsGroup = objectsGroup
    this.visibleLayer = null
    this.layerColors = {
      1: 0x7777ff,
      2: 0x77ff77,
      3: 0xffff77,
      4: 0xff7777,
      5: 0xff77ff
    }
  }

  init() {
    console.log('[LayerSystem] Initialized')
  }

  setVisibleLayer(layer) {
    this.visibleLayer = layer
    this.applyLayerVisibility()
  }

  showAllLayers() {
    this.visibleLayer = null
    this.applyLayerVisibility()
  }

  applyLayerVisibility() {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.LAYER)
    for (const entity of entities) {
      const layer = entityManager.getComponent(entity.id, ComponentTypes.LAYER)
      const render = entityManager.getComponent(entity.id, ComponentTypes.RENDER)
      if (!layer || !render || !render.mesh) continue

      const objLayer = layer.layer || 1
      if (this.visibleLayer === null) {
        render.mesh.visible = true
        this._setObjectColor(render.mesh, 0x7777ff, 1, false)
        render.mesh.userData.selectable = true
      } else if (objLayer === this.visibleLayer) {
        render.mesh.visible = true
        this._setObjectColor(render.mesh, 0x7777ff, 1, false)
        render.mesh.userData.selectable = true
      } else {
        render.mesh.visible = true
        this._setObjectColor(render.mesh, 0x333333, 0.5, true)
        render.mesh.userData.selectable = false
      }
    }
  }

  setObjectLayer(entityId, layer) {
    const entity = entityManager.getEntity(entityId)
    if (!entity) return false

    entityManager.addComponent(entityId, ComponentTypes.LAYER, {
      layer,
      mask: 1 << (layer - 1)
    })

    const render = entityManager.getComponent(entityId, ComponentTypes.RENDER)
    if (render && render.mesh) {
      render.mesh.userData.layer = layer
      render.mesh.renderOrder = layer * 1000
    }

    this.sortObjectsByLayer()
    this.updateDepthSettings()
    return true
  }

  sortObjectsByLayer() {
    if (!this.objectsGroup) return
    this.objectsGroup.children.sort((a, b) => {
      return (a.userData.layer || 1) - (b.userData.layer || 1)
    })
  }

  updateDepthSettings() {
    if (!this.objectsGroup) return
    for (const obj of this.objectsGroup.children) {
      const layer = obj.userData.layer || 1
      obj.renderOrder = layer * 1000
      if (obj.material) {
        obj.material.depthTest = true
        obj.material.depthWrite = true
      }
    }
  }

  _setObjectColor(mesh, color, opacity, transparent) {
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => {
          mat.color.setHex(color)
          mat.opacity = opacity
          mat.transparent = transparent
        })
      } else {
        mesh.material.color.setHex(color)
        mesh.material.opacity = opacity
        mesh.material.transparent = transparent
      }
    }
  }

  update(deltaTime, currentTime) {
  }
}
