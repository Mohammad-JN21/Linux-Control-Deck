<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useSocket } from '@/composables/useSocket'
import { useStorage } from '@vueuse/core'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Volume2, VolumeX, Volume1, Speaker, AudioLines, Route, Eye, EyeOff, LayoutList, RefreshCw
} from 'lucide-vue-next'

const {
  volumeState,
  setSinkVolume, setAppVolume,
  toggleSinkMute, toggleAppMute,
  setDefaultSink, moveAppToSink,
  restartAudioServer,
} = useSocket()

// ── Local Storage for Hidden Sinks ──
// Stores the 'name' or 'pactlName' of hidden sinks. We'll use 'name'.
const hiddenSinks = useStorage('control-deck-hidden-sinks', [])
const showHidden = useStorage('control-deck-show-hidden', false)

const displayedSinks = computed(() => {
  if (showHidden.value) return volumeState.sinks
  return volumeState.sinks.filter(s => !hiddenSinks.value.includes(s.name))
})

function toggleSinkVisibility(sinkName) {
  if (hiddenSinks.value.includes(sinkName)) {
    hiddenSinks.value = hiddenSinks.value.filter(n => n !== sinkName)
  } else {
    hiddenSinks.value.push(sinkName)
  }
}

// ── Anti-Jitter ──
const draggingIds = reactive(new Set())
const localValues = reactive({})
const debounceTimers = {}

function startDrag(id) {
  draggingIds.add(id)
}

function endDrag(id) {
  setTimeout(() => {
    draggingIds.delete(id)
    delete localValues[id]
  }, 500)
}

function onSinkSlider(sinkId, val) {
  const v = Array.isArray(val) ? val[0] : val
  const key = `s${sinkId}`
  localValues[key] = v
  startDrag(key)
  clearTimeout(debounceTimers[key])
  debounceTimers[key] = setTimeout(() => setSinkVolume(sinkId, v), 80)
}

function onAppSlider(appId, val) {
  const v = Array.isArray(val) ? val[0] : val
  const key = `a${appId}`
  localValues[key] = v
  startDrag(key)
  clearTimeout(debounceTimers[key])
  debounceTimers[key] = setTimeout(() => setAppVolume(appId, v), 80)
}

function sinkVol(sink) {
  const key = `s${sink.id}`
  return draggingIds.has(key) && localValues[key] != null ? localValues[key] : (sink.volume ?? 0)
}

function appVol(app) {
  const key = `a${app.id}`
  return draggingIds.has(key) && localValues[key] != null ? localValues[key] : (app.volume ?? 0)
}

function icon(volume, muted) {
  if (muted) return VolumeX
  if (volume < 50) return Volume1
  return Volume2
}

function accent(volume, muted) {
  if (muted) return 'var(--muted-foreground)'
  if (volume > 90) return 'oklch(0.70 0.20 275)'
  return 'oklch(0.70 0.17 155)'
}

// ── Restart Server ──
const isRestarting = ref(false)

function handleRestart() {
  if (isRestarting.value) return
  if (!window.confirm("Are you sure you want to restart the audio subsystem? This will interrupt audio temporarily.")) return
  
  isRestarting.value = true
  restartAudioServer()
}

// Wait for a fresh list of sinks to assume the restart finished
watch(() => volumeState.sinks, () => {
  if (isRestarting.value) {
    // slight delay for UI polish
    setTimeout(() => { isRestarting.value = false }, 500)
  }
}, { deep: true })

</script>

