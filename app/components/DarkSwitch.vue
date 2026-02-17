<script lang="ts" setup>
const colorMode = useColorMode();

// const isDark = computed(() => {
//   return colorMode.value === "dark";
// });
const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    console.log("toggling dark mode", colorMode.value);
    colorMode.value = colorMode.value === "dark" ? "light" : "dark";
  },
});
</script>

<template>
  <div
    class="p-2 items-center justify-center flex text-xl cursor-pointer"
    @click="isDark = !isDark"
  >
    <!-- <Icon :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" /> -->
    {{ isDark ? "🌙" : "☀️" }}
  </div>

  <!-- <template #fallback>
    <div class="size-8" />
  </template> -->
</template>
