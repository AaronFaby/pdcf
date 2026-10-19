# Combat balance and CPU personalities

This milestone gives every fighter a distinct CPU plan, tunes the three difficulties, adds repeatable diagnostics, and makes resolved impacts easier to read. Bot results are diagnostic evidence, not human matchup ratings or proof that the roster is competitively balanced.

These tactics and stats are included in desktop Beta 1 (`v0.1.0-beta.1`). The milestone and review fixes were published in `0dcfed5`; the later `71c930f` adds simulator timing repairs and sustained-play tests. The beta documentation/presentation update does not retune combat. See [release verification](release-checks.md) for current hosted checks and [beta limitations](../assets/beta.html) for human/device follow-up.

## Tactics

| Fighter | CPU approach |
| --- | --- |
| Mickey | Mid-range punches/kicks, steam shots at distance, and punch-to-kick confirms |
| Minnie | Quick approaches and dashes, close punch pressure, and kick/rushing-special confirms |
| Oswald | Long-range pokes, retreats to protect his reach, recovery punishes, and uppercuts against observed airborne rivals |
| Felix | Ink shots, close attacks and throws, retreating feints, and backward dashes |
| Betty | Sound shots and retreating space control while ink is available; closes for kicks when ink runs low |
| Popeye | Starts spinach at a safe distance, avoids refreshing an active buff, and closes for heavy strikes and throws |

The move lists explain each plan. Decisions choose at most one attack, rather than depending on the engine's priority between simultaneous special/throw/kick/punch inputs. Characters use the same engine rules as a player, including vulnerable dashes, throw range, stun, recovery and ink costs.

## Difficulty and fairness

| Difficulty | Neutral observation interval | Own-punch confirm delay | Intended behavior |
| --- | --- | --- | --- |
| Easy | 280–440 ms | 140 ms | More openings, less defense, fewer successful follow-ups |
| Normal | 150–250 ms | 65 ms | Consistent approaches, spacing, defense and occasional combos |
| Hard | 90–150 ms | 40 ms | More reliable defense, punishes, projectile evasion and confirms |

The CPU acts on the **previous** observation of public opponent state. It must observe before its first action, and cannot read player commands or hidden input buffers. Its own confirmed punch can trigger a planned follow-up after the separate delay above. Held movement/guard persist between decisions; guard remains held through block recoil even if a decision expires. Ordinary decisions resume after that recoil; damage recoil does not grant automatic guard. Attacks, jump and dash remain one-shot edges. CPU clocks freeze during impact stops and inactive phases, and both brains clear on resets.

Later Arcade bouts shorten neutral observation intervals by up to 10%; fighter health, speed, reach and damage never change with difficulty. Training's sparring CPU always uses Normal. Each side has its own brain and seeded random stream in simulations.

## Balance and feel changes

- Popeye's base power multiplier changes from 1.22 to 1.15. His unbuffed punch is now 11.5 damage and throw 16.1; spinach still boosts melee damage by 50% for six seconds and heals up to eight health.
- Oswald keeps his reach. His kick starts at 200 ms instead of 170 ms and lasts 540 ms instead of 480 ms, making long pokes more deliberate and missed kicks easier to punish. Its active window ends at 300 ms.
- A strike that interrupts startup says **COUNTER!**; a strike that catches attack recovery says **PUNISH!**. Both retain ordinary damage and stun, with an extra 10 ms of impact freeze. Throws retain their grab/slam cues.
- Guard uses a rounded white clang with sparks; other hits keep the comic burst. Paper outlines keep impact text readable over the scenery and fighters. Reduced motion retains these combat cues while disabling decorative motion.
- Training identifies counter/punish hits and explains their timing. Impact/round audio can replace lower-priority swing clutter within the existing sixteen-voice cap, choosing the lowest priority first and the oldest voice within a priority. Equal/higher-priority voices are protected. Existing original Foley assets are reused.

## Repeatable simulations

```sh
npm run balance
npm run balance -- --seeds 12 --seed 1930 --json work/balance.json
npm run balance -- --seeds 12 --difficulty normal --json work/normal.json
```

No packages, browser, player storage, or network service are needed. The default runs two seeds across all three difficulties: 216 ordinary matches plus 72 mirror difficulty probes. Each seed covers all 36 ordered fighter pairings, including six mirrors. Matches use the real fixed 120 Hz engine, normal sixty-second rounds and first-to-two wins. Swapping non-mirror sides retains each fighter's random stream; mirrors use two distinct streams. The same source, options and seeds reproduce the same match results.

