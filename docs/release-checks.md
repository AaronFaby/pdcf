# Desktop release verification

The release scope is desktop browser play: CPU, local multiplayer, Arcade, and Training. Simulation remains fixed at 120 Hz. Saved visual-comfort settings and native fullscreen affect presentation only; combat balance is unchanged.

## Repeatable checks

1. Run `npm run check` for the Node regressions, clean production copy, and local references.
   For combat changes, also run `npm run balance -- --seeds 12 --seed 1930 --json work/balance.json` and review the diagnostic report.
2. Install the development tools with `npm ci` and test engines with `npx playwright install chromium firefox webkit`.
3. Run `npm run test:browser -- --project=chromium --project=firefox --project=webkit`.
4. For installed branded browsers, use `npm run test:browser -- --project=chrome --project=msedge`. CI installs these channels in its own ephemeral runners; local installation of system browsers is not automatic.
5. Inspect `playwright-report/` and the attached performance JSON. A failed test retains a screenshot and trace in `test-results/`.

The GitHub Actions workflow runs on pushes and pull requests to `main`, with read-only repository permissions. It uploads the checked static build and separate reports for Chromium, Firefox, WebKit, Chrome, and Edge. It does not deploy or alter Cloudflare/branch protection. The workflow needs to be committed/pushed before a hosted Actions run exists; a local test run is separate evidence.

## Browser scenarios

| Scenario | What is verified |
| --- | --- |
| Packaged game | Training combat on all four stages, pause/resume, and legal pages opening separately without losing the game |
| Missing character | Start is blocked, the failed fighter is named, retry fetches only missing artwork, and cast/stage selections survive |
| Missing scenery | A bout stays playable, identifies fallback scenery, and can recover the painting without resetting Training readouts |
| Stalled request | Progress remains visible; controller Start and keyboard activation cannot begin early; completion unlocks play |
| Fonts/audio | System-font fallback, audio errors leave controls usable, and audio can retry successfully |
| Stalled audio output | A pending native output startup reports failure after five seconds, Training combat remains usable, and a new gesture can retry |
| Animation reel | Missing fighter artwork can retry without refreshing |
| Existing controller harness | All 28 flows, including real combat, throws, guided lessons, saved bindings/visual preferences, menu/lesson interruptions, index-changing reconnects, P1-only reset, blocked Arcade starts and scripted progression/endings |
| Performance pass | All 24 fighter/stage pairings render and produce frame callback/interval measurements |
| Saved picture settings | System motion changes, keyboard choices, explicit overrides, independent effects, and persistence after reload |
| Visual storage recovery | Corrupt values recover defaults; blocked storage still applies choices and leaves Training playable |
| Reduced effects and readability | CPU, Local, Training and Arcade; 1280×720, 390×844 and 800×500 layouts; HUD outside the 16:9 canvas; numeric health/ink; nested display/pause navigation |
| Native fullscreen | Gesture entry, active-state label/focus, canvas proportions, external exit pausing/clearing held input, nested re-entry/exit, and resumed combat; unsupported environments report the fallback instead |
| Fullscreen failure | Rejected requests, acknowledged requests that leave fullscreen inactive, and unsupported browsers keep usable settings and windowed play |
| Keyboard focus/reset | Utility-button clicks return control to both keyboard players; Enter/Space do not repeat the button; Training reset is a P1-only one-shot |
| Result audio | Completed CPU result menus restore native audio source/scene state after focus and visibility return; outcomes use the browser-only fixture |
| Stalled score | Loading status remains honest; Training works while the asset fetch stalls; the deadline reports failure and a new gesture retries |
| CPU personalities | Each of the six CPU fighters lands damage in the real app; all three difficulty choices are exercised; tactic descriptions and revised damage/timings remain readable at 390px |
| Impact feedback | Real startup counters, recovery punishes, guards and whiffs produce accurate Training feedback under reduced motion; a paused counter frame is captured for inspection |

Arcade victory scripting verifies progression, not human difficulty or balance. Virtual controllers verify the input code, not hardware pairing, latency, or physical button layouts. Browser WebKit is not the Safari application or an exhaustive Safari version/device matrix.

