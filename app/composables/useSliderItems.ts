import type { Project } from "~/app.vue";

export function getVisibleItems(
  projects: Project[],
  activeIndex: number,
  renderLimit: number,
) {
  const realRenderLimit = Math.min(renderLimit, projects.length);

  const firstPartOfElements = projects
    .slice(activeIndex, activeIndex + realRenderLimit)
    .map((item, index) => ({
      ...item,
      originalIndex: activeIndex + index,
    }));

  const secondPartOfElements = [
    ...(firstPartOfElements.length < realRenderLimit
      ? projects.slice(0, realRenderLimit - firstPartOfElements.length)
      : []),
  ].map((item, index) => ({
    ...item,
    originalIndex: index,
  }));

  return [...firstPartOfElements, ...secondPartOfElements];
}
