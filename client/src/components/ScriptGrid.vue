<script setup>
import { ref } from 'vue'
import { useSocket } from '@/composables/useSocket'
import { Card, CardContent } from '@/components/ui/card'
import {
  Gamepad2, Tv, Monitor, Clapperboard,
  Loader2, Check, X, Scissors, Video
} from 'lucide-vue-next'

const { executeScript, scriptResult, saveClip, clipResult } = useSocket()

// ── Button Configuration ──
// Labels are user-facing; names match the backend script filenames
const buttons = ref([
  { name: 'steam_tv',    label: 'Steam Big Picture', icon: Gamepad2,      color: '#818cf8' },
  { name: 'tv_only',     label: 'TV Only',           icon: Tv,            color: '#34d399' },
  { name: 'desk_mode',   label: 'Desk Mode',         icon: Monitor,       color: '#fbbf24' },
  { name: 'movie_mode',  label: 'Movie Mode',        icon: Clapperboard,  color: '#f472b6' },
])

const runningScript = ref(null)

function handleClick(scriptName) {
  runningScript.value = scriptName
  executeScript(scriptName)

  // Auto-clear after 3 seconds
  setTimeout(() => {
    if (runningScript.value === scriptName) {
      runningScript.value = null
    }
  }, 3000)
}

function getResultState(scriptName) {
  if (runningScript.value === scriptName && scriptResult.loading) return 'loading'
  if (scriptResult.name === scriptName && scriptResult.success === true && runningScript.value === scriptName) return 'success'
  if (scriptResult.name === scriptName && scriptResult.success === false && runningScript.value === scriptName) return 'error'
  return 'idle'
}
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <!-- Section Label -->
    <p class="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3">
      ⚡ Quick Actions
    </p>

    <!-- 2x2 Grid -->
    <div class="grid grid-cols-2 gap-3 flex-1 content-start">
      <Card v-for="btn in buttons"
            :key="btn.name"
            class="group relative cursor-pointer transition-all duration-200 active:scale-[0.96] hover:shadow-lg border-0 !py-0"
            :class="{
              'opacity-60 pointer-events-none': getResultState(btn.name) === 'loading',
            }"
            :style="{
              background: `color-mix(in oklch, ${btn.color} 12%, transparent)`,
              border: `1px solid color-mix(in oklch, ${btn.color} 25%, transparent)`,
              boxShadow: getResultState(btn.name) === 'success'
                ? `0 0 24px color-mix(in oklch, ${btn.color} 30%, transparent)`
                : 'none',
            }"
            @click="handleClick(btn.name)">
        <CardContent class="flex flex-col items-center justify-center gap-2.5 h-full p-4">
          <!-- Icon / State -->
          <Loader2 v-if="getResultState(btn.name) === 'loading'"
                   class="w-7 h-7 animate-spin"
                   :style="{ color: btn.color }" />
          <Check v-else-if="getResultState(btn.name) === 'success'"
                 class="w-7 h-7 text-emerald-400" />
          <X v-else-if="getResultState(btn.name) === 'error'"
             class="w-7 h-7 text-rose-400" />
          <component v-else :is="btn.icon"
                     class="w-7 h-7 transition-transform group-hover:scale-110"
                     :style="{ color: btn.color }" />

          <!-- Label -->
          <span class="text-xs font-semibold text-center leading-tight"
                :style="{ color: btn.color }">
            {{ btn.label }}
          </span>
        </CardContent>
      </Card>
    </div>

    <!-- Gameplay Replay Section -->
    <p class="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mt-6 mb-3">
      🎮 Gameplay Replay
    </p>

    <div class="grid grid-cols-2 gap-3">
      <!-- 30s Clip -->
      <Card class="group relative cursor-pointer transition-all duration-200 active:scale-[0.96] hover:shadow-lg border-0 !py-0"
            :class="{ 'opacity-60 pointer-events-none': clipResult.loading }"
            :style="{
              background: `color-mix(in oklch, #f87171 12%, transparent)`,
              border: `1px solid color-mix(in oklch, #f87171 25%, transparent)`,
              boxShadow: clipResult.success === true ? `0 0 24px color-mix(in oklch, #f87171 30%, transparent)` : 'none',
            }"
            @click="saveClip(30)">
        <CardContent class="flex flex-col items-center justify-center gap-2.5 h-full p-4">
          <Loader2 v-if="clipResult.loading" class="w-7 h-7 animate-spin text-red-400" />
          <Check v-else-if="clipResult.success === true" class="w-7 h-7 text-emerald-400" />
          <X v-else-if="clipResult.success === false" class="w-7 h-7 text-rose-400" />
          <Scissors v-else class="w-7 h-7 text-red-400 transition-transform group-hover:scale-110" />
          <span class="text-xs font-semibold text-center leading-tight text-red-400">
            Save 30s Clip
          </span>
        </CardContent>
      </Card>

      <!-- 60s Clip -->
      <Card class="group relative cursor-pointer transition-all duration-200 active:scale-[0.96] hover:shadow-lg border-0 !py-0"
            :class="{ 'opacity-60 pointer-events-none': clipResult.loading }"
            :style="{
              background: `color-mix(in oklch, #38bdf8 12%, transparent)`,
              border: `1px solid color-mix(in oklch, #38bdf8 25%, transparent)`,
              boxShadow: clipResult.success === true ? `0 0 24px color-mix(in oklch, #38bdf8 30%, transparent)` : 'none',
            }"
            @click="saveClip(60)">
        <CardContent class="flex flex-col items-center justify-center gap-2.5 h-full p-4">
          <Loader2 v-if="clipResult.loading" class="w-7 h-7 animate-spin text-sky-400" />
          <Check v-else-if="clipResult.success === true" class="w-7 h-7 text-emerald-400" />
          <X v-else-if="clipResult.success === false" class="w-7 h-7 text-rose-400" />
          <Video v-else class="w-7 h-7 text-sky-400 transition-transform group-hover:scale-110" />
          <span class="text-xs font-semibold text-center leading-tight text-sky-400">
            Save 60s Clip
          </span>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
