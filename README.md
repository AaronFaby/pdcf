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

Character art is drawn and animated directly in Canvas, so poses and attacks can be changed without replacing sprite sheets. It is a first-pass stylization, not final cel animation. The background was generated using the built-in Imagegen tool; its prompt is recorded in [assets/provenance.md](assets/provenance.md).

The 1930s/1940s influence describes the presentation, not a blanket right to use later character versions. Intended references are early Mickey and Minnie (1928), Oswald (1927–1928), silent-era Felix, Betty's early dog-eared 1930 design, and Segar's original Popeye comic character (1929–1930). Modern character assets, studio logos, cartoon recordings, and theme songs have not been imported.

- [Duke Law: Mickey, Minnie, copyright, and trademark](https://cspd.law.duke.edu/mickey/)
- [Duke Law: 2024 public domain, including Oswald](https://cspd.law.duke.edu/publicdomainday/2024)
- [1919 Feline Follies film and public-domain notice](https://commons.wikimedia.org/wiki/File:FelixTheCat-1919-FelineFollies_silent.ogv)
- [Duke Law: original Popeye and research into spinach copyrights](https://cspd.law.duke.edu/publicdomainday/2025)
- [Duke Law: 1930 Betty Boop and character-version distinctions](https://cspd.law.duke.edu/publicdomainday/2026)

Popeye's spinach mechanic relies on Duke's finding that the relevant 1931 strip appears not to have been renewed. Those 1931 materials enter the U.S. public domain by ordinary term expiration on January 1, 2027. No independent renewal search, character-design clearance, trademark clearance, or international-rights review has been performed. Check the finished art and branding before commercial distribution.

## Scope

This first version runs entirely in the browser, with no account, server-side game state, or installed runtime dependencies. Google Fonts enhances the typography when online; system fonts provide an offline fallback. It includes CPU play and local two-player, one stage, synthesized sound effects, pause, rematches, and keyboard/touch controls. Online multiplayer, gamepad support, a story campaign, and final production animation are not included.

`engine.mjs` owns the deterministic simulation; `art.mjs` draws the cast and stage; `app.mjs` connects input, screens, sound, and the fixed simulation timestep. The Node server is a localhost development preview. The static files can be hosted on any ordinary static server. Nothing has been deployed.

## Verification

The 11 Node simulation tests pass, including single-hit attacks, guard damage, jump avoidance, ink costs, projectiles, Popeye's healing and temporary boost, simultaneous knockouts, stage boundaries, round resets, and completed matches for all six fighters. All JavaScript modules pass Node syntax checks.

Browser checks covered roster changes, CPU combat, both keyboard players, Popeye's special, touch-button event handling, pause/resume, a complete CPU match, the winner dialog, rematch reset, and the instructions dialog. Layout was checked at 390-pixel phone and 1280-pixel desktop widths, with no horizontal overflow or browser console errors. Physical touch devices, speakers, gamepads, and additional browsers were not tested. Balance has not received a sustained human playtest.
