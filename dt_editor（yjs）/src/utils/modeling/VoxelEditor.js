import * as THREE from 'three'

// DDA 网格遍历用的临时对象（模块级复用，避免每次鼠标移动都分配内存）
const _invMatrix = new THREE.Matrix4()
const _localRay = new THREE.Ray()
const _gridBox = new THREE.Box3()
const _entryPoint = new THREE.Vector3()

/**
 * VoxelEditor - 体素编辑器
 * 将现有线框 Mesh 改造为可编辑的 3D 体素网格
 * 使用 Naive Quads 算法重建线框显示
 */
export class VoxelEditor {
  constructor(meshObject, entityId, gridResolution = 32, scene = null) {
    if (!meshObject) {
      throw new Error('VoxelEditor requires a valid mesh object')
    }
    this.meshObject = meshObject
    this.entityId = entityId
    this.gridResolution = gridResolution
    this.scene = scene

    // 计算网格参数
    // 注意：Box3.setFromObject 返回的是【世界坐标系】包围盒，而
    // worldToGrid / rasterizeFromMesh 都在 meshObject 局部坐标系里计算格子索引。
    // 必须把包围盒转换回局部坐标系，否则模型一旦有位移/缩放（体素视图默认
    // scale=10 且有位置偏移），所有格子索引都会越界，编辑完全无反应。
    meshObject.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(meshObject)
    box.applyMatrix4(_invMatrix.copy(meshObject.matrixWorld).invert())
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

    // 悬停预览框
    this.previewBox = null

    // 从原 mesh 光栅化为体素网格，并首次重建显示
    this.rasterizeFromMesh()
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

    // 不再膨胀，保持原始体素精度
    // this._dilateOnce()

    // 首次光栅化后重建体素线框（但不隐藏原始mesh，由 enter/exit 控制）
    this.rebuildMesh()
  }

  /**
   * 隐藏原始 GLB mesh（只在编辑时调用）
   */
  hideOriginal() {
    this._hideOriginalMesh()
  }

  /**
   * 恢复原始 GLB mesh（退出编辑时调用）
   */
  showOriginal() {
    this._showOriginalMesh()
  }

  /**
   * 隐藏原始 GLB mesh 子对象（内部）
   */
  _hideOriginalMesh() {
    this.meshObject.traverse((child) => {
      if ((child.isMesh || child.isLineSegments || child.isPoints) && !child.userData.isVoxelEditMesh) {
        child.visible = false
      }
    })
  }

  /**
   * 恢复原始 GLB mesh 子对象显示
   */
  _showOriginalMesh() {
    this.meshObject.traverse((child) => {
      if ((child.isMesh || child.isLineSegments || child.isPoints) && !child.userData.isVoxelEditMesh) {
        child.visible = true
      }
    })
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
   * DDA（Amanatides-Woo）体素网格遍历
   * 不再对原始 GLB 网格做暴力 intersectObject 射线检测（几十万三角形、
   * 每次鼠标移动调用多次会直接卡死主线程），改为在 32³ 体素网格内
   * 沿射线逐格前进，最多 3×gridResolution 步，微秒级完成。
   *
   * @param {THREE.Raycaster} raycaster
   * @returns {{x:number,y:number,z:number,gridIndex:number,worldPos:THREE.Vector3,faceNormal:THREE.Vector3}|null}
   *   命中第一个已占用格子；faceNormal 为命中面朝外（指向前一个空格子）的方向
   */
  traceGrid(raycaster) {
    const r = this.gridResolution
    const vs = this.voxelSize
    const origin = this.gridOrigin

    // 射线转到 meshObject 局部坐标系（网格参数都在局部系）
    _invMatrix.copy(this.meshObject.matrixWorld).invert()
    _localRay.copy(raycaster.ray).applyMatrix4(_invMatrix)

    _gridBox.min.copy(origin)
    _gridBox.max.set(origin.x + vs * r, origin.y + vs * r, origin.z + vs * r)

    // 求射线进入网格包围盒的起点
    let start
    if (_gridBox.containsPoint(_localRay.origin)) {
      start = _entryPoint.copy(_localRay.origin)
    } else {
      start = _localRay.intersectBox(_gridBox, _entryPoint)
      if (!start) return null
      // 沿射线方向微调，避免正好落在边界面上导致取格歧义
      start.addScaledVector(_localRay.direction, vs * 1e-4)
    }

    const dir = _localRay.direction

    let ix = Math.floor((start.x - origin.x) / vs)
    let iy = Math.floor((start.y - origin.y) / vs)
    let iz = Math.floor((start.z - origin.z) / vs)
    ix = Math.min(Math.max(ix, 0), r - 1)
    iy = Math.min(Math.max(iy, 0), r - 1)
    iz = Math.min(Math.max(iz, 0), r - 1)

    const stepX = dir.x > 0 ? 1 : (dir.x < 0 ? -1 : 0)
    const stepY = dir.y > 0 ? 1 : (dir.y < 0 ? -1 : 0)
    const stepZ = dir.z > 0 ? 1 : (dir.z < 0 ? -1 : 0)

    const tDeltaX = stepX !== 0 ? Math.abs(vs / dir.x) : Infinity
    const tDeltaY = stepY !== 0 ? Math.abs(vs / dir.y) : Infinity
    const tDeltaZ = stepZ !== 0 ? Math.abs(vs / dir.z) : Infinity

    let tMaxX = stepX !== 0
      ? (origin.x + (ix + (stepX > 0 ? 1 : 0)) * vs - start.x) / dir.x
      : Infinity
    let tMaxY = stepY !== 0
      ? (origin.y + (iy + (stepY > 0 ? 1 : 0)) * vs - start.y) / dir.y
      : Infinity
    let tMaxZ = stepZ !== 0
      ? (origin.z + (iz + (stepZ > 0 ? 1 : 0)) * vs - start.z) / dir.z
      : Infinity

    // 命中面法线（指向前一个空格子）；起点在已占用格子内时为 (0,0,0)
    let nx = 0, ny = 0, nz = 0

    const maxSteps = r * 3
    for (let s = 0; s < maxSteps; s++) {
      const idx = this.index(ix, iy, iz)
      if (idx < 0) return null
      if (this.voxelGrid[idx]) {
        return {
          x: ix, y: iy, z: iz, gridIndex: idx,
          worldPos: this.gridToWorld(ix, iy, iz),
          faceNormal: new THREE.Vector3(nx, ny, nz)
        }
      }

      // 沿 t 最小的轴前进一格
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        ix += stepX
        tMaxX += tDeltaX
        nx = -stepX; ny = 0; nz = 0
      } else if (tMaxY < tMaxZ) {
        iy += stepY
        tMaxY += tDeltaY
        nx = 0; ny = -stepY; nz = 0
      } else {
        iz += stepZ
        tMaxZ += tDeltaZ
        nx = 0; ny = 0; nz = -stepZ
      }

      // 走出网格，未命中
      if (ix < 0 || ix >= r || iy < 0 || iy >= r || iz < 0 || iz >= r) return null
    }
    return null
  }

