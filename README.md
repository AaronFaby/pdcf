# Public Domain Cartoon Fighters

A browser-based, side-view 2D fighter with six cartoon stars, rubber-hose animation, original period-inspired music, and a warm black-and-white theatrical presentation. Play Arcade, Training, single CPU matches, or local two-player across four animated stages.

**[Play the game](https://pdcf.aaronfaby.com)** · [Contributor guidance](AGENTS.md) · [Asset provenance](assets/provenance.md)

## First desktop beta

**Beta 1 · `v0.1.0-beta.1`** targets desktop browser play with a keyboard, Arcade, Training, single CPU matches, and local multiplayer. Standard controller support is included for beta testing. The game displays its beta version separately from the exact build commit in the footer.

Read the [known limitations and feedback guide](assets/beta.html), [beta release notes](docs/beta-release.md), and [verification record](docs/release-checks.md). Release tags and GitHub prereleases are published only after the candidate passes the build, balance and all five hosted browser jobs. The website follows `main`; its build number identifies the version currently served even after a later beta update.

[Report a bug or share beta feedback on GitHub Issues](https://github.com/AaronFaby/pdcf/issues). Include the build number, browser/OS, keyboard or controller, mode/difficulty, matchup/stage, steps, and expected/actual behavior. Issues are public and posting requires a GitHub account; do not include private information. No automatic feedback uploads or new player storage are added for the beta.

The deployed site was observed loading a hosting-provided Cloudflare Web Analytics/RUM beacon. This browser page/performance processing is separate from local game state and manual feedback, and is disclosed in the privacy policy. Information pages are authored without scripts; hosting may inject this beacon. The beta changes do not alter Cloudflare settings.

Balance, physical controller behavior, speaker/headphone output, native Safari, lower-end/high-refresh hardware and sustained human play remain under review. Touch controls are incomplete, online multiplayer is unavailable, and saves are local to one browser/device. Artwork/branding clearance and hosting privacy configuration remain separate reviews. The limitations page distinguishes these gaps from verified automated coverage.

## Privacy and legal notices

The approved [character and privacy review follow-up](docs/legal-review.md) targets Beta 2: source-backed character cleanup, local font hosting and optional browser-metrics reduction. It records the distinction between engineering changes and unresolved legal judgments; these changes are not a clearance certificate.

The casting screen carries a prominent independent-project/non-endorsement notice. A site-wide footer links to the [privacy policy](assets/privacy.html) and [legal and character notices](assets/legal.html), opening in a new tab to preserve an ongoing game. Both pages work without JavaScript and match the game’s paper-and-ink presentation.

The privacy policy documents the four local-storage entries, temporary inputs/Training state, Cloudflare hosting/security requests, Google Fonts, external links, retention, deletion choices, applicable privacy rights, and children/family considerations. Contact uses public GitHub Issues; no email address is published. Do not post sensitive information there. The legal notice identifies intended early character versions, U.S./international limits, ongoing trademark rights, Popeye’s separate spinach-source limitation, asset provenance/reuse, and qualified game-use/warranty notices. It does not certify rights clearance.

The pages live under `assets/` and are included in the explicit production manifest. Keep the policy accurate when adding network services, telemetry, storage keys, accounts, or purchases. Hosting-level analytics, security cookies and log retention depend on Cloudflare configuration and must be checked separately before treating the policy as a full operational/compliance review. No legal review of the notices or finished art is implied.

The bottom of the game page shows **Build `<short commit ID>`**, linked to the exact GitHub commit used by the build. Compare it with the commit from a push to confirm which release is displayed. The label is embedded in the built HTML and works without JavaScript or a separate version request. Local builds with uncommitted changes say **local changes**; the development server shows **Local development**.

## Run locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
npm start
```

Open [the local game](http://127.0.0.1:4173), choose a mode and fighter, then start. CPU, Local, and Training let you choose both roster slots, including mirror matches. The development server binds only to localhost.

### Loading and recovery

The casting screen shows progress for six character atlases and four stage paintings. Its Start controls stay locked until the current load attempt finishes and all six character atlases are ready. **Retry missing artwork** retries failed assets without reloading the page, redownloading successful atlases, changing the selected cast/stage, or clearing saves. A request that does not finish within 15 seconds is treated as failed so loading cannot hang indefinitely.

Missing stage paintings use the existing drawn scenery, with an explicit in-match notice and **Retry stage artwork**. Retrying during a bout preserves combat and Training state. The animation reel also reports progress and supports Retry. Fonts retain system fallbacks. An audio output that fails to start within five seconds reports an error and can retry from Enable audio or a new player gesture; an older attempt cannot overwrite a successful retry. Audio asset fetches, body reads and decoding have a 15-second deadline; failed or stalled assets can retry without downloading successful loads again. The status reports loading until startup settles, and late results cannot replace a retry. Audio failure does not prevent fighting.

## Modes

| Mode | What to expect |
| --- | --- |
| Arcade | Six-bout CPU ladder, three difficulties, continues, saved progress, and a character ending |
| Single CPU | One best-of-three match against your chosen opponent on Easy, Normal, or Hard |
| Local | Two players sharing a keyboard or using two standard-mapped controllers |
| Training | Endless practice with configurable dummy behavior, health recovery, unlimited ink, and combat readouts |

### Arcade

Select **Arcade**, choose your star and **Easy / Normal / Hard**, then start a **New Arcade Run**. The ladder shuffles the other five fighters and ends with a mirror match against your own character. Each bout starts with full health, 35 ink, and fresh round wins. The mirror finale labels P1 and the rival.

- **First Bell / Next Bout** starts a best-of-three match. Win to clear one ladder slot.
- **Continue** retries the same rival after a loss. Continues are unlimited; cleared bouts remain cleared and losses are counted.
- **Save & Casting** leaves a fight. **Resume Arcade** restores your star, difficulty, ladder, and cleared bouts. An interrupted fight restarts from round one without adding a loss. Changing the difficulty selector does not change a resumed run.
- Clear all six bouts for your character's original story ending and animated victory portrait. **View Ending** reopens the completed ending; **Play Again** creates a new ladder with the same star and difficulty.

Arcade tours Ink Harbor → Silverscreen Theater → Moonlight Midway → Midnight Junction → Silverscreen Theater → Ink Harbor. Venue names appear on the ladder. A continue or resumed bout keeps its venue; existing v1 checkpoints remain compatible.

One checkpoint is stored per browser and device; a new run replaces it. If browser storage is unavailable, the run remains playable while the page stays open. Audio preferences are saved separately.

Difficulty changes CPU reactions and decisions, including guarding, evasion, attacks, throws, dashes, and hit-confirm combos. Fighter health, speed, and damage remain equal across settings. Later ladder bouts shorten CPU decision intervals slightly. Training uses normal CPU behavior.

### Training

Choose your fighter and practice dummy, then start immediately in jab range with an endless clock. Open **Practice options** below the arena or from the pause menu.

- Set the dummy to stand, guard, jump repeatedly, or spar with the CPU.
- Health recovery prevents knockouts and restores health after each string. Turn it off to practice knockouts; the bout resets without awarding rounds.
- Unlimited ink keeps both meters full. Turn it off for normal costs and meter gain.
- Inspect last-hit damage, uninterrupted combo hits/damage, attack phase/startup timing, and the last eight P1 inputs. Timings use 60-fps frame notation; held directions do not flood the history.
- **Backspace**, controller **View / Select**, or **Reset** clears combat state and readouts while keeping the chosen cast and practice settings.

### Learn to fight and combat feedback

In Training, choose **Learn to fight** below the arena, or open **Pause → Practice options → Start guided lessons**. Eight lessons cover movement in both directions, jumping and landing, punches/kicks, guarding, throws, directional dashes, signature moves, and a punch-to-kick cancel combo. The lesson appears beside the arena on desktop and below it on smaller screens.

Prompts use P1’s saved keyboard and controller bindings, including changes made while the course is running. Lessons pass on accepted movement or resolved combat outcomes, not just button presses. A throw must land; a combo needs a connected punch cancelled into a connected kick. Popeye’s special lesson checks Spinach Power instead of requiring damage. The special lesson uses normal ink costs; Retry supplies fresh starting ink.

Passing a lesson pauses into the lesson menu so keyboard/controller players can choose **Next**, **Retry**, **Skip**, or **Free practice**. The Reset button or the assigned Reset Training key/button retries the current lesson. Skipped lessons are reported separately from passed lessons. Lessons set up the dummy and practice rules; returning to free practice restores the previous dummy, health recovery, and ink settings, and keeps the cast/stage. Progress lasts for the current Training session; it is not saved across reloads.

Both free and guided Training show coaching notes for connected hits, blocked strikes, misses, combo cancels, Spinach Power, and rejected actions. Feedback explains insufficient ink, guarding, hit/block stun, airborne restrictions, and recovery. A travelling projectile is not called a miss before it hits or expires. The status line shows startup, active/recovery timing, stun, guarding, dashing and knockdown in 60-fps frame notation. Feedback resets with practice.

## Stages and music

Use **Set the scene** beneath the matchup preview to choose a stage for CPU, Local, or Training. The preview and music change together. Your choice stays in place for rematches and Training resets during the page session. The Harbor Headliners shortcut always starts Mickey versus Popeye at Ink Harbor. Arcade shows the four stages as a non-interactive **Arcade tour** preview and uses its fixed venue order. Mode and stage choices keep the title, preview, and roster in place.

| Stage | Animated scenery | Original score |
| --- | --- | --- |
| Ink Harbor | Tugboat, steam, gulls, and water glints | **Ink Harbor Stomp** — 144 BPM swing |
| Silverscreen Theater | Sweeping spotlights, swaying curtain edges, film-reel projection, footlights, and dust | **Footlight Foxtrot** — 128 BPM stride-piano foxtrot |
| Moonlight Midway | Rotating Ferris wheel with upright gondolas, bobbing balloons, and chasing carousel bulbs | **Carousel Capers** — 156 BPM, 3/4 calliope waltz |
| Midnight Junction | Passing train with turning wheels, steam, drifting mist, and moving station-clock hands | **Midnight Rail Shuffle** — 168 BPM railway jazz |

All venues share the same floor, boundaries, combat rules, and camera. Scenery adds no hazards. Each score is an original 32-bar arrangement. Music loads on demand and is cached for the session; stage changes fade out the previous score and start the new one. Pause/resume preserves the current track position. Muting and failed music loads do not block fighting.

## Controls

| Action | Player one | Player two | Standard controller |
| --- | --- | --- | --- |
| Move | A / D | Left / Right arrows | Stick / D-pad |
| Jump | W | Up arrow | A / Cross |
| Guard | Hold S | Hold Down arrow | LB / L1 or Down |
| Punch | F | J | X / Square |
| Kick | G | K | Y / Triangle |
| Special | H | L | B / Circle |
| Throw | R | I | RB / R1 |
| Dash | Left Shift | Right Shift | RT / R2 |
| Pause / resume | Escape | Escape | Start |
| Reset Training (P1 only) | Backspace | — | View / Select on P1 |

These are the defaults. Open **Options → Controls & player assignments**, or **Pause → Control settings**, to edit separate P1/P2 profiles. Select a key or controller action, then press its replacement. Use the controller assigned to that player when capturing a button. A binding already used by the same player swaps places; keyboard keys already used by the other player are rejected with a conflict message. Escape cancels capture, and Start also cancels controller capture. Restore defaults resets both profiles.

Keyboard bindings, controller action buttons, and separate horizontal/vertical stick dead zones save automatically in `pdcf-controls-v1` in this browser. Thresholds range from 10–80%; defaults are 30% horizontal and 55% vertical. Raise them to filter drift; lower them for smaller stick movements. The vertical threshold controls stick jump/guard and menu navigation. Corrupt settings recover safe defaults. If storage is blocked, edits work for the current page session. Key labels use physical key positions (`KeyboardEvent.code`); alternate keyboard layouts may print different letters.

The control panel identifies each detected controller as P1 or P2. **Swap P1 / P2 controllers** exchanges devices while keeping profiles attached to their players. Assignments survive reconnects within the page session; a reload assigns detected controllers afresh. Bindings and dead zones persist across reloads. Reconnect first matches the index and ID, then the known device ID if its index changed. Identical IDs without a matching old index can be ambiguous; check P1/P2 labels and use Swap when needed. Standard-mapped devices are required.

Stick / D-pad directions, Up to jump, Down to guard, menu controls, Escape and Start remain fixed so remapping cannot remove navigation or pause. In controller menus, the D-pad navigates, A / Cross confirms, and B / Circle goes back. Release controls after joining or changing screens. Controllers retain their player slots across supported disconnect/reconnect flows. Unsupported mappings fall back to keyboard play.

Losing browser focus or disconnecting an assigned controller pauses the match. Interruptions during Options or a completed lesson stay paused after that menu closes and require explicit Resume; keyboard fallback remains available. Touch buttons cover P1 movement, guard, punch, kick, and special; throw and dash require a keyboard or controller. Some shared keyboards limit simultaneous key presses.

Open **Options** for independent music/effects levels; the note button toggles mute. Browsers may require a click or keyboard press to unlock audio even when a controller starts the match. Use **Enable audio** when prompted. Sound pauses with the game and resumes at its saved position; an audio failure leaves gameplay available. Result-screen music resumes when focus or visibility returns. Clicking an in-fight utility button returns focus to the arena; keyboard navigation of links and menus keeps its normal behavior. Training reset belongs to P1 and ignores key auto-repeat.

## Picture, motion and fullscreen

Open **Options → Picture & motion**, or **Pause → Picture & display** during a fight. **Motion** cycles through Follow system (the default), Reduced, and Full. Follow system responds to changes in the operating system's reduced-motion preference. Reduced motion freezes scenery and idle poses and disables shake and film effects; fighting speed, attack cues, throws and damage timing stay intact. Full motion lets you switch screen shake, film effects, and moving scenery individually. Switching back from Reduced restores those individual choices.

Visual preferences save automatically in `pdcf-visuals-v1`. Corrupt values fall back to safe defaults; blocked storage leaves the controls usable for the current session and displays a warning. The HUD stays outside the scaled 16:9 arena, with numeric health/ink readouts and readable labels. Menus have stronger text contrast, visible keyboard focus, and a skip link.

**Enter fullscreen** uses the browser's native fullscreen feature where available. Activate it with a click or Enter; virtual/controller clicks may need a keyboard or mouse gesture to satisfy the browser. Use the same button or the browser's Escape key to exit. Exiting during combat pauses the fight and clears held inputs; changing display settings from Pause leaves the fight paused until Resume. Fullscreen is not saved or entered automatically. Unsupported or denied fullscreen keeps windowed play available. This improves visual comfort and navigation; it is not a claim that the real-time Canvas game is fully screen-reader playable or formally accessibility-certified.

## Combat and cast

Open **Fighter moves** under the roster or **Fighter move lists** while paused. Browse all six fighters and select P1/P2 to display the current keyboard and controller bindings. Each list shows punch, kick, throw and signature move, unguarded base damage, startup/recovery in 60-fps frame notation, ink cost, and practical notes. Recovery includes the shared attack cooldown; projectile/spinach recovery begins at release. Projectile travel adds time before impact. Jump, guard, dash and combo guidance appears below the table. Closing a list returns to its parent menu without resuming a paused match.

Win two rounds to take a match. Each round lasts 60 seconds; the fighter with more health wins a timeout, and tied rounds award no wins. Each round begins with 35 ink. Hits and blocks build ink; specials cost 35 ink.

Combat includes buffered attacks, punch-to-kick/special cancels on hit, brief impact freezes, aerial punches/kicks, vulnerable directional dashes, and close-range throws that beat guard. A connected throw lifts and tosses the opponent through an arc, then knocks them down with a ground impact. The victim cannot act or take follow-up hits until recovery. Damage is applied once on the grab; the slam adds no extra damage. Killing throws finish their landing before the round ends. Combo counts restart when the opponent recovers or blocks. Fighter-specific startup, recovery, reach, and damage give each character a different feel; balance remains provisional.

| Fighter | Role | Signature move |
| --- | --- | --- |
| Mickey Mouse | All-rounder | Steamboat blast: steam projectile |
| Minnie Mouse | Speed | Charleston rush: close-range strike |
| Oswald the Lucky Rabbit | Reach | Lucky uppercut: extended melee strike |
| Felix the Cat | Trickster | Ink blot: ink projectile |
| Betty Boop | Ranged | Boop blast: sound projectile |
| Popeye | Power | Spinach power: heals up to 8 health and increases melee damage by 50% for 6 seconds |

These are original game mechanics. Each fighter also has an original Arcade ending, from Mickey's community tugboat voyage to Popeye's restored pier and community kitchen.

CPU opponents now use distinct tactics: Mickey mixes ranges, Minnie rushes in, Oswald controls reach, Felix uses ink and retreating feints, Betty zones with sound waves, and Popeye powers up before closing for heavy strikes and throws. **Fighter moves** explains each plan. Easy/Normal/Hard tune delayed observation, defense, attacks and hit confirms; fighter stats stay the same across difficulties. Training sparring remains Normal.

Startup interruptions display **COUNTER!**, and recovery hits display **PUNISH!**, with matching Training explanations and no bonus damage. Guard clangs have a separate shape, impact text has a light outline, and important audio cues take priority over swing clutter. Popeye's base damage and Oswald's kick timing have been tuned; move-list damage and timings reflect the current engine. See [combat balance and CPU notes](docs/combat-balance.md) for tactics, measurements and remaining playtest limits.

## Art and audio

The six transparent SVG atlases contain **288 discrete vector cels: 48 drawings per fighter**. Complete poses cover idle, walking, jumping, guarding, punching, kicking, specials, damage reactions, knockouts, victory, dashing, throwing, and aerial punches/kicks. They include held exposures, squash and stretch, anticipation, smears, recoil, blinks, and secondary motion. Impact drawings follow the simulation's active damage windows; blocked hits use a separate recoil pose.

This is script-authored digital vector cel-style animation. Portraits, gameplay, and endings share the same atlases. Open [the animation reel](animation-reel.html) to preview actions, mirror the cast, or scrub through drawings. The [older base-animation GIF](outputs/cel-animation-reel.gif) is an archival preview.

The four stages combine generated background paintings with native Canvas animation. Reduced motion freezes ambient animation and idle poses and disables camera shake and film movement while preserving combat telegraphs. The three newer paintings live in `assets/stages/`; their final built-in imagegen prompts are recorded in [scripts/stage-prompts.json](scripts/stage-prompts.json).

The scores use synthesized piano-, reed-, muted-brass-, bass-, banjo-, and calliope-style voices. Thirteen original Foley/stinger cues accompany combat and menus. No historic recordings, cartoon themes, downloaded samples, or live band recordings were imported. See [asset provenance](assets/provenance.md) for artwork sources and generation details.

## Development

The game uses native ES modules, Canvas 2D, Web Audio, and the Gamepad API. There are no installed runtime dependencies, accounts, or server-side game state. Google Fonts has a system-font fallback.

| Path | Responsibility |
| --- | --- |
| `engine.mjs` | DOM-free combat simulation, CPU behavior, roster, and move timing |
| `app.mjs` | Screens, keyboard/touch input, controller polling, sound, and the fixed 120 Hz simulation loop |
| `art.mjs` / `cels.mjs` | Scene rendering, atlas loading, and cel selection |
| `assets/runtime/` | Stage catalog/tour, Arcade progression/endings, controller input/assignment, saved bindings/control panel, move-list data, guided lessons/coaching, visual preferences, and audio playback/settings |
| `scripts/` | Source generators for checked-in SVG atlases and WAV files |
| `tests/` | Node regression tests and the browser-only outcome fixture |
| `controller-simulator.html` | Development harness for two virtual standard controllers |
| `animation-reel.html` / `reel.mjs` | Animation preview and scrubbing tool |
| `assets/beta.html` / `docs/beta-release.md` | Public beta limitations/feedback and the first prerelease notes |

Edit the generator sources before rebuilding their checked-in assets:

```sh
npm run art
npm run audio
```

`scripts/build-cels.mjs` authors the character drawings; `scripts/build-audio.mjs` contains the score, software instruments, and Foley synthesis. Both run locally without an image service or additional packages. See [AGENTS.md](AGENTS.md) for change boundaries and validation guidance.

## Validation

```sh
npm test
git diff --check
```

The current suite has **97 Node tests** covering combat, CPU tactics/reaction delays, seeded matchup reports and difficulty probes, round transitions, controllers, Training, Arcade progression/checkpoint validation, cel generation/timing, audio generation/lifecycle and stalled-output recovery, image failure/timeout/retry, shared atlas requests, build identity, visual preference validation/effect selection, and static packaging/link integrity. Stage regressions cover equal combat rules, Training/round resets, the Arcade venue tour and old checkpoints, distinct paintings, deterministic score generation, loop headroom, lazy loading, rapid music switches, and failure recovery. Tests use Node's built-in runner.

Run `npm run balance -- --seeds 12 --seed 1930 --json work/balance.json` for repeatable CPU matches across all 36 ordered pairings and three difficulties, plus mirror difficulty probes. Use `--difficulty normal` for one level. Reports include side results, attack mix, damage, combos and completion; they use the real engine and do not access player saves. These are diagnostics, not human matchup ratings. An independent CI balance job retains a two-seed `combat-simulations` JSON artifact; a failed simulation does not skip the browser matrix when the build succeeds.

With the server running, open [the controller simulator](http://127.0.0.1:4173/controller-simulator.html). Connect P1/P2 for manual checks, or click **Run controller checks** for **28 repeatable browser checks** covering menu navigation, stable mode/stage layout, both players, pause/resume, disconnect/reconnect, Training controls, all four stage choices, Arcade progression/venues/endings, saved visual settings, saved remapping for both players, key conflicts, dead zones, controller swapping, nested pause menus, storage failures, 390px dialog layout, throws from both controllers with mid-throw pause/resume, the complete guided course, remapped lesson prompts, retry/skip, and free-practice restoration. Buttons toggle held state; use **Release** after screen changes. The simulator suppresses iframe focus-loss pausing so its outer controls remain usable.

Arcade flow checks use `tests/fixtures/arcade-engine.mjs` to script timeout outcomes through the real round-resolution code. They verify progression and recovery, not human-played wins or difficulty balance. The harness restores the previous Arcade checkpoint, audio preferences, visual preferences, and control profiles afterward.

Browser checks have covered keyboard combat, two virtual controllers, Training readouts/options, Arcade resume/endings, audio settings, animation previews, and 390px menu/Training layout. The release suite also passes in local Chromium, Firefox, and WebKit builds. Physical controllers, physical touch devices, speaker listening, the branded Safari application, and sustained human balance testing remain unverified. Virtual pads do not establish hardware mappings, latency, or pairing behavior.

### Automated release checks and performance

`npm run check` runs Node tests, makes a clean `dist/` build, and verifies local links/anchors, module imports, stage/character assets, and excluded development files. The game and Node checks still need no dependency installation. The browser test runner is a pinned Playwright development dependency; install it with `npm ci`, then install the desired test browsers.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run check
npm run test:browser -- --project=chromium --project=firefox --project=webkit
```

For longer sessions, run `npm run test:soak -- --project=chromium` after building. The optional suite plays a real-time six-bout Arcade ladder, reloads the ending, completes three CPU and three local matches with rematches, then spars in Training for two minutes while pausing, opening nested menus and reconnecting a virtual controller. It retains `soak.json` with audio source/gain cleanup, bounded runtime state, DOM counts and frame measurements. It uses virtual-controller bots through the real input code, with no scripted victories or clock acceleration. This is automated endurance coverage; human balance, hardware and listening checks remain separate. See [release verification](docs/release-checks.md) for the command and measurement limits.

The nineteen browser scenarios per project cover the packaged game on every stage, pause/legal links, loading progress, missing/delayed assets, retry without losing selections or Training state, font/audio fallback and recovery, a stalled audio output with combat still usable, the reel, the full virtual-controller matrix, a 24-combination frame-timing pass, and five display/accessibility scenarios. The new scenarios cover saved and corrupt/blocked visual storage, system motion changes, keyboard/controller choices, every game mode at desktop/narrow/short sizes, health/ink readouts, native fullscreen entry/exit plus denial/unavailable fallbacks, focused-button combat for both keyboard players, one-shot P1 reset, result-screen audio focus/visibility, stalled score fetch recovery, native CPU combat for all six fighters, and counter/punish/guard/whiff feedback under reduced motion. `.github/workflows/release-checks.yml` runs build checks and Chromium, Firefox, WebKit, branded Chrome, and branded Edge projects on pushes/PRs to `main`, retaining reports and failure traces. The Firefox Linux job starts a PulseAudio null sink so its native Web Audio implementation has an output device; this does not establish speaker listening. WebKit coverage is not a claim of testing every Safari release or device.

Open [the performance pass](http://127.0.0.1:4173/tests/browser/performance.html) with the server running to measure all six fighters at all four venues. Its timings stay in the test page; it is excluded from production and adds no player telemetry. See [release verification and performance notes](docs/release-checks.md) for methodology, evidence, and hardware limits. GitHub Actions checks do not themselves gate the separately configured Cloudflare deployment or change branch-protection settings.

## Static hosting

The existing [release](https://pdcf.aaronfaby.com) uses Cloudflare Workers with GitHub builds on pushes to `main`. The build/deploy settings are managed in the Cloudflare dashboard; this repository contains no Wrangler configuration or deployment workflow.

Set the Cloudflare dashboard **Build command** to:

```sh
npm run check
```

This runs tests, makes a clean static build, stamps the footer with its commit ID, and checks local references. Replace the older `npm test && ... cp ...` command: a plain copy leaves the footer marked **Local development**. Keep the existing deploy command targeting `dist/`. This repository change does not alter the dashboard configuration.

The build uses Cloudflare's [`WORKERS_CI_COMMIT_SHA`](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#default-variables), falling back to the local Git HEAD. It shows **Unversioned build** if neither is available, and rejects malformed commit metadata. It never asks GitHub for the latest commit at runtime, so an old page cannot label itself as the latest release.

Serve `dist/` as static assets. Keep the relative directory structure: runtime modules under `assets/runtime/` import the root engine. New root runtime files must be added to `ROOT_FILES` in `scripts/build.mjs`. The simulator, tests/fixtures, generators, repository development docs, and development server are excluded. The named public information pages and asset provenance are included through `ASSET_FILES`. Do not use `server.mjs` as a production backend or commit the generated `dist/` directory.

Builds copy only `ROOT_FILES` and `ASSET_FILES` from `scripts/build.mjs`; add new runtime helpers to that asset manifest. The manifest derives fighter, venue and audio asset names from their catalogs. Unlisted local metadata and assets stay out. Build checks reject extra/missing files (including Foley WAVs), verify static and literal dynamic import targets, and reject a Cloudflare revision that differs from an available Git checkout. See [issue #1 validation](docs/issue-1-review.md) for the review findings and regressions.

Pushing starts the configured deployment; verify its result separately before reporting a release as live.

## Character references and rights

The 1930s/1940s influence describes the presentation, not a blanket right to use later character versions. Intended references are early Mickey and Minnie (1928), Oswald (1927–1928), silent-era Felix, Betty's early dog-eared 1930 design, and Segar's original Popeye comic character (1929–1930). Modern character assets, studio logos, cartoon recordings, and theme songs have not been imported.

- [Duke Law: Mickey, Minnie, copyright, and trademark](https://cspd.law.duke.edu/mickey/)
- [Duke Law: 2024 public domain, including Oswald](https://cspd.law.duke.edu/publicdomainday/2024)
- [1919 Feline Follies film and public-domain notice](https://commons.wikimedia.org/wiki/File:FelixTheCat-1919-FelineFollies_silent.ogv)
- [Duke Law: original Popeye and research into spinach copyrights](https://cspd.law.duke.edu/publicdomainday/2025)
- [Duke Law: 1930 Betty Boop and character-version distinctions](https://cspd.law.duke.edu/publicdomainday/2026)

Popeye's spinach mechanic relies on Duke's finding that the relevant 1931 strip appears not to have been renewed. Those 1931 materials enter the U.S. public domain by ordinary term expiration on January 1, 2027. No independent renewal search, character-design clearance, trademark clearance, or international-rights review has been performed. Check the finished art and branding before commercial distribution.

## Remaining work

Beta feedback now guides combat readability, Easy-to-Hard progression, match balance, and repeat-play appeal. The public [limitations page](assets/beta.html) tracks current coverage gaps. Online multiplayer and a larger story campaign remain future work. Art direction, accessibility, browser/device coverage, controller calibration, speaker listening, and sustained balance playtests still need production review.
