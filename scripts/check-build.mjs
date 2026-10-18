import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_FILES, SOURCE } from './build.mjs';
import { ROSTER } from '../engine.mjs';
import { STAGES } from '../assets/runtime/stages.mjs';

export async function checkBuild(directory = resolve(SOURCE, 'dist')) {
  const root = resolve(directory), files = [], pages = new Map();
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = resolve(folder, entry.name);
      if (entry.isDirectory()) await walk(file); else files.push(file);
    }
  }
  assert.deepEqual((await readdir(root)).sort(), [...ROOT_FILES, 'assets'].sort(), 'Unexpected files in the production build');
  await walk(root);
  const source = new Map(await Promise.all(files.filter(file => ['.html', '.mjs', '.css'].includes(extname(file))).map(async file => [file, await readFile(file, 'utf8')])));
  const index = source.get(resolve(root, 'index.html'));
  assert.doesNotMatch(index, /<!-- BUILD_INFO -->/, 'Build label was not stamped; use npm run build');
  assert.match(index, /id="build-info">(?:<a[^>]+>Build [a-f0-9]{7}|Unversioned build)/i, 'Missing build identity');
  for (const [file, text] of source) if (extname(file) === '.html') {
    const ids = [...text.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, `Duplicate HTML ID in ${file}`); pages.set(file, new Set(ids));
  }
  let checked = 0;
  async function check(file, reference) {
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(reference)) return;
    const [path, fragment] = reference.split('#'), clean = decodeURIComponent(path.split('?')[0]);
    let target = !clean ? file : clean.startsWith('/') ? resolve(root, '.' + clean) : resolve(dirname(file), clean);
    assert.ok(!relative(root, target).startsWith('..'), `Link leaves the build: ${reference}`);
    let info;
    try { info = await stat(target); } catch { throw new Error(`Missing local file: ${relative(root, file)} → ${reference}`); }
    if (info.isDirectory()) target = resolve(target, 'index.html');
    assert.ok((await stat(target)).isFile(), reference);
    if (fragment && pages.has(target)) assert.ok(pages.get(target).has(decodeURIComponent(fragment)), `Missing anchor: ${relative(root, file)} → ${reference}`);
    checked++;
  }
  for (const [file, text] of source) {
    const expressions = extname(file) === '.html' ? [/\b(?:href|src)=["']([^"']+)["']/g] : extname(file) === '.mjs' ? [/(?:from\s+|import\s*)["'](\.[^"']+)["']/g] : [/url\(\s*((?:"[^"]*"|'[^']*'|[^)\s]+))\s*\)/g];
    for (const expression of expressions) for (const match of text.matchAll(expression)) await check(file, match[1].replace(/^['"]|['"]$/g, ''));
  }
  for (const name of ['privacy', 'legal']) assert.doesNotMatch(source.get(resolve(root, `assets/${name}.html`)) || '', /<script|mailto:/i, 'Notices must remain script-free with no published email');
  for (const fighter of ROSTER) await check(resolve(root, 'index.html'), `assets/cels/${fighter.id}.svg`);
  for (const stage of STAGES) {
    await check(resolve(root, 'index.html'), stage.image);
    await check(resolve(root, 'index.html'), `assets/audio/${stage.id}.wav`);
  }
  return { files: files.length, references: checked };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log('Build and local links verified:', await checkBuild());
