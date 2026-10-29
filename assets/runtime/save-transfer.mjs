import { ARCADE_KEY, restoreArcade } from './arcade.mjs';
import { CONTROLS_KEY, controlSettings } from './bindings.mjs';
import { VISUALS_KEY, visualSettings } from './visuals.mjs';
import { audioSettings } from './audio.mjs';

export const BACKUP_LIMIT = 32768;
export const SAVE_KEYS = [ARCADE_KEY, CONTROLS_KEY, 'pdcf-audio-v1', VISUALS_KEY];
export const SAVE_LABELS = ['Arcade progress', 'Keyboard/controller bindings', 'Audio preferences', 'Visual preferences'];
const validators = [restoreArcade, controlSettings, audioSettings, visualSettings];
function equal(a, b) {
  if (a === b) return true;
  return a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)
    && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
}

export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > BACKUP_LIMIT) throw new Error('Backup exceeds the 32 KB limit.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Choose a valid PDCF JSON backup.'); }
  if (value?.format !== 'pdcf-save' || value.version !== 1 || !value.data || Array.isArray(value.data) || typeof value.data !== 'object') throw new Error('Unsupported PDCF backup format.');
  const keys = Object.keys(value.data);
  if (!keys.length || keys.some(key => !SAVE_KEYS.includes(key))) throw new Error('Backup contains no saved categories or has unknown storage keys.');
  const data = {};
  for (const key of keys) {
    const index = SAVE_KEYS.indexOf(key), raw = value.data[key], clean = validators[index](raw);
    if (!clean || (index !== 0 && !equal(raw, clean))) throw new Error(`${SAVE_LABELS[index]} is invalid; nothing has been imported.`);
    data[key] = clean;
  }
  return { format: 'pdcf-save', version: 1, data };
}

export function exportBackup(storage) {
  const data = {};
  for (const key of SAVE_KEYS) {
    const raw = storage.getItem(key);
    if (raw !== null) {
      if (new TextEncoder().encode(raw).length > BACKUP_LIMIT) throw new Error('Saved data exceeds the backup limit; the original data is unchanged.');
      try { data[key] = JSON.parse(raw); } catch { throw new Error('A saved category is damaged. Nothing was changed; keep this browser’s original data.'); }
    }
  }
  if (!Object.keys(data).length) return null;
  return parseBackup(JSON.stringify({ format: 'pdcf-save', version: 1, data }));
}

export function importBackup(storage, backup, replace = false) {
  const { data } = parseBackup(JSON.stringify(backup));
  const previous = Object.keys(data).map(key => [key, storage.getItem(key)]);
  if (!replace && previous.some(([, value]) => value !== null)) throw new Error('Confirm replacement of existing data before importing.');
  const written = [];
  try {
    for (const [key, old] of previous) {
      storage.setItem(key, JSON.stringify(data[key])); written.push([key, old]);
    }
  } catch {
    let restored = true;
    for (const [key, old] of written.reverse()) {
      try { if (old === null) storage.removeItem(key); else storage.setItem(key, old); } catch { restored = false; }
    }
    throw new Error(restored ? 'Import could not be saved. Previous data was restored; the source backup is unchanged.' : 'Storage failed during import and recovery. Some categories may have changed; keep your backup and this page open.');
  }
  return previous.length;
}
