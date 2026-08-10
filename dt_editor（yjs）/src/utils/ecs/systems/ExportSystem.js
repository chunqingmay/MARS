import { BaseSystem } from '../SystemManager.js'

export class ExportSystem extends BaseSystem {
  constructor() {
    super('ExportSystem')
    this.priority = 10
  }

  init() {
    console.log('[ExportSystem] Initialized')
  }

  exportToGLTF(scene, options = {}) {
    const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter')
    const exporter = new GLTFExporter()

    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => resolve(gltf),
        (error) => reject(error),
        options
      )
    })
  }

  exportToSTL(scene, options = {}) {
    const { STLExporter } = require('three/examples/jsm/exporters/STLExporter')
    const exporter = new STLExporter()

    return new Promise((resolve, reject) => {
      try {
        const stl = exporter.parse(scene, options)
        resolve(stl)
      } catch (error) {
        reject(error)
      }
    })
  }

  exportToOBJ(scene, options = {}) {
    const { OBJExporter } = require('three/examples/jsm/exporters/OBJExporter')
    const exporter = new OBJExporter()

    return new Promise((resolve, reject) => {
      try {
        const obj = exporter.parse(scene, options)
        resolve(obj)
      } catch (error) {
        reject(error)
      }
    })
  }
}
