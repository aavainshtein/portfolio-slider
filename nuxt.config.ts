// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  debug: true,
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: ["@nuxt/image", "@nuxtjs/tailwindcss", "@vueuse/nuxt"],
  tailwindcss: {
    config: {
      darkMode: "class",
    },
  },
});
