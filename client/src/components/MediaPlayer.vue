<script setup>
import { computed } from 'vue'
import { useSocket, resolveArtUrl } from '@/composables/useSocket'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipBack, SkipForward, Music2, RotateCcw, Repeat, Shuffle, Rewind, FastForward } from 'lucide-vue-next'

const { mediaState, sendMediaCommand } = useSocket()

const isPlaying = computed(() => mediaState.status === 'Playing')
const albumArt = computed(() => resolveArtUrl(mediaState.artUrl))
const hasTrack = computed(() => mediaState.title && mediaState.title !== 'No Track')

function toggleLoop() {
  let next = 'None'
  if (mediaState.loop === 'None') next = 'Playlist'
  else if (mediaState.loop === 'Playlist') next = 'Track'
  sendMediaCommand('loop', next)
}

function toggleShuffle() {
  sendMediaCommand('shuffle', mediaState.shuffle ? 'Off' : 'On')
}
</script>

<template>
  <div class="relative h-full overflow-hidden">
    <!-- Blurred album art background -->
    <div v-if="albumArt" class="absolute inset-0 z-0">
      <img :src="albumArt" alt=""
           class="w-full h-full object-cover scale-125 blur-3xl opacity-25 transition-all duration-700" />
      <div class="absolute inset-0 bg-background/40 dark:bg-background/50" />
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center gap-6 h-full p-8 text-center">
      <!-- Album Art -->
      <div class="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-xl">
        <img v-if="albumArt" :src="albumArt" alt="Album Art"
             class="w-full h-full object-cover transition-transform duration-500"
             :class="{ 'scale-105': isPlaying }" />
        <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
          <Music2 class="w-16 h-16 text-muted-foreground/40" />
        </div>
        <!-- Equalizer bars -->
        <div v-if="isPlaying" class="absolute bottom-3 right-3 flex items-end gap-1">
          <span v-for="i in 3" :key="i"
                class="w-1 rounded-full animate-equalizer bg-primary"
                :style="{ animationDelay: `${i * 0.15}s` }" />
        </div>
      </div>

      <!-- Track Info + Controls -->
      <div class="w-full max-w-md flex flex-col items-center justify-center gap-4 min-w-0">
        <!-- Section Label -->
        <div class="flex items-center justify-center gap-2">
          <p class="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <Music2 class="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Now Playing
          </p>
          <span v-if="mediaState.playerName"
                class="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            {{ mediaState.playerName }}
          </span>
        </div>

        <!-- Track Details -->
        <div class="min-w-0 w-full px-4">
          <h3 class="text-lg md:text-xl font-bold truncate text-foreground leading-tight">
            {{ hasTrack ? mediaState.title : 'Nothing Playing' }}
          </h3>
          <p class="text-sm md:text-base truncate text-muted-foreground mt-1">
            {{ hasTrack ? mediaState.artist : 'Play something to get started' }}
          </p>
          <p v-if="mediaState.album && hasTrack"
             class="text-sm truncate text-muted-foreground/50 mt-1">
            {{ mediaState.album }}
          </p>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-2 md:gap-3 w-full max-w-[400px] mx-auto mt-2 h-16 px-4">
          
          <!-- 1. Loop -->
          <Button variant="ghost" size="icon"
                  class="relative w-10 h-10 rounded-full text-muted-foreground hover:bg-white/10 active:scale-90 transition-all"
                  :class="{ 'text-primary': mediaState.loop !== 'None' }"
                  @click="toggleLoop">
            <Repeat class="w-4 h-4" />
            <span v-if="mediaState.loop === 'Track'" class="absolute text-[10px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>
          </Button>

          <!-- 2. Seek 10 sec back -->
          <Button variant="ghost" size="icon"
                  class="w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer hover:bg-white/10 active:scale-90 transition-all"
                  @click="sendMediaCommand('position', '10-')">
            <Rewind class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
          </Button>

          <!-- 3. Go back -->
          <Button variant="ghost" size="icon"
                  class="w-10 h-10 rounded-full cursor-pointer hover:bg-white/10 active:scale-90 transition-all"
                  @click="sendMediaCommand('previous')">
            <SkipBack class="w-4 h-4" fill="currentColor" />
          </Button>

          <!-- 4. Play -->
          <Button size="icon"
                  class="w-14 h-14 md:w-16 md:h-16 rounded-full cursor-pointer glow-primary active:scale-90 transition-all shadow-lg flex-shrink-0"
                  @click="sendMediaCommand('play-pause')">
            <Pause v-if="isPlaying" class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />
            <Play v-else class="w-6 h-6 md:w-7 md:h-7 ml-1" fill="currentColor" />
          </Button>

          <!-- 5. Go forward -->
          <Button variant="ghost" size="icon"
                  class="w-10 h-10 rounded-full text-muted-foreground hover:bg-white/10 active:scale-90 transition-all"
                  @click="sendMediaCommand('next')">
            <SkipForward class="w-4 h-4" fill="currentColor" />
          </Button>

          <!-- 6. Seek 10 sec forward -->
          <Button variant="ghost" size="icon"
                  class="w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer hover:bg-white/10 active:scale-90 transition-all"
                  @click="sendMediaCommand('position', '10+')">
            <FastForward class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
          </Button>

          <!-- 7. Restart -->
          <Button variant="ghost" size="icon"
                  class="w-10 h-10 rounded-full text-muted-foreground hover:bg-white/10 active:scale-90 transition-all"
                  @click="sendMediaCommand('position', 0)">
            <RotateCcw class="w-4 h-4" />
          </Button>

        </div>
      </div>
    </div>
  </div>
</template>
