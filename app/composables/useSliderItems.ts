import type { Project } from "@/app.vue";

export type SliderItem = Omit<Project, "img"> & {
  id: string | number;
  originalIndex: number;
  img: Project["img"] & {
    style?: Record<string, string>;
    containerStyle?: Record<string, string>;
  };
};

function getProjectId(project: Project) {
  const id = project.id ? `${project.id}` : Math.random() * 1000;
  return `${id}`;
}

export function getVisibleItems(
  allItems: Project[],
  activeIdx: number,
  renderLimit: number,
) {
  if (allItems.length === 0) return [];

  const safeIdx =
    ((activeIdx % allItems.length) + allItems.length) % allItems.length;

  const effectiveRenderLimit = Math.min(renderLimit, allItems.length);

  const nextItems = allItems
    .slice(safeIdx, safeIdx + effectiveRenderLimit)
    .map((item, index) => ({
      ...item,
      originalIndex: safeIdx + index,
    }));

  if (nextItems.length < effectiveRenderLimit) {
    nextItems.push(
      ...allItems
        .slice(0, effectiveRenderLimit - nextItems.length)
        .map((item, index) => ({
          ...item,
          originalIndex: index,
        })),
    );
  }

  return nextItems;
}

export function wrapForSlider(
  projects: Project[],
  activeIdx: number,
  renderLimit: number,
): SliderItem[] {
  const visibleItems = getVisibleItems(projects, activeIdx, renderLimit);

  if (visibleItems.length < 1) return [];

  const firstVisibleIndex = visibleItems[0]?.originalIndex;
  const lastVisibleIndex = visibleItems[visibleItems.length - 1]?.originalIndex;

  if (firstVisibleIndex === undefined || lastVisibleIndex === undefined)
    return [];

  const isWindowMode = projects.length > renderLimit;

  const firstInvisibleItemIndex = isWindowMode
    ? firstVisibleIndex > 0
      ? firstVisibleIndex - 1
      : projects.length - 1
    : lastVisibleIndex;

  const lastInvisibleItemIndex = isWindowMode
    ? lastVisibleIndex < projects.length - 1
      ? lastVisibleIndex + 1
      : 0
    : firstVisibleIndex;

  const firstSourceProject = projects[firstInvisibleItemIndex];
  const lastSourceProject = projects[lastInvisibleItemIndex];
  if (!firstSourceProject || !lastSourceProject) return [];

  const firstInvisibleProject = {
    ...firstSourceProject,
    originalIndex: firstInvisibleItemIndex,
  };
  const lastInvisibleProject = {
    ...lastSourceProject,
    originalIndex: lastInvisibleItemIndex,
  };

  const firstInvisibleSliderItem: SliderItem = {
    ...firstInvisibleProject,
    id: `first-invisible-${getProjectId(firstSourceProject)}`,
    img: {
      ...(firstInvisibleProject.img || {}),
    },
  };

  const lastInvisibleSliderItem: SliderItem = {
    ...lastInvisibleProject,
    id: `last-invisible-${getProjectId(lastSourceProject)}`,
    img: {
      ...(lastInvisibleProject.img || {}),
    },
  };

  const visibleItemsWithId: SliderItem[] = visibleItems.map((item, index) => ({
    ...item,
    id: `visible-${getProjectId(item)}-${index}`,
  }));

  return [
    firstInvisibleSliderItem,
    ...visibleItemsWithId,
    lastInvisibleSliderItem,
  ];
}
