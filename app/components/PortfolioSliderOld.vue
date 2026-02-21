<script setup lang="ts">
import type { Project } from "@/app.vue";
import type { FullGestureState } from "@vueuse/gesture";

type SliderItem = Omit<Project, "img"> & {
  id: string | number;
  originalIndex: number;
  img: Project["img"] & {
    style?: Record<string, string>;
    containerStyle?: Record<string, string>;
  };
};

type NumericStyle = {
  opacity: number;
  rotateY: number;
  translateX: number;
  translateZ: number;
  scale: number;
  blur: number;
  containerTranslateX: number;
  zIndex: number;
};

const props = defineProps<{
  projects: Project[];
  renderLimit?: number;
}>();

const selectedProjectIndex = defineModel<number>("selectedProjectIndex", {
  default: 0,
  required: false,
});

const sliderItems = ref<SliderItem[]>([]);

const effectiveWindowSize = computed(() => {
  const projectsLength = props.projects.length;
  if (!props.renderLimit || props.renderLimit >= projectsLength)
    return projectsLength;
  return Math.max(props.renderLimit, 2);
});

// state for dragging
const isDragging = ref(false);
const dragProgress = ref(0);
const dragStepOffset = ref(0);

// state for inertia
const inertiaVelocity = ref(0);
const inertiaFrameId = ref<number | null>(null);
const lastInertiaTs = ref<number | null>(null);

// const params for inertia
const velocityInfluence = 1.35;
const maxInertiaVelocity = 0.035;
const inertiaDamping = 0.94;
const minInertiaVelocity = 0.002;
const buttonImpulseVelocity = 0.005;

// const params for spring snap
const snapSpringStiffness = 500;
const snapSpringDamping = 20;
const snapStopEpsilon = 0.002;
const snapStopVelocity = 0.01;

watch(
  () => [props.projects, props.renderLimit],
  () => {
    // selectedProjectIndex.value >= props.projects.length &&
    //   (selectedProjectIndex.value = 0);

    console.log("selectedProjectIndex.value", selectedProjectIndex.value);

    const itemsForSlider = wrapForSlider(
      props.projects,
      selectedProjectIndex.value,
      effectiveWindowSize.value,
    );
    sliderItems.value = applyProgressStyles(itemsForSlider, 0);
  },
  { immediate: true, deep: true },
);

onUnmounted(() => {
  stopInertia();
});

function getVisibleItems(
  allItems: Project[],
  activeIdx: number,
  renderLimit: number,
) {
  if (allItems.length === 0) return [];

  const safeIdx =
    ((activeIdx % allItems.length) + allItems.length) % allItems.length;

  const effectiveRenderLimit = Math.min(renderLimit, allItems.length);

  const nextItems = allItems
    .slice(safeIdx, safeIdx + effectiveRenderLimit)
    .map((item, index) => ({
      ...item,
      originalIndex: safeIdx + index,
    }));

  if (nextItems.length < effectiveRenderLimit) {
    nextItems.push(
      ...allItems
        .slice(0, effectiveRenderLimit - nextItems.length)
        .map((item, index) => ({
          ...item,
          originalIndex: index,
        })),
    );
  }

  return nextItems;
}