With all difficulties selected, mirror probes compare Normal/Easy, Hard/Normal and Hard/Easy with both level assignments. JSON includes version, seeds, Git revision/modified status when available, completion, winners, round/timeouts, reported hit/chip damage, blocks, attack mix, jumps, dashes and largest combos. Summaries show fighter and player-side results. Mirror appearances count for both players, so a completed mirror contributes one win from two appearances of that character.

Invalid arguments or invalid combat state fail the command. A match that cannot finish within 240 simulated seconds is recorded as incomplete and produces a nonzero exit. This bounds repeated-draw cases without awarding a fabricated winner. Win-rate outliers are investigation leads; CI does not require every character to achieve a target percentage. The release workflow's independent `balance` job runs two seeds and retains `combat-simulations` separately from production assets. A failed simulation still fails that check; the browser matrix depends only on `build` and can continue independently.

## Local measurements — October 18, 2026

Measurement source: the milestone working tree based on `82586ec6fa77c0a6530ccd1fdae203d87beac509`, recorded with `build.modified: true`, rerun after the guard-recoil review repair.

Seeds **1930–1941** completed **1,296 ordinary matches plus 432 difficulty probes**, with no invalid states or incomplete matches. No ordinary round reached timeout, and the largest observed combo was two hits. Each ordinary difficulty contains 432 matches and 144 appearances per fighter, including mirrors.

| Fighter | Easy CPU win rate | Normal CPU win rate | Hard CPU win rate |
| --- | ---: | ---: | ---: |
| Mickey | 44.4% | 34.0% | 54.2% |
| Minnie | 44.4% | 43.1% | 65.3% |
| Oswald | 64.6% | 64.6% | 40.3% |
| Felix | 41.7% | 50.7% | 62.5% |
| Betty | 28.5% | 43.1% | 51.4% |
| Popeye | 76.4% | 64.6% | 26.4% |

The six-character spread depends on the CPU policy. For example, easy bots struggle against Popeye's raw power, while hard Minnie capitalizes on confirms. Do not read this table as a human tier list.

Normal beat Easy in 144/144 mirror probes; Hard beat Normal in 138/144 and Easy in 144/144. These demonstrate separation between automated policies, not a measured human learning curve. Ordinary P1/P2 match wins were 219/213 on Easy, 210/222 on Normal and 216/216 on Hard; neither side swept the matrix.

A smaller baseline used the old CPU with only independent side support added. On the same two seeds (1930–1931), Normal Popeye changed from 22/24 wins to 15/24 after the tactic/balance and guard-recoil changes; Oswald changed from 16/24 to 12/24. Those small samples motivated focused tuning, not a claim of final balance.

## Follow-up review

The guard-recoil and voice-selection findings were each reproduced by a failing regression before repair. Guard coverage exercises both players, immediate and mid-recoil decision expiry, later guard release, and damage recoil. Audio coverage fills all sixteen voices with mixed priorities, checks priority before age, and preserves the cap and equal-priority protection. The simulation job is independent of the static build/browser dependency; its YAML structure was parsed and checked locally. All three new milestone files and the related sources/tests were included in `0dcfed5`.

Follow-up validation passed 97 Node tests, the then-current 48-file/105-reference production build, and nine targeted browser checks across Chromium, Firefox and WebKit. Each engine reran all 28 controller flows, real CPU combat for all six fighters, and reduced-motion impact feedback. The seeded measurements above were rerun after repair. The later pre-beta `71c930f` passed build, balance and all five hosted browser jobs in [run 39179760975](https://github.com/AaronFaby/pdcf/actions/runs/39179760975). Physical controllers, speaker listening and human balance remain separate checks.

## Human follow-up

Play the tutorial and Arcade at each difficulty, then test local matches with different skill levels. Check whether each plan is recognizable, whether projectiles/throws have understandable responses, whether any repeated sequence becomes oppressive, and whether hit/guard/throw sounds remain distinguishable. Include keyboard play, physical controllers and speaker/headphone listening. Report the build number, matchup, difficulty and a repeatable input sequence with any problem. No automatic player telemetry or uploads were added.