## Sustained sessions

After `npm run check`, run:

```sh
npm run test:soak -- --project=chromium --project=firefox --project=webkit
```

The optional suite uses the same built game and real input/engine/audio paths, with bots supplying virtual-pad actions based on public CPU observations. It runs at native browser time: no scripted outcome fixture, shortened clock, health edit, or skipped round. Each session completes a six-bout Arcade ladder and reloads its saved ending, plays three CPU matches and three local matches with rematches, then spars continuously in Training for two minutes with six pause/resume cycles, nested move lists and an index-changing P1 reconnect. Arcade losses use the real Continue flow and have a bounded attempt count. A match that does not finish fails instead of silently skipping onward.

Each browser attaches `soak.json` with sampled fighter state, simulation time, effects/projectiles, input-history/cache/DOM counts, music/voice state, connected native audio source/gain counts, and frame callback/interval summaries. Paused audio must finish stopping and disconnect its sources/fade gains; the permanent two mixer gains remain. One audio context per page and the sixteen-voice cap must hold. Muting at the end must leave no playing sources or pending loads. The test fails on page errors, invalid numeric fighter state, unbounded tracked state, or broken progression. Audio instrumentation observes native nodes; it does not replace playback or establish listening quality. These checks do not measure every browser heap allocation or certify the absence of all memory leaks.

Long sessions are outside the nineteen routine release scenarios and CI's normal matrix. They default to one worker; `--workers=3` runs three browsers concurrently for functional endurance, with shared machine load. Inspect early/late Training frame samples for potential deterioration. Frame timing remains measured evidence, not a brittle shared-host FPS gate or a guarantee for lower-end hardware.

## Performance method

Open `/tests/browser/performance.html` on the development server and click **Run performance pass** with the tab active. The harness runs the real app in a 1200px-wide iframe, isolates its preferences, warms each pairing for 12 frames, then samples 60 frames while moving and attacking. Each fighter visits each venue. It measures time inside the app's complete animation callback (simulation, DOM updates, and Canvas command submission) and intervals between callbacks. It does not force a GPU readback, measure end-to-end input latency, or replace a DevTools/Lighthouse trace. Other machine load and browser scheduling can affect results.

The ready-time measurement starts before fetching the game HTML and ends when Start becomes enabled. Cache state is not forced cold, and no network/CPU throttling is applied. Before/after startup numbers must therefore not be advertised as cold-network improvements. Frame budgets are observations and targets; shared CI runners collect reports without a brittle 60-FPS pass/fail threshold.

The baseline on October 18, 2026 used the in-app Chromium browser (reported Chrome 155, macOS/ARM host), a 1280 × 720 outer viewport and the 1200px game iframe. All 24 pairings had a median observed interval of 16.7 ms; the largest per-pair p95 callback time was 2.7 ms, and none of the sampled intervals exceeded 33.5 ms. Initial game-ready time was 320 ms with unspecified browser-cache state. This pass showed enough frame headroom to avoid a speculative renderer rewrite; the focused change is bounded, cached asset recovery.

## Release-candidate harness repair — October 18, 2026

Hosted run `39172511099` passed the static build, balance and four browser jobs, but Firefox reported “Move-list inputs leaked after resume.” Three unmodified local Firefox runs passed. A controlled queued-close case then demonstrated the actual failure: the simulator could send Start before a nested dialog's native `close` task cleared input. That clear disarmed the controller, so Start was discarded and the following Training reset was ignored while Pause remained open. The hit readout still contained the punch from before the menu; it was not evidence of a new attack.

The harness now awaits native close events for nested Moves, Controls and Options, polls neutral frames, and verifies that Start actually closes Pause. It clears the hit readout before pausing and checks for leaked attacks after resuming without a reset that could conceal them. The release scenario controls close-task delivery and verifies that the delayed events actually ran. Removing the Options wait in a temporary negative-control copy reproduces the discarded Start; the repaired case passes. Combat rules and production input handling were not changed for this harness repair.