function wrapForSlider(
  projects: Project[],
  activeIdx: number,
  renderLimit: number,
): SliderItem[] {
  // let items: Project[] = [];

  const visibleItems = getVisibleItems(projects, activeIdx, renderLimit);

  if (visibleItems.length < 1) return [];

  const firstVisibleIndex = visibleItems[0]?.originalIndex;
  const lastVisibleIndex = visibleItems[visibleItems.length - 1]?.originalIndex;

  if (firstVisibleIndex === undefined || lastVisibleIndex === undefined)
    return [];

  const isWindowMode = projects.length > renderLimit;

  const firstInvisibleItemIndex = isWindowMode
    ? firstVisibleIndex > 0
      ? firstVisibleIndex - 1
      : projects.length - 1
    : lastVisibleIndex;

  const lastInvisibleItemIndex = isWindowMode
    ? lastVisibleIndex < projects.length - 1
      ? lastVisibleIndex + 1
      : 0
    : firstVisibleIndex;

  const firstSourceProject = props.projects[firstInvisibleItemIndex];
  const lastSourceProject = props.projects[lastInvisibleItemIndex];
  if (!firstSourceProject || !lastSourceProject) return [];

  function getProjectId(project: Project) {
    const id = project.id ? `${project.id}` : Math.random() * 1000;
    return `${id}`;
  }

  const firstInvisibleProject = {
    ...firstSourceProject,
    originalIndex: firstInvisibleItemIndex,
  };
  const lastInvisibleProject = {
    ...lastSourceProject,
    originalIndex: lastInvisibleItemIndex,
  };

  const firstInvisibleSliderItem = {
    ...firstInvisibleProject,
    id: `first-invisible-${getProjectId(firstSourceProject)}`,
    img: {
      ...(firstInvisibleProject.img || {}),
    },
  };

  const lastInvisibleSliderItem = {
    ...lastInvisibleProject,
    id: `last-invisible-${getProjectId(lastSourceProject)}`,
    img: {
      ...(lastInvisibleProject.img || {}),
    },
  };

  const visibleItemsWithId = visibleItems.map((item, index) => ({
    ...item,
    id: `visible-${getProjectId(item)}-${index}`,
  }));

  return [
    firstInvisibleSliderItem,
    ...visibleItemsWithId,
    lastInvisibleSliderItem,
  ];
}

// functions with sideEffects to change state of projects and active item

function dragHandler(event: FullGestureState<"drag">) {
  if (sliderItems.value.length < 2) return;

  const target = event.event?.target as HTMLElement;

  if (!!target && (target.tagName === "BUTTON" || target.closest("button")))
    return;

  if (event.first) {
    stopInertia();
  }

  const dirY = Math.abs(event.direction[1]);

  if (event.dragging && dirY < 0.35) {
    isDragging.value = true;
    const pixelsPerStep = getPixelsPerStep(event);
    const rawProgress = -event.movement[0] / pixelsPerStep;
    const desiredStepOffset = truncateTowardZero(rawProgress);
    const stepDelta = desiredStepOffset - dragStepOffset.value;

    const shiftedProjects =
      stepDelta !== 0
        ? getShiftedProjectsBy(stepDelta, props.projects)
        : [...sliderItems.value];

    dragProgress.value = rawProgress - desiredStepOffset;

    sliderItems.value = applyProgressStyles(
      shiftedProjects,
      dragProgress.value,
    );

    dragStepOffset.value = desiredStepOffset;
  }

  if (event.last) {
    if (isDragging.value) {
      const pixelsPerStep = getPixelsPerStep(event);
      const vx = event.vxvy[0];
      const releaseVelocity = getSlotsVelocityFromPixelVelocity(
        -vx / pixelsPerStep,
      );

      if (Math.abs(releaseVelocity) > minInertiaVelocity) {
        startInertia(releaseVelocity);
      } else {
        finishWithSnap(0);
      }

      isDragging.value = false;
    } else {
      finishWithSnap(0);
    }
  }
}

function goToNextItem() {
  applyButtonImpulse(1);
}

function goToPrevItem() {
  applyButtonImpulse(-1);
}

function applyButtonImpulse(direction: 1 | -1) {
  if (sliderItems.value.length < 2) return;

  isDragging.value = false;
  dragStepOffset.value = 0;

  const impulse = direction * buttonImpulseVelocity;
  const nextVelocity = clamp(
    inertiaVelocity.value + impulse,
    -maxInertiaVelocity,
    maxInertiaVelocity,
  );

  if (inertiaFrameId.value !== null) {
    inertiaVelocity.value = nextVelocity;
    return;
  }

  // console.log("Applying button impulse with velocity:", nextVelocity);

  startInertia(nextVelocity);
}

