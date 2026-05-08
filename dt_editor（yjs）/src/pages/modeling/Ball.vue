<template>
  <div class="cursor-wrapper" :style="{ left: position.x + 'px', top: position.y + 'px' }">
    <div class="ball" :style="{ backgroundColor: color }"></div>
    <div class="cursor-label" :style="{ backgroundColor: color }">{{ userName }}</div>
  </div>
</template>

<script>
export default {
  props: {
    clientId: {
      type: Number,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    position: {
      type: Object,
      required: true,
      default() {
        return { x: 0, y: 0 }
      }
    },
    userName: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.cursor-wrapper {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
}

.ball {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.cursor-label {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>
