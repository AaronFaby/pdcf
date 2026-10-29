import { BACKUP_LIMIT, SAVE_KEYS, SAVE_LABELS, exportBackup, parseBackup, importBackup } from './save-transfer.mjs';

const $ = id => document.getElementById(id);
const labels = backup => Object.keys(backup.data).map(key => SAVE_LABELS[SAVE_KEYS.indexOf(key)]).join(' · ');
let backup, selection = 0;
const legacy = ['pdcf.aaronfaby.com', 'www.pdcf.dev'].includes(location.hostname);
$('import-save').disabled = legacy; $('replace-save').disabled = legacy;
$('transfer-origin').textContent = `This page reads and writes saved data for ${location.origin} only.`;
function refresh() {
  try {
    const current = exportBackup(localStorage);
    $('export-save').disabled = !current;
    $('export-summary').textContent = current ? `Saved here: ${labels(current)}.` : 'No game data is saved at this address in this browser/profile. Check the other address above if you played there.';
  } catch (error) { $('export-save').disabled = true; $('export-summary').textContent = `Backup unavailable: ${error.message}`; }
}
refresh();
$('export-save').addEventListener('click', () => {
  try {
    const current = exportBackup(localStorage);
    if (!current) throw new Error('No saved data is available here.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `pdcf-backup-${location.hostname}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('transfer-status').textContent = 'Backup downloaded. The saved data at this address is unchanged.';
  } catch (error) { $('transfer-status').textContent = `Backup unavailable: ${error.message}`; }
});
function ready() { $('import-button').disabled = legacy || !backup || !$('replace-save').checked; }
$('replace-save').addEventListener('change', ready);
$('import-save').addEventListener('change', async event => {
  const attempt = ++selection, file = event.target.files[0];
  backup = null; $('replace-save').checked = false; ready(); $('transfer-status').textContent = '';
  $('import-preview').textContent = 'No backup selected.';
  if (!file) return;
  try {
    if (file.size > BACKUP_LIMIT) throw new Error('Backup exceeds the 32 KB limit.');
    const parsed = parseBackup(await file.text());
    if (attempt !== selection) return;
    backup = parsed;
    const run = parsed.data['pdcf-arcade-v1'];
    $('import-preview').textContent = `Will import: ${labels(parsed)}.${run ? ` Arcade: ${run.fighter}, ${run.difficulty}, ${run.index}/6 bouts cleared${run.status === 'complete' ? ' — ending unlocked' : ''}.` : ''} Existing listed categories will be replaced.`;
    ready();
  } catch (error) { if (attempt === selection) $('import-preview').textContent = error.message; }
});
$('import-button').addEventListener('click', () => {
  try {
    if (legacy || !backup || !$('replace-save').checked) return;
    const count = importBackup(localStorage, backup, true);
    backup = null; $('replace-save').checked = false; $('import-save').value = ''; ready(); refresh();
    $('transfer-status').textContent = `Imported ${count} saved categories at ${location.origin}. Close other game tabs, then open the game again to load them. The source backup and old site’s data are unchanged.`;
    $('play-after-transfer').href = new URL('../', location.href).href;
  } catch (error) { $('transfer-status').textContent = error.message; }
});
