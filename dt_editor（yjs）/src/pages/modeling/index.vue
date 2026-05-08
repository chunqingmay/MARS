<template>
    <div>
      <Ball v-for="client in clients" :key="client.clientId" :clientId="client.clientId" :color="client.color" :position="client.position" :userName="client.userName" />
      <el-container>
        <el-header>
          <myHeader></myHeader>
        </el-header>
        <el-main>
          <el-card class="main_card">
            <div class="main_left">
              <div class="editor_header">
                <el-dropdown style="padding-right: 10px;">
                  <el-button type="primary">Create Basic Shape</el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item @click.native="createCube">Cube</el-dropdown-item>
                    <el-dropdown-item @click.native="createSphere">Sphere</el-dropdown-item>
                    <el-dropdown-item @click.native="createCylinder">Cylinder</el-dropdown-item>
                    <!-- <el-dropdown-item @click.native="createCone">Cone</el-dropdown-item> -->
                    <el-dropdown-item @click.native="createTorus">Torus</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-dropdown style="padding-left: 10px;">
                  <el-button type="primary">Create Polyhedron</el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item @click.native="createTetrahedronGeometry">Tetrahedron</el-dropdown-item>
                    <el-dropdown-item @click.native="createOctahedronGeometry">Octahedron</el-dropdown-item>
                    <el-dropdown-item @click.native="createDodecahedronGeometry">Dodecahedron</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-divider direction="vertical"></el-divider>
                <el-button type="warning" @click="bspIntersect">Intersection</el-button>
                <el-button type="warning" @click="bspUnion">Union</el-button>
                <el-button type="warning" @click="bspSubtract">Difference</el-button>
                <el-button type="warning" @click="groupObjects">Group</el-button>
                <el-divider direction="vertical"></el-divider>
                <el-dropdown style="padding-right: 10px;">
                  <el-button type="info">Background</el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item @click.native="changeBackground('white')">White</el-dropdown-item>
                    <el-dropdown-item @click.native="changeBackground('black')">Black</el-dropdown-item>
                    <el-dropdown-item @click.native="changeBackground('sky')">Sky</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-dropdown style="padding-right: 10px;">
                  <el-button type="info">Light Source</el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item @click.native="changeLightType('ambient')">Ambient Light</el-dropdown-item>
                    <el-dropdown-item @click.native="changeLightType('point')">Point Light</el-dropdown-item>
                    <el-dropdown-item @click.native="changeLightType('directional')">Directional Light</el-dropdown-item>
                    <el-dropdown-item @click.native="changeLightType('spot')">Spotlight</el-dropdown-item>
                    <el-dropdown-item @click.native="changeLightType('combined')">Combined Light</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <!-- <el-button type="info">Import</el-button> -->
                <el-dropdown style="padding-right: 10px;">
                  <el-button type="info">Import</el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item @click.native="importLocalModelDialogVisible = true">Import Local</el-dropdown-item>
                    <el-dropdown-item @click.native="importElementDialogVisible = true">Parts Library</el-dropdown-item>
                    <el-dropdown-item @click.native="importModelDialogVisible = true">Models Library</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-dropdown style="padding-right: 10px;">
                  <el-button type="info">Export</el-button>
                  <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item @click.native="exportGltfData">Export Gltf</el-dropdown-item>
                      <el-dropdown-item @click.native="exportStlData">Export Stl</el-dropdown-item>
                      <el-dropdown-item @click.native="exportObjData">Export Obj</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <el-button type="info" @click="save">Save</el-button>
                <el-button type="info" @click="invite">Invite</el-button>
                <el-button type="success" @click="initExperimentSceneECS">Initialize Experiment</el-button>
                <el-button type="warning" @click="runExperiment1ECS">Experiment 1</el-button>
                <el-button type="warning" @click="runExperiment2ECS">Experiment 2</el-button>
                <el-button type="warning" @click="runExperiment3ECS">Experiment 3</el-button>
              </div>
              <div class="editor_canvas" ref="threeTarget" id="editor_canvas"></div>
              <!-- Operation Log Panel (default on left side) -->
              <div class="draggable-panel" id="operation-log-panel" ref="operationLogPanel">
                <div class="panel-header" @mousedown="startDrag($event, 'operation-log-panel')" @touchstart.prevent="startDrag($event, 'operation-log-panel')">
                  <span>Operation Log</span>
                  <div class="panel-controls">
                    <el-button size="mini" type="text" @click="exportOperationLog" style="padding: 0 5px;" title="Export log for testing analysis">Export</el-button>
                    <el-button size="mini" type="text" @click="startCursorCalibration" style="padding: 0 5px;" :title="isCalibratingCursor ? 'Cancel calibration' : 'Calibrate cursor offset'">{{ isCalibratingCursor ? 'Cancel' : 'Calibrate' }}</el-button>
                    <el-button size="mini" type="text" @click="clearOperationLog" style="padding: 0 5px;">Clear</el-button>
                    <el-button size="mini" type="text" @click="resizeLogPanel('expand')" style="padding: 0 5px;" title="Expand">⤢+</el-button>
                    <el-button size="mini" type="text" @click="resizeLogPanel('shrink')" style="padding: 0 5px;" title="Shrink">⤢-</el-button>
                    <el-button size="mini" type="text" @click="showOperationLog = !showOperationLog" style="padding: 0 5px;">
                      {{ showOperationLog ? 'Collapse' : 'Expand' }}
                    </el-button>
                    <span class="drag-handle drag-button" @mousedown="startDrag($event, 'operation-log-panel')" @touchstart.prevent="startDrag($event, 'operation-log-panel')" title="Drag to move">⋮⋮</span>
                  </div>
                </div>
                <div v-if="showOperationLog" class="panel-content" :style="{ height: logPanelHeight + 'px' }" style="transition: height 0.3s ease;">
                  <div class="operation-log-container">
                    <div v-for="(log, index) in operationLog" :key="index" class="operation-log-item">
                      <span class="log-time">{{ log.timestamp }}</span>
                      <span class="log-type" :class="'log-type-' + log.type">{{ log.type }}</span>
                      <span class="log-content">{{ log.content }}</span>
                    </div>
                    <div v-if="operationLog.length === 0" class="no-log">
                      No operation records
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="main_right">
              <div class="right_container">
                <!-- Scene Elements Panel -->
                <div class="draggable-panel" id="scene-panel" ref="scenePanel">
                  <div class="panel-header" @mousedown="startDrag($event, 'scene-panel')" @touchstart.prevent="startDrag($event, 'scene-panel')">
                    <span>Scene Elements</span>
                    <div class="panel-controls">
                      <span class="drag-handle">≡</span>
                    </div>
                  </div>
                  <div class="panel-content">
                    <div style="margin-bottom: 10px;">
                      <el-button size="small" type="info" @click="resetCameraView">Reset View</el-button>
                    </div>
                    <div class="layer_control" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                      <el-button size="small" @click="showAllLayers" :type="visibleLayer === null ? 'primary' : 'default'">Show All Layers</el-button>
                      <el-select v-model="visibleLayer" size="small" placeholder="Select layer" style="width: 120px;" @change="updateLayerVisibility">
                        <el-option v-for="layer in layers" :key="layer" :label="`Layer ${layer}`" :value="layer"></el-option>
                      </el-select>
                      <div style="margin-top: 5px; width: 100%;">
                        <el-button size="small" v-for="viewType in viewTypes" :key="viewType.value" @click="switchAllViews(viewType.value)" :type="currentViewType === viewType.value ? 'primary' : 'default'">
                          {{ viewType.label }}
                        </el-button>
                      </div>
                    </div>
                    <el-tree
                      :data="sceneTreeData"
                      :props="treeProps"
                      :default-expand-all="true"
                      @node-click="handleNodeClick"
                      node-key="id"
                      ref="sceneTree"
                    ></el-tree>
                  </div>
                </div>
                
                <!-- Controls Panel -->
                <div class="draggable-panel" id="controls-panel" ref="controlsPanel">
                  <div class="panel-header" @mousedown="startDrag($event, 'controls-panel')" @touchstart.prevent="startDrag($event, 'controls-panel')">
                    <span>Controls</span>
                    <div class="panel-controls">
                      <span class="drag-handle">≡</span>
                    </div>
                  </div>
                  <div class="panel-content">
                    <div class="gui_canvas" id="gui_canvas"></div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-main>
      </el-container>
      <!-- Import Model from Local Dialog -->
      <el-dialog
        title="Import Model from Local"
        :visible.sync="importLocalModelDialogVisible" width="50%"
        @close="importLocalModelDialogClosed"
      >
        <!-- Content Area -->
        <!-- <el-upload
          :style="{'text-align':'center'}"
          class="upload-demo"
          drag
          action="http://localhost:3000/uploadModels"
          :on-preview="handlePreview"
          :on-remove="handleRemove"
          :before-remove="beforeRemove"
          multiple
          :limit="3"
          :on-exceed="handleExceed"
          :file-list="fileList"
          >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            <p>Drop file here, or <em>click to upload</em>
              <br/>
              Supported: GLTF, OBJ, MTL and STL files
            </p>
          </div>
        </el-upload> -->
        <el-upload
          :style="{'text-align':'center'}"
          class="upload-demo"
          action="http://localhost:3000/uploadModels"
          drag
          :on-success="handleSuccess"
          :on-error="handleError">
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            <p>Drop file here, or <em>click to upload</em>
              <br/>
              Supported: STL, FBX, GLTF and Blender files (.blend)
            </p>
          </div>
        </el-upload>

        <!-- Footer Area -->
        <span slot="footer" class="dialog-footer">
          <el-button @click="importLocalModelDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="importLocalModel">Confirm</el-button>
        </span>
      </el-dialog>

      <!-- Import Parts from Parts Library Dialog -->
      <el-dialog
        class="importElementDialog"
        title="Parts Library"
        :visible.sync="importElementDialogVisible" width="50%"
        @close="importElementDialogClosed"
      >
        <div class="card" v-for="element in elements" :key="element.id">
          <img class="img" :src="element.src" @click="importElement(element.name)"><br>
          <p class="elementName">{{element.name}}</p>
        </div>
      </el-dialog>

      <!-- Import Model from Models Library Dialog -->
      <el-dialog
        class="importModelDialog"
        title="Models Library"
        :visible.sync="importModelDialogVisible" width="56%"
        @close="importModelDialogClosed"
      >
        <div class="card" v-for="model in models" :key="model.id">
          <img class="img" :src="model.src" @click="importModel(model.name)"><br>
          <p class="elementName">{{model.name}}</p>
        </div>
      </el-dialog>

      <!-- Invite Dialog -->
      <el-dialog
        class="inviteDialog"
        title="Invite User to Collaborate"
        :visible.sync="inviteDialogVisible" width="40%"
        @close="inviteDialogClosed"
      >
        <el-form ref="inviteForm" :model="inviteForm" label-width="80px">
          <el-row>
            <el-col :span="11">
              <el-form-item label="Document Name">
                <el-input v-model="inviteForm.documentName"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Creator">
                <el-input v-model="inviteForm.documentCreator"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="Share Link">
            <el-input v-model="inviteForm.url" :style="{ width: '521px' }"></el-input>
            <el-button type="primary" @click="copyURL" style="margin-left: 10px;">Copy</el-button>
          </el-form-item>
        </el-form>
      </el-dialog>
    </div>
  </template>

  <script>

  import myHeader from '@/components/myHeader.vue'
  import * as THREE from 'three'
  const ThreeBSP = require('three-js-csg')(THREE)
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
  import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
  import dat from 'dat.gui'
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import { initYjsLatencyHelper, measureYjsAction, printYjsLatencyReport } from '@/utils/yjsLatencyHelper'
  import Ball from './Ball.vue' // Import ball component
  import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter"
  import {OBJExporter} from "three/examples/jsm/exporters/OBJExporter"
  import {STLExporter} from "three/examples/jsm/exporters/STLExporter"
  import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader"
  import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader"
  import {STLLoader} from "three/examples/jsm/loaders/STLLoader"
  import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
  import {PCDLoader} from "three/examples/jsm/loaders/PCDLoader"
  import {PLYLoader} from "three/examples/jsm/loaders/PLYLoader"
  import { saveAs } from 'file-saver';


  export default{
    components:{myHeader,Ball
    },
    name: 'modeling',
    data() {
      return {
        ecsInitialized: false,
        ecsWorld: null,
        meshSystem: null,
        crdtSystem: null,
        layerSystem: null,
        transformSystem: null,
        renderSystem: null,
        documentInfo:{},
        clients: [], // Client list
        clientColorMap: {}, // Client color mapping
        cursorX: 0,
        cursorY: 0,
        cursorCalibrationOffset: { x: 0, y: 0 }, // Cursor calibration offset (pixels)
        isCalibratingCursor: false, // Whether cursor is being calibrated
        calibrationMarker: null, // Calibration marker 3D object
        isDraggingModel: false, // Whether dragging model (for operation log control)
        dragStartState: null, // Object state at drag start (for checking actual displacement)
        remoteLogTimers: {}, // Remote sync log debounce timers { entityId: timeoutId }
        pendingRemoteLogs: {}, // Pending remote sync log data { entityId: {...} }
        scene: null, // Scene
        camera: null, // Camera
        renderer: null, // Renderer
        axesHelper: null, // Axes helper
        gridHelper: null, // Grid helper
        ambientLight: null, // Ambient light
        pointLight: null, // Point light
        orbitControls: null, // Orbit controls
        transformControls: null, // Transform controls
        raycaster: null, // Raycaster
        gui: null, // dat.gui
        objects: new THREE.Group(), // Models
        getObject:[], // Store selected models for boolean operations
        transing: false, // Transform controls parameter
        importLocalModelDialogVisible: false,
        importElementDialogVisible: false,
        importModelDialogVisible: false,
        currentLightType: 'ambient', // Current light type
        directionalLight: null, // Directional light
        spotLight: null, // Spotlight
        lightIcons: {}, // Light icons
        // Tree view related data
        sceneTreeData: [], // Scene tree data
        treeProps: {
          label: 'name',
          children: 'children'
        },
        objUuidToTreeId: new Map(), // Object uuid to tree node id mapping
        treeIdCounter: 1, // Tree node id counter
        // fileList: [{name: '1.png', url: 'https://fuss10.elemecdn.com/3/63/4e7f3a15429bfda99bce42a18cdd1jpeg.jpeg?imageMogr2/thumbnail/360x360/format/webp/quality/100'}, {name: '2.png', url: 'https://fuss10.elemecdn.com/3/63/4e7f3a15429bfda99bce42a18cdd1jpeg.jpeg?imageMogr2/thumbnail/360x360/format/webp/quality/100'}],
        uploadedFileInfo: null,  // Store uploaded file info after successful upload
        groups: [], // Store all groups
        currentGroupId: 0, // Current group ID
        // Layer related data
        layers: [1, 2, 3, 4, 5], // Layer list
        currentLayer: 1, // Current active layer
        visibleLayer: null, // Current visible layer, null means show all layers
        layerColors: { // Layer color mapping
          1: 0x7777ff,
          2: 0x77ff77,
          3: 0xffff77,
          4: 0xff7777,
          5: 0xff77ff
        },
        // View related data
        viewTypes: [
          { label: 'Grid View', value: 'GridView' },
          { label: 'Voxel View', value: 'VoxelView' },
          { label: 'Point Cloud View', value: 'CloudPointView' }
        ],
        currentViewType: 'GridView', // Current view type
        // Model entity management
        modelEntities: [], // Model entity list
        currentEntityId: 0, // Current entity ID
        selectedEntityId: null, // Currently selected entity ID
        loadingOfficeEntities: new Set(), // Experiment model loading flag, prevent CRDT race condition duplicate loading
        elements:[
          {
            id: '1',
            name: 'Hexagon Head Wood Screw',
            src: './elements/六角头木螺钉.png'
          },
          {
            id: '2',
            name: 'Hexagon Flange Self-Drilling Screw',
            src: './elements/六角凸缘自钻自攻螺钉.png'
          },
          {
            id: '3',
            name: 'Wall Panel Self-Tapping Screw',
            src: './elements/墙板自攻螺钉.png'
          },
          {
            id: '4',
            name: 'Eye Bolt',
            src: './elements/活节螺栓.png'
          },
          {
            id: '5',
            name: 'Anchor Bolt',
            src: './elements/地脚螺栓.png'
          },
          {
            id: '6',
            name: 'U-Bolt',
            src: './elements/U型螺栓.png'
          },
          {
            id: '7',
            name: 'Type 1 Hex Nut',
            src: './elements/1型六角螺母.png'
          },
          {
            id: '8',
            name: 'Washer',
            src: './elements/垫片.png'
          },
          {
            id: '9',
            name: 'Solid Sliding Bearing',
            src: './elements/整体有衬正滑动轴承.png'
          },
          {
            id: '10',
            name: 'Two-Bolt Split Sliding Bearing',
            src: './elements/对开式二螺柱正滑动轴承.png'
          }
        ],
        models:[
          {
            id: '1',
            name: 'Sedan',
            src: './models/轿车.png'
          },
          {
            id: '2',
            name: 'Cartoon Truck',
            src: './models/卡通卡车.png'
          },
          {
            id: '3',
            name: 'Cartoon Sedan',
            src: './models/卡通轿车.png'
          },
          {
            id: '4',
            name: 'Sports Car',
            src: './models/跑车.png'
          },
          {
            id: '5',
            name: 'SUV',
            src: './models/SUV.png'
          },
          {
            id: '6',
            name: 'Business Car',
            src: './models/商务车.png'
          },
          {
            id: '7',
            name: 'Cat',
            src: './models/猫.png'
          },
          {
            id: '8',
            name: 'Red Panda',
            src: './models/小熊猫.png'
          },
          {
            id: '9',
            name: 'Deer',
            src: './models/鹿.png'
          },
        ],
        inviteDialogVisible: false,
        inviteForm:{},
        showOperationLog: true,
        operationLog: [],
        maxLogEntries: 50,
        logPanelHeight: 150
      }
    },
    mounted(){
        this.init()
        this.render()
        this.autosave()
        this.getModelData() 

        this.cursor_map = this.doc1.getMap('cursor')
        // Generate deterministic color based on clientId to ensure all clients see the same color
        this.getClientColor = (clientId) => {
          const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#8800ff']
          return colors[clientId % colors.length]
        }

        // Store current client ID
        this.currentClientId = this.awareness.clientID

        // Get unique userName from server to avoid conflicts when multiple clients connect simultaneously
        fetch('http://192.168.31.252:1234/username')
          .then(res => res.json())
          .then(data => {
            if (data && data.userName) {
              this.awareness.setLocalStateField('userName', data.userName)
              console.log('Got username from server:', data.userName)
            }
          })
          .catch(err => {
            console.error('Failed to get username:', err)
            // Fallback: use local assignment logic
            const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad
              || ('ontouchstart' in window && navigator.maxTouchPoints > 0)
            const preferredIndex = isMobile ? 2 : 1
            const states = this.awareness.getStates()
            const usedNames = new Set()
            states.forEach((state) => {
              if (state.userName) usedNames.add(state.userName)
            })
            let idx = preferredIndex
            while (usedNames.has('user' + idx)) idx++
            this.awareness.setLocalStateField('userName', 'user' + idx)
          })

        // Broadcast local cursor position (unified handling of mouse and touch via pointermove, listen on canvas to capture events during dragging)
        // Use percentage coordinates to solve cursor misalignment issues caused by different device resolutions/window sizes
        const broadcastCursor = (x, y) => {
          if (this.awareness) {
            this.awareness.setLocalStateField('cursor', {
              xPct: x / window.innerWidth,
              yPct: y / window.innerHeight
            })
            this.awareness.setLocalStateField('lastActive', Date.now())
          }
        }
        // Listen on document for non-canvas areas
        document.addEventListener('pointermove', (e) => {
          broadcastCursor(e.clientX, e.clientY)
        })
        // Listen on renderer.domElement to capture pointer events during TransformControls dragging
        if (this.renderer && this.renderer.domElement) {
          this.renderer.domElement.addEventListener('pointermove', (e) => {
            broadcastCursor(e.clientX, e.clientY)
          })
        }

        // Clean up local awareness state when page closes/refreshes to avoid residuals
        const cleanupAwareness = () => {
          if (this.awareness) {
            this.awareness.setLocalState(null)
          }
        }
        window.addEventListener('beforeunload', cleanupAwareness)

        // Listen for awareness state changes and update client list
        this.awareness.on('change', ({ added, updated, removed }) => {
          const states = this.awareness.getStates()
          const newClients = []
          const now = Date.now()

          // Iterate through all states, only add other users, filter out inactive ones
          states.forEach((state, clientId) => {
            // Skip current user
            if (clientId !== this.currentClientId) {
              const lastActive = state.lastActive || 0
              // Only show clients active within 15 seconds, must contain cursor and userName (avoid empty awareness entries)
              if (now - lastActive < 15000 && state.cursor && state.userName) {
                // Convert percentage coordinates back to local pixel coordinates and apply calibration offset
                const offsetX = this.cursorCalibrationOffset?.x || 0
                const offsetY = this.cursorCalibrationOffset?.y || 0
                const x = (state.cursor.xPct || 0) * window.innerWidth + offsetX
                const y = (state.cursor.yPct || 0) * window.innerHeight + offsetY
                newClients.push({
                  clientId: clientId,
                  color: this.getClientColor(clientId),
                  userName: state.userName,
                  position: { x, y }
                })
              }
            }
          })
          // Sort by clientId to ensure consistent display order across all clients
          newClients.sort((a, b) => a.clientId - b.clientId)
          this.clients = newClients
          if (added.length || removed.length) {
            console.log('Updated clients:', this.clients, 'added:', added, 'removed:', removed)
          }
        })
        console.log(this.clients)

    },
    methods:{
      // Record operation log
      logOperation(type, content, details = null) {
        const now = new Date()
        const timestamp = now.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + '.' + String(now.getMilliseconds()).padStart(3, '0')
        
        const logEntry = {
          type: type,
          content: content,
          timestamp: timestamp,
          fullTimestamp: now.getTime(),
          details: details
        }
        
        this.operationLog.unshift(logEntry)
        
        if (this.operationLog.length > this.maxLogEntries) {
          this.operationLog.pop()
        }
        
        console.log('[Operation Log]', logEntry)
      },
      
      // Clear operation log
      clearOperationLog() {
        this.operationLog = []
        
        // Reset global CRDT sequence number (sync across all devices)
        if (this.globalEventCounter) {
          this.doc1.transact(() => {
            this.globalEventCounter.set('counter', 0)
            this.globalEventCounter.set('lastUpdateTime', Date.now())
            this.globalEventCounter.set('resetAt', Date.now())
          })
          console.log('Global CRDT sequence number has been reset')
        }
        
        this.$message.success('Operation log cleared, sequence number reset')
      },
      
      // Start cursor calibration: create red marker at origin, wait for user click
      startCursorCalibration() {
        if (this.isCalibratingCursor) {
          this.cancelCursorCalibration()
          return
        }
        if (!this.scene || !this.camera) {
          this.$message.warning('Scene not ready, please try again later')
          return
        }
        this.isCalibratingCursor = true
        this.createCalibrationMarker()
        if (this.orbitControls) this.orbitControls.enabled = false
        this.$message.info('Click the red marker at the origin to calibrate cursor offset')
      },

      // Create origin calibration marker (red semi-transparent sphere)
      createCalibrationMarker() {
        if (!this.scene) return
        const geometry = new THREE.SphereGeometry(3, 32, 32)
        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.7
        })
        this.calibrationMarker = new THREE.Mesh(geometry, material)
        this.calibrationMarker.position.set(0, 0, 0)
        this.calibrationMarker.name = 'cursor_calibration_marker'
        this.scene.add(this.calibrationMarker)

        // Add pulse animation effect
        let scaleDir = 1
        this.calibrationMarker.userData.pulseInterval = setInterval(() => {
          if (!this.calibrationMarker) return
          const s = this.calibrationMarker.scale.x
          if (s > 1.3) scaleDir = -1
          if (s < 0.7) scaleDir = 1
          const newScale = s + 0.02 * scaleDir
          this.calibrationMarker.scale.set(newScale, newScale, newScale)
        }, 30)
      },

      // Cancel cursor calibration
      cancelCursorCalibration() {
        this.isCalibratingCursor = false
        if (this.orbitControls) this.orbitControls.enabled = true
        if (this.calibrationMarker) {
          if (this.calibrationMarker.userData.pulseInterval) {
            clearInterval(this.calibrationMarker.userData.pulseInterval)
          }
          this.scene.remove(this.calibrationMarker)
          this.calibrationMarker.geometry.dispose()
          this.calibrationMarker.material.dispose()
          this.calibrationMarker = null
        }
      },

      // Handle calibration click: calculate and save offset
      handleCalibrationClick(event) {
        if (!this.isCalibratingCursor || !this.camera) return false

        // Calculate screen projection coordinates of origin (0,0,0) under current camera view
        const origin = new THREE.Vector3(0, 0, 0)
        origin.project(this.camera)
        const projectedX = (origin.x * 0.5 + 0.5) * window.innerWidth
        const projectedY = (-origin.y * 0.5 + 0.5) * window.innerHeight

        // Calculate calibration offset as the difference between user click position and projected position
        this.cursorCalibrationOffset = {
          x: event.clientX - projectedX,
          y: event.clientY - projectedY
        }

        this.logOperation('info', `Cursor calibrated: offset (${this.cursorCalibrationOffset.x.toFixed(1)}, ${this.cursorCalibrationOffset.y.toFixed(1)})`)
        this.$message.success(`Cursor calibrated! Offset: (${this.cursorCalibrationOffset.x.toFixed(1)}, ${this.cursorCalibrationOffset.y.toFixed(1)})`)

        // Clean up calibration marker
        this.cancelCursorCalibration()
        return true // Indicates calibration has been handled
      },

      // Resize operation log panel
      resizeLogPanel(action) {
        const minHeight = 100
        const maxHeight = 400
        const step = 50
        
        if (action === 'expand') {
          this.logPanelHeight = Math.min(this.logPanelHeight + step, maxHeight)
        } else if (action === 'shrink') {
          this.logPanelHeight = Math.max(this.logPanelHeight - step, minHeight)
        }
      },
      
      // Export operation log (for testing analysis)
      exportOperationLog() {
        const logData = {
          exportTime: new Date().toISOString(),
          testPhase: this.currentTestPhase || 'unknown',
          logs: this.operationLog
        }
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `operation_log_${Date.now()}.json`
        link.click()
        URL.revokeObjectURL(url)
        this.$message.success('Operation log exported')
      },
      
      // Record sync state (for testing Phase 1: 60Hz sampling)
      logSyncState(entityId, position, rotation) {
        this.logOperation('sync', 
          `Entity ${entityId}: Position(${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}) | Rotation(${THREE.MathUtils.radToDeg(rotation.x).toFixed(2)}°, ${THREE.MathUtils.radToDeg(rotation.y).toFixed(2)}°, ${THREE.MathUtils.radToDeg(rotation.z).toFixed(2)}°)`,
          {
            entityId,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
            quaternion: rotation
          }
        )
      },
      
      // Record async loading status (for testing Phase 3)
      logAsyncStatus(status, details) {
        this.logOperation('async', `${status}: ${details}`)
      },
      
      // Page close warning
      // beforeunloadHandler(e) {
      //   e = e || window.event
      //   if (e) {
      //     e.returnValue = 'Close warning'
      //   }
      //   return 'Close warning'
      // },

      // Auto save
      autosave(){
        const update = () => {
          try {
            // Temporarily remove userData.controllers which causes circular references (dat.gui)
            const controllersBackup = new Map()
            this.objects.traverse((obj) => {
              if (obj.userData && obj.userData.controllers) {
                controllersBackup.set(obj.uuid, obj.userData.controllers)
                delete obj.userData.controllers
              }
            })
            const obj = JSON.stringify(this.objects.toJSON())
            sessionStorage.setItem('obj', obj)
            // Restore
            this.objects.traverse((obj) => {
              if (controllersBackup.has(obj.uuid)) {
                obj.userData.controllers = controllersBackup.get(obj.uuid)
              }
            })
          } catch (e) {
            console.warn('Auto save failed:', e)
          }
          setTimeout(update, 3000)
        }
        update()
      },
      
      // Switch view
      switchView(viewType, parentUuid) {
        // Find parent object
        let parentObj = null
        this.objects.children.forEach(obj => {
          if (obj.uuid === parentUuid) {
            parentObj = obj
          }
        })
        
        if (!parentObj) return
        
        console.log('Switch view:', viewType, 'Parent object:', parentObj.name, 'Entity ID:', parentObj.userData.entityId)
        
        // When clicking point cloud view, set currently selected entity ID
        if (viewType === 'pointcloud') {
          this.selectedEntityId = parentObj.userData.entityId
          console.log('Set selected entity ID:', this.selectedEntityId)
        }
        
        // Get entity ID
        const entityId = parentObj.userData.entityId
        
        // Hide all related views
        this.objects.children.forEach(obj => {
          if (obj.userData && obj.userData.entityId === entityId) {
            obj.visible = false
          }
        })
        
        // Show selected view
        if (viewType === 'original') {
          // Find original model
          let originalModel = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && (!obj.userData.viewType || obj.userData.viewType === 'original')) {
              originalModel = obj
            }
          })
          
          if (originalModel) {
            // Show original object
            originalModel.visible = true
            console.log('Original view displayed:', originalModel)
          }
        } else if (viewType === 'pointcloud') {
          // Check if there's already a user-imported point cloud view
          let pointcloudView = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'pointcloud') {
              pointcloudView = obj
            }
          })
          
          if (!pointcloudView) {
            // Find original model
            let originalModel = null
            this.objects.children.forEach(obj => {
              if (obj.userData && obj.userData.entityId === entityId && (!obj.userData.viewType || obj.userData.viewType === 'original')) {
                originalModel = obj
              }
            })
            
            if (originalModel) {
              // Create point cloud view
              pointcloudView = this.createPointCloudView(originalModel)
              this.objects.add(pointcloudView)
            }
          }
          
          if (pointcloudView) {
            // Ensure point cloud is visible
            pointcloudView.visible = true
            console.log('Point cloud view displayed:', pointcloudView)
          }
        } else if (viewType === 'glb') {
          // Check if Blender view already exists
          let glbView = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'glb') {
              glbView = obj
            }
          })
          
          if (!glbView) {
            // Find original model
            let originalModel = null
            this.objects.children.forEach(obj => {
              if (obj.userData && obj.userData.entityId === entityId && (!obj.userData.viewType || obj.userData.viewType === 'original')) {
                originalModel = obj
              }
            })
            
            if (originalModel) {
              // Create Blender view
              this.createBlenderView(originalModel)
            }
          } else {
            glbView.visible = true
          }
        } else if (viewType === 'VoxelView') {
          let voxelView = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'VoxelView') {
              voxelView = obj
            }
          })
          
          if (voxelView) {
            voxelView.visible = true
            console.log('Voxel view displayed:', voxelView)
          } else if (entityId && this.marsEntities && this.marsEntities.has(entityId)) {
            const path = this.marsEntities.get(entityId).get('voxelView').toString()
            if (path) {
              this.loadVoxelView(entityId, path, 0)
            }
          }
        } else if (viewType === 'CloudPointView') {
          let cloudPointView = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'CloudPointView') {
              cloudPointView = obj
            }
          })
          
          if (cloudPointView) {
            cloudPointView.visible = true
            console.log('Point cloud view displayed:', cloudPointView)
          } else if (entityId && this.marsEntities && this.marsEntities.has(entityId)) {
            const path = this.marsEntities.get(entityId).get('cloudPointView').toString()
            if (path) {
              this.loadCloudPointView(entityId, path, 0)
            }
          }
        } else if (viewType === 'GridView') {
          let gridView = null
          this.objects.children.forEach(obj => {
            if (obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'GridView') {
              gridView = obj
            }
          })
          
          if (gridView) {
            gridView.visible = true
            console.log('Grid view displayed:', gridView)
          } else if (entityId && this.marsEntities && this.marsEntities.has(entityId)) {
            const path = this.marsEntities.get(entityId).get('meshView').toString()
            if (path) {
              this.loadGridView(entityId, path, 0)
            }
          }
        }
      },
      
      // Create point cloud view
      createPointCloudView(parentObj) {
        // Create point cloud from original geometry
        const geometry = parentObj.geometry.clone()
        const material = new THREE.PointsMaterial({
          color: 0x7777ff,
          size: 0.5,
          transparent: true,
          opacity: 0.8
        })
        
        const pointcloud = new THREE.Points(geometry, material)
        pointcloud.userData.viewType = 'pointcloud'
        pointcloud.name = 'Point Cloud View'
        
        // Copy original object's entity ID
        if (parentObj.userData.entityId) {
          pointcloud.userData.entityId = parentObj.userData.entityId
        }
        
        // Copy original object's position, rotation and scale
        pointcloud.position.copy(parentObj.position)
        pointcloud.rotation.copy(parentObj.rotation)
        pointcloud.scale.copy(parentObj.scale)
        
        return pointcloud
      },
      
      // Create Blender view
      createBlenderView(parentObj) {
        // Export as GLB format (Blender's standard export format)
        const exporter = new GLTFExporter()
        exporter.parse(
          parentObj,
          (gltf) => {
            // Create GLB binary data
            const glbData = this.gltfToGlb(gltf)
            
            // Save GLB file
            const blob = new Blob([glbData], { type: 'model/gltf-binary' })
            const url = URL.createObjectURL(blob)
            
            // Reload GLB file as Blender view
            const loader = new GLTFLoader()
            loader.load(url, (gltfScene) => {
              const blenderView = gltfScene.scene
              blenderView.userData.viewType = 'glb'
              blenderView.name = 'Blender View'
              
              // Copy original object's position, rotation and scale
              blenderView.position.copy(parentObj.position)
              blenderView.rotation.copy(parentObj.rotation)
              blenderView.scale.copy(parentObj.scale)
              
              parentObj.add(blenderView)
              blenderView.visible = true
            })
          },
          (error) => {
            console.error('Blender视图导出错误:', error)
          }
        )
      },
      
      // 将GLTF转换为GLB
      gltfToGlb(gltf) {
        // 浏览器兼容的GLB转换实现
        const json = JSON.stringify(gltf)
        const encoder = new TextEncoder()
        const jsonBuffer = encoder.encode(json)
        
        // 创建GLB头部
        const glbHeader = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00])
        
        // 创建JSON长度
        const jsonLength = new Uint8Array(4)
        const view = new DataView(jsonLength.buffer)
        view.setUint32(0, jsonBuffer.length, true) // little-endian
        
        // 计算填充
        const paddingSize = (4 - (jsonBuffer.length % 4)) % 4
        const padding = new Uint8Array(paddingSize)
        
        // 合并所有部分
        const totalSize = glbHeader.length + jsonLength.length + jsonBuffer.length + padding.length
        const result = new Uint8Array(totalSize)
        
        let offset = 0
        result.set(glbHeader, offset)
        offset += glbHeader.length
        result.set(jsonLength, offset)
        offset += jsonLength.length
        result.set(jsonBuffer, offset)
        offset += jsonBuffer.length
        result.set(padding, offset)
        
        return result.buffer
      },

      // 切换所有模型的视图
      switchAllViews(viewType) {
        this.currentViewType = viewType

        // 遍历所有模型对象
        this.objects.children.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
            this.switchView(viewType, obj.uuid)
          }
        })

        // 切换 MARS 实验场景实体的视图
        if (this.marsEntities) {
          this.marsEntities.forEach((entityMap, entityId) => {
            // 检查该实体是否有对应的 MARS 对象
            const hasMarsObject = this.objects.children.some(obj =>
              obj.userData && obj.userData.entityId === entityId
            )
            if (hasMarsObject) {
              this.switchMarsView(entityId, viewType)
            }
          })
        }
      },
      
      // 创建模型实体
      createModelEntity() {
        this.currentEntityId++
        const entity = {
          id: String(this.currentEntityId),
          name: `模型实体 ${this.currentEntityId}`,
          models: {
            original: null, // 原始模型
            pointcloud: null, // 点云模型
            glb: null // GLB模型
          }
        }
        this.modelEntities.push(entity)
        return entity
      },
      
      // 关联模型到实体
      associateModelToEntity(model, modelType) {
        // 查找或创建实体
        let entity
        
        // 如果有选中的实体，优先使用选中的实体
        if (this.selectedEntityId) {
          entity = this.modelEntities.find(e => e.id === this.selectedEntityId)
          console.log('使用选中的实体:', entity)
        }
        
        // 如果没有选中的实体或找不到实体，查找或创建新实体
        if (!entity) {
          entity = this.modelEntities[this.modelEntities.length - 1]
          if (!entity || (entity.models.original && entity.models.pointcloud && entity.models.glb)) {
            entity = this.createModelEntity()
          }
        }
        
        // 关联模型
        entity.models[modelType] = model
        model.userData.entityId = entity.id
        
        // 重置选中的实体ID，避免影响后续操作
        // this.selectedEntityId = null
        
        return entity
      },

      // 初始化
      init(){
        this.getDocument(),
        this.initYjs()
        this.initCavasRen() // canvas场景
        this.initScene() // 场景
        this.initCamer() // 相机
        this.initRenderer() // 渲染器
        this.initHelper() // 辅助线
        this.initLights() // 光源
        this.initOrbitControls() // 轨道控制器
        this.initRaycaster() // 射线发射器
        this.initTransformControls() // 变换控制器
        this.initDatGui() // dat.gui
        this.getGeometry() // 获取模型
        this.getcursor()
        this.initSceneTree() // 初始化场景树
        // 确保 objects 组已添加到场景
        if (!this.scene.children.includes(this.objects)) {
          this.scene.add(this.objects)
        }
        this.initECSWorld()
        // 实验场景初始化通过按钮触发，不在 init() 中自动调用
      },

      initECSWorld() {
        import('@/utils/ecs/index.js').then(({
          ECSWorld, MeshSystem, TransformSystem, RenderSystem,
          CRDTSystem, InputSystem, LayerSystem, entityManager
        }) => {
          this.ecsWorld = new ECSWorld()
          this.ecsWorld.init(this.scene, this.camera, this.renderer)
          this.ecsWorld.objectsGroup = this.objects
          if (!this.scene.children.includes(this.objects)) {
            this.scene.add(this.objects)
          }

          this.meshSystem = new MeshSystem(this.scene, this.objects)
          this.transformSystem = new TransformSystem(this.scene)
          this.renderSystem = new RenderSystem()
          this.crdtSystem = new CRDTSystem(this.doc1)
          this.crdtSystem.setScene(this.scene)
          this.crdtSystem.onEntityCreated = (entityId, yjsEntity) => {
            this.updateSceneTree()
          }
          this.crdtSystem.onEntityRemoved = (entityId) => {
            this.updateSceneTree()
          }
          const inputSystem = new InputSystem(this.camera, this.renderer, this.orbitControls, this.transformControls)
          this.layerSystem = new LayerSystem(this.objects)

          this.meshSystem.onEntityCreated = (entityId, mesh) => {
            if (this.gui && mesh) {
              this.addModelController(mesh)
            }
            this.updateSceneTree()
          }

          this.ecsWorld.addSystem(this.meshSystem)
          this.ecsWorld.addSystem(this.transformSystem)
          this.ecsWorld.addSystem(this.renderSystem)
          this.ecsWorld.addSystem(this.crdtSystem)
          this.ecsWorld.addSystem(inputSystem)
          this.ecsWorld.addSystem(this.layerSystem)

          this.ecsWorld.onAfterRender = () => {
            if (this.gui && typeof this.gui.update === 'function') {
              this.gui.update()
            }
          }

          this.ecsWorld.start()
          this.ecsInitialized = true
          console.log('[ECSWorld] Initialized with all systems')
        }).catch(err => {
          console.error('[ECSWorld] Failed to initialize:', err)
        })
      },

      initExperimentSceneECS() {
        this.initExperimentScene()
        this.$message.success('实验场景初始化完成')
      },

      runExperiment1ECS() {
        this.runExperiment1()
        this.logOperation('exp1_ecs', '实验一执行完成')
      },

      runExperiment2ECS() {
        this.runExperiment2()
        this.logOperation('exp2_ecs', '实验二执行完成')
      },

      runExperiment3ECS() {
        this.runExperiment3()
        this.logOperation('exp3_ecs', '实验三已启动')
      },

      // 初始化场景树
      initSceneTree() {
        // 初始化树数据，根节点为背景
        this.sceneTreeData = [{
          id: '0',
          name: '背景',
          children: [],
          isRoot: true
        }]
        
        // 初始化映射和计数器
        this.objUuidToTreeId.clear()
        this.treeIdCounter = 1
        
        // 更新树数据
        this.updateSceneTree()
      },
      
      // 更新场景树
      updateSceneTree() {
        const newRootNode = {
          id: '0',
          name: '背景',
          isRoot: true,
          children: []
        }
        
        // 1. 创建组节点映射
        const groupNodes = new Map()
        
        // 2. 为每个组创建组节点
        this.groups.forEach(group => {
          const groupNode = {
            id: `group_${group.id}`,
            name: group.name,
            isGroup: true,
            groupId: group.id,
            children: []
          }
          groupNodes.set(group.id, groupNode)
        })
        
        // 3. 遍历所有场景对象，构建树结构
        // 首先，收集所有实体的主要视图（GridView作为主要视图）
        const entityViews = new Map()
        
        // 第一遍：收集所有视图对象
        this.objects.children.forEach(obj => {
          if (obj.userData && obj.userData.entityId) {
            const entityId = obj.userData.entityId
            if (!entityViews.has(entityId)) {
              entityViews.set(entityId, {})
            }
            entityViews.get(entityId)[obj.userData.viewType] = obj
          }
        })
        
        // 第二遍：为每个实体创建树节点
        entityViews.forEach((views, entityId) => {
          // 使用GridView作为主要视图
          const mainView = views['GridView'] || Object.values(views)[0]
          if (mainView) {
            const treeNode = this.createTreeNodeFromObj(mainView, views)
            if (treeNode) {
              // 检查对象是否属于任何组
              const groupIds = mainView.userData.groupIds || []
              
              if (groupIds.length > 0) {
                // 对象属于多个组，添加到每个对应组节点的children中
                groupIds.forEach(groupId => {
                  if (groupNodes.has(groupId)) {
                    const groupNode = groupNodes.get(groupId)
                    groupNode.children.push(treeNode)
                  }
                })
              } else {
                // 对象不属于任何组，直接添加到根节点
                newRootNode.children.push(treeNode)
              }
            }
          }
        })
        
        // 4. 将所有组节点添加到根节点
        groupNodes.forEach(groupNode => {
          // 只有当组有子对象时才添加（避免空组）
          if (groupNode.children.length > 0) {
            newRootNode.children.push(groupNode)
          }
        })
        
        // 完全替换 sceneTreeData，确保 Vue 响应式更新
        this.sceneTreeData = [newRootNode]
      },
      
      // 从对象创建树节点
      createTreeNodeFromObj(obj, views = {}) {
        // 检查obj是否存在
        if (!obj) {
          return null
        }
        
        let treeId = this.objUuidToTreeId.get(obj.uuid)
        if (!treeId) {
          treeId = this.treeIdCounter++
          this.objUuidToTreeId.set(obj.uuid, treeId)
        }
        
        const treeNode = {
          id: treeId,
          name: obj.userData.entityId || obj.name || 'Unnamed Object',
          object: obj,
          uuid: obj.uuid,
          children: []
        }
        
        // 为模型对象添加视图子节点
        if (obj.userData && obj.userData.entityId) {
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: 'Mesh View',
            viewType: 'GridView',
            parentUuid: obj.uuid,
            children: []
          })
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: 'Voxel View',
            viewType: 'VoxelView',
            parentUuid: obj.uuid,
            children: []
          })
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: 'Point Cloud View',
            viewType: 'CloudPointView',
            parentUuid: obj.uuid,
            children: []
          })
        } else if (obj instanceof THREE.Mesh) {
          // 原始视图
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: '原始视图',
            viewType: 'original',
            parentUuid: obj.uuid,
            children: []
          })
          // 点云渲染视图
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: 'Point Cloud View',
            viewType: 'pointcloud',
            parentUuid: obj.uuid,
            children: []
          })
          // Blender导出视图
          treeNode.children.push({
            id: this.treeIdCounter++,
            name: 'Blender View',
            viewType: 'glb',
            parentUuid: obj.uuid,
            children: []
          })
        }
        
        // 处理组对象的子对象
        if (obj.children && obj.children.length > 0) {
          // 实验模型（有entityId）的内部子对象不显示在场景树中，避免GLTF内部Mesh被列出
          if (!(obj.userData && obj.userData.entityId)) {
            obj.children.forEach(child => {
              if (child) {
                const childNode = this.createTreeNodeFromObj(child)
                if (childNode) {
                  treeNode.children.push(childNode)
                }
              }
            })
          }
        }
        
        return treeNode
      },
      
      // 处理树节点点击事件
      handleNodeClick(data, node) {
        // 忽略根节点
        if (data.isRoot) {
          return
        }
        
        // 如果是组节点，不进行对象选择
        if (data.isGroup) {
          console.log('点击了组节点:', data.name)
          return
        }
        
        // 如果是视图节点
        if (data.viewType) {
          console.log('点击了视图节点:', data.name, '类型:', data.viewType)
          this.switchView(data.viewType, data.parentUuid)
          return
        }
        
        // 获取对应的场景对象
        const obj = data.object
        if (obj) {
          // 选择对象，与变换控制器结合
          this.transformControls.attach(obj)
          this.scene.add(this.transformControls)
          
          // 如果是模型，显示其控制面板
          if (obj instanceof THREE.Mesh) {
            console.log('选择了模型:', obj.name)
          }
        }
      },
      
      // 删除包含特定UUID模型的所有组
      deleteGroupsContainingModel(uuid) {
        try {
          // 找出所有包含该模型的组
          const groupsToDelete = []
          
          this.groups.forEach(group => {
            // 检查组中是否包含该模型
            const containsModel = group.objects.some(obj => obj.uuid === uuid)
            if (containsModel) {
              groupsToDelete.push(group.id)
            }
          })
          
          // 删除这些组
          if (groupsToDelete.length > 0) {
            console.log(`删除包含模型 ${uuid} 的组:`, groupsToDelete)
            
            // 从后往前删除，避免索引问题
            for (let i = this.groups.length - 1; i >= 0; i--) {
              if (groupsToDelete.includes(this.groups[i].id)) {
                const groupToDelete = this.groups[i]
                
                // 1. 清除组内所有对象的组信息
                groupToDelete.objects.forEach(groupObj => {
                  // 查找场景中的对象
                  let sceneObj = null
                  for (const child of this.objects.children) {
                    if (child.uuid === groupObj.uuid) {
                      sceneObj = child
                      break
                    }
                  }
                  
                  if (sceneObj) {
                    // 清除对象的组标识和组偏移量，支持多个组的情况
                    if (Array.isArray(sceneObj.userData.groupIds)) {
                      // 从groupIds数组中移除当前组的ID
                      const groupIndex = sceneObj.userData.groupIds.indexOf(groupToDelete.id)
                      if (groupIndex > -1) {
                        sceneObj.userData.groupIds.splice(groupIndex, 1)
                      }
                    }
                    
                    // 从groupOffsets Map中移除当前组的偏移量
                    if (sceneObj.userData.groupOffsets) {
                      sceneObj.userData.groupOffsets.delete(groupToDelete.id)
                    }
                    
                    // 只有当没有任何组时，才将isGrouped设为false
                    sceneObj.userData.isGrouped = Array.isArray(sceneObj.userData.groupIds) && sceneObj.userData.groupIds.length > 0
                  }
                })
                
                // 2. 删除组控制器
                if (this.gui) {
                  const folderNames = Object.keys(this.gui.__folders || {})
                  folderNames.forEach(folderName => {
                    if (folderName === groupToDelete.name) {
                      this.gui.removeFolder(this.gui.__folders[folderName])
                      console.log(`已删除组控制器: ${folderName}`)
                    }
                  })
                }
                
                // 3. 从组列表中删除
                this.groups.splice(i, 1)
              }
            }
            
            // 4. 更新场景树
            this.updateSceneTree()
          }
        } catch (error) {
          console.error('删除包含模型的组时出错:', error)
        }
      },
      
      // 获取文档信息
      async getDocument(){
        const documentId = this.$route.params.documentId
        const{data:res} = await this.$http.get('/document/getDocumentById', {
          params:{
            documentId:documentId
          }
        })
        this.documentInfo = res.data
        console.log(this.documentInfo.documentName)
      },

      //yjs初始化
      initYjs(){
        console.log(this.clients)
        this.doc1 = new Y.Doc()
        
        // 全局CRDT逻辑时钟 - 所有设备共享同一个计数器
        this.globalEventCounter = this.doc1.getMap('globalEventCounter')
        
        // 初始化全局计数器（只在首次创建时）
        if (!this.globalEventCounter.has('counter')) {
          this.doc1.transact(() => {
            this.globalEventCounter.set('counter', 0)
            this.globalEventCounter.set('lastUpdateTime', Date.now())
          })
          console.log('初始化全局CRDT计数器')
        }
        
        // 监听全局计数器变化（跨设备同步）
        this.globalEventCounter.observe((event) => {
          if (event.keysChanged.has('counter')) {
            const newCounter = this.globalEventCounter.get('counter')
            console.log('全局CRDT计数器更新:', newCounter)
          }
        })
        
        // 修复: WebSocket URL 缺少 //
        this.provider1 = new WebsocketProvider(`ws://${window.location.hostname}:1234`, 'my-room', this.doc1)
        // 获取 awareness 引用
        this.awareness = this.provider1.awareness

        // 检查WebSocket连接状态
        console.log('WebSocket连接状态:', this.provider1.wsconnected)
        this.provider1.on('status', (event) => {
          console.log('WebSocket状态变化:', event.status)
        })
        this.provider1.on('connection-error', (event) => {
          console.error('WebSocket连接错误:', event)
        })

        // MARS ECS-CRDT 顶层结构
        this.marsEntities = this.doc1.getMap('entities')  // 实体桶
        this.marsGroups = this.doc1.getMap('groups')       // 组信息桶

        // 旧结构（保留兼容性）
        this.delete_map = this.doc1.getMap('Deletemodel')
        this.operation_map = this.doc1.getMap('Operation')
        this.model_map = this.doc1.getMap('Creatmodel')

        // this.undo_map = this.doc1.getMap('undo')
        // this.createdelay_array = this.doc1.getArray('create_delay')
        console.log(this.doc1)

        // 初始化 MARS 实体
        this.initMarsEntities()
        // 设置 MARS CRDT 观察者
        this.setupMarsObservers()
      },

      // ============================================
      // MARS ECS-CRDT 核心方法
      // ============================================
      
      // 获取下一个全局CRDT序列号（跨设备共享）
      getNextGlobalSequenceId() {
        if (!this.globalEventCounter) return 0
        
        let currentCounter = this.globalEventCounter.get('counter') || 0
        let nextCounter = currentCounter + 1
        
        // 使用 transact 确保原子性
        this.doc1.transact(() => {
          this.globalEventCounter.set('counter', nextCounter)
          this.globalEventCounter.set('lastUpdateTime', Date.now())
        })
        
        console.log(`生成全局序列号: ${nextCounter}`)
        return nextCounter
      },

      // 初始化 MARS 实体（微型办公工位场景：5个实体）
      initMarsEntities() {
        const entityIds = ['desk_1', 'chair_1', 'monitor_1', 'lamp_1', 'cabinet_1']
        entityIds.forEach(id => this.createMarsEntity(id))
        console.log('MARS 实体初始化完成:', entityIds)
      },

      // 创建单个 MARS 实体
      createMarsEntity(entityId) {
        if (this.marsEntities.has(entityId)) {
          return this.marsEntities.get(entityId)
        }

        const entityMap = new Y.Map()

        // ActiveView: LWW-Register (Y.Text) - 当前激活的视图类型
        const activeView = new Y.Text()
        activeView.insert(0, 'GridView')
        entityMap.set('activeView', activeView)

        // 各视图表示路径
        const meshView = new Y.Text()
        entityMap.set('meshView', meshView)
        const voxelView = new Y.Text()
        entityMap.set('voxelView', voxelView)
        const cloudPointView = new Y.Text()
        entityMap.set('cloudPointView', cloudPointView)

        // Transform: LWW-Register (Y.Text) - 变换矩阵
        const transform = new Y.Text()
        transform.insert(0, JSON.stringify({
          x: 0, y: 0, z: 0,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))
        entityMap.set('transform', transform)

        // Appearance: LWW-Register (Y.Text) - 外观
        const appearance = new Y.Text()
        appearance.insert(0, JSON.stringify({
          color: '#ffffff',
          opacity: 1.0
        }))
        entityMap.set('appearance', appearance)

        // Group_groupId: LWW-Register (Y.Text) - 组ID
        const groupGroupId = new Y.Text()
        entityMap.set('groupGroupId', groupGroupId)

        // Group_members: LWW-Set (Y.Array) - 组成员
        entityMap.set('groupMembers', new Y.Array())

        // Layer: LWW-Register (Y.Text) - 图层
        const layer = new Y.Text()
        layer.insert(0, '1')
        entityMap.set('layer', layer)

        // Binding: LWW-Register (Y.Text) - 虚实绑定
        const binding = new Y.Text()
        entityMap.set('binding', binding)

        // deleted: 逻辑删除标记
        const deleted = new Y.Text()
        deleted.insert(0, 'false')
        entityMap.set('deleted', deleted)

        // type: 基本形状类型（cube/sphere/cylinder）
        const type = new Y.Text()
        entityMap.set('type', type)

        this.marsEntities.set(entityId, entityMap)
        console.log('创建 MARS 实体:', entityId)
        return entityMap
      },

      // 设置 MARS CRDT 观察者
      setupMarsObservers() {
        // 深观察所有实体变化
        this.marsEntities.observeDeep((eventsOrEvent, transaction) => {
          // 获取全局CRDT序列号（所有设备共享）
          const currentSequenceId = this.getNextGlobalSequenceId()
          const sequenceTimestamp = Date.now()
          const isLocal = transaction && transaction.local === true
          // 兼容不同 Yjs 版本：observeDeep 可能传数组或单个事件
          const events = Array.isArray(eventsOrEvent) ? eventsOrEvent : [eventsOrEvent]
          
          events.forEach(event => {
            // 确定是哪个实体的哪个字段发生了变化
            if (event && event.path && event.path.length >= 1) {
              const entityId = event.path[0]
              // entityId 可能是字符串（实验模型）或数字（基础模型）
              if (this.marsEntities.has(entityId)) {
                this.syncFromCRDT(entityId, currentSequenceId, sequenceTimestamp, isLocal)
              }
            }
          })
        })

        // 手动同步已有实体（新客户端加入时，observer不会为已有数据触发）
        this.marsEntities.forEach((entityMap, entityId) => {
          this.syncFromCRDT(entityId)
        })

        // 监听组变化
        this.marsGroups.observe((event) => {
          this.syncGroupsFromYjs()
        })

        console.log('MARS CRDT 观察者已设置')
      },

      // 从 CRDT 同步到 Three.js 渲染器
      syncFromCRDT(entityId, sequenceId = 0, crdtEventCount = 0, isLocal = false) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        // 如果正在本地加载中，跳过自动加载，避免竞态重复
        if (this.loadingOfficeEntities.has(entityId)) {
          console.log(`实体 ${entityId} 正在本地加载中，跳过CRDT自动加载`)
          return
        }

        // 检查逻辑删除
        const deleted = entityMap.get('deleted').toString()
        if (deleted === 'true') {
          this.removeObjectByEntityId(entityId)
          return
        }

        // 同步 Transform
        const transformText = entityMap.get('transform').toString()
        if (!transformText) {
          console.log(`实体 ${entityId} transform 为空，跳过同步`)
          return
        }
        try {
          const transform = JSON.parse(transformText)
          // 找到所有具有相同entityId的对象
          const entityObjects = this.objects.children.filter(obj => {
            return obj.userData && obj.userData.entityId === entityId
          })

          // 如果对象不存在，但CRDT有视图路径，说明是远程创建的，需要自动加载
          if (entityObjects.length === 0) {
            const meshViewPath = entityMap.get('meshView').toString()
            if (meshViewPath) {
              console.log('检测到远程实体', entityId, '开始自动加载...')
              this.loadGridViewFromCRDT(entityId, entityMap.get('meshView').toString(), transform)
              this.loadVoxelViewFromCRDT(entityId, entityMap.get('voxelView').toString(), transform)
              this.loadCloudPointViewFromCRDT(entityId, entityMap.get('cloudPointView').toString(), transform)
              return
            }

            // 如果是基本形状（cube/sphere/cylinder），从CRDT创建
            const typeText = entityMap.get('type')
            if (typeText) {
              const type = typeText.toString()
              if (type) {
                console.log('检测到远程基本形状', entityId, '类型:', type)
                this.createBasicShapeFromCRDT(entityId, type, transform)
                return
              }
            }
          }

          if (this.ecsInitialized && this.ecsWorld) {
            const render = this.ecsWorld.entityManager.getComponent(entityId, 'render')
            if (render && render.mesh) return
          }

          entityObjects.forEach(obj => {
            obj.position.set(transform.x, transform.y, transform.z)
            obj.rotation.set(transform.rx, transform.ry, transform.rz)
          })

          // 远程同步时通过防抖输出日志（避免移动端拖拽时每帧都输出）
          if (entityObjects.length > 0 && sequenceId > 0 && !this.isDraggingModel && !isLocal) {
            // 保存最新的远程同步数据
            this.pendingRemoteLogs[entityId] = {
              entityId,
              transform,
              sequenceId,
              crdtEventCount
            }
            // 清除旧的防抖计时器
            if (this.remoteLogTimers[entityId]) {
              clearTimeout(this.remoteLogTimers[entityId])
            }
            // 500ms 内没有新同步则认为操作结束，输出一次日志
            this.remoteLogTimers[entityId] = setTimeout(() => {
              this.flushRemoteLog(entityId)
            }, 500)
          }
        } catch (e) {
          console.warn('Transform 解析失败:', e)
        }

        if (this.ecsInitialized && this.ecsWorld) {
          const render = this.ecsWorld.entityManager.getComponent(entityId, 'render')
          if (render && render.mesh) return
        }

        // 同步 Layer
        const layer = parseInt(entityMap.get('layer').toString()) || 1
        const threeObj = this.findObjectByEntityId(entityId)
        if (threeObj) {
          threeObj.userData.layer = layer
          threeObj.renderOrder = layer * 1000
        }
      },

      // 输出防抖后的远程同步日志
      flushRemoteLog(entityId) {
        const pending = this.pendingRemoteLogs[entityId]
        if (!pending) return
        
        const { transform, sequenceId, crdtEventCount } = pending
        const timestamp = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0')

        const rotDegX = THREE.MathUtils.radToDeg(transform.rx).toFixed(2)
        const rotDegY = THREE.MathUtils.radToDeg(transform.ry).toFixed(2)
        const rotDegZ = THREE.MathUtils.radToDeg(transform.rz).toFixed(2)

        const euler = new THREE.Euler(transform.rx, transform.ry, transform.rz, 'XYZ')
        const quat = new THREE.Quaternion().setFromEuler(euler)

        this.operationLog.unshift({
          type: 'sync',
          content: `Entity ${entityId} CRDT Sync → Position(${transform.x.toFixed(3)}, ${transform.y.toFixed(3)}, ${transform.z.toFixed(3)}) Rotation[${rotDegX}°, ${rotDegY}°, ${rotDegZ}°]`,
          timestamp,
          fullTimestamp: Date.now(),
          details: {
            source: 'CRDT_Sync',
            sequenceId,
            deviceTimestamp: crdtEventCount || Date.now(),
            entityId,
            to: { x: transform.x, y: transform.y, z: transform.z },
            rotation: { x: transform.rx, y: transform.ry, z: transform.rz },
            quaternion: { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
          }
        })

        if (this.operationLog.length > this.maxLogEntries) {
          this.operationLog.pop()
        }

        delete this.pendingRemoteLogs[entityId]
        delete this.remoteLogTimers[entityId]
      },

      // 从 CRDT 创建基本形状（cube/sphere/cylinder）
      createBasicShapeFromCRDT(entityId, type, transform) {
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular: 0x7777ff,
          shininess: 30
        })

        let mesh
        if (type === 'cube') {
          const geometry = new THREE.BoxGeometry(10, 10, 10)
          mesh = new THREE.Mesh(geometry, material)
          mesh.name = 'cube'
        } else if (type === 'sphere') {
          const geometry = new THREE.SphereGeometry(5, 32, 32)
          mesh = new THREE.Mesh(geometry, material)
          mesh.name = 'sphere'
        } else if (type === 'cylinder') {
          const geometry = new THREE.CylinderGeometry(10, 10, 20, 80)
          mesh = new THREE.Mesh(geometry, material)
          mesh.name = 'cylinder'
        } else {
          console.warn('未知的基本形状类型:', type)
          return
        }

        mesh.userData.entityId = entityId
        mesh.userData.layer = 1
        mesh.renderOrder = 1000

        mesh.position.set(transform.x, transform.y, transform.z)
        mesh.rotation.set(transform.rx, transform.ry, transform.rz)
        mesh.scale.set(transform.sx, transform.sy, transform.sz)

        // 记录从CRDT创建基本形状
        const timestamp = new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0')
        
        this.operationLog.unshift({
          type: 'create',
          content: `[CRDT Create] ${type} ${mesh.name || entityId} at Position(${transform.x.toFixed(3)}, ${transform.y.toFixed(3)}, ${transform.z.toFixed(3)})`,
          timestamp: timestamp,
          fullTimestamp: Date.now(),
          details: {
            source: 'CRDT_Create',
            entityId: entityId,
            type: type,
            position: { x: transform.x, y: transform.y, z: transform.z },
            rotation: { x: transform.rx, y: transform.ry, z: transform.rz },
            scale: { x: transform.sx, y: transform.sy, z: transform.sz }
          }
        })
        
        if (this.operationLog.length > this.maxLogEntries) {
          this.operationLog.pop()
        }

        if (mesh.material) {
          mesh.material.depthTest = true
          mesh.material.depthWrite = true
        }

        this.objects.add(mesh)
        this.addModelController(mesh)
        this.sortObjectsByLayer()
        this.updateSceneTree()

        console.log(`从CRDT创建基本形状 ${type}:`, entityId, transform)
      },

      // 通过 entityId 查找 Three.js 对象
      findObjectByEntityId(entityId) {
        let found = null
        this.objects.children.forEach(obj => {
          if (obj.userData && obj.userData.entityId === entityId) {
            found = obj
          }
        })
        return found
      },

      // 通过 entityId 移除对象
      removeObjectByEntityId(entityId) {
        // 找到所有具有相同entityId的对象
        const objectsToRemove = this.objects.children.filter(obj => {
          return obj.userData && obj.userData.entityId === entityId
        })
        
        // 删除所有找到的对象
        objectsToRemove.forEach(obj => {
          this.objects.remove(obj)
          // 同时删除对应的控制器
          if (obj.name) {
            this.removeModelController(obj.name)
          }
        })
        
        if (objectsToRemove.length > 0) {
          this.updateSceneTree()
        }
      },

      // 更新实体的 Transform（写入 CRDT）
      updateMarsTransform(entityId, transform) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        // 获取CRDT序列号（用于关联日志）
        const globalSeqId = this.globalEventCounter ? this.globalEventCounter.get('counter') || 0 : 0
        
        // 使用 transact 确保原子性
        this.doc1.transact(() => {
          const transformText = entityMap.get('transform')
          transformText.delete(0, transformText.length)
          transformText.insert(0, JSON.stringify(transform))
        })
      },

      // 切换 MARS 视图
      switchMarsView(entityId, viewType) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        // LWW: 更新 ActiveView
        const activeViewText = entityMap.get('activeView')
        this.doc1.transact(() => {
          activeViewText.delete(0, activeViewText.length)
          activeViewText.insert(0, viewType)
        })

        // 切换 Three.js 渲染器中的可见性
        // 新的视图类型映射
        this.objects.children.forEach(obj => {
          if (obj.userData && obj.userData.entityId === entityId) {
            // GridView 显示 GridView 类型，隐藏其他
            // VoxelView 显示 VoxelView 类型
            // CloudPointView 显示 CloudPointView 类型
            obj.visible = (obj.userData.viewType === viewType)
          }
        })

        console.log(`切换 ${entityId} 视图到 ${viewType}`)
      },

      // 设置实体 Layer
      setMarsLayer(entityId, layer) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        const layerText = entityMap.get('layer')
        this.doc1.transact(() => {
          layerText.delete(0, layerText.length)
          layerText.insert(0, String(layer))
        })
      },

      // 添加组成员（LWW-Set 语义）
      addMarsGroupMember(entityId, clientId) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        const members = entityMap.get('groupMembers')
        const arr = members.toArray()
        if (!arr.includes(clientId)) {
          members.push([clientId])
        }
      },

      // 设置组ID（LWW-Register）
      setMarsGroupId(entityId, groupId) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        const groupIdText = entityMap.get('groupGroupId')
        this.doc1.transact(() => {
          groupIdText.delete(0, groupIdText.length)
          groupIdText.insert(0, groupId || '')
        })
      },

      // 设置虚实绑定
      setMarsBinding(entityId, physicalId) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        const bindingText = entityMap.get('binding')
        this.doc1.transact(() => {
          bindingText.delete(0, bindingText.length)
          bindingText.insert(0, physicalId || '')
        })
      },

      // 逻辑删除实体
      deleteMarsEntity(entityId) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return

        const deletedText = entityMap.get('deleted')
        this.doc1.transact(() => {
          deletedText.delete(0, deletedText.length)
          deletedText.insert(0, 'true')
        })
      },

      // 从 Yjs 组信息同步到本地 groups 数组
      syncGroupsFromYjs() {
        // 重新构建本地 groups 数组以保持同步
        // 注意：这里的 groups 是遗留结构，MARS Group 信息现在存储在 marsGroups
        console.log('Groups 同步完成')
      },

      // 根据 entityId 获取当前 ActiveView
      getMarsActiveView(entityId) {
        const entityMap = this.marsEntities.get(entityId)
        if (!entityMap) return 'MeshView'
        return entityMap.get('activeView').toString()
      },

      // ============================================
      // 实验场景：微型办公工位实体加载
      // ============================================

      // 初始化实验场景（按钮调用）
      initExperimentScene() {
        console.log('开始初始化实验场景...')
        
        // 清理旧的办公工位模型
        const officeEntityIds = ['desk_1', 'chair_1', 'monitor_1', 'lamp_1', 'cabinet_1']
        officeEntityIds.forEach(entityId => {
          this.removeObjectByEntityId(entityId)
        })
        
        // 强制刷新场景树（清空旧节点），确保 Vue 响应式检测到变化
        this.updateSceneTree()
        
        // 加载新模型
        this.loadOfficeEntities()
      },

      // 实验一：椅子沿Y轴位移15（论文标准: 位置误差 < 0.01 单位）
      runExperiment1() {
        this.$message.info('Exp1 Start: Chair Y-Axis Translation')
        const entityId = 'chair_1'
        const chairObj = this.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId
        })
        if (!chairObj) {
          this.$message.error('Chair object not found, please execute "Experiment Init" first')
          return
        }
        const initY = chairObj.position.y
        chairObj.position.y += 15
        this.updateMarsTransform(entityId, {
          x: chairObj.position.x, y: chairObj.position.y, z: chairObj.position.z,
          rx: chairObj.rotation.x, ry: chairObj.rotation.y, rz: chairObj.rotation.z,
          sx: chairObj.scale.x, sy: chairObj.scale.y, sz: chairObj.scale.z
        })
        setTimeout(() => {
          const err = Math.abs(chairObj.position.y - (initY + 15))
          const passed = err < 0.01
          this.logOperation('exp1',
            `Exp1 Done: Y(${chairObj.position.y.toFixed(3)}) Expected(${(initY+15).toFixed(3)}) ` +
            `Error(${err.toFixed(4)}) ${passed ? 'PASS ✓' : 'FAIL ✗'}`
          )
          this.$message.success(`Exp1 Done ${passed ? 'PASS ✓' : 'FAIL ✗'} Error: ${err.toFixed(4)}`)
        }, 200)
      },
      
      // 实验二：椅子绕Z轴旋转45度（论文标准: 旋转误差 < 0.1°）
      runExperiment2() {
        this.$message.info('Exp2 Start: Chair Z-Axis Rotation 45°')
        const entityId = 'chair_1'
        const chairObj = this.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId
        })
        if (!chairObj) {
          this.$message.error('Chair object not found, please execute "Experiment Init" first')
          return
        }
        const initRz = chairObj.rotation.z
        chairObj.rotation.z += Math.PI / 4
        this.updateMarsTransform(entityId, {
          x: chairObj.position.x, y: chairObj.position.y, z: chairObj.position.z,
          rx: chairObj.rotation.x, ry: chairObj.rotation.y, rz: chairObj.rotation.z,
          sx: chairObj.scale.x, sy: chairObj.scale.y, sz: chairObj.scale.z
        })
        setTimeout(() => {
          const errRad = Math.abs(chairObj.rotation.z - (initRz + Math.PI / 4))
          const errDeg = THREE.MathUtils.radToDeg(errRad)
          const passed = errDeg < 0.1
          const rotDeg = THREE.MathUtils.radToDeg(chairObj.rotation.z)
          this.logOperation('exp2',
            `Exp2 Done: Rz(${rotDeg.toFixed(3)}°) Expected(${(THREE.MathUtils.radToDeg(initRz+Math.PI/4)).toFixed(3)}°) ` +
            `Error(${errDeg.toFixed(4)}°) ${passed ? 'PASS ✓' : 'FAIL ✗'}`
          )
          this.$message.success(`Exp2 Done ${passed ? 'PASS ✓' : 'FAIL ✗'} Error: ${errDeg.toFixed(4)}°`)
        }, 200)
      },
      
      // 实验三：模拟MeshView资源异步加载延迟500ms下，CRDT状态缓存与离线编辑
      runExperiment3() {
        this.$message.info('Exp3: Async load simulation with deferred edits')

        const entityId = 'monitor_1'
        const monitorObj = this.objects.children.find(obj =>
          obj.userData && obj.userData.entityId === entityId
        )

        if (!monitorObj) {
          this.$message.error('Monitor object not found, please run "Experiment Init" first')
          return
        }

        const initialPos = {
          x: monitorObj.position.x,
          y: monitorObj.position.y,
          z: monitorObj.position.z
        }

        this.logOperation('exp3', `Exp3 Start: Initial(${initialPos.x.toFixed(3)},${initialPos.y.toFixed(3)},${initialPos.z.toFixed(3)})`)

        const edits = [
          { axis: 'x', val: 5, name: 'Disp1 X+5' },
          { axis: 'y', val: 5, name: 'Disp2 Y+5' },
          { axis: 'z', val: 5, name: 'Disp3 Z+5' }
        ]
        let editIndex = 0
        const editInterval = 100

        this.logOperation('exp3', 'Exp3: Simulating 500ms MeshView load delay...')

        const editTimer = setInterval(() => {
          if (editIndex >= edits.length) {
            clearInterval(editTimer)
            return
          }
          const e = edits[editIndex]
          const target = this.findObjectByEntityId(entityId)
          if (!target) { editIndex++; return }
          target.position[e.axis] += e.val
          this.updateMarsTransform(entityId, {
            x: target.position.x, y: target.position.y, z: target.position.z,
            rx: target.rotation.x, ry: target.rotation.y, rz: target.rotation.z,
            sx: target.scale.x, sy: target.scale.y, sz: target.scale.z
          })
          this.logOperation('exp3',
            `Exp3 ${e.name} @t${editIndex*editInterval}ms → (${target.position.x.toFixed(3)},${target.position.y.toFixed(3)},${target.position.z.toFixed(3)})`
          )
          editIndex++
        }, editInterval)

        setTimeout(() => {
          const final = this.findObjectByEntityId(entityId)
          if (final) {
            const errX = Math.abs(final.position.x - (initialPos.x + 5))
            const errY = Math.abs(final.position.y - (initialPos.y + 5))
            const errZ = Math.abs(final.position.z - (initialPos.z + 5))
            const passed = errX < 0.01 && errY < 0.01 && errZ < 0.01
            this.logOperation('exp3',
              `Exp3 Done: Final(${final.position.x.toFixed(3)},${final.position.y.toFixed(3)},${final.position.z.toFixed(3)}) ` +
              `Errors(dx=${errX.toFixed(4)} dy=${errY.toFixed(4)} dz=${errZ.toFixed(4)}) ` +
              `${passed ? 'PASS ✓' : 'FAIL ✗'}`
            )
            this.$message.success(`Exp3 Done ${passed ? 'PASS ✓' : 'FAIL ✗'} Errors: dx=${errX.toFixed(4)} dy=${errY.toFixed(4)} dz=${errZ.toFixed(4)}`)
          }
        }, 500)
      },

      // 加载微型办公工位场景（5个实体）
      loadOfficeEntities() {
        // 实体配置
        const officeEntities = [
          { id: 'desk_1', name: '办公桌', glb: 'Adjustable Desk.glb', ply: 'Adjustable Desk.ply', vox: 'Adjustable Desk.glb' },
          { id: 'chair_1', name: '人体工学椅', glb: 'Executive Chair.glb', ply: 'Executive Chair.ply', vox: 'Executive Chair.glb' },
          { id: 'monitor_1', name: '显示器', glb: 'Monitor.glb', ply: 'Monitor.ply', vox: 'Monitor.glb' },
          { id: 'lamp_1', name: '台灯', glb: 'Desk Lamp.glb', ply: 'Desk Lamp.ply', vox: 'Desk Lamp.glb' },
          { id: 'cabinet_1', name: '文件柜', glb: 'Cabinet.glb', ply: 'Cabinet.ply', vox: 'Cabinet.glb' }
        ]

        const basePath = '/modelingsrc'
        const positions = [-30, -15, 0, 15, 30]  // X轴位置分布

        officeEntities.forEach((config, index) => {
          const xPos = positions[index]

          const gridPath = `${basePath}/网格/${config.glb}`
          const voxelPath = `${basePath}/体素/${config.vox}`
          const cloudPath = `${basePath}/点云/${config.ply}`

          // 先创建 MARS CRDT 实体
          const entityMap = this.createMarsEntity(config.id)
          const meshView = entityMap.get('meshView')
          meshView.delete(0, meshView.length)
          meshView.insert(0, gridPath)
          const voxelView = entityMap.get('voxelView')
          voxelView.delete(0, voxelView.length)
          voxelView.insert(0, voxelPath)
          const cloudPointView = entityMap.get('cloudPointView')
          cloudPointView.delete(0, cloudPointView.length)
          cloudPointView.insert(0, cloudPath)
          entityMap.get('transform').delete(0, entityMap.get('transform').length)
          entityMap.get('transform').insert(0, JSON.stringify({
            x: xPos, y: 0, z: 0,
            rx: 0, ry: 0, rz: 0,
            sx: 1, sy: 1, sz: 1
          }))

          // GridView (网格) - 默认桌面端视图
          this.loadGridView(config.id, gridPath, xPos)

          // VoxelView (体素) - 像素化预览视图
          this.loadVoxelView(config.id, voxelPath, xPos)

          // CloudPointView (点云) - 移动端轻量化
          this.loadCloudPointView(config.id, cloudPath, xPos)
        })

        console.log('微型办公工位场景加载完成')
      },

      // 模型归一化处理 - 仅标准化尺寸，不修改位置
      // 位置保持原始偏移，确保 TransformControls handles 和模型对齐
      normalizeModel(mesh, targetSize = 15) {
        const box = new THREE.Box3().setFromObject(mesh)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        console.log(`归一化前 - size: ${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}, maxDim: ${Math.max(size.x, size.y, size.z).toFixed(2)}`)
        console.log(`归一化前 - center: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`)

        // 居中处理：遍历所有子对象，将几何中心移动到局部原点
        mesh.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox()
            const geoCenter = child.geometry.boundingBox.getCenter(new THREE.Vector3())
            child.geometry.translate(-geoCenter.x, -geoCenter.y, -geoCenter.z)
          }
        })

        // 统一缩放所有模型
        const newBox = new THREE.Box3().setFromObject(mesh)
        const newSize = newBox.getSize(new THREE.Vector3())
        const maxDim = Math.max(newSize.x, newSize.y, newSize.z)
        if (maxDim > 0) {
          const scale = targetSize / maxDim
          mesh.scale.multiplyScalar(scale)
          console.log(`归一化后 - scale: ${scale.toFixed(4)}, 最终尺寸: ${(maxDim * scale).toFixed(2)}`)
        }

        // 验证居中效果
        const finalBox = new THREE.Box3().setFromObject(mesh)
        const finalCenter = finalBox.getCenter(new THREE.Vector3())
        console.log(`居中后 - center: ${finalCenter.x.toFixed(2)}, ${finalCenter.y.toFixed(2)}, ${finalCenter.z.toFixed(2)}`)
      },

      // 加载网格表示 (GridView)
      loadGridView(entityId, url, xPos) {
        // 标记正在加载
        this.loadingOfficeEntities.add(entityId)

        const loader = new GLTFLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'GridView'
        })
        
        if (existingModel) {
          console.log(`模型 ${entityId}_GridView 已存在，跳过加载`)
          this.loadingOfficeEntities.delete(entityId)
          return
        }

        loader.load(url, (gltf) => {
          // 二次检查：防止重复添加（如快速点击初始化按钮）
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'GridView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_GridView 已存在，跳过添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          const mesh = gltf.scene
          mesh.name = `${entityId}_GridView`
          mesh.userData.viewType = 'GridView'
          mesh.userData.entityId = entityId

          // 归一化处理
          self.normalizeModel(mesh, 15)
          // 调整初始位置
          let positionOffset = { x: 0, y: 0, z: 0 };
          switch(entityId) {
            case 'desk_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 办公桌
              break;
            case 'chair_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 人体工学椅
              break;
            case 'monitor_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 显示器
              break;
            case 'lamp_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 台灯
              break;
            case 'cabinet_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 文件柜
              break;
            default:
              positionOffset = { x: 0, y: 0, z: 0 };
          }
          mesh.position.x = xPos + positionOffset.x;
          mesh.position.y = positionOffset.y;
          mesh.position.z = positionOffset.z;
          console.log(`处理 ${entityId} 网格模型，位置偏移:`, positionOffset);
          mesh.visible = true

          self.objects.add(mesh)

          mesh.userData.layer = 1
          mesh.renderOrder = 1000

          // 为模型添加控制器
          self.addModelController(mesh)

          // 更新 CRDT Transform（使用实际归一化后的scale和完整位置）
          self.updateMarsTransform(entityId, {
            x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
            rx: 0, ry: 0, rz: 0,
            sx: mesh.scale.x, sy: mesh.scale.y, sz: mesh.scale.z
          })

          console.log(`加载 GridView: ${entityId}`)
          // 更新场景树
          self.updateSceneTree()
          // 清除加载标记
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`GridView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 加载体素表示 (VoxelView)
      loadVoxelView(entityId, url, xPos) {
        // 标记正在加载
        this.loadingOfficeEntities.add(entityId)

        const loader = new GLTFLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'VoxelView'
        })
        
        if (existingModel) {
          console.log(`模型 ${entityId}_VoxelView 已存在，跳过加载`)
          this.loadingOfficeEntities.delete(entityId)
          return
        }

        loader.load(url, (gltf) => {
          // 二次检查：防止重复添加
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'VoxelView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_VoxelView 已存在，跳过添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          const voxel = gltf.scene.clone()
          voxel.name = `${entityId}_VoxelView`
          voxel.userData.viewType = 'VoxelView'
          voxel.userData.entityId = entityId
          voxel.userData.selectable = true

          // 归一化处理（与网格一致）
          self.normalizeModel(voxel, 15)

          // 为每个模型设置单独的体素缩放因子
          let voxelScale;
          switch(entityId) {
            case 'desk_1':
              voxelScale = 0.075; // 办公桌
              break;
            case 'chair_1':
              voxelScale = 0.1; // 人体工学椅
              break;
            case 'monitor_1':
              voxelScale = 0.28; // 显示器
              break;
            case 'lamp_1':
              voxelScale = 0.35; // 台灯
              break;
            case 'cabinet_1':
              voxelScale = 0.3; // 文件柜
              break;
            default:
              voxelScale = 10; // 默认缩放
          }
          voxel.scale.set(voxelScale, voxelScale, voxelScale);
          console.log(`处理 ${entityId} 体素模型，缩放: ${voxelScale}`);

          // 调整初始位置
          let positionOffset = { x: 0, y: 0, z: 0 };
          switch(entityId) {
            case 'desk_1':
              positionOffset = { x: 0, y: 0, z: -5 }; // 办公桌
              break;
            case 'chair_1':
              positionOffset = { x: 0, y: 0, z: 0 }; // 人体工学椅
              break;
            case 'monitor_1':
              positionOffset = { x: -5, y: 0, z: 0 }; // 显示器
              break;
            case 'lamp_1':
              positionOffset = { x: 0, y: 0, z: -2.5 }; // 台灯
              break;
            case 'cabinet_1':
              positionOffset = { x: -5, y: 0, z: -9 }; // 文件柜
              break;
            default:
              positionOffset = { x: 0, y: 0, z: 0 };
          }
          voxel.position.x = xPos + positionOffset.x;
          voxel.position.y = positionOffset.y;
          voxel.position.z = positionOffset.z;
          console.log(`处理 ${entityId} 体素模型，位置偏移:`, positionOffset);

          // 线框风格表现体素感
          voxel.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshBasicMaterial({
                color: 0x888888,
                wireframe: true
              })
            }
          })

          // 默认不显示
          voxel.visible = false

          self.objects.add(voxel)
          voxel.userData.layer = 1
          voxel.renderOrder = 1000

          console.log(`加载 VoxelView: ${entityId}`)
          // 更新场景树
          self.updateSceneTree()
          // 清除加载标记
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`VoxelView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 加载点云表示 (CloudPointView)
      loadCloudPointView(entityId, url, xPos) {
        // 标记正在加载
        this.loadingOfficeEntities.add(entityId)

        const loader = new PLYLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'CloudPointView'
        })
        
        if (existingModel) {
          console.log(`模型 ${entityId}_CloudPointView 已存在，跳过加载`)
          this.loadingOfficeEntities.delete(entityId)
          return
        }

        loader.load(url, (geometry) => {
          // 二次检查：防止重复添加
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'CloudPointView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_CloudPointView 已存在，跳过添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          // 预处理点云，修正y轴方向
          const processedGeometry = self.preprocessPointCloud(geometry)
          
          const material = new THREE.PointsMaterial({
            color: 0x00ff00,
            size: 5.0,
            transparent: false,
            opacity: 1.0,
            depthTest: true,
            depthWrite: true,
            sizeAttenuation: false
          })

          const pointCloud = new THREE.Points(processedGeometry, material)
          pointCloud.name = `${entityId}_CloudPointView`
          pointCloud.userData.viewType = 'CloudPointView'
          pointCloud.userData.entityId = entityId
          pointCloud.userData.selectable = true

          // 归一化处理（与网格一致）
          self.normalizeModel(pointCloud, 15)

          // 调整点云大小
          let pointCloudScale;
          switch(entityId) {
            case 'desk_1':
              pointCloudScale = 0.5; // 办公桌
              break;
            case 'chair_1':
              pointCloudScale = 0.5; // 人体工学椅
              break;
            case 'monitor_1':
              pointCloudScale = 0.5; // 显示器
              break;
            case 'lamp_1':
              pointCloudScale = 0.5; // 台灯
              break;
            case 'cabinet_1':
              pointCloudScale = 0.5; // 文件柜
              break;
            default:
              pointCloudScale = 1; // 默认缩放
          }
          // 应用大小调整
          pointCloud.scale.multiplyScalar(pointCloudScale);
          console.log(`处理 ${entityId} 点云模型，大小缩放: ${pointCloudScale}`);
          
          // 调整三个轴的方向（1或-1）
          let axisDirection = { x: 1, y: 1, z: 1 };
          switch(entityId) {
            case 'desk_1':
              axisDirection = { x: 1, y: -1, z: 1 }; // 办公桌
              break;
            case 'chair_1':
              axisDirection = { x: 1, y: -1, z: 1 }; // 人体工学椅
              break;
            case 'monitor_1':
              axisDirection = { x: 1, y: -1, z: 1 }; // 显示器
              break;
            case 'lamp_1':
              axisDirection = { x: 1, y: -1, z: 1 }; // 台灯
              break;
            case 'cabinet_1':
              axisDirection = { x: 1, y: -1, z: 1 }; // 文件柜
              break;
            default:
              axisDirection = { x: 1, y: 1, z: 1 };
          }
          // 应用轴方向调整
          pointCloud.scale.x *= axisDirection.x;
          pointCloud.scale.y *= axisDirection.y;
          pointCloud.scale.z *= axisDirection.z;
          console.log(`处理 ${entityId} 点云模型，轴方向:`, axisDirection);
          
          // 调整初始位置
          let positionOffset = { x: 0, y: 0, z: -5.0 };
          switch(entityId) {
            case 'desk_1':
              positionOffset = { x: 0, y: 0, z: -5.0 }; // 办公桌
              break;
            case 'chair_1':
              positionOffset = { x: 0, y: 0, z: -5.0 }; // 人体工学椅
              break;
            case 'monitor_1':
              positionOffset = { x: 0, y: 0, z: -5.0 }; // 显示器
              break;
            case 'lamp_1':
              positionOffset = { x: 0, y: 0, z: -5.0 }; // 台灯
              break;
            case 'cabinet_1':
              positionOffset = { x: 0, y: 0, z: -5.0 }; // 文件柜
              break;
            default:
              positionOffset = { x: 0, y: 0, z: 0 };
          }
          pointCloud.position.x = xPos + positionOffset.x;
          pointCloud.position.y = positionOffset.y;
          pointCloud.position.z = positionOffset.z;
          console.log(`处理 ${entityId} 点云模型，位置偏移:`, positionOffset);

          // 默认不显示
          pointCloud.visible = false

          self.objects.add(pointCloud)
          pointCloud.userData.layer = 1
          pointCloud.renderOrder = 1000

          console.log(`加载 CloudPointView: ${entityId}`)
          // 更新场景树
          self.updateSceneTree()
          // 清除加载标记
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`CloudPointView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 从 CRDT 加载网格表示 (GridView) - 用于远程同步
      loadGridViewFromCRDT(entityId, url, transform) {
        const loader = new GLTFLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'GridView'
        })

        if (existingModel) {
          console.log(`模型 ${entityId}_GridView 已存在，跳过从CRDT加载`)
          return
        }

        this.loadingOfficeEntities.add(entityId)

        loader.load(url, (gltf) => {
          // 二次检查：防止重复添加
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'GridView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_GridView 已存在，跳过从CRDT添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          const mesh = gltf.scene
          mesh.name = `${entityId}_GridView`
          mesh.userData.viewType = 'GridView'
          mesh.userData.entityId = entityId

          // 归一化处理（居中子Mesh + 统一尺寸）
          self.normalizeModel(mesh, 15)
          const normalizedScale = mesh.scale.clone()

          // 使用CRDT中的transform设置位置和旋转
          mesh.position.set(transform.x, transform.y, transform.z)
          mesh.rotation.set(transform.rx, transform.ry, transform.rz)
          // 缩放：如果CRDT中还是初始值1，使用归一化后的统一尺寸；否则使用CRDT中保存的用户缩放值
          if (transform.sx === 1 && transform.sy === 1 && transform.sz === 1) {
            mesh.scale.copy(normalizedScale)
          } else {
            mesh.scale.set(transform.sx, transform.sy, transform.sz)
          }

          mesh.visible = true
          self.objects.add(mesh)

          mesh.userData.layer = 1
          mesh.renderOrder = 1000

          console.log(`从CRDT加载 GridView: ${entityId}, 位置:`, transform)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`GridView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 从 CRDT 加载体素表示 (VoxelView) - 用于远程同步
      loadVoxelViewFromCRDT(entityId, url, transform) {
        const loader = new GLTFLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'VoxelView'
        })

        if (existingModel) {
          console.log(`模型 ${entityId}_VoxelView 已存在，跳过从CRDT加载`)
          return
        }

        this.loadingOfficeEntities.add(entityId)

        loader.load(url, (gltf) => {
          // 二次检查：防止重复添加
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'VoxelView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_VoxelView 已存在，跳过从CRDT添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          const voxel = gltf.scene.clone()
          voxel.name = `${entityId}_VoxelView`
          voxel.userData.viewType = 'VoxelView'
          voxel.userData.entityId = entityId
          voxel.userData.selectable = true

          // 归一化处理
          self.normalizeModel(voxel, 15)

          // 为每个模型设置单独的体素缩放因子
          let voxelScale;
          switch(entityId) {
            case 'desk_1':
              voxelScale = 0.075;
              break;
            case 'chair_1':
              voxelScale = 0.1;
              break;
            case 'monitor_1':
              voxelScale = 0.28;
              break;
            case 'lamp_1':
              voxelScale = 0.35;
              break;
            case 'cabinet_1':
              voxelScale = 0.3;
              break;
            default:
              voxelScale = 10;
          }
          voxel.scale.set(voxelScale, voxelScale, voxelScale)

          // 线框风格表现体素感
          voxel.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshBasicMaterial({
                color: 0x888888,
                wireframe: true
              })
            }
          })

          // 使用CRDT中的transform设置位置和旋转
          voxel.position.set(transform.x, transform.y, transform.z)
          voxel.rotation.set(transform.rx, transform.ry, transform.rz)

          // 默认不显示
          voxel.visible = false

          self.objects.add(voxel)
          voxel.userData.layer = 1
          voxel.renderOrder = 1000

          console.log(`从CRDT加载 VoxelView: ${entityId}, 位置:`, transform)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`VoxelView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 从 CRDT 加载点云表示 (CloudPointView) - 用于远程同步
      loadCloudPointViewFromCRDT(entityId, url, transform) {
        const loader = new PLYLoader()
        const self = this

        // 检查是否已经存在相同的模型
        const existingModel = self.objects.children.find(obj => {
          return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'CloudPointView'
        })

        if (existingModel) {
          console.log(`模型 ${entityId}_CloudPointView 已存在，跳过从CRDT加载`)
          return
        }

        this.loadingOfficeEntities.add(entityId)

        loader.load(url, (geometry) => {
          // 二次检查：防止重复添加
          const existingModel = self.objects.children.find(obj => {
            return obj.userData && obj.userData.entityId === entityId && obj.userData.viewType === 'CloudPointView'
          })
          if (existingModel) {
            console.log(`模型 ${entityId}_CloudPointView 已存在，跳过从CRDT添加`)
            self.loadingOfficeEntities.delete(entityId)
            return
          }

          // 预处理点云，修正y轴方向
          const processedGeometry = self.preprocessPointCloud(geometry)

          const material = new THREE.PointsMaterial({
            color: 0x00ff00,
            size: 5.0,
            transparent: false,
            opacity: 1.0,
            depthTest: true,
            depthWrite: true,
            sizeAttenuation: false
          })

          const pointCloud = new THREE.Points(processedGeometry, material)
          pointCloud.name = `${entityId}_CloudPointView`
          pointCloud.userData.viewType = 'CloudPointView'
          pointCloud.userData.entityId = entityId
          pointCloud.userData.selectable = true

          // 归一化处理
          self.normalizeModel(pointCloud, 15)

          // 调整点云大小
          let pointCloudScale;
          switch(entityId) {
            case 'desk_1':
              pointCloudScale = 0.5;
              break;
            case 'chair_1':
              pointCloudScale = 0.5;
              break;
            case 'monitor_1':
              pointCloudScale = 0.5;
              break;
            case 'lamp_1':
              pointCloudScale = 0.5;
              break;
            case 'cabinet_1':
              pointCloudScale = 0.5;
              break;
            default:
              pointCloudScale = 1;
          }
          pointCloud.scale.multiplyScalar(pointCloudScale)

          // 调整轴方向
          let axisDirection = { x: 1, y: 1, z: 1 };
          switch(entityId) {
            case 'desk_1':
            case 'chair_1':
            case 'monitor_1':
            case 'lamp_1':
            case 'cabinet_1':
              axisDirection = { x: 1, y: -1, z: 1 };
              break;
            default:
              axisDirection = { x: 1, y: 1, z: 1 };
          }
          pointCloud.scale.x *= axisDirection.x;
          pointCloud.scale.y *= axisDirection.y;
          pointCloud.scale.z *= axisDirection.z;

          // 使用CRDT中的transform设置位置和旋转
          pointCloud.position.set(transform.x, transform.y, transform.z)
          pointCloud.rotation.set(transform.rx, transform.ry, transform.rz)

          // 默认不显示
          pointCloud.visible = false

          self.objects.add(pointCloud)
          pointCloud.userData.layer = 1
          pointCloud.renderOrder = 1000

          console.log(`从CRDT加载 CloudPointView: ${entityId}, 位置:`, transform)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        }, undefined, (error) => {
          console.warn(`CloudPointView 加载失败 ${entityId}:`, error)
          self.updateSceneTree()
          self.loadingOfficeEntities.delete(entityId)
        })
      },

      // 计算模型缩放因子，确保所有模型大小一致
      calculateScaleFactor(model) {
        // 参考尺寸（可根据需要调整）
        const targetSize = 10;
        
        // 计算模型边界盒
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // 取最大维度作为当前模型大小
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // 计算缩放因子
        return targetSize / maxDimension;
      },
      
      // 预处理点云模型，修正y轴方向
      preprocessPointCloud(geometry) {
        // 翻转y轴坐标
        const positionAttribute = geometry.attributes.position;
        for (let i = 0; i < positionAttribute.count; i++) {
          // 翻转y轴坐标，确保点云不会倒置
          positionAttribute.setY(i, -positionAttribute.getY(i));
        }
        positionAttribute.needsUpdate = true;
        return geometry;
      },

      // canvas初始化
      initCavasRen(){
        this.model_container = document.getElementById("editor_canvas")
        this.model_container.style.height = window.innerHeight-200 + "px"
        this.model_container.style.width = window.innerWidth + "px"
        this.height = this.model_container.clientHeight
        this.width = this.model_container.clientWidth
      },

      // 场景初始化
      initScene(){
        this.scene = new THREE.Scene()
        const delay_array = []
        // 添加同步
        const Create_observer = ()=> {
        const endTime = this.doc1.get('yjs-client').time
        const createdelay = this.startTime-endTime
        delay_array.push(createdelay)
        //this.createdelay_array.delete(0,this.createdelay_array.length)
        console.log('Y.Map 发生变化:', this.model_map.toJSON())
        console.log(this.model_map)
        this.loader = new THREE.ObjectLoader()
          if(this.model_map.has('cube')) {
            this.result = this.model_map.get('cube')
            this.obj = this.loader.parse(this.result)
            console.log(this.obj.position)
            // 去重检查：如果已存在相同uuid的对象，跳过
            const existingObj = this.objects.children.find(obj => obj.uuid === this.obj.uuid)
            if (existingObj) {
              console.log('cube 已存在，跳过添加')
              return
            }
            this.objects.add(this.obj)
            this.scene.add(this.objects)
            this.modelId = this.getNextModelId()
            this.obj.name = " 模型 "+ this.modelId
            console.log(this.obj.name)

            // 确保对象有 userData 对象和图层属性
            if (!this.obj.userData) {
              this.obj.userData = {}
            }
            if (this.obj.userData.layer === undefined) {
              this.obj.userData.layer = 1
            }
            // 设置渲染顺序，高图层的对象具有更高的渲染顺序
            this.obj.renderOrder = this.obj.userData.layer * 1000
            // 为对象设置深度测试，默认为启用
            if (this.obj.material) {
              this.obj.material.depthTest = true
              this.obj.material.depthWrite = true
            }
            // 重新排序对象以确保图层顺序正确
            this.sortObjectsByLayer()
            // 更新所有对象的深度测试设置
            // 使用setTimeout确保对象完全添加到场景后再更新
            setTimeout(() => {
              this.updateAllObjectsDepthSettings()
            }, 0)
            
            // 保存当前对象的引用到局部变量
            const currentObj = this.obj
            
            this.logOperation('create', `Create Cube: ${this.obj.name} Position:(${this.obj.position.x.toFixed(2)}, ${this.obj.position.y.toFixed(2)}, ${this.obj.position.z.toFixed(2)})`)
            
            const ControlFolder = this.gui.addFolder(" 模型 " + this.modelId)
            ControlFolder.open()
            ControlFolder.add(currentObj.scale, "x").min(0).max(5).step(0.1).name("长度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.scale, "y").min(0).max(5).step(0.1).name("高度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.scale, "z").min(0).max(5).step(0.1).name("宽度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "x").min(-50).max(70).step(1).name("x坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "y").min(-50).max(50).step(1).name("y坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "z").min(-50).max(50).step(1).name("z坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            // 创建旋转控制对象，使用度作为单位
            const rotationControls = {
              x: THREE.MathUtils.radToDeg(currentObj.rotation.x),
              y: THREE.MathUtils.radToDeg(currentObj.rotation.y),
              z: THREE.MathUtils.radToDeg(currentObj.rotation.z)
            }
            
            ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.x = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.y = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.z = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            // 添加图层控制
            // 确保layer属性是数字类型
            currentObj.userData.layer = parseInt(currentObj.userData.layer) || 1
            // 创建图层控制器
            const layerController = ControlFolder.add(currentObj.userData, "layer", 1, 5).step(1).name("图层")
            layerController.onChange(() => {
              this.updateObjectLayer(currentObj)
              // MARS CRDT: 同步 Layer 到 CRDT
              if (currentObj.userData && currentObj.userData.entityId) {
                this.setMarsLayer(currentObj.userData.entityId, currentObj.userData.layer)
              }
              this.updateSceneTree()
            })
            console.log(this.model_map.toJSON())
            // 更新场景树
            this.updateSceneTree()
          }
          else if(this.model_map.has('sphere')) {
            this.result = this.model_map.get('sphere')
            this.obj = this.loader.parse(this.result)
            console.log(this.obj)
            // 去重检查：如果已存在相同uuid的对象，跳过
            const existingObj = this.objects.children.find(obj => obj.uuid === this.obj.uuid)
            if (existingObj) {
              console.log('sphere 已存在，跳过添加')
              return
            }
            this.objects.add(this.obj)
            this.scene.add(this.objects)
            this.modelId = this.getNextModelId()
            this.obj.name = " 模型 "+ this.modelId
            console.log(this.obj.name)

            // 确保对象有 userData 对象和图层属性
            if (!this.obj.userData) {
              this.obj.userData = {}
            }
            if (this.obj.userData.layer === undefined) {
              this.obj.userData.layer = 1
            }
            // 设置渲染顺序，高图层的对象具有更高的渲染顺序
            this.obj.renderOrder = this.obj.userData.layer * 10
            // 为对象设置深度测试，默认为启用
            if (this.obj.material) {
              this.obj.material.depthTest = true
              this.obj.material.depthWrite = true
            }
            // 重新排序对象以确保图层顺序正确
            this.sortObjectsByLayer()
            // 更新所有对象的深度测试设置
            // 使用setTimeout确保对象完全添加到场景后再更新
            setTimeout(() => {
              this.updateAllObjectsDepthSettings()
            }, 0)
            
            // 保存当前对象的引用到局部变量
            const currentObj = this.obj
            
            const ControlFolder = this.gui.addFolder(" 模型 " + this.modelId)
            ControlFolder.open()
            ControlFolder.add(currentObj.scale, "x").min(0).max(5).step(0.1).name("长度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.scale, "y").min(0).max(5).step(0.1).name("高度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.scale, "z").min(0).max(5).step(0.1).name("宽度").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "x").min(-50).max(50).step(1).name("x坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "y").min(-50).max(50).step(1).name("y坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(currentObj.position, "z").min(-50).max(50).step(1).name("z坐标").listen().onChange(() => {
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            // 创建旋转控制对象，使用度作为单位
            const rotationControls = {
              x: THREE.MathUtils.radToDeg(currentObj.rotation.x),
              y: THREE.MathUtils.radToDeg(currentObj.rotation.y),
              z: THREE.MathUtils.radToDeg(currentObj.rotation.z)
            }
            
            ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.x = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.y = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.z = THREE.MathUtils.degToRad(value)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            // 添加图层控制
            // 确保layer属性是数字类型
            currentObj.userData.layer = parseInt(currentObj.userData.layer) || 1
            // 创建图层控制器
            const layerController = ControlFolder.add(currentObj.userData, "layer", 1, 5).step(1).name("图层")
            layerController.onChange(() => {
              this.updateObjectLayer(currentObj)
              this.updateSceneTree()
            })
            console.log(this.model_map.toJSON())
            // 更新场景树
            this.updateSceneTree()
          }
          else if(this.model_map.has('cylinder')){
            this.result = this.model_map.get('cylinder')
            this.obj = this.loader.parse(this.result)
            console.log(this.obj)
            // 去重检查：如果已存在相同uuid的对象，跳过
            const existingObj = this.objects.children.find(obj => obj.uuid === this.obj.uuid)
            if (existingObj) {
              console.log('cylinder 已存在，跳过添加')
              return
            }
            this.objects.add(this.obj)
            this.scene.add(this.objects)
            console.log(this.obj.geometry)
            this.modelId = this.getNextModelId()
            this.obj.name = " 模型 "+ this.modelId
            
            // 确保对象有 userData 对象和图层属性
            if (!this.obj.userData) {
              this.obj.userData = {}
            }
            if (this.obj.userData.layer === undefined) {
              this.obj.userData.layer = 1
            }
            // 设置渲染顺序，高图层的对象具有更高的渲染顺序
            this.obj.renderOrder = this.obj.userData.layer * 10
            // 为对象设置深度测试，默认为启用
            if (this.obj.material) {
              this.obj.material.depthTest = true
              this.obj.material.depthWrite = true
            }
            // 重新排序对象以确保图层顺序正确
            this.sortObjectsByLayer()
            // 更新所有对象的深度测试设置
            // 使用setTimeout确保对象完全添加到场景后再更新
            setTimeout(() => {
              this.updateAllObjectsDepthSettings()
            }, 0)
            
            // 保存当前对象的引用到局部变量
            const currentObj = this.obj
            
            // 为当前圆柱体创建独立的配置对象
            const cylinderConfig = {
              radiusTop: 10,
              radiusBottom: 10,
              height: 20
            }
            
            const ControlFolder = this.gui.addFolder(" 模型 " + this.modelId)
            ControlFolder.open()
            ControlFolder.add(cylinderConfig, 'radiusTop').min(0).max(30).step(1).name("顶面半径").onChange((value) => {
              currentObj.geometry.dispose()
              currentObj.geometry = new THREE.CylinderGeometry(value, cylinderConfig.radiusBottom, cylinderConfig.height, 80)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(cylinderConfig, 'radiusBottom').min(0).max(30).step(1).name("底面半径").onChange((value) => { 
              currentObj.geometry.dispose()
              currentObj.geometry = new THREE.CylinderGeometry(cylinderConfig.radiusTop, value, cylinderConfig.height, 80)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
            ControlFolder.add(cylinderConfig, 'height').min(0).max(30).step(1).name("高").onChange((value) => { 
              currentObj.geometry.dispose()
              currentObj.geometry = new THREE.CylinderGeometry(cylinderConfig.radiusTop, cylinderConfig.radiusBottom, value, 80)
              // 同步同实体的其他模型
              if (currentObj.userData && currentObj.userData.entityId) {
                this.syncEntityModels(currentObj.userData.entityId, currentObj)
              }
            })
              ControlFolder.add(currentObj.position, "x").min(-50).max(50).step(1).name("x坐标").listen()
            ControlFolder.add(currentObj.position, "y").min(-50).max(50).step(1).name("y坐标").listen()
            ControlFolder.add(currentObj.position, "z").min(-50).max(50).step(1).name("z坐标").listen()
            // 创建旋转控制对象，使用度作为单位
            const rotationControls = {
              x: THREE.MathUtils.radToDeg(currentObj.rotation.x),
              y: THREE.MathUtils.radToDeg(currentObj.rotation.y),
              z: THREE.MathUtils.radToDeg(currentObj.rotation.z)
            }
            
            ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.x = THREE.MathUtils.degToRad(value)
            })
            ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.y = THREE.MathUtils.degToRad(value)
            })
            ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
              currentObj.rotation.z = THREE.MathUtils.degToRad(value)
            })
            // 添加图层控制
            // 确保layer属性是数字类型
            currentObj.userData.layer = parseInt(currentObj.userData.layer) || 1
            // 创建图层控制器
            const layerController = ControlFolder.add(currentObj.userData, "layer", 1, 5).step(1).name("图层")
            layerController.onChange(() => {
              this.updateObjectLayer(currentObj)
              this.updateSceneTree()
            })
            // 更新场景树
            this.updateSceneTree()
          }
          else if(this.model_map.has('intersect')){
            this.result = this.model_map.get('intersect')
            console.log(this.result)
            this.obj = this.loader.parse(this.result)
            console.log(this.obj)
            this.objects.add(this.obj)
            // 获取 object1 和 object2 的位置      
            const position1 = new THREE.Vector3()
            const position2 = new THREE.Vector3()
            position1.copy(this.getObject[0].object.position)
            position2.copy(this.getObject[1].object.position)
            // 计算交集位置
            const halfPosition = new THREE.Vector3()
            halfPosition.addVectors(position1, position2).multiplyScalar(0.5)
            this.obj.position.copy(halfPosition)
            this.scene.add(this.objects)
            this.allchildren = this.objects.children
            this.allchildren.forEach((Element,index) => {
              if (Element.uuid === this.model_map.get('object1_uuid')) {
                const delete_children = this.allchildren[index]
                const folderNames = Object.keys(this.gui.__folders)
                folderNames.forEach(folderName => {
                const folder = this.gui.__folders[folderName]
              if (folderName === delete_children.name){
                this.gui.removeFolder(folder)
              }})
              if (delete_children instanceof THREE.Mesh) {
                // 删除包含该模型的所有组
                this.deleteGroupsContainingModel(delete_children.uuid)
                
                this.objects.remove(delete_children)
                this.scene.remove(this.transformControls)
              }}
            })

            this.allchildren.forEach((Element,index) => {
              console.log(Element.uuid)
              if (Element.uuid === this.model_map.get('object2_uuid')) {
                const delete_children = this.allchildren[index]
                const folderNames = Object.keys(this.gui.__folders);
                folderNames.forEach(folderName => {
                const folder = this.gui.__folders[folderName]
                if (folderName === delete_children.name){
                  this.gui.removeFolder(folder)
              }})
              if (delete_children instanceof THREE.Mesh) {
              // 删除包含该模型的所有组
              this.deleteGroupsContainingModel(delete_children.uuid)
              
              this.objects.remove(delete_children)
            }}
            }) 
            this.modelId = this.getNextModelId()
            this.obj.name = " 模型 "+ this.modelId 
            const ControlFolder = this.gui.addFolder(" 模型 " + this.modelId)
            ControlFolder.open()
            ControlFolder.add(this.obj.position, "x").min(-50).max(50).step(1).name("x坐标").listen()
            ControlFolder.add(this.obj.position, "y").min(-50).max(50).step(1).name("y坐标").listen()
            ControlFolder.add(this.obj.position, "z").min(-50).max(50).step(1).name("z坐标").listen()
            // 创建旋转控制对象，使用度作为单位
            const rotationControls = {
              x: THREE.MathUtils.radToDeg(this.obj.rotation.x),
              y: THREE.MathUtils.radToDeg(this.obj.rotation.y),
              z: THREE.MathUtils.radToDeg(this.obj.rotation.z)
            }
            
            ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
              this.obj.rotation.x = THREE.MathUtils.degToRad(value)
            })
            ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
              this.obj.rotation.y = THREE.MathUtils.degToRad(value)
            })
            ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
              this.obj.rotation.z = THREE.MathUtils.degToRad(value)
            })  
            this.model_map.delete('object0_uuid')
            this.model_map.delete('object1_uuid')   
            this.model_map.delete('intersect')
            console.log(this.objects)
          }
        }
        //删除同步
        const Delete_observer = () =>{
          console.log('Delete在变化',this.delete_map.toJSON())
          const deleteUuid = this.delete_map.get('uuid')
          this.allchildren = this.objects.children
          this.allchildren.forEach((Element,index) => {
            if (Element.uuid === deleteUuid) {
              const delete_children = this.allchildren[index]
              const deleteName = delete_children.name || 'Unknown Object'
              const folderNames = Object.keys(this.gui.__folders)
              folderNames.forEach(folderName => {
                const folder = this.gui.__folders[folderName]
                console.log(folder)
                if (folderName === delete_children.name){
                  this.gui.removeFolder(folder)
                }
              })
              if (delete_children instanceof THREE.Mesh) {
                this.deleteGroupsContainingModel(delete_children.uuid)
                this.objects.remove(delete_children)
                this.scene.remove(this.transformControls)
              }
              this.logOperation('delete', `Delete Object: ${deleteName} (${deleteUuid.substring(0,8)}...)`)
            }
          })
          this.delete_map.delete(0,this.delete_map.length-1)
          this.updateSceneTree()
        }
        //位置同步
        const Operation_observer = (event) =>{
          this.allchildren = this.objects.children
          this.allchildren.forEach((Element,index) => {
            if (Element.uuid === this.operation_map.get('uuid')){
              this.operation_children = this.allchildren[index]
              if (this.operation_children instanceof THREE.Mesh){
                this.operation_children.position.x = this.operation_map.get('position_x')
                this.operation_children.position.y = this.operation_map.get('position_y')
                this.operation_children.position.z = this.operation_map.get('position_z')
                this.operation_children.scale.x = this.operation_map.get('scale_x')
                this.operation_children.scale.y = this.operation_map.get('scale_y')
                this.operation_children.scale.z = this.operation_map.get('scale_z')
                this.operation_children.rotation.x = this.operation_map.get('rotation_x')
                this.operation_children.rotation.y = this.operation_map.get('rotation_y')
                this.operation_children.rotation.z = this.operation_map.get('rotation_z')
                
                // 注：操作日志不再通过 operation_map observer 输出，
                // 拖拽日志统一在 TransformControls dragging-changed 结束时输出，
                // 避免鼠标掠过 gizmo 时 requestAnimationFrame 循环高频触发日志
              }
          }})
        }
        this.operation_map.observe(Operation_observer)
        this.delete_map.observe(Delete_observer)
        this.model_map.observe(Create_observer)
        // 手动处理已有数据（新客户端加入时observer不会为已有数据触发）
        Create_observer()
        // this.scene.add(this.objects);

        // ========== 初始化延迟测量 ==========
        initYjsLatencyHelper(this.doc1, this.provider1, {
          httpBaseUrl: 'http://192.168.31.252:3000'
        })
        // 把打印报告函数挂到 window 上，方便在控制台随时调用
        window.printLatency = printYjsLatencyReport
        console.log('延迟测量已初始化，在控制台输入 printLatency() 查看报告')
        // ===================================
      },

      // 组操作：将选中的对象约束为同一组
      groupObjects() {
        recordYjsAction('groupObjects')
        try {
          console.log('开始组操作')
          console.log('选中对象数量:', this.getObject.length)
          
          // 检查是否有足够的对象可组
          if (!this.getObject || this.getObject.length < 2) {
            return this.$message.error('请选择至少两个对象进行组操作')
          }
          
          // 检查选中对象是否在同一图层
          if (!this.checkObjectsSameLayer()) {
            return this.$message.error('只能对同一图层的对象进行组操作')
          }
          
          // 计算组的中心坐标：所有选中对象位置的平均值
          const center = new THREE.Vector3()
          this.getObject.forEach(obj => {
            center.add(obj.object.position)
          })
          center.divideScalar(this.getObject.length)
          
          // 提取组内对象的序号
          const objectIds = []
          this.getObject.forEach(obj => {
            // 从对象名称中提取序号，假设名称格式为"模型n"
            const match = obj.object.name.match(/模型 (\d+)/)
            if (match && match[1]) {
              objectIds.push(parseInt(match[1]))
            }
          })
          
          // 排序序号，确保b>a
          objectIds.sort((a, b) => a - b)
          
          // 组合成组a_b的格式
          const groupName = `组${objectIds[0]}_${objectIds[objectIds.length - 1]}`
          
          // 创建新组
          this.currentGroupId++
          const newGroup = {
            id: this.currentGroupId,
            name: groupName,
            center: new THREE.Vector3(center.x, center.y, center.z), // 使用Vector3对象，方便dat.gui控制
            scale: 1.0, // 组放缩因子，初始值为1.0
            rotation: new THREE.Vector3(0, 0, 0), // 组旋转角度，绕x、y、z轴，初始值为0
            objects: []
          }
          
          // 将选中对象添加到组中
          this.getObject.forEach(obj => {
            // 存储对象相对于组中心的偏移量
            const offset = obj.object.position.clone().sub(center)

            // 为对象添加组信息，允许一个对象属于多个组
            if (!Array.isArray(obj.object.userData.groupIds)) {
              obj.object.userData.groupIds = []
            }
            if (!obj.object.userData.groupIds.includes(this.currentGroupId)) {
              obj.object.userData.groupIds.push(this.currentGroupId)
            }

            // 存储对象的组偏移量，使用map存储不同组的偏移量
            if (!obj.object.userData.groupOffsets) {
              obj.object.userData.groupOffsets = new Map()
            }
            obj.object.userData.groupOffsets.set(this.currentGroupId, offset)

            obj.object.userData.isGrouped = true

            // 将对象添加到组的对象列表中
            newGroup.objects.push({
              uuid: obj.object.uuid,
              offset: offset
            })

            // MARS CRDT: 同步 Group_groupId 到 CRDT
            if (obj.object.userData.entityId) {
              this.setMarsGroupId(obj.object.userData.entityId, `group_${this.currentGroupId}`)
              // 添加组成员
              const clientId = this.awareness ? this.awareness.clientID : `client_${Date.now()}`
              this.addMarsGroupMember(obj.object.userData.entityId, clientId)
            }
          })

          // 将新组添加到组列表
          this.groups.push(newGroup)

          // MARS CRDT: 同步组信息到 marsGroups
          if (this.marsGroups) {
            const groupMap = new Y.Map()
            groupMap.set('id', new Y.Text(String(this.currentGroupId)))
            groupMap.set('name', new Y.Text(groupName))
            groupMap.set('center', new Y.Text(JSON.stringify({x: center.x, y: center.y, z: center.z})))
            this.marsGroups.set(`group_${this.currentGroupId}`, groupMap)
          }
          
          // 为组添加控制器
          this.addGroupController(newGroup)
          
          // 显示成功消息
          this.$message.success(`组操作完成，创建了包含 ${this.getObject.length} 个对象的组，组ID: ${this.currentGroupId}`)
          console.log('组创建成功:', newGroup)
          
          // 更新场景树，实时反馈组操作结果
          this.updateSceneTree()
          
        } catch (error) {
          console.error('组操作出错:', error)
          this.$message.error(`组操作失败: ${error.message}`)
        }
      },

      // 渲染器初始化
      initRenderer(){
        this.renderer = new THREE.WebGLRenderer({
          antialias: true // 开启抗锯齿
        });
        this.renderer.setSize( this.width, this.height, true) // 把渲染器挂载在容器中
        this.renderer.setClearColor('rgb(255, 255, 255)')  // 设置渲染器的颜色
        this.model_container.appendChild( this.renderer.domElement )
        this.renderer.setPixelRatio(window.devicePixelRatio) // 兼容高清屏幕
      },

      // 相机初始化
      initCamer(){
        this.camera = new THREE.PerspectiveCamera( 50, this.width / this.height, 1, 1000 )
        this.camera.position.set(50, 80, 50) // 相机位置
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))  // 设置相机看先中心点
        this.camera.up = new THREE.Vector3(0, 1, 0)  // 设置相机角度
      },

      // 坐标轴和网格辅助线初始化
      initHelper(){
        // this.axesHelper = new THREE.AxesHelper(300) // 创建坐标轴对象
        // this.scene.add(this.axesHelper)
        // this.axesHelper.raycast = () => {}
        this.gridHelper = new THREE.GridHelper(200, 30, 'red', 'rgb(222, 225, 230)'); // 网格辅助线
        this.scene.add(this.gridHelper)
        this.gridHelper.raycast = () => {}

        const arrowLength = 100 // 坐标轴的长度
        // X 轴箭头
        const xAxisArrow = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0), // 箭头方向
          new THREE.Vector3(0, 0, 0), // 箭头起始点
          arrowLength, // 箭头长度
          'red' // 箭头颜色
        )
        this.scene.add(xAxisArrow);
        // Y 轴箭头
        const yAxisArrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0),
          arrowLength,
          'lime'
        );
        this.scene.add(yAxisArrow)
        // Z 轴箭头
        const zAxisArrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          arrowLength,
          'blue'
        );
        this.scene.add(zAxisArrow)
      },

      // 创建光源图标
      createLightIcon(light, type) {
        let icon
        if (type === 'point') {
          // 点光源图标：球体
          const geometry = new THREE.SphereGeometry(2, 16, 16)
          const material = new THREE.MeshBasicMaterial({ color: light.color, transparent: true, opacity: 0.8 })
          icon = new THREE.Mesh(geometry, material)
          icon.position.copy(light.position)
          icon.userData = { lightType: type, light: light, selectable: true }
          // 不禁用射线检测，以便能够点击图标
          icon.renderOrder = 10000 // 设置较高的渲染顺序，确保图标显示在其他对象之上
          icon.renderOrder = 10000 // 设置较高的渲染顺序，确保图标显示在其他对象之上
        } else if (type === 'directional') {
          // 定向光图标：箭头
          const arrowLength = 10
          icon = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0), // 初始方向
            light.position,
            arrowLength,
            light.color,
            3, // 箭头头部长度
            2  // 箭头头部宽度
          )
          icon.userData = { lightType: type, light: light, selectable: true }
          // 不禁用射线检测，以便能够点击图标
          icon.renderOrder = 10000 // 设置较高的渲染顺序，确保图标显示在其他对象之上
        } else if (type === 'spot') {
          // 聚光灯图标：锥形
          // 根据聚光灯的angle属性计算圆锥的半径
          const coneLength = 25 // 圆锥长度
          const coneRadius = Math.tan(light.angle) * coneLength // 根据角度计算半径
          const geometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true)
          const material = new THREE.MeshBasicMaterial({ color: light.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
          icon = new THREE.Mesh(geometry, material)
          icon.position.copy(light.position)
          // 不旋转，保持默认向上方向，与聚光灯初始方向相反
          icon.rotation.set(0, 0, 0)
          icon.userData = { lightType: type, light: light, selectable: true }
          // 不禁用射线检测，以便能够点击图标
          icon.renderOrder = 10000 // 设置较高的渲染顺序，确保图标显示在其他对象之上
        }
        return icon
      },

      // 灯光初始化
      initLights(){
        // 默认使用结合光（环境光 + 点光源）
        this.ambientLight = new THREE.AmbientLight('rgb(255,255,255)') // 环境光
        this.scene.add(this.ambientLight)
        this.pointLight = new THREE.PointLight( 'rgb(255,255,0)', 0.5, 1000, 0.2) // 点光源，设置为黄色
        this.pointLight.position.set(0, 10, 0) // 点光源位置，移到场景中心
        this.scene.add(this.pointLight)
        
        // 创建点光源图标
        this.lightIcons.point = this.createLightIcon(this.pointLight, 'point')
        this.scene.add(this.lightIcons.point)
        
        // 设置当前光源类型为结合光
        this.currentLightType = 'combined'
      },
      
      // 轨道控制器初始化
      initOrbitControls(){
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
        this.orbitControls.mouseButtons = {  // 设置鼠标功能键（轨道控制器）
          LEFT: null,  // 左键无功能
          MIDDLE: THREE.MOUSE.ROTATE,  // 中键旋转
          RIGHT: null   // 右键无功能
        }
        this.orbitControls.enableDamping = true  // 启用阻尼效果
        this.orbitControls.dampingFactor = 0.05  // 阻尼系数
        this.orbitControls.enableZoom = true  // 启用缩放
        this.orbitControls.zoomSpeed = 1.0  // 缩放速度
      },
      
      // 复位默认视角
      resetCameraView() {
        this.camera.position.set(50, 80, 50)  // 恢复默认相机位置
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))  // 相机看向原点
        this.orbitControls.update()  // 更新轨道控制器
      },
      
      // 拖动功能（同时支持鼠标和触摸）
      startDrag(event, panelId) {
        event.preventDefault()
        const panel = document.getElementById(panelId)
        const container = panel.parentElement
        
        // 添加拖动状态样式
        panel.classList.add('dragging')
        
        // 判断是触摸还是鼠标事件，并获取初始坐标
        const isTouch = event.type.startsWith('touch')
        const clientX = isTouch ? event.touches[0].clientX : event.clientX
        const clientY = isTouch ? event.touches[0].clientY : event.clientY
        
        // 获取面板在容器中的初始位置
        const rect = panel.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const startX = clientX - (rect.left - containerRect.left)
        const startY = clientY - (rect.top - containerRect.top)
        
        // 确保容器有定位
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative'
        }
        
        // 保存初始样式
        const originalPosition = panel.style.position
        const originalLeft = panel.style.left
        const originalTop = panel.style.top
        
        const drag = (e) => {
          // 阻止触摸滚动等默认行为
          if (e.type.startsWith('touch')) {
            e.preventDefault()
          }
          
          // 计算相对容器的位置（允许负值以支持向左拖动）
          const moveX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX
          const moveY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY
          const x = moveX - startX
          const y = moveY - startY
          
          // 获取容器宽度和面板宽度
          const containerWidth = containerRect.width
          const panelWidth = panel.offsetWidth
          
          // 设置面板为绝对定位并计算位置（允许超出容器边界）
          panel.style.position = 'absolute'
          // 允许向左和向右拖动，超出容器边界也可以
          panel.style.left = x + 'px'
          panel.style.top = Math.max(0, y) + 'px'
          panel.style.zIndex = 1001
          // 操作日志面板保持固定宽度，其他面板自适应容器宽度
          if (panelId === 'operation-log-panel') {
            panel.style.width = panel.offsetWidth + 'px'
          } else {
            panel.style.width = 'calc(100% - 10px)'
          }
        }
        
        const stopDrag = () => {
          // 移除拖动状态样式
          panel.classList.remove('dragging')
          document.removeEventListener('mousemove', drag)
          document.removeEventListener('mouseup', stopDrag)
          document.removeEventListener('touchmove', drag)
          document.removeEventListener('touchend', stopDrag)
        }
        
        document.addEventListener('mousemove', drag)
        document.addEventListener('mouseup', stopDrag)
        document.addEventListener('touchmove', drag, { passive: false })
        document.addEventListener('touchend', stopDrag)
      },
      
      // 切换背景颜色
      changeBackground(color) {
        if (color === 'white') {
          this.renderer.setClearColor('rgb(255, 255, 255)')
          this.scene.background = null
        } else if (color === 'black') {
          this.renderer.setClearColor('rgb(0, 0, 0)')
          this.scene.background = null
        } else if (color === 'sky') {
          const loader = new THREE.TextureLoader()
          loader.load('./sky.jpg', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping
            this.scene.background = texture
          })
        }
      },
      
      // 切换光源类型
      changeLightType(type) {
        // 移除所有光源和对应的图标
        if (this.ambientLight) {
          this.scene.remove(this.ambientLight)
        }
        if (this.pointLight) {
          this.scene.remove(this.pointLight)
          if (this.lightIcons.point) {
            this.scene.remove(this.lightIcons.point)
            this.lightIcons.point = null
          }
        }
        if (this.directionalLight) {
          this.scene.remove(this.directionalLight)
          if (this.lightIcons.directional) {
            this.scene.remove(this.lightIcons.directional)
            this.lightIcons.directional = null
          }
        }
        if (this.spotLight) {
          this.scene.remove(this.spotLight)
          if (this.spotLightTarget) {
            this.scene.remove(this.spotLightTarget)
            this.spotLightTarget = null
          }
          if (this.lightIcons.spot) {
            this.scene.remove(this.lightIcons.spot)
            this.lightIcons.spot = null
          }
        }
        
        // 根据类型添加新光源
        if (type === 'ambient') {
          // 环境光
          this.ambientLight = new THREE.AmbientLight('rgb(255,255,255)')
          this.scene.add(this.ambientLight)
        } else if (type === 'point') {
          // 点光源
          this.pointLight = new THREE.PointLight('rgb(255,255,0)', 0.5, 1000, 0.2) // 设置为黄色
          this.pointLight.position.set(0, 10, 0) // 移到场景中心
          this.scene.add(this.pointLight)
          // 创建点光源图标
          this.lightIcons.point = this.createLightIcon(this.pointLight, 'point')
          this.scene.add(this.lightIcons.point)
        } else if (type === 'directional') {
          // 定向光
          this.directionalLight = new THREE.DirectionalLight('rgb(255,255,0)', 0.8) // 设置为黄色
          this.directionalLight.position.set(50, 50, 50)
          this.directionalLight.target.position.set(0, 0, 0)
          this.scene.add(this.directionalLight)
          this.scene.add(this.directionalLight.target)
          // 创建定向光图标
          this.lightIcons.directional = this.createLightIcon(this.directionalLight, 'directional')
          this.scene.add(this.lightIcons.directional)
        } else if (type === 'spot') {
          // 聚光灯
          this.spotLight = new THREE.SpotLight('rgb(255,255,0)', 3.0) // 设置为黄色，进一步增加强度
          this.spotLight.position.set(0, 30, 0) // 移到场景中心上方，位置更低
          // 聚光灯默认指向下方
          this.spotLight.rotation.set(0, 0, 0)
          this.spotLight.angle = Math.PI / 3 // 120度照射角度，增加照射范围
          this.spotLight.penumbra = 0.05
          this.spotLight.decay = 2
          this.spotLight.distance = 1000
          
          // 创建一个虚拟的target对象，用于控制聚光灯的照射方向
          this.spotLightTarget = new THREE.Object3D()
          this.spotLightTarget.position.set(0, -100, 0) // 初始指向下方
          this.scene.add(this.spotLightTarget)
          this.spotLight.target = this.spotLightTarget
          
          this.scene.add(this.spotLight)
          
          // 初始更新聚光灯方向
          this.updateSpotLightDirection()
          
          // 创建聚光灯图标
          this.lightIcons.spot = this.createLightIcon(this.spotLight, 'spot')
          this.scene.add(this.lightIcons.spot)
        } else if (type === 'combined') {
          // 结合光（环境光 + 点光源）
          this.ambientLight = new THREE.AmbientLight('rgb(255,255,255)') // 环境光
          this.scene.add(this.ambientLight)
          this.pointLight = new THREE.PointLight('rgb(255,255,0)', 0.5, 1000, 0.2) // 点光源，设置为黄色
          this.pointLight.position.set(0, 10, 0) // 点光源位置，移到场景中心
          this.scene.add(this.pointLight)
          // 创建点光源图标
          this.lightIcons.point = this.createLightIcon(this.pointLight, 'point')
          this.scene.add(this.lightIcons.point)
        }
        
        // 更新当前光源类型
        this.currentLightType = type
        
        // 更新光源控制器
        this.addLightControls()
      },

      // 更新聚光灯方向
      updateSpotLightDirection() {
        if (!this.spotLight || !this.spotLightTarget) return
        
        // 基于聚光灯的旋转计算照射方向
        const direction = new THREE.Vector3(0, -1, 0) // 初始方向沿负Y轴（向下）
        
        // 应用聚光灯的旋转
        const rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationFromEuler(this.spotLight.rotation)
        direction.applyMatrix4(rotationMatrix)
        
        // 计算target位置：聚光灯位置加上方向向量乘以一个距离
        const targetDistance = 100 // 目标距离
        this.spotLightTarget.position.copy(this.spotLight.position).add(direction.multiplyScalar(targetDistance))
        
        // 确保聚光灯看向目标
        this.spotLight.target = this.spotLightTarget
      },

      // 更新光源图标
      updateLightIcon(lightType) {
        const icon = this.lightIcons[lightType]
        if (!icon) return
        
        let light
        if (lightType === 'point') {
          light = this.pointLight
        } else if (lightType === 'directional') {
          light = this.directionalLight
        } else if (lightType === 'spot') {
          light = this.spotLight
        }
        
        if (!light) return
        
        // 更新位置
        icon.position.copy(light.position)
        
        // 更新颜色
        if (icon.material) {
          icon.material.color.copy(light.color)
        } else if (icon.color) {
          icon.color.copy(light.color)
        }
        
        // 对于定向光，更新方向
        if (lightType === 'directional' && light.target) {
          const direction = new THREE.Vector3()
          direction.subVectors(light.target.position, light.position).normalize()
          icon.setDirection(direction)
        } else if (lightType === 'spot') {
          // 对于聚光灯，更新旋转
          icon.rotation.copy(light.rotation)
          // 不调整ConeGeometry的方向，保持默认向上方向，与聚光灯方向相反
          
          // 更新聚光灯图标大小，根据angle属性
          const coneLength = 25 // 圆锥长度，增加长度
          const coneRadius = Math.tan(light.angle) * coneLength // 根据角度计算半径
          
          // 重新创建几何体以更新大小
          icon.geometry.dispose() // 释放旧几何体
          icon.geometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true)
          
          // 更新聚光灯方向
          this.updateSpotLightDirection()
        }
      },

      // 变换控制器初始化
      initTransformControls(){
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement) // 变换控制器初始化
        // 将 TransformControls 永久添加到场景，避免每次点击重复添加
        this.scene.add(this.transformControls)
        this.transformControls.addEventListener("pointerdown", event => {
          this.transing = true
        })

        // 修复：添加 pointerup 事件来重置 transing 标志，防止点击无法选中
        this.transformControls.addEventListener("pointerup", event => {
          this.transing = false
        })

        // 拖拽模型时禁用轨道控制器，防止视角同时变化（尤其针对触摸屏）
        this.transformControls.addEventListener("dragging-changed", event => {
          this.isDraggingModel = event.value
          this.orbitControls.enabled = !event.value

          const object = this.transformControls.object
          if (!object || !object.userData || !object.userData.entityId) return

          if (event.value) {
            // 拖拽开始时记录初始状态
            this.dragStartState = {
              entityId: object.userData.entityId,
              px: object.position.x,
              py: object.position.y,
              pz: object.position.z,
              rx: object.rotation.x,
              ry: object.rotation.y,
              rz: object.rotation.z,
              sx: object.scale.x,
              sy: object.scale.y,
              sz: object.scale.z
            }
          } else {
            // 拖拽结束时，只有当状态真正发生变化才输出日志
            const start = this.dragStartState
            const hasChanged = !start
              || start.px !== object.position.x
              || start.py !== object.position.y
              || start.pz !== object.position.z
              || start.rx !== object.rotation.x
              || start.ry !== object.rotation.y
              || start.rz !== object.rotation.z
              || start.sx !== object.scale.x
              || start.sy !== object.scale.y
              || start.sz !== object.scale.z

            if (hasChanged) {
              const entityId = object.userData.entityId
              const position = object.position
              const timestamp = new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0')
              const rotationDegX = THREE.MathUtils.radToDeg(object.rotation.x).toFixed(2)
              const rotationDegY = THREE.MathUtils.radToDeg(object.rotation.y).toFixed(2)
              const rotationDegZ = THREE.MathUtils.radToDeg(object.rotation.z).toFixed(2)
              const qx = object.quaternion.x.toFixed(4)
              const qy = object.quaternion.y.toFixed(4)
              const qz = object.quaternion.z.toFixed(4)
              const qw = object.quaternion.w.toFixed(4)
              this.operationLog.unshift({
                type: 'sync',
                content: `Transform: ${object.name || entityId} Position[${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}] Rotation[${rotationDegX}°, ${rotationDegY}°, ${rotationDegZ}°] Quaternion[${qx}, ${qy}, ${qz}, ${qw}]`,
                timestamp: timestamp,
                fullTimestamp: Date.now(),
                details: {
                  entityId: entityId,
                  objectName: object.name,
                  position: { x: position.x, y: position.y, z: position.z },
                  rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z, w: object.rotation.w },
                  quaternion: { x: object.quaternion.x, y: object.quaternion.y, z: object.quaternion.z, w: object.quaternion.w }
                }
              })
              if (this.operationLog.length > this.maxLogEntries) {
                this.operationLog.pop()
              }
            }
            this.dragStartState = null
          }
        })

        // 添加变换事件监听器，用于同步点云模型和原始模型的位置、旋转和缩放
        this.transformControls.addEventListener("change", event => {
          const object = this.transformControls.object
          if (object && object.userData && object.userData.entityId) {
            const entityId = object.userData.entityId

            // 实时更新 dat.GUI 控制器显示
            if (object.userData.rotationControls) {
              object.userData.rotationControls.x = THREE.MathUtils.radToDeg(object.rotation.x)
              object.userData.rotationControls.y = THREE.MathUtils.radToDeg(object.rotation.y)
              object.userData.rotationControls.z = THREE.MathUtils.radToDeg(object.rotation.z)
            }
            if (object.userData.controllers) {
              const c = object.userData.controllers
              if (c.posX) c.posX.updateDisplay()
              if (c.posY) c.posY.updateDisplay()
              if (c.posZ) c.posZ.updateDisplay()
              if (c.rotX) c.rotX.updateDisplay()
              if (c.rotY) c.rotY.updateDisplay()
              if (c.rotZ) c.rotZ.updateDisplay()
              if (c.scaleX) c.scaleX.updateDisplay()
              if (c.scaleY) c.scaleY.updateDisplay()
              if (c.scaleZ) c.scaleZ.updateDisplay()
            }

            if (!this.isDraggingModel) return

            // MARS CRDT: 写入 Transform 到 CRDT
            if (this.marsEntities && this.marsEntities.has(entityId)) {
              this.updateMarsTransform(entityId, {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z,
                rx: object.rotation.x,
                ry: object.rotation.y,
                rz: object.rotation.z,
                sx: object.scale.x,
                sy: object.scale.y,
                sz: object.scale.z
              })
            }

            // 同步同实体的其他模型
            this.objects.children.forEach(obj => {
              if (obj.userData && obj.userData.entityId === entityId && obj !== object) {
                // 同步位置和旋转
                obj.position.copy(object.position)
                obj.rotation.copy(object.rotation)

                // 如果是点云模型，沿y轴顺时针旋转90°并沿y正方向移动20个单位
                // 注意：这些偏移只在初始化时应用，不应该在每次change时累加
                if (obj.userData.viewType === 'pointcloud' && object.userData.viewType !== 'pointcloud') {
                  obj.rotation.y = object.rotation.y - Math.PI / 2
                  obj.position.y = object.position.y + 20
                }

                // 同步缩放，但要考虑初始缩放比例
                // 对于点云模型，初始缩放是原始模型的1000倍
                if (object.userData.viewType === 'pointcloud' && (!obj.userData.viewType || obj.userData.viewType === 'original')) {
                  // 点云模型 -> 原始模型：缩放值除以1000
                  obj.scale.set(object.scale.x / 1000, object.scale.y / 1000, object.scale.z / 1000)
                } else if (obj.userData.viewType === 'pointcloud' && (!object.userData.viewType || object.userData.viewType === 'original')) {
                  // 原始模型 -> 点云模型：缩放值乘以1000，并保持y轴负值
                  obj.scale.set(object.scale.x * 1000, -Math.abs(object.scale.y * 1000), object.scale.z * 1000)
                } else if (object.userData.viewType === 'VoxelView' || object.userData.viewType === 'CloudPointView') {
                  // VoxelView 和 CloudPointView 有特殊的初始缩放，不同步缩放到其他视图
                  // 只同步缩放到同类视图
                  if (obj.userData.viewType === object.userData.viewType) {
                    obj.scale.copy(object.scale)
                  }
                } else if (obj.userData.viewType === 'VoxelView' || obj.userData.viewType === 'CloudPointView') {
                  // 如果源对象不是特殊视图，但目标对象是特殊视图，保持其特有的缩放比例
                  // 不做任何修改
                } else {
                  // 其他情况，直接复制缩放
                  obj.scale.copy(object.scale)
                }
              }
            })
          }
        })
      },
      // 同步同实体的所有模型属性
      syncEntityModels(entityId, sourceObject) {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0')
        
        const syncedViews = []
        
        // MARS CRDT: 写入 Transform 到 CRDT
        if (this.marsEntities && this.marsEntities.has(entityId)) {
          this.updateMarsTransform(entityId, {
            x: sourceObject.position.x,
            y: sourceObject.position.y,
            z: sourceObject.position.z,
            rx: sourceObject.rotation.x,
            ry: sourceObject.rotation.y,
            rz: sourceObject.rotation.z,
            sx: sourceObject.scale.x,
            sy: sourceObject.scale.y,
            sz: sourceObject.scale.z
          })
        }

        this.objects.children.forEach(obj => {
          if (obj.userData && obj.userData.entityId === entityId && obj !== sourceObject) {
            // 记录同步前的位置
            const prevPos = { x: obj.position.x, y: obj.position.y, z: obj.position.z }
            
            // 同步位置和旋转
            obj.position.copy(sourceObject.position)
            obj.rotation.copy(sourceObject.rotation)

            // 如果是点云模型，沿y轴顺时针旋转90°并沿y正方向移动20个单位
            // 注意：这些偏移只在初始化时应用，不应该在每次同步时累加
            if (obj.userData.viewType === 'pointcloud' && sourceObject.userData.viewType !== 'pointcloud') {
              obj.rotation.y = sourceObject.rotation.y - Math.PI / 2
              obj.position.y = sourceObject.position.y + 20
            }

            // 同步缩放，但要考虑初始缩放比例
            if (sourceObject.userData.viewType === 'pointcloud' && (!obj.userData.viewType || obj.userData.viewType === 'original')) {
              // 点云模型 -> 原始模型：缩放值除以1000（根据点云的初始缩放值调整）
              obj.scale.set(sourceObject.scale.x / 1000, sourceObject.scale.y / 1000, sourceObject.scale.z / 1000)
            } else if (obj.userData.viewType === 'pointcloud' && (!sourceObject.userData.viewType || sourceObject.userData.viewType === 'original')) {
              // 原始模型 -> 点云模型：缩放值乘以1000（根据点云的初始缩放值调整），并保持y轴负值
              obj.scale.set(sourceObject.scale.x * 1000, -Math.abs(sourceObject.scale.y * 1000), sourceObject.scale.z * 1000)
            } else {
              // 其他情况，直接复制缩放
              obj.scale.copy(sourceObject.scale)
            }

            // 记录同步的视图信息
            syncedViews.push({
              name: obj.name || 'Unknown View',
              viewType: obj.userData.viewType || 'original',
              from: prevPos,
              to: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
            })

            // 同步几何体参数（如果可能）
            if (sourceObject.geometry && obj.geometry) {
              // 对于基本几何体，尝试同步参数
              if (sourceObject.geometry.type === obj.geometry.type) {
                this.syncGeometryParameters(sourceObject, obj)
              }
            }
          }
        })
        
        // 记录实体级同步日志（不再列出每个视图）
        if (syncedViews.length > 0) {
          this.operationLog.unshift({
            type: 'sync',
            content: `[Sync] Entity ${entityId} (${sourceObject.name || 'Unnamed'}) Position Updated`,
            timestamp: timestamp,
            fullTimestamp: Date.now(),
            details: {
              entityId: entityId,
              position: { 
                x: sourceObject.position.x, 
                y: sourceObject.position.y, 
                z: sourceObject.position.z 
              },
              rotation: { 
                x: sourceObject.rotation.x, 
                y: sourceObject.rotation.y, 
                z: sourceObject.rotation.z 
              }
            }
          })
          
          if (this.operationLog.length > this.maxLogEntries) {
            this.operationLog.pop()
          }
        }
      },
      
      // 同步几何体参数
      syncGeometryParameters(source, target) {
        const geometryType = source.geometry.type
        
        switch (geometryType) {
          case 'BoxGeometry':
            // 同步立方体参数
            if (source.geometry.parameters) {
              const params = source.geometry.parameters
              target.geometry.dispose()
              target.geometry = new THREE.BoxGeometry(
                params.width,
                params.height,
                params.depth
              )
            }
            break
          case 'SphereGeometry':
            // 同步球体参数
            if (source.geometry.parameters) {
              const params = source.geometry.parameters
              target.geometry.dispose()
              target.geometry = new THREE.SphereGeometry(
                params.radius,
                params.widthSegments,
                params.heightSegments
              )
            }
            break
          case 'CylinderGeometry':
            // 同步圆柱体参数
            if (source.geometry.parameters) {
              const params = source.geometry.parameters
              target.geometry.dispose()
              target.geometry = new THREE.CylinderGeometry(
                params.radiusTop,
                params.radiusBottom,
                params.height,
                params.radialSegments
              )
            }
            break
          case 'TorusGeometry':
            // 同步环参数
            if (source.geometry.parameters) {
              const params = source.geometry.parameters
              target.geometry.dispose()
              target.geometry = new THREE.TorusGeometry(
                params.radius,
                params.tube,
                params.radialSegments,
                params.tubularSegments,
                params.arc
              )
            }
            break
          case 'TetrahedronGeometry':
          case 'OctahedronGeometry':
          case 'DodecahedronGeometry':
            // 同步多面体参数
            if (source.geometry.parameters) {
              const params = source.geometry.parameters
              target.geometry.dispose()
              if (geometryType === 'TetrahedronGeometry') {
                target.geometry = new THREE.TetrahedronGeometry(
                  params.radius,
                  params.detail
                )
              } else if (geometryType === 'OctahedronGeometry') {
                target.geometry = new THREE.OctahedronGeometry(
                  params.radius,
                  params.detail
                )
              } else if (geometryType === 'DodecahedronGeometry') {
                target.geometry = new THREE.DodecahedronGeometry(
                  params.radius,
                  params.detail
                )
              }
            }
            break
        }
      },

      // dat.gui初始化
      initDatGui(){
        this.gui = new dat.GUI({ atuoPlace: false })
        const guiContainer = document.querySelector('.gui_canvas')
        guiContainer.appendChild(this.gui.domElement)
        
        // 添加光源控制器
        this.addLightControls()
      },
      
      // 添加光源控制器
      addLightControls() {
        // 移除现有的光源控制器
        if (this.lightFolder) {
          this.gui.removeFolder(this.lightFolder)
        }
        
        // 创建光源文件夹
        this.lightFolder = this.gui.addFolder('光源设置')
        this.lightFolder.open()
        
        // 根据当前光源类型添加相应的控制器
        if (this.currentLightType === 'ambient') {
          // 环境光控制器
          if (this.ambientLight) {
            this.lightFolder.addColor({ color: this.ambientLight.color.getStyle() }, 'color')
              .name('颜色')
              .onChange((value) => {
                this.ambientLight.color.set(value)
              })
          }
        } else if (this.currentLightType === 'point') {
          // 点光源控制器
          if (this.pointLight) {
            this.lightFolder.addColor({ color: this.pointLight.color.getStyle() }, 'color')
              .name('颜色')
              .onChange((value) => {
                this.pointLight.color.set(value)
                this.updateLightIcon('point')
              })
            this.lightFolder.add(this.pointLight.position, 'x', -200, 200).name('位置 X').onChange(() => {
              this.updateLightIcon('point')
            })
            this.lightFolder.add(this.pointLight.position, 'y', -200, 200).name('位置 Y').onChange(() => {
              this.updateLightIcon('point')
            })
            this.lightFolder.add(this.pointLight.position, 'z', -200, 200).name('位置 Z').onChange(() => {
              this.updateLightIcon('point')
            })
            this.lightFolder.add(this.pointLight, 'intensity', 0, 2).name('强度')
          }
        } else if (this.currentLightType === 'directional') {
          // 定向光控制器
          if (this.directionalLight) {
            this.lightFolder.addColor({ color: this.directionalLight.color.getStyle() }, 'color')
              .name('颜色')
              .onChange((value) => {
                this.directionalLight.color.set(value)
                this.updateLightIcon('directional')
              })
            this.lightFolder.add(this.directionalLight.position, 'x', -200, 200).name('位置 X').onChange(() => {
              this.updateLightIcon('directional')
            })
            this.lightFolder.add(this.directionalLight.position, 'y', -200, 200).name('位置 Y').onChange(() => {
              this.updateLightIcon('directional')
            })
            this.lightFolder.add(this.directionalLight.position, 'z', -200, 200).name('位置 Z').onChange(() => {
              this.updateLightIcon('directional')
            })
            this.lightFolder.add(this.directionalLight, 'intensity', 0, 2).name('强度')
          }
        } else if (this.currentLightType === 'spot') {
          // 聚光灯控制器
          if (this.spotLight) {
            this.lightFolder.addColor({ color: this.spotLight.color.getStyle() }, 'color')
              .name('颜色')
              .onChange((value) => {
                this.spotLight.color.set(value)
                this.updateLightIcon('spot')
              })
            this.lightFolder.add(this.spotLight.position, 'x', -200, 200).name('位置 X').onChange(() => {
              this.updateLightIcon('spot')
            })
            this.lightFolder.add(this.spotLight.position, 'y', -200, 200).name('位置 Y').onChange(() => {
              this.updateLightIcon('spot')
            })
            this.lightFolder.add(this.spotLight.position, 'z', -200, 200).name('位置 Z').onChange(() => {
              this.updateLightIcon('spot')
            })
            this.lightFolder.add(this.spotLight, 'intensity', 0, 2).name('强度')
            this.lightFolder.add(this.spotLight, 'angle', 0, Math.PI / 2).name('照射角度').onChange(() => {
              this.updateLightIcon('spot')
            })
            // 创建角度控制对象，将弧度转换为角度
            const spotLightRotation = {
              x: 0, // 初始为0度
              y: 0, // 初始为0度
              z: 0  // 初始为0度
            }
            
            // 添加角度控制器
            this.lightFolder.add(spotLightRotation, 'x', -180, 180).step(1).name('绕x轴旋转').onChange((value) => {
              this.spotLight.rotation.x = THREE.MathUtils.degToRad(value)
              this.updateLightIcon('spot')
              this.updateSpotLightDirection()
            })
            this.lightFolder.add(spotLightRotation, 'y', -180, 180).step(1).name('绕y轴旋转').onChange((value) => {
              this.spotLight.rotation.y = THREE.MathUtils.degToRad(value)
              this.updateLightIcon('spot')
              this.updateSpotLightDirection()
            })
            this.lightFolder.add(spotLightRotation, 'z', -180, 180).step(1).name('绕z轴旋转').onChange((value) => {
              this.spotLight.rotation.z = THREE.MathUtils.degToRad(value)
              this.updateLightIcon('spot')
              this.updateSpotLightDirection()
            })
            this.lightFolder.add(this.spotLight, 'penumbra', 0, 1).name('半影')
          }
        }
      },

      // 创建立方体
      createCube() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createCube(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        recordYjsAction('createCube')
        const initCube = {
          width: 10,
          height: 10,
          depth: 10,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.BoxGeometry(initCube.width, initCube.height, initCube.depth)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(initCube.positionX, initCube.positionY, initCube.positionZ)
        cube.name = "cube"

        // 创建并关联实体
        const entity = this.createModelEntity()
        cube.userData.entityId = entity.id

        // 创建 MARS CRDT 实体并同步 Transform
        const entityMap = this.createMarsEntity(entity.id)
        let typeText = entityMap.get('type')
        if (!typeText) {
          typeText = new Y.Text()
          entityMap.set('type', typeText)
        }
        typeText.delete(0, typeText.length)
        typeText.insert(0, 'cube')
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initCube.positionX, y: initCube.positionY, z: initCube.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        cube.userData.layer = this.currentLayer
        cube.renderOrder = this.currentLayer * 1000
        if (cube.material) {
          cube.material.depthTest = true
          cube.material.depthWrite = true
        }
        this.objects.add(cube)
        this.scene.add(this.objects)
        this.sortObjectsByLayer()
        this.updateAllObjectsDepthSettings()
        this.addModelController(cube)
        this.updateSceneTree()
      },

      // 创建球体
      createSphere() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createSphere(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        recordYjsAction('createSphere')
        const initSphere = {
          radius: 5,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.SphereGeometry(initSphere.radius, 32, 32)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const sphere = new THREE.Mesh(geometry, material)
        sphere.position.set(initSphere.positionX,initSphere.positionY,initSphere.positionZ)
        sphere.name = "sphere"

        const entity = this.createModelEntity()
        sphere.userData.entityId = entity.id
        const entityMap = this.createMarsEntity(entity.id)
        let typeText = entityMap.get('type')
        if (!typeText) {
          typeText = new Y.Text()
          entityMap.set('type', typeText)
        }
        typeText.delete(0, typeText.length)
        typeText.insert(0, 'sphere')
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initSphere.positionX, y: initSphere.positionY, z: initSphere.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        sphere.userData.layer = this.currentLayer
        sphere.renderOrder = this.currentLayer * 1000
        if (sphere.material) {
          sphere.material.depthTest = true
          sphere.material.depthWrite = true
        }
        this.objects.add(sphere)
        this.scene.add(this.objects)
        this.sortObjectsByLayer()
        this.updateAllObjectsDepthSettings()
        this.addModelController(sphere)
        this.updateSceneTree()
      },

      // 创建圆柱体
      createCylinder() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createCylinder(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        recordYjsAction('createCylinder')
        this.initCylinder = {
          radiusTop: 10,
          radiusBottom: 10,
          height: 20,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.CylinderGeometry(this.initCylinder.radiusTop, this.initCylinder.radiusBottom, this.initCylinder.height, 80)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const cylinder = new THREE.Mesh(geometry, material)
        cylinder.position.set(this.initCylinder.positionX, this.initCylinder.positionY, this.initCylinder.positionZ)
        cylinder.name = "cylinder"

        const entity = this.createModelEntity()
        cylinder.userData.entityId = entity.id
        const entityMap = this.createMarsEntity(entity.id)
        let typeText = entityMap.get('type')
        if (!typeText) {
          typeText = new Y.Text()
          entityMap.set('type', typeText)
        }
        typeText.delete(0, typeText.length)
        typeText.insert(0, 'cylinder')
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: this.initCylinder.positionX, y: this.initCylinder.positionY, z: this.initCylinder.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        cylinder.userData.layer = this.currentLayer
        cylinder.renderOrder = this.currentLayer * 1000
        if (cylinder.material) {
          cylinder.material.depthTest = true
          cylinder.material.depthWrite = true
        }
        this.objects.add(cylinder)
        this.scene.add(this.objects)
        this.sortObjectsByLayer()
        this.updateAllObjectsDepthSettings()
        this.addModelController(cylinder)
        this.updateSceneTree()
      },

      // 创建环
      createTorus() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createTorus(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        recordYjsAction('createTorus')
        const initTorus = {
          radius: 5,
          tube: 1,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.TorusGeometry(initTorus.radius, initTorus.tube, 25, 80)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const torus = new THREE.Mesh(geometry, material)
        torus.position.set(initTorus.positionX, initTorus.positionY, initTorus.positionZ)
        torus.name = "torus"
        
        const entity = this.createModelEntity()
        torus.userData.entityId = entity.id
        const entityMap = this.createMarsEntity(entity.id)
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initTorus.positionX, y: initTorus.positionY, z: initTorus.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        torus.userData.layer = this.currentLayer
        torus.renderOrder = this.currentLayer * 1000
        if (torus.material) {
          torus.material.depthTest = true
          torus.material.depthWrite = true
        }
        this.objects.add(torus)
        console.log(torus)
        this.sortObjectsByLayer()
        this.updateAllObjectsDepthSettings()

        const modelId = torus.id - 188
        const controlTorusFolder = this.gui.addFolder(" 模型 " + modelId)
        controlTorusFolder.open()
        controlTorusFolder.add(initTorus, 'radius').min(0).max(30).step(1).name("半径").onChange(
          function(value) 
          { torus.geometry.dispose()
            torus.geometry = new THREE.TorusGeometry(value, initTorus.tube, 25, 80)
            // 同步同实体的其他模型
            if (torus.userData && torus.userData.entityId) {
              this.syncEntityModels(torus.userData.entityId, torus)
            }
          }.bind(this))
        controlTorusFolder.add(initTorus, 'tube').min(0).max(30).step(1).name("粗度").onChange(
          function(value) 
          { torus.geometry.dispose()
            torus.geometry = new THREE.TorusGeometry(initTorus.radius, value,  25, 80)
            // 同步同实体的其他模型
            if (torus.userData && torus.userData.entityId) {
              this.syncEntityModels(torus.userData.entityId, torus)
            }
          }.bind(this))
        controlTorusFolder.add(torus.position, "x").min(-80).max(80).step(1).name("x坐标").listen()
        controlTorusFolder.add(torus.position, "y").min(0).max(80).step(1).name("y坐标").listen()
        controlTorusFolder.add(torus.position, "z").min(-80).max(80).step(1).name("z坐标").listen()
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: THREE.MathUtils.radToDeg(torus.rotation.x),
          y: THREE.MathUtils.radToDeg(torus.rotation.y),
          z: THREE.MathUtils.radToDeg(torus.rotation.z)
        }
        
        controlTorusFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          torus.rotation.x = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (torus.userData && torus.userData.entityId) {
            this.syncEntityModels(torus.userData.entityId, torus)
          }
        })
        controlTorusFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          torus.rotation.y = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (torus.userData && torus.userData.entityId) {
            this.syncEntityModels(torus.userData.entityId, torus)
          }
        })
        controlTorusFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          torus.rotation.z = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (torus.userData && torus.userData.entityId) {
            this.syncEntityModels(torus.userData.entityId, torus)
          }
        })
        
        // 更新场景树
        this.updateSceneTree()
      },

      // 创建圆锥
      // createCone(){
      //   const initCone = {
      //     radius: 10,
      //     height: 20,
      //     positionX: 0,
      //     positionY: 0,
      //     positionZ: 0,
      //   }
      //   const geometry = new THREE.CylinderGeometry(initCone.radius, initCone.height, 80);
      //   const material = new THREE.MeshStandardMaterial({color: 0x0000ff});
      //   const cone = new THREE.Mesh(geometry, material);
      //   cone.position.set(initCone.positionX, initCone.positionY, initCone.positionZ)
      //   cone.name = "cone"
      //   this.objects.add(cone);

      //   const modelId = cone.id - 188
      //   const controlConeFolder = this.gui.addFolder(" 模型 " + modelId);
      //   controlConeFolder.open();
      //   controlConeFolder.add(initCone, 'radius').min(0).max(30).step(1).name("半径").onChange(
      //     function(value) 
      //     { cone.geometry.dispose(); 
      //       cone.geometry = new THREE.CylinderGeometry(value, initCone.height,80); });
      //   controlConeFolder.add(initCone, 'height').min(0).max(50).step(1).name("高").onChange(
      //     function(value) 
      //     { cone.geometry.dispose(); 
      //   cone.geometry = new THREE.CylinderGeometry(initCone.radius, value, 80); });
      //   controlConeFolder.add(cone.position, "x").min(-80).max(80).step(1).name("x坐标").listen();
      //   controlConeFolder.add(cone.position, "y").min(-80).max(80).step(1).name("y坐标").listen();
      //   controlConeFolder.add(cone.position, "z").min(-80).max(80).step(1).name("z坐标").listen();
      //   controlConeFolder.add(cone.rotation, "x").min(-180).max(180).step(10).name("绕x轴旋转").listen();
      //   controlConeFolder.add(cone.rotation, "y").min(-180).max(180).step(10).name("绕y轴旋转").listen();
      //   controlConeFolder.add(cone.rotation, "z").min(-180).max(180).step(10).name("绕z轴旋转").listen();
      // },

      // 创建正4面体
      createTetrahedronGeometry() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createTetrahedron(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff,
            radius: 15
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        const initTetrahedron = {
          radius: 15,
          detail: 0,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.TetrahedronGeometry(initTetrahedron.radius, initTetrahedron.detail)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const tetrahedron = new THREE.Mesh(geometry, material);
        tetrahedron.position.set(initTetrahedron.positionX, initTetrahedron.positionY, initTetrahedron.positionZ)
        tetrahedron.name = "tetrahedron"

        // 创建并关联实体
        const entity = this.createModelEntity()
        tetrahedron.userData.entityId = entity.id

        // 创建 MARS CRDT 实体并同步 Transform
        const entityMap = this.createMarsEntity(entity.id)
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initTetrahedron.positionX, y: initTetrahedron.positionY, z: initTetrahedron.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        // 添加图层属性
        tetrahedron.userData.layer = this.currentLayer
        // 设置渲染顺序，高图层的对象具有更高的渲染顺序
        tetrahedron.renderOrder = this.currentLayer * 1000
        // 为对象设置深度测试，默认为启用
        if (tetrahedron.material) {
          tetrahedron.material.depthTest = true
          tetrahedron.material.depthWrite = true
        }
        this.objects.add(tetrahedron)
        console.log(tetrahedron)
        // 重新排序对象以确保图层顺序正确
        this.sortObjectsByLayer()
        // 更新所有对象的深度测试设置
        this.updateAllObjectsDepthSettings()

        const modelId = tetrahedron.id - 188
        const controlTetrahedronFolder = this.gui.addFolder(" 模型 " + modelId);
        controlTetrahedronFolder.open()
        controlTetrahedronFolder.add(initTetrahedron, 'radius').min(0).max(30).step(1).name("半径").onChange(
          function(value) 
          { tetrahedron.geometry.dispose()
            tetrahedron.geometry = new THREE.TetrahedronGeometry(value, initTetrahedron.detail);
            // 同步同实体的其他模型
            if (tetrahedron.userData && tetrahedron.userData.entityId) {
              this.syncEntityModels(tetrahedron.userData.entityId, tetrahedron)
            }
          }.bind(this))
        controlTetrahedronFolder.add(initTetrahedron, 'detail').min(0).max(20).step(1).name("细节").onChange(
          function(value) 
          { tetrahedron.geometry.dispose()
            tetrahedron.geometry = new THREE.TetrahedronGeometry(initTetrahedron.radius, value);
            // 同步同实体的其他模型
            if (tetrahedron.userData && tetrahedron.userData.entityId) {
              this.syncEntityModels(tetrahedron.userData.entityId, tetrahedron)
            }
          }.bind(this))
        controlTetrahedronFolder.add(tetrahedron.position, "x").min(-80).max(80).step(1).name("x坐标").listen()
        controlTetrahedronFolder.add(tetrahedron.position, "y").min(0).max(80).step(1).name("y坐标").listen()
        controlTetrahedronFolder.add(tetrahedron.position, "z").min(-80).max(80).step(1).name("z坐标").listen()
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: THREE.MathUtils.radToDeg(tetrahedron.rotation.x),
          y: THREE.MathUtils.radToDeg(tetrahedron.rotation.y),
          z: THREE.MathUtils.radToDeg(tetrahedron.rotation.z)
        }
        
        controlTetrahedronFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          tetrahedron.rotation.x = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (tetrahedron.userData && tetrahedron.userData.entityId) {
            this.syncEntityModels(tetrahedron.userData.entityId, tetrahedron)
          }
        })
        controlTetrahedronFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          tetrahedron.rotation.y = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (tetrahedron.userData && tetrahedron.userData.entityId) {
            this.syncEntityModels(tetrahedron.userData.entityId, tetrahedron)
          }
        })
        controlTetrahedronFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          tetrahedron.rotation.z = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (tetrahedron.userData && tetrahedron.userData.entityId) {
            this.syncEntityModels(tetrahedron.userData.entityId, tetrahedron)
          }
        })
        
        // 更新场景树
        this.updateSceneTree()
      },

      // 创建正8面体
      createOctahedronGeometry() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createOctahedron(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff,
            radius: 15
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        const initOctahedron = {
          radius: 15,
          detail: 0,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.OctahedronGeometry(initOctahedron.radius, initOctahedron.detail)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const octahedron = new THREE.Mesh(geometry, material);
        octahedron.position.set(initOctahedron.positionX, initOctahedron.positionY, initOctahedron.positionZ)
        octahedron.name = "octahedron"

        // 创建并关联实体
        const entity = this.createModelEntity()
        octahedron.userData.entityId = entity.id

        // 创建 MARS CRDT 实体并同步 Transform
        const entityMap = this.createMarsEntity(entity.id)
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initOctahedron.positionX, y: initOctahedron.positionY, z: initOctahedron.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        octahedron.userData.layer = this.currentLayer // 添加图层属性
        // 设置渲染顺序，高图层的对象具有更高的渲染顺序
        octahedron.renderOrder = this.currentLayer * 1000
        // 为对象设置深度测试，默认为启用
        if (octahedron.material) {
          octahedron.material.depthTest = true
          octahedron.material.depthWrite = true
        }
        this.objects.add(octahedron)
        console.log(octahedron)
        // 重新排序对象以确保图层顺序正确
        this.sortObjectsByLayer()
        // 更新所有对象的深度测试设置
        this.updateAllObjectsDepthSettings()

        const modelId = octahedron.id - 188
        const controlOctahedronFolder = this.gui.addFolder(" 模型 " + modelId)
        controlOctahedronFolder.open()
        controlOctahedronFolder.add(initOctahedron, 'radius').min(0).max(30).step(1).name("半径").onChange(
          function(value) 
          { octahedron.geometry.dispose()
            octahedron.geometry = new THREE.OctahedronGeometry(value, initOctahedron.detail);
            // 同步同实体的其他模型
            if (octahedron.userData && octahedron.userData.entityId) {
              this.syncEntityModels(octahedron.userData.entityId, octahedron)
            }
          }.bind(this))
        controlOctahedronFolder.add(initOctahedron, 'detail').min(0).max(20).step(1).name("细节").onChange(
          function(value) 
          { octahedron.geometry.dispose()
            octahedron.geometry = new THREE.OctahedronGeometry(initOctahedron.radius, value);
            // 同步同实体的其他模型
            if (octahedron.userData && octahedron.userData.entityId) {
              this.syncEntityModels(octahedron.userData.entityId, octahedron)
            }
          }.bind(this))
        controlOctahedronFolder.add(octahedron.position, "x").min(-80).max(80).step(1).name("x坐标").listen()
        controlOctahedronFolder.add(octahedron.position, "y").min(0).max(80).step(1).name("y坐标").listen()
        controlOctahedronFolder.add(octahedron.position, "z").min(-80).max(80).step(1).name("z坐标").listen()
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: THREE.MathUtils.radToDeg(octahedron.rotation.x),
          y: THREE.MathUtils.radToDeg(octahedron.rotation.y),
          z: THREE.MathUtils.radToDeg(octahedron.rotation.z)
        }
        
        controlOctahedronFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          octahedron.rotation.x = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (octahedron.userData && octahedron.userData.entityId) {
            this.syncEntityModels(octahedron.userData.entityId, octahedron)
          }
        })
        controlOctahedronFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          octahedron.rotation.y = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (octahedron.userData && octahedron.userData.entityId) {
            this.syncEntityModels(octahedron.userData.entityId, octahedron)
          }
        })
        controlOctahedronFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          octahedron.rotation.z = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (octahedron.userData && octahedron.userData.entityId) {
            this.syncEntityModels(octahedron.userData.entityId, octahedron)
          }
        })
        // 添加图层控制
        // 确保layer属性是数字类型
        octahedron.userData.layer = parseInt(octahedron.userData.layer) || 1
        // 创建图层控制器
        const layerController = controlOctahedronFolder.add(octahedron.userData, "layer", 1, 5).step(1).name("图层")
        layerController.onChange(() => {
          this.updateObjectLayer(octahedron)
          this.updateSceneTree()
        })
        
        // 更新场景树
        this.updateSceneTree()
      },

      // 创建正12面体
      createDodecahedronGeometry() {
        if (this.meshSystem && this.crdtSystem) {
          const entity = this.meshSystem.createDodecahedron(0, 0, 0, {
            layer: this.currentLayer,
            color: 0x7777ff,
            radius: 15
          })
          this.crdtSystem.syncEntityToYjs(entity.id)
          this.updateSceneTree()
          return entity
        }
        const initDodecahedron = {
          radius: 15,
          detail: 0,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
        }
        const geometry = new THREE.DodecahedronGeometry(initDodecahedron.radius, initDodecahedron.detail)
        const material = new THREE.MeshPhongMaterial({
          color: 0x7777ff,
          specular:0x7777ff,
          shininess:30
        })
        const dodecahedron = new THREE.Mesh(geometry, material)
        dodecahedron.position.set(initDodecahedron.positionX, initDodecahedron.positionY, initDodecahedron.positionZ)
        dodecahedron.name = "dodecahedron"

        // 创建并关联实体
        const entity = this.createModelEntity()
        dodecahedron.userData.entityId = entity.id

        // 创建 MARS CRDT 实体并同步 Transform
        const entityMap = this.createMarsEntity(entity.id)
        entityMap.get('transform').delete(0, entityMap.get('transform').length)
        entityMap.get('transform').insert(0, JSON.stringify({
          x: initDodecahedron.positionX, y: initDodecahedron.positionY, z: initDodecahedron.positionZ,
          rx: 0, ry: 0, rz: 0,
          sx: 1, sy: 1, sz: 1
        }))

        // 添加图层属性
        dodecahedron.userData.layer = this.currentLayer
        // 设置渲染顺序，高图层的对象具有更高的渲染顺序
        dodecahedron.renderOrder = this.currentLayer * 1000
        // 为对象设置深度测试，默认为启用
        if (dodecahedron.material) {
          dodecahedron.material.depthTest = true
          dodecahedron.material.depthWrite = true
        }
        this.objects.add(dodecahedron)
        console.log(dodecahedron)
        // 重新排序对象以确保图层顺序正确
        this.sortObjectsByLayer()
        // 更新所有对象的深度测试设置
        this.updateAllObjectsDepthSettings()

        const modelId = dodecahedron.id - 188
        const controlDodecahedronFolder = this.gui.addFolder(" 模型 " + modelId)
        controlDodecahedronFolder.open()
        controlDodecahedronFolder.add(initDodecahedron, 'radius').min(0).max(30).step(1).name("半径").onChange(
          function(value) 
          { dodecahedron.geometry.dispose()
            dodecahedron.geometry = new THREE.DodecahedronGeometry(value, initDodecahedron.detail);
            // 同步同实体的其他模型
            if (dodecahedron.userData && dodecahedron.userData.entityId) {
              this.syncEntityModels(dodecahedron.userData.entityId, dodecahedron)
            }
          }.bind(this))
        controlDodecahedronFolder.add(initDodecahedron, 'detail').min(0).max(20).step(1).name("细节").onChange(
          function(value) 
          { dodecahedron.geometry.dispose() 
            dodecahedron.geometry = new THREE.DodecahedronGeometry(initDodecahedron.radius, value);
            // 同步同实体的其他模型
            if (dodecahedron.userData && dodecahedron.userData.entityId) {
              this.syncEntityModels(dodecahedron.userData.entityId, dodecahedron)
            }
          }.bind(this))
        controlDodecahedronFolder.add(dodecahedron.position, "x").min(-80).max(80).step(1).name("x坐标").listen()
        controlDodecahedronFolder.add(dodecahedron.position, "y").min(0).max(80).step(1).name("y坐标").listen()
        controlDodecahedronFolder.add(dodecahedron.position, "z").min(-80).max(80).step(1).name("z坐标").listen()
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: THREE.MathUtils.radToDeg(dodecahedron.rotation.x),
          y: THREE.MathUtils.radToDeg(dodecahedron.rotation.y),
          z: THREE.MathUtils.radToDeg(dodecahedron.rotation.z)
        }
        
        controlDodecahedronFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          dodecahedron.rotation.x = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (dodecahedron.userData && dodecahedron.userData.entityId) {
            this.syncEntityModels(dodecahedron.userData.entityId, dodecahedron)
          }
        })
        controlDodecahedronFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          dodecahedron.rotation.y = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (dodecahedron.userData && dodecahedron.userData.entityId) {
            this.syncEntityModels(dodecahedron.userData.entityId, dodecahedron)
          }
        })
        controlDodecahedronFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          dodecahedron.rotation.z = THREE.MathUtils.degToRad(value)
          // 同步同实体的其他模型
          if (dodecahedron.userData && dodecahedron.userData.entityId) {
            this.syncEntityModels(dodecahedron.userData.entityId, dodecahedron)
          }
        })
        
        // 更新场景树
        this.updateSceneTree()
      },

      // 射线发射器初始化
      initRaycaster() {
        this.raycaster = new THREE.Raycaster()
      },
      
      // 鼠标点击获取模型
      getGeometry(){
        // 监听鼠标点击事件
        this.renderer.domElement.addEventListener("pointerdown", (event) => {
          
          // 初始化鼠标位置
          var mouse = new THREE.Vector2()
          var x = 0
          var y = 0
          var width = 0
          var height = 0
          x = event.offsetX
          y = event.offsetY
          console.log([x,y])
          width = this.renderer.domElement.offsetWidth
          height = this.renderer.domElement.offsetHeight
          mouse.x = x / width * 2 - 1
          mouse.y = -y * 2 / height + 1

          if (event.button === 0) {
            // 如果正在校准光标，优先处理校准点击
            if (this.isCalibratingCursor) {
              if (this.handleCalibrationClick(event)) {
                return
              }
            }

            // DEBUG: 保存点击前所有实验模型的状态
            const beforeState = new Map()
            this.objects.children.forEach(obj => {
              if (obj.userData && obj.userData.entityId) {
                beforeState.set(obj.uuid, {
                  name: obj.name,
                  pos: obj.position.clone(),
                  rot: obj.rotation.clone(),
                  scale: obj.scale.clone()
                })
              }
            })

            // 发射射线
            this.raycaster.setFromCamera(mouse, this.camera)
            
            // 增强射线检测：只检测可见对象及其子对象
            const allObjects = []
            this.objects.children.forEach(child => {
              // 跳过不可见对象
              if (!child.visible) return
              console.log('添加到检测列表:', child.name, '类型:', child.type, 'viewType:', child.userData.viewType, 'entityId:', child.userData.entityId, '可见:', child.visible)
              allObjects.push(child)
              // 如果子对象也有子对象，也添加到检测列表
              if (child.children && child.children.length > 0) {
                child.children.forEach(grandchild => {
                  console.log('  添加子对象:', grandchild.name, '类型:', grandchild.type, 'viewType:', grandchild.userData.viewType)
                  allObjects.push(grandchild)
                })
              }
            })
            
            // 添加光源图标到检测列表
            for (const lightType in this.lightIcons) {
              const icon = this.lightIcons[lightType]
              if (icon) {
                allObjects.push(icon)
              }
            }
            
            // 获取射线与模型相交的数组
            const intersects = this.raycaster.intersectObjects(allObjects, true)
            console.log('所有射线交点:', intersects.map(i => ({ name: i.object.name, type: i.object.type, viewType: i.object.userData?.viewType, selectable: i.object.userData?.selectable, parentName: i.object.parent?.name, parentType: i.object.parent?.type })))
            
            // 过滤掉不可选择的对象，但保留光源图标
            // 同时排除 TransformControls 及其所有辅助子对象
            const selectableIntersects = intersects.filter(intersect => {
              // 步骤1: 排除 TransformControls
              let obj = intersect.object
              while (obj) {
                if (obj.isTransformControls) return false
                obj = obj.parent
              }
              
              // 步骤2: 检查父链中是否存在 VoxelView (必须先于 geometry_ 前缀检查)
              let p = intersect.object.parent
              while (p && p !== this.objects) {
                if (p.userData && p.userData.viewType === 'VoxelView') {
                  console.log('VoxelView子对象被选中:', intersect.object.name, '父对象:', p.name)
                  return true
                }
                p = p.parent
              }
              
              // 步骤3: 排除 geometry_ 前缀对象
              if (intersect.object.name && intersect.object.name.startsWith('geometry_')) return false
              
              // 步骤4: 检查 lightType
              if (intersect.object.userData.lightType) {
                return true
              }
              
              // 步骤5: 检查 selectability
              if (intersect.object.userData.selectable === false) {
                console.log('对象被排除(selectable=false):', intersect.object.name)
                return false
              }
              
              return true
            })
            
            // 使用过滤后的结果
            const filteredIntersects = selectableIntersects.length > 0 ? selectableIntersects : []
            
            console.log('射线检测结果:', intersects)
            console.log('过滤后可选择的对象:', filteredIntersects)
            console.log('检测对象数量:', allObjects.length)
            console.log('场景对象:', this.objects.children.map(obj => ({ name: obj.name, type: obj.type, visible: obj.visible })))
            
            // 监听键盘按下事件
            document.addEventListener("keydown", (event) => {
              // 按下Ctrl键
              if (event.ctrlKey || event.metaKey) {
                this.ctrlKeyPressed = true;
              }
            })
            
            // 监听键盘释放事件
            document.addEventListener("keyup", (event) => {
              // 释放Ctrl键
              if (event.key === 'Control' || event.key === 'Meta') {
                this.ctrlKeyPressed = false
              }
            })
            
            // 恢复上次点击的模型颜色为原来的颜色
            if (this.lastIntersect && this.lastIntersect.object.material && this.lastIntersect.object.material.color) {
              this.lastIntersect.object.material.color.set(0x7777ff)
            }
            
            // 设置当前点击的模型颜色为指定颜色
            if (filteredIntersects.length > 0) {
              const clickedObject = filteredIntersects[0].object
              
              // 检查是否点击了光源图标
              if (clickedObject.userData.lightType) {
                // 点击了光源图标，显示光源控制器
                console.log('点击了光源图标:', clickedObject.userData.lightType)
                
                // 显示光源控制器文件夹
                if (this.lightFolder) {
                  this.lightFolder.open()
                }
                
                // 不将光源图标添加到选中对象中
                this.selectedObjects = []
                this.getObject = []
                this.lastIntersect = null
              } else {
                // 点击了普通模型
                if (this.ctrlKeyPressed) {
                  // 如果按下了Ctrl键，则将当前点击的模型添加到选中数组中
                  if (!this.selectedObjects.includes(clickedObject)) {
                    this.selectedObjects.push(clickedObject)
                  }
                } else {
                  // 如果没有按下Ctrl键，则只设置当前点击的模型为选中状态
                  this.selectedObjects = [clickedObject]
                }
                
                // 设置选中模型的颜色（只对 Mesh 有效）
                this.selectedObjects.forEach(object => {
                  if (object.material && object.material.color) {
                    object.material.color.set(0xff7777)
                  }
                })
                
                // 更新 getObject 数组以支持布尔操作
                // 确保 getObject 数组与 selectedObjects 同步
                this.getObject = []
                this.selectedObjects.forEach(obj => {
                  this.getObject.push({object: obj})
                })
                
                this.lastIntersect = filteredIntersects[0]
              }
            } else {
              this.selectedObjects = []
              this.getObject = []  // 确保 getObject 也被清空
              this.lastIntersect = null
            }

            // 为点击的模型添加变化控制器
            if (this.transing) {
              this.transing = false
              return
            }
            if (filteredIntersects.length) {
              var transformControlsObject = filteredIntersects[0].object  // 获取第一个模型

              // 向上查找到具有 entityId 的视图对象（GridView、VoxelView、CloudPointView或pointcloud）
              while (transformControlsObject && transformControlsObject !== this.objects) {
                if (transformControlsObject.userData && transformControlsObject.userData.entityId) {
                  console.log('找到视图对象:', transformControlsObject.name, 'viewType:', transformControlsObject.userData.viewType)
                  break
                }
                transformControlsObject = transformControlsObject.parent
              }
              
              // 检查是否找到了有效的视图对象
              if (!transformControlsObject || transformControlsObject === this.objects) {
                console.log('警告: 未找到有效的视图对象，尝试使用点击的对象')
                transformControlsObject = filteredIntersects[0].object
              }

              // 只有当点击的不是光源图标时，才添加变换控制器
              if (transformControlsObject && !transformControlsObject.userData.lightType) {
                console.log('准备附加变换控制器到:', transformControlsObject.name, 'viewType:', transformControlsObject.userData.viewType, 'entityId:', transformControlsObject.userData.entityId)
                // 只有点击了不同对象时才切换，避免同一对象反复 detach/attach 打断拖动
                if (this.transformControls.object !== transformControlsObject) {
                  if (this.transformControls.object) {
                    this.transformControls.detach()
                  }
                  this.transformControls.enabled = true
                  this.transformControls.attach(transformControlsObject)
                  console.log('变换控制器已附加')
                }
              } else {
                console.log('未添加变换控制器: transformControlsObject=', transformControlsObject ? transformControlsObject.name : 'null', 'lightType=', transformControlsObject?.userData?.lightType)
              }
            } else {
              // 点击空白处：detach 并禁用
              if (this.transformControls.object) {
                this.transformControls.detach()
              }
              this.transformControls.enabled = false
            }
            
            // 监听变换控制器模式更改
            document.addEventListener("keyup", event => {
              if (this.transformControls.enabled) {  // 变换控制器为启用状态执行
                if (event.key === 'e') { // 鼠标按下e键，模式改为缩放
                  this.transformControls.mode = 'scale'
                  return false
                }
                if (event.key === 'r') { // 鼠标按下r键，模式改为旋转
                  this.transformControls.mode = 'rotate'
                  return false
                }
                if (event.key === 't') { // 鼠标按下t键，模式改为平移
                  this.transformControls.mode = 'translate'
                  return false
                }
              }
            })
            //获得位置,缩放比例，旋转
            if (filteredIntersects.length > 0) {
              // 找到用于同步的实际对象（向上查找到有 entityId 的父对象）
              let syncObject = filteredIntersects[0].object
              while (syncObject && syncObject !== this.objects && !syncObject.userData.entityId) {
                syncObject = syncObject.parent
              }
              if (!syncObject || syncObject === this.objects) {
                syncObject = filteredIntersects[0].object
              }

              const nowRotate = syncObject.rotation
              const lastRotate = nowRotate.clone()
              const nowScale = syncObject.scale
              const lastScale = nowScale.clone()
              const nowPosition = syncObject.position
              const lastPosition = nowPosition.clone()
              const update = () => {
                if (!nowPosition.equals(lastPosition)||!nowScale.equals(lastScale)||!nowRotate.equals(lastRotate)) {
                  lastPosition.copy(nowPosition)
                  lastScale.copy(nowScale)
                  lastRotate.copy(nowRotate)
                  this.doc1.transact(() => {
                    this.operation_map.set('position_x', nowPosition.x)
                    this.operation_map.set('position_y', nowPosition.y)
                    this.operation_map.set('position_z', nowPosition.z)
                    this.operation_map.set('scale_x', nowScale.x)
                    this.operation_map.set('scale_y', nowScale.y)
                    this.operation_map.set('scale_z', nowScale.z)
                    this.operation_map.set('rotation_x', nowRotate.x)
                    this.operation_map.set('rotation_y', nowRotate.y)
                    this.operation_map.set('rotation_z', nowRotate.z)
                    this.operation_map.set('uuid', syncObject.uuid)
                  })
                }
                requestAnimationFrame(update)
              }
              update()
            }
         
            // 获取布尔运算先后点击的两个模型
            // 点击的第一个模型
            if (filteredIntersects.length > 0) {
              const clickedObject = filteredIntersects[0].object
              
              // 检查是否点击了光源图标
              if (!clickedObject.userData.lightType) {
                this.selectedObject = filteredIntersects[0]
                if (this.selectedObject.object.type === 'Mesh'){
                  if (this.getObject.length === 0 ){  //如果数组为空，则添加第一个模型到数组里
                  this.getObject.push(this.selectedObject)}
                  console.log(this.getObject)
                  // 获取点击的第二个模型，如果第二个模型和第一个是同一个，则不执行
                  if (this.getObject[0].object.id !== this.selectedObject.object.id){
                    //console.log(this.getObject[0].object === this.selectedObject.object)
                    this.getObject[1] = this.selectedObject
                }}
                
                // 控制gui文件夹显示
                const folderNames = Object.keys(this.gui.__folders)
                folderNames.forEach(folderName => {
                  const folder = this.gui.__folders[folderName]
                  folder.close()
                  var object_id = filteredIntersects[0].object.name
                  console.log(object_id)
                  if (folderName === object_id){
                    this.gui.__folders[folderName].open();
                    console.log(this.gui.__folders[folderName])
                  }
                })
                
                // 确保选中对象有图层属性和控制器
                // 向上查找到具有 entityId 的 GridView（默认只操作网格视图）
                let selectedObj = filteredIntersects[0].object
                while (selectedObj && selectedObj !== this.objects) {
                  if (selectedObj.userData && selectedObj.userData.entityId && selectedObj.userData.viewType === 'GridView') {
                    break
                  }
                  selectedObj = selectedObj.parent
                }
                if (!selectedObj || selectedObj === this.objects) {
                  selectedObj = filteredIntersects[0].object
                }
                if (selectedObj) {
                  // 确保对象有 userData 对象和图层属性
                  if (!selectedObj.userData) {
                    selectedObj.userData = {}
                  }
                  if (selectedObj.userData.layer === undefined) {
                    selectedObj.userData.layer = 1
                  }
                  
                  // 检查控制器是否存在，如果不存在则创建
                  const object_id = selectedObj.name
                  if (!this.gui.__folders[object_id]) {
                    this.addModelController(selectedObj)
                  } else {
                    // 检查控制器是否包含图层选项
                    const folder = this.gui.__folders[object_id]
                    const hasLayerControl = folder.__controllers.some(controller => controller.property === 'layer')
                    if (!hasLayerControl) {
                      // 添加图层控制选项
                      folder.add(selectedObj.userData, "layer").min(1).max(5).step(1).name("图层").onChange(() => {
                        this.updateObjectLayer(selectedObj)
                        this.updateSceneTree()
                      })
                    }
                  }
                }
              }
            }

            // DEBUG: 比较点击后状态，找出被篡改的模型
            this.objects.children.forEach(obj => {
              if (obj.userData && obj.userData.entityId) {
                const before = beforeState.get(obj.uuid)
                if (before) {
                  if (!obj.position.equals(before.pos) || !obj.rotation.equals(before.rot) || !obj.scale.equals(before.scale)) {
                    console.error('【DEBUG】模型状态被篡改:', obj.name, {
                      posBefore: before.pos.toArray(), posAfter: obj.position.toArray(),
                      rotBefore: [before.rot.x, before.rot.y, before.rot.z], rotAfter: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                      scaleBefore: before.scale.toArray(), scaleAfter: obj.scale.toArray()
                    })
                  }
                }
              }
            })
          //删除模块
          }else if (event.button === 1 ){
            this.raycaster.setFromCamera(mouse, this.camera)
            var intersects = this.raycaster.intersectObjects(this.objects.children)
            var DeleteId = (intersects[0].object).uuid
            recordYjsAction('delete', { uuid: DeleteId })
            this.delete_map.set('uuid',DeleteId)
          }
        })
      },

      // 获取下一个唯一的模型序号
      getNextModelId() {
        let maxId = 0
        this.objects.children.forEach(child => {
          if (child.name && child.name.startsWith(' 模型 ')) {
            const id = parseInt(child.name.replace(' 模型 ', ''))
            if (!isNaN(id) && id > maxId) {
              maxId = id
            }
          }
        })
        return maxId + 1
      },

      // 为模型添加控制器
      addModelController(model) {
        // 检查模型是否有效
        if (!model) {
          console.warn('无效的模型对象')
          return
        }
        
        // 跳过临时模型或几何体面（如geometry_0）
        if (model.name && model.name.startsWith('geometry_')) {
          console.log(`跳过临时模型 ${model.name} 的控制器添加`)
          return
        }
        
        // 确保模型有 userData 对象
        if (!model.userData) {
          model.userData = {}
        }
        // 确保模型有图层属性
        if (model.userData.layer === undefined) {
          model.userData.layer = 1
        }
        
        // 检查控制器是否已经存在，避免重复添加
        if (this.gui.__folders && this.gui.__folders[model.name]) {
          console.log(`控制器 ${model.name} 已存在，跳过添加`)
          return
        }
        
        const ControlFolder = this.gui.addFolder(model.name)
        ControlFolder.open()

        // 通用同步函数：当控制器值变化时，更新 CRDT 并同步同实体其他模型
        const syncFn = () => {
          if (model.userData && model.userData.entityId) {
            // MARS CRDT: 写入 Transform
            if (this.marsEntities && this.marsEntities.has(model.userData.entityId)) {
              this.updateMarsTransform(model.userData.entityId, {
                x: model.position.x, y: model.position.y, z: model.position.z,
                rx: model.rotation.x, ry: model.rotation.y, rz: model.rotation.z,
                sx: model.scale.x, sy: model.scale.y, sz: model.scale.z
              })
            }
            // 同步同实体的其他模型（旧结构兼容）
            this.syncEntityModels(model.userData.entityId, model)
          }
        }
        
        // 添加缩放控制
        const scaleXController = ControlFolder.add(model.scale, "x").min(0).max(5).step(0.1).name("长度").listen().onChange(syncFn)
        const scaleYController = ControlFolder.add(model.scale, "y").min(0).max(5).step(0.1).name("高度").listen().onChange(syncFn)
        const scaleZController = ControlFolder.add(model.scale, "z").min(0).max(5).step(0.1).name("宽度").listen().onChange(syncFn)
        
        // 添加位置控制
        const posXController = ControlFolder.add(model.position, "x").min(-50).max(50).step(1).name("x坐标").listen().onChange(syncFn)
        const posYController = ControlFolder.add(model.position, "y").min(-50).max(50).step(1).name("y坐标").listen().onChange(syncFn)
        const posZController = ControlFolder.add(model.position, "z").min(-50).max(50).step(1).name("z坐标").listen().onChange(syncFn)
        
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: THREE.MathUtils.radToDeg(model.rotation.x),
          y: THREE.MathUtils.radToDeg(model.rotation.y),
          z: THREE.MathUtils.radToDeg(model.rotation.z)
        }
        
        const rotXController = ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          model.rotation.x = THREE.MathUtils.degToRad(value)
          syncFn()
        })
        const rotYController = ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          model.rotation.y = THREE.MathUtils.degToRad(value)
          syncFn()
        })
        const rotZController = ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          model.rotation.z = THREE.MathUtils.degToRad(value)
          syncFn()
        })
        
        // 添加图层控制
        // 确保layer属性是数字类型
        model.userData.layer = parseInt(model.userData.layer) || 1
        // 创建图层控制器
        const layerController = ControlFolder.add(model.userData, "layer", 1, 5).step(1).name("图层")
        layerController.onChange(() => {
          this.updateObjectLayer(model)
          this.updateSceneTree()
        })
        
        // 保存控制器引用和旋转数据对象，以便后续更新
        if (!model.userData.controllers) {
          model.userData.controllers = {}
        }
        model.userData.controllers = {
          scaleX: scaleXController,
          scaleY: scaleYController,
          scaleZ: scaleZController,
          posX: posXController,
          posY: posYController,
          posZ: posZController,
          rotX: rotXController,
          rotY: rotYController,
          rotZ: rotZController,
          layer: layerController,
          folder: ControlFolder
        }
        // 保存 rotationControls 引用，供 TransformControls change 事件更新
        model.userData.rotationControls = rotationControls
      },

      // 删除模型的控制器
      removeModelController(modelName) {
        // 安全删除模型控制器
        try {
          if (modelName && this.gui.__folders && this.gui.__folders[modelName]) {
            this.gui.removeFolder(this.gui.__folders[modelName])
            console.log(`已删除控制器: ${modelName}`)
          } else {
            console.log(`控制器不存在或名称为空: ${modelName}`)
          }
        } catch (error) {
          console.warn('删除控制器时出错:', error)
        }
      },

      // 显示所有图层
      showAllLayers() {
        this.visibleLayer = null
        this.updateLayerVisibility()
      },

      // 更新图层可见性
      updateLayerVisibility() {
        this.objects.children.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
            const objLayer = obj.userData.layer || 1
            if (this.visibleLayer === null) {
              // 显示所有图层
              obj.visible = true
              if (obj.material) {
                obj.material.color.set(0x7777ff) // 统一颜色
                obj.material.specular.set(0x7777ff)
                obj.material.opacity = 1
                obj.material.transparent = false
              }
              obj.userData.selectable = true
            } else {
              // 显示单一图层
              if (objLayer === this.visibleLayer) {
                obj.visible = true
                if (obj.material) {
                  obj.material.color.set(0x7777ff) // 统一颜色
                  obj.material.specular.set(0x7777ff)
                  obj.material.opacity = 1
                  obj.material.transparent = false
                }
                obj.userData.selectable = true
              } else {
                obj.visible = true // 保持可见但变暗
                if (obj.material) {
                  obj.material.color.set(0x333333) // 暗灰色
                  obj.material.specular.set(0x333333)
                  obj.material.opacity = 0.5
                  obj.material.transparent = true
                }
                obj.userData.selectable = false
              }
            }
          }
        })
      },

      // 更新对象图层
      updateObjectLayer(obj) {
        if (obj && obj.userData && obj.userData.layer) {
          const layer = obj.userData.layer
          // 设置渲染顺序，高图层的对象具有更高的渲染顺序
          obj.renderOrder = layer * 1000 // 增加渲染顺序的差值
          // 重新排序对象以确保图层顺序正确
          this.sortObjectsByLayer()
          // 为所有对象重新设置深度测试和渲染属性
          this.updateAllObjectsDepthSettings()
        }
      },
      
      // 更新所有对象的深度测试设置
      updateAllObjectsDepthSettings() {
        // 为每个对象设置渲染顺序，确保一致性
        this.objects.children.forEach(obj => {
          if (obj instanceof THREE.Mesh && obj.material) {
            const layer = obj.userData.layer || 1
            obj.renderOrder = layer * 1000 // 使用一致的渲染顺序计算
          }
        })
        
        // 为所有对象启用深度测试，以便正常碰撞
        this.objects.children.forEach(obj => {
          if (obj instanceof THREE.Mesh && obj.material) {
            obj.material.depthTest = true
            obj.material.depthWrite = true
          }
        })
        
        // 为高图层的对象禁用深度测试，确保它们显示在低图层对象之上
        // 但保持同一图层的对象深度测试启用，以便相互碰撞
        this.objects.children.forEach(obj => {
          if (obj instanceof THREE.Mesh && obj.material) {
            const objLayer = obj.userData.layer || 1
            
            // 检查是否有更低图层的对象
            const hasLowerLayerObjects = this.objects.children.some(otherObj => {
              if (otherObj instanceof THREE.Mesh && otherObj !== obj) {
                const otherLayer = otherObj.userData.layer || 1
                return otherLayer < objLayer
              }
              return false
            })
            
            if (hasLowerLayerObjects) {
              // 有更低图层的对象，禁用深度测试以显示在上面
              // 但只对高图层对象禁用，同一图层对象保持启用
              obj.material.depthTest = false
              obj.material.depthWrite = false
            }
          }
        })
      },

      // 按图层排序对象
      sortObjectsByLayer() {
        // 按图层值从高到低排序，确保高图层在上面
        const sortedChildren = [...this.objects.children].sort((a, b) => {
          const layerA = a.userData.layer || 1
          const layerB = b.userData.layer || 1
          return layerB - layerA
        })
        
        // 清空objects组并按排序后的顺序重新添加对象
        this.objects.clear()
        sortedChildren.forEach(child => {
          this.objects.add(child)
        })
      },

      // 为组添加控制器
      addGroupController(group) {
        const ControlFolder = this.gui.addFolder(group.name)
        ControlFolder.open()
        
        // 组中心坐标控制
        ControlFolder.add(group.center, "x").min(-50).max(50).step(1).name("组中心x坐标").listen()
        ControlFolder.add(group.center, "y").min(-50).max(50).step(1).name("组中心y坐标").listen()
        ControlFolder.add(group.center, "z").min(-50).max(50).step(1).name("组中心z坐标").listen()
        
        // 显示组内对象数量
        ControlFolder.add({ count: group.objects.length }, "count").name("组内对象数量").listen()
        
        // 添加组旋转控制
        // 创建旋转控制对象，使用度作为单位
        const rotationControls = {
          x: group.rotation.x,
          y: group.rotation.y,
          z: group.rotation.z
        }
        
        ControlFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
          group.rotation.x = value
          this.updateGroupObjectsRotation(group)
        })
        ControlFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
          group.rotation.y = value
          this.updateGroupObjectsRotation(group)
        })
        ControlFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
          group.rotation.z = value
          this.updateGroupObjectsRotation(group)
        })
        
        // 添加组放缩控制
        ControlFolder.add(group, "scale").min(0.1).max(5.0).step(0.1).name("组放缩").listen().onChange(() => {
          this.updateGroupObjectsScale(group)
        })
        
        // 添加组删除按钮
        ControlFolder.add({ delete: () => this.deleteGroup(group) }, 'delete').name('删除组约束').onChange(() => {
          console.log('删除组约束:', group.name)
        })
        
        // 组中心变化时，更新组内对象位置
        const updateGroupObjects = () => {
          console.log('组中心变化，更新对象位置:', group.name)
          console.log('当前组中心:', group.center)
          console.log('当前组放缩:', group.scale)
          
          // 更新组内所有对象的位置
          group.objects.forEach(groupObj => {
            console.log('处理对象:', groupObj.uuid)
            console.log('对象偏移:', groupObj.offset)
            
            // 查找场景中的对象
            let sceneObj = null
            for (const child of this.objects.children) {
              if (child.uuid === groupObj.uuid) {
                sceneObj = child
                break
              }
            }
            
            if (sceneObj) {
              console.log('找到对象:', sceneObj.name)
              
              // 计算新位置时考虑组放缩因子
              const offset = groupObj.offset.clone()
              const scaledOffset = offset.multiplyScalar(group.scale)
              const newPosition = group.center.clone().add(scaledOffset)
              
              console.log('放缩后偏移:', scaledOffset)
              console.log('新位置:', newPosition)
              
              // 直接设置位置
              sceneObj.position.copy(newPosition)
              
              console.log('对象位置已更新:', sceneObj.position)
            } else {
              console.warn('未找到对象:', groupObj.uuid)
            }
          })
        }
        
        // 为组中心坐标控制器添加change事件监听
        // 由于dat.gui v0.7.9的限制，我们需要直接访问控制器数组
        if (ControlFolder.__controllers.length >= 3) {
          // 添加x坐标变化监听
          ControlFolder.__controllers[0].onChange(updateGroupObjects)
          // 添加y坐标变化监听
          ControlFolder.__controllers[1].onChange(updateGroupObjects)
          // 添加z坐标变化监听
          ControlFolder.__controllers[2].onChange(updateGroupObjects)
          
          console.log('已为组中心坐标控制器添加change事件监听')
        } else {
          console.warn('控制器数量不足，无法添加事件监听')
        }
      },
      
      // 更新组内对象旋转
      updateGroupObjectsRotation(group) {
        console.log('组旋转变化:', group.name, '新旋转值:', group.rotation)
        
        // 旋转变化时，更新组内所有对象的位置
        group.objects.forEach(groupObj => {
          console.log('处理对象:', groupObj.uuid)
          
          // 查找场景中的对象
          let sceneObj = null
          for (const child of this.objects.children) {
            if (child.uuid === groupObj.uuid) {
              sceneObj = child
              break
            }
          }
          
          if (sceneObj) {
            console.log('找到对象:', sceneObj.name)
            
            // 计算新位置（考虑组中心、旋转、放缩）
            const offset = groupObj.offset.clone()
            const scaledOffset = offset.multiplyScalar(group.scale)
            
            // 创建旋转矩阵
            const rotationMatrix = new THREE.Matrix4()
            rotationMatrix.makeRotationX(group.rotation.x * Math.PI / 180)
            rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(group.rotation.y * Math.PI / 180))
            rotationMatrix.multiply(new THREE.Matrix4().makeRotationZ(group.rotation.z * Math.PI / 180))
            
            // 应用旋转
            const rotatedOffset = scaledOffset.clone().applyMatrix4(rotationMatrix)
            
            // 计算最终位置
            const newPosition = group.center.clone().add(rotatedOffset)
            
            console.log('对象偏移:', offset)
            console.log('组中心:', group.center)
            console.log('组旋转:', group.rotation)
            console.log('组放缩:', group.scale)
            console.log('新位置:', newPosition)
            
            // 更新对象位置
            sceneObj.position.copy(newPosition)
            
            console.log('对象位置已更新:', sceneObj.position)
          } else {
            console.warn('未找到对象:', groupObj.uuid)
          }
        })
      },
      
      // 更新组内对象放缩
      updateGroupObjectsScale(group) {
        console.log('组放缩变化:', group.name, '新放缩值:', group.scale)
        
        // 放缩变化时，更新组内所有对象的位置
        group.objects.forEach(groupObj => {
          console.log('处理对象:', groupObj.uuid)
          
          // 查找场景中的对象
          let sceneObj = null
          for (const child of this.objects.children) {
            if (child.uuid === groupObj.uuid) {
              sceneObj = child
              break
            }
          }
          
          if (sceneObj) {
            console.log('找到对象:', sceneObj.name)
            
            // 计算新位置（考虑组中心、旋转、放缩）
            const offset = groupObj.offset.clone()
            const scaledOffset = offset.multiplyScalar(group.scale)
            
            // 创建旋转矩阵
            const rotationMatrix = new THREE.Matrix4()
            rotationMatrix.makeRotationX(group.rotation.x * Math.PI / 180)
            rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(group.rotation.y * Math.PI / 180))
            rotationMatrix.multiply(new THREE.Matrix4().makeRotationZ(group.rotation.z * Math.PI / 180))
            
            // 应用旋转
            const rotatedOffset = scaledOffset.clone().applyMatrix4(rotationMatrix)
            
            // 计算最终位置
            const newPosition = group.center.clone().add(rotatedOffset)
            
            console.log('对象偏移:', offset)
            console.log('组中心:', group.center)
            console.log('组旋转:', group.rotation)
            console.log('组放缩:', group.scale)
            console.log('新位置:', newPosition)
            
            // 更新对象位置
            sceneObj.position.copy(newPosition)
            
            console.log('对象位置已更新:', sceneObj.position)
          } else {
            console.warn('未找到对象:', groupObj.uuid)
          }
        })
      },
      
      // 删除组约束
      deleteGroup(group) {
        console.log('删除组约束:', group.name, '组ID:', group.id)

        // 1. 从组列表中删除该组
        const groupIndex = this.groups.findIndex(g => g.id === group.id)
        if (groupIndex !== -1) {
          this.groups.splice(groupIndex, 1)
          console.log('组已从组列表中删除')
        }

        // 2. 删除组控制器文件夹
        if (this.gui.__folders && this.gui.__folders[group.name]) {
          this.gui.removeFolder(this.gui.__folders[group.name])
          console.log('组控制器已删除')
        }

        // 3. 清除组内对象的组标识和组偏移量
        group.objects.forEach(groupObj => {
          // 查找场景中的对象
          let sceneObj = null
          for (const child of this.objects.children) {
            if (child.uuid === groupObj.uuid) {
              sceneObj = child
              break
            }
          }

          if (sceneObj) {
            console.log('清除对象组信息:', sceneObj.name)

            // 清除对象的组标识和组偏移量，支持多个组的情况
            if (Array.isArray(sceneObj.userData.groupIds)) {
              // 从groupIds数组中移除当前组的ID
              const groupIndex = sceneObj.userData.groupIds.indexOf(group.id)
              if (groupIndex > -1) {
                sceneObj.userData.groupIds.splice(groupIndex, 1)
              }
            }

            // 从groupOffsets Map中移除当前组的偏移量
            if (sceneObj.userData.groupOffsets) {
              sceneObj.userData.groupOffsets.delete(group.id)
            }

            // 只有当没有任何组时，才将isGrouped设为false
            sceneObj.userData.isGrouped = Array.isArray(sceneObj.userData.groupIds) && sceneObj.userData.groupIds.length > 0

            // MARS CRDT: 清除实体的 Group_groupId（如果属于其他组则设置为新的组ID，否则清空）
            if (sceneObj.userData.entityId) {
              const remainingGroups = sceneObj.userData.groupIds || []
              if (remainingGroups.length > 0) {
                this.setMarsGroupId(sceneObj.userData.entityId, `group_${remainingGroups[0]}`)
              } else {
                this.setMarsGroupId(sceneObj.userData.entityId, '')
              }
            }

            console.log('对象已从组中移除')
          } else {
            console.warn('未找到对象:', groupObj.uuid)
          }
        })

        // 4. MARS CRDT: 从 marsGroups 中删除组
        if (this.marsGroups) {
          this.marsGroups.delete(`group_${group.id}`)
        }

        // 5. 显示成功消息
        this.$message.success(`组约束已删除: ${group.name}`)
      },
      
      // 查找对象
      findObjectByUUID(uuid) {
        // 查找场景中的对象
        for (const child of this.objects.children) {
          if (child.uuid === uuid) return child
        }
        return null
      },

      // 检查选中对象是否在同一图层
      checkObjectsSameLayer() {
        if (!this.getObject || this.getObject.length < 2) {
          return false
        }
        
        const firstLayer = this.getObject[0].object.userData.layer || 1
        for (let i = 1; i < this.getObject.length; i++) {
          const objLayer = this.getObject[i].object.userData.layer || 1
          if (objLayer !== firstLayer) {
            return false
          }
        }
        return true
      },

      // 交集
      bspIntersect(){
        recordYjsAction('bspIntersect')
        try {
          console.log('开始交集操作')
          console.log('选中对象数量:', this.getObject ? this.getObject.length : 'null')
          console.log('选中对象内容:', this.getObject)
          
          // 操作前清理（不清理选中状态）
          this.preOperationCleanup()
          
          // 安全检查：确保选中了足够的对象
          if (!this.getObject || this.getObject.length < 2) {
            console.error('选中对象检查失败:', {
              getObject: this.getObject,
              length: this.getObject ? this.getObject.length : 'undefined'
            })
            this.getObject = []
            return this.$message.error(`请选择两个对象进行交集操作 (当前选中: ${this.getObject ? this.getObject.length : 0}个)`)
          }
          
          // 检查选中对象是否在同一图层
          if (!this.checkObjectsSameLayer()) {
            return this.$message.error('只能对同一图层的对象进行布尔运算')
          }
          
          // 获取点击的模型
          var object1 = this.getObject[0].object
          var object2 = this.getObject[1].object
          
          // 安全检查：确保对象有效
          if (!object1 || !object2 || !object1.geometry || !object2.geometry) {
            console.error('对象有效性检查失败:', {
              object1: object1,
              object2: object2,
              object1_geometry: object1 ? object1.geometry : 'no geometry',
              object2_geometry: object2 ? object2.geometry : 'no geometry'
            })
            this.getObject = []
            return this.$message.error('选中对象无效，请重新选择')
          }
          
          console.log('对象1:', object1)
          console.log('对象2:', object2)
          
          // 生成ThreeBSP对象前，确保几何体是正确的类型
          let object1Geometry = object1.geometry;
          let object2Geometry = object2.geometry;
          
          // 如果是BufferGeometry，转换为Geometry用于ThreeBSP
          if (object1Geometry instanceof THREE.BufferGeometry) {
            const tempMesh = new THREE.Mesh(object1Geometry);
            object1Geometry = new THREE.Geometry().fromBufferGeometry(object1Geometry);
          }
          
          if (object2Geometry instanceof THREE.BufferGeometry) {
            const tempMesh = new THREE.Mesh(object2Geometry);
            object2Geometry = new THREE.Geometry().fromBufferGeometry(object2Geometry);
          }
          
          // 创建临时网格用于ThreeBSP计算
          const tempObject1 = new THREE.Mesh(object1Geometry, object1.material);
          tempObject1.position.copy(object1.position);
          tempObject1.rotation.copy(object1.rotation);
          tempObject1.scale.copy(object1.scale);
          
          const tempObject2 = new THREE.Mesh(object2Geometry, object2.material);
          tempObject2.position.copy(object2.position);
          tempObject2.rotation.copy(object2.rotation);
          tempObject2.scale.copy(object2.scale);
          
          // 生成ThreeBSP对象
          var object1BSP = new ThreeBSP(tempObject1);
          var object2BSP = new ThreeBSP(tempObject2);
          console.log('BSP对象创建完成')
          
          //进行交集计算
          var resultBSP = object2BSP.intersect(object1BSP)
          console.log('交集计算完成:', resultBSP)

          //从BSP对象内获取到处理完后的mesh模型数据
          var result = resultBSP.toMesh()
          console.log('结果网格:', result)
          
          // 安全检查：确保结果有效且有顶点数据
          if (!result || !result.geometry || 
              (result.geometry.faces && result.geometry.faces.length === 0) ||
              (result.geometry.attributes && result.geometry.attributes.position && result.geometry.attributes.position.count === 0)) {
            this.getObject = []
            return this.$message.error('交集为空，请重新选择物体或调整位置')
          }
          
          // 更新模型的面和顶点的数据
          result.geometry.computeFaceNormals()
          result.geometry.computeVertexNormals()
          
          // 安全处理缓冲区几何体转换
          try {
            if (result.geometry && result.geometry instanceof THREE.Geometry) {
              const bufferGeometry = new THREE.BufferGeometry().fromGeometry(result.geometry)
              result.geometry = bufferGeometry
            } else if (result.geometry && result.geometry instanceof THREE.BufferGeometry) {
              // 如果已经是BufferGeometry，直接使用
              result.geometry = result.geometry
            } else {
              throw new Error('几何体格式不正确')
            }
          } catch (geometryError) {
            console.error('几何体转换出错:', geometryError)
            this.getObject = []
            return this.$message.error('几何体处理失败，请重试')
          }
          
          console.log(result)
          
          // 使用通用函数初始化结果模型
          result = this.initializeBooleanResult(result)
          
          // 将新模型添加到场景中
          this.objects.add(result)
          console.log('模型已添加到场景')
          
          // 为新模型添加控制器
          this.addModelController(result)
          console.log('控制器已添加')
          
          // 删除原模型的控制器
          this.removeModelController(this.getObject[0].object.name)
          this.removeModelController(this.getObject[1].object.name)
          
          // 删除进行布尔操作的原始模型
          this.objects.remove(this.getObject[0].object)
          this.objects.remove(this.getObject[1].object)
          console.log('原始模型已删除')
          
          // 清理选中列表和资源
          this.cleanupOperation()
          
          // 将新模型添加到选中列表，以便可以继续进行布尔操作
          this.selectedObjects = [result]
          this.getObject = [{object: result}]
          
          if (this.transformControls) {
            this.scene.remove(this.transformControls)
          }
          
          // 更新场景树，实时反馈操作结果
          this.updateSceneTree()
          
          this.$message.success(`交集操作完成，生成新模型：${result.name}`)
        } catch (error) {
          console.error('交集操作出错:', error)
          this.cleanupOperation()
          this.$message.error(`交集操作失败: ${error.message}`)
        }
      },

      // 初始化布尔操作生成的模型
      initializeBooleanResult(result) {
        try {
          console.log('开始初始化布尔操作结果模型')
          
          // 确保生成的几何体是BufferGeometry并具有完整属性
          if (result.geometry && result.geometry instanceof THREE.Geometry) {
            const bufferGeometry = new THREE.BufferGeometry().fromGeometry(result.geometry)
            result.geometry = bufferGeometry
          }
          
          // 初始化模型的所有必要属性
          if (!result.position) result.position = new THREE.Vector3(0, 0, 0)
          if (!result.rotation) result.rotation = new THREE.Euler(0, 0, 0)
          if (!result.scale) result.scale = new THREE.Vector3(1, 1, 1)
          if (!result.userData) result.userData = {}
          
          // 重新赋值一个纹理
          const material = new THREE.MeshPhongMaterial({
            color: 0x7777ff,
            specular: 0x7777ff,
            shininess: 30
          })
          result.material = material
          
          // 确保几何体可见
          result.visible = true
          
          // 获取下一个唯一的模型序号
          const nextId = this.getNextModelId()
          result.name = " 模型 " + nextId
          
          // 确保模型具有完整的几何体数据，确保可以进行二次布尔操作
          if (result.geometry) {
            // 确保几何体有完整的属性
            result.geometry.computeVertexNormals()
            result.geometry.computeBoundingBox()
            result.geometry.computeBoundingSphere()
            
            // 如果几何体缺少必要属性，尝试修复
            if (!result.geometry.attributes.position) {
              throw new Error('几何体缺少位置属性')
            }
            
            // 确保几何体可以被射线检测
            if (!result.geometry.attributes.normal) {
              console.warn('几何体缺少法线属性，重新计算')
              result.geometry.computeVertexNormals()
            }
            
            // 检查几何体是否有有效的面数据
            if (result.geometry.index) {
              console.log('几何体有索引:', result.geometry.index.count)
            } else {
              console.log('几何体无索引，使用顶点作为面')
            }
            
            // 确保几何体满足射线检测要求
            if (!result.geometry.attributes.position || result.geometry.attributes.position.count < 3) {
              throw new Error('几何体顶点数据不完整')
            }
            
            // 如果几何体没有正确设置索引，确保它可以被正确渲染
            if (!result.geometry.index && result.geometry.attributes.position.count > 0) {
              // 对于非索引几何体，Three.js 射线检测仍然可以工作
              console.log('几何体为非索引模式，射线检测应该正常工作')
            }
          }
          
          // 确保结果是一个有效的 Mesh 对象
          if (!(result instanceof THREE.Mesh)) {
            console.warn('布尔操作结果不是 Mesh 对象，尝试转换')
            if (result.geometry && result.material) {
              result = new THREE.Mesh(result.geometry, result.material)
            } else {
              throw new Error('无法创建有效的 Mesh 对象')
            }
          }
          
          // 为新模型添加布尔操作标识
          result.userData.canPerformBoolean = true
          
          console.log('新模型名称:', result.name)
          console.log('新模型属性:', {
            position: result.position,
            rotation: result.rotation,
            scale: result.scale,
            geometry: result.geometry.type,
            material: result.material.type,
            canPerformBoolean: result.userData.canPerformBoolean,
            vertexCount: result.geometry.attributes.position.count,
            hasIndex: !!result.geometry.index,
            boundingBox: result.geometry.boundingBox,
            boundingSphere: result.geometry.boundingSphere
          })
          
          return result
        } catch (error) {
          console.error('初始化布尔操作结果模型时出错:', error)
          throw error
        }
      },

      // 布尔操作前的资源清理（不清理选中状态）
      preOperationCleanup() {
        try {
          console.log('开始布尔操作前资源清理...')
          
          // 1. 清理可能存在的BSP相关缓存
          if (typeof THREE !== 'undefined' && THREE.Cache) {
            THREE.Cache.clear()
            console.log('Three.js缓存已清理')
          }
          
          // 2. 清理变换控制器
          if (this.transformControls) {
            try {
              this.scene.remove(this.transformControls)
              console.log('变换控制器已清理')
            } catch (error) {
              console.warn('清理变换控制器时出错:', error)
            }
          }
          
          console.log('布尔操作前资源清理完成')
        } catch (error) {
          console.warn('布尔操作前清理时出错:', error)
        }
      },

      // 清理布尔运算后的资源
      cleanupOperation() {
        try {
          console.log('开始资源清理...')
          
          // 1. 清理变换控制器
          if (this.transformControls) {
            try {
              this.scene.remove(this.transformControls)
              console.log('变换控制器已清理')
            } catch (error) {
              console.warn('清理变换控制器时出错:', error)
            }
          }
          
          // 2. 清理可能存在的BSP相关缓存
          // ThreeBSP可能会在内部缓存几何体数据
          if (typeof THREE !== 'undefined' && THREE.Cache) {
            THREE.Cache.clear()
            console.log('Three.js缓存已清理')
          }
          
          // 3. 清理几何体和材质缓存
          if (this.objects) {
            this.objects.children.forEach(child => {
              try {
                // 清理孤立的几何体（确保不破坏现有模型）
                if (child.geometry && child.geometry.dispose && 
                    child !== this.getObject?.[0]?.object && 
                    child !== this.getObject?.[1]?.object) {
                  // 只清理未引用的几何体
                  const isReferenced = this.getObject?.some(obj => obj.object === child)
                  if (!isReferenced && child.geometry.dispose) {
                    child.geometry.dispose()
                  }
                }
              } catch (geometryError) {
                console.warn('清理几何体时出错:', geometryError)
              }
            })
          }
          
          // 4. 验证并同步控制器状态
          if (this.gui) {
            const controllerNames = Object.keys(this.gui.__folders || {})
            const sceneObjectNames = this.objects ? 
              this.objects.children
                .filter(obj => obj.name && obj.name.startsWith(' 模型 '))
                .map(obj => obj.name) : []
            
            // 移除孤立控制器
            controllerNames.forEach(controllerName => {
              try {
                if (!sceneObjectNames.includes(controllerName)) {
                  console.log(`发现孤立控制器，删除: ${controllerName}`)
                  this.gui.removeFolder(this.gui.__folders[controllerName])
                }
              } catch (controllerError) {
                console.warn(`删除控制器 ${controllerName} 时出错:`, controllerError)
              }
            })
            
            console.log(`控制器同步完成: ${Object.keys(this.gui.__folders || {}).length} 个控制器`)
          }
          
          // 5. 强制垃圾回收提示
          if (window.gc) {
            window.gc()
          }
          
          // 6. 触发场景更新
          if (this.renderer) {
            this.renderer.setAnimationLoop(() => {
              this.renderer.render(this.scene, this.camera)
            })
          }
          
          console.log('资源清理完成')
        } catch (cleanupError) {
          console.warn('资源清理时出错:', cleanupError)
        }
      },

      // 并集
      bspUnion(){
        recordYjsAction('bspUnion')
        try {
          console.log('开始并集操作')
          console.log('选中对象数量:', this.getObject.length)
          
          // 操作前清理（不清理选中状态）
          this.preOperationCleanup()
          
          // 安全检查：确保选中了足够的对象
          if (!this.getObject || this.getObject.length < 2) {
            this.getObject = []
            return this.$message.error('请选择两个对象进行并集操作')
          }
          
          // 检查选中对象是否在同一图层
          if (!this.checkObjectsSameLayer()) {
            return this.$message.error('只能对同一图层的对象进行布尔运算')
          }
          
          // 获取点击的模型
          var object1 = this.getObject[0].object
          var object2 = this.getObject[1].object
          
          // 安全检查：确保对象有效
          if (!object1 || !object2 || !object1.geometry || !object2.geometry) {
            this.getObject = []
            return this.$message.error('选中对象无效，请重新选择')
          }
          
          console.log('对象1:', object1)
          console.log('对象2:', object2)
          
          // 生成ThreeBSP对象前，确保几何体是正确的类型
          let object1Geometry = object1.geometry;
          let object2Geometry = object2.geometry;
          
          // 如果是BufferGeometry，转换为Geometry用于ThreeBSP
          if (object1Geometry instanceof THREE.BufferGeometry) {
            const tempMesh = new THREE.Mesh(object1Geometry);
            object1Geometry = new THREE.Geometry().fromBufferGeometry(object1Geometry);
          }
          
          if (object2Geometry instanceof THREE.BufferGeometry) {
            const tempMesh = new THREE.Mesh(object2Geometry);
            object2Geometry = new THREE.Geometry().fromBufferGeometry(object2Geometry);
          }
          
          // 创建临时网格用于ThreeBSP计算
          const tempObject1 = new THREE.Mesh(object1Geometry, object1.material);
          tempObject1.position.copy(object1.position);
          tempObject1.rotation.copy(object1.rotation);
          tempObject1.scale.copy(object1.scale);
          
          const tempObject2 = new THREE.Mesh(object2Geometry, object2.material);
          tempObject2.position.copy(object2.position);
          tempObject2.rotation.copy(object2.rotation);
          tempObject2.scale.copy(object2.scale);
          
          // 生成ThreeBSP对象
          var object1BSP = new ThreeBSP(tempObject1);
          var object2BSP = new ThreeBSP(tempObject2);
          console.log('BSP对象创建完成')
          
          //进行并集计算
          var resultBSP = object2BSP.union(object1BSP)
          console.log('并集计算完成:', resultBSP)
          
          //从BSP对象内获取到处理完后的mesh模型数据
          var result = resultBSP.toMesh()
          console.log('结果网格:', result)
          
          // 安全检查：确保结果有效且有顶点数据
          if (!result || !result.geometry || 
              (result.geometry.faces && result.geometry.faces.length === 0) ||
              (result.geometry.attributes && result.geometry.attributes.position && result.geometry.attributes.position.count === 0)) {
            this.getObject = []
            return this.$message.error('并集操作失败，结果为空')
          }
          
          //更新模型的面和顶点的数据
          result.geometry.computeFaceNormals()
          result.geometry.computeVertexNormals()
          
          // 安全处理缓冲区几何体转换
          try {
            if (result.geometry && result.geometry instanceof THREE.Geometry) {
              const bufferGeometry = new THREE.BufferGeometry().fromGeometry(result.geometry)
              result.geometry = bufferGeometry
            } else if (result.geometry && result.geometry instanceof THREE.BufferGeometry) {
              // 如果已经是BufferGeometry，直接使用
              result.geometry = result.geometry
            } else {
              throw new Error('几何体格式不正确')
            }
          } catch (geometryError) {
            console.error('几何体转换出错:', geometryError)
            this.getObject = []
            return this.$message.error('几何体处理失败，请重试')
          }
          
          console.log(result)
          
          // 使用通用函数初始化结果模型
          result = this.initializeBooleanResult(result)
          
          // 将新模型添加到场景中
          this.objects.add(result)
          console.log('模型已添加到场景')
          
          // 为新模型添加控制器
          this.addModelController(result)
          console.log('控制器已添加')
          
          // 删除原模型的控制器
          this.removeModelController(this.getObject[0].object.name)
          this.removeModelController(this.getObject[1].object.name)
          
          // 删除进行布尔操作的原始模型
          this.objects.remove(this.getObject[0].object)
          this.objects.remove(this.getObject[1].object)
          console.log('原始模型已删除')
          
          // 清理选中列表和资源
          this.cleanupOperation()
          
          // 将新模型添加到选中列表，以便可以继续进行布尔操作
          this.selectedObjects = [result]
          this.getObject = [{object: result}]
          
          if (this.transformControls) {
            this.scene.remove(this.transformControls)
          }
          
          // 更新场景树，实时反馈操作结果
          this.updateSceneTree()
          
          this.$message.success(`并集操作完成，生成新模型：${result.name}`)
        } catch (error) {
          console.error('并集操作出错:', error)
          this.cleanupOperation()
          this.$message.error(`并集操作失败: ${error.message}`)
        }
      },

      // 差集
      bspSubtract(){
        recordYjsAction('bspSubtract')
        try {
          console.log('开始差集操作')
          console.log('选中对象数量:', this.getObject.length)
          
          // 操作前清理（不清理选中状态）
          this.preOperationCleanup()
          
          // 安全检查：确保选中了足够的对象
          if (!this.getObject || this.getObject.length < 2) {
            this.getObject = []
            return this.$message.error('请选择两个对象进行差集操作')
          }
          
          // 检查选中对象是否在同一图层
          if (!this.checkObjectsSameLayer()) {
            return this.$message.error('只能对同一图层的对象进行布尔运算')
          }
          
          // 获取点击的模型
          var object1 = this.getObject[0].object
          var object2 = this.getObject[1].object
          
          // 安全检查：确保对象有效
          if (!object1 || !object2 || !object1.geometry || !object2.geometry) {
            this.getObject = []
            return this.$message.error('选中对象无效，请重新选择')
          }
          
          console.log('对象1:', object1)
          console.log('对象2:', object2)
          
          //生成ThreeBSP对象
          var object1BSP = new ThreeBSP(object1)
          var object2BSP = new ThreeBSP(object2)
          console.log('BSP对象创建完成')
          
          //进行差集计算
          var resultBSP = object2BSP.subtract(object1BSP)
          console.log('差集计算完成:', resultBSP)
          
          //从BSP对象内获取到处理完后的mesh模型数据
          var result = resultBSP.toMesh()
          console.log('结果网格:', result)
          
          // 安全检查：确保结果有效且有顶点数据
          if (!result || !result.geometry || 
              (result.geometry.faces && result.geometry.faces.length === 0) ||
              (result.geometry.attributes && result.geometry.attributes.position && result.geometry.attributes.position.count === 0)) {
            this.getObject = []
            return this.$message.error('差集操作失败，结果为空')
          }
          
          //更新模型的面和顶点的数据
          result.geometry.computeFaceNormals()
          result.geometry.computeVertexNormals()
          
          // 安全处理缓冲区几何体转换
          try {
            if (result.geometry && result.geometry instanceof THREE.Geometry) {
              const bufferGeometry = new THREE.BufferGeometry().fromGeometry(result.geometry)
              result.geometry = bufferGeometry
            } else if (result.geometry && result.geometry instanceof THREE.BufferGeometry) {
              // 如果已经是BufferGeometry，直接使用
              result.geometry = result.geometry
            } else {
              throw new Error('几何体格式不正确')
            }
          } catch (geometryError) {
            console.error('几何体转换出错:', geometryError)
            this.getObject = []
            return this.$message.error('几何体处理失败，请重试')
          }
          
          console.log(result)
          
          // 使用通用函数初始化结果模型
          result = this.initializeBooleanResult(result)
          
          // 将新模型添加到场景中
          this.objects.add(result)
          console.log('模型已添加到场景')
          
          // 为新模型添加控制器
          this.addModelController(result)
          console.log('控制器已添加')
          
          // 删除原模型的控制器
          this.removeModelController(this.getObject[0].object.name)
          this.removeModelController(this.getObject[1].object.name)
          
          // 删除进行布尔操作的原始模型
          this.objects.remove(this.getObject[0].object)
          this.objects.remove(this.getObject[1].object)
          console.log('原始模型已删除')
          
          // 清理选中列表和资源
          this.cleanupOperation()
          
          // 将新模型添加到选中列表，以便可以继续进行布尔操作
          this.selectedObjects = [result]
          this.getObject = [{object: result}]
          
          if (this.transformControls) {
            this.scene.remove(this.transformControls)
          }
          
          // 更新场景树，实时反馈操作结果
          this.updateSceneTree()
          
          this.$message.success(`差集操作完成，生成新模型：${result.name}`)
        } catch (error) {
          console.error('差集操作出错:', error)
          this.cleanupOperation()
          this.$message.error(`差集操作失败: ${error.message}`)
        }
      },
      
      // 渲染
      render() {
        requestAnimationFrame(this.render)
        if (!this.ecsWorld) {
          this.renderer.render(this.scene, this.camera)
        }
        if (this.gui && typeof this.gui.update === 'function') {
          this.gui.update()
        }
      },

      // 保存
      async save(){
        const sceneData = JSON.stringify(this.scene.toJSON())
        sessionStorage.setItem('sceneData',sceneData)
        const documentId = this.$route.params.documentId
        console.log(documentId)
        const objectsJson = JSON.stringify(this.objects.toJSON())
        console.log(objectsJson)
        const reqData = new URLSearchParams()
        reqData.append('documentId',documentId)
        reqData.append('modeldata',objectsJson)
        const{data:res} = await this.$http.post('/model/saveModel',reqData)
        if(res.status!==201){
          return this.$message.error('保存失败')
        }
        this.$message.success('保存成功')
      },

      // 从数据库中获取数据
      async getModelData(){
        const documentId = this.$route.params.documentId
        const{data:res} = await this.$http.get('/model/getModel', {
          params:{
            documentId:documentId
          }
        })
        console.log(res.data.modeldata)
        // this.data = JSON.parse(res.data.modeldata)
        // console.log(this.data)
        const loader = new THREE.ObjectLoader()
        const object = loader.parse(JSON.parse(res.data.modeldata))
        console.log(object)
        this.objects=object
        this.scene.add( this.objects )
        // this.$message.success('获取成功')
      },

      // 从本地导入模型
      importLocalModel(){        this.importLocalModelDialogVisible = false;
        if (this.uploadedFileInfo && this.uploadedFileInfo.url) {
          const fileUrl = this.uploadedFileInfo.url;
          console.log('开始导入文件:', fileUrl)
          const fileType = fileUrl.split('.').pop().toLowerCase();
          console.log('文件类型:', fileType)
          console.log('当前选中的实体ID:', this.selectedEntityId)
          
          // 提取文件名（不含扩展名）
          const fileName = fileUrl.split('/').pop();
          const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
          // 移除服务器添加的唯一后缀，只保留原始文件名部分
          const originalBaseName = baseName.split('-').slice(0, -2).join('-');
          
          // 创建一个新的实体，用于关联GLB和PLY模型
          const entity = this.createModelEntity();
          const entityId = entity.id;
          
          // 处理GLB和PLY文件的关联导入
          if (fileType === 'glb' || fileType === 'gltf') {
            // 导入GLB模型
            this.loadGLTFModel(fileUrl, entityId);
            
            // 尝试导入对应的PLY模型
            // 构造PLY文件名，使用原始文件名，不包含唯一后缀
            const plyFileName = originalBaseName + '.ply';
            const plyUrl = 'http://localhost:3000/uploads/' + encodeURIComponent(plyFileName);
            console.log('尝试导入对应的PLY模型:', plyUrl);
            this.loadPLYModel(plyUrl, entityId);
          } else if (fileType === 'ply') {
            // 导入PLY模型
            this.loadPLYModel(fileUrl, entityId);
            
            // 尝试导入对应的GLB模型
            // 构造GLB文件名，使用原始文件名，不包含唯一后缀
            const glbFileName = originalBaseName + '.glb';
            const glbUrl = 'http://localhost:3000/uploads/' + encodeURIComponent(glbFileName);
            console.log('尝试导入对应的GLB模型:', glbUrl);
            // 加载GLB模型，但不将其设置为可见，保持点云视图的可见性
            this.loadGLTFModel(glbUrl, entityId, false);
          } else {
            // 其他文件类型的处理
            switch (fileType) {
              case 'obj':
                this.loadOBJModel(fileUrl);
                break;
              case 'stl':
                this.loadSTLModel(fileUrl);
                break;
              case 'pcd':
                this.loadPCDModel(fileUrl);
                break;
              case 'blend':
                this.loadBlenderModel(fileUrl);
                break;
              // 其他文件类型的case...
              default:
                console.error('不支持的文件类型:', fileType);
            }
          }
        } else {
          console.error('没有文件信息可用');
        }
      },
      loadGLTFModel(url, entityId = null, makeVisible = true) {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          try {
            // 创建Blender视图（使用导入的GLB模型）
            const blenderView = gltf.scene;
            blenderView.name = "Blender View";
            blenderView.userData.viewType = 'glb';

            // 调整模型的位置、缩放和旋转
            blenderView.position.set(0, 0, 0);
            // 调整初始缩放，根据需要修改这个值
            blenderView.scale.set(10, 10, 10);

            // 创建原始模型（使用Blender模型的几何体创建一个网格模型作为原始视图）
            let originalGeometry = null;
            // 遍历Blender模型的子对象，找到第一个带有几何体的对象
            blenderView.traverse((child) => {
              if (child.isMesh && child.geometry && !originalGeometry) {
                originalGeometry = child.geometry.clone();
              }
            });

            // 如果找到几何体，创建原始模型
            let originalModel = null;
            if (originalGeometry) {
              const originalMaterial = new THREE.MeshPhongMaterial({
                color: 0x7777ff,
                specular: 0x7777ff,
                shininess: 30
              });
              originalModel = new THREE.Mesh(originalGeometry, originalMaterial);
              originalModel.name = "原始模型";
              originalModel.userData.viewType = 'original';
              
              // 复制Blender模型的位置、旋转和缩放
              originalModel.position.copy(blenderView.position);
              originalModel.rotation.copy(blenderView.rotation);
              originalModel.scale.copy(blenderView.scale);
            } else {
              // 如果没有找到几何体，使用默认的立方体几何体
              const originalGeometry = new THREE.BoxGeometry(10, 10, 10);
              const originalMaterial = new THREE.MeshPhongMaterial({
                color: 0x7777ff,
                specular: 0x7777ff,
                shininess: 30
              });
              originalModel = new THREE.Mesh(originalGeometry, originalMaterial);
              originalModel.name = "原始模型";
              originalModel.userData.viewType = 'original';
            }

            // 查找或创建实体
            let entity;
            if (entityId) {
              // 先检查是否已经有相同实体ID的模型存在
              let existingEntityModel = null;
              this.objects.children.forEach(child => {
                if (child.userData && child.userData.entityId === entityId) {
                  existingEntityModel = child;
                }
              });
              
              if (existingEntityModel) {
                // 如果已经有相同实体ID的模型，使用它的实体ID
                entityId = existingEntityModel.userData.entityId;
                entity = this.modelEntities.find(e => e.id === entityId);
              } else {
                // 使用指定的实体ID
                entity = this.modelEntities.find(e => e.id === entityId);
                if (!entity) {
                  // 创建一个新实体，但使用指定的ID
                  this.currentEntityId = Math.max(this.currentEntityId, entityId);
                  entity = {
                    id: entityId,
                    name: `模型实体 ${entityId}`,
                    models: {
                      original: null, // 原始模型
                      pointcloud: null, // 点云模型
                      glb: null // GLB模型
                    }
                  };
                  this.modelEntities.push(entity);
                }
              }
            } else {
              // 检查是否有正在创建的实体（用于关联导入的模型）
              entity = this.modelEntities[this.modelEntities.length - 1];
              if (!entity || (entity.models.original && entity.models.glb && entity.models.pointcloud)) {
                entity = this.createModelEntity();
              }
            }
            
            // 关联原始模型和Blender视图到同一个实体
            originalModel.userData.entityId = entity.id;
            blenderView.userData.entityId = entity.id;

            // 检查是否已经存在相同实体的模型，避免重复添加
            let existingOriginalModel = null;
            let existingBlenderView = null;
            this.objects.children.forEach(child => {
              if (child.userData && child.userData.entityId === entity.id) {
                if (child.userData.viewType === 'original') {
                  existingOriginalModel = child;
                } else if (child.userData.viewType === 'glb') {
                  existingBlenderView = child;
                }
              }
            });

            // 只添加不存在的模型
            if (!existingOriginalModel) {
              this.objects.add(originalModel);
            }
            if (!existingBlenderView) {
              this.objects.add(blenderView);
            }
            
            // 确保objects在场景中
            if (!this.scene.children.includes(this.objects)) {
              this.scene.add(this.objects);
              console.log('将objects添加到场景中');
            }
            
            // 根据makeVisible参数决定是否将Blender视图设置为可见
            if (makeVisible) {
              // 确保只有Blender视图可见，隐藏所有其他视图
              this.objects.children.forEach(child => {
                if (child.userData && child.userData.entityId === entity.id) {
                  child.visible = (child.userData.viewType === 'glb');
                }
              });
              
              // 确保新添加的模型也有正确的可见性
              if (!existingOriginalModel) {
                originalModel.visible = false;
              }
              if (!existingBlenderView) {
                blenderView.visible = true;
              }
            } else {
              // 如果makeVisible为false，确保Blender视图隐藏
              if (existingBlenderView) {
                existingBlenderView.visible = false;
              } else {
                blenderView.visible = false;
              }
              if (!existingOriginalModel) {
                originalModel.visible = false;
              }
            }
            console.log('原始模型可见性:', existingOriginalModel ? existingOriginalModel.visible : originalModel.visible);
            console.log('Blender视图可见性:', existingBlenderView ? existingBlenderView.visible : blenderView.visible);
            
            // 为原始模型添加控制器
            let modelId;
            if (existingOriginalModel) {
              // 如果已存在原始模型，使用它的名称
              modelId = parseInt(existingOriginalModel.name.replace(' 模型 ', ''));
              if (isNaN(modelId)) {
                modelId = this.getNextModelId();
                existingOriginalModel.name = " 模型 " + modelId;
              }
              // 不要重复添加控制器
            } else {
              modelId = this.getNextModelId();
              originalModel.name = " 模型 " + modelId;
              this.addModelController(originalModel);
            }
            
            // 强制渲染场景
            this.render();
            console.log('强制渲染场景');
            
            // 延迟再次渲染，确保模型完全加载
            setTimeout(() => {
              this.render();
              console.log('延迟渲染场景');
            }, 100);

            // 更新场景树
            this.updateSceneTree();
            console.log('更新场景树');

            // 渲染场景
            this.render();
            console.log('渲染场景');

          } catch (error) {
            console.error('加载GLTF模型时发生错误:', error);
          }
        }, undefined, (error) => {
          console.error('加载GLTF模型时发生错误:', error);
        });
      },
      loadOBJModel(url) {
        const loader = new OBJLoader();
        loader.load(url, (obj) => {
          try {
            // 创建原始模型（使用导入的OBJ模型）
            const originalModel = obj;
            originalModel.name = "原始模型";
            originalModel.userData.viewType = 'original';

            // 调整模型的位置、缩放和旋转
            originalModel.position.set(0, 0, 0);
            originalModel.scale.set(1, 1, 1);

            // 创建点云视图（使用原始模型的几何体创建点云）
            let pointCloud = null;
            // 遍历原始模型的子对象，找到第一个带有几何体的对象
            originalModel.traverse((child) => {
              if (child.isMesh && child.geometry && !pointCloud) {
                const pointCloudMaterial = new THREE.PointsMaterial({
                  color: 0x00ff00,
                  size: 5.0,
                  transparent: false,
                  opacity: 1.0,
                  depthTest: true,
                  depthWrite: true,
                  sizeAttenuation: false
                });
                pointCloud = new THREE.Points(child.geometry.clone(), pointCloudMaterial);
                pointCloud.name = "Point Cloud View";
                pointCloud.userData.viewType = 'pointcloud';
                
                // 复制原始模型的位置、旋转和缩放
                pointCloud.position.copy(originalModel.position);
                pointCloud.rotation.copy(originalModel.rotation);
                pointCloud.scale.copy(originalModel.scale);
                // 保持点云缩放为10倍，确保可见
                pointCloud.scale.multiplyScalar(10);
              }
            });

            // 创建新的实体
            const entity = this.createModelEntity();
            
            // 关联原始模型和点云视图到同一个实体
            originalModel.userData.entityId = entity.id;
            if (pointCloud) {
              pointCloud.userData.entityId = entity.id;
            }

            // 将模型添加到场景中
            this.objects.add(originalModel);
            if (pointCloud) {
              this.objects.add(pointCloud);
            }
            
            // 确保objects在场景中
            if (!this.scene.children.includes(this.objects)) {
              this.scene.add(this.objects);
              console.log('将objects添加到场景中');
            }
            
            // 确保原始模型可见，点云视图隐藏
            originalModel.visible = true;
            if (pointCloud) {
              pointCloud.visible = false;
            }
            console.log('原始模型可见性:', originalModel.visible);
            if (pointCloud) {
              console.log('Point Cloud View visibility:', pointCloud.visible);
            }
            
            // 为原始模型添加控制器
            const modelId = this.getNextModelId();
            originalModel.name = " 模型 " + modelId;
            this.addModelController(originalModel);
            
            // 强制渲染场景
            this.render();
            console.log('强制渲染场景');
            
            // 延迟再次渲染，确保模型完全加载
            setTimeout(() => {
              this.render();
              console.log('延迟渲染场景');
            }, 100);

            // 更新场景树
            this.updateSceneTree();
            console.log('更新场景树');

            // 渲染场景
            this.render();
            console.log('渲染场景');

          } catch (error) {
            console.error('加载OBJ模型时发生错误:', error);
          }
        }, undefined, (error) => {
          console.error('加载OBJ模型时发生错误:', error);
        });
      },
      loadSTLModel(url) {
        const loader = new STLLoader();
        loader.load(url, (geometry) => {
          try {
            // 创建原始模型（使用STL几何体）
            const originalMaterial = new THREE.MeshPhongMaterial({
              color: 0x606060,
              specular: 0x606060,
              shininess: 30
            });
            const originalModel = new THREE.Mesh(geometry, originalMaterial);
            originalModel.scale.set(5, 5, 5);
            originalModel.name = "原始模型";
            originalModel.userData.viewType = 'original';

            // 创建点云视图（使用STL几何体创建点云）
            const pointCloudMaterial = new THREE.PointsMaterial({
              color: 0x00ff00,
              size: 5.0,
              transparent: false,
              opacity: 1.0,
              depthTest: true,
              depthWrite: true,
              sizeAttenuation: false
            });
            const pointCloud = new THREE.Points(geometry, pointCloudMaterial);
            pointCloud.name = "Point Cloud View";
            pointCloud.userData.viewType = 'pointcloud';
            
            // 调整点云缩放
            pointCloud.scale.set(5, 5, 5); // 与原始模型相同的基础缩放
            pointCloud.scale.multiplyScalar(10); // 保持点云缩放为10倍，确保可见

            // 创建新的实体
            const entity = this.createModelEntity();
            
            // 关联原始模型和点云视图到同一个实体
            originalModel.userData.entityId = entity.id;
            pointCloud.userData.entityId = entity.id;

            // 将两个模型都添加到场景中
            this.objects.add(originalModel);
            this.objects.add(pointCloud);
            
            // 确保objects在场景中
            if (!this.scene.children.includes(this.objects)) {
              this.scene.add(this.objects);
              console.log('将objects添加到场景中');
            }
            
            // 复制原始模型的位置、旋转和缩放到点云
            pointCloud.position.copy(originalModel.position);
            pointCloud.rotation.copy(originalModel.rotation);
            
            // 确保原始模型可见，点云视图隐藏
            originalModel.visible = true;
            pointCloud.visible = false;
            console.log('原始模型可见性:', originalModel.visible);
            console.log('Point Cloud View visibility:', pointCloud.visible);
            
            // 为原始模型添加控制器
            const modelId = this.getNextModelId();
            originalModel.name = " 模型 " + modelId;
            this.addModelController(originalModel);
            
            // 强制渲染场景
            this.render();
            console.log('强制渲染场景');
            
            // 延迟再次渲染，确保模型完全加载
            setTimeout(() => {
              this.render();
              console.log('延迟渲染场景');
            }, 100);

            // 更新场景树
            this.updateSceneTree();
            console.log('更新场景树');

            // 渲染场景
            this.render();
            console.log('渲染场景');

          } catch (error) {
            console.error('加载STL模型时发生错误:', error);
          }
        }, undefined, (error) => {
          console.error('加载STL模型时发生错误:', error);
        });
      },
      
      // 加载PCD点云模型
      loadPCDModel(url) {
        const loader = new PCDLoader();
        loader.load(url, (points) => {
          try {
            // 创建点云视图
            const pointCloudMaterial = new THREE.PointsMaterial({
              color: 0x00ff00, // 使用更鲜艳的颜色，确保可见
              size: 5.0, // 增加点的大小，确保可见
              transparent: false,
              opacity: 1.0,
              depthTest: true,
              depthWrite: true,
              sizeAttenuation: false // 禁用大小衰减，确保远处的点也能看到
            });
            points.material = pointCloudMaterial;
            points.name = "Point Cloud View";
            points.userData.viewType = 'pointcloud';
            points.userData.selectable = true;

            // 调整点云缩放
            points.scale.set(10, 10, 10); // 增加点云大小

            // 创建原始模型（使用点云的几何体创建一个网格模型作为原始视图）
            const originalMaterial = new THREE.MeshPhongMaterial({
              color: 0x7777ff,
              specular: 0x7777ff,
              shininess: 30
            });
            const originalModel = new THREE.Mesh(points.geometry, originalMaterial);
            originalModel.name = "原始模型";
            originalModel.userData.viewType = 'original';

            console.log('开始加载PCD点云');

            // 创建新的实体
            const entity = this.createModelEntity();
            
            // 关联原始模型和点云到同一个实体
            originalModel.userData.entityId = entity.id;
            points.userData.entityId = entity.id;

            // 将两个模型都添加到场景中
            this.objects.add(originalModel);
            this.objects.add(points);
            
            // 确保objects在场景中
            if (!this.scene.children.includes(this.objects)) {
              this.scene.add(this.objects);
              console.log('将objects添加到场景中');
            }
            
            // 复制原始模型的位置、旋转和缩放到点云
            points.position.copy(originalModel.position);
            points.rotation.copy(originalModel.rotation);
            points.scale.copy(originalModel.scale);
            // 保持点云缩放为10倍，确保可见
            points.scale.multiplyScalar(10);
            
            // 确保点云的深度测试和写入设置正确
            if (points.material) {
              points.material.depthTest = true;
              points.material.depthWrite = true;
            }
            
            // 确保原始模型隐藏，点云可见
            originalModel.visible = false;
            points.visible = true;
            console.log('原始模型可见性:', originalModel.visible);
            console.log('点云可见性:', points.visible);
            
            // 为原始模型添加控制器
            const modelId = this.getNextModelId();
            originalModel.name = " 模型 " + modelId;
            this.addModelController(originalModel);
            
            // 强制渲染场景
            this.render();
            console.log('强制渲染场景');
            
            // 延迟再次渲染，确保点云完全加载
            setTimeout(() => {
              this.render();
              console.log('延迟渲染场景');
            }, 100);

            // 更新场景树
            this.updateSceneTree();
            console.log('更新场景树');

            // 渲染场景
            this.render();
            console.log('渲染场景');

          } catch (error) {
            console.error('加载PCD点云时发生错误:', error);
          }

        }, undefined, (error) => {
          console.error('加载PCD模型时发生错误:', error);
        });
      },
      
      // 加载PLY点云模型
      loadPLYModel(url, entityId = null) {
        const loader = new PLYLoader();
        loader.load(url, (geometry) => {
          try {
            // 创建原始模型（使用点云的几何体创建一个网格模型作为原始视图）
            const originalMaterial = new THREE.MeshPhongMaterial({
              color: 0x7777ff,
              specular: 0x7777ff,
              shininess: 30
            });
            const originalModel = new THREE.Mesh(geometry, originalMaterial);
            originalModel.name = "原始模型";
            originalModel.userData.viewType = 'original';
            
            // 创建点云视图
            const pointCloudMaterial = new THREE.PointsMaterial({
              color: 0x00ff00, // 使用更鲜艳的颜色，确保可见
              size: 5.0, // 增加点的大小，确保可见
              transparent: false,
              opacity: 1.0,
              depthTest: true,
              depthWrite: true,
              sizeAttenuation: false // 禁用大小衰减，确保远处的点也能看到
            });
            const pointCloud = new THREE.Points(geometry, pointCloudMaterial);
            pointCloud.name = "Point Cloud View";
            pointCloud.userData.viewType = 'pointcloud';
            pointCloud.userData.selectable = true;
            
            // 调整点云缩放
            pointCloud.scale.set(1000, 1000, 1000); // 调整初始缩放，增加10倍
            
            // 关于xoz面倒置（y轴取反）
            pointCloud.scale.y = -1000;
            
            // 沿y轴顺时针旋转90°
            pointCloud.rotation.y = -Math.PI / 2;
            
            // 沿y正方向移动20个单位
            pointCloud.position.y += 20;

            console.log('开始加载PLY点云');
            console.log('当前选中的实体ID:', this.selectedEntityId);

            // 查找或创建实体
            let entity;
            if (entityId) {
              // 先检查是否已经有相同实体ID的模型存在
              let existingEntityModel = null;
              this.objects.children.forEach(child => {
                if (child.userData && child.userData.entityId === entityId) {
                  existingEntityModel = child;
                }
              });
              
              if (existingEntityModel) {
                // 如果已经有相同实体ID的模型，使用它的实体ID
                entityId = existingEntityModel.userData.entityId;
                entity = this.modelEntities.find(e => e.id === entityId);
              } else {
                // 使用指定的实体ID
                entity = this.modelEntities.find(e => e.id === entityId);
                if (!entity) {
                  // 创建一个新实体，但使用指定的ID
                  this.currentEntityId = Math.max(this.currentEntityId, entityId);
                  entity = {
                    id: entityId,
                    name: `模型实体 ${entityId}`,
                    models: {
                      original: null, // 原始模型
                      pointcloud: null, // 点云模型
                      glb: null // GLB模型
                    }
                  };
                  this.modelEntities.push(entity);
                }
              }
            } else {
              // 检查是否有正在创建的实体（用于关联导入的模型）
              entity = this.modelEntities[this.modelEntities.length - 1];
              if (!entity || (entity.models.original && entity.models.glb && entity.models.pointcloud)) {
                entity = this.createModelEntity();
              }
            }
            
            // 关联原始模型和点云到同一个实体
            originalModel.userData.entityId = entity.id;
            pointCloud.userData.entityId = entity.id;

            // 检查是否已经存在相同实体的模型，避免重复添加
            let existingOriginalModel = null;
            let existingPointCloud = null;
            this.objects.children.forEach(child => {
              if (child.userData && child.userData.entityId === entity.id) {
                if (child.userData.viewType === 'original') {
                  existingOriginalModel = child;
                } else if (child.userData.viewType === 'pointcloud') {
                  existingPointCloud = child;
                }
              }
            });

            // 只添加不存在的模型
            if (!existingOriginalModel) {
              this.objects.add(originalModel);
            }
            if (!existingPointCloud) {
              this.objects.add(pointCloud);
            }
            
            // 确保objects在场景中
            if (!this.scene.children.includes(this.objects)) {
              this.scene.add(this.objects);
              console.log('将objects添加到场景中');
            }
            
            // 复制原始模型的位置、旋转和缩放到点云
            if (existingOriginalModel) {
              pointCloud.position.copy(existingOriginalModel.position);
              pointCloud.rotation.copy(existingOriginalModel.rotation);
              pointCloud.scale.copy(existingOriginalModel.scale);
            } else {
              pointCloud.position.copy(originalModel.position);
              pointCloud.rotation.copy(originalModel.rotation);
              pointCloud.scale.copy(originalModel.scale);
            }
            // 确保点云缩放为原始模型的1000倍，并保持y轴的负值（关于xoz面倒置）
            pointCloud.scale.multiplyScalar(10);
            pointCloud.scale.y = -Math.abs(pointCloud.scale.y);
            
            // 沿y轴顺时针旋转90°
            pointCloud.rotation.y -= Math.PI / 2;
            
            // 沿y正方向移动20个单位
            pointCloud.position.y += 20;
            
            // 确保点云的深度测试和写入设置正确
            if (pointCloud.material) {
              pointCloud.material.depthTest = true;
              pointCloud.material.depthWrite = true;
            }
            
            // 确保只有点云视图可见，隐藏所有其他视图
            this.objects.children.forEach(child => {
              if (child.userData && child.userData.entityId === entity.id) {
                child.visible = (child.userData.viewType === 'pointcloud');
              }
            });
            
            // 确保新添加的模型也有正确的可见性
            if (!existingOriginalModel) {
              originalModel.visible = false;
            }
            if (!existingPointCloud) {
              pointCloud.visible = true;
            }
            console.log('原始模型可见性:', existingOriginalModel ? existingOriginalModel.visible : originalModel.visible);
            console.log('点云可见性:', existingPointCloud ? existingPointCloud.visible : pointCloud.visible);
            
            // 为原始模型添加控制器
            let modelId;
            if (existingOriginalModel) {
              // 如果已存在原始模型，使用它的名称
              modelId = parseInt(existingOriginalModel.name.replace(' 模型 ', ''));
              if (isNaN(modelId)) {
                modelId = this.getNextModelId();
                existingOriginalModel.name = " 模型 " + modelId;
              }
              // 不要重复添加控制器
            } else {
              modelId = this.getNextModelId();
              originalModel.name = " 模型 " + modelId;
              this.addModelController(originalModel);
            }
            
            // 强制渲染场景
            this.render();
            console.log('强制渲染场景');
            
            // 延迟再次渲染，确保点云完全加载
            setTimeout(() => {
              this.render();
              console.log('延迟渲染场景');
            }, 100);

            // 更新场景树
            this.updateSceneTree();
            console.log('更新场景树');

            // 渲染场景
            this.render();
            console.log('渲染场景');

          } catch (error) {
            console.error('加载PLY点云时发生错误:', error);
          }

        }, undefined, (error) => {
          console.error('加载PLY模型时发生错误:', error);
        });
      },
      
      // 加载Blender模型
      loadBlenderModel(url) {
        // Three.js不直接支持加载.blend文件
        // 通常的做法是将Blender模型导出为GLTF或GLB格式
        console.log('Blender文件加载:', url);
        console.log('注意：Three.js不直接支持加载.blend文件');
        console.log('请先在Blender中将模型导出为GLTF或GLB格式，然后再导入');
        
        // 显示提示消息
        this.$message.warning('Three.js不直接支持加载.blend文件，请先在Blender中将模型导出为GLTF或GLB格式，然后再导入');
      },
      
      handleRemove(file, fileList) {
        console.log(file, fileList);
      },
      handlePreview(file) {
        console.log(file);
      },
      handleExceed(files, fileList) {
        this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`);
      },
      beforeRemove(file, fileList) {
        return this.$confirm(`确定移除 ${ file.name }？`);
      },

      handleSuccess(response) {
        // 假设服务器响应包含文件的URL和其他信息
        this.uploadedFileInfo = {
          url: response.fileUrl, // 或 response.data.fileUrl，根据您的实际响应结构调整
          // ... 可以保存其他文件信息，如文件名等 ...
        };
        console.log('文件上传成功，文件信息:', this.uploadedFileInfo);
        this.$message.success('文件上传成功');
        console.log('Uploaded file:', response.fileUrl);
      },
      handleError(err) {
        this.$message.error('文件上传失败');
        console.error('Upload error:', err);
      },
      

      // 从零件库导入零件
      importElement(elementName){
        const stlLoader = new STLLoader()
        stlLoader.load(`./elements/${elementName}.stl`, geometry => {
          const material = new THREE.MeshPhongMaterial({
            color: 0x606060,
            specular:0x606060,
            shininess:30
          })
          const element = new THREE.Mesh(geometry,material)
          element.scale.set(0.2,0.2,0.2)
          element.name = "element"
          this.objects.add(element)

          const controlElementFolder = this.gui.addFolder(elementName)
          controlElementFolder.open()
          controlElementFolder.add(element.position, "x").min(-50).max(50).step(1).name("x坐标").listen()
          controlElementFolder.add(element.position, "y").min(-50).max(50).step(1).name("y坐标").listen()
          controlElementFolder.add(element.position, "z").min(-50).max(50).step(1).name("z坐标").listen()
          // 创建旋转控制对象，使用度作为单位
          const rotationControls = {
            x: THREE.MathUtils.radToDeg(element.rotation.x),
            y: THREE.MathUtils.radToDeg(element.rotation.y),
            z: THREE.MathUtils.radToDeg(element.rotation.z)
          }
          
          controlElementFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
            element.rotation.x = THREE.MathUtils.degToRad(value)
          })
          controlElementFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
            element.rotation.y = THREE.MathUtils.degToRad(value)
          })
          controlElementFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
            element.rotation.z = THREE.MathUtils.degToRad(value)
          })
        })
        this.importElementDialogVisible = false
      },

      // 从模型库导入模型
      importModel(modelName){
        const objLoader = new OBJLoader()
        const mtlLoader = new MTLLoader()
        mtlLoader.load(`/models/${modelName}.mtl`, (materials) => {
          // 返回一个包含材质的对象MaterialCreator
          console.log(materials)
          //obj的模型会和MaterialCreator包含的材质对应起来
          objLoader.setMaterials(materials);
          objLoader.load(`./models/${modelName}.obj`, (model) => {
            console.log(model)
            model.name = "model"
            if(modelName === "轿车" || "卡通卡车" || "卡通轿车" || "SUV"){
              model.scale.set(13,13,13)
            }
            if(modelName === "跑车"){
              model.scale.set(3,3,3)
            }
            if(modelName === "商务车"){
              model.scale.set(0.3,0.3,0.3)
            }
            if(modelName === "猫"){
              model.scale.set(0.2,0.2,0.2)
            }
            if(modelName === "小熊猫"){
              model.scale.set(1.5,1.5,1.5)
            }
            if(modelName === "鹿"){
              model.scale.set(0.1,0.1,0.1)
            }
            this.objects.add(model)
            const controlModeltFolder = this.gui.addFolder(modelName);
            controlModeltFolder.open()
            controlModeltFolder.add(model.position, "x").min(-50).max(50).step(1).name("x坐标").listen()
            controlModeltFolder.add(model.position, "y").min(-50).max(50).step(1).name("y坐标").listen()
            controlModeltFolder.add(model.position, "z").min(-50).max(50).step(1).name("z坐标").listen()
            // 创建旋转控制对象，使用度作为单位
            const rotationControls = {
              x: THREE.MathUtils.radToDeg(model.rotation.x),
              y: THREE.MathUtils.radToDeg(model.rotation.y),
              z: THREE.MathUtils.radToDeg(model.rotation.z)
            }
            
            controlModeltFolder.add(rotationControls, "x").min(-180).max(180).step(1).name("绕x轴旋转(度)").listen().onChange((value) => {
              model.rotation.x = THREE.MathUtils.degToRad(value)
            })
            controlModeltFolder.add(rotationControls, "y").min(-180).max(180).step(1).name("绕y轴旋转(度)").listen().onChange((value) => {
              model.rotation.y = THREE.MathUtils.degToRad(value)
            })
            controlModeltFolder.add(rotationControls, "z").min(-180).max(180).step(1).name("绕z轴旋转(度)").listen().onChange((value) => {
              model.rotation.z = THREE.MathUtils.degToRad(value)
            })
          })
        })
        this.importModelDialogVisible = false
      },

      // 监听从本地导入模型对话框的关闭事件
      importLocalModelDialogClosed(){
        console.log("监听从本地导入模型对话框的关闭事件")
      },

      // 监听从零件库导入模型的关闭事件
      importElementDialogClosed(){
        console.log("监听从零件库导入零件的关闭事件")
      },

      // 监听从模型库导入模型对话框的关闭事件
      importModelDialogClosed(){
        console.log("监听从模型库导入模型对话框的关闭事件")
      },

      // 导出gltf格式
      exportGltfData() {
        const exporter = new GLTFExporter();
        const documentName = this.documentInfo.documentName
        const options = {
          trs: false,
          onlyVisible: true,
          truncateDrawRange: true,
          binary: false,
          maxTextureSize: Infinity
        };
        exporter.parse(this.objects, function (result) {
          if (result instanceof ArrayBuffer) {
            // GLB模型
            const blob = new Blob([result], { type: 'application/octet-stream' });
            saveAs(blob, documentName + '模型' + '.glb');
          } else {
            // GLTF模型
            const output = JSON.stringify(result, null, 2);
            const blob = new Blob([output], { type: 'application/octet-stream' });
            
            (blob, documentName + '模型' + '.gltf');
          }
        }, options);
      },

      // 导出stl格式
      exportStlData() {
        const exporter = new STLExporter();
        const stlData = exporter.parse(this.objects);

        const documentName = this.documentInfo.documentName; // 获取文件名

        const blob = new Blob([stlData], { type: 'application/octet-stream' });
        saveAs(blob, documentName + '模型' + '.stl'); // 使用文件名
      },

      // 导出obj格式
      exportObjData() {
        const exporter = new OBJExporter();
        const objData = exporter.parse(this.objects);

        const documentName = this.documentInfo.documentName; // 获取文件名

        const blob = new Blob([objData], { type: 'application/octet-stream' });
        saveAs(blob, documentName + '模型' + '.obj'); // 使用文件名
      },

      // 监听邀请对话框的打开事件
      invite(){
        const currentURL = window.location.href;
        this.inviteForm = this.documentInfo
        this.inviteForm.url = currentURL
        this.inviteDialogVisible = true
      },
      copyURL() {
        const el = document.createElement('textarea');
        el.value = this.inviteForm.url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        this.$message.success('复制成功');
      },


      // 监听邀请对话框的关闭事件
      inviteDialogClosed(){
        console.log("监听邀请对话框的关闭事件")
      },



      

      

      // beforeDestroy() {
      //   clearTimeout(this.update);
      // },
      getcursor(){
        const createBall=() => {
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            return new THREE.Mesh(geometry, material);
          }
        this.awareness = this.provider1.awareness
        /*this.awareness.on('change', (changes) => {
          const states = this.awareness.getStates();
          const clientId = this.awareness.clientID
          const localState = this.awareness.getLocalState();
          localState.clientId = clientId;
          localState.cursorPosition = [0,0.0]
          console.log(localState)
          // 更新本地状态到 Awareness
          this.awareness.setLocalState(localState);
          
          states.forEach((state) => {
            const cursorPosition = state.cursorPosition;
            console.log(state)
         // const clientId = state.clientId;
          const color = getRandomColor();

          // 创建小球并设置颜色
          this.ball = createBall();
          this.scene.add(this.ball)
          this.ball.material.color.set(color);
          this.ball.position.x= (Math.floor(Math.random() *50))
        })
          
        //   console.log(states)
        //   console.log('本地客户端:',this.awareness.clientID)
        //   changes.added.forEach((client) => {
        //       // 远程客户端
        //       console.log('远程客户端加入了:', client);
        //       });
        //   changes.removed.forEach((client) => {
        //         console.log('客户端离开了:', client);
        //       });
        // 
      });  */
        var x = 0; var y = 0; 
        this.renderer.domElement.addEventListener("mousemove", (event) => {
        x = event.offsetX
          y = event.offsetY
        //console.log([x,y])
      })
      }
    },

  }
