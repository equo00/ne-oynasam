import fs from 'node:fs';
import {strict as assert} from 'node:assert';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';
import {parseMetacriticObservations,validateObservation} from '../lib/metacritic-observation.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline=read('data/metacritic-score-history.json'),report=read('data/METACRITIC-STEP3-REPORT.json'),updates=read('data/metacritic-score-updates.json');
const fixture=createCatalogFixture(),{sqlite,database}=fixture;
await readyCatalog(await moduleFor('lib/catalog-bootstrap.ts'));
const {ingestGames}=await moduleFor('lib/catalog-ingest.ts');
const current=sqlite.prepare("SELECT id,base_payload FROM catalog_games WHERE status='published'").all();
for(let i=0;i<current.length;i+=100){const input=current.slice(i,i+100).map(row=>{
 const game=JSON.parse(row.base_payload),identity=baseline.identities[game.id];
 return {...game,metacriticUser:baseline.records[identity.scoreRecordId]||null};
});await ingestGames(database,input,{scoreOnly:true});}
assert.equal(sqlite.prepare("SELECT COUNT(score_value) n FROM catalog_games WHERE status='published'").get().n,901);
// Personal state and a manual content override must survive a score-only import.
const first=updates.changes[0],game=JSON.parse(sqlite.prepare('SELECT base_payload FROM catalog_games WHERE id=?').get(first.gameId).base_payload);
sqlite.prepare('INSERT INTO catalog_overrides(game_id,field,value,updated_at) VALUES(?,?,?,?)').run(game.id,'desc',JSON.stringify('Yönetici açıklaması'),'2026-10-08');
await ingestGames(database,[{...game,desc:'Son kaynak açıklaması'}],{priority:71});
sqlite.prepare('INSERT INTO game_views(game_id,count) VALUES(?,?)').run(game.id,123);
sqlite.prepare('INSERT INTO catalog_media(game_id,media_id,kind,url,position,source,retrieved_at,payload) VALUES(?,?,?,?,?,?,?,?)').run(game.id,'admin-gallery','image','https://shared.akamai.steamstatic.com/manual.jpg',70,'admin','2026-10-08','{"verified":true}');
sqlite.prepare('INSERT INTO catalog_media(game_id,media_id,kind,url,position,source,retrieved_at,payload) VALUES(?,?,?,?,?,?,?,?)').run(game.id,'cached-gallery','image','https://shared.akamai.steamstatic.com/gallery.jpg',80,'steam-store-media','2026-10-08','{"verified":true}');
const relationTables=['catalog_editions','catalog_game_genres','catalog_tags','catalog_game_tags','catalog_game_systems','catalog_game_platforms','catalog_search_terms','catalog_media'];
const relationsBefore=new Map(relationTables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]));
const before=sqlite.prepare("SELECT id,payload,base_payload,source_priority,sort_order FROM catalog_games WHERE status='published' ORDER BY id").all();
const noScore=payload=>{const g=JSON.parse(payload);delete g.metacriticUser;return g;};
const scoreSync=await moduleFor('lib/metacritic-sync.ts');
const goodBatch=database.batch;
database.batch=async statements=>goodBatch([...statements,database.prepare('INSERT INTO missing_score_test_table VALUES(1)')]);
await assert.rejects(scoreSync.ensureMetacriticScores(database));
assert.equal(sqlite.prepare("SELECT cursor,lease_token FROM catalog_bootstrap WHERE stage='scores'").get().cursor,'0');
assert.equal(sqlite.prepare("SELECT cursor,lease_token FROM catalog_bootstrap WHERE stage='scores'").get().lease_token,null);
assert.equal(sqlite.prepare("SELECT COUNT(score_value) n FROM catalog_games WHERE status='published'").get().n,901,'A failed score batch must roll back completely');
database.batch=goodBatch;
const initial=await scoreSync.ensureMetacriticScores(database);assert.equal(initial.processed,10);assert.equal(initial.ready,false);
let state=initial;
for(let i=0;i<150&&!state.ready;i++)state=await scoreSync.ensureMetacriticScores(database);
assert(state.ready);assert.equal(state.total,updates.changes.length);
assert.equal(sqlite.prepare("SELECT COUNT(score_value) n FROM catalog_games WHERE status='published'").get().n,report.scores);
assert.equal(sqlite.prepare("SELECT COUNT(score_value) n FROM catalog_games WHERE status='published' AND score_platform='PC'").get().n,report.verifiedPcScores);
for(const [table,rows] of relationsBefore)assert.deepEqual(sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all(),rows,'Score-only import changed relation/media table: '+table);
assert.equal(sqlite.prepare('SELECT count FROM game_views WHERE game_id=?').get(game.id).count,123);
for(const row of before){const after=sqlite.prepare('SELECT payload,base_payload,source_priority,sort_order FROM catalog_games WHERE id=?').get(row.id);
 assert.deepEqual(noScore(after.payload),noScore(row.payload),'Score import changed content: '+row.id);
 assert.deepEqual(noScore(after.base_payload),noScore(row.base_payload),'Score import changed raw source: '+row.id);
 assert.equal(after.source_priority,row.source_priority);assert.equal(after.sort_order,row.sort_order);
 const old=baseline.records[baseline.identities[row.id]?.scoreRecordId];if(old)assert.equal(sqlite.prepare('SELECT payload FROM catalog_scores WHERE record_id=?').get(old.recordId).payload,JSON.stringify(old),'Historical score was removed');
}
for(const change of updates.changes){const after=JSON.parse(sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(change.gameId).payload);assert.deepEqual(after.metacriticUser,change.score);}
const revision=sqlite.prepare("SELECT value FROM catalog_meta WHERE id='revision'").get().value;
await Promise.all([scoreSync.ensureMetacriticScores(database),scoreSync.ensureMetacriticScores(database)]);
assert.equal(sqlite.prepare("SELECT value FROM catalog_meta WHERE id='revision'").get().value,revision,'Completed import must be idempotent');
// A concurrent source edit after preparation must prevent a stale score patch
// from replacing the raw record or writing a contradictory legacy mirror.
const saved=sqlite.prepare('SELECT base_payload,payload FROM catalog_games WHERE id=?').get(game.id);
const raw=JSON.parse(saved.base_payload),proposal={...raw,metacriticUser:{...raw.metacriticUser,recordId:raw.metacriticUser.recordId+'-race',score:1}};
let raced=false;
database.batch=async statements=>{if(!raced){raced=true;const newer={...raw,desc:'Eşzamanlı kaynak düzenlemesi'};
 sqlite.prepare('UPDATE catalog_games SET base_payload=?,content_hash=? WHERE id=?').run(JSON.stringify(newer),'concurrent-source-edit',game.id);
}return goodBatch(statements);};
const legacyBefore=sqlite.prepare('SELECT payload FROM source_games WHERE id=?').get(game.id).payload;
await ingestGames(database,[proposal],{scoreOnly:true,writeLegacy:true});
assert.equal(JSON.parse(sqlite.prepare('SELECT base_payload FROM catalog_games WHERE id=?').get(game.id).base_payload).desc,'Eşzamanlı kaynak düzenlemesi');
assert.equal(sqlite.prepare('SELECT payload FROM catalog_games WHERE id=?').get(game.id).payload,saved.payload);
assert.equal(sqlite.prepare('SELECT payload FROM source_games WHERE id=?').get(game.id).payload,legacyBefore);
database.batch=goodBatch;
fixture.close();

