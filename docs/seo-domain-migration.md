# SEO and the pdcf.dev move

The canonical game address is `https://pdcf.dev/`. The homepage, beta guide, privacy policy and legal notices declare corresponding canonical URLs and appear in `sitemap.xml`. The homepage has visible game/instruction copy, social cards and descriptive WebSite/VideoGame JSON-LD. Markup contains no ratings, studio endorsement or blanket license claim and does not guarantee indexing or enhanced search results.

`robots.txt` permits ordinary crawling and references the sitemap. Cloudflare may prepend existing managed content-signal text; preserve those hosting preferences. The animation reel and transfer tool use `noindex,follow` and stay out of the sitemap. JavaScript, styles and images remain crawlable. Public privacy/legal source pages remain script-free; hosting metrics disclosures still apply to the deployed DOM.

## Preserve existing players first

Saves belong to each browser/profile and origin. Redirects cannot copy another origin’s localStorage. Keep `/assets/transfer.html` reachable at **pdcf.aaronfaby.com** and **www.pdcf.dev** after the move, including their host bindings and HTTPS certificates.

Players open recovery in their original browser/profile, download a JSON backup, then import at `https://pdcf.dev/assets/transfer.html`. The homepage migration notice and footer link make this discoverable. Old-address tools are export-only so a local re-import cannot be mistaken for a move to the new site.

The backup includes only existing `pdcf-arcade-v1`, `pdcf-controls-v1`, `pdcf-audio-v1` and `pdcf-visuals-v1` entries. Existing validators preserve completed endings and restore interrupted bouts using normal Arcade behavior. Invalid, oversized, unsupported and unknown-key files are rejected. Import previews categories and requires replacement confirmation. Missing categories and unrelated browser keys stay unchanged. Storage-write failures attempt reverse-order rollback; failed recovery is reported explicitly. Export leaves the source data intact. Close other game tabs before importing to avoid stale in-memory values overwriting imported settings.

Files are downloaded and read locally; their contents do not enter network requests or URLs. There are no accounts, server save storage, migration tracking keys or extra telemetry. Existing Cloudflare page/performance metrics remain disclosed. Deleted browser data cannot be recovered.

## Redirect activation

Desired rules are in [`ops/domain-redirects.json`](../ops/domain-redirects.json). Only `pdcf.aaronfaby.com`, `www.pdcf.dev` and HTTP requests to the canonical host match. Other aaronfaby.com sites must remain unaffected. HTTP 301 redirects preserve the raw path and query string.

Keep these recovery exceptions on both alias hosts:

- `/assets/transfer.html`, `/assets/transfer` and `/assets/transfer/`
- `/engine.mjs`, `/style.css` and `/robots.txt`
- `/assets/runtime/`, `/assets/fonts/` and Cloudflare’s `/cdn-cgi/` endpoints

Cloudflare’s static HTML handling redirects `.html` requests to extensionless URLs. Canonicals and the sitemap use the final extensionless information-page URLs; recovery exceptions must include both forms, plus a trailing-slash recovery request. The old-origin tool needs these modules/styles/fonts to read its own storage without cross-origin import failures. Ordinary HTML game/information pages redirect after activation.

Deploy and verify recovery **before enabling** redirects. In each zone, use Rules → Redirect Rules → Single Redirects and the matching expression/dynamic target in the JSON. Add the rule without replacing unrelated rules. The file describes desired configuration; Git alone does not apply or establish live hosting settings. Keep before/after snapshots. A token without Single Redirect write access cannot apply it; use the signed-in dashboard or have the maintainer apply the reviewed rules.

Then verify alias pages permanently redirect to matching pdcf.dev URLs with queries preserved. Recovery and all dependencies must return 200. Test a synthetic old-origin backup importing at the new origin while leaving its source unchanged. Separately verify the exact Cloudflare build check and live footer. Preserve published beta tags.

## Search Console and maintenance

Submit `https://pdcf.dev/sitemap.xml` once after deployment. Use URL Inspection’s live test for Google’s access/rendering, then monitor indexing and Google-selected canonicals. HTTP/XML delivery does not establish Search Console processing or indexing. If the old subdomain was indexed, follow Google’s site-move guidance for that verified subdomain property; do not move the entire aaronfaby.com property or its other sites.

Regenerate the sharing image with `npm run social-card` using the existing Playwright development tools and Chromium. It uses local port 4175 to composite the approved fighter atlases, Ink Harbor painting and self-hosted fonts. The favicon is an original ink/star mark matching the interface. No new character artwork or runtime image dependency is introduced.

`npm run check` validates canonicals, sitemap entries, robots discovery, utility noindex, structured-data version and social-image dimensions. Three additional Playwright scenarios per project cover metadata/packaging, downloaded backup transfer across two origins with actual Arcade resume, and export-only recovery with blocked storage and narrow keyboard access. Local synthetic/emulated-host checks remain distinct from live redirects, Googlebot, physical-controller and indexing evidence.
