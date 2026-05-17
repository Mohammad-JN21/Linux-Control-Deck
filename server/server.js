import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import { startMetadataWatcher, getInitialState, sendCommand } from './lib/mediaController.js';
import { getVolumes, setSinkVolume, setAppVolume, toggleSinkMute, toggleAppMute, setDefaultSink, moveAppToSink, restartAudioServer } from './lib/volumeMixer.js';
import { runScript, getAvailableScripts } from './lib/scriptRunner.js';
import { saveClip } from './lib/clipper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// ── Express Setup ──────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve album art from local file:// paths
app.get('/api/art', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  // Only allow image files
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return res.status(403).json({ error: 'Not an allowed image type' });
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Not a file' });
    }
    const data = await readFile(filePath);
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(data);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// REST fallback for script execution
app.post('/api/script/:name', async (req, res) => {
  try {
    const result = await runScript(req.params.name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Voice Command API Routes ───────────────────────────────────
app.get('/api/voice/clip', async (req, res) => {
  console.log('[voice] Triggered: save 30s clip');
  try {
    await saveClip(30);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice] Error clipping:', err.message);
    res.status(500).send(err.message);
  }
});

app.get('/api/voice/mode-movie', async (req, res) => {
  console.log('[voice] Triggered: movie_mode');
  try {
    await runScript('movie_mode');
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice] Error running movie_mode:', err.message);
    res.status(500).send(err.message);
  }
});

app.get('/api/voice/mode-desk', async (req, res) => {
  console.log('[voice] Triggered: desk_mode');
  try {
    await runScript('desk_mode');
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice] Error running desk_mode:', err.message);
    res.status(500).send(err.message);
  }
});

app.get('/api/voice/mode-gaming', async (req, res) => {
  console.log('[voice] Triggered: steam_tv');
  try {
    await runScript('steam_tv');
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice] Error running steam_tv:', err.message);
    res.status(500).send(err.message);
  }
});

app.get('/api/voice/mode-tv', async (req, res) => {
  console.log('[voice] Triggered: tv_only');
  try {
    await runScript('tv_only');
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice] Error running tv_only:', err.message);
    res.status(500).send(err.message);
  }
});

// Serve static frontend from client/dist
const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// ── HTTP + Socket.io Server ────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── Socket.io Connection Handler ───────────────────────────────
io.on('connection', async (socket) => {
  console.log(`[ws] Client connected: ${socket.id}`);

  // ── Media: Start watcher & send initial state ──
  const mediaWatcher = startMetadataWatcher(socket);

  const initialMedia = await getInitialState();
  if (initialMedia) {
    socket.emit('media:update', initialMedia);
  }

  // ── Media: Handle commands ──
  socket.on('media:command', async ({ action, args }) => {
    const result = await sendCommand(action, args);
    if (!result.success) {
      console.warn(`[media] Command "${action}" failed:`, result.error);
    }
  });

  // ── Volume: Polling interval ──
  let volumeInterval = null;

  const sendVolumeUpdate = async () => {
    try {
      const volumes = await getVolumes();
      socket.emit('volume:update', volumes);
    } catch (err) {
      console.error('[volume] Polling error:', err.message);
    }
  };

  // Send initial volume state immediately
  await sendVolumeUpdate();
  volumeInterval = setInterval(sendVolumeUpdate, 2000);

  // ── Volume: Handle set commands ──
  socket.on('volume:set', async ({ id, volume, type }) => {
    if (type === 'sink') {
      await setSinkVolume(id, volume);
    } else {
      await setAppVolume(id, volume);
    }
    // Immediately send updated state
    setTimeout(sendVolumeUpdate, 100);
  });

  socket.on('volume:mute', async ({ id, type }) => {
    if (type === 'sink') {
      await toggleSinkMute(id);
    } else {
      await toggleAppMute(id);
    }
    setTimeout(sendVolumeUpdate, 100);
  });

  // ── Volume: Set default output sink ──
  socket.on('volume:set-default-sink', async ({ sinkId }) => {
    console.log(`[volume] Setting default sink to: ${sinkId}`);
    await setDefaultSink(sinkId);
    setTimeout(sendVolumeUpdate, 200);
  });

  // ── Volume: Move app to a different sink ──
  socket.on('volume:move-app', async ({ inputId, sinkId }) => {
    console.log(`[volume] Moving input ${inputId} to sink ${sinkId}`);
    await moveAppToSink(inputId, sinkId);
    setTimeout(sendVolumeUpdate, 200);
  });

  // ── Volume: Restart Audio Subsystem ──
  socket.on('volume:restart-server', async () => {
    try {
      await restartAudioServer();
      await sendVolumeUpdate();
    } catch (err) {
      console.error('[server] Restart audio server failed:', err.message);
    }
  });

  // ── Scripts ──
  socket.on('script:run', async ({ name }) => {
    console.log(`[script] Running: ${name}`);
    try {
      const result = await runScript(name);
      socket.emit('script:result', { name, ...result });
    } catch (err) {
      socket.emit('script:result', { name, success: false, output: '', error: err.message });
    }
  });

  // Send available scripts list on connect
  const scripts = await getAvailableScripts();
  socket.emit('script:list', scripts);

  // ── Clipper ──
  socket.on('clip:save', async ({ duration }) => {
    try {
      const result = await saveClip(duration);
      socket.emit('clip:result', result);
    } catch (err) {
      socket.emit('clip:result', { success: false, error: err.message });
    }
  });

  // ── Cleanup on disconnect ──
  socket.on('disconnect', () => {
    console.log(`[ws] Client disconnected: ${socket.id}`);
    mediaWatcher.kill();
    if (volumeInterval) {
      clearInterval(volumeInterval);
      volumeInterval = null;
    }
  });
});

// ── Start Server ───────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🎛️  Control Deck server running on http://0.0.0.0:${PORT}\n`);
});
