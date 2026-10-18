# Working on Public Domain Cartoon Fighters

## Project and scope

This is a static browser game using native JavaScript ES modules, Canvas 2D, Web Audio, and the Gamepad API. It has no installed runtime dependencies, bundler, account system, or production backend. Use the existing modules and browser/Node APIs before adding packages or infrastructure.

The current game has six fighters (Mickey, Minnie, Oswald, Felix, Betty, Popeye), four stages (Ink Harbor, Silverscreen Theater, Moonlight Midway, Midnight Junction), Arcade, Training, CPU play, and local two-player. Preserve working modes and controls when extending a milestone. Read `README.md` for player-facing behavior and `assets/provenance.md` for asset sources.

## Code map

| Path | Owns |
| --- | --- |
| `engine.mjs` | Roster, moves, combat state, CPU difficulty, Training behavior, and round resolution; keep it independent of the DOM and browser globals |
| `app.mjs` | Screens, dialogs, input integration, saved Arcade runs, audio events, and the fixed 120 Hz simulation loop |
| `art.mjs` | Canvas scene, fighters, effects, and animated stage |
| `cels.mjs` | Atlas loading/measurement and pose selection synchronized to combat timing |
| `assets/runtime/arcade.mjs` | Ladder generation, bout progression, checkpoint validation, and six original endings |
| `assets/runtime/stages.mjs` | Stage names/assets/music metadata, safe default, and the derived Arcade venue tour; keep it DOM-free |
| `assets/runtime/controllers.mjs` | Standard gamepad mapping, player assignment, neutral arming, and pending input edges |
| `assets/runtime/audio.mjs` | Audio loading/playback, pause/resume, and validated saved preferences |
| `index.html` / `style.css` | Main interface, dialogs, responsive layout, and accessibility markup |
| `scripts/build-cels.mjs` / `scripts/build-audio.mjs` | Sources for the checked-in SVG atlases and WAV assets |
| `controller-simulator.html` | Browser harness for two virtual pads and repeatable flow checks |
| `tests/` | Node tests; `tests/fixtures/arcade-engine.mjs` scripts outcomes only for browser checks |
| `animation-reel.html` / `reel.mjs` | Animation preview and pose scrubbing |
| `server.mjs` | Localhost-only static development server on port 4173 |

## Commands

Node.js 22 or newer is required. No dependency installation is needed.

```sh
npm start       # http://127.0.0.1:4173
npm test        # Node's built-in test runner
npm run art     # Regenerate assets/cels/*.svg
npm run audio   # Regenerate assets/audio/*.wav
git diff --check
```

Keep the existing `.mjs` imports, relative asset URLs, and small function-based style. Make the smallest complete change across simulation, input, rendering, UI, fixtures, and docs that the task needs. Keep unrelated files and generated previews out of the diff. `work/` is ignored scratch space.

## Behavior to preserve

- Simulation advances in fixed 1/120-second steps; Training timing readouts use 60-fps frame notation. Rendering must not determine damage or move timing. Keep random-dependent CPU/ladder behavior testable through the existing injectable random arguments.
- Attacks are one-shot edges; movement and guard are held state. Preserve pending edges across render frames with no simulation step. Joining, pausing, resuming, and changing screens require neutral controller input. Clear pending combat buffers on those transitions, and keep player assignments stable across reconnects.
- Focus loss and assigned-controller disconnects pause the match. Preserve keyboard fallback, menu confirm/back, and controls for both players.
- Arcade clears one bout per accepted result, rejects stale/duplicate results, retries losses against the same rival, and ends after five other fighters plus a mirror finale. Difficulty changes decisions, not fighter health, speed, or damage. Training CPU behavior stays normal.
- Stage choice is cosmetic: preserve the shared fighting plane and combat rules, stage selection through Training resets/rematches, and venue identity across Arcade retry/resume. The Arcade tour is derived from bout index so existing v1 saves need no new fields. Scenery freezes under reduced motion; scores load on demand, ignore stale asynchronous completions, and retain pause/mute behavior.
- Treat saved browser data as untrusted. Validate Arcade checkpoints and audio preferences, handle unavailable/corrupt storage, and keep play available without persistence. Preserve `pdcf-arcade-v1` and `pdcf-audio-v1` compatibility or explicitly handle schema migration/recovery. Do not erase player progress as a test shortcut.
- Training reset preserves cast/options while clearing combat/readout state. Health recovery, unlimited ink, dummy behavior, and normal match round rules must remain independent.
- Audio needs a browser gesture, supports independent volume/mute, pauses/resumes, and can retry loading failures without interrupting combat. Preserve reduced-motion behavior, semantic buttons, focus handling, accessible labels, and live match announcements.

## Assets and presentation

Maintain the 1930s/1940s rubber-hose look and the existing warm monochrome palette. The six SVG atlases have 48 complete drawings each, 288 total. Keep atlas registration, transparent cell margins, and attack impact poses aligned with `moveFor` and `CEL_STATES`.

Edit the generator source, then regenerate and include the corresponding SVG/WAV files; avoid manual edits that the next generation would overwrite. Preview changed actions in `animation-reel.html`, including mirrored poses. Listen to changed audio as well as checking its samples when audio output is available.

Record new asset sources in `assets/provenance.md`. Describe the current art as script-authored vector cel-style animation and the music as original synthesis. Do not import modern character artwork, studio logos, recordings, or theme songs. Preserve the README's character-version and rights-review limitations; the title alone does not establish asset clearance.

## Validation

For behavior changes, add a focused regression using `node:test` in the relevant existing test file, then run `npm test` and `git diff --check`. Check changed modules with `node --check path/to/file.mjs`. For documentation-only edits, verify commands, links, and claims against the repository; game tests need not be repeated unless the documentation changes reveal a code issue.

For input, menu, or progression changes, run the game and the local `controller-simulator.html` harness. **Run controller checks** currently covers 14 flows, including both players, pause, reconnect, Training, stage selection, and the Arcade tour. Keep its restoration of the previous saved run and audio settings. Arcade timeout scripting belongs in `tests/fixtures/arcade-engine.mjs`; production must keep importing the real engine directly.

For UI changes, check the affected mode, dialog focus, keyboard/controller navigation, desktop/mobile layout, reduced motion, and browser console. For combat changes, exercise hit/miss/block, recovery, round transitions, and affected modes/fighters. A screenshot alone does not verify animation or gameplay.

Report what actually ran. Separate Node tests, scripted browser outcomes, normal gameplay, physical controller tests, speaker listening, and deployed-site checks. Do not describe virtual controllers as hardware verification or scripted Arcade victories as balance testing.

## Static packaging and delivery

Cloudflare build/deploy settings are managed outside the repository. The current static build command is documented in `README.md`; it copies named root runtime files plus all of `assets/` into `dist/`. New root imports need a corresponding copy-command update; runtime helpers under `assets/runtime/` are already copied. Preserve the directory structure for their imports of `../../engine.mjs`.

Keep the simulator, tests/fixtures, scripts, docs, and local server out of production assets. Check that a copied build resolves new imports and assets. Do not commit `dist/`, temporary QA pages, or unrelated previews.

When asked to commit/push, inspect the working tree, include the requested source and generated assets, run the applicable checks, and verify the remote commit afterward. A push to `main` triggers the configured Cloudflare deployment; verify deployment separately before claiming the live site has updated.
