<script setup lang="ts">
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

const selectedProjectIndex = ref(0);

const renderLimit = ref(10);


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

const projects = ref<Project[]>([
  {
    slug: "space-tacos",
    title: "Space Tacos Delivery",
    description:
      "An intergalactic taco delivery service powered by quantum burritos and AI-guided salsa drones. An intergalactic taco delivery service powered by quantum burritos and AI-guided salsa drones.",
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

const biggestDescriptionAndTitle= computed(() => {
  return projects.value.reduce((acc, project) => {
    const titleLength = project.title.length;
    const descriptionLength = project.description.length;

    if (titleLength > acc.title.length) {
      acc.title = project.title;
    }

    if (descriptionLength > acc.description.length) {
      acc.description = project.description;
    }

    return acc;
  }, { title: "", description: "" });
});



function addProject() {
  projects.value.push(createProject(projects.value.length));
}

function removeProject() {
  if (projects.value.length <= 1) return;
  projects.value.pop();
}

</script>

<template>
  <div
    class="flex min-h-screen flex-col items-center bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300"
  >
    <div class="container flex flex-wrap p-4 gap-4 items-center justify-end"> 
      <ClientOnly>
        <DarkSwitch />
      </ClientOnly>
      <div class="flex items-center justify-center gap-3">
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
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          class="h-10 w-10 rounded border border-neutral-300 text-2xl leading-none dark:border-neutral-700"
          @click="renderLimit = Math.max(1, renderLimit - 1)"
          :disabled="!(projects.length > 1)"
        >
          -
        </button>

        <div
          class="min-w-24 text-center text-sm text-neutral-600 dark:text-neutral-300"
        >
          Render Limit: {{ renderLimit }}
        </div>

        <button
          type="button"
          class="h-10 w-10 rounded border border-neutral-300 text-2xl leading-none dark:border-neutral-700"
          @click="renderLimit = renderLimit + 1"
        >
          +
        </button>
      </div>
    </div>

    <!-- Heading -->
    <div
      class="container text-center flex flex-col items-center justify-center gap-3"
    >
      <h2 class="text-3xl font-bold">Portfolio</h2>
      <p class="lg:mx-auto text-neutral-600 dark:text-neutral-300">
        Infinite slider with some animations and touch
      </p>
      <!-- indexes: {{ projects.map((item) => item.id) }} -->
    </div>

    <!-- Heading End-->

    <PortfolioSlider
      v-model:selectedProjectIndex="selectedProjectIndex"
      :projects="projects"
      :renderLimit="renderLimit"
    >
      <template #description>
        <div class="text-sm text-neutral-600 dark:text-neutral-300">
          <div
            class="grid grid-rows-[auto_1fr] lg:mt-8 text-2xl gap-2 select-none"
          >
            <div class="invisible  lg:mt-8 text-2xl font-semibold row-start-1 col-start-1">
              {{ biggestDescriptionAndTitle.title }}
            </div>
            <div class="lg:mt-8 text-2xl font-semibold row-start-1 col-start-1">
              {{ projects[selectedProjectIndex]?.title }}
            </div>
            <div class="invisible  text-base md:text-xl row-start-2 col-start-1 text-neutral-600 dark:text-neutral-300"">
              {{ biggestDescriptionAndTitle.description }}
            </div>
            <div
              class="text-base md:text-xl row-start-2 col-start-1 text-neutral-600 dark:text-neutral-300"
            >
              {{ projects[selectedProjectIndex]?.description }}
            </div>
          </div>
        </div>
      </template>
    </PortfolioSlider>
  </div>
</template>