The first endurance pass completed its real Arcade and rematch sequences in all three browsers, then stopped on the new DOM-growth assertion: the first move-list opening legitimately creates 28 table elements. The final test primes that lazy content before establishing the baseline, retaining the same growth allowance for repeated openings. Native audio cleanup and runtime bounds held through the initial pass.

All three complete endurance reruns passed on this macOS ARM host, based on `0dcfed5` with these QA changes. Each browser completed six real Arcade wins, reloaded the saved ending, finished three CPU and three local matches, and ran the two-minute Training segment with all pause/menu/reconnect checks. Across the three browsers that is 36 completed matches and six minutes of active Training. There were no page errors or failed state/audio bounds. The browsers ran concurrently with `--workers=3`; these measurements include shared host load.

| Engine | Session wall time | Training callback p95, first → last window | Training interval p95, first → last window |
| --- | ---: | ---: | ---: |
| Chromium | 7.59 min | 0.7 → 0.8 ms | 16.8 → 16.7 ms |
| Firefox | 7.38 min | 5 → 5 ms | 17.60 → 17.56 ms |
| WebKit | 8.16 min | 1 → 3 ms | 18 → 18 ms |

Training DOM counts stayed at 638 in all six measured windows for every engine. The sampled effect-voice maximum was four, active native sources five, connected gains four during fades, decoded buffers seventeen and input history eight. All eighteen measured pause cycles reached zero active/connected sources and only the two permanent mixer gains. Final mute left zero active/connected sources and pending loads in every browser. After the ending reload, the sessions played 1,003 / 1,028 / 1,103 native sources in Firefox / Chromium / WebKit respectively. WebKit's late callback p95 increased, while its median remained 1 ms and observed frame cadence stayed unchanged; this is not evidence of an isolated hardware benchmark or a universal no-slowdown guarantee. Raw JSON copies from this run are retained locally under ignored `work/soak-validation/`.

The final Node/build check passed 97 tests and the 48-file/105-reference production copy. All 57 routine browser checks passed: nineteen each in Chromium, Firefox and WebKit, including all 28 controller flows per engine with the controlled close task. That run used three workers and completed in 2.9 minutes. Syntax and diff checks passed. Branded Chrome/Edge are not installed locally; the five-project hosted workflow must still be verified after publication. No new Cloudflare deployment, physical-controller test, native Safari run or speaker/headphone listening is claimed.

## Combat review follow-up — October 18, 2026

The block-recoil guard drop and mixed-priority sound eviction were each reproduced with a failing regression before repair. CPU guard now persists through block recoil on both sides even when a decision expires, then returns to normal tactical choices. Sound eviction chooses the lowest lower priority and the oldest voice within that priority; equal/higher priorities remain protected. The `balance` workflow job runs independently of `build`; browsers depend only on the static build. Local YAML parsing and dependency assertions verified that structure. A failed simulation still fails its own check.

All **9 targeted browser reruns** passed against the repaired build: the 28-flow controller matrix, real combat for all six CPU fighters, and reduced-motion impact feedback in each of Chromium, Firefox and WebKit. The full 57-scenario result below belongs to the initial milestone before this review; it was not rerun in full for these focused repairs.

`npm run check` passed **97 Node tests** and the **48-file/105-reference** production build. Seeds 1930–1941 again completed **1,296 ordinary matches and 432 difficulty probes** without invalid states or incomplete matches. The [balance table](combat-balance.md) was refreshed after the guard fix. Source syntax and diff checks passed. The workflow change still requires a hosted run after publication; no deployment or physical-controller/speaker validation is claimed.

## Historical initial combat milestone — October 18, 2026

Local validation on this macOS ARM host passed **95 Node tests**, the **48-file/105-reference** production build check, and **57 browser release tests**: nineteen scenarios each in Chromium, Firefox and WebKit. Each engine passed all **28 controller flows**. The native CPU scenario exercised all six fighters and all three difficulty choices, checked tactic descriptions at 390px, and verified revised move-list values. The new reduced-motion scenario resolved actual startup counters, recovery punishes, guards and whiffs, with accurate Training feedback and no captured page errors. The captured counter frame was inspected for readable impact text. Syntax checks passed for all twelve changed JavaScript modules; `git diff --check` passed.

