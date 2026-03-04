<script setup lang="ts">
import type { Project } from '~/app.vue'

// import { wrapForSlider } from '~/composables/useSliderItems'
// import { applyProgressStyles } from '~/composables/useSliderStyles'

const props = defineProps<{
  projects: Project[]
  renderLimit?: number
}>()

const projectsRef = toRef(props, 'projects')
const renderLimitRef = toRef(props, 'renderLimit')

const { state, send } = useSliderStateMachine(projectsRef, renderLimitRef)

// Вычисляемый windowSize
const windowSize = computed(() => {
  const n = props.projects.length
  const limit = props.renderLimit
  if (!limit || limit >= n) return n
  return Math.max(limit, 2)
})

// Построение items с применением стилей
const sliderItems = computed(() => {
  const items = wrapForSlider(props.projects, 0, windowSize.value)
  const progress =
    state.value.type === 'dragging' ||
    state.value.type === 'inertia' ||
    state.value.type === 'snapping'
      ? (state.value as { progress: number }).progress
      : 0
  return applyProgressStyles(items, progress, windowSize.value)
})

function goToNextItem() {
  send({ type: 'BUTTON_PRESS', direction: 1 })
}

function goToPrevItem() {
  send({ type: 'BUTTON_PRESS', direction: -1 })
}
</script>
<template>
  <div>
    <div
      v-for="item in sliderItems"
      :key="item.id"
    >
      <img
        :src="item.img.src"
        :alt="item.img.alt"
        :style="item.img.style"
      />
    </div>
    <button @click="goToPrevItem">Previous</button>
    <button @click="goToNextItem">Next</button>
  </div>
</template>
