# Linux Control Deck 🎛️

A custom, web-based control dashboard designed for Linux (CachyOS/Arch), optimized specifically for touch interaction on an iPad Pro. 

It provides real-time control over:
- 🔊 **Universal Audio Mixer**: Control system volume and individual app volumes via `wpctl`/`pactl` (PipeWire).
- 🎵 **Advanced Media Player**: Control currently playing media (YouTube, Spotify, etc.) using `playerctl`, complete with album art and FFMPEG lossless clipping.
- 📺 **Display & Script Quick Actions**: Execute native bash scripts to instantly change display layouts or trigger custom system events.
- 🎮 **Gameplay Clipping**: Seamlessly dumps and losslessly trims `gpu-screen-recorder` buffers.

---

## 🚀 Installation & Setup

### Prerequisites
You will need the following installed on your Linux host:
- `Node.js` (v18+)
- `npm`
- `playerctl` (for media controls)
- `pipewire-pulse` / `pactl` (for audio mixing)
- `ffmpeg` & `ffprobe` (for video clipping)
- `gpu-screen-recorder` (if you wish to use the replay clipping feature)

### 1. Clone the Repository
```bash
git clone https://github.com/Mohammad-JN21/Linux-Control-Deck.git
cd Linux-Control-Deck
```

### 2. Install Dependencies
Install dependencies for both the frontend (`client`) and backend (`server`).
```bash
cd client && npm install
cd ../server && npm install
```

### 3. Build the Frontend
Compile the Vue 3 frontend into static HTML/JS files that the backend will serve.
```bash
cd ../client
npm run build
```

---

## 🏃‍♂️ How to Run the Deck

You have two options for running the deck: **Manual Mode** (great for testing) or **Permanent Background Service** (great for daily use).

### Option A: Run Manually in Terminal
If you just want to test it out:
1. Open a terminal and navigate to the server folder:
   ```bash
   cd Linux-Control-Deck/server
   ```
2. Start the Node backend:
   ```bash
   node server.js
   ```
3. The server is now running on Port 3001.

### Option B: Run as a Permanent Background Service (Systemd)
To keep the deck running infinitely in the background and auto-start on boot:
1. Create a service file: `~/.config/systemd/user/control-deck.service`.
2. Paste the following configuration (adjust the `/home/YOUR_USER/` paths to match where you cloned the repo):
   ```ini
   [Unit]
   Description=Linux Control Deck Server
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/bin/node /home/YOUR_USER/Linux-Control-Deck/server/server.js
   WorkingDirectory=/home/YOUR_USER/Linux-Control-Deck/server
   Restart=on-failure
   RestartSec=5
   Environment=PORT=3001

   [Install]
   WantedBy=default.target
   ```
3. Enable and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now control-deck.service
   ```
*(For a full list of systemd management commands, check the `SERVICE_CHEATSHEET.md` file included in this repo).*

---

## 📱 How to Access the Deck on your iPad/Phone

Once the server is running, the frontend is hosted on **Port 3001**. 

### Method 1: Local Network (No Tailscale)
If your iPad and Linux PC are connected to the exact same Wi-Fi router:
1. Find your Linux PC's local IP address (usually starts with `192.168.x.x`). You can find this by typing `ip a` in your terminal.
2. Open Safari on your iPad and go to:
   `http://192.168.x.x:3001`

### Method 2: Tailscale (Access from Anywhere)
If you want to use the Control Deck securely even when you aren't home:
1. Install [Tailscale](https://tailscale.com/) on both your Linux PC and your iPad.
2. Find your Linux PC's Tailscale IP address (usually starts with `100.x.x.x`).
3. Open Safari on your iPad and go to:
   `http://100.x.x.x:3001`

---

## 🛠️ Fine-Tuning & Customization

If you want to fork this project and customize it for your own setup, here is a quick summary of how the codebase is structured (for a deeper technical dive, please read `WALKTHROUGH.md`).

### The Tech Stack
*   **Frontend**: Vue 3, Vite, Tailwind CSS v4, `shadcn-vue` (for the glassmorphic iOS-style components).
*   **Backend**: Node.js, Express, Socket.io.
*   **Communication**: The frontend and backend communicate almost entirely via real-time WebSockets (`useSocket.js`), rather than HTTP polling, ensuring instant UI updates when a song skips or volume changes.

### Modifying the Layout or Styles
*   The entire UI is built using standard Tailwind CSS classes. 
*   The heavy glassmorphism effects (visionOS style) are driven by the `.glass-panel` utility located in `client/src/assets/main.css`.
*   If you make any changes to the `.vue` or `.css` files in the `client` folder, **you must re-run `npm run build`** inside the `client` folder, and then restart the Node backend for the changes to take effect.

### Adding Custom Bash Scripts
*   The Quick Action buttons on the frontend trigger raw `.sh` scripts located in the `server/scripts/` directory.
*   To add a new button:
    1. Drop a new `.sh` script into `server/scripts/` and ensure it is executable (`chmod +x`).
    2. Open `client/src/components/ScriptGrid.vue`.
    3. Add a new object to the `buttons` array, mapping the `name` to the exact filename of your new bash script.

### Voice Command API (Apple Shortcuts Integration)
The backend exposes silent HTTP `GET` endpoints that can be triggered remotely (e.g., via iOS Siri Shortcuts) to run scripts without opening the UI:
*   `GET /api/voice/clip` (Saves a 30s replay)
*   `GET /api/voice/mode-movie`
*   `GET /api/voice/mode-desk`
*   `GET /api/voice/mode-gaming`
*   `GET /api/voice/mode-tv`
*(See `server/server.js` to add more).*

---
*Created by Mohammad-JN21*
