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
      // /** Дробная часть прогресса */
      // progress: number;
      // /** ID requestAnimationFrame — нужен для cancelAnimationFrame при прерывании */
      // frameId: number;
      // /** Timestamp предыдущего кадра (null в первом кадре) */
      // lastTs: number | null;
    }
  | {
      type: "snapping";
      /** Скорость пружины (слотов/с) */
      // velocity: number;
      // /** Текущий прогресс — приближается к target */
      // progress: number;
      // /** Целевая позиция (ближайшее целое), к которой пружина тянет */
      // target: number;
      // /** ID requestAnimationFrame */
      // frameId: number;
      // /** Timestamp предыдущего кадра */
      // lastTs: number | null;
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

            state.value = {
              type: "inertia",
              velocity: event.direction * 0.01,
            };
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
              state.value = { type: "idle" };
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
              state.value = { type: "snapping" };
              return;
            }
            if (event.releaseVelocity !== 0) {
              state.value = {
                type: "inertia",
                velocity: event.releaseVelocity,
              };
            }
            return;
          }
        }
        return;

      case "inertia":
        switch (event.type) {
          case "POINTER_DOWN":
            {
              state.value = {
                type: "pressed",
                // will cal later
                frozenProgress: 0,
              };
            }
            return;
        }

      case "snapping":
        switch (event.type) {
          case "POINTER_DOWN":
            {
              state.value = {
                type: "pressed",
                // will cal later
                frozenProgress: 0,
              };
            }
            return;
        }
    }
  }

  return {
    state,
    send,
  };
}
