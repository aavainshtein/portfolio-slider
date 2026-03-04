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

const selectedProjectIndexModel = defineModel<number>(
  'selectedProjectIndex',
  { default: 0 },
)

const projectsRef = toRef(props, 'projects')
const renderLimitRef = toRef(props, 'renderLimit')
const loopRef = computed(() => props.loop)

const { state, send, selectedProjectIndex, stopAnimation } =
  useSliderStateMachine(projectsRef, renderLimitRef, loopRef)

// Sync machine → v-model
watch(selectedProjectIndex, (v) => {
  selectedProjectIndexModel.value = v
})

// Sync v-model → machine
watch(selectedProjectIndexModel, (v) => {
  selectedProjectIndex.value = v
})

onUnmounted(() => {
  stopAnimation()
})

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
    class="grid w-full select-none"
    v-drag="onDrag"
    style="touch-action: pan-y; user-select: none; -webkit-user-select: none"
  >
    <!-- Gradient on bg -->
    <div
      aria-hidden="true"
      class="inset-0 w-full grid row-start-1 col-start-1 self-center blur-[80px] h-52 bg-gradient-to-br from-cyan-200 dark:from-blue-400 opacity-70 dark:opacity-50 rounded-lg pointer-events-none"
    ></div>

    <!-- Slider cards -->
    <div
      class="grid grid-cols-2 row-start-1 col-span-full w-full overflow-hidden pointer-events-none"
      style="mask-image: linear-gradient(to right, transparent, #000 50%)"
    >
      <div class="grid row-start-1 col-start-2 w-full">
        <template v-for="(item, index) in sliderItems" :key="item.id">
          <div
            class="grid row-start-1 col-start-1"
            :style="{ ...item.img.containerStyle }"
          >
            <div class="w-full grid" style="perspective: 100px">
              <figure
                class="relative z-[1] max-w-full h-auto rounded-b-lg translate-x-5 md:translate-x-0"
                :style="item.img.style"
              >
                <div
                  class="relative flex items-center bg-[#e5e5e5] rounded-t-lg py-2 px-24 dark:bg-[#404040]"
                >
                  <div
                    class="flex gap-x-1 absolute top-2/4 start-4 -translate-y-1"
                  >
                    <span
                      class="size-2 bg-[#A3A3A3] rounded-full dark:bg-[#717171]"
                    ></span>
                    <span
                      class="size-2 bg-[#A3A3A3] rounded-full dark:bg-[#717171]"
                    ></span>
                    <span
                      class="size-2 bg-[#A3A3A3] rounded-full dark:bg-[#717171]"
                    ></span>
                  </div>
                  <div
                    class="flex justify-center items-center size-full bg-[#ffffff] text-[.25rem] text-gray-400 rounded-sm sm:text-[.5rem] dark:bg-[#404040] dark:text-neutral-400"
                  >
                    {{ item.slug }}
                  </div>
                </div>
                <img
                  :src="item.img.src"
                  :alt="item.img.alt"
                  draggable="false"
                  :style="{
                    viewTransitionName:
                      index === 1 ? `project-${item.slug}` : 'none',
                  }"
                  class="row-start-1 col-start-1 self-center border border-neutral-100 dark:border-neutral-800 overflow-hidden max-w-[90dvw] md:max-w-[50dvw]"
                />
              </figure>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Description -->
    <div
      class="lg:container lg:col-start-1 lg:row-start-1 px-4 mx-auto"
      :style="{ zIndex: `${sliderItems.length * 2 + 10}` }"
    >
      <div
        class="flex flex-col justify-between h-full max-w-prose lg:max-w-60 w-full mx-auto lg:mx-0"
      >
        <div class="flex flex-col gap-5">
          <div class="inline-flex gap-4 md:gap-5">
            <button
              type="button"
              class="lg:hidden self-center p-8 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
              @click.stop="goToPrevItem"
              @touchstart.passive.stop
              @mousedown.stop
              @pointerdown.stop
            >
              <span class="text-2xl" aria-hidden="true">
                <svg class="shrink-0 size-3.5 md:size-6" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"></path>
                </svg>
              </span>
              <span class="sr-only">Previous</span>
            </button>

            <slot
              name="description"
              :selectedItemIndex="selectedProjectIndex"
            ></slot>

            <button
              type="button"
              class="lg:hidden self-center p-8 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
              @click.stop="goToNextItem"
              @touchstart.passive.stop
              @mousedown.stop
              @pointerdown.stop
            >
              <span class="sr-only">Next</span>
              <span class="text-2xl" aria-hidden="true">
                <svg class="shrink-0 size-3.5 md:size-6" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <div class="hidden lg:flex justify-between mt-5">
          <button
            type="button"
            class="p-8 inset-y-0 start-0 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
            @click.stop="goToPrevItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span class="text-2xl" aria-hidden="true">
              <svg class="shrink-0 size-3.5 md:size-6" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"></path>
              </svg>
            </span>
            <span class="sr-only">Previous</span>
          </button>

          <button
            type="button"
            class="p-8 inset-y-0 start-0 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
            @click.stop="goToNextItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span class="sr-only">Next</span>
            <span class="text-2xl" aria-hidden="true">
              <svg class="shrink-0 size-3.5 md:size-6" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"></path>
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
