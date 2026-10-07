# Daily discovery and store media

Implemented 2026-10-06. The original PC catalog and dated Metacritic score provenance remain unchanged.

## Daily featured games

`data/spotlight-pool.json` contains 125 individually selected catalog Steam identities and original Turkish editorial captions. The expanded pool adds 100 candidates from the existing catalog across exploration, challenge, story, relaxation and puzzle/strategy experiences. These are editorial discovery recommendations; they are not a measured claim that every title is obscure. No new games, metadata or source scraping were needed for this change.

Five are returned per calendar day in Europe/Istanbul (00:00 / UTC+03). `lib/spotlight-rotation.ts` treats the pool as a shuffled tour: all 125 entries are assigned once across 25 consecutive daily slots before any are reused. Each new tour has a different seeded permutation, so the five-game bundles are not permanently fixed. A boundary adjustment prevents the new tour's first ten games from reusing the previous tour's last ten. Today's already published five games remain the start of the launch tour; later entries are shuffled. Pool membership is frozen in versioned source so imports cannot change a published day's selection.

The sequence uses the server date and a stable per-tour seed. The same date returns the same set to every visitor and on reload. It tracks scheduled daily appearances, not whether a specific visitor actually opened the site: a day that the site was not visited still advances the sequence. A visit after midnight receives the next set even if the site was closed; an open page refreshes at the boundary. No separate cloud task or catalog write is needed.

The picker consumes a continuous sequence of positions; future pools not divisible by five retain their remaining entries and continue into the next shuffled tour, without duplicate cards within a day. Source identity validation rejects a mismatched curated record rather than silently shrinking the pool and skipping its tail. The frontend's 7.5-second automatic rotation, navigation, pause, hidden-tab and reduced-motion behavior remains unchanged.


## Media source and matching

The backend requests the official Steam Store `https://store.steampowered.com/api/appdetails?appids={appid}&l=english` endpoint only for an existing PC catalog entry. It validates published Windows game type, returned Steam identity and normalized title before showing media. It never fetches a URL supplied by a visitor. `movies` and `screenshots` provide the exact source URLs; URLs are not fabricated. Sources are HTTPS Steam CDN assets. The thumbnail's path may contain a movie identity rather than the game identity; the modern trailer path must match the actual app identity. Screenshots must match the game app path.

On 2026-10-06, primary responses verified Kenshi (233860, 4 trailers/6 screenshots), Rain World (312520, 2/9) and DREDGE (1562430, 5/12). Modern responses supply `hls_h264`, `dash_h264`, `dash_av1` and `thumbnail`; the tested responses do not have legacy MP4/WebM fields. This implementation uses H.264 HLS, with support for MP4/WebM when supplied by older records. Tested HLS manifests, posters and full screenshots returned HTTP 200 with CORS `*`. Kenshi's first short fragment returned HTTP 206 and decoded as H.264 video. These are HTTP/container checks, not proof of browser playback.

The media JSON is cached in D1's existing `catalog_cache` under a separate `steam-media-v1:` namespace for 24 hours. A failed refresh can return the last valid record explicitly marked stale. Concurrent requests for the same app are deduplicated within an isolate. The gallery loads when a game detail is opened; video bytes and the local player bundle load only after play intent. Closing the dialog or choosing another item destroys the HLS player and clears the video source.

Publisher media stays on Steam CDN. This implementation does not download and host the video or screenshot files. Their rights remain with their owners. Site privacy information explains external asset requests; the separate licenses page retains exact provider attribution and the player license.

## Player and icons

- Official player repository: https://github.com/video-dev/hls.js
- Pinned release: https://github.com/video-dev/hls.js/releases/tag/v1.7.3
- hls.js 1.7.3 local UMD bundle and Apache-2.0 license are retained in `public/vendor/`; `scripts/prepare-media-vendor.mjs` reproduces them from the pinned dependency.
- HLS.js MediaSource support is preferred; native HLS is a fallback for supporting browsers. Playback and codec support still depend on the actual visitor's browser.
- The shared SVG outline icons in `public/ui.js` are original source code, with 24px viewboxes, round caps/joins and 1.7px strokes; no OS emoji/icon font or external icon CDN is used.

## Validation limits

