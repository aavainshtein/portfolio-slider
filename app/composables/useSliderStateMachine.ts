import type { Project } from '@/app.vue'
import type { Ref } from 'vue'
import { ref } from 'vue'

function truncateTowardZero(value: number) {
  return value < 0 ? Math.ceil(value) : Math.floor(value)
}

export function rubberBand(
  overscroll: number,
  maxOverscroll = 1,
  coeff = 0.55,
): number {
  return (
    (1 - Math.exp(-Math.abs(overscroll) / maxOverscroll)) *
    maxOverscroll *
    coeff *
    Math.sign(overscroll)
  )
}

// --- States ---
// Каждое состояние содержит только те данные, которые имеют смысл в нём.

type SliderState =
  | { type: 'idle' } // Ничего не происходит, ждём действия пользователя
  | {
      type: 'pressed'
      /** Прогресс на момент нажатия — запоминаем, чтобы продолжить с этой точки */
      frozenProgress: number
    }
  | {
      type: 'dragging'
      /** Дробная часть прогресса (от -1 до 1) — насколько сдвинут между слотами */
      progress: number
      /** Сколько целых шагов (слотов) пройдено от начала drag'а */
      stepOffset: number
      /** Исходное смещение при начале drag'а (= frozenProgress из pressed) */
      baseOffset: number
    }
  | {
      type: 'inertia'
      /** Текущая скорость (слотов/мс) — затухает каждый кадр */
      velocity: number
      /** Дробная часть прогресса */
      progress: number
      /** ID requestAnimationFrame — нужен для cancelAnimationFrame при прерывании */
      frameId: number
      /** Timestamp предыдущего кадра (null в первом кадре) */
      lastTs: number | null
    }
  | {
      type: 'snapping'
      /** Скорость пружины (слотов/с) */
      velocity: number
      /** Текущий прогресс — приближается к target */
      progress: number
      /** Целевая позиция (ближайшее целое), к которой пружина тянет */
      target: number
      /** ID requestAnimationFrame */
      frameId: number
      /** Timestamp предыдущего кадра */
      lastTs: number | null
    }

// --- Events ---
// Внешние действия, которые получает машина через send().

type SliderEvent =
  | { type: 'POINTER_DOWN' } // Палец/курсор нажат
  | {
      type: 'POINTER_UP'
      /** Скорость в момент отпускания (слотов/мс). Определяет: inertia или snap */
      releaseVelocity: number
    }
  | {
      type: 'DRAG_MOVE'
      /** Суммарное смещение пальца от начала drag'а в пикселях */
      movementX: number
      /** Сколько пикселей = один слот (зависит от ширины контейнера) */
      pixelsPerStep: number
      /** Направленность жеста по Y (0..1). Если > 0.35 — вертикальный, игнорируем */
      dirY: number
    }
  | {
      type: 'BUTTON_PRESS'
      /** 1 = вперёд, -1 = назад */
      direction: 1 | -1
    }

export const PHYSICS = {
  velocityInfluence: 1.35,
  maxInertiaVelocity: 0.035,
  inertiaDamping: 0.94,
  minInertiaVelocity: 0.002,
  buttonImpulseVelocity: 0.005,
  snapSpringStiffness: 500,
  snapSpringDamping: 20,
  snapStopEpsilon: 0.002,
  snapStopVelocity: 0.01,
} as const

