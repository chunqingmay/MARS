export const OFFICE_MODEL_BASE_PATH = '/modelingsrc'

export const OFFICE_ENTITIES = [
  { id: 'desk_1', name: '办公桌', glb: 'Adjustable Desk.glb', ply: 'Adjustable Desk.ply', vox: 'Adjustable Desk.glb', x: -30 },
  { id: 'chair_1', name: '人体工学椅', glb: 'Executive Chair.glb', ply: 'Executive Chair.ply', vox: 'Executive Chair.glb', x: -15 },
  { id: 'monitor_1', name: '显示器', glb: 'Monitor.glb', ply: 'Monitor.ply', vox: 'Monitor.glb', x: 0 },
  { id: 'lamp_1', name: '台灯', glb: 'Desk Lamp.glb', ply: 'Desk Lamp.ply', vox: 'Desk Lamp.glb', x: 15 },
  { id: 'cabinet_1', name: '文件柜', glb: 'Cabinet.glb', ply: 'Cabinet.ply', vox: 'Cabinet.glb', x: 30 }
]

export const OFFICE_ENTITY_IDS = OFFICE_ENTITIES.map(entity => entity.id)

export function getOfficeEntityViewPaths(entity, basePath = OFFICE_MODEL_BASE_PATH) {
  return {
    gridPath: `${basePath}/网格/${entity.glb}`,
    voxelPath: `${basePath}/体素/${entity.vox}`,
    cloudPath: `${basePath}/点云/${entity.ply}`
  }
}

const ZERO_OFFSET = { x: 0, y: 0, z: 0 }
const CLOUD_DEFAULT_OFFSET = { x: 0, y: 0, z: -5.0 }
const DEFAULT_AXIS_DIRECTION = { x: 1, y: 1, z: 1 }
const FLIPPED_CLOUD_AXIS_DIRECTION = { x: 1, y: -1, z: 1 }

export const OFFICE_VIEW_LAYOUT = {
  GridView: {
    offset: {}
  },
  VoxelView: {
    scale: {
      desk_1: 0.075,
      chair_1: 0.1,
      monitor_1: 0.28,
      lamp_1: 0.35,
      cabinet_1: 0.3
    },
    offset: {
      desk_1: { x: 0, y: 0, z: -5 },
      chair_1: { x: 0, y: 0, z: 0 },
      monitor_1: { x: -5, y: 0, z: 0 },
      lamp_1: { x: 0, y: 0, z: -2.5 },
      cabinet_1: { x: -5, y: 0, z: -9 }
    }
  },
  CloudPointView: {
    scale: {
      desk_1: 0.5,
      chair_1: 0.5,
      monitor_1: 0.5,
      lamp_1: 0.5,
      cabinet_1: 0.5
    },
    offset: {
      desk_1: CLOUD_DEFAULT_OFFSET,
      chair_1: CLOUD_DEFAULT_OFFSET,
      monitor_1: CLOUD_DEFAULT_OFFSET,
      lamp_1: CLOUD_DEFAULT_OFFSET,
      cabinet_1: CLOUD_DEFAULT_OFFSET
    },
    axisDirection: {
      desk_1: FLIPPED_CLOUD_AXIS_DIRECTION,
      chair_1: FLIPPED_CLOUD_AXIS_DIRECTION,
      monitor_1: FLIPPED_CLOUD_AXIS_DIRECTION,
      lamp_1: FLIPPED_CLOUD_AXIS_DIRECTION,
      cabinet_1: FLIPPED_CLOUD_AXIS_DIRECTION
    }
  }
}

export function getOfficeViewOffset(entityId, viewType) {
  return OFFICE_VIEW_LAYOUT[viewType]?.offset?.[entityId] || ZERO_OFFSET
}

export function getOfficeVoxelScale(entityId) {
  return OFFICE_VIEW_LAYOUT.VoxelView.scale[entityId] || 10
}

export function getOfficeCloudPointScale(entityId) {
  return OFFICE_VIEW_LAYOUT.CloudPointView.scale[entityId] || 1
}

export function getOfficeCloudPointAxisDirection(entityId) {
  return OFFICE_VIEW_LAYOUT.CloudPointView.axisDirection[entityId] || DEFAULT_AXIS_DIRECTION
}
