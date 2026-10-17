# Public Domain Cartoon Fighters

A browser-based, side-view 2D fighter: six cartoon stars, rubber-hose animation, a painted harbor stage, and a warm black-and-white theatrical presentation.

## Ink Harbor milestone

The featured **Mickey versus Popeye** bout adds buffered attacks, punch-to-kick/special hit-confirm cancels, brief impact freezes, combo callouts, aerial punches/kicks, vulnerable directional dashes, and close-range throws that beat guard. Mickey has a faster jab; Popeye has slower, heavier normals. CPU opponents can react to projectiles, dash into range, and throw guarded opponents.

Ink Harbor now includes a chugging tugboat, rising steam, moving water highlights, gulls, and a lantern glow. Reduced motion freezes the ambient animation and disables camera shake and film movement. All six fighters have the expanded animation set.

An original 32-bar, 144 BPM swing arrangement, **Ink Harbor Stomp**, accompanies the menus and fights. Thirteen original rendered sound cues replace the live oscillator effects. Music and effects have independent saved levels and a mute control. Audio starts after a player interaction, pauses when a match or tab loses focus, and resumes at its saved position. Audio failure leaves gameplay available.

## Training and combat polish

Select **Training** in the mode picker, choose your fighter and practice dummy using the roster slots, then start. Practice begins immediately with an endless clock and the fighters in jab range. **Practice options** is available below the arena and in the pause menu.

- The dummy can stand, guard, jump repeatedly, or spar using the normal CPU logic.
- Health recovery prevents knockouts and restores health once a string ends. Switch it off to practice knockouts; the bout resets automatically without awarding rounds.
- Unlimited ink keeps both meters full. Switch it off for normal special costs and meter gain.
- Last-hit damage, uninterrupted combo hits/damage, attack phase/startup timing, and the last eight P1 inputs appear beneath the arena. Timing is shown in 60-fps frame notation. Held directions do not flood the input history.
- **Backspace**, controller **View / Select**, or **Reset** clears positions, health, ink, attacks, projectiles, buffs, stats, and input history. Your chosen cast and practice settings stay in place.

Combo counts restart when the opponent has recovered or blocks a strike. Minnie has faster normals, Oswald trades startup/recovery for reach, Felix has a quicker jab, Betty has a quicker defensive kick, and Popeye retains his slower heavy blows. Heavy impacts and throws have distinct bursts and callouts. These are initial tuning choices, not a claim of competitive balance.

All six fighters now have dedicated dash, throw, aerial punch, and aerial kick cels. Minnie's skirt/footwork, Oswald's ears/long limbs, Felix's tail/crouched dash, and Betty's compact footwork have individual exposure poses. The animation reel previews all 288 drawings.

## Run

Requires Node.js 22 or newer. No package installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173. Select your fighter, select the CPU opponent or player two, and click **Let’s make a scene**. The selection screen supports mirror matches. Choose **2 players / Local** for a shared-keyboard match.

```sh
npm test
```

## Controls

| Action | Player one | Player two |
| --- | --- | --- |
| Move | A / D | Left / Right arrows |
| Jump | W | Up arrow |
| Guard | Hold S | Hold Down arrow |
| Punch | F | J |
| Kick | G | K |
| Special | H | L |
| Throw | R | I |
| Dash | Left Shift | Right Shift |
| Pause / resume | Escape | Escape |

Touch buttons support player one’s original moves. Local two-player supports a shared keyboard or two controllers; some keyboards limit simultaneous key presses. Losing browser focus or disconnecting an assigned controller pauses the match.

Standard-mapped Xbox and PlayStation controllers use the stick/D-pad to move, A/cross to jump, X/square to punch, Y/triangle to kick, B/circle for special, LB/L1 to guard, RB/R1 to throw, RT/R2 to dash, and Start to pause/resume. A confirms in menus; B goes back; the D-pad navigates. Release controls after joining or changing screens. Browsers may require a click or keyboard press to unlock sound even when the match is started with a controller; an Enable audio prompt appears when needed. Controllers retain their player slots when another controller disconnects. Unsupported mappings fall back to keyboard play.

Open **Options** to adjust music and effects; the note button toggles mute. Sound preferences are stored locally when browser storage is available.