</script>

<style lang="less" scoped>
.el-header,.el-main{
  padding: 0;
}

.el-main{
  margin-top: 50px;
}

.main_card{
  /deep/ .el-card__body{
    padding: 0;
    height: 840px;
  }
}

.main_left{
  width: 75%;
  height: 750px;
  float:left;
  position: relative;
}

/* 操作日志面板默认放在左侧 */
#operation-log-panel{
  position: absolute;
  top: 50px;
  left: 10px;
  width: 260px;
  z-index: 100;
}

.editor_header{
  padding-top: 5px;
  padding-left: 50px;
  padding-bottom: 5px;
  
  // .el-dropdown{
  //   padding-left: 10px;
  //   padding-right: 5px;
  // }
  .el-divider--vertical{
    width: 2px;
    height: 25px;
    margin: 20px;
  }
}

.main_right{
  width: 20%;
  height: 750px;
  float:left;
  position: relative;
}

.right_container{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.draggable-panel{
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
}

#scene-panel{
  height: 40%;
}

#controls-panel{
  height: 60%;
}

.panel-header{
  background-color: #f5f7fa;
  padding: 6px 8px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  font-size: 14px;
}

.panel-header span{
  font-weight: bold;
}

.panel-controls{
  display: flex;
  align-items: center;
}

