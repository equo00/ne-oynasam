import fs from 'node:fs';
import {strict as assert} from 'node:assert';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';

const fixture=createCatalogFixture();
const bootstrap=await moduleFor('lib/catalog-bootstrap.ts');
await readyCatalog(bootstrap);
const repository=await moduleFor('lib/catalog-repository.ts');
const seed=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const archived=JSON.parse(fs.readFileSync('data/legacy-catalog.json','utf8'));
const {queryCatalog,gamesByIds,gamesBySteamIds,gameBySourceId,parseCatalogQuery}=repository;

let page=await queryCatalog();
assert.equal(page.apiVersion,2);
assert.equal(page.ready,true);
assert.equal(page.total,1323);
assert.equal(page.catalogStats.games,1323);
assert.equal(page.catalogStats.scores,901,'All existing score records remain visible, including platform-unknown sources');
assert.equal(page.games.length,24);
assert.equal(page.pageCount,Math.ceil(seed.length/24));
assert(!('archivedGames' in page),'Default payload must not include a hidden whole archive/catalog');
assert.deepEqual(page.games.map(g=>g.id),seed.slice(0,24).map(g=>g.id),'Existing discovery order and stable IDs survive migration');
const second=await queryCatalog({page:2});
assert.deepEqual(second.games.map(g=>g.id),seed.slice(24,48).map(g=>g.id));
assert.equal(new Set([...page.games,...second.games].map(g=>g.id)).size,48,'Pages cannot overlap for a stable dataset');
assert.deepEqual((await queryCatalog({page:2})).games.map(g=>g.id),second.games.map(g=>g.id));
const beyond=await queryCatalog({page:1000000});
assert.equal(beyond.page,beyond.pageCount);
assert(beyond.games.length>0&&beyond.games.length<=24);

const kenshi=(await queryCatalog({q:'KENSHI'})).games.find(g=>g.name==='Kenshi');
assert(kenshi);
assert((await queryCatalog({q:'kens'})).games.some(g=>g.id===kenshi.id),'Search must support normalized word prefixes');
assert.equal((await queryCatalog({q:"qzxnotarealgame' OR 1=1 --"})).total,0,'SQL-looking search input is a bound value');
assert.equal((await queryCatalog({q:'qzxvjnotarealgame'})).total,0);
const ids=[archived[0].id,kenshi.id,'missing-game'];
const selected=await gamesByIds(ids);
assert.deepEqual(selected.map(g=>g.id),ids.slice(0,2),'Selective hydration preserves requested order and existing archive links');
assert.equal((await gameBySourceId('steam',String(kenshi.steamAppId))).id,kenshi.id);
assert.equal((await gamesBySteamIds([kenshi.steamAppId]))[0].id,kenshi.id);
await assert.rejects(()=>gamesByIds(Array(61).fill(kenshi.id)));
await assert.rejects(()=>gamesByIds(['invalid/id']));
await assert.rejects(()=>gamesBySteamIds([-1]));

const helldivers=seed.find(g=>g.steamAppId===553850),mortal=seed.find(g=>g.steamAppId===2584270);
const scored=await gamesByIds([helldivers.id,mortal.id]);
assert.equal(scored[0].metacriticUser.score,7.5);
assert.equal(scored[0].metacriticUser.metacriticNumericId,'1300595968');
assert.equal(scored[1].metacriticUser.score,7.8);
assert.equal(scored[1].metacriticUser.platform,'PC');
assert.equal(scored[1].metacriticUser.userRatings,507);
assert.equal(fixture.sqlite.prepare('SELECT score_count FROM catalog_games WHERE id=?').get(mortal.id).score_count,507,'Known source rating counts must be normalized without guessing unknown values');
assert(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_games WHERE score_value IS NOT NULL AND score_platform IS NULL').get().n>800);
assert(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_games WHERE score_value IS NOT NULL AND score_count IS NULL').get().n>800);

for(const sort of ['editor','new','old','name','rating','steam','views']){
 const a=await queryCatalog({sort,page:1}),b=await queryCatalog({sort,page:1}),next=await queryCatalog({sort,page:2});
 assert.deepEqual(a.games.map(g=>g.id),b.games.map(g=>g.id),`${sort} ties must have stable ordering`);
 assert.equal(new Set([...a.games,...next.games].map(g=>g.id)).size,a.games.length+next.games.length);
}
const filtered=await queryCatalog({genres:['Aksiyon','Korku'],system:'Windows',tags:[19],rating:5});
assert(filtered.games.every(g=>g.genres.includes('Aksiyon')&&g.genres.includes('Korku')&&g.pcSystems.includes('Windows')&&g.metacriticUser.score>=5&&g.steamTags.tags.some(t=>t.id===19)),'All genre/tag/system/score conditions combine with AND');
const scoredPage=await queryCatalog({rating:8,sort:'rating'});
assert(scoredPage.total>0);
assert(scoredPage.games.every(g=>g.metacriticUser?.score>=8));
assert.equal((await queryCatalog({genres:['not-a-real-genre']})).total,0);
assert.equal((await queryCatalog({tags:[999999998]})).total,0);

fixture.sqlite.prepare('INSERT INTO library(user_id,game_id,status,note,rating,updated_at) VALUES(?,?,?,?,?,?)').run('review-user',archived[0].id,'planned','private note',4,'2026-10-07');
fixture.sqlite.prepare('INSERT INTO library(user_id,game_id,status,note,rating,updated_at) VALUES(?,?,?,?,?,?)').run('other-user',kenshi.id,'playing','hidden',2,'2026-10-07');
assert.deepEqual((await queryCatalog({library:true},'review-user')).games.map(g=>g.id),[archived[0].id]);
assert.equal((await queryCatalog({library:true},'stranger-user')).total,0);
await assert.rejects(()=>queryCatalog({library:true}));

for(const params of ['pageSize=61','page=0','sort=drop','system=Android','rating=11','rating=NaN','tag=invalid','genre='+Array(81).fill('a').join('')])assert.throws(()=>parseCatalogQuery(new URLSearchParams(params)),params);
const parsed=parseCatalogQuery(new URLSearchParams('genre=Aksiyon&genre=Korku&genre=Aksiyon&tag=19&tag=1667&pageSize=60'));
assert.deepEqual(parsed.genres,['Aksiyon','Korku']);
assert.deepEqual(parsed.tags,[19,1667]);
assert.equal(parsed.pageSize,60);

fixture.clearQueries();
await queryCatalog({page:2});
await gamesByIds([kenshi.id]);
const payloadQueries=fixture.queries.filter(x=>/SELECT[^;]*payload/i.test(x.sql));
assert(payloadQueries.length>=2);
assert(payloadQueries.every(x=>/\bLIMIT\b|\bIN\s*\(|WHERE[^;]*id\s*=\s*\?/i.test(x.sql)),'Every payload read must select a page or specific identities');
console.log('Passed: actual indexed catalog migration, preserved 1323 + 3 IDs and 901 source scores, known/null rating counts, bounded pages and hydration, AND filters, normalized prefix search, deterministic sorting, archives, library isolation and strict query validation.');
fixture.close();
