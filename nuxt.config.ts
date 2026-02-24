// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  debug: true,
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: [
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxt/test-utils/module',
    '@nuxt/eslint',
  ],
  tailwindcss: {
    config: {
      darkMode: 'class',
    },
  },
  typescript: {
    tsConfig: {
      include: [
        // this path is relative to the generated .nuxt/tsconfig.json
        '../test/unit/**/*',
        '../test/unit/*',
      ],
    },
  },
  eslint: {
    config: {
      // Use the generated ESLint config for lint root project as well
      rootDir: fileURLToPath(new URL('..', import.meta.url)),
    },
  },
})
