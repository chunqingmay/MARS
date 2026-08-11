import * as Y from 'yjs'
import { BaseSystem } from '../SystemManager.js'
import { entityManager } from '../EntityManager.js'
import { ComponentTypes, createAppearanceComponent } from '../Components.js'
import { syncCloudPointOpsFromCRDT, syncVoxelOpsFromCRDT } from '@/utils/modeling/viewEditIntegration'

export class ViewEditSystem extends BaseSystem {
  constructor(scene, crdtSystem = null) {
    super('ViewEditSystem')
    this.priority = 85
    this.scene = scene
    this.crdtSystem = crdtSystem
    this.pendingAppearanceUpdates = []
    this.vm = null
    // 追踪已处理的操作索引 { entityId: number }
    this.lastCloudPointOpIndex = new Map()
    this.lastVoxelOpIndex = new Map()
  }

  init() {
    console.log('[ViewEditSystem] Initialized')
  }

  setCRDTSystem(crdtSystem) {
    this.crdtSystem = crdtSystem
  }

  setVM(vm) {
    this.vm = vm
  }

  // 更新实体外观属性 - 由前端 UI 调用
  updateAppearance(entityId, appearanceData) {
    let entity = entityManager.getEntity(entityId)
    
    // Auto-create ECS entity if it doesn't exist but has a Three.js object with entityId
    if (!entity) {
      console.log(`[ViewEditSystem] Entity ${entityId} not in ECS, creating...`)
      // Try to find the Three.js object and create an ECS entity for it
      const mesh = this._findMeshByEntityId(entityId)
      if (!mesh) {
        console.warn(`[ViewEditSystem] Could not find mesh for entity ${entityId}`)
        return
      }
      entity = entityManager.createEntity(entityId, `Object_${entityId}`, {
        [ComponentTypes.APPEARANCE]: createAppearanceComponent({
          color: appearanceData.color || '#ffffff',
          opacity: appearanceData.opacity !== undefined ? appearanceData.opacity : 1.0,
          metalness: appearanceData.metalness !== undefined ? appearanceData.metalness : 0.3,
          roughness: appearanceData.roughness !== undefined ? appearanceData.roughness : 0.7,
          transparent: appearanceData.transparent || false,
          wireframe: appearanceData.wireframe || false
        })
      })
      mesh.userData.entityId = entity.id
      console.log(`[ViewEditSystem] Created ECS entity for ${entityId}: ${entity.id}`)
    }

    const appearance = entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)
    if (!appearance) {
      console.warn(`[ViewEditSystem] Entity ${entityId} has no Appearance component`)
      return
    }

    // 更新外观属性
    if (appearanceData.color !== undefined) appearance.color = appearanceData.color
    if (appearanceData.opacity !== undefined) appearance.opacity = appearanceData.opacity
    if (appearanceData.metalness !== undefined) appearance.metalness = appearanceData.metalness
    if (appearanceData.roughness !== undefined) appearance.roughness = appearanceData.roughness
    if (appearanceData.transparent !== undefined) appearance.transparent = appearanceData.transparent
    if (appearanceData.wireframe !== undefined) appearance.wireframe = appearanceData.wireframe

    appearance._dirty = true

