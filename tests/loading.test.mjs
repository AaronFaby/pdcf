import test from 'node:test';
import assert from 'node:assert/strict';
import { loadImage } from '../assets/runtime/loading.mjs';
import { build } from '../scripts/build.mjs';
import { checkBuild } from '../scripts/check-build.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  const file = join(directory, 'assets/privacy.html'), html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('#storage', '#missing-section'));
  await assert.rejects(checkBuild(directory), /Missing anchor/);
  await writeFile(file, html.replace('href="legal.html"', 'href="missing.html"'));
  await assert.rejects(checkBuild(directory), /Missing local file/);
});
