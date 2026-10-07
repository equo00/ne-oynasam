# Ne Oynasam? — PC discovery

Turkish PC game discovery Site, retaining its project identity, private audience and existing personal game IDs.

## Published catalogue

- 1,323 unique released Windows/PC games. Steam game search excludes DLC/packages and coming-soon titles; additional verified existing PC games retain their old IDs.
- 1,323 publisher artwork URLs from Steam Store/CDN. 905 image responses independently verified at import; other images use the exact URL returned in Steam Store records. Failed artwork falls back once to the same game's supplied store image, then displays an honest unavailable message.
- 901 identity-matched Metacritic user-score records, shown separately from critic scores and Steam positive review shares. Reviewed Steam app ID → Metacritic ID relationships reject stale CS2→CS:GO and remaster mismatches. See `data/METACRITIC-SOURCES.md` for evidence and coverage; the remaining score work is tracked in `ROADMAP.md`.
- 1,216 developer records, with secondary-source attribution where applicable.
- Existing three legacy records without current Steam covers remain accessible in saved libraries; they do not inflate catalogue counts. Old personal-list game IDs are preserved, including the Steam upgrade of Disco Elysium to The Final Cut.

## Product

- Search; mood, genre, other platform, PC OS, release era, Turkish-interface and co-op filters.
- Metacritic user-score threshold and sort; separate Steam-positive-review sort. Ratings with no matched record remain empty.
- Three-game comparison with user scores, provenance/date/platform, PC OS, Turkish/co-op metadata and personal ratings as distinct rows.
- Lazy-loaded real artwork, responsive card layout, original cream/lime branding, dark mode, numbered pagination and direct page jump/deep links.
- ChatGPT-owned sign-in; D1 personal games, status, notes, ratings and named collections.
- Separate discovery (`/`) and personal collection (`/koleksiyonum`) pages, with native navigation, collection deep links and sign-in returning to the collection page. Legacy `/?tab=library` links redirect while preserving collection/game parameters.
- JSON export/import with batched authenticated record restoration and restoration of named collections. Name-matched collections are reused; rows are idempotently upserted within owned batches.
- Source refresh updates only the visible page's Steam metadata in groups of four, preserves failures and leaves historical Metacritic score snapshots unchanged.
- Wikidata lookup/import is limited to PC video games; Steam IDs deduplicate imported records.
- Actual detail-view counts, deduplicated by account/game/UTC day.

## Sources, dates and rights

See `data/PC-SOURCES.md`, `data/PROVENANCE.md` (original Wikidata seed), and `data/PC-IMPORT-REPORT.json`.

Steam cover art belongs to game publishers and other rights holders. It is loaded from Steam CDN; it is not covered by Wikidata CC0. No store descriptions, review prose or third-party cover files are copied into the repository. No affiliation with Valve/Steam/Metacritic is asserted.

Metacritic user facts are historical snapshots, not freshly verified live scores. The GPL-3.0 secondary dataset does not establish score-platform or measurement date. Its 2026-10-04 snapshot date is explicitly not called the score verification date. Explicitly PC-qualified Wikidata user-review reference statements retain their actual historical dates. Unknown/mismatched scores are not replaced with critic scores, Steam percentages or made-up values. Public factual subsets, licence text and subset source code are downloadable from the sources information panel. Upstream source licensing does not independently establish all underlying rights.

No advertising account, paid subscription, custom domain or recurring schedule is configured. Site sharing remains owner-private.

## Runtime and reproducibility

Supported Sites Vinext build integration; Cloudflare Worker and D1 binding `DB`. Existing immutable migrations in `drizzle/` are retained. Shared refreshed records use `source_games`; per-user tables are never modified by catalogue imports. Import scripts are in `scripts/`, with input checkpoints in the documented working directory. `data/wikidata-seed.json` keeps the original identity bootstrap; `data/catalog.json`, `data/legacy-catalog.json` and the separately licensed `data/metacritic-users.json` are the build inputs.

## Verification

- `node tests/data.test.mjs`: ≥1,000 unique actual PC/Windows game records, cover-source validity, legacy identity retention, score identity/platform/date invariants.
- `node tests/security.test.mjs`: field validation, origin checks and unsafe URL rejection.
- `node tests/source.test.mjs`: default multilingual Wikidata labels, game verification and URL handling.
- `node tests/api.test.mjs`: real SQLite + actual bundled handlers, mocked dispatch identity; CRUD, user isolation, list ownership, deduplicated views, batch imports and import isolation.
- `node tests/frontend.test.cjs`: DOM-model catalogue load, PC/score/Turkish filters, page jump, real-image HTML/fallback, escaping, authenticated saves, notes/status, comparison and distinct user scores.
- `node tests/collection-page.test.mjs`: actual page handlers, independent collection shell, native navigation, deep links, signed-out behavior and legacy redirects; shared client behavior runs in a DOM model.
- `node node_modules/typescript/bin/tsc --noEmit` and the Sites build helper.

Browser visual/mobile QA and real sign-in were unavailable in the managed execution environment. Mocked identity tests do not prove a real browser login. `/api/health` checks live D1; `?source=steam` verifies actual Steam metadata fetch; `?source=1` checks Wikidata without writing private data.
