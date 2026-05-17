import { execFile } from 'node:child_process';

/**
 * Try to resolve an app name from its properties.
 * Returns null if it's a loopback or unrecognized.
 */
function resolveAppName(props) {
  const appName  = props['application.name'] || '';
  const mediaName = props['media.name'] || '';
  const binary   = props['application.process.binary'] || '';
  const nodeName = props['node.name'] || '';
  const linkGroup = props['node.link-group'] || '';

  // Filter OUT loopback streams — they're PipeWire plumbing, not real apps
  if (linkGroup.startsWith('loopback-') ||
      nodeName.startsWith('output.loopback') ||
      nodeName.startsWith('input.loopback') ||
      mediaName.includes('loopback-')) {
    return null;
  }

  // Check for Proton/Wine games
  const candidates = [appName, mediaName, binary];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const lower = candidate.toLowerCase();
    if (lower.includes('.exe') || lower.includes('wine')) {
      return cleanProtonName(candidate);
    }
  }

  // Fallback: show the app with its original name (cleaned up)
  const fallback = appName || mediaName || binary;
  if (!fallback) return null;
  
  // Specific cleanups for common apps
  if (fallback === 'WEBRTC VoiceEngine') return 'Discord Voice';
  if (fallback === 'speech-dispatcher-espeak-ng') return 'TTS';

  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

/**
 * Clean up Proton/Wine app names: strip paths, strip .exe
 */
function cleanProtonName(name) {
  let cleaned = name;
  const backslashIdx = cleaned.lastIndexOf('\\');
  if (backslashIdx >= 0) cleaned = cleaned.substring(backslashIdx + 1);
  const slashIdx = cleaned.lastIndexOf('/');
  if (slashIdx >= 0) cleaned = cleaned.substring(slashIdx + 1);
  cleaned = cleaned.replace(/\.exe$/i, '');
  if (cleaned.length > 0) cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned || name;
}

/**
 * Calculate volume percentage robustly using raw integer values.
 * Base volume in PipeWire/PulseAudio is 65536.
 * Ignores `value_percent` string completely to prevent NaN bugs.
 */
function calculateVolumePercent(volumeObj) {
  if (!volumeObj) return 100;
  const channels = Object.values(volumeObj);
  if (channels.length === 0) return 100;

  let totalPct = 0;
  for (const ch of channels) {
    const rawValue = ch.value ?? 65536;
    const pct = Math.round((rawValue / 65536) * 100);
    totalPct += pct;
  }
  return Math.round(totalPct / channels.length);
}

// ────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────

/**
 * Get current volume state: ALL sinks + filtered apps + default sink ID.
 */
export async function getVolumes() {
  const [sinks, apps, defaultSinkId] = await Promise.all([
    getAllSinks(),
    getAllApps(),
    getDefaultSinkId(),
  ]);
  return { sinks, apps, defaultSinkId };
}

/**
 * Get all audio sinks. Hardcoded filters are removed for universal compatibility.
 */
async function getAllSinks() {
  try {
    const raw = await execAsync('pactl', ['--format=json', 'list', 'sinks']);
    const sinks = JSON.parse(raw);
    const result = [];

    for (const sink of sinks) {
      result.push({
        id: sink.index,
        name: sink.description || sink.name || 'Unknown Output',
        pactlName: sink.name,
        volume: calculateVolumePercent(sink.volume),
        muted: sink.mute ?? false,
        state: sink.state || 'IDLE',
      });
    }
    return result;
  } catch (err) {
    console.error('[volume] Failed to get sinks:', err.message);
    return [];
  }
}

/**
 * Get the pactl index of the default audio sink.
 */
async function getDefaultSinkId() {
  try {
    const defaultName = (await execAsync('pactl', ['get-default-sink'])).trim();
    const raw = await execAsync('pactl', ['--format=json', 'list', 'sinks']);
    const sinks = JSON.parse(raw);
    const match = sinks.find(s => s.name === defaultName);
    return match ? match.index : null;
  } catch (err) {
    console.error('[volume] Failed to get default sink:', err.message);
    return null;
  }
}

/**
 * Get app streams. Loopbacks are still filtered out.
 */
async function getAllApps() {
  try {
    const raw = await execAsync('pactl', ['--format=json', 'list', 'sink-inputs']);
    const inputs = JSON.parse(raw);
    const result = [];

    for (const input of inputs) {
      const props = input.properties || {};
      const label = resolveAppName(props);
      if (!label) continue; // Skip loopbacks and unrecognized streams

      result.push({
        id: input.index,
        name: label,
        volume: calculateVolumePercent(input.volume),
        muted: input.mute ?? false,
        corked: input.corked ?? false,
        sinkIndex: input.sink,
      });
    }
    return result;
  } catch (err) {
    console.error('[volume] Failed to get app volumes:', err.message);
    return [];
  }
}

// ── Volume Control ─────────────────────────────────────────────

export async function setSinkVolume(sinkIndex, percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  try {
    await execAsync('pactl', ['set-sink-volume', String(sinkIndex), `${clamped}%`]);
    return { success: true };
  } catch (err) {
    console.error(`[volume] Failed to set sink ${sinkIndex} volume:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function setAppVolume(sinkInputIndex, percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  try {
    await execAsync('pactl', [
      'set-sink-input-volume', String(sinkInputIndex), `${clamped}%`,
    ]);
    return { success: true };
  } catch (err) {
    console.error(`[volume] Failed to set sink-input ${sinkInputIndex} volume:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function toggleSinkMute(sinkIndex) {
  try {
    await execAsync('pactl', ['set-sink-mute', String(sinkIndex), 'toggle']);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function toggleAppMute(sinkInputIndex) {
  try {
    await execAsync('pactl', ['set-sink-input-mute', String(sinkInputIndex), 'toggle']);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Routing ────────────────────────────────────────────────────

export async function setDefaultSink(sinkIndex) {
  try {
    const raw = await execAsync('pactl', ['--format=json', 'list', 'sinks']);
    const sinks = JSON.parse(raw);
    const sink = sinks.find(s => s.index === sinkIndex);
    if (!sink) throw new Error(`Sink index ${sinkIndex} not found`);
    await execAsync('pactl', ['set-default-sink', sink.name]);
    console.log(`[volume] Default sink → ${sink.name} (${sinkIndex})`);
    return { success: true };
  } catch (err) {
    console.error('[volume] Failed to set default sink:', err.message);
    return { success: false, error: err.message };
  }
}

export async function moveAppToSink(inputId, sinkId) {
  try {
    await execAsync('pactl', ['move-sink-input', String(inputId), String(sinkId)]);
    console.log(`[volume] Moved sink-input ${inputId} → sink ${sinkId}`);
    return { success: true };
  } catch (err) {
    console.error(`[volume] Failed to move sink-input ${inputId}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function restartAudioServer() {
  try {
    console.log('[volume] Restarting audio subsystem...');
    await execAsync('systemctl', ['--user', 'restart', 'wireplumber', 'pipewire', 'pipewire-pulse']);
    // Wait for the graph to rebuild
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getVolumes();
  } catch (err) {
    console.error('[volume] Failed to restart audio subsystem:', err.message);
    throw err;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function execAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
