import * as THREE from 'three'

/**
 * PointCloudEditor - 管理 THREE.Points 对象的点增删
 * 内部维护 deletedMask 和 addedPoints，通过 rebuildGeometry 重建显示
 */
export class PointCloudEditor {
  constructor(pointsObject, entityId) {
    if (!pointsObject || !pointsObject.geometry) {
      throw new Error('PointCloudEditor requires a valid THREE.Points object')
    }
    this.pointsObject = pointsObject
    this.entityId = entityId

    const posAttr = pointsObject.geometry.getAttribute('position')
    this.originalCount = posAttr.count
    // 深拷贝原始位置数据
    this.originalPositions = new Float32Array(posAttr.array)

    // deletedMask[i] = 1 表示原始第 i 个点被删除
    this.deletedMask = new Uint8Array(this.originalCount)
    // 新增的点列表
    this.addedPoints = []

    // 重建一次以确保状态一致
    this.rebuildGeometry()
  }

  /**
   * 删除包围盒内的点，返回被删除的点信息用于 undo
   * @param {THREE.Box3} box3 - 世界坐标系下的包围盒
   * @returns {{deletedPoints: Array<{index:number,x:number,y:number,z:number}>, affectedCount: number}}
   */
  deletePointsInBox(box3) {
    const deletedPoints = []
    const matrixWorld = this.pointsObject.matrixWorld
    const vec = new THREE.Vector3()

    for (let i = 0; i < this.originalCount; i++) {
      if (this.deletedMask[i]) continue

      vec.set(
        this.originalPositions[i * 3],
        this.originalPositions[i * 3 + 1],
        this.originalPositions[i * 3 + 2]
      )
      // 转到世界坐标
      vec.applyMatrix4(matrixWorld)

      if (box3.containsPoint(vec)) {
        this.deletedMask[i] = 1
        deletedPoints.push({
          index: i,
          x: this.originalPositions[i * 3],
          y: this.originalPositions[i * 3 + 1],
          z: this.originalPositions[i * 3 + 2]
        })
      }
    }

    this.rebuildGeometry()
    return { deletedPoints, affectedCount: deletedPoints.length }
  }

  /**
   * 在指定位置半径内随机添加点（球体内均匀分布）
   * @param {THREE.Vector3} center - 世界坐标中心
   * @param {number} radius - 球体半径
   * @param {number} count - 添加点数
   * @returns {{addedPoints: Array<{x:number,y:number,z:number}>, addedCount: number}}
   */
  addPointsAtPosition(center, radius, count) {
    const addedPoints = []
    // 将世界坐标中心转换到局部坐标
    const invMatrix = new THREE.Matrix4().copy(this.pointsObject.matrixWorld).invert()
    const localCenter = center.clone().applyMatrix4(invMatrix)

    for (let i = 0; i < count; i++) {
      // 球体内均匀分布
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * Math.cbrt(Math.random())

      const x = localCenter.x + r * Math.sin(phi) * Math.cos(theta)
      const y = localCenter.y + r * Math.sin(phi) * Math.sin(theta)
      const z = localCenter.z + r * Math.cos(phi)

      addedPoints.push({ x, y, z })
    }

    this.addedPoints.push(...addedPoints)
    this.rebuildGeometry()
    return { addedPoints, addedCount: addedPoints.length }
  }

  /**
   * 重建 geometry：只显示未删除的原始点 + 新增的点
   */
  rebuildGeometry() {
    // 计算剩余原始点数
    let remainingOriginalCount = 0
    for (let i = 0; i < this.originalCount; i++) {
      if (!this.deletedMask[i]) remainingOriginalCount++
    }

    const totalCount = remainingOriginalCount + this.addedPoints.length
    const positions = new Float32Array(totalCount * 3)

    let idx = 0
    // 添加未删除的原始点
    for (let i = 0; i < this.originalCount; i++) {
      if (this.deletedMask[i]) continue
      positions[idx * 3] = this.originalPositions[i * 3]
      positions[idx * 3 + 1] = this.originalPositions[i * 3 + 1]
      positions[idx * 3 + 2] = this.originalPositions[i * 3 + 2]
      idx++
    }

    // 添加新增点
    for (const p of this.addedPoints) {
      positions[idx * 3] = p.x
      positions[idx * 3 + 1] = p.y
      positions[idx * 3 + 2] = p.z
      idx++
    }

    // 替换 geometry
    const newGeometry = new THREE.BufferGeometry()
    newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // 保留旧材质
    const oldMaterial = this.pointsObject.material

    this.pointsObject.geometry.dispose()
    this.pointsObject.geometry = newGeometry

    // 确保材质正确
    if (!this.pointsObject.material) {
      this.pointsObject.material = oldMaterial
    }

    // 标记需要更新
    this.pointsObject.geometry.attributes.position.needsUpdate = true
  }

