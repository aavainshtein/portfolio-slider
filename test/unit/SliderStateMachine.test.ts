import { ref } from "vue";
import { describe, it, expect } from "vitest";
import { useSliderStateMachine } from "../../app/composables/UseSliderStateMachine";
import { makeProjects } from "../helpers";
import type { SliderItem } from "../../app/composables/useSliderItems";

describe("Slider State Machine", () => {
  describe("from idle state", () => {
    it("initial state should be idle", () => {
      const { state } = useSliderStateMachine(ref([]), ref(undefined));
      expect(state.value).toEqual({ type: "idle" });
    });

    it("POINTER_DOWN  -> pressed with frozenProgress = 0", () => {
      const projects = ref(makeProjects(2));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });
      expect(state.value).toEqual({ type: "pressed", frozenProgress: 0 });
    });

    it("POINTER_DOWN with 0 projects -> ignore", () => {
      const projects = ref([]);
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });
      expect(state.value).toEqual({ type: "idle" });
    });

    it("BUTTON_PRESS with direction 1 -> inertia with positive velocity", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "BUTTON_PRESS", direction: 1 });
      expect(state.value.type).toBe("inertia");
      const velocity = (state.value as { type: "inertia"; velocity: number })
        .velocity;
      expect(velocity).toBeGreaterThan(0);
    });

    it("BUTTON_PRESS with direction -1 -> inertia with negative velocity", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "BUTTON_PRESS", direction: -1 });
      expect(state.value.type).toBe("inertia");
      const velocity = (state.value as { type: "inertia"; velocity: number })
        .velocity;
      expect(velocity).toBeLessThan(0);
    });

    it("BUTTON_PRESS empty projects -> idle", () => {
      const projects = ref<SliderItem[]>([]);
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "BUTTON_PRESS", direction: 1 });
      expect(state.value.type).toBe("idle");
    });
  });

  describe("from pressed state", () => {
    it("DRAG_MOVE -> dragging with correct progress and offsets", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });
      send({ type: "DRAG_MOVE", movementX: 100, pixelsPerStep: 50, dirY: 0.2 });
      expect(state.value.type).toEqual("dragging");
    });

    it("DRAG_MOVE with dirY>0.35 dont change state", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });
      send({
        type: "DRAG_MOVE",
        movementX: 100,
        pixelsPerStep: 50,
        dirY: 0.36,
      });
      expect(state.value.type).toEqual("pressed");
    });

    it("POINTER_UP with no velocity -> idle", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });
      send({ type: "POINTER_UP", releaseVelocity: 0 });
      expect(state.value).toEqual({ type: "idle" });
    });
  });

  describe("from dragging state", () => {
    it("DRAG_MOVE -> update progress and offsets", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));

      send({ type: "POINTER_DOWN" });

      send({ type: "DRAG_MOVE", movementX: -50, pixelsPerStep: 100, dirY: 0 });

      expect(state.value.type).toBe("dragging");

      const firstProgress = (state.value as { progress: number }).progress;

      send({ type: "DRAG_MOVE", movementX: -80, pixelsPerStep: 100, dirY: 0 });

      expect(state.value.type).toBe("dragging");

      const secondProgress = (state.value as { progress: number }).progress;

      expect(firstProgress < secondProgress).toBe(true);
    });

    it("POINTER_UP with velocity -> inertia", () => {
      const projects = ref(makeProjects(5));

      const { state, send } = useSliderStateMachine(projects, ref(undefined));

      send({ type: "POINTER_DOWN" });

      send({ type: "DRAG_MOVE", movementX: -50, pixelsPerStep: 100, dirY: 0 });

      expect(state.value.type).toBe("dragging");

      send({ type: "POINTER_UP", releaseVelocity: 40 });

      const stateAfterRelease = { ...state.value };

      expect(stateAfterRelease.type).toBe("inertia");
    });

    it("POINTER_UP with no velocity -> snapping", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));
      send({ type: "POINTER_DOWN" });

      send({ type: "DRAG_MOVE", movementX: -50, pixelsPerStep: 100, dirY: 0 });

      expect(state.value.type).toBe("dragging");

      send({ type: "POINTER_UP", releaseVelocity: 0 });
      expect(state.value.type).toBe("snapping");
    });
  });

  describe("from inertia state", () => {
    it("POINTER_DOWN -> pressed (slider paused in movement)", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));

      send({ type: "POINTER_DOWN" });
      send({ type: "DRAG_MOVE", movementX: -50, pixelsPerStep: 100, dirY: 0 });
      send({ type: "POINTER_UP", releaseVelocity: 40 });

      expect(state.value.type).toBe("inertia");

      send({ type: "POINTER_DOWN" });
      expect(state.value.type).toBe("pressed");
    });
  });

  describe("from snapping state", () => {
    it("POINTER_DOWN -> pressed (slider paused in movement)", () => {
      const projects = ref(makeProjects(5));
      const { state, send } = useSliderStateMachine(projects, ref(undefined));

      send({ type: "POINTER_DOWN" });
      send({ type: "DRAG_MOVE", movementX: -50, pixelsPerStep: 100, dirY: 0 });
      send({ type: "POINTER_UP", releaseVelocity: 0 });

      expect(state.value.type).toBe("snapping");

      send({ type: "POINTER_DOWN" });
      expect(state.value.type).toBe("pressed");
    });
  });
});
