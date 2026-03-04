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

export interface DragHandlerOptions {
  send: (event: Record<string, unknown>) => void
  getItemCount: () => number
  getWindowSize: () => number
  getContainerWidth: () => number
}

export function createDragHandler(options: DragHandlerOptions) {
  const { send, getItemCount, getWindowSize, getContainerWidth } = options

  return function dragHandler(event: {
    first?: boolean
    last?: boolean
    dragging?: boolean
    movement: [number, number]
    direction: [number, number]
    vxvy: [number, number]
    event?: { target?: EventTarget | null; currentTarget?: EventTarget | null }
  }) {
    if (getItemCount() < 2) return

    const target = event.event?.target as HTMLElement | null
    if (target && (target.tagName === 'BUTTON' || target.closest?.('button')))
      return

    if (event.first) {
      send({ type: 'POINTER_DOWN' })
    }

    if (event.dragging) {
      const containerWidth = getContainerWidth()
      const pixelsPerStep = getPixelsPerStep(containerWidth, getWindowSize())
      const dirY = Math.abs(event.direction[1])
      send({
        type: 'DRAG_MOVE',
        movementX: event.movement[0],
        pixelsPerStep,
        dirY,
      })
    }

    if (event.last) {
      const containerWidth = getContainerWidth()
      const pixelsPerStep = getPixelsPerStep(containerWidth, getWindowSize())
      const vx = event.vxvy[0]
      const releaseVelocity = slotsVelocityFromPixelVelocity(
        -vx / pixelsPerStep,
      )
      send({ type: 'POINTER_UP', releaseVelocity })
    }
  }
}