  /**
   * 撤销删除：恢复指定索引的点
   * @param {Array<{index:number}>} deletedPoints
   */
  restoreDeletedPoints(deletedPoints) {
    if (!deletedPoints || deletedPoints.length === 0) return
    for (const dp of deletedPoints) {
      if (dp.index >= 0 && dp.index < this.originalCount) {
        this.deletedMask[dp.index] = 0
      }
    }
    this.rebuildGeometry()
  }

  /**
   * 撤销添加：移除最后 count 个新增的点
   * @param {number} count
   */
  removeAddedPoints(count) {
    if (!count || count <= 0) return
    const removeCount = Math.min(count, this.addedPoints.length)
    this.addedPoints.splice(this.addedPoints.length - removeCount, removeCount)
    this.rebuildGeometry()
  }

  /**
   * 笔刷选取：查找世界坐标球体内的可见点索引
   * @param {THREE.Vector3} center - 世界坐标球心
   * @param {number} radius - 球体半径
   * @returns {Array<{index:number, x:number, y:number, z:number}>}
   */
  findPointsInSphere(center, radius) {
    const result = []
    const matrixWorld = this.pointsObject.matrixWorld
    const vec = new THREE.Vector3()
    const radiusSq = radius * radius

    for (let i = 0; i < this.originalCount; i++) {
      if (this.deletedMask[i]) continue
      vec.set(
        this.originalPositions[i * 3],
        this.originalPositions[i * 3 + 1],
        this.originalPositions[i * 3 + 2]
      )
      vec.applyMatrix4(matrixWorld)
      if (vec.distanceToSquared(center) <= radiusSq) {
        result.push({
          index: i,
          x: this.originalPositions[i * 3],
          y: this.originalPositions[i * 3 + 1],
          z: this.originalPositions[i * 3 + 2]
        })
      }
    }
    return result
  }

  /**
   * 批量标记删除，返回被删除的点数据
   * @param {Array<{index:number}>} points
   * @returns {Array<{index:number, x:number, y:number, z:number}>}
   */
  markDeleted(points) {
    if (!points || points.length === 0) return []
    const deleted = []
    for (const p of points) {
      if (p.index >= 0 && p.index < this.originalCount && !this.deletedMask[p.index]) {
        this.deletedMask[p.index] = 1
        deleted.push(p)
      }
    }
    if (deleted.length > 0) this.rebuildGeometry()
    return deleted
  }

  /**
   * 直接追加点数据（笔刷添加用），返回追加的数量
   * @param {Array<{x:number, y:number, z:number}>} points
   */
  pushPoints(points) {
    if (!points || points.length === 0) return 0
    this.addedPoints.push(...points)
    this.rebuildGeometry()
    return points.length
  }

  /**
   * 获取当前总点数
   * @returns {number}
   */
  getPointCount() {
    let count = 0
    for (let i = 0; i < this.originalCount; i++) {
      if (!this.deletedMask[i]) count++
    }
    return count + this.addedPoints.length
  }

  /**
   * 获取原始点数（不包含新增）
   * @returns {number}
   */
  getOriginalCount() {
    return this.originalCount
  }

  /**
   * 获取新增点数
   * @returns {number}
   */
  getAddedCount() {
    return this.addedPoints.length
  }

  /**
   * 获取已删除的原始点数
   * @returns {number}
   */
  getDeletedCount() {
    let count = 0
    for (let i = 0; i < this.originalCount; i++) {
      if (this.deletedMask[i]) count++
    }
    return count
  }

  /**
   * 销毁编辑器，释放资源
   */
  dispose() {
    this.deletedMask = null
    this.originalPositions = null
    this.addedPoints = null
  }
}
