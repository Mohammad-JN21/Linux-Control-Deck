import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, stat, unlink, rename } from 'node:fs/promises';
import { join, extname } from 'node:path';

const execAsync = promisify(exec);

const CLIPS_DIR = '/mnt/2TBHDD/Deck-Clips/';
const WAIT_MS = 5000; // Time to wait for gpu-screen-recorder to write to disk

async function findNewestVideoFile(dir) {
  let newestFile = null;
  let newestTime = 0;

  async function scan(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          // Match standard video formats gpu-screen-recorder outputs
          if (ext === '.mp4' || ext === '.mkv' || ext === '.flv' || ext === '.mov') {
            // Ignore files that are already _30s trimmed
            if (!entry.name.includes('_30s')) {
              const stats = await stat(fullPath);
              if (stats.mtimeMs > newestTime) {
                newestTime = stats.mtimeMs;
                newestFile = fullPath;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[clipper] Could not read dir ${currentDir}:`, err.message);
    }
  }

  await scan(dir);
  return newestFile;
}

export async function saveClip(duration) {
  if (duration !== 30 && duration !== 60) {
    throw new Error('Unsupported clip duration');
  }

  console.log(`[clipper] Dumping gpu-screen-recorder buffer for ${duration}s clip...`);
  
  try {
    await execAsync('killall -SIGUSR1 gpu-screen-recorder');
  } catch (err) {
    throw new Error('Failed to send SIGUSR1 to gpu-screen-recorder. Is it running?');
  }

  if (duration === 60) {
    return { success: true, message: '60s clip saved' };
  }

  // Handle 30s trim
  console.log(`[clipper] Waiting ${WAIT_MS}ms for disk write...`);
  await new Promise(resolve => setTimeout(resolve, WAIT_MS));

  const newestFile = await findNewestVideoFile(CLIPS_DIR);
  if (!newestFile) {
    throw new Error(`Could not find any recent video files in ${CLIPS_DIR}`);
  }

  console.log(`[clipper] Found newest file: ${newestFile}`);
  
  const ext = extname(newestFile);
  const basePath = newestFile.slice(0, -ext.length);
  const outputFile = `${basePath}_30s${ext}`;

  try {
    // 1. Get exact duration using ffprobe
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${newestFile}"`);
    const totalDuration = parseFloat(stdout.trim());
    
    console.log(`[clipper] Original file duration: ${totalDuration.toFixed(2)}s`);

    if (isNaN(totalDuration)) {
      throw new Error('ffprobe returned invalid duration');
    }

    if (totalDuration <= 30) {
      // If the file is already 30s or shorter, no need to trim. Just rename it.
      console.log(`[clipper] File is <= 30s. Simply renaming to: ${outputFile}`);
      await rename(newestFile, outputFile);
    } else {
      // 2. File is longer than 30s. Accurately seek to (duration - 30) and copy.
      const seekTime = totalDuration - 30;
      console.log(`[clipper] File is > 30s. Trimming from ${seekTime.toFixed(2)}s to: ${outputFile}`);
      await execAsync(`ffmpeg -ss ${seekTime.toFixed(3)} -i "${newestFile}" -c copy "${outputFile}" -y`);
      
      console.log(`[clipper] Deleting original 60s file...`);
      await unlink(newestFile);
    }
  } catch (err) {
    throw new Error(`Failed to process and trim video: ${err.message}`);
  }

  return { success: true, message: '30s clip saved and trimmed successfully' };
}
