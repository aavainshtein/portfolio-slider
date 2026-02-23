import type { Project } from "@/app.vue";
import type { Ref } from "vue";
import { ref } from "vue";

function truncateTowardZero(value: number) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

// --- States ---
// Каждое состояние содержит только те данные, которые имеют смысл в нём.

type SliderState =
  | { type: "idle" } // Ничего не происходит, ждём действия пользователя
  | {
      type: "pressed";
      /** Прогресс на момент нажатия — запоминаем, чтобы продолжить с этой точки */
      frozenProgress: number;
    }
  | {
      type: "dragging";
      /** Дробная часть прогресса (от -1 до 1) — насколько сдвинут между слотами */
      progress: number;
      /** Сколько целых шагов (слотов) пройдено от начала drag'а */
      stepOffset: number;
      /** Исходное смещение при начале drag'а (= frozenProgress из pressed) */
      baseOffset: number;
    }
  | {
      type: "inertia";
      /** Текущая скорость (слотов/мс) — затухает каждый кадр */
      velocity: number;
      /** Дробная часть прогресса */
      progress: number;
      /** ID requestAnimationFrame — нужен для cancelAnimationFrame при прерывании */
      frameId: number;
      /** Timestamp предыдущего кадра (null в первом кадре) */
      lastTs: number | null;
    }
  | {
      type: "snapping";
      /** Скорость пружины (слотов/с) */
      velocity: number;
      /** Текущий прогресс — приближается к target */
      progress: number;
      /** Целевая позиция (ближайшее целое), к которой пружина тянет */
      target: number;
      /** ID requestAnimationFrame */
      frameId: number;
      /** Timestamp предыдущего кадра */
      lastTs: number | null;
    };

// --- Events ---
// Внешние действия, которые получает машина через send().

type SliderEvent =
  | { type: "POINTER_DOWN" } // Палец/курсор нажат
  | {
      type: "POINTER_UP";
      /** Скорость в момент отпускания (слотов/мс). Определяет: inertia или snap */
      releaseVelocity: number;
    }
  | {
      type: "DRAG_MOVE";
      /** Суммарное смещение пальца от начала drag'а в пикселях */
      movementX: number;
      /** Сколько пикселей = один слот (зависит от ширины контейнера) */
      pixelsPerStep: number;
      /** Направленность жеста по Y (0..1). Если > 0.35 — вертикальный, игнорируем */
      dirY: number;
    }
  | {
      type: "BUTTON_PRESS";
      /** 1 = вперёд, -1 = назад */
      direction: 1 | -1;
    };

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

