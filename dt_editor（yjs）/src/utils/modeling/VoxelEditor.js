import * as THREE from 'three'

/**
 * VoxelEditor - 体素编辑器
 * 将现有线框 Mesh 改造为可编辑的 3D 体素网格
 * 使用 Naive Quads 算法重建线框显示
 */
export class VoxelEditor {
  constructor(meshObject, entityId, gridResolution = 32) {
    if (!meshObject) {
      throw new Error('VoxelEditor requires a valid mesh object')
    }
    this.meshObject = meshObject
    this.entityId = entityId
    this.gridResolution = gridResolution

    // 计算网格参数
    const box = new THREE.Box3().setFromObject(meshObject)
    this.gridOrigin = box.min.clone()
    const boxSize = box.getSize(new THREE.Vector3())
    this.voxelSize = Math.max(boxSize.x, boxSize.y, boxSize.z) / gridResolution

    // 避免 voxelSize 为 0
    if (this.voxelSize === 0) {
      this.voxelSize = 0.01
    }

    // 体素网格数据：Uint8Array，0 = 空，1 = 有体素
    this.voxelGrid = new Uint8Array(gridResolution * gridResolution * gridResolution)

    // 保存原始 geometry 的引用（不修改原始）
    this.originalGeometry = null
    if (meshObject.geometry) {
      this.originalGeometry = meshObject.geometry
    }
  }

  /**
   * 三维索引转换为一维
   */
  index(x, y, z) {
    const r = this.gridResolution
    if (x < 0 || x >= r || y < 0 || y >= r || z < 0 || z >= r) return -1
    return x + y * r + z * r * r
  }

  /**
   * 获取体素值
   */
  getVoxel(x, y, z) {
    const idx = this.index(x, y, z)
    if (idx < 0) return false
    return this.voxelGrid[idx] !== 0
  }

  /**
   * 设置体素值
   */
  setVoxel(x, y, z, value) {
    const idx = this.index(x, y, z)
    if (idx < 0) return false
    const oldValue = this.voxelGrid[idx] !== 0
    this.voxelGrid[idx] = value ? 1 : 0
    return oldValue
  }

  /**
   * 世界坐标 -> 格子坐标
   */
  worldToGrid(worldPos) {
    const localPos = worldPos.clone()
    // 如果 meshObject 有父级，需要转换到局部坐标
    this.meshObject.worldToLocal(localPos)

    const x = Math.floor((localPos.x - this.gridOrigin.x) / this.voxelSize)
    const y = Math.floor((localPos.y - this.gridOrigin.y) / this.voxelSize)
    const z = Math.floor((localPos.z - this.gridOrigin.z) / this.voxelSize)
    return { x, y, z }
  }

  /**
   * 格子坐标 -> 世界坐标（格子中心）
   */
  gridToWorld(x, y, z) {
    const localPos = new THREE.Vector3(
      this.gridOrigin.x + (x + 0.5) * this.voxelSize,
      this.gridOrigin.y + (y + 0.5) * this.voxelSize,
      this.gridOrigin.z + (z + 0.5) * this.voxelSize
    )
    return this.meshObject.localToWorld(localPos.clone())
  }

  /**
   * 从原始 mesh 光栅化：简化方案
   * 遍历 32³ 网格，用 mesh 的 bounding box 和实际顶点位置来填充
   */
  rasterizeFromMesh() {
    const r = this.gridResolution
    this.voxelGrid.fill(0)

    // 方案：遍历 mesh 的所有顶点，将顶点映射到对应格子并标记为 occupied
    const _rasterizeMesh = (obj) => {
      if (obj.isMesh && obj.geometry) {
        const posAttr = obj.geometry.getAttribute('position')
        if (!posAttr) return

        const matrixWorld = obj.matrixWorld
        const vec = new THREE.Vector3()

        for (let i = 0; i < posAttr.count; i++) {
          vec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
          // 转到 meshObject 的局部坐标系
          vec.applyMatrix4(matrixWorld)
          this.meshObject.worldToLocal(vec)

          const gx = Math.floor((vec.x - this.gridOrigin.x) / this.voxelSize)
          const gy = Math.floor((vec.y - this.gridOrigin.y) / this.voxelSize)
          const gz = Math.floor((vec.z - this.gridOrigin.z) / this.voxelSize)

          if (gx >= 0 && gx < r && gy >= 0 && gy < r && gz >= 0 && gz < r) {
            const idx = this.index(gx, gy, gz)
            if (idx >= 0) this.voxelGrid[idx] = 1
          }
        }
      }

      // 递归处理子对象
      if (obj.children) {
        obj.children.forEach(child => _rasterizeMesh(child))
      }
    }

    _rasterizeMesh(this.meshObject)

    // 可选：膨胀一次，填充内部空洞（让形状更完整）
    this._dilateOnce()

    this.rebuildMesh()
  }

