import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROSTER } from '../engine.mjs';
import { STAGES } from '../assets/runtime/stages.mjs';
import { CUES } from '../assets/runtime/audio.mjs';

export const ROOT_FILES = ['index.html', 'animation-reel.html', 'style.css', 'app.mjs', 'art.mjs', 'cels.mjs', 'engine.mjs', 'reel.mjs', 'robots.txt', 'sitemap.xml'];
export const ASSET_FILES = [
  'assets/privacy.html', 'assets/legal.html', 'assets/beta.html', 'assets/provenance.md', 'assets/transfer.html', 'assets/favicon.svg', 'assets/social-card.png',
  ...[500, 600, 700, 800, 900].map(weight => `assets/fonts/barlow-condensed-${weight}-latin.woff2`),
  'assets/fonts/dm-sans-400-700-latin.woff2', 'assets/fonts/barlow-condensed-OFL.txt', 'assets/fonts/dm-sans-OFL.txt',
  ...ROSTER.map(f => `assets/cels/${f.id}.svg`), ...STAGES.map(stage => stage.image),
  ...[...STAGES.map(stage => stage.id), ...CUES].map(name => `assets/audio/${name}.wav`),
  ...['arcade', 'audio', 'bindings', 'control-panel', 'controllers', 'loading', 'move-list', 'save-transfer', 'stages', 'training', 'transfer-page', 'visuals'].map(name => `assets/runtime/${name}.mjs`)
];
export const SOURCE = fileURLToPath(new URL('../', import.meta.url));
export async function build(destination = resolve(SOURCE, 'dist')) {
  if (resolve(destination) === resolve(SOURCE)) throw new Error('Build destination cannot replace the source directory');
  let commit = process.env.WORKERS_CI_COMMIT_SHA, modified = false, head;
  const gitOptions = { cwd: SOURCE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], gitOptions).trim();
    modified = !!execFileSync('git', ['status', '--porcelain'], gitOptions).trim();
  } catch { /* Git metadata is optional for source archives. */ }
  commit ||= head;
  if (commit && !/^[a-f0-9]{40}$/i.test(commit)) throw new Error('Invalid build commit SHA');
  if (commit && head && commit.toLowerCase() !== head) throw new Error('Build commit SHA does not match the checkout');
  const label = commit ? `<a href="https://github.com/AaronFaby/pdcf/commit/${commit}" target="_blank" rel="noopener noreferrer" title="Git commit ${commit}">Build ${commit.slice(0, 7)}<span class="sr-only"> (opens in a new tab)</span></a>${modified ? ' · local changes' : ''}` : 'Unversioned build';
  const html = await readFile(resolve(SOURCE, 'index.html'), 'utf8');
  const marker = '<!-- BUILD_INFO -->Local development<!-- /BUILD_INFO -->';
  if (!html.includes(marker)) throw new Error('Missing build label placeholder');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const name of [...ROOT_FILES, ...ASSET_FILES]) {
    await mkdir(dirname(resolve(destination, name)), { recursive: true });
    await cp(resolve(SOURCE, name), resolve(destination, name));
  }
  await writeFile(resolve(destination, 'index.html'), html.replace(marker, label));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
  console.log('Static game built in dist/');
}
