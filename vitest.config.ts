import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "~": resolve(__dirname, "app"),
            "@": resolve(__dirname, "app"),
          },
        },
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.test.ts"],
          environment: "nuxt",
          environmentOptions: {
            nuxt: {
              domEnvironment: "happy-dom",
            },
          },
        },
      }),
      {
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
