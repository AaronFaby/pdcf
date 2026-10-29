import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createArcade } from '../../assets/runtime/arcade.mjs';
import { controlSettings, rebind } from '../../assets/runtime/bindings.mjs';
import { SAVE_KEYS } from '../../assets/runtime/save-transfer.mjs';

function data() {
  const run = createArcade('betty', 'hard', () => .3); run.index = 2; run.losses = 1; run.attempts = 3; run.status = 'lost';
  const controls = rebind(controlSettings(), 0, 'keyboard', 'punch', 'KeyQ'); controls.players[0].deadZone = .42;
  return { [SAVE_KEYS[0]]: run, [SAVE_KEYS[1]]: controls, [SAVE_KEYS[2]]: { enabled: false, music: .2, effects: .8 }, [SAVE_KEYS[3]]: { motion: 'reduced', shake: false, film: false, backgrounds: false } };
}

test('packaged SEO metadata, sitemap, social image and utility indexing policies agree', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://pdcf.dev/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://pdcf.dev/');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('#about-game')).toBeVisible();
  await expect(page.locator('#about-game')).toContainText('Multiplayer is local');
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
  expect(graph.map(item => item['@type'])).toEqual(['WebSite', 'VideoGame']);
  expect(graph[1].isAccessibleForFree).toBe(true); expect(graph[1].aggregateRating).toBeUndefined();
  const robots = await request.get('/robots.txt'); expect(robots.status()).toBe(200); expect(await robots.text()).toContain('Sitemap: https://pdcf.dev/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml'); expect(sitemap.status()).toBe(200); expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await page.evaluate(text => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    return { error: !!doc.querySelector('parsererror'), urls: [...doc.querySelectorAll('loc')].map(item => item.textContent) };
  }, await sitemap.text());
  expect(xml.error).toBe(false); expect(xml.urls).toHaveLength(4); expect(new Set(xml.urls).size).toBe(4);
  const image = await request.get('/assets/social-card.png'); expect(image.status()).toBe(200); expect(image.headers()['content-type']).toContain('image/png');
  const pixels = await image.body(); expect(pixels.readUInt32BE(16)).toBe(1200); expect(pixels.readUInt32BE(20)).toBe(630);
  for (const name of ['beta', 'privacy', 'legal']) {
    await page.goto(`/assets/${name}`);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://pdcf.dev/assets/${name}`);
    await expect(page.locator('script')).toHaveCount(0);
  }
  for (const path of ['/animation-reel.html', '/assets/transfer.html']) {
    await page.goto(path); await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,follow');
  }
});

test('a downloaded backup moves all saved categories between origins with explicit replacement and actual Arcade resume', async ({ page, context }) => {
  const saved = data(), source = await context.newPage(), errors = [], uploads = [];
  page.on('pageerror', error => errors.push(error.message)); source.on('pageerror', error => errors.push(error.message));
  context.on('request', request => { if (request.method() !== 'GET') uploads.push(request.url()); });
  await source.goto('http://127.0.0.1:4173/assets/transfer.html');
  await source.evaluate(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('unrelated-private-key', 'do not export'); }, saved);
  await source.reload(); await expect(source.locator('#export-save')).toBeEnabled();
  const downloading = source.waitForEvent('download'); await source.locator('#export-save').click(); const download = await downloading;
  const file = await download.path(), backup = JSON.parse(await readFile(file, 'utf8'));
  expect(backup.data).toEqual(saved); expect(backup.data['unrelated-private-key']).toBeUndefined();
  await expect(source.locator('#transfer-status')).toContainText('unchanged');
  expect(await source.evaluate(() => JSON.parse(localStorage.getItem('pdcf-arcade-v1')))).toEqual(saved[SAVE_KEYS[0]]);
  await page.goto('/assets/transfer.html');
  await page.evaluate(() => { localStorage.setItem('pdcf-audio-v1', JSON.stringify({ enabled: true, music: .45, effects: .7 })); localStorage.setItem('destination-only', 'keep'); });
  const before = await page.evaluate(() => ({ ...localStorage }));
  for (const invalid of ['{broken', JSON.stringify({ format: 'pdcf-save', version: 2, data: saved }), JSON.stringify({ format: 'pdcf-save', version: 1, data: { secret: 'no' } })]) {
    await page.locator('#import-save').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(invalid) });
    await expect(page.locator('#import-preview')).not.toHaveText('No backup selected.');
    await expect(page.locator('#import-button')).toBeDisabled();
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  }
  await page.locator('#import-save').setInputFiles(file);
  await expect(page.locator('#import-preview')).toContainText('2/6 bouts cleared');
  await expect(page.locator('#import-button')).toBeDisabled();
  await page.locator('#replace-save').check(); await page.locator('#import-button').click();
  await expect(page.locator('#transfer-status')).toContainText('Imported 4 saved categories');
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, JSON.parse(localStorage.getItem(key))])), SAVE_KEYS)).toEqual(saved);
  expect(await page.evaluate(() => localStorage.getItem('destination-only'))).toBe('keep');
  await page.goto('/'); await expect(page.locator('#start-button')).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('#arcade-resume')).toBeVisible(); await page.locator('#arcade-resume').click();
  await expect(page.locator('#arcade')).toBeVisible(); await expect(page.locator('#arcade-summary')).toContainText('Betty');
  expect(errors).toEqual([]); expect(uploads).toEqual([]); await source.close();
});

test('legacy recovery remains export-only and handles blocked storage and narrow keyboard access', async ({ page, context }) => {
  await context.route('https://pdcf.aaronfaby.com/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4174${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto('https://pdcf.aaronfaby.com/assets/transfer');
  expect(page.url()).toBe('https://pdcf.aaronfaby.com/assets/transfer');
  await expect(page.locator('#transfer-origin')).toContainText('https://pdcf.aaronfaby.com');
  await expect(page.locator('#import-save')).toBeDisabled(); await expect(page.locator('#import-button')).toBeDisabled();
  await page.evaluate(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value)); }, data());
  await page.reload(); await expect(page.locator('#export-save')).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#export-save').focus(); await expect(page.locator('#export-save')).toBeFocused();
  const downloading = page.waitForEvent('download'); await page.keyboard.press('Enter'); await downloading;
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('Storage blocked'); } }));
  await page.goto('/assets/transfer.html');
  await expect(page.locator('#export-summary')).toContainText('Backup unavailable'); await expect(page.locator('#export-save')).toBeDisabled();
  await page.locator('#import-save').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'pdcf-save', version: 1, data: data() })) });
  await expect(page.locator('#import-preview')).toContainText('Will import:'); await page.locator('#replace-save').check(); await page.locator('#import-button').click();
  await expect(page.locator('#transfer-status')).toContainText('Storage blocked');
});
