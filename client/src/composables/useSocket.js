import { ref, reactive, onUnmounted, readonly } from 'vue'
import { io } from 'socket.io-client'

// Singleton socket instance
let socket = null
let refCount = 0

// Shared reactive state
const connected = ref(false)
const mediaState = reactive({
  playerName: '',
  status: 'Stopped',
  title: 'No Track',
  artist: 'Unknown Artist',
  album: '',
  artUrl: '',
})
const volumeState = reactive({
  sinks: [],           // filtered output devices
  apps: [],            // filtered app streams
  defaultSinkId: null, // which sink is the system default
})
const scriptResult = reactive({
  name: '',
  success: null,
  output: '',
  error: '',
  loading: false,
})
const clipResult = reactive({
  loading: false,
  success: null,
  error: '',
})
const availableScripts = ref([])

/**
 * Resolve the backend URL.
 * In dev: same hostname, port 3001.
 * In prod: same origin (served from Express).
 */
function getServerUrl() {
  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:3001`
  }
  return window.location.origin
}

/**
 * Resolve an album art URL.
 * Converts file:// paths to the backend proxy endpoint.
 */
export function resolveArtUrl(artUrl) {
  if (!artUrl) return ''
  if (artUrl.startsWith('file://')) {
    const filePath = artUrl.replace('file://', '')
    return `${getServerUrl()}/api/art?path=${encodeURIComponent(filePath)}`
  }
  return artUrl
}

/**
 * Initialize or reuse the shared Socket.io connection.
 */
function initSocket() {
  if (socket) return socket

  const url = getServerUrl()
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  socket.on('connect', () => {
    connected.value = true
    console.log('[socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    connected.value = false
    console.log('[socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    connected.value = false
    console.warn('[socket] Connection error:', err.message)
  })

  // ── Media updates ──
  socket.on('media:update', (data) => {
    Object.assign(mediaState, data)
  })

  // ── Volume updates ──
  socket.on('volume:update', (data) => {
    volumeState.sinks = data.sinks
    volumeState.apps = data.apps
    volumeState.defaultSinkId = data.defaultSinkId
  })

  // ── Script results ──
  socket.on('script:result', (result) => {
    Object.assign(scriptResult, result)
    scriptResult.loading = false
  })

  socket.on('clip:result', (result) => {
    Object.assign(clipResult, result)
    clipResult.loading = false
    if (result.success) {
      setTimeout(() => {
        clipResult.success = null
      }, 3000)
    }
  })

  // ── Available scripts list ──
  socket.on('script:list', (scripts) => {
    availableScripts.value = scripts
  })

  return socket
}

/**
 * Composable for using the shared Socket.io connection.
 * Manages connection lifecycle with reference counting.
 */
export function useSocket() {
  const sock = initSocket()
  refCount++

  // ── Methods ──
  function sendMediaCommand(action, args = '') {
    sock.emit('media:command', { action, args })
  }

  function setSinkVolume(id, volume) {
    sock.emit('volume:set', { id, volume, type: 'sink' })
  }

  function setAppVolume(id, volume) {
    sock.emit('volume:set', { id, volume, type: 'app' })
  }

  function toggleSinkMute(id) {
    sock.emit('volume:mute', { id, type: 'sink' })
  }

  function toggleAppMute(id) {
    sock.emit('volume:mute', { id, type: 'app' })
  }

  function setDefaultSink(sinkId) {
    sock.emit('volume:set-default-sink', { sinkId })
  }

  function moveAppToSink(inputId, sinkId) {
    sock.emit('volume:move-app', { inputId, sinkId })
  }

  function restartAudioServer() {
    sock.emit('volume:restart-server')
  }

  function executeScript(name) {
    scriptResult.loading = true
    scriptResult.name = name
    scriptResult.success = null
    sock.emit('script:run', { name })
  }

  function saveClip(duration) {
    clipResult.loading = true
    clipResult.success = null
    clipResult.error = ''
    sock.emit('clip:save', { duration })
  }

  // ── Cleanup ──
  onUnmounted(() => {
    refCount--
    if (refCount <= 0 && socket) {
      socket.disconnect()
      socket = null
      refCount = 0
    }
  })

  return {
    connected: readonly(connected),
    mediaState: readonly(mediaState),
    volumeState,
    scriptResult: readonly(scriptResult),
    clipResult: readonly(clipResult),
    availableScripts: readonly(availableScripts),
    sendMediaCommand,
    setSinkVolume,
    setAppVolume,
    toggleSinkMute,
    toggleAppMute,
    setDefaultSink,
    moveAppToSink,
    restartAudioServer,
    executeScript,
    saveClip,
    resolveArtUrl,
  }
}
