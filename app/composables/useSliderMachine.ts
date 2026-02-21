import type { Project } from "@/app.vue";
import type { SliderItem } from "./useSliderItems";
import { wrapForSlider } from "./useSliderItems";
import { applyProgressStyles, clamp } from "./useSliderStyles";

// --- Types ---

type SliderState =
  | { type: "idle" }
  | { type: "pressed"; frozenProgress: number }
  | {
      type: "dragging";
      progress: number;
      stepOffset: number;
      baseOffset: number;
    }
  | {
      type: "inertia";
      velocity: number;
      progress: number;
      frameId: number;
      lastTs: number | null;
    }
  | {
      type: "snapping";
      velocity: number;
      progress: number;
      target: number;
      frameId: number;
      lastTs: number | null;
    };

export type SliderEvent =
  | { type: "POINTER_DOWN" }
  | {
      type: "DRAG_MOVE";
      movementX: number;
      pixelsPerStep: number;
      dirY: number;
    }
  | { type: "POINTER_UP"; releaseVelocity: number }
  | { type: "BUTTON_PRESS"; direction: 1 | -1 };

// --- Physics constants ---

const PHYSICS = {
  velocityInfluence: 1.35,
  maxInertiaVelocity: 0.035,
  inertiaDamping: 0.94,
  minInertiaVelocity: 0.002,
  buttonImpulseVelocity: 0.005,
  snapSpringStiffness: 500,
  snapSpringDamping: 20,
  snapStopEpsilon: 0.002,
  snapStopVelocity: 0.01,
} as const;

// --- Pure helpers ---

function truncateTowardZero(value: number) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function slotsVelocityFromPixelVelocity(vx: number): number {
  const scaled = vx * PHYSICS.velocityInfluence;
  return clamp(scaled, -PHYSICS.maxInertiaVelocity, PHYSICS.maxInertiaVelocity);
}

// --- Composable ---

