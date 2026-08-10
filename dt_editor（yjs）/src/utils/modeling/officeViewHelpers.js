export function findOfficeViewObject(objectsGroup, entityId, viewType) {
  if (!objectsGroup || !objectsGroup.children) return null
  return objectsGroup.children.find(obj => {
    return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === viewType
  }) || null
}

export function configureOfficeViewObject(object, entityId, viewType, visible) {
  object.name = `${entityId}_${viewType}`
  object.visible = visible
  object.userData.viewType = viewType
  object.userData.entityId = entityId
  object.userData.layer = 1
  object.userData.selectable = true
  object.renderOrder = 1000
}

export function registerOfficeViewObject({ objectsGroup, ecsWorld, entityId, viewType, object, path, visible }) {
  configureOfficeViewObject(object, entityId, viewType, visible)

  if (objectsGroup) {
    objectsGroup.add(object)
  }

  if (ecsWorld && typeof ecsWorld.attachView === 'function') {
    ecsWorld.attachView(entityId, viewType, object, { path, visible })
  }
}

export function applyVoxelWireframe(object, THREE) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true
      })
    }
  })
}

export function applyBlackMaterial(object, THREE) {
  object.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (material.map) material.map = null
        if (material.color) material.color.set(0x000000)
        material.needsUpdate = true
      })
    }
    if (child.isPoints && child.material && child.material.color) {
      child.material.color.set(0x000000)
      child.material.needsUpdate = true
    }
  })
}

export function finishOfficeViewLoad(vm, entityId) {
  vm.updateSceneTree()
  vm.loadingOfficeEntities.delete(entityId)
}

export const VIEW_EDIT_LAYER_NAME = '__collaborative_view_edit_layer__'

export function findViewEditLayer(viewObject) {
  return viewObject ? viewObject.getObjectByName(VIEW_EDIT_LAYER_NAME) : null
}

export function removeViewEditLayer(viewObject) {
  const layer = findViewEditLayer(viewObject)
  if (!layer) return false
  layer.parent.remove(layer)
  if (layer.geometry) layer.geometry.dispose()
  if (layer.material) layer.material.dispose()
  return true
}

// Extract a deterministic outer subset, so every client renders the same edit.
export function createCloudPointEditLayer(pointCloud, THREE, ratio = 0.15) {
  const source = pointCloud && pointCloud.geometry && pointCloud.geometry.getAttribute('position')
  if (!source || !source.count) return null

  const box = new THREE.Box3().setFromBufferAttribute(source)
  const center = box.getCenter(new THREE.Vector3())
  const ranked = []
  for (let i = 0; i < source.count; i++) {
    const dx = source.getX(i) - center.x
    const dy = source.getY(i) - center.y
    const dz = source.getZ(i) - center.z
    ranked.push({ i, distance: dx * dx + dy * dy + dz * dz })
  }
  ranked.sort((a, b) => b.distance - a.distance || a.i - b.i)

  const count = Math.max(1, Math.floor(source.count * ratio))
  const positions = new Float32Array(count * 3)
  for (let n = 0; n < count; n++) {
    const index = ranked[n].i
    positions[n * 3] = source.getX(index)
    positions[n * 3 + 1] = source.getY(index)
    positions[n * 3 + 2] = source.getZ(index)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const layer = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xff2d2d,
    size: 8,
    sizeAttenuation: false,
    depthTest: true
  }))
  layer.name = VIEW_EDIT_LAYER_NAME
  layer.userData.isViewEditLayer = true
  layer.renderOrder = 1100
  return layer
}

export function createGridEditLayer(gridObject, THREE) {
  gridObject.updateMatrixWorld(true)
  const worldBox = new THREE.Box3().setFromObject(gridObject)
  if (worldBox.isEmpty()) return null

  const worldCenter = worldBox.getCenter(new THREE.Vector3())
  const worldSize = worldBox.getSize(new THREE.Vector3())
  const localCenter = gridObject.worldToLocal(worldCenter.clone())
  const worldScale = gridObject.getWorldScale(new THREE.Vector3())
  const localSize = new THREE.Vector3(
    worldSize.x / Math.max(Math.abs(worldScale.x), Number.EPSILON),
    worldSize.y / Math.max(Math.abs(worldScale.y), Number.EPSILON),
    worldSize.z / Math.max(Math.abs(worldScale.z), Number.EPSILON)
  ).multiplyScalar(1.08)

  const geometry = new THREE.BoxGeometry(localSize.x, localSize.y, localSize.z)
  const material = new THREE.MeshBasicMaterial({
    color: 0x00a8ff,
    transparent: true,
    opacity: 0.22,
    wireframe: true,
    depthTest: false
  })
  const layer = new THREE.Mesh(geometry, material)
  layer.position.copy(localCenter)
  layer.name = VIEW_EDIT_LAYER_NAME
  layer.userData.isViewEditLayer = true
  layer.renderOrder = 1100
  return layer
}
