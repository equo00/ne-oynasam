import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';
import {steamReviewUrl,steamReviewSummary,validAllSteamReview,preserveSteamReviewHistory} from '../lib/steam-reviews.mjs';
const url=new URL(steamReviewUrl(730)),params=JSON.parse(url.searchParams.get('input_json'));
assert.deepEqual(params.languages,['all']);assert.equal(params.purchase_type,1);assert.equal(params.review_type,0);assert.equal(params.filter_offtopic_activity,false);assert(!url.searchParams.has('cc')&&!('country' in params));
const summary=steamReviewSummary({response:{query_summary:{total_positive:3,total_negative:1,total_reviews:4}}},730);
assert.equal(summary.positivePercent,75);assert.equal(summary.total,4);assert(validAllSteamReview(summary));
assert.throws(()=>steamReviewSummary({query_summary:{total_positive:3,total_negative:1,total_reviews:5}},730));
const empty=steamReviewSummary({query_summary:{total_positive:0,total_negative:0,total_reviews:0}},730);assert.equal(empty.positivePercent,null);assert.equal(empty.total,0);assert(validAllSteamReview(empty));
assert(!validAllSteamReview({...summary,languages:['english']}));assert(!validAllSteamReview({...summary,countryFilter:'TR'}));assert(!validAllSteamReview({...summary,positivePercent:99}));assert(!validAllSteamReview(summary,440));assert(!validAllSteamReview({...summary,sourceUrl:summary.sourceUrl+'&cc=TR'}));
const previous={steamReview:{positivePercent:70,total:10,scope:'English'},steamReviewHistory:[{legacy:true}]};const merged=preserveSteamReviewHistory(previous,{steamReview:summary},730);assert.deepEqual(merged.steamReview,summary);assert.deepEqual(merged.steamReviewHistory,[{legacy:true},previous.steamReview]);assert.deepEqual(preserveSteamReviewHistory(merged,{steamReview:null},730),merged);assert.deepEqual(preserveSteamReviewHistory(merged,{steamReview:previous.steamReview},730),merged);
const data=JSON.parse(fs.readFileSync('data/steam-all-reviews.json')),seed=new Map(JSON.parse(fs.readFileSync('data/catalog.json')).map(g=>[g.id,g]));
const f=createCatalogFixture(),{sqlite,database}=f;await readyCatalog(await moduleFor('lib/catalog-bootstrap.ts'));
// Represent the deployed pre-migration English-only database.
for(const c of data.changes){const saved=sqlite.prepare('SELECT payload,base_payload FROM catalog_games WHERE id=?').get(c.gameId),original=seed.get(c.gameId).steamReview;
 const base=JSON.parse(saved.base_payload),game=JSON.parse(saved.payload);base.steamReview=original;game.steamReview=original;delete base.steamReviewHistory;delete game.steamReviewHistory;
 sqlite.prepare('UPDATE catalog_games SET base_payload=?,payload=?,steam_positive_percent=?,content_hash=? WHERE id=?').run(JSON.stringify(base),JSON.stringify(game),original?.positivePercent??null,'before-'+c.gameId,c.gameId);
 sqlite.prepare('INSERT INTO source_games(id,qid,payload,fetched_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(c.gameId,'steam:'+c.steamAppId,JSON.stringify(game),'2026-10-05');
}
const game=data.changes[0].gameId;
sqlite.prepare('INSERT INTO library(user_id,game_id,status,note,rating,updated_at) VALUES(?,?,?,?,?,?)').run('review-owner',game,'playing','Özel not',5,'2026-10-09');
sqlite.prepare('INSERT INTO catalog_overrides(game_id,field,value,updated_at) VALUES(?,?,?,?)').run(game,'desc',JSON.stringify('Elle düzenlenen açıklama'),'2026-10-09');
const manualGame=data.changes.slice(1,25).find(c=>seed.get(c.gameId).steamReview).gameId;sqlite.prepare('INSERT INTO catalog_overrides(game_id,field,value,updated_at) VALUES(?,?,?,?)').run(manualGame,'steamReview',JSON.stringify(seed.get(manualGame).steamReview),'2026-10-09');
const before=sqlite.prepare('SELECT * FROM catalog_games ORDER BY id').all();
const tables=['library','lists','list_games','catalog_overrides','catalog_scores','catalog_source_ids','catalog_media','catalog_game_genres','catalog_game_tags','catalog_game_platforms','catalog_game_systems','catalog_search_terms'];
const untouched=new Map(tables.map(t=>[t,sqlite.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
const clean=json=>{const g=JSON.parse(json);delete g.steamReview;delete g.steamReviewHistory;return g;};
const sync=await moduleFor('lib/steam-review-sync.ts'),goodBatch=database.batch;
const originalPayload=sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(game).payload;
database.batch=async statements=>goodBatch([...statements,database.prepare('INSERT INTO missing_steam_test_table VALUES(1)')]);
await assert.rejects(sync.ensureSteamReviews(database));assert.equal(sqlite.prepare("SELECT cursor FROM catalog_bootstrap WHERE stage='steam-reviews'").get().cursor,'0');assert.equal(sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(game).payload,originalPayload);
let raced=false;
database.batch=async statements=>{if(!raced){raced=true;const saved=sqlite.prepare('SELECT payload,base_payload FROM catalog_games WHERE id=?').get(game);const base={...JSON.parse(saved.base_payload),desc:'Eşzamanlı düzenleme'},payload={...JSON.parse(saved.payload),desc:'Eşzamanlı düzenleme'};sqlite.prepare('UPDATE catalog_games SET base_payload=?,payload=?,content_hash=? WHERE id=?').run(JSON.stringify(base),JSON.stringify(payload),'concurrent-edit',game);const expected=before.find(r=>r.id===game);expected.base_payload=JSON.stringify(base);expected.payload=JSON.stringify(payload);}return goodBatch(statements);};
const legacy=sqlite.prepare('SELECT payload FROM source_games WHERE id=?').get(game).payload;
let state=await sync.ensureSteamReviews(database);assert.equal(state.processed,0);assert(!state.ready);assert.equal(sqlite.prepare('SELECT payload FROM source_games WHERE id=?').get(game).payload,legacy);assert.equal(JSON.parse(sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(game).payload).desc,'Eşzamanlı düzenleme');
database.batch=goodBatch;state=await sync.ensureSteamReviews(database);assert(state.processed<=25&&state.processed>0);assert(!state.ready);
for(let attempt=0;attempt<100&&!state.ready;attempt++)state=await sync.ensureSteamReviews(database);
assert(state.ready);assert.equal(state.processed,data.changes.length);
for(const c of data.changes){const g=JSON.parse(sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(c.gameId).payload);assert.deepEqual(g.steamReview,c.gameId===manualGame?seed.get(c.gameId).steamReview:c.review);const old=seed.get(c.gameId).steamReview;if(old&&c.gameId!==manualGame)assert(g.steamReviewHistory.some(r=>JSON.stringify(r)===JSON.stringify(old)));}
for(const r of before){const after=sqlite.prepare('SELECT * FROM catalog_games WHERE id=?').get(r.id);assert.deepEqual(clean(after.payload),clean(r.payload));assert.deepEqual(clean(after.base_payload),clean(r.base_payload));for(const key of ['id','steam_app_id','status','sort_order','source_priority','score_value','score_count','score_platform'])assert.equal(after[key],r[key],r.id+':'+key);}
for(const [t,rows]of untouched)assert.deepEqual(sqlite.prepare('SELECT * FROM '+t+' ORDER BY rowid').all(),rows,t);
const revision=sqlite.prepare("SELECT value FROM catalog_meta WHERE id='revision'").get().value;await sync.ensureSteamReviews(database);assert.equal(sqlite.prepare("SELECT value FROM catalog_meta WHERE id='revision'").get().value,revision);
f.close();
console.log('Passed: all languages/no country filters, consistent numerator and denominator, zero versus missing, bounded atomic migration, stable identities/content/Metacritic/media/personal data, history, rollback, concurrent edits, manual reviews and idempotency.');
