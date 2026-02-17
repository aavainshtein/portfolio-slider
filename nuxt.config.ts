// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/image", "@nuxtjs/tailwindcss", "@vueuse/nuxt"],
  tailwindcss: {
    config: {
      darkMode: "class",
    },
  },
});
