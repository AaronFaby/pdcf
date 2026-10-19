# Beta 1 — v0.1.0-beta.1

[Play Public Domain Cartoon Fighters](https://pdcf.aaronfaby.com/) · [Known limitations](https://pdcf.aaronfaby.com/assets/beta.html) · [Feedback and bugs](https://github.com/AaronFaby/pdcf/issues)

The first beta targets desktop browser play. Choose among six fighters and four animated stages with original period-inspired music, then play Arcade, single CPU matches, local two-player, or Training.

## Included

- Six-bout Arcade ladders, three CPU difficulties, continues, saved checkpoints and character endings.
- Distinct CPU tactics, buffered attacks, combos, throws, dashes, specials and counter/punish feedback.
- Training with dummy options, combat readouts and eight guided lessons using saved bindings.
- Custom keyboard/controller bindings, stick dead zones, explicit P1/P2 assignments, pause and reconnect recovery.
- Saved audio/visual preferences, reduced motion, readable HUD and fullscreen support.
- Bounded asset/audio recovery, build identification, public privacy/legal notices, and a visible beta notice with feedback links.

## Known limitations

Balance and difficulty are provisional. Physical controllers, speaker/headphone output, native Safari, lower-end/high-refresh machines and sustained human play need further verification. Automated WebKit and virtual-pad checks do not establish those results. Touch controls omit throw and dash; this beta targets desktop. Local multiplayer requires a shared device; online play is unavailable. Saves and preferences stay in one browser/device, with no account or cloud sync. The Canvas game is not fully screen-reader playable or accessibility-certified.

Independent artwork/branding clearance and hosting privacy-configuration reviews remain open. The beta designation does not change the existing character-version, independence or asset notices. See the [legal notices](https://pdcf.aaronfaby.com/assets/legal.html), [privacy policy](https://pdcf.aaronfaby.com/assets/privacy.html) and [asset provenance](../assets/provenance.md).

## Verification and publication

Publication requires the candidate's static build, balance job and all five hosted browser projects to pass. The verified commit is tagged without changing its contents; GitHub marks this release as a prerelease. The live website follows `main`, so compare its build footer with the tag when identifying a particular beta build.

The baseline local verification passed 97 Node tests, 57 browser checks across Chromium/Firefox/WebKit and three sustained sessions covering 36 complete matches plus two minutes of Training per browser. These are automated results, separate from human playtests. See the [verification record](release-checks.md) for source revisions, hosted results, current packaging checks and measurement limits.

## Feedback

Please report the build number, browser and OS, keyboard/controller, mode and difficulty, fighters and stage, steps to reproduce, and expected/actual behavior. Screenshots or short recordings are useful when available. For playtest impressions, focus on tutorial clarity, combat readability, difficulty progression, counterplay and whether matches stay enjoyable.

GitHub Issues are public and require an account. Do not post private information. The beta's game code adds no automatic feedback uploads, gameplay analytics or new player storage.

The live host was observed injecting a Cloudflare Web Analytics/RUM beacon for browser page/performance measurements. This hosting behavior is separate from game code and manual feedback and is disclosed in the privacy policy. Hosting settings were not changed by the beta release.
