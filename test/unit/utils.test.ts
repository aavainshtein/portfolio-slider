import { describe, it, expect } from 'vitest'

import { clamp, lerp } from '~/composables/useSliderStyles'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
  it('handles min === max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })
})

describe('lerp', () => {
  it('returns starting value when t is 0', () => {
    expect(lerp(0, 10, 0)).toBe(0)
  })
  it('returns ending value when t is 1', () => {
    expect(lerp(0, 10, 1)).toBe(10)
  })
  it('returns interpolated value when t is between 0 and 1', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })
  it('returns out of the range values when t is less than 0 or greater than 1', () => {
    expect(lerp(0, 100, -0.5)).toBe(-50)
    expect(lerp(0, 100, 1.5)).toBe(150)
  })
})
