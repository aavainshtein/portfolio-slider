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

const selectedProjectIndexModel = defineModel<number>('selectedProjectIndex', {
  default: 0,
})

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

  // In bounded mode, the visible window may not shift 1:1 with selectedProjectIndex.
  // Compute an offset so the active item always appears at position 0 (front).
  let adjustedProgress = progress
  if (!loopRef.value) {
    const n = props.projects.length
    const wSize = windowSize.value
    const windowStart = Math.max(
      0,
      Math.min(selectedProjectIndex.value, n - wSize),
    )
    const hasLeftSentinel = windowStart > 0
    const activeItemArrayIndex =
      selectedProjectIndex.value - windowStart + (hasLeftSentinel ? 1 : 0)
    adjustedProgress = progress + (activeItemArrayIndex - 1)
    console.log(
      `[UI] bounded: idx=${selectedProjectIndex.value} wStart=${windowStart} hasLeft=${hasLeftSentinel} arrIdx=${activeItemArrayIndex} progress=${progress.toFixed(3)} adjusted=${adjustedProgress.toFixed(3)} items=${items.length}`,
    )
  }

  return applyProgressStyles(items, adjustedProgress, windowSize.value)
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
      class="pointer-events-none inset-0 col-start-1 row-start-1 grid h-52 w-full self-center rounded-lg bg-gradient-to-br from-cyan-200 opacity-70 blur-[80px] dark:from-blue-400 dark:opacity-50"
    ></div>

    <!-- Slider cards -->
    <div
      class="pointer-events-none col-span-full row-start-1 grid w-full grid-cols-2 overflow-hidden"
      style="mask-image: linear-gradient(to right, transparent, #000 50%)"
    >
      <div class="col-start-2 row-start-1 grid w-full">
        <template
          v-for="(item, index) in sliderItems"
          :key="item.id"
        >
          <div
            class="col-start-1 row-start-1 grid"
            :style="{ ...item.img.containerStyle }"
          >
            <div
              class="grid w-full"
              style="perspective: 100px"
            >
              <figure
                class="relative z-[1] h-auto max-w-full translate-x-5 rounded-b-lg md:translate-x-0"
                :style="item.img.style"
              >
                <div
                  class="relative flex items-center rounded-t-lg bg-[#e5e5e5] px-24 py-2 dark:bg-[#404040]"
                >
                  <div
                    class="absolute start-4 top-2/4 flex -translate-y-1 gap-x-1"
                  >
                    <span
                      class="size-2 rounded-full bg-[#A3A3A3] dark:bg-[#717171]"
                    ></span>
                    <span
                      class="size-2 rounded-full bg-[#A3A3A3] dark:bg-[#717171]"
                    ></span>
                    <span
                      class="size-2 rounded-full bg-[#A3A3A3] dark:bg-[#717171]"
                    ></span>
                  </div>
                  <div
                    class="flex size-full items-center justify-center rounded-sm bg-[#ffffff] text-[.25rem] text-gray-400 sm:text-[.5rem] dark:bg-[#404040] dark:text-neutral-400"
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
                  class="col-start-1 row-start-1 max-w-[90dvw] self-center overflow-hidden border border-neutral-100 md:max-w-[50dvw] dark:border-neutral-800"
                />
              </figure>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Description -->
    <div
      class="mx-auto px-4 lg:container lg:col-start-1 lg:row-start-1"
      :style="{ zIndex: `${sliderItems.length * 2 + 10}` }"
    >
      <div
        class="mx-auto flex h-full w-full max-w-prose flex-col justify-between lg:mx-0 lg:max-w-60"
      >
        <div class="flex flex-col gap-5">
          <div class="inline-flex gap-4 md:gap-5">
            <button
              type="button"
              class="inline-flex h-11 w-11 cursor-pointer items-center justify-center self-center rounded-xl border border-neutral-200 bg-gray-100 p-8 text-neutral-600 hover:bg-gray-200/40 focus:outline-none active:bg-gray-200/80 lg:hidden dark:border-neutral-600 dark:bg-white/10 dark:text-neutral-400 hover:dark:bg-gray-700 active:dark:bg-gray-800"
              @click.stop="goToPrevItem"
              @touchstart.passive.stop
              @mousedown.stop
              @pointerdown.stop
            >
              <span
                class="text-2xl"
                aria-hidden="true"
              >
                <svg
                  class="size-3.5 shrink-0 md:size-6"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                  ></path>
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
              class="inline-flex h-11 w-11 cursor-pointer items-center justify-center self-center rounded-xl border border-neutral-200 bg-gray-100 p-8 text-neutral-600 hover:bg-gray-200/40 focus:outline-none active:bg-gray-200/80 lg:hidden dark:border-neutral-600 dark:bg-white/10 dark:text-neutral-400 hover:dark:bg-gray-700 active:dark:bg-gray-800"
              @click.stop="goToNextItem"
              @touchstart.passive.stop
              @mousedown.stop
              @pointerdown.stop
            >
              <span class="sr-only">Next</span>
              <span
                class="text-2xl"
                aria-hidden="true"
              >
                <svg
                  class="size-3.5 shrink-0 md:size-6"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                  ></path>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <div class="mt-5 hidden justify-between lg:flex">
          <button
            type="button"
            class="inset-y-0 start-0 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-gray-100 p-8 text-neutral-600 hover:bg-gray-200/40 focus:outline-none active:bg-gray-200/80 dark:border-neutral-600 dark:bg-white/10 dark:text-neutral-400 hover:dark:bg-gray-700 active:dark:bg-gray-800"
            @click.stop="goToPrevItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span
              class="text-2xl"
              aria-hidden="true"
            >
              <svg
                class="size-3.5 shrink-0 md:size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                ></path>
              </svg>
            </span>
            <span class="sr-only">Previous</span>
          </button>

          <button
            type="button"
            class="inset-y-0 start-0 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-gray-100 p-8 text-neutral-600 hover:bg-gray-200/40 focus:outline-none active:bg-gray-200/80 dark:border-neutral-600 dark:bg-white/10 dark:text-neutral-400 hover:dark:bg-gray-700 active:dark:bg-gray-800"
            @click.stop="goToNextItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span class="sr-only">Next</span>
            <span
              class="text-2xl"
              aria-hidden="true"
            >
              <svg
                class="size-3.5 shrink-0 md:size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                ></path>
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
