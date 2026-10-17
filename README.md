# Public Domain Cartoon Fighters

A playable first version of a traditional, side-view 2D fighter: six cartoon stars, rubber-hose animation, a painted harbor stage, and a warm black-and-white theatrical presentation.

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
| Pause / resume | Escape | Escape |

Touch buttons support player one. Local two-player requires a keyboard; some keyboards limit simultaneous key presses. Losing browser focus automatically pauses the match. Sound effects are synthesized in the browser and can be enabled with the music-note button.

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

The cast uses **216 discrete vector cels**, with 36 drawings per character stored in six transparent SVG sprite atlases. The renderer selects complete drawings for idle, walking, jumping, guarding, punching, kicking, signature moves, damage reactions, knockouts, and victory. It no longer interpolates a shared live character rig.

The animation includes held poses, squash and stretch, blinks, attack anticipation and smears, recoil, landing compression, and secondary motion in ears, tails, hats, and skirts. Attack impact drawings follow the simulation's active damage windows; blocked hits have their own recoil pose. Idle motion respects the reduced-motion preference. Roster portraits, the arena, and the winner screen all use the same artwork.

Open [the animation reel](animation-reel.html) to compare all six characters, preview individual actions, mirror the cast, or scrub through the drawings. A standalone animated overview is available at [outputs/cel-animation-reel.gif](outputs/cel-animation-reel.gif).

The cels are script-authored SVG illustrations, using shared ink-drawing helpers and character-specific exposure poses. This is digital vector cel-style animation, not a claim that 216 frames were independently drawn by a human animator. Two Imagegen sprite-sheet requests were rejected, so no generated sprite artwork was used. The existing harbor background was generated with Imagegen; its prompt and the character artwork provenance are recorded in [assets/provenance.md](assets/provenance.md).

Edit `scripts/build-cels.mjs`, then regenerate the checked-in atlases with:

```sh
npm run art
```

No art-generation dependency or image service is needed to run or rebuild these SVG atlases. The asset loader validates all 36 cells and registers the drawings to a fixed origin so attack silhouettes do not move the character's planted feet.

The 1930s/1940s influence describes the presentation, not a blanket right to use later character versions. Intended references are early Mickey and Minnie (1928), Oswald (1927–1928), silent-era Felix, Betty's early dog-eared 1930 design, and Segar's original Popeye comic character (1929–1930). Modern character assets, studio logos, cartoon recordings, and theme songs have not been imported.

- [Duke Law: Mickey, Minnie, copyright, and trademark](https://cspd.law.duke.edu/mickey/)
- [Duke Law: 2024 public domain, including Oswald](https://cspd.law.duke.edu/publicdomainday/2024)
- [1919 Feline Follies film and public-domain notice](https://commons.wikimedia.org/wiki/File:FelixTheCat-1919-FelineFollies_silent.ogv)
- [Duke Law: original Popeye and research into spinach copyrights](https://cspd.law.duke.edu/publicdomainday/2025)
- [Duke Law: 1930 Betty Boop and character-version distinctions](https://cspd.law.duke.edu/publicdomainday/2026)

Popeye's spinach mechanic relies on Duke's finding that the relevant 1931 strip appears not to have been renewed. Those 1931 materials enter the U.S. public domain by ordinary term expiration on January 1, 2027. No independent renewal search, character-design clearance, trademark clearance, or international-rights review has been performed. Check the finished art and branding before commercial distribution.

## Scope

This version runs entirely in the browser, with no account, server-side game state, or installed runtime dependencies. Google Fonts enhances the typography when online; system fonts provide an offline fallback. It includes CPU play and local two-player, one stage, synthesized sound effects, pause, rematches, keyboard/touch controls, and the cel animation reel. Online multiplayer, gamepad support, and a story campaign are not included. The artwork and combat balance still need sustained art-direction and playtesting review.

`engine.mjs` owns the deterministic simulation; `cels.mjs` loads the atlases and selects animation drawings; `art.mjs` draws the cast and stage; `app.mjs` connects input, screens, sound, and the fixed simulation timestep. The Node server is a localhost development preview. The static files can be hosted on any ordinary static server. Nothing has been deployed.

## Verification

The 18 Node tests cover single-hit attacks, guard damage, jump avoidance, ink costs, projectiles, Popeye's healing and temporary boost, simultaneous knockouts, stage boundaries, round resets, completed matches for all six fighters, all 216 distinct cel drawings, active-frame synchronization, block recoil, jump/landing selection, reverse walking, victory/defeat holds, reduced motion, and atlas-bound validation. All JavaScript modules pass Node syntax checks.

Browser checks covered roster changes, CPU combat, both keyboard players, Popeye's special, touch-button event handling, pause/resume, a complete CPU match, the winner dialog, rematch reset, and the instructions dialog. Layout was checked at 390-pixel phone and 1280-pixel desktop widths, with no horizontal overflow or browser console errors. Physical touch devices, speakers, gamepads, and additional browsers were not tested. Balance has not received a sustained human playtest.