<template>
  <div class="h-full flex flex-col p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground flex items-center">
        <LayoutList class="w-4 h-4 mr-2" />
        Audio Routing
      </p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-7 text-[10px] px-2 uppercase tracking-wider bg-black/20 border-white/10 hover:bg-white/10 text-rose-400 hover:text-rose-300"
                :disabled="isRestarting"
                @click="handleRestart">
          <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': isRestarting }" />
          {{ isRestarting ? 'Restarting...' : 'Restart Audio' }}
        </Button>

        <Button variant="ghost" size="sm" class="h-7 text-[10px] px-2 uppercase tracking-wider" 
                @click="showHidden = !showHidden" 
                :class="showHidden ? 'text-primary' : 'text-muted-foreground'">
          <component :is="showHidden ? Eye : EyeOff" class="w-3.5 h-3.5 mr-1.5" />
          {{ showHidden ? 'Hide Disabled' : 'Show Disabled' }}
        </Button>
      </div>
    </div>

    <!-- Split Layout -->
    <div class="flex-1 grid grid-cols-2 gap-6 min-h-0">
      
      <!-- Left Column: Output Devices (Sinks) -->
      <div class="flex flex-col gap-1.5 overflow-y-auto pr-2">
        <h3 class="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 px-1">Output Devices</h3>
        
        <div v-for="sink in displayedSinks" :key="'s' + sink.id"
             class="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all"
             :class="[
               sink.id === volumeState.defaultSinkId ? 'bg-primary/10 border border-primary/20 shadow-[inset_0_0_12px_rgba(var(--primary),0.1)]' : 'hover:bg-white/5 border border-transparent',
               hiddenSinks.includes(sink.name) ? 'opacity-40 grayscale' : ''
             ]">
          
          <!-- Default Radio Indicator -->
          <button @click="setDefaultSink(sink.id)" 
                  class="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none"
                  :class="sink.id === volumeState.defaultSinkId ? 'border-primary' : 'border-white/20 hover:border-white/40'">
            <div v-if="sink.id === volumeState.defaultSinkId" class="w-2 h-2 rounded-full bg-primary" />
          </button>

          <!-- Icon + Name -->
          <div class="flex items-center gap-2 w-[120px] flex-shrink-0">
            <component :is="icon(sinkVol(sink), sink.muted)" class="w-4 h-4 flex-shrink-0"
                       :style="{ color: accent(sinkVol(sink), sink.muted) }" />
            <span class="text-xs font-medium truncate" :class="sink.id === volumeState.defaultSinkId ? 'text-primary-foreground' : 'text-foreground'">
              {{ sink.name }}
            </span>
          </div>

          <!-- Slider -->
          <div class="flex-1 min-w-0" @pointerdown="startDrag(`s${sink.id}`)">
            <Slider :model-value="[sinkVol(sink)]" :min="0" :max="100" :step="1"
                    :disabled="sink.muted" class="w-full"
                    @update:model-value="onSinkSlider(sink.id, $event)"
                    @value-commit="endDrag(`s${sink.id}`)" />
          </div>

          <!-- Volume % -->
          <span class="text-[10px] font-bold tabular-nums font-mono w-9 text-right flex-shrink-0"
                :style="{ color: accent(sinkVol(sink), sink.muted) }">
            {{ sink.muted ? '—' : sinkVol(sink) + '%' }}
          </span>

          <!-- Mute -->
          <Button variant="ghost" size="icon"
                  class="w-6 h-6 rounded-md flex-shrink-0"
                  :class="sink.muted ? 'text-rose-400 bg-rose-400/10' : 'text-muted-foreground'"
                  @click="toggleSinkMute(sink.id)">
            <VolumeX v-if="sink.muted" class="w-3.5 h-3.5" />
            <Volume2 v-else class="w-3.5 h-3.5" />
          </Button>

          <!-- Visibility Toggle -->
          <Button variant="ghost" size="icon" class="w-6 h-6 rounded-md flex-shrink-0 text-muted-foreground/60 hover:text-foreground"
                  @click="toggleSinkVisibility(sink.name)">
            <EyeOff v-if="hiddenSinks.includes(sink.name)" class="w-3.5 h-3.5" />
            <Eye v-else class="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <div v-if="displayedSinks.length === 0" class="py-4 text-center text-xs text-muted-foreground/50 italic">
          No output devices found.
        </div>
      </div>

      <!-- Right Column: Active Apps (Sink Inputs) -->
      <div class="flex flex-col gap-1.5 overflow-y-auto pl-2 border-l border-white/5">
        <h3 class="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 px-1">Active Apps</h3>
        
        <div v-for="app in volumeState.apps" :key="'a' + app.id"
             class="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-white/5">
          
          <!-- Icon + Name -->
          <div class="flex items-center gap-2 w-[120px] flex-shrink-0">
            <component :is="icon(appVol(app), app.muted)" class="w-4 h-4 flex-shrink-0"
                       :style="{ color: accent(appVol(app), app.muted) }" />
            <span class="text-xs font-medium text-foreground truncate">{{ app.name }}</span>
          </div>

          <!-- Slider -->
          <div class="flex-1 min-w-0" @pointerdown="startDrag(`a${app.id}`)">
            <Slider :model-value="[appVol(app)]" :min="0" :max="100" :step="1"
                    :disabled="app.muted" class="w-full"
                    @update:model-value="onAppSlider(app.id, $event)"
                    @value-commit="endDrag(`a${app.id}`)" />
          </div>

          <!-- Volume % -->
          <span class="text-[10px] font-bold tabular-nums font-mono w-9 text-right flex-shrink-0"
                :style="{ color: accent(appVol(app), app.muted) }">
            {{ app.muted ? '—' : appVol(app) + '%' }}
          </span>

          <!-- Mute -->
          <Button variant="ghost" size="icon"
                  class="w-6 h-6 rounded-md flex-shrink-0"
                  :class="app.muted ? 'text-rose-400 bg-rose-400/10' : 'text-muted-foreground'"
                  @click="toggleAppMute(app.id)">
            <VolumeX v-if="app.muted" class="w-3.5 h-3.5" />
            <Volume2 v-else class="w-3.5 h-3.5" />
          </Button>

          <!-- Route selector -->
          <Select v-if="volumeState.sinks.length > 1"
                  :model-value="String(app.sinkIndex ?? '')"
                  @update:model-value="(v) => moveAppToSink(app.id, Number(v))">
            <SelectTrigger class="h-6 text-[10px] w-[90px] bg-white/5 border-white/10 cursor-pointer px-2 flex-shrink-0">
              <Route class="w-3 h-3 mr-1 flex-shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in displayedSinks" :key="s.id"
                          :value="String(s.id)" class="text-[11px] cursor-pointer">
                {{ s.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="volumeState.apps.length === 0" class="py-4 text-center text-xs text-muted-foreground/50 italic">
          No apps playing audio.
        </div>
      </div>

    </div>
  </div>
</template>
