import type { Project } from '~/app.vue'

export type SliderItem = Project & {
  originalIndex: number
  id: string | number
}

function getProjectId(project: Project) {
  return project.id ?? (Math.random() * 10000).toString(5)
}

export function getVisibleItems(
  projects: Project[],
  activeIndex: number,
  renderLimit: number | undefined,
  loop: boolean = true,
): SliderItem[] {
  const realRenderLimit = Math.min(
    renderLimit ?? projects.length,
    projects.length,
  )

  if (!loop) {
    const start = Math.max(
      0,
      Math.min(activeIndex, projects.length - realRenderLimit),
    )
    return projects.slice(start, start + realRenderLimit).map((item, i) => ({
      ...item,
      originalIndex: start + i,
      id: getProjectId(item),
    }))
  }

  const firstPartOfElements = projects
    .slice(activeIndex, activeIndex + realRenderLimit)
    .map((item, index) => ({
      ...item,
      originalIndex: activeIndex + index,
      id: getProjectId(item),
    }))

  const secondPartOfElements = [
    ...(firstPartOfElements.length < realRenderLimit
      ? projects.slice(0, realRenderLimit - firstPartOfElements.length)
      : []),
  ].map((item, index) => ({
    ...item,
    originalIndex: index,
    id: getProjectId(item),
  }))

  return [...firstPartOfElements, ...secondPartOfElements]
}

export function wrapForSlider(
  projects: Project[],
  activeIndex: number,
  renderLimit?: number | undefined,
  loop: boolean = true,
): SliderItem[] {
  const realRenderLimit = Math.min(
    renderLimit ?? projects.length,
    projects.length,
  )

  const visibleItems = getVisibleItems(projects, activeIndex, renderLimit, loop)

  if (visibleItems.length < 1) return [] as SliderItem[]

  const firstVisibleIndex = visibleItems[0]?.originalIndex
  const lastVisibleIndex = visibleItems[visibleItems.length - 1]?.originalIndex

  if (firstVisibleIndex === undefined || lastVisibleIndex === undefined)
    return [] as SliderItem[]

  // In bounded mode, only add sentinels where there are items beyond the edge
  const hasLeftNeighbor = loop || firstVisibleIndex > 0
  const hasRightNeighbor = loop || lastVisibleIndex < projects.length - 1

  const result: SliderItem[] = []

  if (hasLeftNeighbor) {
    const firstInvisibleItemIndex =
      firstVisibleIndex === 0
        ? projects.length - 1
        : (firstVisibleIndex - 1) % projects.length
    const firstInvisibleProject = projects[firstInvisibleItemIndex]
    if (firstInvisibleProject) {
      result.push({
        ...firstInvisibleProject,
        originalIndex: firstInvisibleItemIndex,
        id: `left-invisible-${getProjectId(firstInvisibleProject)}`,
      })
    }
  }

  result.push(...visibleItems)

  if (hasRightNeighbor) {
    const lastInvisibleItemIndex =
      lastVisibleIndex === projects.length - 1
        ? 0
        : (lastVisibleIndex + 1) % projects.length
    const lastInvisibleProject = projects[lastInvisibleItemIndex]
    if (lastInvisibleProject) {
      result.push({
        ...lastInvisibleProject,
        originalIndex: lastInvisibleItemIndex,
        id: `right-invisible-${getProjectId(lastInvisibleProject)}`,
      })
    }
  }

  return result
}
