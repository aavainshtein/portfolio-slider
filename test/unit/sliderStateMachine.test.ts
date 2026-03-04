import { ref } from 'vue'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSliderStateMachine } from '../../app/composables/useSliderStateMachine'
import { makeProjects, mockRAF } from '../helpers'
import type { SliderItem } from '../../app/composables/useSliderItems'

let raf: ReturnType<typeof mockRAF>

describe('Slider State Machine', () => {
  beforeEach(() => {
    raf = mockRAF()
  })
  afterEach(() => {
    raf.restore()
  })
  describe('from idle state', () => {
    it('initial state should be idle', () => {
      const { state } = useSliderStateMachine(ref([]), ref(undefined))
      expect(state.value).toEqual({ type: 'idle' })
    })

    it('POINTER_DOWN  -> pressed with frozenProgress = 0', () => {
      const projects = ref(makeProjects(2))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })
      expect(state.value).toEqual({ type: 'pressed', frozenProgress: 0 })
    })

    it('POINTER_DOWN with 0 projects -> ignore', () => {
      const projects = ref([])
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })
      expect(state.value).toEqual({ type: 'idle' })
    })

    it('BUTTON_PRESS with direction 1 -> inertia with positive velocity', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'BUTTON_PRESS', direction: 1 })
      expect(state.value.type).toBe('inertia')
      const velocity = (state.value as { type: 'inertia'; velocity: number })
        .velocity
      expect(velocity).toBeGreaterThan(0)
    })

    it('BUTTON_PRESS with direction -1 -> inertia with negative velocity', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'BUTTON_PRESS', direction: -1 })
      expect(state.value.type).toBe('inertia')
      const velocity = (state.value as { type: 'inertia'; velocity: number })
        .velocity
      expect(velocity).toBeLessThan(0)
    })

    it('BUTTON_PRESS empty projects -> idle', () => {
      const projects = ref<SliderItem[]>([])
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'BUTTON_PRESS', direction: 1 })
      expect(state.value.type).toBe('idle')
    })

    it('BUTTON_PRESS init inertia that eventually settles', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'BUTTON_PRESS', direction: 1 })
      expect(state.value.type).toBe('inertia')

      raf.advanceFrames(1000)
      expect(state.value.type).toBe('idle')
    })
  })

  describe('from pressed state', () => {
    it('DRAG_MOVE -> dragging with correct progress and offsets', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: 100, pixelsPerStep: 50, dirY: 0.2 })
      expect(state.value.type).toEqual('dragging')
    })

    it('DRAG_MOVE with dirY>0.35 dont change state', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })
      send({
        type: 'DRAG_MOVE',
        movementX: 100,
        pixelsPerStep: 50,
        dirY: 0.36,
      })
      expect(state.value.type).toEqual('pressed')
    })

    it('POINTER_UP with no velocity -> idle', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })
      expect(state.value.type).toEqual('snapping')
    })
  })

  describe('from dragging state', () => {
    it('DRAG_MOVE -> update progress and offsets', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })

      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })

      expect(state.value.type).toBe('dragging')

      const firstProgress = (state.value as { progress: number }).progress

      send({ type: 'DRAG_MOVE', movementX: -80, pixelsPerStep: 100, dirY: 0 })

      expect(state.value.type).toBe('dragging')

      const secondProgress = (state.value as { progress: number }).progress

      expect(firstProgress < secondProgress).toBe(true)
    })

    it('POINTER_UP with velocity -> inertia', () => {
      const projects = ref(makeProjects(5))

      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })

      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })

      expect(state.value.type).toBe('dragging')

      send({ type: 'POINTER_UP', releaseVelocity: 40 })

      const stateAfterRelease = { ...state.value }

      expect(stateAfterRelease.type).toBe('inertia')
    })

    it('POINTER_UP with no velocity -> snapping', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))
      send({ type: 'POINTER_DOWN' })

      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })

      expect(state.value.type).toBe('dragging')

      send({ type: 'POINTER_UP', releaseVelocity: 0 })
      expect(state.value.type).toBe('snapping')
    })
  })

  describe('from inertia state', () => {
    it('POINTER_DOWN -> pressed (slider paused in movement)', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 40 })

      expect(state.value.type).toBe('inertia')

      send({ type: 'POINTER_DOWN' })
      expect(state.value.type).toBe('pressed')
    })

    it('button press -> inertia with new velocity', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 40 })

      expect(state.value.type).toBe('inertia')

      send({ type: 'BUTTON_PRESS', direction: -1 })

      expect(state.value.type).toBe('inertia')
      const velocity = (state.value as { type: 'inertia'; velocity: number })
        .velocity
      expect(velocity).toBeLessThan(40)
    })

    it('inertia eventually settles to idle (via snapping)', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 40 })
      expect(state.value.type).toBe('inertia')

      // Advance enough frames for velocity to decay and snap to settle
      raf.advanceFrames(1000)
      expect(state.value.type).toBe('idle')
    })

    it('POINTER_DOWN preserves progress as frozenProgress', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0.01 })
      expect(state.value.type).toBe('inertia')

      raf.advanceFrames(5)
      const currentState = state.value as { type: 'inertia'; progress: number }
      const currentProgress = currentState.progress

      send({ type: 'POINTER_DOWN' })
      expect(state.value.type).toBe('pressed')
      const pressedState = state.value as {
        type: 'pressed'
        frozenProgress: number
      }
      expect(pressedState.frozenProgress).toBe(currentProgress)
    })
  })

  describe('from snapping state', () => {
    it('POINTER_DOWN -> pressed (slider paused in movement)', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })

      expect(state.value.type).toBe('snapping')

      send({ type: 'POINTER_DOWN' })
      expect(state.value.type).toBe('pressed')
    })

    it('BUTTON_PRESS -> inertia with new velocity', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })

      expect(state.value.type).toBe('snapping')

      send({ type: 'BUTTON_PRESS', direction: 1 })
      expect(state.value.type).toBe('inertia')
    })

    it('BUTTON_PRESS init inertia that eventually settles', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })
      expect(state.value.type).toBe('snapping')

      send({ type: 'BUTTON_PRESS', direction: 1 })
      expect(state.value.type).toBe('inertia')

      raf.advanceFrames(1000)
      expect(state.value.type).toBe('idle')
    })

    it('snapping decays to idle on its own', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })
      expect(state.value.type).toBe('snapping')

      raf.advanceFrames(600)

      expect(state.value.type).toBe('idle')
    })

    it('POINTER_DOWN preserves progress as frozenProgress', () => {
      const projects = ref(makeProjects(5))
      const { state, send } = useSliderStateMachine(projects, ref(undefined))

      send({ type: 'POINTER_DOWN' })
      send({ type: 'DRAG_MOVE', movementX: -50, pixelsPerStep: 100, dirY: 0 })
      send({ type: 'POINTER_UP', releaseVelocity: 0 })
      expect(state.value.type).toBe('snapping')

      raf.advanceFrames(5)
      const currentState = state.value as {
        type: 'snapping'
        progress: number
      }
      const currentProgress = currentState.progress
      send({ type: 'POINTER_DOWN' })
      expect(state.value.type).toBe('pressed')
      const pressedState = state.value as {
        type: 'pressed'
        frozenProgress: number
      }
      expect(pressedState.frozenProgress).toBe(currentProgress)
    })
  })

  describe('bounded mode (loop=false)', () => {
    it('BUTTON_PRESS direction=1 at idx=0 moves to idx=1', () => {
      const projects = ref(makeProjects(5))
      const { state, send, selectedProjectIndex } = useSliderStateMachine(
        projects,
        ref(undefined),
        ref(false),
      )
      expect(selectedProjectIndex.value).toBe(0)
      send({ type: 'BUTTON_PRESS', direction: 1 })
      // Let inertia + snap complete
      raf.advanceFrames(300)
      expect(state.value.type).toBe('idle')
      expect(selectedProjectIndex.value).toBe(1)
    })

    it('BUTTON_PRESS direction=-1 at idx=0 does not go below 0', () => {
      const projects = ref(makeProjects(5))
      const { state, send, selectedProjectIndex } = useSliderStateMachine(
        projects,
        ref(undefined),
        ref(false),
      )
      expect(selectedProjectIndex.value).toBe(0)
      send({ type: 'BUTTON_PRESS', direction: -1 })
      raf.advanceFrames(300)
      expect(state.value.type).toBe('idle')
      expect(selectedProjectIndex.value).toBe(0)
    })

    it('BUTTON_PRESS direction=1 at last index does not exceed max', () => {
      const projects = ref(makeProjects(3))
      const { state, send, selectedProjectIndex } = useSliderStateMachine(
        projects,
        ref(undefined),
        ref(false),
      )
      // Move to last index first
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      expect(selectedProjectIndex.value).toBe(2)

      // Try to go beyond
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      expect(state.value.type).toBe('idle')
      expect(selectedProjectIndex.value).toBe(2)
    })

    it('loop=true wraps index cyclically (regression)', () => {
      const projects = ref(makeProjects(3))
      const { state, send, selectedProjectIndex } = useSliderStateMachine(
        projects,
        ref(undefined),
        ref(true),
      )
      // Move forward 3 times → should wrap back to 0
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      send({ type: 'BUTTON_PRESS', direction: 1 })
      raf.advanceFrames(300)
      expect(state.value.type).toBe('idle')
      expect(selectedProjectIndex.value).toBe(0)
    })
  })
})
