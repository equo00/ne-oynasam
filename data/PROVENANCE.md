# Game catalog provenance

Retrieved 2026-10-05. Catalog contains 78 distinct real video game items retrieved from Wikidata through web search/open/find. There are no copied descriptions, reviews, screenshots, or third-party images in the catalog.

`game-catalog-source.json` is the final stable import file. `sourceUrl` links to each Wikidata item; `sourceRetrievedAt` records retrieval date. `sourceGenreValues` and `sourcePlatformValues` retain the retrieved English values used to derive broad Turkish genre labels and grouped platform labels. Broad genre translation is editorial normalization, not a separate source claim. Multiple console generations are collapsed into PlayStation/Xbox/Switch; Windows/macOS/Linux are grouped as PC.

`yearSource` states how the year was obtained. Most years reflect the Wikidata item description. These may refer to early access or full release; do not label this column definitive first release or availability date. RimWorld's 2018 year comes from the retrieved 17 October 2018 version 1.0 publication statement; its deprecated 2016 statement was excluded. Valheim's current retrieved item description says 2026, while its earlier 2021 early-access date is also present in evidence. Hades II's 2024 year reflects early access; evidence also records 25 September 2025 full release.

Platforms reflect statements present in the retrieved item and can include announced ports. They do not establish present store availability. Grouped platform lists are conservative/non-exhaustive when retrieved snippets omit values. `studio` is the first retrieved developer label, which may be a port developer where the item lists several developers (e.g., Terraria). Some Wikidata entities currently display broad labels such as `Development Studio`; no brand name was inferred or fabricated.

Official URLs were read from the items' `official website` property. Some point to studios or legacy pages, rather than a current sales page; reachability and pricing were not tested. The catalog has 78 nonempty official URL fields.

Wikidata structured data is CC0. Relevant license page: https://www.wikidata.org/wiki/Wikidata:Licensing . This applies to the structured metadata used here, not the underlying games, artwork, screenshots, promotional text, or linked sites.

Evidence: `game-catalog-final-evidence.json` contains the final retrieved item page text (plus fallback search results for Abzu/Dave the Diver); `game-catalog-official-evidence.json` contains the official website field retrievals. `game-catalog-verified-pages.json`, `game-catalog-evidence.json`, `game-catalog-evidence2.json`, and `game-catalog-evidence3.json` preserve earlier retrieval attempts for audit. The earlier files include non-game search results and redirects, which were excluded or corrected before final import. `build_game_catalog.py` records parsing/translation logic but does not yet reproduce the manual RimWorld date and official URL enrichment unless those steps are reapplied.
