# Beta 3 — v0.1.0-beta.3

[Play Public Domain Cartoon Fighters](https://pdcf.dev/) · [Known limitations](https://pdcf.dev/assets/beta.html) · [Feedback](https://github.com/AaronFaby/pdcf/issues)

This desktop prerelease follows [Beta 2](https://github.com/AaronFaby/pdcf/releases/tag/v0.1.0-beta.2) with the approved Betty artwork and the decision to retain disclosed Cloudflare browser metrics. Combat rules, controls and saved data remain compatible.

## Changes

- Betty's 48 cels use the approved rounded cheeks, smaller dark nose, large eyes, curled bob, slender hanging ears and distinct lip/eye expressions. The shared atlas updates portraits, combat and endings. The other five fighters are unchanged.
- Cloudflare Web Analytics/RUM remains intentionally enabled for browser page/performance measurements. The privacy policy, beta guide and contributor/review docs record that choice. Disabling metrics is no longer pending; no hosting change or extra game telemetry is introduced.
- The visible beta label, page titles, public guide and package version identify Beta 3. The footer separately identifies the exact build commit.

Six fighters, four stages, Arcade, Training, CPU play, local multiplayer, saved bindings and display/audio options carry forward. Fonts and their OFL notices remain locally hosted. See the [review follow-up](legal-review.md) and [asset provenance](../assets/provenance.md) for sources and boundaries.

## Verification and publication

The artwork/metrics baseline `38ac9a5` passed 97 Node tests and all seven jobs in [run 39193345765](https://github.com/AaronFaby/pdcf/actions/runs/39193345765), including 95 browser checks. Its approved drawings were inspected in both directions, and the live atlas hash, notices, retained metrics, fonts and Training were checked separately. These baseline results do not replace checks of the Beta 3 label commit.

Publish only after the candidate and main each pass build, balance and all five browser projects. Verify the live label/build and approved artwork, then create the annotated tag and GitHub prerelease at that verified commit. Keep earlier tags unchanged. Final commit, run links and live outcome are recorded in the GitHub prerelease. The website follows main; compare its footer with the tag when identifying a release. See the [verification record](release-checks.md) for scope and historical evidence.

## Known limitations and feedback

Balance is provisional. Physical controllers, speaker/headphone listening, native Safari, lower-end/high-refresh hardware and sustained human play need further verification. Automated WebKit and virtual pads do not establish those results. No new endurance run is claimed for Beta 3. Touch controls omit throw and dash; this beta targets desktop. Multiplayer is local, saves are browser/device-specific, and the Canvas game is not fully screen-reader playable or accessibility-certified.

Independent artwork/branding and privacy/compliance reviews remain open. This release is not legal clearance. Existing [legal](https://pdcf.dev/assets/legal.html) and [privacy](https://pdcf.dev/assets/privacy.html) notices continue to apply.

Report the build, browser/OS, keyboard/controller, mode/difficulty, matchup/stage, reproduction steps and expected/actual behavior through [GitHub Issues](https://github.com/AaronFaby/pdcf/issues). Issues are public and require an account; do not post private information. The game adds no automatic feedback uploads or new player storage.