function shiftProjectsBy(steps: number) {
  const n = props.projects.length;
  if (n < 2) return;
  console.log(
    "shifting projects by steps:",
    steps,
    "Current selectedProjectIndex:",
    selectedProjectIndex.value,
    "Total projects:",
    n,
  );

  const newSelectedIndex = (((selectedProjectIndex.value + steps) % n) + n) % n;

  selectedProjectIndex.value = newSelectedIndex;

  const itemsForSlider = wrapForSlider(
    props.projects,
    newSelectedIndex,
    effectiveWindowSize.value,
  );
  sliderItems.value = applyProgressStyles(itemsForSlider, 0);
}

function finishWithSnap(initialVelocity = 0) {
  stopInertia();

  const targetPosition = Math.round(dragProgress.value);
  let springVelocity = initialVelocity;
  lastInertiaTs.value = null;

  console.log("Finishing with snap to target position:", targetPosition);

  const snapTick = (ts: number) => {
    if (lastInertiaTs.value === null) {
      lastInertiaTs.value = ts;
    }

    const dt = (ts - (lastInertiaTs.value ?? ts)) / 1000;
    lastInertiaTs.value = ts;

    const displacement = dragProgress.value - targetPosition;
    const acceleration =
      -snapSpringStiffness * displacement - snapSpringDamping * springVelocity;

    springVelocity += acceleration * dt;
    dragProgress.value += springVelocity * dt;
    inertiaVelocity.value = springVelocity;

    sliderItems.value = applyProgressStyles(
      sliderItems.value,
      dragProgress.value,
    );

    const isSettled =
      Math.abs(displacement) < snapStopEpsilon &&
      Math.abs(springVelocity) < snapStopVelocity;

    if (isSettled) {
      if (targetPosition !== 0) {
        console.log(
          "Snap completed, shifting projects to final position:",
          targetPosition,
        );
        shiftProjectsBy(targetPosition);
      } else {
        sliderItems.value = applyProgressStyles(sliderItems.value, 0);
      }

      dragProgress.value = 0;
      dragStepOffset.value = 0;
      inertiaVelocity.value = 0;
      lastInertiaTs.value = null;

      if (inertiaFrameId.value !== null) {
        cancelAnimationFrame(inertiaFrameId.value);
        inertiaFrameId.value = null;
      }
      return;
    }

    inertiaFrameId.value = requestAnimationFrame(snapTick);
  };

  inertiaFrameId.value = requestAnimationFrame(snapTick);
}

function startInertia(inertiaVelocityValue: number) {
  stopInertia();
  inertiaVelocity.value = inertiaVelocityValue;
  lastInertiaTs.value = null;

  const tick = (ts: number) => {
    if (lastInertiaTs.value === null) {
      lastInertiaTs.value = ts;
    }
    console.log("Shifting right due to inertia");

    const dt = ts - (lastInertiaTs.value ?? ts);
    lastInertiaTs.value = ts;

    const dampingFactor = Math.pow(inertiaDamping, dt / 16.67);
    inertiaVelocity.value *= dampingFactor;

    dragProgress.value += inertiaVelocity.value * dt;
    while (dragProgress.value >= 1) {
      shiftProjectsBy(1);
      dragProgress.value -= 1;
    }
    while (dragProgress.value <= -1) {
      shiftProjectsBy(-1);
      dragProgress.value += 1;
    }
    sliderItems.value = applyProgressStyles(
      sliderItems.value,
      dragProgress.value,
    );

    if (Math.abs(inertiaVelocity.value) <= minInertiaVelocity) {
      console.log("Inertia stopped, finishing with snap");
      finishWithSnap(inertiaVelocity.value);
      return;
    }

    inertiaFrameId.value = requestAnimationFrame(tick);
  };

  inertiaFrameId.value = requestAnimationFrame(tick);
}

// style math side effect free functions

