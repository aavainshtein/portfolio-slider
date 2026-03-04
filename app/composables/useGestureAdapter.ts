import { PHYSICS } from './useSliderStateMachine'
import { clamp } from './useSliderStyles'

export function getPixelsPerStep(
  containerWidth: number,
  renderLimit: number,
): number {
  return (containerWidth * 0.5) / (renderLimit || 1)
}

export function slotsVelocityFromPixelVelocity(vx: number): number {
  const influenced = vx * PHYSICS.velocityInfluence
  return clamp(
    influenced,
    -PHYSICS.maxInertiaVelocity,
    PHYSICS.maxInertiaVelocity,
  )
}