export function useSliderStateMachine(
  projects: Ref<Project[]>,
  renderLimit: Ref<number | undefined>,
  loop: Ref<boolean> = ref(true),
) {
  const state = ref<SliderState>({ type: 'idle' })
  const selectedProjectIndex = ref(0)

  function shiftSelectedIndex(steps: number): number {
    const n = projects.value.length
    if (n < 2) return 0
    const old = selectedProjectIndex.value
    if (loop.value) {
      selectedProjectIndex.value = (((old + steps) % n) + n) % n
      return steps
    } else {
      const next = Math.max(0, Math.min(old + steps, n - 1))
      const actual = next - old
      selectedProjectIndex.value = next
      return actual
    }
  }

  function send(event: SliderEvent) {
    switch (state.value.type) {
      case 'idle':
        switch (event.type) {
          case 'POINTER_DOWN': {
            if (projects.value.length === 0) return
            state.value = { type: 'pressed', frozenProgress: 0 }
            return
          }
          case 'BUTTON_PRESS': {
            if (projects.value.length === 0) return

            startInertiaLoop(event.direction * PHYSICS.buttonImpulseVelocity, 0)
            return
          }
        }
        return

      case 'pressed':
        switch (event.type) {
          case 'DRAG_MOVE': {
            if (event.dirY > 0.35) return
            const frozenProgress = state.value.frozenProgress
            const rawProgress =
              frozenProgress + -event.movementX / event.pixelsPerStep

            // Bounded rubber-band: if at edge and dragging past it
            if (!loop.value) {
              const idx = selectedProjectIndex.value
              const n = projects.value.length
              const atLeftEdge = idx === 0 && rawProgress < 0
              const atRightEdge = idx === n - 1 && rawProgress > 0
              if (atLeftEdge || atRightEdge) {
                state.value = {
                  type: 'dragging',
                  progress: rubberBand(rawProgress),
                  stepOffset: 0,
                  baseOffset: frozenProgress,
                }
                return
              }
            }

            const stepOffset = truncateTowardZero(rawProgress)
            if (stepOffset !== 0) {
              shiftSelectedIndex(stepOffset)
            }

            state.value = {
              type: 'dragging',
              progress: rawProgress - stepOffset,
              stepOffset: stepOffset,
              baseOffset: frozenProgress,
            }
            return
          }

          case 'POINTER_UP': {
            if (event.releaseVelocity === 0) {
              startSnapLoop(state.value.frozenProgress, 0)
              return
            }
            return
          }
        }
        return

      case 'dragging':
        switch (event.type) {
          case 'DRAG_MOVE': {
            const currentDragging = state.value
            const baseOffset = currentDragging.baseOffset
            const rawProgress =
              baseOffset + -event.movementX / event.pixelsPerStep

            // Bounded rubber-band
            if (!loop.value) {
              const idx = selectedProjectIndex.value
              const n = projects.value.length
              const atLeftEdge = idx === 0 && rawProgress < 0
              const atRightEdge = idx === n - 1 && rawProgress > 0
              if (atLeftEdge || atRightEdge) {
                state.value = {
                  type: 'dragging',
                  progress: rubberBand(rawProgress),
                  stepOffset: 0,
                  baseOffset: baseOffset,
                }
                return
              }
            }

            const desiredStepOffset = truncateTowardZero(rawProgress)
            const stepDelta = desiredStepOffset - currentDragging.stepOffset
            if (stepDelta !== 0) {
              shiftSelectedIndex(stepDelta)
            }

            state.value = {
              type: 'dragging',
              progress: rawProgress - desiredStepOffset,
              stepOffset: desiredStepOffset,
              baseOffset: baseOffset,
            }
            return
          }

          case 'POINTER_UP': {
            if (event.releaseVelocity === 0) {
              startSnapLoop(state.value.progress, 0)
              return
            }
            if (event.releaseVelocity !== 0) {
              startInertiaLoop(
                event.releaseVelocity,
                state.value.baseOffset +
                  state.value.stepOffset +
                  state.value.progress,
              )
              return
            }
          }
        }
        return

      case 'inertia':
        switch (event.type) {
          case 'POINTER_DOWN': {
            stopAnimation()
            const currentState = state.value
            state.value = {
              type: 'pressed',
              frozenProgress: currentState.progress,
            }
            return
          }

          case 'BUTTON_PRESS': {
            const impulse = event.direction * PHYSICS.buttonImpulseVelocity
            const newVelocity = Math.max(
              -PHYSICS.maxInertiaVelocity,
              Math.min(
                PHYSICS.maxInertiaVelocity,
                state.value.velocity + impulse,
              ),
            )
            state.value = { ...state.value, velocity: newVelocity }
            return
          }
        }

        return

      case 'snapping':
        switch (event.type) {
          case 'POINTER_DOWN': {
            stopAnimation()
            const currentState = state.value
            state.value = {
              type: 'pressed',
              frozenProgress: currentState.progress,
            }
            return
          }

          case 'BUTTON_PRESS': {
            stopAnimation()
            startInertiaLoop(
              event.direction * PHYSICS.buttonImpulseVelocity,
              state.value.progress,
            )

            return
          }
        }
        return
    }
  }

  function startInertiaLoop(velocity: number, progress: number) {
    const tick = (ts: number) => {
      const currentState = state.value
      if (currentState.type !== 'inertia') return

      const lastTs = currentState.lastTs ?? ts
      const dt = ts - lastTs

      const dampingFactor = Math.pow(0.94, dt / 16.67)
      const newVelocity = currentState.velocity * dampingFactor
      let newProgress = currentState.progress + newVelocity * dt

      // Shift index when progress crosses ±1
      while (newProgress >= 1) {
        const actual = shiftSelectedIndex(1)
        if (actual === 0) {
          // Bounded: hit the edge → snap back
          startSnapLoop(0, 0)
          return
        }
        newProgress -= 1
      }
      while (newProgress <= -1) {
        const actual = shiftSelectedIndex(-1)
        if (actual === 0) {
          startSnapLoop(0, 0)
          return
        }
        newProgress += 1
      }

      if (Math.abs(newVelocity) <= 0.002) {
        startSnapLoop(newProgress, 0)
        return
      }

      const frameId = requestAnimationFrame(tick)
      state.value = {
        type: 'inertia',
        velocity: newVelocity,
        progress: newProgress,
        frameId,
        lastTs: ts,
      }
    }

    const frameId = requestAnimationFrame(tick)
    state.value = {
      type: 'inertia',
      velocity,
      progress,
      frameId,
      lastTs: null,
    }
  }

  function startSnapLoop(progress: number, initialVelocity: number) {
    const tick = (ts: number) => {
      const currentState = state.value
      if (currentState.type !== 'snapping') return

      const lastTs = currentState.lastTs ?? ts
      const dt = (ts - lastTs) / 1000

      const displacement = currentState.progress - currentState.target
      const acceleration =
        -PHYSICS.snapSpringStiffness * displacement -
        PHYSICS.snapSpringDamping * currentState.velocity
      const velocity = currentState.velocity + acceleration * dt
      const newProgress = currentState.progress + velocity * dt

      const isSettled =
        Math.abs(displacement) < PHYSICS.snapStopEpsilon &&
        Math.abs(velocity) < PHYSICS.snapStopVelocity

      if (isSettled) {
        // Commit the shift and transition to idle
        const target = currentState.target
        if (target !== 0) {
          shiftSelectedIndex(target)
        }
        state.value = { type: 'idle' }
        return
      }

      const frameId = requestAnimationFrame(tick)
      state.value = {
        type: 'snapping',
        velocity: velocity,
        progress: newProgress,
        target: currentState.target,
        frameId,
        lastTs: ts,
      }
    }

    const frameId = requestAnimationFrame(tick)

    state.value = {
      type: 'snapping',
      velocity: initialVelocity,
      progress,
      target: Math.round(progress),
      frameId,
      lastTs: null,
    }
  }

  function stopAnimation() {
    const currentState = state.value
    if (currentState.type === 'inertia' || currentState.type === 'snapping') {
      cancelAnimationFrame(currentState.frameId)
    }
  }

  return {
    state,
    send,
    selectedProjectIndex,
    stopAnimation,
  }
}