Win two rounds. Each round lasts 60 seconds; the fighter with more health wins a timeout, and tied rounds award no wins. Every round begins with 35 ink. Hits and blocks build ink, and signature moves cost 35 ink.

## Cast

| Fighter | Role | Signature move |
| --- | --- | --- |
| Mickey Mouse | All-rounder | Steamboat blast: steam projectile |
| Minnie Mouse | Speed | Charleston rush: close-range strike |
| Oswald the Lucky Rabbit | Reach | Lucky uppercut: extended melee strike |
| Felix the Cat | Trickster | Ink blot: ink projectile |
| Betty Boop | Ranged | Boop blast: sound projectile |
| Popeye | Power | Spinach power: heals up to 8 health and increases melee damage by 50% for 6 seconds |

These are original game mechanics, not claims about the historic cartoons.

## Art and character references

The cast uses **288 discrete vector cels**, with 48 drawings per fighter stored in six transparent SVG sprite atlases. The renderer selects complete drawings for idle, walking, jumping, guarding, punching, kicking, signature moves, damage reactions, knockouts, and victory. All six fighters also have dedicated dash, throw, aerial punch, and aerial kick drawings. It no longer interpolates a shared live character rig.

The animation includes held poses, squash and stretch, blinks, attack anticipation and smears, recoil, landing compression, and secondary motion in ears, tails, hats, and skirts. Attack impact drawings follow the simulation's active damage windows; blocked hits have their own recoil pose. Idle motion respects the reduced-motion preference. Roster portraits, the arena, and the winner screen all use the same artwork.

Open [the animation reel](animation-reel.html) to compare all six characters, preview individual actions, mirror the cast, or scrub through the drawings. An earlier standalone overview of the base animations is available at [outputs/cel-animation-reel.gif](outputs/cel-animation-reel.gif).

The cels are script-authored SVG illustrations, using shared ink-drawing helpers and character-specific exposure poses. This is digital vector cel-style animation, not a claim that 288 frames were independently drawn by a human animator. Two Imagegen sprite-sheet requests were rejected, so no generated sprite artwork was used. The existing harbor background was generated with Imagegen; its prompt and the character artwork provenance are recorded in [assets/provenance.md](assets/provenance.md).

Edit `scripts/build-cels.mjs`, then regenerate the checked-in atlases with:

```sh
npm run art
```

No art-generation dependency or image service is needed to run or rebuild these SVG atlases. The asset loader validates all 48 cells and registers the drawings to a fixed origin so attack silhouettes do not move the character's planted feet.

The 1930s/1940s influence describes the presentation, not a blanket right to use later character versions. Intended references are early Mickey and Minnie (1928), Oswald (1927–1928), silent-era Felix, Betty's early dog-eared 1930 design, and Segar's original Popeye comic character (1929–1930). Modern character assets, studio logos, cartoon recordings, and theme songs have not been imported.

