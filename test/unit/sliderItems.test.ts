import { describe, it, expect } from "vitest";

import { makeProjects, mockRAF } from "../helpers";
import { getVisibleItems } from "@/composables/useSliderItems";

describe("Visible Items", () => {
  it("for 5 items total and render limit=3 and activeIndex=0 should return first 3 items", () => {
    const projects = makeProjects(5);
    const activeIndex = 0;
    const renderLimit = 3;

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit);

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0, 1, 2]);
  });

  it("for 5 items total and render limit=3 and activeIndex=4 should return last item and first 2 items", () => {
    const projects = makeProjects(5);
    const activeIndex = 4;
    const renderLimit = 3;

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit);

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([4, 0, 1]);
  });

  it("for empty array should return empty array", () => {
    const projects: ReturnType<typeof makeProjects> = [];
    const activeIndex = 0;
    const renderLimit = 3;

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit);

    expect(visibleItems).toEqual([]);
  });

  it("if render limit more than total items should return all items", () => {
    const projects = makeProjects(2);
    const activeIndex = 0;
    const renderLimit = 5;

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit);

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0, 1]);
  });

  it("for one item total and render limit=3 and activeIndex=0 should return that item", () => {
    const projects = makeProjects(1);
    const activeIndex = 0;
    const renderLimit = 3;

    const visibleItems = getVisibleItems(projects, activeIndex, renderLimit);

    expect(visibleItems.map((item) => item.originalIndex)).toEqual([0]);
  });
});
