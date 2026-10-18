import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

test('packaged game starts all stages, plays Training, pauses and keeps legal pages separate', async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();
  const commit=process.env.WORKERS_CI_COMMIT_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const buildLink=page.locator('#build-info a');
  await expect(buildLink).toContainText(`Build ${commit.slice(0,7)}`);await expect(buildLink).toHaveAttribute('href',`https://github.com/AaronFaby/pdcf/commit/${commit}`);
  await page.setViewportSize({width:390,height:844});await buildLink.scrollIntoViewIfNeeded();
  const bounds=await buildLink.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  await page.setViewportSize({width:1280,height:720});
  for(const stage of ['ink-harbor','silverscreen-theater','moonlight-midway','midnight-junction']) {
    await page.locator('[data-mode="training"]').click();await page.locator(`[data-stage="${stage}"]`).click();await page.locator('#start-button').click();
    await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#timer')).toHaveText('∞');
    await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
    await page.keyboard.press('Escape');await expect(page.locator('#pause-dialog')).toBeVisible();
    const popupPromise=page.waitForEvent('popup');await page.locator('#resume-button').click();await page.locator('#site-footer a[href="assets/privacy.html"]').click();
    const popup=await popupPromise;await expect(popup.locator('h1')).toHaveText('Privacy policy.');await popup.close();
    await expect(page.locator('#game')).toBeVisible();
    if(await page.locator('#pause-dialog').isVisible())await page.locator('#resume-button').click();
    await page.locator('#back-button').click();
  }
  await page.goto('/assets/legal.html');await page.getByRole('link',{name:'Character references',exact:true}).click();await expect(page).toHaveURL(/#characters$/);
  await expect(page.locator('#characters table tbody tr')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('loading progress prevents early starts, and a failed cel retries only missing artwork', async ({ page }) => {
  let broken=true;const requests=new Map();
  await page.route('**/assets/cels/*.svg',async route=>{const url=route.request().url();requests.set(url,(requests.get(url)||0)+1);if(broken&&url.endsWith('minnie.svg'))await route.abort();else await route.continue();});
  await page.goto('/');await expect(page.locator('#retry-art')).toBeVisible();await expect(page.locator('#start-button')).toBeDisabled();await expect(page.locator('#art-status')).toContainText('Minnie animation');
  await page.locator('[data-mode="training"]').click();await page.locator('[data-fighter="betty"]').click();await page.locator('[data-stage="moonlight-midway"]').click();
  broken=false;await page.locator('#retry-art').click();await expect(page.locator('#start-button')).toBeEnabled();await expect(page.locator('#retry-art')).toBeHidden();
  await page.locator('#start-button').click();await expect(page.locator('#name-one')).toHaveText('BETTY BOOP',{ignoreCase:true});await expect(page.locator('#arena-stage')).toHaveText('MOONLIGHT MIDWAY');
  for(const[url,count]of requests)expect(count,url).toBe(url.endsWith('minnie.svg')?2:1);
});

test('stage failure has playable scenery and recovers during a match without resetting Training', async ({ page }) => {
  let broken=true;
  await page.route('**/assets/ink-harbor.png',route=>broken?route.abort():route.continue());
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();await expect(page.locator('#art-status')).toContainText('Ink Harbor painting');
  await expect(page.locator('[data-stage="ink-harbor"] img')).not.toHaveAttribute('src');
  await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();await expect(page.locator('#arena-art-notice')).toBeVisible();
  await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  broken=false;await page.locator('#arena-art-retry').click();await expect(page.locator('#arena-art-notice')).toBeHidden();await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  await expect.poll(()=>page.locator('[data-stage="ink-harbor"] img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#timer')).toHaveText('∞');
});

test('a delayed image reports progress and keeps controller/keyboard start locked until ready', async ({ page }) => {
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.addInitScript(()=>{window.releaseTestPad={index:0,id:'Release-test pad',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.releaseTestPad],configurable:true});});
  await page.route('**/assets/ink-harbor.png',async route=>{await gate;await route.continue();});
  await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('#asset-progress')).toBeVisible();await expect(page.locator('#art-status')).toContainText('Loading artwork:');await expect(page.locator('#start-button')).toBeDisabled();
  await expect(page.locator('#asset-progress')).toHaveAttribute('value','9');
  await expect(page.locator('#controller-status')).toContainText('CONTROLLER READY');
  await page.evaluate(async()=>{window.releaseTestPad.buttons[9]={pressed:true,value:1};await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  await expect(page.locator('#game')).toBeHidden();await page.keyboard.press('Enter');await expect(page.locator('#game')).toBeHidden();
  await page.evaluate(()=>{window.releaseTestPad.buttons[9]={pressed:false,value:0};});
  release();await expect(page.locator('#start-button')).toBeEnabled();await expect(page.locator('#asset-progress')).toBeHidden();
});

test('blocked fonts and failed audio leave play available; audio can recover', async ({ page }) => {
  let broken=true;
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.route('**/assets/audio/*.wav',route=>broken?route.abort():route.continue());
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();await page.locator('#settings-button').click();await page.locator('#enable-audio').click();await expect(page.locator('#audio-status')).toContainText('could not start');
  broken=false;await page.locator('#enable-audio').click();await expect(page.locator('#audio-status')).toContainText('Original 32-bar');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();await expect(page.locator('#game')).toBeVisible();
});

test('animation reel has progress and can retry a failed fighter', async ({ page }) => {
  let broken=true;await page.route('**/assets/cels/felix.svg',route=>broken?route.abort():route.continue());
  await page.goto('/animation-reel.html');await expect(page.locator('#reel-retry')).toBeVisible();broken=false;await page.locator('#reel-retry').click();await expect(page.locator('#reel-status')).toBeHidden();await expect(page.locator('#reel-cast canvas')).toHaveCount(6);
});

test('a stalled audio output reports failure, keeps combat usable and retries from a new gesture', async ({ page }) => {
  await page.addInitScript(() => {
    const resume = AudioContext.prototype.resume;
    window.stallAudioOutput = true;
    AudioContext.prototype.resume = function () { return window.stallAudioOutput ? new Promise(() => {}) : resume.call(this); };
  });
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#settings-button').click();await page.locator('#enable-audio').click();
  await expect(page.locator('#audio-status')).toContainText('could not start',{timeout:10000});
  await page.getByRole('button',{name:'Close options',exact:true}).click();
  await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();
  await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  await page.keyboard.press('Escape');await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.evaluate(()=>{window.stallAudioOutput=false;});
  await page.locator('#resume-button').click();
  await expect(page.locator('#audio-unlock')).toBeHidden();
  await page.locator('#settings-button').click();await expect(page.locator('#audio-status')).toContainText('Original 32-bar');
});

test('complete virtual-controller and Arcade regression matrix', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/controller-simulator.html');await page.getByRole('button',{name:'Run controller checks',exact:true}).click();
  await expect(page.locator('#checks')).toContainText('ALL CONTROLLER CHECKS PASSED',{timeout:60000});
  expect((await page.locator('#checks').textContent()).split('\n').filter(line=>line.startsWith('PASS '))).toHaveLength(24);
});

test('all 24 fighter/stage combinations produce a frame-timing report', async ({ page },testInfo) => {
  test.setTimeout(150000);
  await page.goto('http://127.0.0.1:4173/tests/browser/performance.html');await expect(page.locator('#run')).toBeEnabled();await page.locator('#run').click();
  await expect(page.locator('#report')).toHaveAttribute('data-complete','true',{timeout:120000});
  const report=JSON.parse(await page.locator('#report').textContent());expect(report.results).toHaveLength(24);
  for(const result of report.results){expect(result.samples).toBeGreaterThan(20);expect(result.callbackMs.p95).toBeGreaterThanOrEqual(0);}
  const file=testInfo.outputPath('performance.json');await writeFile(file,JSON.stringify(report,null,2));
  await testInfo.attach('performance.json',{path:file,contentType:'application/json'});
});