- [Duke Law: Mickey, Minnie, copyright, and trademark](https://cspd.law.duke.edu/mickey/)
- [Duke Law: 2024 public domain, including Oswald](https://cspd.law.duke.edu/publicdomainday/2024)
- [1919 Feline Follies film and public-domain notice](https://commons.wikimedia.org/wiki/File:FelixTheCat-1919-FelineFollies_silent.ogv)
- [Duke Law: original Popeye and research into spinach copyrights](https://cspd.law.duke.edu/publicdomainday/2025)
- [Duke Law: 1930 Betty Boop and character-version distinctions](https://cspd.law.duke.edu/publicdomainday/2026)

Popeye's spinach mechanic relies on Duke's finding that the relevant 1931 strip appears not to have been renewed. Those 1931 materials enter the U.S. public domain by ordinary term expiration on January 1, 2027. No independent renewal search, character-design clearance, trademark clearance, or international-rights review has been performed. Check the finished art and branding before commercial distribution.

## Scope

This version runs entirely in the browser, with no account, server-side game state, or installed runtime dependencies. Google Fonts enhances the typography when online; system fonts provide an offline fallback. It includes Training mode, CPU play and local two-player, one animated stage, original swing music and Foley, pause, rematches, keyboard/touch/controller controls, audio options, and the cel animation reel. Arcade progression, additional stages, online multiplayer, and a story campaign belong to later milestones. The artwork and combat balance still need sustained art-direction and playtesting review.

`engine.mjs` owns the deterministic simulation; `cels.mjs` loads the atlases and selects animation drawings; `art.mjs` draws the cast and stage; `app.mjs` connects input, screens, sound, and the fixed simulation timestep. The Node server is a localhost development preview. The static files can be hosted on any ordinary static server. The existing release is hosted at [pdcf.aaronfaby.com](https://pdcf.aaronfaby.com); new local changes require a commit and push to reach that deployment. Runtime audio/controller modules and WAV assets live under `assets/`, so the current Cloudflare build command already copies them.

## Verification

The 37 Node tests cover single-hit attacks, guard damage, jump avoidance, ink costs, projectiles, Popeye's healing and temporary boost, simultaneous knockouts, stage boundaries, round resets, completed matches for all six fighters, all 288 distinct cel drawings, active-frame synchronization, block recoil, jump/landing selection, reverse walking, victory/defeat holds, reduced motion, and atlas-bound validation. They also cover controller slot stability (including reverse-order reconnect), neutral arming and pending edges, hitstop and combo transitions, throws, dashes, buffered input expiry, audio lifecycle/failure recovery, preference validation, deterministic audio regeneration, endless training, dummy behavior, practice resets/options, health recovery and KO resets, bounded input history, combo damage, and the expanded animation states for all six fighters. All JavaScript modules pass Node syntax checks.

Earlier browser checks covered roster changes, CPU combat, both keyboard players, Popeye's special, touch-button event handling, pause/resume, a complete CPU match, the winner dialog, rematch reset, and the instructions dialog. Layout was checked at 390-pixel phone and 1280-pixel desktop widths, with no horizontal overflow or browser console errors. Physical touch devices, speakers, gamepads, and additional browsers were not tested. Balance has not received a sustained human playtest.

## Audio authoring

Rebuild the checked-in mono 22,050 Hz / 16-bit WAV assets with:

```sh
npm run audio
```

`scripts/build-audio.mjs` contains the original melody, harmony, swung rhythm arrangement, software instrument voices, percussion, and Foley synthesis. The track uses piano-, reed-, muted-brass-, bass-, and banjo-style voices; these are synthesized instruments, not a live band recording. No historic recordings, cartoon themes, downloaded samples, or additional runtime packages are used.

Milestone browser verification covered the featured CPU match, keyboard combat, audio loading and saved volume settings, and two virtual standard gamepads controlling local versus. Virtual controller checks included menu confirm/back, stable player slots, one-shot attacks, disconnect pause, reconnect, and Start resume. The expanded atlas was also rasterized: all 288 cels are unique and have clear cell margins. Physical controllers, speaker listening, Safari/Firefox, and sustained human balance sessions remain unverified.

## Virtual controller simulator

With `npm start` running, open [the local controller simulator](http://127.0.0.1:4173/controller-simulator.html). Connect P1/P2, wait for the ready status, select Local mode, and launch the featured bout. Buttons toggle held/released state; dark buttons are held. Use Release after changing screens. Disconnect a pad to test the recovery flow. This exercises the normal Gamepad input path through virtual devices; hardware pairing, real mappings, latency and vibration still require physical devices. The simulator suppresses iframe focus-loss pausing so its outer controls remain usable. It is a development tool and is excluded from the current production copy command.

Click **Run controller checks** for nine repeatable browser checks covering both players' movement/attacks, menu navigation, confirm/back, volume adjustment, local mode, pausing, frozen health/clock, returning to the roster, both disconnects, held-button reconnect, and reverse-order reconnect. These checks run the real game with virtual pads and a controlled frame clock, then restore normal speed and the previous audio preferences. This pass reproduced and fixed returning controllers changing player slots and a buffered pre-pause attack firing after resume; the browser checks now pass, including both regressions and Training mode controller options/reset.

Training browser verification covered keyboard punch feedback and Backspace reset, all four dummy behaviors, practice options and controller reset, combo damage readouts, returning from Training to normal CPU rounds, and mirrored throw/aerial poses in the animation reel. All nine simulator checks pass. The new Training screen was checked in the desktop in-app browser; physical controllers, other browsers, and mobile Training layout remain unverified.