function getShiftedProjectsBy(steps: number, projects: Project[]) {
  const totalProjects = projects.length;

  const previewIndex =
    (((selectedProjectIndex.value + steps) % totalProjects) + totalProjects) %
    totalProjects;

  selectedProjectIndex.value = previewIndex;
  return wrapForSlider(projects, previewIndex, effectiveWindowSize.value);
}

function applyProgressStyles(items: SliderItem[], progress = 0) {
  return items.map((item, index) => {
    const styleValues = getInterpolatedStyle(index - progress - 1);
    const newStyle = buildStyle(styleValues);

    return {
      ...item,
      img: {
        ...item.img,
        style: newStyle.imageStyle,
        containerStyle: newStyle.containerStyle,
      },
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, value: number) {
  return start + (end - start) * value;
}

function getBaseParams() {
  const length = effectiveWindowSize.value;
  const maxDepth = Math.min(length * 40, 500);
  return {
    length,
    last: length - 1 || 1,
    maxRotate: Math.min(length * 3, 75),
    maxDepth,
    minScale: clamp(1 - length * 0.05, 0.4, 0.9),
    maxBlur: 60,
  };
}

function getVisibleStyleValues(index: number): NumericStyle {
  const { length, last, maxRotate, maxDepth, minScale, maxBlur } =
    getBaseParams();
  const positionRatio = index / last;

  return {
    opacity: 100,
    rotateY: -(maxRotate * positionRatio + 2),
    translateX: index === 0 ? -60 : -50,
    translateZ: -maxDepth * positionRatio,
    scale: 1 - (1 - minScale) * positionRatio,
    blur: maxBlur * positionRatio,
    containerTranslateX: (50 / (length || 1)) * index,
    zIndex: length - index + 2,
  };
}

function buildStyle(styleValues: NumericStyle) {
  return {
    imageStyle: {
      opacity: `${styleValues.opacity}%`,
      transform: `
        perspective(1000px)
        rotateY(${styleValues.rotateY}deg)
        translateX(${styleValues.translateX}%)
        translateZ(${styleValues.translateZ}px)
        scale(${styleValues.scale})
      `,
      filter: `blur(${styleValues.blur}px)`,
    },
    containerStyle: {
      zIndex: `${Math.round(styleValues.zIndex)}`,
      transform: `translateX(${styleValues.containerTranslateX}%)`,
    },
  };
}

function interpolateStyle(from: NumericStyle, to: NumericStyle, value: number) {
  return {
    opacity: lerp(from.opacity, to.opacity, value),
    rotateY: lerp(from.rotateY, to.rotateY, value),
    translateX: lerp(from.translateX, to.translateX, value),
    translateZ: lerp(from.translateZ, to.translateZ, value),
    scale: lerp(from.scale, to.scale, value),
    blur: lerp(from.blur, to.blur, value),
    containerTranslateX: lerp(
      from.containerTranslateX,
      to.containerTranslateX,
      value,
    ),
    zIndex: lerp(from.zIndex, to.zIndex, value),
  };
}

function getFirstInvisibleStyle(): NumericStyle {
  return {
    opacity: 0,
    rotateY: 0,
    translateX: -50,
    translateZ: 0,
    scale: 1,
    blur: 10,
    containerTranslateX: -50,
    zIndex: effectiveWindowSize.value * 2 + 100,
  };
}

function getLastInvisibleStyle(): NumericStyle {
  const { maxDepth } = getBaseParams();
  return {
    opacity: 0,
    rotateY: -32,
    translateX: -50,
    translateZ: -maxDepth,
    scale: 0.05,
    blur: 100,
    containerTranslateX: 50,
    zIndex: 0,
  };
}

function getInterpolatedStyle(position: number): NumericStyle {
  const length = effectiveWindowSize.value;
  if (!length) return getFirstInvisibleStyle();

  if (position <= -1) return getFirstInvisibleStyle();
  if (position >= length) return getLastInvisibleStyle();

  if (position < 0) {
    const amount = position + 1;
    return interpolateStyle(
      getFirstInvisibleStyle(),
      getVisibleStyleValues(0),
      amount,
    );
  }

  if (position > length - 1) {
    const amount = position - (length - 1);
    return interpolateStyle(
      getVisibleStyleValues(length - 1),
      getLastInvisibleStyle(),
      amount,
    );
  }

  const startIndex = Math.floor(position);
  const endIndex = Math.min(startIndex + 1, length - 1);
  const amount = position - startIndex;

  return interpolateStyle(
    getVisibleStyleValues(startIndex),
    getVisibleStyleValues(endIndex),
    amount,
  );
}

// movement pure functions

function truncateTowardZero(value: number) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function getPixelsPerStep(event: FullGestureState<"drag">): number {
  const currentTarget = event.event?.currentTarget as HTMLElement | null;
  if (!currentTarget) return 320;
  return (currentTarget.clientWidth * 0.5) / effectiveWindowSize.value;
}

function getSlotsVelocityFromPixelVelocity(vx: number): number {
  const scaled = vx * velocityInfluence;
  return clamp(scaled, -maxInertiaVelocity, maxInertiaVelocity);
}

function stopInertia() {
  if (inertiaFrameId.value !== null) {
    cancelAnimationFrame(inertiaFrameId.value);
    inertiaFrameId.value = null;
  }
  inertiaVelocity.value = 0;
  lastInertiaTs.value = null;
}
</script>

<template>
  <div
    class="grid w-full select-none"
    v-drag="dragHandler"
    style="touch-action: pan-y; user-select: none; -webkit-user-select: none"
  >
    <!-- Gradient on bg -->
    <div
      aria-hidden="true"
      class="inset-0 w-full grid row-start-1 col-start-1 self-center blur-[80px] h-52 bg-gradient-to-br from-cyan-200 dark:from-blue-400 opacity-70 dark:opacity-50 rounded-lg pointer-events-none"
    ></div>
    <!-- Gradient on bg End -->

    <!-- Slider cards-->
    <div
      class="grid grid-cols-2 row-start-1 col-span-full w-full overflow-hidden pointer-events-none"
      style="mask-image: linear-gradient(to right, transparent, #000 50%)"
    >
      <div class="grid row-start-1 col-start-2 w-full">
        <template v-for="(item, index) in sliderItems" :key="item.id">
          <div
            class="grid row-start-1 col-start-1"
            :style="{
              ...item.img.containerStyle,
            }"
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
                  :alt="item.img.src"
                  draggable="false"
                  :style="{
                    viewTransitionName:
                      index === 1 ? `project-${item.slug}` : 'none',
                  }"
                  class="rounded-3xl- row-start-1 col-start-1 self-center border border-neutral-100 dark:border-neutral-800 overflow-hidden max-w-[90dvw] md:max-w-[50dvw]"
                />
              </figure>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- Slider Cards end-->

    <!-- Description-->
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
                <svg
                  class="shrink-0 size-3.5 md:size-6"
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
              class="lg:hidden self-center p-8 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
              @click.stop="goToNextItem"
              @touchstart.passive.stop
              @mousedown.stop
              @pointerdown.stop
            >
              <span class="sr-only">Next</span>
              <span class="text-2xl" aria-hidden="true">
                <svg
                  class="shrink-0 size-3.5 md:size-6"
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

        <div class="hidden lg:flex justify-between mt-5">
          <button
            type="button"
            class="p-8 inset-y-0 start-0 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
            @click="goToPrevItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span class="text-2xl" aria-hidden="true">
              <svg
                class="shrink-0 size-3.5 md:size-6"
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
            class="p-8 inset-y-0 start-0 inline-flex justify-center items-center cursor-pointer focus:outline-none h-11 w-11 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200/40 hover:dark:bg-gray-700 active:bg-gray-200/80 active:dark:bg-gray-800"
            @click="goToNextItem"
            @touchstart.passive.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <span class="sr-only">Next</span>
            <span class="text-2xl" aria-hidden="true">
              <svg
                class="shrink-0 size-3.5 md:size-6"
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
    <!-- Description end-->
  </div>
</template>
