# Public Domain Cartoon Fighters

A browser-based, side-view 2D fighter with six cartoon stars, rubber-hose animation, original swing music, and a warm black-and-white theatrical presentation. Play Arcade, Training, single CPU matches, or local two-player on the animated Ink Harbor stage.

**[Play the game](https://pdcf.aaronfaby.com)** · [Contributor guidance](AGENTS.md) · [Asset provenance](assets/provenance.md)

## Run locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
npm start
```

Open [the local game](http://127.0.0.1:4173), choose a mode and fighter, then start. CPU, Local, and Training let you choose both roster slots, including mirror matches. The development server binds only to localhost.

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

One checkpoint is stored per browser and device; a new run replaces it. If browser storage is unavailable, the run remains playable while the page stays open. Audio preferences are saved separately.

Difficulty changes CPU reactions and decisions, including guarding, evasion, attacks, throws, dashes, and hit-confirm combos. Fighter health, speed, and damage remain equal across settings. Later ladder bouts shorten CPU decision intervals slightly. Training uses normal CPU behavior.

### Training

Choose your fighter and practice dummy, then start immediately in jab range with an endless clock. Open **Practice options** below the arena or from the pause menu.

- Set the dummy to stand, guard, jump repeatedly, or spar with the CPU.
- Health recovery prevents knockouts and restores health after each string. Turn it off to practice knockouts; the bout resets without awarding rounds.
- Unlimited ink keeps both meters full. Turn it off for normal costs and meter gain.
- Inspect last-hit damage, uninterrupted combo hits/damage, attack phase/startup timing, and the last eight P1 inputs. Timings use 60-fps frame notation; held directions do not flood the history.
- **Backspace**, controller **View / Select**, or **Reset** clears combat state and readouts while keeping the chosen cast and practice settings.

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
| Reset Training | Backspace | — | View / Select |

In controller menus, the D-pad navigates, A / Cross confirms, and B / Circle goes back. Release controls after joining or changing screens. Controllers retain their player slots across supported disconnect/reconnect flows. Unsupported mappings fall back to keyboard play.

Losing browser focus or disconnecting an assigned controller pauses the match. Touch buttons cover P1 movement, guard, punch, kick, and special; throw and dash require a keyboard or controller. Some shared keyboards limit simultaneous key presses.

Open **Options** for independent music/effects levels; the note button toggles mute. Browsers may require a click or keyboard press to unlock audio even when a controller starts the match. Use **Enable audio** when prompted. Sound pauses with the game and resumes at its saved position; an audio failure leaves gameplay available.

## Combat and cast

Win two rounds to take a match. Each round lasts 60 seconds; the fighter with more health wins a timeout, and tied rounds award no wins. Each round begins with 35 ink. Hits and blocks build ink; specials cost 35 ink.

Combat includes buffered attacks, punch-to-kick/special cancels on hit, brief impact freezes, aerial punches/kicks, vulnerable directional dashes, and close-range throws that beat guard. Combo counts restart when the opponent recovers or blocks. Fighter-specific startup, recovery, reach, and damage give each character a different feel; balance remains provisional.

| Fighter | Role | Signature move |
| --- | --- | --- |
| Mickey Mouse | All-rounder | Steamboat blast: steam projectile |
| Minnie Mouse | Speed | Charleston rush: close-range strike |
| Oswald the Lucky Rabbit | Reach | Lucky uppercut: extended melee strike |
| Felix the Cat | Trickster | Ink blot: ink projectile |
| Betty Boop | Ranged | Boop blast: sound projectile |
| Popeye | Power | Spinach power: heals up to 8 health and increases melee damage by 50% for 6 seconds |

These are original game mechanics. Each fighter also has an original Arcade ending, from Mickey's community tugboat voyage to Popeye's restored pier and community kitchen.

## Art and audio

The six transparent SVG atlases contain **288 discrete vector cels: 48 drawings per fighter**. Complete poses cover idle, walking, jumping, guarding, punching, kicking, specials, damage reactions, knockouts, victory, dashing, throwing, and aerial punches/kicks. They include held exposures, squash and stretch, anticipation, smears, recoil, blinks, and secondary motion. Impact drawings follow the simulation's active damage windows; blocked hits use a separate recoil pose.

This is script-authored digital vector cel-style animation. Portraits, gameplay, and endings share the same atlases. Open [the animation reel](animation-reel.html) to preview actions, mirror the cast, or scrub through drawings. The [older base-animation GIF](outputs/cel-animation-reel.gif) is an archival preview.

Ink Harbor combines a generated background painting with Canvas tugboat, steam, water, gull, and lantern animation. Reduced motion freezes ambient animation and idle poses and disables camera shake and film movement while preserving combat telegraphs.

**Ink Harbor Stomp** is an original 32-bar, 144 BPM swing arrangement with synthesized piano-, reed-, muted-brass-, bass-, and banjo-style voices. Thirteen original Foley/stinger cues accompany combat and menus. No historic recordings, cartoon themes, downloaded samples, or live band recordings were imported. See [asset provenance](assets/provenance.md) for artwork sources and generation details.

## Development

The game uses native ES modules, Canvas 2D, Web Audio, and the Gamepad API. There are no installed runtime dependencies, accounts, or server-side game state. Google Fonts has a system-font fallback.

| Path | Responsibility |
| --- | --- |
| `engine.mjs` | DOM-free combat simulation, CPU behavior, roster, and move timing |
| `app.mjs` | Screens, keyboard/touch input, controller polling, sound, and the fixed 120 Hz simulation loop |
| `art.mjs` / `cels.mjs` | Scene rendering, atlas loading, and cel selection |
| `assets/runtime/` | Arcade progression/endings, controller handling, and audio playback/settings |
| `scripts/` | Source generators for checked-in SVG atlases and WAV files |
| `tests/` | Node regression tests and the browser-only Arcade outcome fixture |
| `controller-simulator.html` | Development harness for two virtual standard controllers |
| `animation-reel.html` / `reel.mjs` | Animation preview and scrubbing tool |

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

The current suite has **43 Node tests** covering combat, CPU matches, round transitions, controllers, Training, Arcade progression/checkpoint validation, cel generation/timing, and audio generation/lifecycle. Tests use Node's built-in runner.

With the server running, open [the controller simulator](http://127.0.0.1:4173/controller-simulator.html). Connect P1/P2 for manual checks, or click **Run controller checks** for **13 repeatable browser checks** covering menu navigation, both players, pause/resume, disconnect/reconnect, Training controls, and Arcade progression/endings. Buttons toggle held state; use **Release** after screen changes. The simulator suppresses iframe focus-loss pausing so its outer controls remain usable.

Arcade flow checks use `tests/fixtures/arcade-engine.mjs` to script timeout outcomes through the real round-resolution code. They verify progression and recovery, not human-played wins or difficulty balance. The harness restores the previous Arcade checkpoint and audio preferences afterward.

Browser checks have covered keyboard combat, two virtual controllers, Training readouts/options, Arcade resume/endings, audio settings, and animation previews. Physical controllers, physical touch devices, speaker listening, Safari/Firefox, mobile Training layout, and sustained human balance testing remain unverified. Virtual pads do not establish hardware mappings, latency, or pairing behavior.

## Static hosting

The existing [release](https://pdcf.aaronfaby.com) uses Cloudflare Workers with GitHub builds on pushes to `main`. The build/deploy settings are managed in the Cloudflare dashboard; this repository contains no Wrangler configuration or deployment workflow.

The current build command runs tests and copies an explicit set of static files:

```sh
npm test && mkdir -p dist && cp index.html animation-reel.html style.css app.mjs art.mjs cels.mjs engine.mjs reel.mjs dist/ && cp -R assets dist/
```

Serve `dist/` as static assets. Keep the relative directory structure: runtime modules under `assets/runtime/` import the root engine. New root runtime files must be added to the copy command. The simulator, tests/fixtures, generators, documentation, and development server are excluded. Do not use `server.mjs` as a production backend or commit the generated `dist/` directory.

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

There is currently one stage. Additional stages, online multiplayer, and a larger story campaign are future work. Art direction, accessibility, browser/device coverage, controller calibration, audio listening, and sustained balance playtests still need production review.
