export class SystemManager {
  constructor() {
    this.systems = []
    this.systemsByPriority = []
    this.active = true
    this.paused = false
  }

  registerSystem(system, priority = 0) {
    if (!system || typeof system.update !== 'function') {
      console.error('Invalid system: must have an update function')
      return false
    }

    system.priority = priority
    system.enabled = system.enabled !== false
    system.manager = this

    this.systems.push(system)
    this.sortSystems()
    
    if (system.init && typeof system.init === 'function') {
      system.init()
    }

    return true
  }

  unregisterSystem(system) {
    const index = this.systems.indexOf(system)
    if (index !== -1) {
      this.systems.splice(index, 1)
      if (system.destroy && typeof system.destroy === 'function') {
        system.destroy()
      }
      return true
    }
    return false
  }

  sortSystems() {
    this.systems.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0)
      if (priorityDiff !== 0) return priorityDiff
      return (a.order || 0) - (b.order || 0)
    })
  }

  update(deltaTime, currentTime) {
    if (!this.active || this.paused) return

    for (const system of this.systems) {
      if (!system.enabled) continue

      try {
        system.update(deltaTime, currentTime)
      } catch (error) {
        console.error(`System ${system.name} update error:`, error)
      }
    }
  }

  enable() {
    this.active = true
  }

  disable() {
    this.active = false
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }

  getSystem(name) {
    return this.systems.find(s => s.name === name)
  }

  getAllSystems() {
    return [...this.systems]
  }

  enableSystem(name) {
    const system = this.getSystem(name)
    if (system) {
      system.enabled = true
      return true
    }
    return false
  }

  disableSystem(name) {
    const system = this.getSystem(name)
    if (system) {
      system.enabled = false
      return true
    }
    return false
  }

  clear() {
    for (const system of this.systems) {
      if (system.destroy && typeof system.destroy === 'function') {
        system.destroy()
      }
    }
    this.systems = []
  }
}

export class BaseSystem {
  constructor(name = 'BaseSystem') {
    this.name = name
    this.enabled = true
    this.priority = 0
    this.order = 0
    this.manager = null
  }

  init() {
    // Override in subclass
  }

  update(deltaTime, currentTime) {
    // Override in subclass
  }

  destroy() {
    // Override in subclass
  }
}

export const systemManager = new SystemManager()
