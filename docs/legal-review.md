# Character and privacy review follow-up

This records the risk-reduction work approved after desktop Beta 1 (`v0.1.0-beta.1`, commit `88e3bd4`). The supplied non-attorney review examined the older `0dcfed5` build. This follow-up is not legal clearance, a conclusion that infringement occurred, or a numerical estimate of enforcement risk.

## Implementation scope

- Match Betty's drawings to the documented 1930 canine reference: hanging ears, a black button nose and muzzle, without the current earrings or decorative garter. Edit the shared generator and regenerate all 48 cels; portraits, gameplay and endings use that atlas.
- Replace Popeye's two “Strong to the finish” lines and the special's can with independently drawn loose spinach. Preserve combat rules, costs, timing and saved data.
- Record specific visual sources for all six fighters in `assets/provenance.md`. Use a plain Minnie skirt unless its ornamentation is specifically sourced. Oswald already has a rabbit tail; a shared drawing helper is not itself a legal defect.
- Serve the six required font files and their two SIL Open Font License notices from this site. Verify both successful loading and playable system-font fallback, with no automatic Google Fonts requests.
- Disable optional Cloudflare browser metrics for `pdcf.aaronfaby.com` if available credentials permit a change limited to that hostname. Preserve unrelated sites and normal hosting/security processing. Record the actual API and live-browser outcomes rather than claiming that repository changes control hosting.
- Update public notices, contributor guidance and release notes. Keep public GitHub Issues as the published contact route, with its privacy warning; do not invent an email address or silently grant a license over the repository.

## Source and legal distinctions

The [archived Dizzy Dishes film](https://archive.org/details/dizzy-dishes-1930), linked by [Duke's 2026 research](https://cspd.law.duke.edu/publicdomainday/2026), identifies the original release as August 9, 1930. The examined file is `Dizzy Dishes (1930).mp4`; at 02:45 the canine singer appears standing on the platform, and at 03:15 her hanging ears and button nose are visible in close-up. These references corroborate the supplied stills' visual details; the filenames or added orange annotations are not independent provenance. Film copies, frames and their audio are review material only, not shipped assets.

Duke's analysis also explains that some later Betty cartoons lost copyright through non-renewal, and argues that a simple change from canine to human ears is not independently protectable. The full drawing still requires analysis. Redrawing toward a documented source removes a mismatch; it does not establish that all human-looking Betty drawings infringe or that all remaining risks disappear.

[Duke's Popeye research](https://cspd.law.duke.edu/publicdomainday/2025) describes enlarged forearms and an anchor tattoo in the original 1929 appearance. These are not inherently 1933-only additions. Its qualified research on the 1931 spinach strip's apparent non-renewal remains the basis for the existing spinach mechanic; no independent renewal search is claimed. Loose leaves avoid a specific film prop, but do not independently resolve the underlying source question.

[37 CFR 202.1](https://www.copyright.gov/title37/202/37cfr202-1.html) excludes short phrases standing alone from copyright protection. Removing the Popeye wording is conservative presentation work, not a finding that the protected musical composition was used. Similarly, free access and monochrome rendering are not blanket exemptions. [Jack Daniel's v. VIP Products](https://www.supremecourt.gov/opinions/22pdf/22-148_3e04.pdf) distinguishes expressive use from use of another's mark as a source identifier.

## Remaining professional review

A qualified IP/privacy lawyer should assess the finished drawings and source records, title-screen/marketing presentation and trademark confusion, the spinach renewal question, and distribution territories including applicable treaties and foreign copyright terms. U.S. public-domain status is not worldwide clearance. Evaluate the site's present worldwide availability, not just future paid distribution.

The privacy review must consider actual hosting/security and browser-metrics settings, provider data handling/retention/transfers, applicable contact and rights-request requirements, and whether child-directed-service rules apply. No accounts or observed cookies do not establish that no personal information is processed. The [FTC's COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) addresses third-party collection and limited internal-operations exceptions. The current public-only contact route may need a private alternative if applicable requirements or operational needs call for one; the maintainer has requested no published email.

Publicity rights, accessibility obligations and the enforceability of game-use terms are not certified by this engineering work. Repository licensing is a separate maintainer decision. No lawyer has been retained or contacted, no private contact service has been added, and no foreign access restrictions are implied.

## Verification and publication

The follow-up targets `v0.1.0-beta.2`. Inspect all revised cels and mirrored actions, preserve transparent margins and combat timing, verify local font loading and failure fallback, then run the Node/build checks and the five-project hosted browser matrix. Verify the deployed build and its actual network requests separately. Preserve the published Beta 1 tag; a follow-up tag must point to its own verified commit.

Implementation and final verification outcomes will be recorded here before publication; final CI links and release identity also belong in the GitHub prerelease.