export function useSliderStateMachine(
  projects: Ref<Project[]>,
  renderLimit: Ref<number | undefined>,
) {
  const state = ref<SliderState>({ type: "idle" });

  function send(event: SliderEvent) {
    switch (state.value.type) {
      case "idle":
        switch (event.type) {
          case "POINTER_DOWN": {
            if (projects.value.length === 0) return;
            state.value = { type: "pressed", frozenProgress: 0 };
            return;
          }
          case "BUTTON_PRESS": {
            if (projects.value.length === 0) return;

            startInertiaLoop(
              event.direction * PHYSICS.buttonImpulseVelocity,
              0,
            );
            return;
          }
        }
        return;

      case "pressed":
        switch (event.type) {
          case "DRAG_MOVE": {
            if (event.dirY > 0.35) return;
            const frozenProgress = state.value.frozenProgress;
            const rawProgress =
              frozenProgress + -event.movementX / event.pixelsPerStep;
            const stepOffset = truncateTowardZero(rawProgress);

            state.value = {
              type: "dragging",
              progress: rawProgress - stepOffset,
              stepOffset: stepOffset,
              baseOffset: frozenProgress,
            };
            return;
          }

          case "POINTER_UP": {
            if (event.releaseVelocity === 0) {
              startSnapLoop(state.value.frozenProgress, 0);
              return;
            }
            return;
          }
        }
        return;

      case "dragging":
        switch (event.type) {
          case "DRAG_MOVE": {
            const baseOffset = state.value.baseOffset;
            const rawProgress =
              baseOffset + -event.movementX / event.pixelsPerStep;
            const stepOffset = truncateTowardZero(rawProgress);

            state.value = {
              type: "dragging",
              progress: rawProgress - stepOffset,
              stepOffset: stepOffset,
              baseOffset: baseOffset,
            };
            return;
          }

          case "POINTER_UP": {
            if (event.releaseVelocity === 0) {
              startSnapLoop(state.value.progress, 0);
              return;
            }
            if (event.releaseVelocity !== 0) {
              startInertiaLoop(
                event.releaseVelocity,
                state.value.baseOffset +
                  state.value.stepOffset +
                  state.value.progress,
              );
              return;
            }
          }
        }
        return;

      case "inertia":
        switch (event.type) {
          case "POINTER_DOWN": {
            stopAnimation();
            const currentState = state.value;
            state.value = {
              type: "pressed",
              frozenProgress: currentState.progress,
            };
            return;
          }

          case "BUTTON_PRESS": {
            const impulse = event.direction * PHYSICS.buttonImpulseVelocity;
            const newVelocity = Math.max(
              -PHYSICS.maxInertiaVelocity,
              Math.min(
                PHYSICS.maxInertiaVelocity,
                state.value.velocity + impulse,
              ),
            );
            state.value = { ...state.value, velocity: newVelocity };
            return;
          }
        }

        return;

      case "snapping":
        switch (event.type) {
          case "POINTER_DOWN": {
            stopAnimation();
            const currentState = state.value;
            state.value = {
              type: "pressed",
              frozenProgress: currentState.progress,
            };
            return;
          }

          case "BUTTON_PRESS": {
            stopAnimation();
            startInertiaLoop(
              event.direction * PHYSICS.buttonImpulseVelocity,
              state.value.progress,
            );

            return;
          }
        }
        return;
    }
  }

  function startInertiaLoop(velocity: number, progress: number) {
    const tick = (ts: number) => {
      const currentState = state.value;
      if (currentState.type !== "inertia") return;

      const lastTs = currentState.lastTs ?? ts;
      const dt = ts - lastTs;

      const dampingFactor = Math.pow(0.94, dt / 16.67);
      const newVelocity = currentState.velocity * dampingFactor;
      const newProgress = currentState.progress + newVelocity * dt;

      if (Math.abs(newVelocity) <= 0.002) {
        startSnapLoop(newProgress, 0);
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

  function startSnapLoop(progress: number, initialVelocity: number) {
    const tick = (ts: number) => {
      const currentState = state.value;
      if (currentState.type !== "snapping") return;

      const lastTs = currentState.lastTs ?? ts;
      const dt = (ts - lastTs) / 1000;

      const displacement = currentState.progress - currentState.target;
      const acceleration =
        -PHYSICS.snapSpringStiffness * displacement -
        PHYSICS.snapSpringDamping * currentState.velocity;
      const velocity = currentState.velocity + acceleration * dt;
      const newProgress = currentState.progress + velocity * dt;

      const isSettled =
        Math.abs(displacement) < PHYSICS.snapStopEpsilon &&
        Math.abs(velocity) < PHYSICS.snapStopVelocity;

      if (isSettled) {
        // Transition to idle
        state.value = { type: "idle" };
        return;
      }

      const frameId = requestAnimationFrame(tick);
      state.value = {
        type: "snapping",
        velocity: velocity,
        progress: newProgress,
        target: currentState.target,
        frameId,
        lastTs: ts,
      };
    };

    const frameId = requestAnimationFrame(tick);

    state.value = {
      type: "snapping",
      velocity: initialVelocity,
      progress,
      target: Math.round(progress),
      frameId,
      lastTs: null,
    };
  }

  function stopAnimation() {
    const currentState = state.value;
    if (currentState.type === "inertia" || currentState.type === "snapping") {
      cancelAnimationFrame(currentState.frameId);
    }
  }

  return {
    state,
    send,
  };
}