The [combat balance report](combat-balance.md) records seeds 1930–1941: **1,296 ordinary matches and 432 difficulty probes** completed without invalid states or incomplete matches. Results expose side bias, fighter/level differences and the limits of bot-based measurements. The workflow now retains a separate two-seed `combat-simulations` JSON artifact. Neither the simulation tool nor reports enter production assets. These are local results; the changed workflow has not yet run in hosted CI, and no deployment is claimed. Human balance testing, physical controllers, speaker listening and native Safari remain separate work.

## Historical issue #1 review repairs — October 18, 2026

The [finding-by-finding report](issue-1-review.md) records the reproduced defects, fixes and regression coverage. Local validation passed **83 Node tests**, the **48-file/105-reference** production build check and **51 browser release tests**: seventeen scenarios each in Chromium, Firefox and WebKit on this macOS ARM host. Each engine passed all **28 controller flows**. Syntax checks passed for all seventeen changed JavaScript modules, and `git diff --check` passed.

After the final reconnect and P1-reset UI adjustments, a fresh build and all **6 targeted controller/keyboard reruns** passed across those three engines. The final controller matrix also verifies that P2's controls identify Training reset as P1 only.

The production manifest now excludes unlisted local metadata, which caused the older 49-file count below; the intended build has 48 files. The historical sections retain their original evidence and counts. These local results do not establish a new hosted GitHub Actions run or Cloudflare deployment.

## Historical milestone results — October 18, 2026

`npm run check` passed all 71 Node tests and checked the 48-file production copy with 90 local references. All eight browser scenarios passed in each installed engine: **24 release tests passed**, including the 24-flow controller harness in each engine. Missing/stalled images, successful retry, audio/font failures, and the animation reel were exercised against the built game. The performance/controller harnesses intentionally run from the development server and are excluded from the production copy.

The following measurements came from the final headless Playwright run on this macOS ARM host. Desktop device presets supplied the browsers' user-agent strings; they do not establish Windows hardware testing. Each row covers 1,440 app callbacks across 24 pairings. “Median callback” and “median interval” are medians of the per-pair medians; the p95 columns show the worst per-pair p95. Ready time uses an uncontrolled cache and must not be compared to the interactive baseline as a speedup.

| Engine | Ready time | Median callback CPU time | Worst callback p95 | Median interval | Worst interval p95 | Intervals over 33.5 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chromium 156 | 463.2 ms | 0.6 ms | 1.1 ms | 16.7 ms | 16.8 ms | 0 |
| Firefox 157 | 721 ms | 5 ms | 8 ms | 16.66 ms | 17.48 ms | 0 |
| WebKit 27.2 | 603 ms | 1 ms | 2 ms | 17 ms | 27 ms | 0 |

These observations are approximately 60 FPS in this environment, with 0 sampled intervals over 33.5 ms across the three engines. They do not guarantee frame pacing on lower-end machines, physical high-refresh displays, or during sustained play. The original render path already had headroom, so no speculative rendering or combat-timing rewrite was introduced. Successful atlas caching, concurrent-request sharing, bounded load attempts, reuse of decoded paintings for stage thumbnails, and release measurements are the focused improvements. Each browser run retains its raw `performance.json` with the report.

The initial hosted checks passed the build, Chromium, branded Chrome, and branded Edge jobs. Firefox's audio recovery and WebKit's paused-throw checks failed on Linux; see the follow-up below. Branded Chrome/Edge remain uninstalled locally. A native Safari UI connection was too slow to complete a useful manual pass; no Safari-application test is claimed.

## Historical Linux regression follow-up — October 18, 2026

