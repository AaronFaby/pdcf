import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { SOURCE } from './build.mjs';

// Reuse the game's approved atlases, backdrop and self-hosted fonts for sharing artwork.
const server = spawn(process.execPath, ['server.mjs'], { cwd: SOURCE, env: { ...process.env, PDCF_PORT: '4175', PDCF_ROOT: SOURCE }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview server exited: ${code}`))); });
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4175/assets/transfer.html');
  const png = await page.evaluate(async () => {
    const { loadCels } = await import('/cels.mjs');
    const { drawBackdrop, drawFighter } = await import('/art.mjs');
    const { ROSTER } = await import('/engine.mjs');
    await Promise.all([loadCels(), document.fonts.load('900 80px "Barlow Condensed"'), document.fonts.load('500 22px "Barlow Condensed"'), document.fonts.load('700 14px "DM Sans"')]);
    const image = new Image(); image.src = '/assets/ink-harbor.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const c = canvas.getContext('2d'); drawBackdrop(c, image);
    const wash = c.createLinearGradient(0, 0, 0, 440); wash.addColorStop(0, '#eee7d6'); wash.addColorStop(.58, '#eee7d6'); wash.addColorStop(1, '#eee7d600');
    c.fillStyle = wash; c.fillRect(0, 0, 1200, 575);
    c.fillStyle = '#b6442b'; c.font = '700 14px "DM Sans"'; c.fillText('AN INDEPENDENT GAME · FREE DESKTOP BROWSER BETA', 54, 53);
    c.fillStyle = '#25251f'; c.font = '900 69px "Barlow Condensed"'; c.fillText('PUBLIC DOMAIN', 50, 126);
    c.font = '900 104px "Barlow Condensed"'; c.fillText('CARTOON FIGHTERS', 48, 223);
    const positions = [110, 305, 495, 695, 885, 1080];
    ROSTER.forEach((fighter, i) => drawFighter(c, { ...fighter, face: i < 3 ? 1 : -1 }, { x: positions[i], y: 535, scale: .8, animation: 'victory', progress: .5 }));
    c.fillStyle = '#eee7d6'; c.fillRect(0, 543, 1200, 33);
    c.fillStyle = '#25251f'; c.textAlign = 'center'; c.font = '500 20px "Barlow Condensed"';
    ROSTER.forEach((fighter, i) => c.fillText(fighter.short.toUpperCase(), positions[i], 566));
    c.fillStyle = '#25251f'; c.fillRect(0, 576, 1200, 54);
    c.fillStyle = '#eee7d6'; c.textAlign = 'left'; c.font = '900 32px "Barlow Condensed"'; c.fillText('PDCF.DEV', 52, 614);
    c.font = '500 19px "Barlow Condensed"'; c.fillText('ARCADE · TRAINING · LOCAL TWO-PLAYER', 273, 610);
    c.font = '700 11px "DM Sans"'; c.textAlign = 'right'; c.fillText('EARLY CHARACTER VERSIONS · NO STUDIO AFFILIATION', 1150, 609);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const data = Buffer.from(png, 'base64');
  assert.equal(data.readUInt32BE(16), 1200); assert.equal(data.readUInt32BE(20), 630); assert.ok(data.length > 10000);
  await writeFile(new URL('../assets/social-card.png', import.meta.url), data);
  console.log(`Social card: 1200 × 630, ${data.length} bytes`);
} finally { await browser?.close(); server.kill(); }
