import { describe, it, expect } from 'vitest'
import { makeProjects } from '../helpers'
import { wrapForSlider } from '../../app/composables/useSliderItems'
import { applyProgressStyles } from '../../app/composables/useSliderStyles'

describe('Slider Styles', () => {
  it('items have img and container styles', () => {
    const items = makeProjects(5)

    const wrappedItems = wrapForSlider(items, 0)

    const wrappedWithStyleItems = applyProgressStyles(
      wrappedItems,
      0,
      wrappedItems.length,
    )

    expect(wrappedWithStyleItems).toSatisfy(
      (items: ReturnType<typeof applyProgressStyles>) =>
        items.every(
          (item) =>
            item.img.style !== undefined &&
            item.img.containerStyle !== undefined,
        ),
    )
  })

  it('z-index lowers for items further from the start of window', () => {
    const items = makeProjects(5)

    const wrappedItems = wrapForSlider(items, 0)

    const wrappedWithStyleItems = applyProgressStyles(
      wrappedItems,
      0,
      wrappedItems.length - 2,
    )

    const zIndexes = wrappedWithStyleItems.map((item) =>
      parseInt(item.img.containerStyle.zIndex as string, 10),
    )

    for (let i = 1; i < zIndexes.length; i++) {
      expect(zIndexes[i]).toBeLessThan(zIndexes[i - 1]!)
    }
  })

  it('first and last elements have opacity 0', () => {
    const items = makeProjects(5)

    const wrappedItems = wrapForSlider(items, 0)

    const wrappedWithStyleItems = applyProgressStyles(
      wrappedItems,
      0,
      items.length,
    )

    const firstItemOpacity = parseFloat(
      wrappedWithStyleItems[0]?.img.style.opacity as string,
    )
    const lastItemOpacity = parseFloat(
      wrappedWithStyleItems[wrappedWithStyleItems.length - 1]?.img.style
        .opacity as string,
    )

    expect(firstItemOpacity).toBe(0)
    expect(lastItemOpacity).toBe(0)
  })

  it('first visible element have 0 blur', () => {
    const items = makeProjects(5)

    const wrappedItems = wrapForSlider(items, 0)

    const wrappedWithStyleItems = applyProgressStyles(
      wrappedItems,
      0,
      items.length,
    )

    const firstItemBlur = parseFloat(
      wrappedWithStyleItems[1]?.img.style.filter?.match(
        /blur\((\d+)px\)/,
      )?.[1] ?? '0',
    )

    expect(firstItemBlur).toBe(0)
  })

  it('styles are interpolated based on progress value', () => {
    const parseBlur = (filter: string) =>
      parseFloat(filter.match(/blur\(([\d.]+)px\)/)?.[1] ?? '0')

    const items = makeProjects(5)

    const wrappedItems = wrapForSlider(items, 0)

    const noProgressStyledItems = applyProgressStyles(
      wrappedItems,
      0,
      items.length,
    )

    const halfProgressStyledItems = applyProgressStyles(
      wrappedItems,
      0.5,
      items.length,
    )

    const fullProgressStyledItems = applyProgressStyles(
      wrappedItems,
      1,
      items.length,
    )

    const noProgressFirstItemBlur = parseBlur(
      noProgressStyledItems[1]?.img.style.filter as string,
    )
    const halfProgressFirstItemBlur = parseBlur(
      halfProgressStyledItems[1]?.img.style.filter as string,
    )
    const fullProgressFirstItemBlur = parseBlur(
      fullProgressStyledItems[1]?.img.style.filter as string,
    )

    expect(noProgressFirstItemBlur).toBeLessThan(halfProgressFirstItemBlur)

    expect(halfProgressFirstItemBlur).toBeLessThan(fullProgressFirstItemBlur)
  })
})
