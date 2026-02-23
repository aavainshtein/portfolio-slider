export type Project = {
  id?: string | number;
  slug: string;
  title: string;
  description: string;
  img: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export function makeProjects(count: number): Project[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i}`,
    slug: `project-${i}`,
    title: `Project ${i}`,
    description: `Description for project ${i}`,
    img: {
      src: `/img/project-${i}.png`,
      alt: `Project ${i} screenshot`,
      width: 1920,
      height: 1080,
    },
  }));
}

export function mockRAF() {
  const callbacks: Array<(ts: number) => void> = [];
  let time = 0;

  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    callbacks.push(cb);
    return callbacks.length;
  };

  globalThis.cancelAnimationFrame = (_id: number) => {
    // no-op for simplicity
  };

  return {
    advanceFrames(count: number, dtMs = 16.67) {
      for (let i = 0; i < count; i++) {
        time += dtMs;
        const pending = callbacks.splice(0);
        pending.forEach((cb) => cb(time));
      }
    },
    get time() {
      return time;
    },
    restore() {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCAF;
    },
  };
}