  /**
   * 膨胀一次：将每个已占用体素的 6-邻域也标记为占用
   */
  _dilateOnce() {
    const r = this.gridResolution
    const newGrid = new Uint8Array(this.voxelGrid)
    const dirs = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ]

    for (let x = 0; x < r; x++) {
      for (let y = 0; y < r; y++) {
        for (let z = 0; z < r; z++) {
          const idx = this.index(x, y, z)
          if (this.voxelGrid[idx]) {
            for (const [dx, dy, dz] of dirs) {
              const nx = x + dx, ny = y + dy, nz = z + dz
              const nidx = this.index(nx, ny, nz)
              if (nidx >= 0) newGrid[nidx] = 1
            }
          }
        }
      }
    }
    this.voxelGrid = newGrid
  }

  /**
   * 放置体素（世界坐标）
   * @param {THREE.Vector3} worldPos
   * @returns {{x:number,y:number,z:number,gridIndex:number,oldValue:boolean}|null}
   */
  placeVoxel(worldPos) {
    const { x, y, z } = this.worldToGrid(worldPos)
    const idx = this.index(x, y, z)
    if (idx < 0) return null

    const oldValue = this.voxelGrid[idx] !== 0
    this.voxelGrid[idx] = 1
    this.rebuildMesh()
    return { x, y, z, gridIndex: idx, oldValue }
  }

  /**
   * 破坏体素（世界坐标）
   * @param {THREE.Vector3} worldPos
   * @returns {{x:number,y:number,z:number,gridIndex:number,oldValue:boolean}|null}
   */
  breakVoxel(worldPos) {
    const { x, y, z } = this.worldToGrid(worldPos)
    const idx = this.index(x, y, z)
    if (idx < 0) return null

    const oldValue = this.voxelGrid[idx] !== 0
    this.voxelGrid[idx] = 0
    this.rebuildMesh()
    return { x, y, z, gridIndex: idx, oldValue }
  }

  /**
   * 射线检测命中的体素格子坐标
   * @param {THREE.Raycaster} raycaster
   * @returns {{x:number,y:number,z:number,gridIndex:number,worldPos:THREE.Vector3}|null}
   */
  raycastVoxel(raycaster) {
    // 先对 meshObject 做射线检测，获取交点
    const intersects = raycaster.intersectObject(this.meshObject, true)
    if (!intersects || intersects.length === 0) return null

    const hitPoint = intersects[0].point
    const { x, y, z } = this.worldToGrid(hitPoint)
    const idx = this.index(x, y, z)
    if (idx < 0) return null

    const worldPos = this.gridToWorld(x, y, z)
    return { x, y, z, gridIndex: idx, worldPos }
  }

  /**
   * 重建显示 Mesh（Naive Quads 算法 + 线框材质）
   * 遍历每个 true 的体素，检查 6 个邻居方向，邻居为空则生成该面的线框边
   */
  rebuildMesh() {
    const r = this.gridResolution
    const half = this.voxelSize * 0.5

    const vertices = []
    const indices = []

    const addLine = (v1, v2) => {
      const baseIdx = vertices.length / 3
      vertices.push(v1.x, v1.y, v1.z)
      vertices.push(v2.x, v2.y, v2.z)
      indices.push(baseIdx, baseIdx + 1)
    }

    // 6 个面的法线方向和局部偏移
    const faces = [
      { nx: 1, ny: 0, nz: 0, axis: 'x' },
      { nx: -1, ny: 0, nz: 0, axis: 'x' },
      { nx: 0, ny: 1, nz: 0, axis: 'y' },
      { nx: 0, ny: -1, nz: 0, axis: 'y' },
      { nx: 0, ny: 0, nz: 1, axis: 'z' },
      { nx: 0, ny: 0, nz: -1, axis: 'z' }
    ]

    for (let x = 0; x < r; x++) {
      for (let y = 0; y < r; y++) {
        for (let z = 0; z < r; z++) {
          const idx = this.index(x, y, z)
          if (!this.voxelGrid[idx]) continue

          for (const face of faces) {
            const nx = x + face.nx
            const ny = y + face.ny
            const nz = z + face.nz

            // 邻居为空或者是边界，则生成该面的线框
            const nidx = this.index(nx, ny, nz)
            if (nidx >= 0 && this.voxelGrid[nidx]) continue

            // 计算该面的 4 个角点（局部坐标）
            const cx = this.gridOrigin.x + (x + 0.5) * this.voxelSize
            const cy = this.gridOrigin.y + (y + 0.5) * this.voxelSize
            const cz = this.gridOrigin.z + (z + 0.5) * this.voxelSize

            let corners = []
            if (face.axis === 'x') {
              const fx = cx + half * face.nx
              corners = [
                new THREE.Vector3(fx, cy - half, cz - half),
                new THREE.Vector3(fx, cy + half, cz - half),
                new THREE.Vector3(fx, cy + half, cz + half),
                new THREE.Vector3(fx, cy - half, cz + half)
              ]
            } else if (face.axis === 'y') {
              const fy = cy + half * face.ny
              corners = [
                new THREE.Vector3(cx - half, fy, cz - half),
                new THREE.Vector3(cx + half, fy, cz - half),
                new THREE.Vector3(cx + half, fy, cz + half),
                new THREE.Vector3(cx - half, fy, cz + half)
              ]
            } else {
              const fz = cz + half * face.nz
              corners = [
                new THREE.Vector3(cx - half, cy - half, fz),
                new THREE.Vector3(cx + half, cy - half, fz),
                new THREE.Vector3(cx + half, cy + half, fz),
                new THREE.Vector3(cx - half, cy + half, fz)
              ]
            }

            // 添加四边形的 4 条边
            addLine(corners[0], corners[1])
            addLine(corners[1], corners[2])
            addLine(corners[2], corners[3])
            addLine(corners[3], corners[0])
          }
        }
      }
    }

    // 创建新的线框 geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)

    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1
    })

    // 如果 meshObject 是 Group，替换其子对象
    if (this.meshObject.isGroup || this.meshObject.type === 'Group') {
      // 移除旧的线框子对象
      const childrenToRemove = []
      this.meshObject.traverse((child) => {
        if (child !== this.meshObject && child.userData && child.userData.isVoxelEditMesh) {
          childrenToRemove.push(child)
        }
      })
      childrenToRemove.forEach(child => {
        if (child.parent) child.parent.remove(child)
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })

      const lineSegments = new THREE.LineSegments(geometry, material)
      lineSegments.userData.isVoxelEditMesh = true
      this.meshObject.add(lineSegments)
    } else {
      // 直接替换 meshObject 的 geometry 和 material
      if (this.meshObject.geometry && this.meshObject.geometry !== this.originalGeometry) {
        this.meshObject.geometry.dispose()
      }
      this.meshObject.geometry = geometry
      this.meshObject.material = material
    }
  }

  /**
   * 获取当前被占用的体素数量
   */
  getOccupiedCount() {
    let count = 0
    for (let i = 0; i < this.voxelGrid.length; i++) {
      if (this.voxelGrid[i]) count++
    }
    return count
  }

  /**
   * 获取体素网格的边界框（局部坐标）
   */
  getBounds() {
    const r = this.gridResolution
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

    for (let x = 0; x < r; x++) {
      for (let y = 0; y < r; y++) {
        for (let z = 0; z < r; z++) {
          if (this.voxelGrid[this.index(x, y, z)]) {
            const wx = this.gridOrigin.x + x * this.voxelSize
            const wy = this.gridOrigin.y + y * this.voxelSize
            const wz = this.gridOrigin.z + z * this.voxelSize
            min.x = Math.min(min.x, wx)
            min.y = Math.min(min.y, wy)
            min.z = Math.min(min.z, wz)
            max.x = Math.max(max.x, wx + this.voxelSize)
            max.y = Math.max(max.y, wy + this.voxelSize)
            max.z = Math.max(max.z, wz + this.voxelSize)
          }
        }
      }
    }

    if (min.x === Infinity) {
      return new THREE.Box3(this.gridOrigin.clone(), this.gridOrigin.clone())
    }
    return new THREE.Box3(min, max)
  }

  /**
   * 销毁编辑器
   */
  dispose() {
    this.voxelGrid = null
  }
}
