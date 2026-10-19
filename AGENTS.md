# Working on Public Domain Cartoon Fighters

## Project and scope

This is a static browser game using native JavaScript ES modules, Canvas 2D, Web Audio, and the Gamepad API. It has no installed runtime dependencies, bundler, account system, or production backend. Use the existing modules and browser/Node APIs before adding packages or infrastructure.

The current game has six fighters (Mickey, Minnie, Oswald, Felix, Betty, Popeye), four stages (Ink Harbor, Silverscreen Theater, Moonlight Midway, Midnight Junction), Arcade, Training, CPU play, and local two-player. Preserve working modes and controls when extending a milestone. Read `README.md` for player-facing behavior and `assets/provenance.md` for asset sources.

The first desktop beta is `v0.1.0-beta.1`. Keep the visible beta version, package/lockfile version, public limitations and release notes consistent. Keyboard desktop play is the baseline; standard controllers are included for beta testing, with physical hardware, native Safari, listening, human balance and other coverage gaps explicitly identified. Preserve the independent-project notice and exact build footer. Beta feedback goes to public GitHub Issues; add no telemetry, private contact claims or storage keys for feedback.

Live checks observed a hosting-injected Cloudflare Web Analytics/RUM beacon. Preserve its disclosure in the privacy policy and distinguish hosted browser metrics from game telemetry. Information-page sources contain no scripts; do not assert that the deployed DOM has none or claim that hosting analytics are disabled. The full hosting configuration remains outside the verified repository scope.

## Code map

| Path | Owns |
| --- | --- |
| `engine.mjs` | Roster, moves, combat state, CPU difficulty, Training behavior, and round resolution; keep it independent of the DOM and browser globals |
| `app.mjs` | Screens, dialogs, input integration, saved Arcade runs, audio events, and the fixed 120 Hz simulation loop |
| `art.mjs` | Canvas scene, fighters, effects, and animated stage |
| `cels.mjs` | Atlas loading/measurement and pose selection synchronized to combat timing |
| `assets/runtime/loading.mjs` | Bounded image decoding; character/stage retries must keep successful loads and reject late timed-out results |
| `assets/runtime/arcade.mjs` | Ladder generation, bout progression, checkpoint validation, and six original endings |
| `assets/runtime/stages.mjs` | Stage names/assets/music metadata, safe default, and the derived Arcade venue tour; keep it DOM-free |
| `assets/runtime/controllers.mjs` | Standard gamepad input, per-player profiles, assignment/swap/reconnect, neutral arming, and pending input edges |
| `assets/runtime/bindings.mjs` / `control-panel.mjs` | Validated v1 keyboard/button/dead-zone profiles and the remapping UI; keep validation DOM-free |
| `assets/runtime/training.mjs` | DOM-free guided lessons, accepted-outcome checks, binding prompts, and coaching/status text |
| `assets/runtime/move-list.mjs` | Move-list data derived from engine timing/damage and the selected player profile |
| `assets/runtime/audio.mjs` | Audio loading/playback, pause/resume, and validated saved preferences |
| `assets/runtime/visuals.mjs` | DOM-free visual preference validation and system/reduced/full motion resolution |
| `index.html` / `style.css` | Main interface, dialogs, responsive layout, and accessibility markup |
| `assets/privacy.html` / `assets/legal.html` | Script-free public privacy, independence, character-version, and game-use notices; included by the existing asset copy |
| `assets/beta.html` / `docs/beta-release.md` | Script-free public beta limitations/feedback and the prerelease notes; the HTML page belongs in `ASSET_FILES` |
| `scripts/build-cels.mjs` / `scripts/build-audio.mjs` | Sources for the checked-in SVG atlases and WAV assets |
| `controller-simulator.html` | Browser harness for two virtual pads and repeatable flow checks |
| `tests/` | Node tests; `tests/fixtures/arcade-engine.mjs` scripts outcomes only for browser checks |
| `animation-reel.html` / `reel.mjs` | Animation preview and pose scrubbing |
| `server.mjs` | Localhost-only static development server on port 4173 |
| `scripts/build.mjs` / `scripts/check-build.mjs` | Clean static build, production file boundaries, and local link/import/asset checks |
| `scripts/simulate-matchups.mjs` / `tests/cpu.test.mjs` | Seeded CPU matches, all ordered pairings, difficulty probes, and deterministic diagnostics; excluded from production |
| `tests/browser/` / `playwright.config.mjs` | Isolated browser release tests and the real-app performance pass; never copy into production |
| `tests/browser/soak.spec.mjs` / `playwright.soak.config.mjs` | Opt-in real-time sustained sessions, virtual-pad bots, audio cleanup and runtime/frame reports; excluded from routine release tests |

