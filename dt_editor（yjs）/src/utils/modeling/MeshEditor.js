import * as THREE from 'three'

/**
 * MeshEditor - 网格编辑器（GridView 的视图特有操作）
 *
 * 将 GridView 加载的 GLB 三角网格改造为可编辑对象，提供两种视图特有操作：
 *   - delete_face：删除命中的原始三角面（网格出现「洞」）
 *   - subdivide_face：对命中的原始三角面做确定性中点细分（1 三角形 → 4 子三角形）
 *
 * 与点云 / 体素编辑器的关键区别：三角形没有天然稳定 ID，若用「当前渲染面 index」
 * 标识，删一个面后后续 index 全部前移，远程重放会删错面。因此本编辑器在构造时
 * 固化一份「全局原始面快照」originalFaces（遍历 Group 下所有 Mesh，把每个三角形
 * 的顶点统一转换到 meshObject 局部坐标系），后续所有操作都以这份快照的 index 为
 * 稳定标识，永不漂移。
 *
 * 细分采用确定性中点细分（1→4），子面顶点坐标由原始面三顶点唯一确定，因此两端
 * 重放结果完全一致，无需在 CRDT 中传输子面坐标。
 *
 * 注意：按当前设计，子面不可再被删除或再细分（只作用于原始面层面）。
 */
export class MeshEditor {
  constructor(meshObject, entityId) {
    if (!meshObject) {
      throw new Error('MeshEditor requires a valid mesh object')
    }
    this.meshObject = meshObject // GridView 的 Group（gltf.scene）
    this.entityId = entityId

    meshObject.updateWorldMatrix(true, true)

    // 全局原始面快照：每个面 { a, b, c } 顶点均在 meshObject 局部坐标系
    this.originalFaces = []
    this._extractFaces()

    // 删除 / 细分标记（都按原始面 index）
    this.deletedFaces = new Set()
    this.subdividedFaces = new Set()

    // 渲染三角形 index → 原始面 index 的映射（raycast 反查用）
    this._renderFaceIds = []

    // 编辑 Mesh：黑色实体，替代原始网格显示（删面后出现洞，编辑结果持久可见）
    this.editMesh = null
    // 悬停预览高亮面
    this.highlightMesh = null

    this.rebuildMesh()
    // 接管显示：隐藏原始 GLB mesh，由 editMesh 替代（编辑结果退出编辑后仍可见）
    this.hideOriginal()
  }

