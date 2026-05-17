<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const hours = computed(() => {
  return now.value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

const seconds = computed(() => {
  return now.value.toLocaleTimeString('en-US', {
    second: '2-digit',
  }).padStart(2, '0')
})

const date = computed(() => {
  return now.value.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 6) return '🌙 Night Owl'
  if (h < 12) return '☀️ Good Morning'
  if (h < 17) return '🌤️ Good Afternoon'
  if (h < 21) return '🌆 Good Evening'
  return '🌙 Night Owl'
})
</script>

<template>
  <div class="flex items-center justify-center h-full px-6 py-4 gap-8">
    <!-- Left: Greeting + Date -->
    <div class="flex flex-col items-start gap-1 flex-shrink-0">
      <p class="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        {{ greeting }}
      </p>
      <p class="text-lg font-medium text-muted-foreground/80">
        {{ date }}
      </p>
    </div>

    <!-- Center: Big Time -->
    <div class="relative flex items-baseline gap-1 select-none">
      <h1 class="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight glow-text tabular-nums font-mono text-foreground">
        {{ hours }}
      </h1>
      <span class="text-3xl md:text-4xl font-medium tabular-nums font-mono text-primary/60">
        {{ seconds }}
      </span>
      <!-- Gradient underline -->
      <div class="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full"
           style="background: linear-gradient(90deg, transparent, var(--primary), transparent);" />
    </div>

    <!-- Spacer to balance the layout -->
    <div class="flex-shrink-0 w-32" />
  </div>
</template>
