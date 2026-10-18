import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
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
  test.setTimeout(150000);
  await page.goto('http://127.0.0.1:4173/controller-simulator.html');await page.getByRole('button',{name:'Run controller checks',exact:true}).click();
  const output=page.locator('#checks');
  await expect(output).toContainText(/ALL CONTROLLER CHECKS PASSED|FAIL /,{timeout:120000});
  const result=await output.textContent();expect(result).not.toContain('FAIL ');
  expect(result.split('\n').filter(line=>line.startsWith('PASS '))).toHaveLength(28);
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

test('visual preferences follow system changes, support keyboard choices and survive reload', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');await expect(page.locator('.paper-grain')).toBeHidden();
  await page.locator('#settings-button').click();await expect(page.locator('#visual-shake')).toBeDisabled();
  await page.locator('#visual-motion').press('Enter');await page.locator('#visual-motion').press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-motion','full');
  for(const name of ['shake','film','backgrounds']){await page.locator('#visual-'+name).click();await expect(page.locator('#visual-'+name)).toHaveAttribute('aria-pressed','false');}
  await page.reload();await page.locator('#settings-button').click();
  await expect(page.locator('#visual-motion')).toHaveText('MOTION: FULL');await expect(page.locator('#visual-backgrounds')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.paper-grain')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pdcf-visuals-v1')))).toEqual({motion:'full',shake:false,film:false,backgrounds:false});
  await page.locator('#visual-motion').click();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('html')).toHaveAttribute('data-motion','full');
  await expect(page.locator('#visual-shake')).toBeEnabled();await expect(page.locator('#visual-shake')).toHaveAttribute('aria-pressed','false');
  await page.locator('#visual-film').press('Enter');await expect(page.locator('.paper-grain')).toBeVisible();
});

test('corrupt or blocked visual storage falls back safely and changes still apply',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{if(location.search.includes('storage-blocked'))Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked');}});else localStorage.setItem('pdcf-visuals-v1','{broken');});
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();await page.locator('#settings-button').click();
  await expect(page.locator('#visual-motion')).toHaveText('MOTION: FOLLOW SYSTEM');await page.locator('#visual-motion').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pdcf-visuals-v1')).motion)).toBe('reduced');
  await page.goto('/?storage-blocked');await expect(page.locator('#start-button')).toBeEnabled();await page.locator('#settings-button').click();await page.locator('#visual-motion').click();
  await expect(page.locator('#visual-storage')).toContainText('could not be saved');await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();
  await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
});

test('reduced effects preserve every mode and readable HUD/canvas proportions at narrow sizes',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('pdcf-visuals-v1',JSON.stringify({motion:'reduced',shake:false,film:false,backgrounds:false})));
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();
  for(const mode of ['cpu','local','training','arcade']){
    await page.locator(`[data-mode="${mode}"]`).click();await page.locator('#start-button').click();
    if(mode==='arcade')await page.locator('#arcade-play').click();
    await expect(page.locator('#game')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');
    for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:800,height:500}]){
      await page.setViewportSize(viewport);
      const canvas=await page.locator('#arena').boundingBox(),hud=await page.locator('.fight-hud').boundingBox();
      expect(canvas.width/canvas.height).toBeCloseTo(16/9,2);expect(hud.y+hud.height).toBeLessThanOrEqual(canvas.y+1);
      expect(hud.x).toBeGreaterThanOrEqual(0);expect(hud.x+hud.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.locator('.meter-label').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(10);
      await expect.poll(()=>page.locator('#hp-one').evaluate(el=>el.textContent===document.getElementById('health-one').getAttribute('aria-valuenow'))).toBe(true);
      await expect(page.locator('#meter-one')).toHaveAttribute('role','meter');
    }
    await page.keyboard.press('Escape');await page.locator('#display-pause').click();await page.locator('#visual-motion').click();
    await page.getByRole('button',{name:'Close options',exact:true}).click();await expect(page.locator('#pause-dialog')).toBeVisible();
    await page.locator('#resume-button').click();await page.locator('#back-button').click();
    await page.setViewportSize({width:1280,height:720});
    // Restore the reduced profile through the same player-facing controls.
    await page.locator('#settings-button').click();
    for(let i=0;i<3&&await page.locator('#visual-motion').textContent()!=='MOTION: REDUCED';i++)await page.locator('#visual-motion').click();
    await expect(page.locator('#visual-motion')).toHaveText('MOTION: REDUCED');
    await page.getByRole('button',{name:'Close options',exact:true}).click();
  }
});