export function useSliderMachine(
  projects: Readonly<Ref<Project[]>>,
  renderLimit: Readonly<Ref<number | undefined>>,
) {
  const selectedProjectIndex = ref(0);
  const sliderItems = ref<SliderItem[]>([]);
  const state = ref<SliderState>({ type: "idle" });

  const effectiveWindowSize = computed(() => {
    const projectsLength = projects.value.length;
    const limit = renderLimit.value;
    if (!limit || limit >= projectsLength) return projectsLength;
    return Math.max(limit, 2);
  });

  // Rebuild items when projects or renderLimit change
  watch(
    () => [projects.value, renderLimit.value],
    () => {
      rebuildItems(0);
    },
    { immediate: true, deep: true },
  );

  onUnmounted(() => {
    stopAnimation();
  });

  // --- Internal: item management ---

  function rebuildItems(progress: number) {
    const items = wrapForSlider(
      projects.value,
      selectedProjectIndex.value,
      effectiveWindowSize.value,
    );
    sliderItems.value = applyProgressStyles(
      items,
      progress,
      effectiveWindowSize.value,
    );
  }

  function shiftSelectedIndex(steps: number) {
    const n = projects.value.length;
    if (n < 2) return;
    selectedProjectIndex.value =
      (((selectedProjectIndex.value + steps) % n) + n) % n;
  }

  function commitShift(progress: number) {
    const target = Math.round(progress);
    if (target !== 0) {
      shiftSelectedIndex(target);
    }
    rebuildItems(0);
  }

  function updateItemStyles(progress: number) {
    sliderItems.value = applyProgressStyles(
      sliderItems.value,
      progress,
      effectiveWindowSize.value,
    );
  }

  // --- Internal: animation frame management ---

  function stopAnimation() {
    const s = state.value;
    if (s.type === "inertia" || s.type === "snapping") {
      cancelAnimationFrame(s.frameId);
    }
  }

  // --- Internal: start inertia loop ---

  function startInertiaLoop(velocity: number, progress: number) {
    const tick = (ts: number) => {
      const s = state.value;
      if (s.type !== "inertia") return;

      const lastTs = s.lastTs ?? ts;
      const dt = ts - lastTs;

      const dampingFactor = Math.pow(PHYSICS.inertiaDamping, dt / 16.67);
      const newVelocity = s.velocity * dampingFactor;
      let newProgress = s.progress + newVelocity * dt;

      // Shift items when progress crosses ±1
      let shifted = false;
      while (newProgress >= 1) {
        shiftSelectedIndex(1);
        newProgress -= 1;
        shifted = true;
      }
      while (newProgress <= -1) {
        shiftSelectedIndex(-1);
        newProgress += 1;
        shifted = true;
      }

      if (shifted) {
        rebuildItems(newProgress);
      } else {
        updateItemStyles(newProgress);
      }

      // Check if velocity depleted → transition to snapping
      if (Math.abs(newVelocity) <= PHYSICS.minInertiaVelocity) {
        startSnapLoop(newProgress, newVelocity);
        return;
      }

      const frameId = requestAnimationFrame(tick);
      state.value = {
        type: "inertia",
        velocity: newVelocity,
        progress: newProgress,
        frameId,
        lastTs: ts,
      };
    };

    const frameId = requestAnimationFrame(tick);
    state.value = {
      type: "inertia",
      velocity,
      progress,
      frameId,
      lastTs: null,
    };
  }

  // --- Internal: start snap loop ---

  function startSnapLoop(progress: number, initialVelocity = 0) {
    const target = Math.round(progress);
    let springVelocity = initialVelocity;

    const snapTick = (ts: number) => {
      const s = state.value;
      if (s.type !== "snapping") return;

      const lastTs = s.lastTs ?? ts;
      const dt = (ts - lastTs) / 1000;

      const displacement = s.progress - target;
      const acceleration =
        -PHYSICS.snapSpringStiffness * displacement -
        PHYSICS.snapSpringDamping * springVelocity;

      springVelocity += acceleration * dt;
      const newProgress = s.progress + springVelocity * dt;

      updateItemStyles(newProgress);

      const isSettled =
        Math.abs(displacement) < PHYSICS.snapStopEpsilon &&
        Math.abs(springVelocity) < PHYSICS.snapStopVelocity;

      if (isSettled) {
        // Transition to idle
        commitShift(target);
        state.value = { type: "idle" };
        return;
      }

      const frameId = requestAnimationFrame(snapTick);
      state.value = {
        type: "snapping",
        velocity: springVelocity,
        progress: newProgress,
        target,
        frameId,
        lastTs: ts,
      };
    };

    const frameId = requestAnimationFrame(snapTick);
    state.value = {
      type: "snapping",
      velocity: initialVelocity,
      progress,
      target,
      frameId,
      lastTs: null,
    };
  }

  // --- Public: send event ---

  function send(event: SliderEvent) {
    const s = state.value;

    switch (s.type) {
      case "idle": {
        switch (event.type) {
          case "POINTER_DOWN": {
            if (sliderItems.value.length < 2) return;
            state.value = { type: "pressed", frozenProgress: 0 };
            return;
          }
          case "BUTTON_PRESS": {
            if (sliderItems.value.length < 2) return;
            const impulse = event.direction * PHYSICS.buttonImpulseVelocity;
            startInertiaLoop(impulse, 0);
            return;
          }
        }
        return;
      }

      case "pressed": {
        switch (event.type) {
          case "DRAG_MOVE": {
            if (event.dirY >= 0.35) return; // not horizontal
            const rawProgress =
              s.frozenProgress + -event.movementX / event.pixelsPerStep;
            const stepOffset = truncateTowardZero(rawProgress);
            const progress = rawProgress - stepOffset;

            if (stepOffset !== 0) {
              shiftSelectedIndex(stepOffset);
              rebuildItems(progress);
            } else {
              updateItemStyles(progress);
            }

            state.value = {
              type: "dragging",
              progress,
              stepOffset,
              baseOffset: s.frozenProgress,
            };
            return;
          }
          case "POINTER_UP": {
            startSnapLoop(s.frozenProgress, 0);
            return;
          }
        }
        return;
      }

      case "dragging": {
        switch (event.type) {
          case "DRAG_MOVE": {
            const rawProgress =
              s.baseOffset + -event.movementX / event.pixelsPerStep;
            const desiredStepOffset = truncateTowardZero(rawProgress);
            const stepDelta = desiredStepOffset - s.stepOffset;
            const progress = rawProgress - desiredStepOffset;

            if (stepDelta !== 0) {
              shiftSelectedIndex(stepDelta);
              rebuildItems(progress);
            } else {
              updateItemStyles(progress);
            }

            state.value = {
              type: "dragging",
              progress,
              stepOffset: desiredStepOffset,
              baseOffset: s.baseOffset,
            };
            return;
          }
          case "POINTER_UP": {
            if (Math.abs(event.releaseVelocity) > PHYSICS.minInertiaVelocity) {
              startInertiaLoop(event.releaseVelocity, s.progress);
            } else {
              startSnapLoop(s.progress, 0);
            }
            return;
          }
        }
        return;
      }

      case "inertia": {
        switch (event.type) {
          case "POINTER_DOWN": {
            if (sliderItems.value.length < 2) return;
            stopAnimation();
            state.value = {
              type: "pressed",
              frozenProgress: s.progress,
            };
            return;
          }
          case "BUTTON_PRESS": {
            const impulse = event.direction * PHYSICS.buttonImpulseVelocity;
            const newVelocity = clamp(
              s.velocity + impulse,
              -PHYSICS.maxInertiaVelocity,
              PHYSICS.maxInertiaVelocity,
            );
            // Update velocity in-place; the rAF loop picks it up
            state.value = { ...s, velocity: newVelocity };
            return;
          }
        }
        return;
      }

      case "snapping": {
        switch (event.type) {
          case "POINTER_DOWN": {
            if (sliderItems.value.length < 2) return;
            stopAnimation();
            state.value = {
              type: "pressed",
              frozenProgress: s.progress,
            };
            return;
          }
        }
        return;
      }
    }
  }

  return {
    state: readonly(state),
    sliderItems: readonly(sliderItems),
    selectedProjectIndex,
    send,
  };
}