## Commands

Node.js 22 or newer is required. No dependency installation is needed.

```sh
npm start       # http://127.0.0.1:4173
npm test        # Node's built-in test runner
npm run check   # Node tests, clean dist build and local-reference checks
npm run balance # Seeded CPU matchup matrix and difficulty probes
npm ci          # Install browser-test development tools (not needed to play)
npx playwright install chromium firefox webkit
npm run test:browser -- --project=chromium --project=firefox --project=webkit
npm run test:soak -- --project=chromium # Longer real-time Arcade/rematch/Training/local session
npm run art     # Regenerate assets/cels/*.svg
npm run audio   # Regenerate assets/audio/*.wav
git diff --check
```

Keep the existing `.mjs` imports, relative asset URLs, and small function-based style. Make the smallest complete change across simulation, input, rendering, UI, fixtures, and docs that the task needs. Keep unrelated files and generated previews out of the diff. `work/` is ignored scratch space.

## Behavior to preserve

- Simulation advances in fixed 1/120-second steps; Training timing readouts use 60-fps frame notation. Rendering must not determine damage or move timing. Keep random-dependent CPU/ladder behavior testable through the existing injectable random arguments.
- Attacks are one-shot edges; movement and guard are held state. Preserve pending edges across render frames with no simulation step. Joining, pausing, resuming, and changing screens require neutral controller input. Clear pending combat buffers on those transitions, and keep player assignments stable across reconnects.
- Remapped keys must remain unique across players; conflicts within one profile swap. Escape, Start, menu confirm/back and D-pad directions stay fixed. Profiles belong to player slots, and controller swaps must update reconnect assignments. Clear held/pending input after edits; even unbound held buttons must prevent controller arming. Move lists/help/gameplay hints must use current bindings and real engine values. Closing a nested dialog must leave its parent pause/options dialog active. Disconnect/focus interruptions during a dialog must survive closing it and require explicit Resume. Training reset is a P1-only edge on keyboard and controller. Controller menu routing follows dialog DOM order, so place nested dialogs after their parents.
- Focus loss and assigned-controller disconnects pause the match. Preserve keyboard fallback, menu confirm/back, and controls for both players.
- Arcade clears one bout per accepted result, rejects stale/duplicate results, retries losses against the same rival, and ends after five other fighters plus a mirror finale. Difficulty changes decisions, not fighter health, speed, or damage. Training CPU behavior stays normal.
- CPU personalities live in `CPU_TACTICS`. `cpuInput` defaults to P2; simulations can select a side/difficulty with independent random streams. Preserve per-player `match.ai` brains, delayed public observations, one-shot action edges, and reset/hitstop/countdown handling. Hold guard throughout block recoil; resume tactical choices after recovery. Never read player commands or hidden buffers. Keep distinct spacing, projectile/ink use, feints, throws and own-hit confirms. Matchup win rates are diagnostics, not human balance ratings; do not force a 50% target or hide incomplete matches.
- Counter/punish tags describe startup/recovery hits without bonus damage or stun; keep Training, effects and audio consistent. Guard and throw cues remain distinct. Existing hitstop/visual preference rules still apply. Retain the audio voice cap; steal the lowest lower-priority cue, break ties by age, and protect equal/higher priorities.
- Stage choice is cosmetic: preserve the shared fighting plane and combat rules, stage selection through Training resets/rematches, and venue identity across Arcade retry/resume. The Arcade tour is derived from bout index so existing v1 saves need no new fields. Scenery freezes under reduced motion; scores load on demand, ignore stale asynchronous completions, and retain pause/mute behavior.
- Treat saved browser data as untrusted. Validate Arcade checkpoints and audio preferences, handle unavailable/corrupt storage, and keep play available without persistence. Preserve `pdcf-arcade-v1`, `pdcf-audio-v1`, `pdcf-controls-v1`, and `pdcf-visuals-v1` compatibility or explicitly handle schema migration/recovery. Do not erase player progress as a test shortcut.
- Keep the public privacy/legal pages and prominent independence notice accurate when data handling, providers, assets, or character sources change. Distinguish game-code behavior from hosting configuration. Do not invent a private contact channel, retention period, worldwide clearance, or blanket public-domain license; the current contact route is public GitHub Issues with no published email.
- Throw capture, flight and knockdown advance in simulation time and pause with combat. Keep the last arena pixels while paused, while still drawing a tutorial's final step when it pauses on completion. The simulator checks zero paused arena redraws and exact PNG/RGBA equality for both players' throws. Cancel interrupted holds, reject follow-up hits until recovery, and finish lethal tosses before resolving a round. Keep all throw state clear after Training/round resets.
- Guided Training must validate real outcomes, distinguish passed/skipped lessons, retry the current lesson on Reset, and restore free-practice settings when ended. Keep prompts tied to the live P1 profile, pause safely at lesson completion, and require neutral controller input before continuing. Feedback must not call blocked hits or travelling projectiles misses, or confuse unrelated projectile hits with melee cancels.
- Training reset preserves cast/options while clearing combat/readout state. Health recovery, unlimited ink, dummy behavior, and normal match round rules must remain independent.
- Audio needs a browser gesture, supports independent volume/mute, pauses/resumes, and can retry loading failures without interrupting combat. Output startup must time out after five seconds, audio fetch/body/decode work after fifteen seconds, and stale startup completions/failures cannot overwrite a newer attempt. Preserve reduced-motion behavior, semantic buttons, focus handling, accessible labels, and live match announcements.
- Visual preferences affect presentation only. Follow system responds to OS changes; Reduced disables shake/film/scenery motion while preserving combat cues, and Full restores individual choices. Keep preferences validated and usable without storage. Fullscreen must require an explicit gesture, retain the 16:9 canvas and readable HTML HUD, tolerate denial/unavailable support, preserve browser Escape, and pause/clear inputs on external exit. A deliberate picture change may redraw a paused arena once; ordinary paused frames must remain untouched.
- Artwork requests must settle or time out. Retry failed assets only, share concurrent atlas loads, and keep controller Start locked while artwork is pending. Missing paintings use visible fallback scenery with an in-bout retry that preserves combat state. Keep the reel's progress/retry working too.

