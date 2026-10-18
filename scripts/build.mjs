import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT_FILES = ['index.html', 'animation-reel.html', 'style.css', 'app.mjs', 'art.mjs', 'cels.mjs', 'engine.mjs', 'reel.mjs'];
export const SOURCE = fileURLToPath(new URL('../', import.meta.url));
export async function build(destination = resolve(SOURCE, 'dist')) {
  if (resolve(destination) === resolve(SOURCE)) throw new Error('Build destination cannot replace the source directory');
  let commit = process.env.WORKERS_CI_COMMIT_SHA, modified = false;
  const gitOptions = { cwd: SOURCE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    commit ||= execFileSync('git', ['rev-parse', 'HEAD'], gitOptions).trim();
    modified = !!execFileSync('git', ['status', '--porcelain'], gitOptions).trim();
  } catch { /* Git metadata is optional for source archives. */ }
  if (commit && !/^[a-f0-9]{40}$/i.test(commit)) throw new Error('Invalid build commit SHA');
  const label = commit ? `<a href="https://github.com/AaronFaby/pdcf/commit/${commit}" target="_blank" rel="noopener noreferrer" title="Git commit ${commit}">Build ${commit.slice(0, 7)}<span class="sr-only"> (opens in a new tab)</span></a>${modified ? ' · local changes' : ''}` : 'Unversioned build';
  const html = await readFile(resolve(SOURCE, 'index.html'), 'utf8');
  const marker = '<!-- BUILD_INFO -->Local development<!-- /BUILD_INFO -->';
  if (!html.includes(marker)) throw new Error('Missing build label placeholder');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const name of [...ROOT_FILES, 'assets']) await cp(resolve(SOURCE, name), resolve(destination, name), { recursive: true });
  await writeFile(resolve(destination, 'index.html'), html.replace(marker, label));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
  console.log('Static game built in dist/');
}
