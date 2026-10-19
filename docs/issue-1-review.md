# Issue #1 validation and repairs

Historical review of [the external findings](https://github.com/AaronFaby/pdcf/issues/1), including the fullscreen follow-up after the reviewed `5dfa4ba` commit. The repairs were committed in `82586ec`; issue #1 was closed on October 18, 2026 after its release checks passed. The original evidence below is retained, including its then-current test/file counts. For Beta 1 status and subsequent simulator repairs, use [release verification](release-checks.md) and [beta notes](beta-release.md).

| Finding | Validation and resolution |
| --- | --- |
| Disconnect lost behind a dialog | Confirmed in the close/pause paths. Interruptions now retain a pending pause reason until the last dialog closes, then show the explicit Resume menu. The simulator covers P2 disconnects behind Options/Help and P1 disconnects behind a completed lesson, including frozen combat and keyboard fallback. Focus/visibility and fullscreen interruptions use the same path. |
| Reconnect changes P1/P2 profiles | Confirmed by a failing Node regression with changed indexes and reverse arrival. Exact index/ID assignments have first priority, known IDs second, and new devices last. Tests cover swapped profiles, identical-ID exact matches, held-input arming, a new device competing with a reconnect, and an obsolete index alias after a device changed players. Identical IDs with no surviving index cannot establish physical identity; the existing Swap action remains the fallback. |
| Clicked buttons swallow combat keys | Confirmed: the active button remained the keyboard event target. An in-fight button action now restores arena focus when combat is still active. Keyboard navigation of links/dialogs retains its existing protections. A native-keyboard browser regression exercises P1/P2 attacks after the sound button and verifies Enter/Space do not toggle it again. |
| Training reset repeats / P2 resets P1 | Confirmed. P1 reset ignores auto-repeat, and P2 keyboard/controller resets cannot change Training. Menu input carries its actual player slot so P1-only actions remain correct when the other pad is absent or devices swap. The controls menu marks P2 reset as P1 only, and practice/help text identifies P1. Existing saved-profile fields remain compatible. |
| Result music stays paused after focus returns | Confirmed: only the no-match menu restored audio. Focus and visibility restoration now restore the menu scene for completed matches too. A browser-only outcome fixture reaches the real result dialog, then checks audio source/scene recovery after blur/focus and hidden/visible events. No speaker listening is implied. |
| Stalled audio blocks retries | Confirmed with a pre-fix probe: 14 pending shared loads, neither unlock settled, and retry fetched nothing new. Fetch, body reading and decoding now have a fifteen-second deadline; network work is aborted, timed-out entries are removed, successful buffers are retained, and late results cannot overwrite a retry. Output startup retains its separate five-second deadline. Node tests cover all three stall phases and stale completions; a browser test keeps Training playable during a stalled score and retries after the error. Status says Loading while startup is pending. |
| Arcade Start bypasses artwork loading | Confirmed in `playArcade`/`startMatch`. Both reject starts while an artwork attempt is pending, before changing attempts or combat. Arcade/rematch buttons reflect readiness. The controller matrix presses Start while a retry is settling and checks that the saved attempt count does not advance. |
| Neutral dash inherits an old directional dash | Confirmed by a failing real-simulation regression. Every new P1 dash replaces its direction, origin, distance and completion flags. An obstructed directional dash followed by walking and a neutral dash cannot pass; a fresh successful directional dash still can. |
| Knockout banner says TIME | Confirmed by final-tick and lethal-throw cases. The engine records `roundEndReason`; the renderer uses that reason instead of the remaining clock. Tests assert knockout, timeout, draw and late lethal throw results, the actual rendered banner, and clearing on the next round. |
| Stray local assets enter builds | Confirmed: the local extra file accounted for the old 49-file figure. Builds now copy only an explicit production manifest. A test adds an untracked source folder and verifies exclusion; the checker also rejects unexpected nested output files. The intended build contains 48 files. |
| Foley and dynamic imports are unchecked | Confirmed. The manifest and required-reference checks cover all thirteen Foley cues as well as four scores. Literal dynamic imports with relative or root paths are checked. Tests remove `hit.wav` and append missing dynamic imports to a temporary build. Computed import expressions cannot be resolved statically; none are used by production code. |
| `node -e` import crashes | Reproduced `ERR_INVALID_ARG_TYPE` from `pathToFileURL(undefined)`. Both script entry guards now check `process.argv[1]`. A child-process regression imports the checker with `node -e`. |
| Revision can identify a different checkout | Confirmed by the old build-label test, which accepted a made-up SHA alongside real Git metadata. A mismatched supplied revision now fails before replacing an existing build. Tests retain matching revision, malformed metadata, missing-Git archive and unversioned archive coverage. |
| Privacy summary/deletion omit visual settings | Confirmed. The summary, deletion text and motion choices now include saved visual preferences; control reset explicitly leaves those preferences intact. The pages remain script-free and publish no email. |
| Generated previews | Removed the unreferenced `outputs/cel-animation-reel.jpg`. Kept the README-linked GIF as an explicitly archival base-animation preview. Neither is shipped in the production manifest. |
| Old release-check counts look current | Labelled prior dated result sections as historical. Their test/timing evidence is retained rather than rewritten as a new run. Current counts live in README/AGENTS and the current validation section below. |

The four proposed `restoreArcade` bad-data examples were already rejected: lost with zero losses, too few attempts, ready at index six, and a non-mirror finale. Added explicit cases to preserve that behavior. Projectile interruption already had a throw regression; strengthened it to assert attack cancellation, prompt release after hitstop, grounded position/velocity and no extra victim damage. No simulation change was needed for either group.

## Historical verification

Local validation on October 18, 2026, on this macOS ARM host:

- `npm run check`: **83 Node tests passed**, with **48 production files / 105 local references** verified.
- Full Playwright release matrix: **51 tests passed**, seventeen scenarios each in Chromium, Firefox and WebKit, including all **28 controller flows** per engine.
- After the final reconnect and P1-reset UI adjustments, rebuilt successfully and reran the controller matrix plus native keyboard focus/reset scenario in all three engines: **6 targeted tests passed** against the final code. The P2 bindings check also verifies the P1-only reset label.
- `node --check` passed for all seventeen changed JavaScript modules; `git diff --check` passed.

Repeat the checks with:

```sh
npm run check
npm run test:browser -- --project=chromium --project=firefox --project=webkit
git diff --check
```

The controller matrix restores all four existing preference/checkpoint keys afterward. Scripted outcome checks establish progression/audio lifecycle, not difficulty balance. These are local results, with no new hosted CI run or deployment claimed. Physical controller identity, speaker output, native Safari and assistive-technology certification require separate checks. Identical-ID controllers without surviving indexes may still need the existing Swap action.