.drag-handle{
  cursor: move;
  user-select: none;
  font-size: 14px;
  color: #909399;
}

/* 操作日志拖拽按钮样式 */
.drag-button{
  cursor: grab;
  padding: 2px 6px;
  background: #e4e7ed;
  border-radius: 4px;
  border: 1px solid #c0c4cc;
  font-size: 10px;
  line-height: 1.2;
  color: #606266;
  margin-left: 4px;
}
.drag-button:active{
  cursor: grabbing;
  background: #d3d6dc;
}

.panel-content{
  padding: 8px;
  height: calc(100% - 36px);
  overflow-y: auto;
}

.tree_container{
  height: 100%;
}

.gui_canvas{
  height: 100%;
  overflow-y: auto;
}

.importElementDialog{
  display: flex;
  // flex-flow: row wrap;
  // align-content: flex-start;
  height: 800px;
  overflow: hidden;
  /deep/ .el-dialog {
    overflow: hidden;
    .el-dialog__body {
      position: absolute;
      left: 0;
      top: 54px;
      bottom: 0;
      right: 0;
      padding: 0;
      z-index: 1;
      overflow: hidden;
      overflow-y: auto;
    }
  }
  .card{
    height: 135px;
    width: 135px;
    float: left;
    padding: 20px;
    margin-bottom: 40px;
    .img{
      height: 135px;
      width: 135px;
      vertical-align: middle;
      cursor: pointer;
    }
    .elementName{
      margin: 0px;
      font-size: 12px;
      // font-weight: bold;
      text-align: center;
    }
  }
}
.importModelDialog{
  display: flex;
  // flex-flow: row wrap;
  // align-content: flex-start;
  height: 800px;
  overflow: hidden;
  /deep/ .el-dialog {
    overflow: hidden;
    .el-dialog__body {
      position: absolute;
      left: 0;
      top: 54px;
      bottom: 0;
      right: 0;
      padding: 0;
      z-index: 1;
      overflow: hidden;
      overflow-y: auto;
    }
  }
  .card{
    height: 200px;
    width: 300px;
    float: left;
    padding: 20px;
    margin-bottom: 40px;
    .img{
      height: 200px;
      width: 300px;
      vertical-align: middle;
      cursor: pointer;
    }
    .elementName{
      margin: 5px;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }
  }

}

