import { execFile } from 'node:child_process';
import { readdir, access, constants } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, '..', 'scripts');

// Only allow alphanumeric, dashes, underscores in script names
const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate a script name for safety.
 * Rejects path traversal, special characters, etc.
 */
function validateScriptName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Script name is required');
  }
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`Invalid script name: "${name}". Only alphanumeric, dashes, and underscores are allowed.`);
  }
}

/**
 * Run a script by name from the scripts/ directory.
 * @param {string} scriptName - Name without .sh extension
 * @returns {Promise<{success: boolean, output: string, error: string}>}
 */
export async function runScript(scriptName) {
  validateScriptName(scriptName);

  const scriptPath = join(SCRIPTS_DIR, `${scriptName}.sh`);

  // Ensure the script exists and is readable
  try {
    await access(scriptPath, constants.R_OK);
  } catch {
    return { success: false, output: '', error: `Script "${scriptName}" not found` };
  }

  return new Promise((resolve) => {
    execFile('bash', [scriptPath], {
      timeout: 30000, // 30s timeout
      cwd: SCRIPTS_DIR,
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          output: stdout?.trim() || '',
          error: stderr?.trim() || error.message,
        });
      } else {
        resolve({
          success: true,
          output: stdout?.trim() || '',
          error: stderr?.trim() || '',
        });
      }
    });
  });
}

/**
 * List all available scripts in the scripts/ directory.
 * @returns {Promise<Array<{name: string, label: string}>>}
 */
export async function getAvailableScripts() {
  try {
    const files = await readdir(SCRIPTS_DIR);
    return files
      .filter((f) => f.endsWith('.sh'))
      .map((f) => {
        const name = f.replace('.sh', '');
        // Convert kebab-case to Title Case for the label
        const label = name
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return { name, label };
      });
  } catch {
    return [];
  }
}
