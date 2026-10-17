# Ink Harbor background

- Asset: `ink-harbor.png`
- Created for this project with the built-in Imagegen tool on October 16, 2026.
- Character animation and portraits are authored in `scripts/build-cels.mjs`, not extracted from this image or historic cartoons.

## Final generation prompt

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