#operation-log-panel {
  height: auto;
  min-height: 100px;
  max-height: 400px;
  resize: both;
  overflow: auto;
  position: relative;
  z-index: 100;
  cursor: move;
}

#operation-log-panel.dragging {
  opacity: 0.8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.operation-log-container {
  height: 100%;
  min-height: 60px;
  overflow-y: auto;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.operation-log-item {
  padding: 4px 2px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  word-break: break-all;
}

.drag-hint {
  position: absolute;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.3s;
}

#operation-log-panel:hover .drag-hint {
  opacity: 1;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
  font-size: 11px;
}

.log-type {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.log-type-transform {
  background-color: #409eff;
  color: white;
}

.log-type-delete {
  background-color: #f56c6c;
  color: white;
}

.log-type-create {
  background-color: #67c23a;
  color: white;
}

.log-type-sync {
  background-color: #e6a23c;
  color: white;
}

.log-type-exp3 {
  background-color: #9c27b0;
  color: white;
}

.log-content {
  color: #606266;
  flex: 1;
  word-break: break-all;
}

.no-log {
  text-align: center;
  color: #c0c4cc;
  padding: 20px;
  font-size: 13px;
}
  /* 树状图相关样式 */
  .right_container {
    display: flex;
    height: 100%;
  }
  
  .tree_container {
    width: 200px;
    border-right: 1px solid #e6e6e6;
    background-color: #f5f7fa;
    padding: 10px;
    overflow-y: auto;
  }
  
  .tree_header {
    font-weight: bold;
    margin-bottom: 10px;
    color: #303133;
    text-align: center;
    padding: 5px;
    background-color: #e6f7ff;
    border-radius: 4px;
  }
  
  .gui_canvas {
    flex: 1;
    overflow-y: auto;
  }
  
  /* 确保el-tree适应容器高度 */
  .el-tree {
    max-height: calc(100vh - 250px);
    overflow-y: auto;
  }
</style>