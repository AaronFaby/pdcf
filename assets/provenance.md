# Asset provenance

This inventory covers the art, animation, music, Foley and ending stories used by desktop Beta 1 (`v0.1.0-beta.1`). The beta notice and documentation introduce no new character artwork, recordings or generated backgrounds. Existing sources and prompts below are retained. Provenance documents authorship and inputs; character-version and branding clearance remain separate work described in [the legal notices](legal.html). See [beta limitations](beta.html) for current release coverage.

## Ink Harbor background

- Asset: `ink-harbor.png`
- Created for this project with the built-in Imagegen tool on October 16, 2026.
- Character animation and portraits are authored in `scripts/build-cels.mjs`, not extracted from this image or historic cartoons.

### Final generation prompt

Use case: stylized-concept. Asset type: painted background for a playable 2D cartoon fighting game, wide landscape 1536x1024. Create an exquisite vintage 1930s black-and-white rubber-hose animation background painting of a whimsical harbor boardwalk at twilight. Slight warm ivory/sepia paper with charcoal ink and soft grayscale wash, lovingly hand-painted film background, old theatrical cartoon, elegant atmospheric depth. At left a crooked bait-and-tackle shack and tied ropes; at right a huge moored steamboat with smoking crooked chimneys and lifebuoy; distant waterfront skyline, moon, cloudy sky, gently rippling water. No characters, no people, no faces. Main horizontal fighting surface is a broad flat wooden pier spanning the entire width near the bottom quarter, with perspective floorboards, leave center completely clear for two fighters. Side-on game camera, horizon at mid-height. Beautiful theatrical composition with busy edges and clear center; rich tactile paper grain and hand-painted shading; ink-black darkest values confined to edges so bright foreground character silhouettes are readable. No text, no lettering, no logos, no UI, no frames. Finished game production art, not a mockup, no colored elements.

## Vector cel artwork — October 17, 2026

The six files in `assets/cels/` contain 48 distinct full-pose drawings per character (six 6 × 8 atlases, 288 total). They are authored as native SVG paths by `scripts/build-cels.mjs`. The source contains exposure poses, cleanup shapes, expressions, and motion accents. Shared drawing helpers keep the palette and line work consistent; individual character profiles control proportions and movement. No historic cartoon frames, modern game sprites, downloaded character images, or generated sprite-sheet output were imported.

The built-in Imagegen tool rejected two attempts to create a Mickey sprite sheet. No resulting images were saved or used, and the API-key-based CLI fallback was not invoked. The vector cel artwork was created directly in the project instead. It should be described as script-authored vector cel-style animation, rather than human-painted traditional animation.

The atlas row order is: six idle drawings; six walking drawings; three jump and three guard drawings; three punch and three kick drawings; four special and two hurt drawings; three knockout and three victory drawings; three each for dash, throw, aerial punch, and aerial kick. Complete silhouettes are registered to a shared per-character origin at runtime; falling poses use their lower silhouette edge to stay on the floor. The same atlases supply portraits and gameplay.

## Ink Harbor milestone audio and scenery

`assets/audio/ink-harbor.wav` is an original 32-bar swing arrangement authored in `scripts/build-audio.mjs`, rendered with original software instrument voices. The same script authors thirteen original Foley/stinger WAVs. No third-party compositions, samples, soundfonts, character voices, cartoon themes, or historic recordings were imported. These are synthesized period-inspired assets, not a recording of live musicians.

The animated tugboat, steam, water glints, gulls and lantern glow are native Canvas artwork in `art.mjs`, composited over the existing generated harbor painting. The expanded cels for all six fighters are authored in the existing SVG drawing source, with character-specific poses for the four newly expanded fighters. No additional generated images were used.

## Arcade character endings

The six two-part ending stories in `assets/runtime/arcade.mjs` are original fictional vignettes written for this game. The ladder and ending screens use the existing vector character atlases and original UI styling. No historic dialogue, film stills, third-party stories, new generated images, or additional music recordings were imported.

## Stage expansion — October 17, 2026

Three new 1672 × 941 background paintings were generated for this project with the built-in imagegen tool, then copied unchanged into the repository:

- `assets/stages/silverscreen-theater.png`: an empty vaudeville theater with proscenium, balconies, blank silver screen, footlights, and wooden stage.
- `assets/stages/moonlight-midway.png`: a moonlit carnival with tents, bunting, carousel, and open boardwalk.
- `assets/stages/midnight-junction.png`: a steam-era station with canopy, blank clock, misty rear tracks, and a stone platform.

The exact final generation prompts are in `scripts/stage-prompts.json`. No reference images, historic frames, characters, text, or studio marks were supplied or imported. These are generated background illustrations, not paintings by a human background artist.

`art.mjs` supplies original native Canvas overlays: theater spotlight sweeps, curtain movement, reel projection, dust and footlight glows; a rotating Ferris wheel with upright gondolas, balloons and carousel bulb chase; a passing train with moving wheels, steam, mist and station-clock hands. These run on held 12-fps exposures and freeze under reduced motion. All action is behind the common fighting plane.

Three new original 32-bar synthesized scores are authored in `scripts/build-audio.mjs` and rendered as mono 22,050 Hz / 16-bit PCM WAV files:

- `assets/audio/silverscreen-theater.wav`: **Footlight Foxtrot**, 128 BPM, 4/4 stride-piano and reed foxtrot.
- `assets/audio/moonlight-midway.wav`: **Carousel Capers**, 156 BPM, 3/4 minor-key calliope waltz.
- `assets/audio/midnight-junction.wav`: **Midnight Rail Shuffle**, 168 BPM, 4/4 brass/reed, banjo and train-rhythm shuffle.

Melodies, chord arrangements, software instrument voices, and percussion were authored for this game. No recordings, third-party tunes, downloaded samples, soundfonts, or character voices were used. The existing Ink Harbor score and thirteen Foley assets retain their previous sources.