  /**
   * 提取全部原始三角形，统一转换到 meshObject 局部坐标系
   */
  _extractFaces() {
    const toLocal = (x, y, z, matrixWorld) => {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(matrixWorld)
      this.meshObject.worldToLocal(v)
      return v
    }

    this.meshObject.traverse((child) => {
      if (!child.isMesh || !child.geometry) return
      const geom = child.geometry
      const pos = geom.getAttribute('position')
      if (!pos) return
      const index = geom.getIndex()
      const matrixWorld = child.matrixWorld

      const addFace = (ia, ib, ic) => {
        this.originalFaces.push({
          a: toLocal(pos.getX(ia), pos.getY(ia), pos.getZ(ia), matrixWorld),
          b: toLocal(pos.getX(ib), pos.getY(ib), pos.getZ(ib), matrixWorld),
          c: toLocal(pos.getX(ic), pos.getY(ic), pos.getZ(ic), matrixWorld)
        })
      }

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          addFace(index.getX(i), index.getX(i + 1), index.getX(i + 2))
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          addFace(i, i + 1, i + 2)
        }
      }
    })
  }

  get faceCount() {
    return this.originalFaces.length
  }

  isFaceDeleted(faceId) {
    return this.deletedFaces.has(faceId)
  }

  isFaceSubdivided(faceId) {
    return this.subdividedFaces.has(faceId)
  }

  /**
   * 删除原始面（已删 / 已细分则返回 false，保证幂等与容错）
   */
  deleteFace(faceId) {
    if (faceId < 0 || faceId >= this.faceCount) return false
    if (this.deletedFaces.has(faceId)) return false
    if (this.subdividedFaces.has(faceId)) return false
    this.deletedFaces.add(faceId)
    this.rebuildMesh()
    return true
  }

  /**
   * 细分原始面（已删 / 已细分则返回 false，保证幂等与容错）
   */
  subdivideFace(faceId) {
    if (faceId < 0 || faceId >= this.faceCount) return false
    if (this.deletedFaces.has(faceId)) return false
    if (this.subdividedFaces.has(faceId)) return false
    this.subdividedFaces.add(faceId)
    this.rebuildMesh()
    return true
  }

  // ---- undo 辅助 ----
  undeleteFace(faceId) {
    if (!this.deletedFaces.has(faceId)) return false
    this.deletedFaces.delete(faceId)
    this.rebuildMesh()
    return true
  }

  unsubdivideFace(faceId) {
    if (!this.subdividedFaces.has(faceId)) return false
    this.subdividedFaces.delete(faceId)
    this.rebuildMesh()
    return true
  }

  /**
   * 隐藏原始 GLB mesh 子对象（构造 / 进入编辑时调用），由 editMesh 替代显示
   */
  hideOriginal() {
    this.meshObject.traverse((child) => {
      if ((child.isMesh || child.isLineSegments || child.isPoints) && !child.userData.isMeshEditMesh) {
        child.visible = false
      }
    })
  }

  /**
   * 恢复原始 GLB mesh 子对象显示（仅 dispose 销毁编辑器时调用）
   */
  showOriginal() {
    this.meshObject.traverse((child) => {
      if ((child.isMesh || child.isLineSegments || child.isPoints) && !child.userData.isMeshEditMesh) {
        child.visible = true
      }
    })
  }

  /**
   * 确定性中点细分：1 三角形 → 4 子三角形
   */
  _subdivideTriangle(face) {
    const ab = new THREE.Vector3().addVectors(face.a, face.b).multiplyScalar(0.5)
    const bc = new THREE.Vector3().addVectors(face.b, face.c).multiplyScalar(0.5)
    const ca = new THREE.Vector3().addVectors(face.c, face.a).multiplyScalar(0.5)
    return [
      { a: face.a.clone(), b: ab, c: ca },
      { a: face.b.clone(), b: bc, c: ab },
      { a: face.c.clone(), b: ca, c: bc },
      { a: ab, b: bc, c: ca }
    ]
  }

  /**
   * 根据 deletedFaces / subdividedFaces 重建编辑 mesh 的线框几何
   */
  rebuildMesh() {
    const vertices = []
    const indices = []
    this._renderFaceIds = []

    const pushTri = (face, faceId) => {
      const base = vertices.length / 3
      vertices.push(
        face.a.x, face.a.y, face.a.z,
        face.b.x, face.b.y, face.b.z,
        face.c.x, face.c.y, face.c.z
      )
      indices.push(base, base + 1, base + 2)
      this._renderFaceIds.push(faceId)
    }

    for (let faceId = 0; faceId < this.faceCount; faceId++) {
      if (this.deletedFaces.has(faceId)) continue
      const face = this.originalFaces[faceId]
      if (this.subdividedFaces.has(faceId)) {
        const subs = this._subdivideTriangle(face)
        for (const s of subs) pushTri(s, faceId)
      } else {
        pushTri(face, faceId)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)

    if (!this.editMesh) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      })
      this.editMesh = new THREE.Mesh(geometry, material)
      this.editMesh.userData.isMeshEditMesh = true
      this.editMesh.renderOrder = 1200
      this.meshObject.add(this.editMesh)
    } else {
      this.editMesh.geometry.dispose()
      this.editMesh.geometry = geometry
    }
  }

  /**
   * 射线检测命中的原始面 index（未命中返回 -1）
   */
  raycastFace(raycaster) {
    if (!this.editMesh || this._renderFaceIds.length === 0) return -1
    // 确保 editMesh 的 matrixWorld 最新（首次进入编辑时 render 循环可能尚未刷新）
    this.meshObject.updateWorldMatrix(true, true)
    const hits = raycaster.intersectObject(this.editMesh, false)
    if (hits.length === 0) return -1
    const faceIndex = hits[0].faceIndex
    if (faceIndex === undefined || faceIndex === null) return -1
    const faceId = this._renderFaceIds[faceIndex] ?? -1
    if (faceId < 0) return -1
    // 只返回可编辑的面（未删且未细分），命中不可编辑面视为未命中
    if (this.deletedFaces.has(faceId) || this.subdividedFaces.has(faceId)) return -1
    return faceId
  }

  /**
   * 悬停预览：高亮命中的原始面（绿色半透明，沿法线轻微偏移避免 z-fighting）
   * @param {number} faceId - 原始面 index，-1 表示清除高亮
   */
  highlightFace(faceId) {
    if (!this.highlightMesh) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
      geometry.setIndex([0, 1, 2])
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
      this.highlightMesh = new THREE.Mesh(geometry, material)
      this.highlightMesh.renderOrder = 1300
      this.highlightMesh.visible = false
      this.meshObject.add(this.highlightMesh)
    }

    if (faceId < 0 || faceId >= this.faceCount) {
      this.highlightMesh.visible = false
      return
    }

    const face = this.originalFaces[faceId]
    const ab = new THREE.Vector3().subVectors(face.b, face.a)
    const ac = new THREE.Vector3().subVectors(face.c, face.a)
    const normal = new THREE.Vector3().crossVectors(ab, ac).normalize()
    const ox = normal.x * 0.01
    const oy = normal.y * 0.01
    const oz = normal.z * 0.01

    const arr = this.highlightMesh.geometry.attributes.position.array
    arr[0] = face.a.x + ox; arr[1] = face.a.y + oy; arr[2] = face.a.z + oz
    arr[3] = face.b.x + ox; arr[4] = face.b.y + oy; arr[5] = face.b.z + oz
    arr[6] = face.c.x + ox; arr[7] = face.c.y + oy; arr[8] = face.c.z + oz
    this.highlightMesh.geometry.attributes.position.needsUpdate = true
    this.highlightMesh.visible = true
  }

  /**
   * 清除悬停预览高亮
   */
  clearHighlight() {
    if (this.highlightMesh) this.highlightMesh.visible = false
  }

  /**
   * 销毁编辑器，释放资源
   */
  dispose() {
    this.showOriginal()
    if (this.editMesh) {
      if (this.editMesh.parent) this.editMesh.parent.remove(this.editMesh)
      if (this.editMesh.geometry) this.editMesh.geometry.dispose()
      if (this.editMesh.material) this.editMesh.material.dispose()
      this.editMesh = null
    }
    if (this.highlightMesh) {
      if (this.highlightMesh.parent) this.highlightMesh.parent.remove(this.highlightMesh)
      if (this.highlightMesh.geometry) this.highlightMesh.geometry.dispose()
      if (this.highlightMesh.material) this.highlightMesh.material.dispose()
      this.highlightMesh = null
    }
    this.originalFaces = null
    this.deletedFaces = null
    this.subdividedFaces = null
    this._renderFaceIds = null
  }
}