// Representative cached rendering, rounded counts, mixed platform and critic guards.
const page=`Game user reviews - Metacritic (https://www.metacritic.com/game/game/user-reviews/?platform=pc)
【turn123view0】 [wordlim: 200] Crawled: last month; Content type: text/html;
L110: Game
L111: # PC User Reviews
L112: 8.4
L113: User score
L114: positive
L115: 342(83%)
L116: mixed
L117: 33(8%)
L118: negative
L119: 39(9%)
L120: Showing 129 User Reviews`;
const [observation]=parseMetacriticObservations(page,'2026-10-08T08:00:00Z');
assert.equal(observation.userRatings,414);validateObservation(observation);
const [rounded]=parseMetacriticObservations(page.replace('342(83%)','1.2k(83%)'));assert.equal(rounded.userRatings,null);validateObservation(rounded);
for(const bad of [page.replace('PC User Reviews','PlayStation 5 User Reviews'),page.replace('User score','Metascore'),page.replace('platform=pc','platform=pc&platform=ps5'),page.replace('8.4','84')])assert.deepEqual(parseMetacriticObservations(bad),[]);
assert.throws(()=>validateObservation({...observation,userRatings:129}),/sayısı/);
assert.throws(()=>validateObservation({...observation,sourceUrl:'https://evil.example/game/game/user-reviews/'}),/geçersiz/);
console.log('Passed: reviewed PC aggregate parsing, exact/rounded counts, 901 historical scores, bounded resumable score-only import, content/rawbase/priority/view preservation, stable IDs, history and idempotency.');