Daily cutoff and rotation, source identity/URL safety, media cache/fallback behavior, gallery selection/play intent/cleanup, discovery filter combination, themes and account/library regressions are checked by the automated source, API and VM DOM tests. Real browser playback, login and mobile visual inspection require the unavailable browser QA capability and have not been claimed as tested.

## Related game cards and Steam sources

The section now shows at most 20 games in compact groups of three. `lib/related.ts` fetches the **public, anonymous** Steam `recommended/morelike/app/{appid}/?l=english` page on demand. It validates the header Steam app ID and normalized title, reads only released recommendation capsules with matching official Steam app links, and retains their supplied order. Header/foreign/self/duplicate/upcoming entries are excluded. All candidate Steam IDs are cached independently of catalog membership for one hour in D1, with concurrent request deduplication and an explicitly stale last-valid fallback. A new catalog entry can therefore join an already fetched source list without a deployment or a manually edited per-game map. The client caches source responses for five minutes and ignores late results for a different open game.

The frontend keeps current PC catalog entries from that Steam list in source order, then fills unoccupied places with detailed tag similarity. It does not transfer the visitor's Steam-owned, ignored or other personal preferences; the public source page's base order can differ from a signed-in user's visible Steam order. This uses Steam's own supplied recommendations wherever available rather than claiming that Valve's undisclosed ranking formula has been reproduced.

`data/steam-tags.json` holds app-ID/title-matched tag profiles. The import report records 1,323 profiles and 24,986 tag observations: 1,102 direct public Store profiles, 135 public SteamSpy profiles, 23 dated leinstay/steamdb profiles, and 63 limited seven-tag Store search profiles. 1,080 profiles contain twenty usable tags; other direct records may legitimately supply fewer. Search-only profiles are marked `complete:false` and shown as limited, not as a fabricated full twenty-tag profile. No catalog expansion, score collection or change to Metacritic score provenance occurred.

Store `InitAppTagModal` supplies tag IDs, English names and effective counts/weights. The parser validates the exact game identity, deduplicates IDs, drops invalid/unbrowsable values and selects the highest twenty weights. SteamSpy's documented public endpoint supplies tag vote counts; app ID and normalized title must match. Requests respected its maximum one per second within the checkpointed bulk collection. The dated GPL subset supplies ordered tag names but no numerical counts; those remain null rather than inventing source weights. Turkish labels come from Steam's public `tagdata/populartags/turkish`. The GPL subset's source extraction code and license are available on the separate licenses page.

The local completion algorithm considers only each profile's first twenty Steam tag IDs. It uses source strength `sqrt(count / maximum_count)` when numerical counts are available, otherwise equal strength, multiplied by tag rarity `1 + log((catalog_profile_count + 1) / (tag_profile_frequency + 1))`. Ranking uses weighted Jaccard overlap (sum of minimum weights / sum of maximum weights). At least two shared tags are normally needed and broad labels alone (Action, Adventure, Indie, Singleplayer, Multiplayer, Casual, Early Access and Free to Play) do not qualify a match. Limited search profiles receive a coverage confidence factor `sqrt(tag_count/20)`. Ties use shared-tag count, then deterministic title/identity. These are explicitly local choices, not published Valve coefficients. Metacritic scores, site view counts and addition dates do not affect ranking. Addition dates only supply a small new-game badge.

Future Steam imports and store refreshes fetch metadata and the public tag page concurrently. Successful validated tag profiles persist in the existing D1 game payload; a failed tag request does not erase a previous valid profile. The native Steam source path supports newly imported catalog IDs too. Every recommendation render filters against the current catalog, with no static per-game ID mappings.

Cards retain the existing safe Steam cover helper, dated Metacritic **user** scores (or `Veri yok`), translated common-tag captions, responsive swipe/page navigation and detail switching with old-player cleanup. A collapsible panel presents only the translated gameplay/world tags; source labels, weights and the external similar-items link are removed from game screens. Source/date metadata remains in the data records and licenses page. Native updates only replace the recommendation subtree, preserving the active video and unsaved note fields.

Validation covers native source order/identity/link safety, released-only extraction, D1 caching/dedup/stale behavior, weighted top-twenty tag selection, first-twenty bounds, generic-tag exclusion, new catalog insertions, no forced new-game promotion, score independence, metadata refresh preservation, and VM UI navigation/media regressions. Real browser visual QA remains unavailable.