## Assets and presentation

Maintain the 1930s/1940s rubber-hose look and the existing warm monochrome palette. The six SVG atlases have 48 complete drawings each, 288 total. Keep atlas registration, transparent cell margins, and attack impact poses aligned with `moveFor` and `CEL_STATES`.

Edit the generator source, then regenerate and include the corresponding SVG/WAV files; avoid manual edits that the next generation would overwrite. Preview changed actions in `animation-reel.html`, including mirrored poses. Listen to changed audio as well as checking its samples when audio output is available.

Record new asset sources in `assets/provenance.md`. Describe the current art as script-authored vector cel-style animation and the music as original synthesis. Do not import modern character artwork, studio logos, recordings, or theme songs. Preserve the README's character-version and rights-review limitations; the title alone does not establish asset clearance.

## Validation

For behavior changes, add a focused regression using `node:test` in the relevant existing test file, then run `npm test` and `git diff --check`. Check changed modules with `node --check path/to/file.mjs`. For documentation-only edits, verify commands, links, and claims against the repository; game tests need not be repeated unless the documentation changes reveal a code issue.

For input, menu, or progression changes, run the game and the local `controller-simulator.html` harness. **Run controller checks** currently covers 28 flows, including both players, stable menu layout, pause, reconnect, Training, stage selection, and the Arcade tour. It also covers saved visual settings, saved remapping, conflicts, dead zones, swapping/reconnect, move lists, nested dialogs, 390px layout, storage failures, throw pause/resume and guided lessons with saved bindings. The matrix also covers interrupts behind menus/completed lessons, controller index changes, P1-only reset and Arcade Start during asset work. Keep its restoration of the previous saved run, audio settings, visual preferences and control profiles. Arcade timeout scripting belongs in `tests/fixtures/arcade-engine.mjs`; production must keep importing the real engine directly. Hidden controls that reserve layout space must remain excluded from controller navigation.

