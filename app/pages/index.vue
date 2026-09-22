<script lang="ts" setup>
const open = ref(false)

defineShortcuts({
  o: () => (open.value = !open.value)
})
</script>

<template>

  <OpenLayersMap />
  <UDrawer v-model:open="open" direction="left" inset :modal="false" :overlay="false">

    <template #content>
    </template>
  </UDrawer>
</template>