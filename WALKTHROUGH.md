# Control Deck — Full Session Walkthrough

## Starting Point

We began with a working Vue 3 + Vite + Tailwind CSS v4 control deck app with:
- A **3-column vertical layout** (clock+scripts | media player | volume mixer)
- Raw Tailwind styling with custom CSS variables (HSL-based)
- Vertical volume sliders using native `<input type="range">`
- A backend running Express + Socket.io with `playerctl` for media and `wpctl`/`pactl` for audio
- 4 scripts: `layout-4k.sh`, `layout-2k.sh`, `layout-1080p.sh`, `start-recorder.sh`
- Dark mode hardcoded — no toggle

---

## Phase 1: Frontend Pivot to Glassmorphic shadcn-vue

### Goal
Completely rewrite the frontend with a horizontal DJ-mixer aesthetic, glassmorphism (visionOS/iOS style), and `shadcn-vue` components instead of raw Tailwind.

### What Was Installed

| Package | Purpose |
|---|---|
| `shadcn-vue` | Component framework CLI + runtime |
| `reka-ui` | Headless UI primitives (powers shadcn-vue) |
| `@vueuse/core` | Vue composition utilities (used by shadcn internals) |
| `class-variance-authority` | Variant-based component styling |
| `tw-animate-css` | Tailwind animation utilities |

**shadcn-vue components added:** `Button`, `Card` (7 subcomponents), `Slider`, `Switch`, `Select` (12 subcomponents)