For UI changes, check the affected mode, dialog focus, keyboard/controller navigation, desktop/mobile layout, reduced motion, and browser console. For combat changes, exercise hit/miss/block, recovery, round transitions, and affected modes/fighters. A screenshot alone does not verify animation or gameplay.

The Playwright suite has nineteen scenarios per browser project, including real CPU combat for every fighter and reduced-motion counter/punish/guard/whiff feedback. CI also includes branded Chrome/Edge; those channels need their own browser installations. Linux Firefox uses a PulseAudio null sink for native Web Audio; keep the stalled-output regression as well as the normal failure/retry scenario. It checks a built copy on port 4174 and development-only harnesses on port 4173. `PDCF_ROOT` and `PDCF_PORT` configure test servers without changing the default development command. Do not make game code depend on test fixtures. Reports, downloaded browsers, `dist/`, and `node_modules/` are ignored. Frame timing is measured evidence on the named environment, not a hard shared-CI FPS gate or a guarantee on other hardware; retain the distinction between callback CPU time and observed frame intervals.

The controller harness must await nested dialog close events and poll neutral frames before sending another simulated menu action. Native `close` tasks can arrive after the harness's synchronous frame steps; the release scenario deliberately exercises that ordering. Check that Resume actually closes Pause, and test menu attack leakage with a clean hit readout before pausing, without a reset after resuming.

Use `npm run test:soak` for sustained-session checks. It drives virtual controllers through the unchanged app/engine, completes a real-time six-bout Arcade ladder, reloads the ending, plays three CPU and three local matches with rematches, then spars in Training for two minutes with pauses, nested move lists and an index-changing reconnect. Outcome fixtures and accelerated clocks must not substitute for that test. Inspect its `soak.json` attachment for audio source/gain cleanup, bounded caches/effects/input history, DOM counts, and early/late frame measurements. Parallel browsers contend for the same host; report that load and do not describe those numbers as isolated performance benchmarks or physical-controller/human playtests. Long tests are opt-in, outside the normal release matrix.

For CPU or balance changes, run `npm run balance -- --seeds 12 --seed 1930 --json work/balance.json` as well as focused regressions. Record seeds, source revision/modified state, side bias, incomplete/timeout counts, attack mix and difficulty probes in `docs/combat-balance.md`. An independent CI balance job runs two seeds and retains `combat-simulations`; those reports and the simulator script must stay out of production assets. Keep browser jobs dependent only on the static build so broad simulation failures do not suppress their diagnostics. Update real-damage expectations in the controller harness and verify move lists/cel timing after changing stats or moves.

Report what actually ran. Separate Node tests, scripted browser outcomes, normal gameplay, physical controller tests, speaker listening, and deployed-site checks. Do not describe virtual controllers as hardware verification or scripted Arcade victories as balance testing.

## Static packaging and delivery

Cloudflare build/deploy settings are managed outside the repository. The required static build command is `npm run check`, documented in `README.md`; it copies only the named root runtime files and the explicit production asset manifest into `dist/` and stamps the footer with the build's commit ID. Keep the source HTML placeholder for local development; never fetch the latest GitHub commit at runtime to label a cached release. Local modified builds must remain marked. New root imports need an update to `ROOT_FILES` in `scripts/build.mjs`; new runtime helpers also need an entry in `ASSET_FILES`; fighter/stage/audio files are derived from their catalogs. Keep unlisted and ignored assets out of production. Preserve the directory structure for their imports of `../../engine.mjs`.

Keep the simulator, tests/fixtures, scripts, repository development docs, and local server out of production assets. Public information pages and asset provenance are explicit manifest exceptions. Check that a copied build resolves new imports and assets. Do not commit `dist/`, temporary QA pages, or unrelated previews.

When asked to commit/push, inspect the working tree, include the requested source and generated assets, run the applicable checks, and verify the remote commit afterward. A push to `main` triggers the configured Cloudflare deployment; verify deployment separately before claiming the live site has updated.

For an authorized beta publication, prepare docs before the visible beta changes. Use a release branch/PR so the candidate's build, balance and all five browser jobs pass before promoting it to `main`. Recheck the resulting main run before creating an annotated version tag and a GitHub prerelease. Never move an existing published tag, bypass failed checks or label unfinished checks as passed. The tag must point to the verified release commit; verify its remote target and the live footer/beta notice separately. These checks do not themselves enforce Cloudflare settings or repository branch protection.
