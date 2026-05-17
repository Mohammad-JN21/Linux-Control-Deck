<script setup>
import { useSocket } from '@/composables/useSocket'
import { useTheme } from '@/composables/useTheme'
import ClockWidget from '@/components/ClockWidget.vue'
import ScriptGrid from '@/components/ScriptGrid.vue'
import MediaPlayer from '@/components/MediaPlayer.vue'
import VolumeMixer from '@/components/VolumeMixer.vue'
import { Switch } from '@/components/ui/switch'
import { Wifi, WifiOff, Sun, Moon } from 'lucide-vue-next'

const { connected } = useSocket()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <div class="app-shell">
    <!-- Animated gradient background -->
    <div class="app-bg" />

    <!-- Connection Status (top left) -->
    <div class="fixed top-6 left-6 z-50">
      <div class="glass-panel flex items-center justify-center gap-2 px-4 py-2 h-10 text-xs md:text-sm font-medium"
           :class="connected ? 'text-emerald-400' : 'text-rose-400'">
        <Wifi v-if="connected" class="w-3.5 h-3.5" />
        <WifiOff v-else class="w-3.5 h-3.5 animate-pulse-soft" />
        <span>{{ connected ? 'Online' : 'Reconnecting…' }}</span>
      </div>
    </div>

    <!-- Theme Toggle (top right) -->
    <div class="fixed top-6 right-6 z-50">
      <div class="glass-panel flex items-center justify-center gap-2.5 px-4 py-2 h-10">
        <Sun class="w-3.5 h-3.5 text-amber-400 transition-opacity"
             :class="isDark ? 'opacity-40' : 'opacity-100'" />
        <Switch id="theme-toggle"
                :model-value="isDark"
                @update:model-value="toggleTheme" />
        <Moon class="w-3.5 h-3.5 text-indigo-300 transition-opacity"
              :class="isDark ? 'opacity-100' : 'opacity-40'" />
      </div>
    </div>

    <!-- Main Grid Layout -->
    <div class="deck-layout">
      <!-- TOP ROW: Clock -->
      <div class="deck-top animate-fade-in">
        <div class="glass-panel h-full">
          <ClockWidget />
        </div>
      </div>

      <!-- MIDDLE ROW: Media Player + Script Grid -->
      <div class="deck-middle">
        <div class="glass-panel h-full overflow-hidden animate-fade-in"
             style="animation-delay: 0.08s">
          <MediaPlayer />
        </div>
        <div class="glass-panel h-full animate-fade-in"
             style="animation-delay: 0.14s">
          <ScriptGrid />
        </div>
      </div>

      <!-- BOTTOM ROW: Volume Mixer -->
      <div class="deck-bottom animate-fade-in" style="animation-delay: 0.2s">
        <div class="glass-panel h-full">
          <VolumeMixer />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  width: 100vw;
  height: 100dvh;
  padding: 24px;
  padding-top: 64px;
  overflow: hidden;
}

.deck-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  height: 100%;
  max-height: 100%;
}

.deck-top {
  min-height: 0;
}

.deck-middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
}

.deck-bottom {
  min-height: 0;
}

/* ── Responsive: Portrait iPad & Mobile ── */
@media (max-width: 1025px) {
  .app-shell {
    padding: 16px;
    padding-top: 64px;
    overflow-y: auto;
  }

  .deck-layout {
    grid-template-rows: auto auto auto auto;
  }

  .deck-middle {
    grid-template-columns: 1fr;
  }

  .deck-bottom {
    max-height: none;
  }
}
</style>