test('fullscreen enters from Options, preserves focus/aspect and pauses safely on external exit',async({page},testInfo)=>{
  await page.goto('/');await expect(page.locator('#start-button')).toBeEnabled();await page.locator('#settings-button').click();
  const supported=await page.evaluate(()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen&&document.exitFullscreen));
  if(!supported){await expect(page.locator('#fullscreen-button')).toBeDisabled();await expect(page.locator('#fullscreen-status')).toContainText('Windowed play');testInfo.annotations.push({type:'fullscreen',description:'Native fullscreen unavailable; windowed fallback verified.'});return;}
  await page.locator('#fullscreen-button').press('Enter');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await expect(page.locator('#settings-dialog')).toBeVisible();await expect(page.locator('#fullscreen-button')).toBeFocused();
  await expect(page.locator('#fullscreen-button')).toHaveText('EXIT FULLSCREEN');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();
  const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  const canvas=await page.locator('#arena').boundingBox();expect(canvas.width/canvas.height).toBeCloseTo(16/9,2);
  const wrap=await page.locator('.arena-wrap').boundingBox();expect(wrap.y).toBeGreaterThanOrEqual(0);expect(wrap.y+wrap.height).toBeLessThanOrEqual(viewport.height);
  expect(wrap.x).toBeGreaterThanOrEqual(0);expect(wrap.x+wrap.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.down('KeyD');await page.evaluate(()=>document.exitFullscreen());await page.keyboard.up('KeyD');
  await expect(page.locator('#pause-dialog')).toBeVisible();await expect(page.locator('#pause-message')).toContainText('Fullscreen ended');
  await page.locator('#display-pause').click();await page.locator('#fullscreen-button').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await page.getByRole('button',{name:'Close options',exact:true}).click();await expect(page.locator('#pause-dialog')).toBeVisible();await page.locator('#display-pause').click();
  await page.locator('#fullscreen-button').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  await page.getByRole('button',{name:'Close options',exact:true}).click();await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.locator('#resume-button').click();await expect(page.locator('#arena')).toBeFocused();
  await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
});

test('fullscreen rejection and unsupported browsers retain usable settings and windowed play',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:!location.search.includes('no-fullscreen')});
    Element.prototype.requestFullscreen=()=>location.search.includes('fullscreen-noop')?Promise.resolve():Promise.reject(Error('Test: fullscreen denied'));
    document.exitFullscreen=()=>Promise.resolve();
  });
  await page.goto('/');await page.locator('#settings-button').click();await page.locator('#fullscreen-button').click();
  await expect(page.locator('#fullscreen-status')).toContainText('could not start');await expect(page.locator('#fullscreen-button')).toBeEnabled();await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.goto('/?fullscreen-noop');await page.locator('#settings-button').click();await page.locator('#fullscreen-button').click();
  await expect(page.locator('#fullscreen-status')).toContainText('could not start');await expect(page.locator('#fullscreen-button')).toBeEnabled();
  await page.goto('/?no-fullscreen');await page.locator('#settings-button').click();await expect(page.locator('#fullscreen-button')).toBeDisabled();
  await page.locator('#visual-motion').click();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await expect(page.locator('#start-button')).toBeEnabled();await page.locator('#start-button').click();await expect(page.locator('#game')).toBeVisible();
});

