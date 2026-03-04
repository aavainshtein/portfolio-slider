import { describe, it, expect } from 'vitest'

import {
  getPixelsPerStep,
  slotsVelocityFromPixelVelocity,
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
})