The Firefox trace contained no audio asset requests after Enable audio: native output startup remained suspended before loading could begin. Forcing an unavailable output locally reproduced the same unchanged status and failed recovery assertion. Output startup now has a five-second deadline, and each attempt has an identity so an older timeout or completion cannot overwrite a successful retry. Node coverage checks timeout, late completion, successful retry, and stale failure. A ninth browser scenario stalls output startup, checks the error, plays Training while sound is unavailable, and recovers from a new gesture. Linux Firefox CI starts PulseAudio with a null sink so the separate normal asset-failure/recovery scenario exercises native Web Audio with an available output; it does not mock the audio implementation or establish speaker listening.

A diagnostic run on Linux WebKit reproduced a three-channel change with a maximum channel delta of 40 in an otherwise paused frame. The arena was being redrawn on every frame even though simulation time had stopped. Paused bouts now retain their last canvas image; a tutorial that pauses after advancing still draws its final step. The controller harness checks both players' mid-throw pauses, health, zero arena image redraws, exact PNG and RGBA equality, and completion after the other player resumes. It does not loosen pixel tolerances or skip an engine.

The follow-up passes all 73 Node tests, the 48-file/90-reference build check, and all nine browser scenarios in each local Chromium, Firefox, and WebKit engine (27 total). Hosted Linux results must be checked for the specific pushed commit in [Release checks](https://github.com/AaronFaby/pdcf/actions/workflows/release-checks.yml); local results alone do not establish a green hosted run.

The first hosted follow-up passed Firefox and WebKit's strict pause checks, then Linux WebKit reached the controller test's old 60-second deadline while still progressing through its 24 flows. That scenario now allows 120 seconds within a 150-second test budget, and reports an explicit harness failure immediately instead of waiting for the deadline. All 24 passes are still required.

## Historical accessibility and display follow-up — October 18, 2026

The visual preferences validate motion/effect choices before use and save separately from progress, audio and controls. Reduced motion preserves combat timing and attack/throw cues; independent decoration switches affect rendering only. The HUD now sits outside the scaled arena with numeric health/ink readouts. Focus indicators, reading sizes and muted-text contrast were improved, and the skip link moves keyboard focus into the main content.

Fullscreen entry initially exposed a WebKit top-layer issue: the existing modal remained open but the fullscreen page covered it. Fullscreen changes now restore parent dialogs before Options, retaining scroll/focus. Nested Options follows Pause in DOM order so virtual-controller navigation and Back reach the active dialog. The native check exercises closing Options back to a usable paused menu while still fullscreen, as well as entry, external exit, re-entry and resumed combat. The arena retains its 16:9 ratio and fits vertically at the tested 1280×720 fullscreen viewport. Denied, inactive and unavailable requests have explicit fallbacks.

Final local validation passed **77 Node tests**, the **49-file/92-reference** production build, and **42 browser release tests**: fourteen scenarios each in Chromium, Firefox and WebKit on this macOS ARM host. Each engine passed all **26 controller flows**, including saved visual settings, 390px Options layout and nested display/pause navigation. Native fullscreen entry/exit passed in all three engines. The interactive in-app-browser pass also checked the skip link, keyboard focus, visual Options and Training HUD, with no captured console errors or warnings. The existing workflow will include the new scenarios on its five browser projects after publication; this local result does not establish a new hosted CI run or deployment. Physical controllers, the Safari application, and assistive-technology/compliance certification are not established by these checks.

The first hosted display run exposed Linux Firefox's native fullscreen resize: the trace viewport changed from 1280×720 to 1366×768 while Playwright's configured viewport remained 1280×720. The test now checks the actual document viewport instead of the configured window dimensions. The arena also exceeded the actual fullscreen height by about five pixels, so fullscreen now shares the windowed arena's more conservative size cap instead of enlarging it separately. Hosted results for that repair must be verified on its follow-up commit.

## Release sign-off still requiring people or deployment access

- Physical controller pairing, reconnects, button labels, and latency.
- Actual speaker/headphone listening and sustained human balance playtests.
- A representative lower-end target machine, high-refresh displays, and physical touch devices if touch support becomes a release promise.
- Branded Safari/device coverage beyond the tested WebKit build.
- Verification of the hosted GitHub Actions run and Cloudflare deployment after publication.
- Existing independent art/branding/legal review and Cloudflare privacy-configuration review.