A `jsconfig.json` was created because the `shadcn-vue` CLI requires path aliases to be declared in a config file (it couldn't resolve the `@/` alias from `vite.config.js` alone).

---

## Phase 2: Volume Mixer Universal Overhaul

### Goal
Completely decouple the backend from specific hardware names, fix volume calculation bugs, and implement an open-source friendly 2-column layout in the frontend.

### Backend: `server/lib/volumeMixer.js`
*   **Hardware Agnostic**: Removed all hardcoded `SINK_FILTERS` (e.g., "GA102"). The backend now blindly sends *all* available sinks found by `pactl list sinks`.
*   **Loopback Filtering**: Maintained filtering for PipeWire internal "loopback-" streams to keep the app list clean.
*   **Robust Math**: Completely abandoned pactl's `value_percent` string parsing. Volume is now calculated directly from the raw integer value (where `65536` equals 100% volume): `Math.round((channel.value / 65536) * 100)`. This guarantees a pure `0-100` integer is sent to the frontend, preventing the `NaN` or `null%` bugs.
*   **Restart Server Command**: Added `restartAudioServer()` which executes `systemctl --user restart wireplumber pipewire pipewire-pulse` to gracefully recover from PipeWire/ALSA crashes.

### Frontend: `client/src/components/VolumeMixer.vue`
*   **50/50 Grid**: Split the bottom area into `Output Devices` (left) and `Active Apps` (right).
*   **Local Storage Filtering**:
    *   Instead of backend hardcoding, filtering is now managed by the user via the UI.
    *   Added an `Eye` / `EyeOff` button next to every output device.
    *   Uses `@vueuse/core`'s `useStorage` to persist a `hiddenSinks` array in `localStorage`.
    *   A top right toggle button "Show Disabled / Hide Disabled" allows the user to see their hidden devices (slightly faded and greyscaled) so they can unhide them.
*   **Default Sinks**: Replaced the dropdown with a custom, clickable radio-button indicator on the left side of the sink rows to instantly set `volume:set-default-sink`.
*   **Anti-Jitter**: Retained the `draggingIds` tracking and 500ms debounce to prevent the slider from snapping back during a drag when the WebSocket receives a routine update.
*   **Panic Button**: Added a red `RefreshCw` button next to the eye toggle to restart the audio server. Includes a `window.confirm` popup to prevent accidental clicks.

---

## Phase 3: Advanced Media Player & iPad Polish

### Goal
Implement advanced media controls and polish the UI for an iPad Pro 12.9" display with visionOS-style glassmorphism.

### Architecture Updates
*   **Extended playerctl format**: Updated the backend `FORMAT_STRING` to include `{{loop}}|||{{shuffle}}`.
*   **New Socket Commands**: Updated `sendMediaCommand(action, args)` to safely accept arguments (`0`, `"10-"`, `"10+"`) for complex `playerctl` commands.

### Frontend: `MediaPlayer.vue` & `App.vue`
*   **New Controls**:
    *   **Loop** (`Repeat` icon): Cycles through `None`, `Playlist`, and `Track`. Shows a tiny "1" badge when set to track loop.
    *   **Rewind 10s** (`Rewind` icon): Jumps back 10 seconds.
    *   **Previous** (`SkipBack` icon)
    *   **Play/Pause** (`Play/Pause` icon)
    *   **Next** (`SkipForward` icon)
    *   **Fast Forward 10s** (`FastForward` icon): Jumps forward 10 seconds.
    *   **Restart** (`RotateCcw` icon): Instantly sends `playerctl position 0`, jumping the song back to the very beginning without skipping tracks.
*   **iPad Pro Polish**:
    *   Switched to a stacked layout for the Media Player, heavily emphasizing the Album Art.
    *   Increased global padding and gaps to provide breathing room.
    *   Scaled up the Clock and Date widgets.
    *   Redesigned the `.glass-panel` utility with heavier blur, higher transparency, and subtle inset borders to accurately mimic iOS 18 / visionOS aesthetics.

---

## Phase 4: Gameplay Clipping Integration

### Goal
Add Quick Action buttons to interact with a background `gpu-screen-recorder` daemon, saving the full replay buffer or a dynamically trimmed segment.

### Architecture Updates
*   **Backend:** `server/lib/clipper.js`
    *   **SIGUSR1 Intercept**: Sends `killall -SIGUSR1 gpu-screen-recorder` to dump the current buffer to disk (e.g., `/mnt/2TBHDD/Deck-Clips/`).
    *   **Dynamic Trimming**: Because FFMPEG's `-sseof` trick causes corrupt 0-byte files if the dumped video is shorter than the requested duration, the script now uses `ffprobe` to determine the exact millisecond duration of the dumped file.
        *   If the duration is `<= 30s` (e.g., the user clicked the button just 15 seconds after a previous dump), it skips FFMPEG entirely and safely renames the file.
        *   If the duration is `> 30s` (e.g., a 60s buffer dump), it accurately seeks (`duration - 30`) and performs a lossless video copy (`-c copy`) via `ffmpeg`.
*   **Notification Quirk Documented**: Bypassing `gpu-screen-recorder-ui`'s hotkeys (like `Alt+F10`) and directly sending `SIGUSR1` to the daemon triggers a bug in the native desktop notification where it erroneously says "Saved 0 seconds". This is an open-source visual quirk, but the FFMPEG backend ensures the actual `.mp4` file is perfectly saved.

### Frontend: `ScriptGrid.vue`
*   **New Buttons**: Added a "Gameplay Replay" section with two tinted `shadcn-vue` Cards: "Save 30s Clip" (Red, `Scissors` icon) and "Save 60s Clip" (Blue, `Video` icon).
*   **Loading State**: Socket listeners handle UI state, showing a spinner while the HDD dumps the buffer and `ffmpeg` processes the trim.

---

## Phase 5: Voice Command API Integration

### Goal
Expose silent HTTP GET endpoints on the Express backend so that external tools (like Apple Shortcuts triggered by Siri) can execute scripts and save clips without needing to load the frontend web application.

### Architecture Updates
*   **Backend:** `server/server.js`
    *   Added a new routing block for `/api/voice/*` endpoints immediately before the static file server to ensure they are caught by Express.
    *   **Endpoints Added:**
        *   `GET /api/voice/clip`: Executes `saveClip(30)` to dump and FFMPEG trim a 30s gameplay replay.
        *   `GET /api/voice/mode-movie`: Executes `runScript('movie_mode')`.
        *   `GET /api/voice/mode-desk`: Executes `runScript('desk_mode')`.
        *   `GET /api/voice/mode-gaming`: Executes `runScript('steam_tv')`.
        *   `GET /api/voice/mode-tv`: Executes `runScript('tv_only')`.
    *   Each endpoint uses the existing internal library modules (`clipper.js` and `scriptRunner.js`) to prevent code duplication, and returns a simple HTTP `200 OK` status upon success. Console logs were added for debugging visibility.

---

## Deployment (Production Mode)

The application has been converted from a development environment to a production background service.

### 1. Static Serving
The Vue frontend is compiled into `client/dist`. The Node.js backend (`server/server.js`) has been updated to act as a web server, statically serving the Vue frontend while simultaneously running the WebSocket and system integrations.

### 2. Systemd Background Service
A user-level systemd service was created to keep the deck running permanently on the host machine.

*   **Service File Path:** `~/.config/systemd/user/control-deck.service`
*   **Commands:**
    *   `systemctl --user status control-deck.service`
    *   `systemctl --user restart control-deck.service`
    *   `systemctl --user stop control-deck.service`

**You can now access the Control Deck securely and permanently at:**
`http://localhost:3001` (or your PC's Tailscale IP address at port 3001)
