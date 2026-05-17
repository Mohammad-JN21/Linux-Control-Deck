import { spawn, execFile } from 'node:child_process';

// Format string for playerctl metadata --follow
// Outputs a pipe-delimited line we can easily parse
const FORMAT_STRING = '{{playerName}}|||{{status}}|||{{title}}|||{{artist}}|||{{album}}|||{{mpris:artUrl}}|||{{mpris:length}}|||{{position}}|||{{loop}}|||{{shuffle}}';

/**
 * Get the initial media state with a one-shot playerctl call.
 * @returns {Promise<object|null>}
 */
export async function getInitialState() {
  try {
    const metadata = await execAsync('playerctl', [
      'metadata', '--format', FORMAT_STRING,
    ]);

    if (!metadata.trim()) return null;
    return parseLine(metadata.trim());
  } catch {
    return null;
  }
}

/**
 * Start watching playerctl metadata changes.
 * Emits 'media:update' to the given socket on every change.
 * @param {import('socket.io').Socket} socket
 * @returns {{ kill: () => void }} cleanup handle
 */
export function startMetadataWatcher(socket) {
  let proc = null;

  try {
    proc = spawn('playerctl', [
      'metadata', '--format', FORMAT_STRING, '--follow',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    });
  } catch (err) {
    console.error('[media] Failed to spawn playerctl:', err.message);
    return { kill: () => {} };
  }

  let buffer = '';

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseLine(line.trim());
      if (parsed) {
        socket.emit('media:update', parsed);
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.warn('[media] playerctl stderr:', msg);
  });

  proc.on('error', (err) => {
    console.error('[media] playerctl process error:', err.message);
  });

  proc.on('close', (code) => {
    console.log(`[media] playerctl exited with code ${code}`);
  });

  return {
    kill: () => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    },
  };
}

/**
 * Send a command to playerctl (play-pause, next, previous, position, loop, shuffle).
 * @param {string} action
 * @param {string} [args] - Optional argument for commands like position, loop, shuffle
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendCommand(action, args = '') {
  const allowed = ['play-pause', 'next', 'previous', 'play', 'pause', 'stop', 'position', 'loop', 'shuffle'];
  if (!allowed.includes(action)) {
    return { success: false, error: `Unknown action: ${action}` };
  }

  try {
    const cmdArgs = args !== undefined && args !== '' && args !== null ? [action, String(args)] : [action];
    await execAsync('playerctl', cmdArgs);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Parse a pipe-delimited metadata line into a structured object.
 */
function parseLine(line) {
  const parts = line.split('|||');
  if (parts.length < 6) return null;

  const [playerName, status, title, artist, album, artUrl, length, position, loop, shuffle] = parts;

  // Convert lengths from microseconds to seconds
  const lengthSec = length ? parseInt(length, 10) / 1000000 : 0;
  const positionSec = position ? parseInt(position, 10) / 1000000 : 0;

  return {
    playerName: playerName || 'Unknown',
    status: status || 'Stopped',
    title: title || 'No Track',
    artist: artist || 'Unknown Artist',
    album: album || '',
    artUrl: artUrl || '',
    length: isNaN(lengthSec) ? 0 : lengthSec,
    position: isNaN(positionSec) ? 0 : positionSec,
    loop: loop || 'None',
    shuffle: shuffle === 'true' || shuffle === 'On',
  };
}

/**
 * Promisified execFile helper.
 */
function execAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      timeout: 5000,
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
