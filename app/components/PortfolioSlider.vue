<script setup lang="ts">
import type { Project } from '~/app.vue'
import type { FullGestureState } from '@vueuse/gesture'
import { createDragHandler } from '~/composables/useGestureAdapter'

const props = withDefaults(
  defineProps<{
    projects: Project[]
    renderLimit?: number
    loop?: boolean
  }>(),
  { loop: true },
)

const projectsRef = toRef(props, 'projects')
const renderLimitRef = toRef(props, 'renderLimit')
const loopRef = computed(() => props.loop)

const { state, send, selectedProjectIndex } = useSliderStateMachine(
  projectsRef,
  renderLimitRef,
  loopRef,
)

// Вычисляемый windowSize
const windowSize = computed(() => {
  const n = props.projects.length
  const limit = props.renderLimit
  if (!limit || limit >= n) return n
  return Math.max(limit, 2)
})

// Построение items с применением стилей
const sliderItems = computed(() => {
  const items = wrapForSlider(
    props.projects,
    selectedProjectIndex.value,
    windowSize.value,
    loopRef.value,
  )
  const progress =
    state.value.type === 'dragging' ||
    state.value.type === 'inertia' ||
    state.value.type === 'snapping'
      ? (state.value as { progress: number }).progress
      : 0
  return applyProgressStyles(items, progress, windowSize.value)
})

// --- Drag gesture ---
const sliderRef = ref<HTMLElement | null>(null)

const dragHandler = createDragHandler({
  send,
  getItemCount: () => sliderItems.value.length,
  getWindowSize: () => windowSize.value,
  getContainerWidth: () => sliderRef.value?.clientWidth ?? 320,
})

function onDrag(gestureState: FullGestureState<'drag'>) {
  dragHandler(gestureState)
}

function goToNextItem() {
  send({ type: 'BUTTON_PRESS', direction: 1 })
}

function goToPrevItem() {
  send({ type: 'BUTTON_PRESS', direction: -1 })
}
</script>
<template>
  <div
    ref="sliderRef"
    v-drag="onDrag"
    style="touch-action: pan-y; user-select: none; -webkit-user-select: none"
  >
    <div
      v-for="item in sliderItems"
      :key="item.id"
      :style="item.img.containerStyle"
    >
      <img
        :src="item.img.src"
        :alt="item.img.alt"
        :style="item.img.style"
        draggable="false"
      />
    </div>
    <button @click="goToPrevItem">Previous</button>
    <button @click="goToNextItem">Next</button>
  </div>
</template>
