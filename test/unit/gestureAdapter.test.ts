import { describe, it, expect, vi } from 'vitest'

import {
  getPixelsPerStep,
  slotsVelocityFromPixelVelocity,
  createDragHandler,
} from '~/composables/useGestureAdapter'

describe('Gesture Adapter', () => {
  describe('getPixelsPerStep', () => {
    it('returns half container width divided by window size', () => {
      // containerWidth=800, renderLimit=5 → (800*0.5)/5 = 80
      expect(getPixelsPerStep(800, 5)).toBe(80)
    })

    it('returns fallback for renderLimit=0', () => {
      // Не должно быть деления на 0
      expect(getPixelsPerStep(800, 0)).toBeGreaterThan(0)
    })
  })

  describe('slotsVelocityFromPixelVelocity', () => {
    it('scales velocity by influence factor', () => {
      // 0.01 * 1.35 = 0.0135
      expect(slotsVelocityFromPixelVelocity(0.01)).toBeCloseTo(0.0135)
    })

    it('clamps to max velocity', () => {
      // Очень большая скорость → ограничивается до 0.035
      expect(slotsVelocityFromPixelVelocity(1)).toBe(0.035)
    })

    it('clamps negative to -max velocity', () => {
      expect(slotsVelocityFromPixelVelocity(-1)).toBe(-0.035)
    })
  })

  describe('createDragHandler', () => {
    function makeHandler(itemCount = 5) {
      const send = vi.fn()
      const handler = createDragHandler({
        send,
        getItemCount: () => itemCount,
        getWindowSize: () => 3,
        getContainerWidth: () => 800,
      })
      return { send, handler }
    }

    function makeGestureEvent(overrides: Record<string, unknown> = {}) {
      return {
        first: false,
        last: false,
        dragging: false,
        movement: [0, 0] as [number, number],
        direction: [0, 0] as [number, number],
        vxvy: [0, 0] as [number, number],
        event: {
          target: { tagName: 'DIV', closest: () => null },
          currentTarget: { clientWidth: 800 },
        },
        ...overrides,
      }
    }

    it('sends POINTER_DOWN on first touch', () => {
      const { send, handler } = makeHandler()
      handler(makeGestureEvent({ first: true }))
      expect(send).toHaveBeenCalledWith({ type: 'POINTER_DOWN' })
    })

    it('sends DRAG_MOVE while dragging', () => {
      const { send, handler } = makeHandler()
      handler(
        makeGestureEvent({
          dragging: true,
          movement: [120, 0],
          direction: [1, 0],
        }),
      )
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DRAG_MOVE',
          movementX: 120,
        }),
      )
    })

    it('sends POINTER_UP on release with velocity', () => {
      const { send, handler } = makeHandler()
      handler(
        makeGestureEvent({
          last: true,
          vxvy: [-200, 0],
        }),
      )
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'POINTER_UP',
          releaseVelocity: expect.any(Number),
        }),
      )
    })

    it('ignores drag when target is a button', () => {
      const { send, handler } = makeHandler()
      handler(
        makeGestureEvent({
          first: true,
          dragging: true,
          event: {
            target: { tagName: 'BUTTON', closest: () => null },
            currentTarget: { clientWidth: 800 },
          },
        }),
      )
      expect(send).not.toHaveBeenCalled()
    })

    it('ignores drag when fewer than 2 items', () => {
      const { send, handler } = makeHandler(1)
      handler(makeGestureEvent({ first: true }))
      expect(send).not.toHaveBeenCalled()
    })
  })
})
