import { ref, watch } from 'vue'

const STORAGE_KEY = 'control-deck-theme'

// Read initial preference: localStorage → system preference → default dark
function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light') return false
  if (stored === 'dark') return true
  // Fall back to system preference
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return true
  return true // default dark
}

const isDark = ref(getInitialTheme())

function applyTheme() {
  const html = document.documentElement
  if (isDark.value) {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
  localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
}

// Apply on load
applyTheme()

// Watch for changes
watch(isDark, () => {
  applyTheme()
})

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value
  }

  return {
    isDark,
    toggleTheme,
  }
}