    // 标记需要同步到 CRDT
    this.pendingAppearanceUpdates.push({ entityId })
  }

  _findMeshByEntityId(entityId) {
    if (!this.scene) return null
    let found = null
    this.scene.traverse(child => {
      if (child.userData && child.userData.entityId === entityId) {
        found = child
      }
    })
    return found
  }

  update(deltaTime, currentTime) {
    const entities = entityManager.getEntitiesWithComponent(ComponentTypes.APPEARANCE)
    
    for (const entity of entities) {
      const appearance = entityManager.getComponent(entity.id, ComponentTypes.APPEARANCE)
      if (!appearance || !appearance._dirty) continue

      // 先尝试通过 RENDER 组件找到 mesh
      const render = entityManager.getComponent(entity.id, ComponentTypes.RENDER)
      if (render && render.mesh) {
        console.log(`[ViewEditSystem] Applying appearance to RENDER mesh: ${entity.id}`)
        this._applyAppearanceToMesh(entity.id, render.mesh, appearance)
      } else {
        // 如果没有 RENDER 组件，直接通过 entityId 查找 Three.js 对象并应用
        const mesh = this._findMeshByEntityId(entity.id)
        if (mesh) {
          console.log(`[ViewEditSystem] Applying appearance to direct mesh: ${entity.id}`)
          this._applyAppearanceToMesh(entity.id, mesh, appearance)
        } else {
          console.warn(`[ViewEditSystem] Could not find mesh for entity ${entity.id} to apply appearance`)
        }
      }

      appearance._dirty = false
    }

    // 同步外观变更到 CRDT
    this._syncPendingAppearanceToCRDT()

    // 同步点云和体素编辑操作（远程 CRDT -> 本地）
    this._syncViewEditOpsFromCRDT()
  }

  // 检测 marsEntities 中 cloudPointOps 和 voxelOps 的变化，处理远程操作
  _syncViewEditOpsFromCRDT() {
    if (!this.vm || !this.vm.marsEntities) return

    this.vm.marsEntities.forEach((entityMap, entityId) => {
      // 同步 cloudPointOps
      const cloudPointOps = entityMap.get('cloudPointOps')
      if (cloudPointOps instanceof Y.Array) {
        const lastIdx = this.lastCloudPointOpIndex.get(entityId) || 0
        const currentLength = cloudPointOps.length
        if (currentLength > lastIdx) {
          const newOps = []
          for (let i = lastIdx; i < currentLength; i++) {
            newOps.push(cloudPointOps.get(i))
          }
          if (newOps.length > 0) {
            console.log(`[ViewEditSystem] 同步 ${entityId} 的 cloudPointOps: ${newOps.length} 个新操作`)
            syncCloudPointOpsFromCRDT(this.vm, entityId, newOps)
          }
          this.lastCloudPointOpIndex.set(entityId, currentLength)
        }
      }

      // 同步 voxelOps
      const voxelOps = entityMap.get('voxelOps')
      if (voxelOps instanceof Y.Array) {
        const lastIdx = this.lastVoxelOpIndex.get(entityId) || 0
        const currentLength = voxelOps.length
        if (currentLength > lastIdx) {
          const newOps = []
          for (let i = lastIdx; i < currentLength; i++) {
            newOps.push(voxelOps.get(i))
          }
          if (newOps.length > 0) {
            console.log(`[ViewEditSystem] 同步 ${entityId} 的 voxelOps: ${newOps.length} 个新操作`)
            syncVoxelOpsFromCRDT(this.vm, entityId, newOps)
          }
          this.lastVoxelOpIndex.set(entityId, currentLength)
        }
      }
    })
  }

  _syncPendingAppearanceToCRDT() {
    if (!this.crdtSystem || !this.crdtSystem.entitiesMap) {
      console.warn('[ViewEditSystem] No CRDT system for appearance sync')
      return
    }
    console.log('[ViewEditSystem] Pending appearance updates:', this.pendingAppearanceUpdates.length)
    
    while (this.pendingAppearanceUpdates.length > 0) {
      const { entityId } = this.pendingAppearanceUpdates.shift()
      let yjsEntity = this.crdtSystem.entitiesMap.get(entityId)
      if (!yjsEntity) {
        console.log(`[ViewEditSystem] Creating Yjs entity for ${entityId}`)
        yjsEntity = new Y.Map()
        this.crdtSystem.entitiesMap.set(entityId, yjsEntity)
      }

      const appearance = entityManager.getComponent(entityId, ComponentTypes.APPEARANCE)
      if (appearance) {
        const appearanceData = {
          color: appearance.color,
          opacity: appearance.opacity,
          metalness: appearance.metalness,
          roughness: appearance.roughness,
          transparent: appearance.transparent,
          wireframe: appearance.wireframe
        }
        console.log('[ViewEditSystem] Writing appearance to CRDT:', entityId, appearanceData)
        this.crdtSystem._setYTextValue(yjsEntity, 'appearance', JSON.stringify(appearanceData))
      } else {
        console.warn('[ViewEditSystem] No appearance component for', entityId)
      }
    }
  }

  _applyAppearanceToMesh(entityId, mesh, appearance) {
    const self = this

    function traverseAndApply(obj) {
      if (obj.userData && obj.userData.isViewEditLayer) return
      if (obj.isMesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        
        materials.forEach(mat => {
          // 更新颜色
          if (appearance.color) {
            mat.color.set(appearance.color)
          }
          // Update transparency.
          mat.transparent = appearance.transparent
          mat.opacity = appearance.opacity
          mat.needsUpdate = true
          
          // 更新金属度和粗糙度(仅对 MeshStandardMaterial 等 PBR 材质有效)
          if (mat.metalness !== undefined) {
            mat.metalness = appearance.metalness
          }
          if (mat.roughness !== undefined) {
            mat.roughness = appearance.roughness
          }
          
          // 更新线框模式
          mat.wireframe = appearance.wireframe
        })
      }
      
      // Apply appearance to child objects.
      if (obj.children && obj.children.length > 0) {
        obj.children.forEach(child => traverseAndApply(child))
      }
    }

    traverseAndApply(mesh)
  }
}
