/**
 * ViewEditCommand.js - 命令模式，封装点云和体素编辑操作为可撤销/重做的命令
 */

// ============================================
// 撤销管理器
// ============================================
export class ViewEditUndoManager {
  constructor(maxSize = 50) {
    this.undoStack = []
    this.redoStack = []
    this.maxSize = maxSize
  }

  /**
   * 执行命令：推入 undoStack，清空 redoStack
   * @param {ViewEditCommand} cmd
   * @returns {any} 命令执行结果
   */
  execute(cmd) {
    if (!cmd || typeof cmd.execute !== 'function') {
      console.warn('[ViewEditUndoManager] Invalid command')
      return null
    }
    const result = cmd.execute()
    this.undoStack.push({ cmd, result })

    // 限制栈大小
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }

    // 清空 redoStack
    this.redoStack = []
    return result
  }

  /**
   * 直接推入命令和结果（不调用 execute），用于点已在绘制阶段执行完毕的场景
   * @param {ViewEditCommand} cmd
   * @param {any} result
   */
  pushDirect(cmd, result) {
    if (!cmd) return
    this.undoStack.push({ cmd, result })
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  /**
   * 撤销最后一个操作
   * @returns {boolean}
   */
  undo() {
    if (this.undoStack.length === 0) return false
    const { cmd, result } = this.undoStack.pop()
    if (typeof cmd.undo === 'function') {
      cmd.undo(result)
    }
    this.redoStack.push({ cmd, result })
    return true
  }

  /**
   * 重做最后一个撤销的操作
   * @returns {boolean}
   */
  redo() {
    if (this.redoStack.length === 0) return false
    const { cmd } = this.redoStack.pop()
    const result = cmd.execute()
    this.undoStack.push({ cmd, result })
    return true
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }

  getUndoCount() {
    return this.undoStack.length
  }

  getRedoCount() {
    return this.redoStack.length
  }
}

// ============================================
// 基础命令类
// ============================================
class ViewEditCommand {
  constructor(options = {}) {
    this.entityId = options.entityId
    this.viewType = options.viewType
    this.timestamp = Date.now()
  }
}

// ============================================
// 点云删除命令
// ============================================
export class PointCloudDeleteCommand extends ViewEditCommand {
  constructor(options = {}) {
    super(options)
    this.editor = options.editor
    this.box3 = options.box3
    this._brushPoints = options._brushPoints || null // 笔刷模式：预收集的点列表
  }

  execute() {
    if (!this.editor) return null
    // 笔刷模式：重新标记删除（首次执行/重做都需要实际删点）
    if (this._brushPoints) {
      const deleted = this.editor.markDeleted(this._brushPoints)
      return { deletedPoints: deleted, affectedCount: deleted.length }
    }
    // 框选模式（保留兼容）
    if (this.box3) {
      return this.editor.deletePointsInBox(this.box3)
    }
    return null
  }

  undo(saved) {
    if (!this.editor || !saved || !saved.deletedPoints) return
    this.editor.restoreDeletedPoints(saved.deletedPoints)
  }
}

// ============================================
// 点云添加命令
// ============================================
export class PointCloudAddCommand extends ViewEditCommand {
  constructor(options = {}) {
    super(options)
    this.editor = options.editor
    this.center = options.center
    this.radius = options.radius
    this.count = options.count
    this._brushPoints = options._brushPoints || null // 笔刷模式：预生成的点坐标列表
  }

  execute() {
    if (!this.editor) return null
    // 笔刷模式：直接追加保存的点坐标
    if (this._brushPoints && this._brushPoints.length > 0) {
      const added = this.editor.pushPoints(this._brushPoints)
      return { addedCount: added }
    }
    // 单点模式
    if (!this.center || !this.radius || !this.count) return null
    return this.editor.addPointsAtPosition(this.center, this.radius, this.count)
  }

  undo(saved) {
    if (!this.editor || !saved || !saved.addedCount) return
    this.editor.removeAddedPoints(saved.addedCount)
  }
}

// ============================================
// 体素放置命令
// ============================================
export class VoxelPlaceCommand extends ViewEditCommand {
  constructor(options = {}) {
    super(options)
    this.editor = options.editor
    this.worldPos = options.worldPos
  }

  execute() {
    if (!this.editor || !this.worldPos) return null
    return this.editor.placeVoxel(this.worldPos)
  }

  undo(saved) {
    if (!this.editor || !saved) return
    this.editor.setVoxel(saved.x, saved.y, saved.z, saved.oldValue)
    this.editor.rebuildMesh()
  }
}

// ============================================
// 体素破坏命令
// ============================================
export class VoxelBreakCommand extends ViewEditCommand {
  constructor(options = {}) {
    super(options)
    this.editor = options.editor
    this.worldPos = options.worldPos
  }

  execute() {
    if (!this.editor || !this.worldPos) return null
    return this.editor.breakVoxel(this.worldPos)
  }

  undo(saved) {
    if (!this.editor || !saved) return
    this.editor.setVoxel(saved.x, saved.y, saved.z, saved.oldValue)
    this.editor.rebuildMesh()
  }
}

// ============================================
// 命令工厂（方便根据类型创建命令）
// ============================================
export function createViewEditCommand(type, options) {
  switch (type) {
    case 'pointCloudDelete':
      return new PointCloudDeleteCommand(options)
    case 'pointCloudAdd':
      return new PointCloudAddCommand(options)
    case 'voxelPlace':
      return new VoxelPlaceCommand(options)
    case 'voxelBreak':
      return new VoxelBreakCommand(options)
    default:
      console.warn('[createViewEditCommand] Unknown command type:', type)
      return null
  }
}
