import { describe, it, expect } from 'vitest'

import { makeProjects } from '../helpers'
import {
  getVisibleItems,
  wrapForSlider,
} from '../../app/composables/useSliderItems'

describe('Visible Items', () => {
  it('for 5 items total and render limit=3 and activeIndex=0 should return first 3 items', () => {
    const projects = makeProjects(5)
    const activeIndex = 0
    const renderLimit = 3

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit)

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0, 1, 2])
  })

  it('for 5 items total and render limit=3 and activeIndex=4 should return last item and first 2 items', () => {
    const projects = makeProjects(5)
    const activeIndex = 4
    const renderLimit = 3

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit)

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([4, 0, 1])
  })

  it('for empty array should return empty array', () => {
    const projects: ReturnType<typeof makeProjects> = []
    const activeIndex = 0
    const renderLimit = 3

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit)

    expect(visibleItems).toEqual([])
  })

  it('if render limit more than total items should return all items', () => {
    const projects = makeProjects(2)
    const activeIndex = 0
    const renderLimit = 5

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit)

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0, 1])
  })

  it('for one item total and render limit=3 and activeIndex=0 should return that item', () => {
    const projects = makeProjects(1)
    const activeIndex = 0
    const renderLimit = 3

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit)

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0])
  })
})

describe('getVisibleItems bounded (loop=false)', () => {
  it('activeIdx=0 returns first renderLimit items without wrapping', () => {
    const projects = makeProjects(5)
    const result = getVisibleItems(projects, 0, 3, false)
    expect(result.map((i) => i.originalIndex)).toEqual([0, 1, 2])
  })

  it('activeIdx near end clamps window start instead of wrapping', () => {
    const projects = makeProjects(5)
    const result = getVisibleItems(projects, 4, 3, false)
    // Не [4,0,1] как в loop, а [2,3,4] — сдвиг окна к концу
    expect(result.map((i) => i.originalIndex)).toEqual([2, 3, 4])
  })

  it('activeIdx=3 with limit=3 clamps to [2,3,4]', () => {
    const projects = makeProjects(5)
    const result = getVisibleItems(projects, 3, 3, false)
    expect(result.map((i) => i.originalIndex)).toEqual([2, 3, 4])
  })

  it('renderLimit > length returns all items', () => {
    const projects = makeProjects(3)
    const result = getVisibleItems(projects, 0, 10, false)
    expect(result.map((i) => i.originalIndex)).toEqual([0, 1, 2])
  })

  it('1 element returns that element', () => {
    const projects = makeProjects(1)
    const result = getVisibleItems(projects, 0, 3, false)
    expect(result.map((i) => i.originalIndex)).toEqual([0])
  })
})

describe('wrapForSlider', () => {
  it('should return empty array if no visible items', () => {
    const projects = makeProjects(0)
    const activeIndex = 0
    const renderLimit = 3

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)
    expect(wrappedItems).toEqual([])
  })

  it("should respect render limit if it's less than total items", () => {
    const projects = makeProjects(5)
    const activeIndex = 0
    const renderLimit = 3

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)

    expect(wrappedItems.length).toBe(5)
  })

  it('should respect projects.length over render limit if render limit is greater than total items', () => {
    const projects = makeProjects(2)
    const activeIndex = 0
    const renderLimit = 5

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)

    expect(wrappedItems.length).toBe(4)
  })

  it('have invisible items', () => {
    const projects = makeProjects(5)
    const activeIndex = 0
    const renderLimit = 3

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)

    expect(wrappedItems.length).toBe(5)

    expect(wrappedItems[0]?.originalIndex).toBe(4)
    expect(wrappedItems[0]?.id).toContain('left-invisible')

    expect(wrappedItems[wrappedItems.length - 1]?.originalIndex).toBe(3)
    expect(wrappedItems[wrappedItems.length - 1]?.id).toContain(
      'right-invisible',
    )
  })

  it('have looped invisible items', () => {
    const projects = makeProjects(5)
    const activeIndex = 4
    const renderLimit = 3

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)

    expect(wrappedItems.length).toBe(5)

    expect(wrappedItems[0]?.originalIndex).toBe(3)
    expect(wrappedItems[0]?.id).toContain('left-invisible')

    expect(wrappedItems[wrappedItems.length - 1]?.originalIndex).toBe(2)
    expect(wrappedItems[wrappedItems.length - 1]?.id).toContain(
      'right-invisible',
    )
  })

  it(' if have only one item should return that item with duplicated invisible items', () => {
    const projects = makeProjects(1)
    const activeIndex = 0
    const renderLimit = 3

    const wrappedItems = wrapForSlider(projects, activeIndex, renderLimit)

    expect(wrappedItems.length).toBe(3)
    expect(wrappedItems[0]?.originalIndex).toBe(0)
    expect(wrappedItems[2]?.originalIndex).toBe(0)
  })
})