  /**
   * 射线检测命中的体素格子坐标
   * @param {THREE.Raycaster} raycaster
   * @returns {{x:number,y:number,z:number,gridIndex:number,worldPos:THREE.Vector3}|null}
   */
  raycastVoxel(raycaster) {
    return this.traceGrid(raycaster)
  }

  /**
   * 放置目标格子：射线命中的第一个已占用格子的外侧空格子
   * 优先沿命中面法线方向偏移，退化时取6方向第一个空格子
   */
  getPlaceTarget(raycaster) {
    const cell = this.traceGrid(raycaster)
    if (!cell) return null

    // 优先沿面法线方向偏移
    if (cell.faceNormal && (cell.faceNormal.x !== 0 || cell.faceNormal.y !== 0 || cell.faceNormal.z !== 0)) {
      const nx = cell.x + cell.faceNormal.x
      const ny = cell.y + cell.faceNormal.y
      const nz = cell.z + cell.faceNormal.z
      const nidx = this.index(nx, ny, nz)
      if (nidx >= 0 && !this.voxelGrid[nidx]) {
        return { x: nx, y: ny, z: nz, worldPos: this.gridToWorld(nx, ny, nz) }
      }
    }

    // 退化：6方向取第一个空格子
    const dirs = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ]
    for (const d of dirs) {
      const nx = cell.x + d[0], ny = cell.y + d[1], nz = cell.z + d[2]
      const nidx = this.index(nx, ny, nz)
      if (nidx >= 0 && !this.voxelGrid[nidx]) {
        return { x: nx, y: ny, z: nz, worldPos: this.gridToWorld(nx, ny, nz) }
      }
    }
    return null
  }

  /**
   * 破坏目标格子：射线命中的第一个已占用格子
   */
  getBreakTarget(raycaster) {
    const cell = this.traceGrid(raycaster)
    if (!cell) return null
    if (!this.voxelGrid[cell.gridIndex]) return null
    return cell
  }

  /**
   * 创建悬停预览框（半透明绿框）
   */
  createPreviewBox() {
    if (this.previewBox || !this.scene) return
    const geo = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.35,
      depthTest: true
    })
    const box = new THREE.Mesh(geo, mat)
    const edges = new THREE.EdgesGeometry(geo)
    const wire = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ff88 }))
    box.add(wire)
    box.visible = false
    box.renderOrder = 1200
    this.scene.add(box)
    this.previewBox = box
  }

  /**
   * 更新预览框位置，cell 为 null 时隐藏
   */
  updatePreviewBox(cell) {
    if (!this.previewBox) return
    if (!cell) {
      this.previewBox.visible = false
      return
    }
    this.previewBox.position.copy(cell.worldPos)
    this.previewBox.visible = true
  }

  /**
   * 移除预览框
   */
  removePreviewBox() {
    if (this.previewBox) {
      if (this.scene) this.scene.remove(this.previewBox)
      if (this.previewBox.geometry) this.previewBox.geometry.dispose()
      if (this.previewBox.material) this.previewBox.material.dispose()
      this.previewBox = null
    }
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
    this.removePreviewBox()
    // 恢复原始 mesh 显示并清理体素编辑 mesh
    this._showOriginalMesh()
    this.meshObject.traverse((child) => {
      if (child.userData && child.userData.isVoxelEditMesh) {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      }
    })
    this.voxelGrid = null
  }
}
