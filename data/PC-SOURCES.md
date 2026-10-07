# PC catalogue source findings — 2026-10-05

## Steam catalogue and artwork
Unauthenticated official Store `https://store.steampowered.com/api/appdetails?appids=570&l=english` and `https://store.steampowered.com/search/results/?query&start=0&count=100&dynamic_data=&sort_by=_ASC&category1=998&supportedlang=english&snr=1_7_7_230_7&infinite=1` verified HTTP200 with Node24 `--use-env-proxy`.
Search response returns `results_html`, `total_count`, `start`; entries carry appids, publisher-uploaded image URLs, Steam user positive-review tooltip, supported computer OS.
Appdetails returns `type`, `steam_appid`, `platforms`, `genres`, `release_date`, official Steam CDN `header_image`, and optional Metacritic critic `score` /100. The latter is NEVER Metacritic user score.
Official documented IStoreService/GetAppList requires APIkey; this is not needed for public Store endpoints.
Steam artwork belongs to publishers/platforms and is not CC0. Retain exact provider attribution on the separate licenses page; do not claim blanket public-domain licensing. Steam Web API terms allow personal-use data presentation via applications but reserve rights, affiliation and availability limitations; 100000calls/day documented. Store robots has no general search/API block.
Primary docs: https://partner.steamgames.com/doc/webapi/IStoreService ; https://partner.steamgames.com/doc/store/assets/standard ; https://steamcommunity.com/dev/apiterms ; https://store.steampowered.com/legal/ ; https://store.steampowered.com/robots.txt

## Metacritic
Official `https://www.metacritic.com/robots.txt` explicitly disallows GPTBot and OAI-SearchBot all paths. No hidden/internal API access or anti-bot bypass attempted. Metascore is distinct from User Score per https://metacritichelp.zendesk.com/hc/en-us/articles/14482674768791-Are-user-votes-included-in-the-METASCORE-calculations .
Licensing docs https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs require paid approved subscription, data absent free trial; currently docs list Movies/Shows endpoints, so game licensing coverage requires provider confirmation. Do not promise this is ready for games.

## Wikidata CC0 safe narrow score facts
`wikidata-verified-pc-user-scores.json` contains five facts matched by Steamappid, P444 score, explicit `/user-reviews/` and `platform=pc` or `/game/pc/` reference URL, PC platform qualifier. All historical, score date unknown for OneShot. No live Metacritic validation occurred. `wikidata-pc-user-scores-entities.json` holds full source entities; `wikidata-metacritic-ref10.json` query and result. Q16338 = personal computer; Q1406 = Microsoft Windows. `/10` alone not proof of user score. Source P459 Q108403540 is RottenTomatoes mean, not a reliable user-rating selector. Console Hogwarts scores and SteamDeck hardware critic scores excluded.
Wikidata structured metadata CC0 per property footer https://www.wikidata.org/wiki/Property:P444 .

## Secondary GPL score supplement
Publisher repository https://github.com/leinstay/steamdb publishes daily GameGauntlets merged dump under GPL3.0, while reserving owners’ game names/art/prose/source rights.
Stable snapshot URL https://github.com/leinstay/steamdb/releases/download/2026-10-04/steamdb.min.json.gz, 56037578bytes, downloaded locally as steamdb-2026-10-04.min.json.gz.
`steamdb-user-score-facts.json` extracts ONLY appid, name, numeric Metacritic user score, reference URL, row update time and OS fields. No prose/art imported. Declared user score integer0..100 converted /10; 12296nonmissing, observedrange2..100, zero0, null177497. Dataset total189793rows.
Critical limitations: `updated_at` measures whole game row, not score collection date; snapshot date must not be called verified score date. `platforms` is computer OS availability, not Metacritic score platform. Most URLs lack platform query => platform UNKNOWN. CS2appid730 has historic CS:GO URL and must exclude mismatch. Witcher3appid292030 row called Remastered but generic originalgameURL; edition must not be inferred. Unknown user review counts absent.
Examples: CounterStrikeoriginal7.9, Portal8.8, Dota2=6.5, Kenshi8.2, Hades8.5, Cyberpunk2077=7.3. These are secondary dataset values, not freshly verified Metacritic values.
Preserve `steamdb-GPL-3.0-LICENSE.txt`, repository attribution, release URL/date, and licence compatibility for redistributed subset. Never label this CC0 or claim rights holder licensing independently verified.

## Detailed tag and native recommendation additions — 2026-10-06

See `STEAM-TAGS-REPORT.json` for per-profile completeness and source counts, and `DISCOVERY-MEDIA-SOURCES.md` for the exact local completion formula and native Steam source workflow. Public Steam Store pages supply the source tag weights; SteamSpy supplies public tag vote facts using its documented one-request-per-second limit. Store pages behind age verification were not bypassed. Historical and limited source identities remain distinguishable in the data records and credits. A limited tag profile receives a neutral completeness note in the game detail UI. The public anonymous similar-items source is `https://store.steampowered.com/recommended/morelike/app/{appid}/?l=english`; sampled Kenshi, Valheim and Portal 2 sources were checked with the production parser. No personal Steam session or credentials are accessed.

## ID-based score migration — 2026-10-06

See `METACRITIC-SOURCES.md` and `METACRITIC-REPORT.json` for the full-catalog audit and score coverage. Current scores use the 2026-10-05 numerical subset, persisted game/store/Metacritic/source-record IDs, optional immutable Metacritic numeric IDs, and explicit edition checks. Legacy title matching is no longer used for score lookup or import. Snapshot and actual score dates remain distinct, and unknown score platforms remain unknown. The older 2026-10-04 tag and game metadata subsets retain their own attribution.

## Primary score coverage supplement — 2026-10-06

The ID crosswalk now also accepts reviewed PC averages from `metacritic-reviewed-facts.json`. This adds 18 source-backed observations, including the user-supplied Mortal Shell II capture, and brings score coverage to 901 of 1,323 games. Primary source age, platform and method are retained independently of the licensed secondary subset. Missing imported facts do not establish absence of Metacritic scores. This reviewed import is not an automated live feed; see `METACRITIC-SOURCES.md` for validation and remaining coverage gaps.
