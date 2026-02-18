<script setup lang="ts">
export type Project = {
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

const randomWords = [
  "awesome",
  "super",
  "amazing",
  "fantastic",
  "wonderful",
  "incredible",
  "beautiful",
  "astounding",
  "spectacular",
];

function makeText(wordCount = 5) {
  return Array.from({ length: wordCount })
    .map(() => randomWords[Math.floor(Math.random() * randomWords.length)])
    .join(" ");
}

function createProject(index: number) {
  const slugBase = `project-${Date.now()}-${index}`;

  return {
    slug: slugBase,
    title: `Title placeholder for Project ${index + 1}`,
    description: `Just ${makeText(Math.floor(Math.random() * 10) + 5)}.`,
    img: {
      src: `https://picsum.photos/seed/${slugBase}/1920/1080`,
      alt: `Just ${makeText(2)}.`,
      width: 1000,
      height: 667,
    },
  };
}

const projects = reactive<Project[]>([
  {
    slug: "space-tacos",
    title: "Space Tacos Delivery",
    description:
      "An intergalactic taco delivery service powered by quantum burritos and AI-guided salsa drones.",
    img: {
      src: "https://picsum.photos/1920/1080",
      alt: "Space Tacos Dashboard",
      width: 1000,
      height: 667,
    },
  },
  {
    slug: "cat-translator",
    title: "Cat-to-Human Translator",
    description:
      "Finally understand what your cat really thinks about you. Spoiler: it's not great.",
    img: {
      src: "https://picsum.photos/seed/cat/1920/1080",
      alt: "Cat Translator Interface",
      width: 1000,
      height: 667,
    },
  },
  {
    slug: "cloud-socks",
    title: "Cloud Socks Platform",
    description:
      "A revolutionary SaaS (Socks as a Service) platform that knits custom socks in the cloud and delivers them via drone.",
    img: {
      src: "https://picsum.photos/seed/socks/1920/1080",
      alt: "Cloud Socks Analytics",
      width: 1000,
      height: 667,
    },
  },
  {
    slug: "ai-garden",
    title: "AI Garden Planner",
    description:
      "A smart garden assistant that predicts harvest times, optimizes watering schedules, and keeps your tomatoes happy.",
    img: {
      src: "https://picsum.photos/seed/garden/1920/1080",
      alt: "AI Garden Planner Overview",
      width: 1000,
      height: 667,
    },
  },
  {
    slug: "pixel-bank",
    title: "Pixel Bank",
    description:
      "A playful fintech dashboard where every transaction is visualized as animated pixel art in real time.",
    img: {
      src: "https://picsum.photos/seed/pixel/1920/1080",
      alt: "Pixel Bank Dashboard",
      width: 1000,
      height: 667,
    },
  },
]);

function addProject() {
  projects.push(createProject(projects.length));
}

function removeProject() {
  if (projects.length <= 1) return;
  projects.pop();
}
</script>

<template>
  <div
  class="flex min-h-screen flex-col items-center p-4 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300"
  >
  <ClientOnly>
      <DarkSwitch />
  </ClientOnly>

      <div class="mb-6 flex items-center justify-center gap-3">
        <button
          type="button"
          class="h-10 w-10 rounded border border-neutral-300 text-2xl leading-none dark:border-neutral-700"
          @click="removeProject"
          :disabled="!(projects.length > 1)"
        >
          -
        </button>

        <div
          class="min-w-24 text-center text-sm text-neutral-600 dark:text-neutral-300"
        >
          Projects: {{ projects.length }}
        </div>

        <button
          type="button"
          class="h-10 w-10 rounded border border-neutral-300 text-2xl leading-none dark:border-neutral-700"
          @click="addProject"
        >
          +
        </button>
      </div>
      <PortfolioSlider :projects="projects" />
    </div>

</template>