test('in-fight buttons return keyboard control to both players and Training reset is a P1 one-shot',async({page})=>{
  await page.goto('/');await page.locator('[data-mode="local"]').click();await page.locator('#start-button').click();
  await expect(page.locator('#timer')).not.toHaveText('60',{timeout:12000});
  await page.locator('#sound-button').click();await expect(page.locator('#arena')).toBeFocused();
  const enabled=await page.locator('#sound-button').getAttribute('aria-pressed');await page.keyboard.press('Enter');await page.keyboard.press('Space');
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed',enabled);
  await page.keyboard.down('KeyD');await page.keyboard.down('ArrowLeft');
  await expect.poll(async()=>{await page.keyboard.press('KeyF');return page.locator('#health-two').getAttribute('aria-valuenow');},{timeout:12000}).not.toBe('100');
  await page.keyboard.up('KeyD');await page.keyboard.up('ArrowLeft');
  await page.locator('#sound-button').click();await page.keyboard.down('ArrowLeft');
  await expect.poll(async()=>{await page.keyboard.press('KeyJ');return page.locator('#health-one').getAttribute('aria-valuenow');},{timeout:12000}).not.toBe('100');await page.keyboard.up('ArrowLeft');
  await page.locator('#back-button').click();await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();
  await page.keyboard.down('Backspace');await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  await page.keyboard.down('Backspace');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  await page.keyboard.press('Delete');await expect(page.locator('#practice-hit')).toContainText('PUNCH');await page.keyboard.up('Backspace');
  await page.keyboard.press('Backspace');await expect(page.locator('#practice-hit')).toHaveText('—');
});

test('result-screen audio resumes after focus and visibility restoration',async({page})=>{
  const fixture=await readFile(new URL('../fixtures/arcade-engine.mjs',import.meta.url),'utf8');
  await page.route('**/test-engine.mjs',route=>route.fulfill({contentType:'text/javascript',body:fixture.replaceAll('../../engine.mjs','/engine.mjs')}));
  await page.route('**/app.mjs',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("from './engine.mjs'","from './test-engine.mjs'")+ '\nwindow.issueAudio = audio;'});
  });
  await page.goto('/');await page.locator('#settings-button').click();await page.locator('#enable-audio').click();await expect(page.locator('#audio-status')).toContainText('Original 32-bar');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await page.locator('#start-button').click();await page.evaluate(()=>{window.cpuTestResult=0;});
  await expect(page.locator('#result-dialog')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect(await page.evaluate(()=>window.issueAudio.source)).toBeNull();
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));expect(await page.evaluate(()=>window.issueAudio.scene==='menu'&&!!window.issueAudio.source)).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.evaluate(()=>window.issueAudio.source)).toBeNull();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.evaluate(()=>window.issueAudio.scene==='menu'&&!!window.issueAudio.source)).toBe(true);await expect(page.locator('#result-dialog')).toBeVisible();
});

test('a stalled score fetch reports loading, expires without blocking combat, and retries',async({page})=>{
  await page.addInitScript(()=>{
    const native=window.fetch;window.stallScore=true;
    window.fetch=(url,options)=>window.stallScore&&String(url).endsWith('/audio/ink-harbor.wav')?new Promise(()=>{}):native(url,options);
  });
  await page.goto('/');await page.locator('[data-mode="training"]').click();await page.locator('#start-button').click();
  await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
  await page.locator('#settings-button').click();await expect(page.locator('#audio-status')).toHaveText('Loading sound…');
  await expect(page.locator('#audio-status')).toContainText('could not start',{timeout:20000});
  await page.evaluate(()=>{window.stallScore=false;});await page.locator('#enable-audio').click();await expect(page.locator('#audio-status')).toContainText('Original 32-bar');
  await page.getByRole('button',{name:'Close options',exact:true}).click();await page.keyboard.press('Backspace');await page.keyboard.press('KeyF');await expect(page.locator('#practice-hit')).toContainText('PUNCH');
});
