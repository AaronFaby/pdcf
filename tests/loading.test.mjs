import test from 'node:test';
import assert from 'node:assert/strict';
import { loadImage } from '../assets/runtime/loading.mjs';
import { build, SOURCE, ASSET_FILES, ROOT_FILES } from '../scripts/build.mjs';
import { execFileSync } from 'node:child_process';
import { checkBuild } from '../scripts/check-build.mjs';
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

test('image requests decode, reject empty/broken/stalled images, and can retry without late completion', async t => {
  const OriginalImage = globalThis.Image;
  let mode = 'success', finish;
  globalThis.Image = class {
    naturalWidth = 60; naturalHeight = 80;
    decode() {
      if (mode === 'error') return Promise.reject(new Error('Bad image'));
      if (mode === 'empty') { this.naturalWidth = 0; return Promise.resolve(); }
      if (mode === 'stalled') return new Promise(resolve => { finish = resolve; });
      return Promise.resolve();
    }
  };
  t.after(() => { globalThis.Image = OriginalImage; });
  assert.equal((await loadImage('drawing.svg')).src, 'drawing.svg');
  mode = 'error'; await assert.rejects(loadImage('bad.svg'), /Bad image/);
  mode = 'empty'; await assert.rejects(loadImage('empty.svg'), /empty/);
  mode = 'stalled'; await assert.rejects(loadImage('slow.svg', 5), /timed out/);
  mode = 'success'; const retry = await loadImage('slow.svg'); finish(); assert.equal(retry.naturalWidth, 60);
});

test('cel retry keeps successful drawings and concurrent callers share pending loads', async t => {
  const OriginalImage = globalThis.Image, originalDocument = globalThis.document, requests = new Map();
  let broken = true;
  globalThis.Image = class {
    naturalWidth = 60; naturalHeight = 80;
    async decode() { requests.set(this.src, (requests.get(this.src) || 0) + 1); if (broken && this.src.endsWith('minnie.svg')) throw new Error('Unavailable'); }
  };
  const pixels = new Uint8ClampedArray(60 * 80 * 4);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) pixels[((row * 10 + 2) * 60 + col * 10 + 2) * 4 + 3] = 255;
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) }) };
  t.after(() => { globalThis.Image = OriginalImage; globalThis.document = originalDocument; });
  const { loadCels } = await import('../cels.mjs?loading-test');
  const progress = [];
  const first = await Promise.allSettled([loadCels((done,total) => progress.push([done,total])), loadCels()]);
  assert.ok(first.every(result => result.status === 'rejected')); assert.equal(progress.length, 6);
  assert.ok([...requests.values()].every(count => count === 1));
  broken = false; await loadCels();
  for (const [url,count] of requests) assert.equal(count, url.endsWith('minnie.svg') ? 2 : 1);
});

test('release build includes runtime/notices, excludes development files, and rejects broken local links/anchors', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pdcf-build-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await build(directory); const checked = await checkBuild(directory);
  assert.ok(checked.files > 20); assert.ok(checked.references > 30);
  const index = await readFile(join(directory, 'index.html'), 'utf8');
  assert.match(index, /id="build-info">(?:<a href="https:\/\/github.com\/AaronFaby\/pdcf\/commit\/[a-f0-9]{40}"|Unversioned build)/i);
  await writeFile(join(directory, 'index.html'), index.replace(/id="build-info">[\s\S]*?<\/p>/, 'id="build-info">Local development</p>'));
  await assert.rejects(checkBuild(directory), /Missing build identity/);
  await writeFile(join(directory, 'index.html'), index);
  const file = join(directory, 'assets/privacy.html'), html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('#storage', '#missing-section'));
  await assert.rejects(checkBuild(directory), /Missing anchor/);
  await writeFile(file, html.replace('href="legal.html"', 'href="missing.html"'));
  await assert.rejects(checkBuild(directory), /Missing local file/);
  await writeFile(file, html);
  const appFile = join(directory, 'app.mjs'), app = await readFile(appFile, 'utf8');
  for (const suffix of ["\nimport('./assets/runtime/missing.mjs');", "\nimport('/assets/runtime/missing.mjs');"]) {
    await writeFile(appFile, app + suffix); await assert.rejects(checkBuild(directory), /Missing local file/);
  }
  await writeFile(appFile, app);
  await rm(join(directory, 'assets/audio/hit.wav'));
  await assert.rejects(checkBuild(directory), /missing production files/);
});

test('build copies only the production manifest and checker rejects unexpected nested assets', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pdcf-manifest-'));
  const stray = await mkdtemp(join(SOURCE, 'assets', 'qa-untracked-'));
  t.after(() => Promise.all([rm(directory, { recursive: true, force: true }), rm(stray, { recursive: true, force: true })]));
  await writeFile(join(stray, '.DS_Store'), 'private metadata');
  await writeFile(join(stray, 'accidental.txt'), 'not a production asset');
  await build(directory);
  assert.equal((await checkBuild(directory)).files, ROOT_FILES.length + ASSET_FILES.length);
  await assert.rejects(stat(join(directory, 'assets', basename(stray))));
  await writeFile(join(directory, 'assets/.DS_Store'), 'stray');
  await assert.rejects(checkBuild(directory), /Unexpected or missing production files/);
});

test('build modules can be imported by node -e without an argv entry', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', "import('./scripts/check-build.mjs')"], { cwd: SOURCE }));
});

test('build label uses the Cloudflare revision, handles missing Git and rejects malformed metadata', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pdcf-version-test-'));
  const original = process.env.WORKERS_CI_COMMIT_SHA, originalPath = process.env.PATH;
  t.after(async () => {
    if (original === undefined) delete process.env.WORKERS_CI_COMMIT_SHA; else process.env.WORKERS_CI_COMMIT_SHA = original;
    if (originalPath === undefined) delete process.env.PATH; else process.env.PATH = originalPath;
    await rm(directory, { recursive: true, force: true });
  });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SOURCE, encoding: 'utf8' }).trim();
  process.env.WORKERS_CI_COMMIT_SHA = head;
  await build(directory);
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  assert.ok(html.includes(`href="https://github.com/AaronFaby/pdcf/commit/${head}"`));
  process.env.WORKERS_CI_COMMIT_SHA = 'a'.repeat(40);
  await assert.rejects(build(directory), /does not match the checkout/);
  assert.equal(await readFile(join(directory, 'index.html'), 'utf8'), html);
  process.env.PATH = '';
  await build(directory);
  assert.ok((await readFile(join(directory, 'index.html'), 'utf8')).includes('Build aaaaaaa'));
  delete process.env.WORKERS_CI_COMMIT_SHA;
  await build(directory);
  const unversioned = await readFile(join(directory, 'index.html'), 'utf8');
  assert.ok(unversioned.includes('id="build-info">Unversioned build</p>'));
  await checkBuild(directory);
  process.env.WORKERS_CI_COMMIT_SHA = '"><script>bad</script>';
  await assert.rejects(build(directory), /Invalid build commit SHA/);
  assert.equal(await readFile(join(directory, 'index.html'), 'utf8'), unversioned);
});
