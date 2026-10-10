import fs from 'node:fs';import {strict as assert} from 'node:assert';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';
const fixture=createCatalogFixture(),sqlite=fixture.sqlite;
await readyCatalog(await moduleFor('lib/catalog-bootstrap.ts'));
const {dailySpotlight,spotlightPool,resolvedDailySpotlight}=await moduleFor('lib/spotlight.ts');
const seed=JSON.parse(fs.readFileSync('data/catalog.json'));const known=new Set(seed.map(g=>g.id));
const before=dailySpotlight(new Date('2026-10-05T20:59:59Z')),today=dailySpotlight(new Date('2026-10-05T21:00:00Z')),evening=dailySpotlight(new Date('2026-10-06T20:59:59Z'));
assert.equal(today.date,'2026-10-06');assert.equal(today.nextRefreshAt,'2026-10-06T21:00:00.000Z');assert.deepEqual(today,evening);assert.notDeepEqual(before.games,today.games);assert.equal(today.games.length,5);assert(today.games.some(g=>g.gameId==='kenshi'));
const daysPerTour=spotlightPool.length/5;assert.equal(spotlightPool.length,125);assert.equal(Number.isInteger(daysPerTour),true);assert.equal(today.poolSize,125);assert.equal(today.repeatPolicy,'full-pool-first');
const idsAt=n=>dailySpotlight(new Date(Date.UTC(2026,9,6+n,12))).games.map(g=>g.gameId);
const allIds=new Set(spotlightPool.map(g=>g.gameId));const signature=ids=>[...ids].sort().join('|');
let previousTour=null,previousDay=null;
for(let tour=0;tour<30;tour++){
 const seen=new Set(),groups=new Set(),ordered=[];
 for(let day=0;day<daysPerTour;day++){
  const ids=idsAt(tour*daysPerTour+day);assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
  for(const id of ids){assert(known.has(id));assert(allIds.has(id));assert(!seen.has(id),'No repeat before the entire pool has been shown');seen.add(id);ordered.push(id);assert(!/fifa|grand theft|gta/i.test(seed.find(x=>x.id===id).name));}
  if(previousDay)assert(!ids.some(id=>previousDay.includes(id)),'Consecutive daily sets must not repeat, including tour boundaries');
  groups.add(signature(ids));previousDay=ids;
 }
 assert.equal(seen.size,125);assert.deepEqual(seen,allIds);if(previousTour){assert.notDeepEqual(ordered,previousTour.ordered,'Each tour must have a new order');assert([...groups].some(g=>!previousTour.groups.has(g)),'Daily groupings must change between tours');}previousTour={ordered,groups};
}
const {spotlightSequence}=await moduleFor('lib/spotlight-rotation.ts');
// A future pool size that is not divisible by five must still consume every entry.
const oddPool=spotlightPool.slice(0,103),stream=[];for(let d=0;d<Math.ceil(oddPool.length*3/5);d++){const gs=spotlightSequence(oddPool,d);assert.equal(new Set(gs.map(g=>g.gameId)).size,5);stream.push(...gs.map(g=>g.gameId));}
for(let tour=0;tour<3;tour++)assert.equal(new Set(stream.slice(tour*103,(tour+1)*103)).size,103);
assert.deepEqual(idsAt(41),idsAt(41),'Reloads and different visitors share a stable daily set');assert.throws(()=>spotlightSequence(spotlightPool,NaN));assert.throws(()=>spotlightSequence([...spotlightPool,spotlightPool[0]],0));
console.log('Passed: 125 source-matched curated PC games, Istanbul midnight, 750 daily sets without repeats before full-pool coverage, changing tour order/combinations, protected tour boundaries and non-multiple-of-five pools.');
// Finish the bounded score import before measuring spotlight-only read queries.
const {ensureMetacriticScores}=await moduleFor('lib/metacritic-sync.ts');
let scoreImportReady=false;
for(let attempt=0;attempt<100;attempt++){if((await ensureMetacriticScores(fixture.database)).ready){scoreImportReady=true;break;}}
assert(scoreImportReady,'Bounded score import must finish before spotlight query checks');
fixture.clearQueries();
const resolved=await resolvedDailySpotlight(new Date('2026-10-06T12:00:00Z'));
assert.equal(resolved.games.length,5);assert(resolved.games.every(item=>item.game.id===item.gameId&&item.game.platforms.includes('PC')));
assert(fixture.queries.filter(x=>/SELECT[^;]*payload/i.test(x.sql)).every(x=>/\bIN\s*\(/i.test(x.sql)),'Daily spotlight selectively resolves five games');
const {parseSteamMedia,steamAsset,mediaForGame}=await moduleFor('lib/media.ts');
const host='https://shared.akamai.steamstatic.com';
let data={name:'Kenshi',steam_appid:233860,type:'game',platforms:{windows:true},release_date:{coming_soon:false},movies:[{id:1,name:'Trailer',thumbnail:host+'/steam/apps/999/movie.jpg',hls_h264:'https://video.akamai.steamstatic.com/store_trailers/233860/abc/hls.m3u8'}, {name:'Injected',thumbnail:host+'/steam/apps/999/movie.jpg',hls_h264:'https://evil.example/bad.m3u8'},{name:'Wrong game',thumbnail:host+'/steam/apps/999/movie.jpg',hls_h264:'https://video.akamai.steamstatic.com/store_trailers/1/bad.m3u8'}],screenshots:[{path_full:host+'/store_item_assets/steam/apps/233860/ss.jpg',path_thumbnail:host+'/store_item_assets/steam/apps/233860/thumb.jpg'},{path_full:'javascript:alert(1)'},{path_full:host+'/store_item_assets/steam/apps/1/ss.jpg'}]};
assert.equal(parseSteamMedia(data,233860,'Kenshi').items.length,2);assert.equal(parseSteamMedia(data,233860,'Kenshi').items[0].format,'hls');assert.equal(steamAsset('http://shared.akamai.steamstatic.com/a.jpg'),'https://shared.akamai.steamstatic.com/a.jpg');assert.equal(steamAsset('https://shared.akamai.steamstatic.com.evil.example/a.jpg'),'');assert.equal(steamAsset('https://user:password@shared.akamai.steamstatic.com/a.jpg'),'');assert.throws(()=>parseSteamMedia(data,233860,'Other title'));assert.throws(()=>parseSteamMedia({...data,steam_appid:1},233860,'Kenshi'));
assert.equal(parseSteamMedia({name:'Kenshi',movies:[{name:'Legacy',thumbnail:host+'/movie.jpg',mp4:{max:host+'/old.mp4'}}]},233860,'Kenshi').items[0].format,'mp4');assert.equal(parseSteamMedia({name:'Kenshi'},233860,'Kenshi').items.length,0);
let calls=0;globalThis.fetch=async url=>{assert.equal(new URL(url).searchParams.get('appids'),'233860');calls++;return Response.json({'233860':{success:true,data}});};
const coverRows=sqlite.prepare("SELECT media_id,url,payload FROM catalog_media WHERE game_id=? AND kind='cover' ORDER BY media_id").all('kenshi');
sqlite.prepare('INSERT INTO catalog_media(game_id,media_id,kind,url,position,source,retrieved_at,payload) VALUES(?,?,?,?,?,?,?,?)').run('kenshi','manual-gallery','image',host+'/manual.jpg',50,'admin','2026-10-07','{"verified":true}');
// Initialize this bundled module's schema before concurrent SQLite fixture transactions.
await assert.rejects(()=>mediaForGame('made-up-game'));
const [a,b]=await Promise.all([mediaForGame('kenshi'),mediaForGame('kenshi')]);assert.equal(a.items.length,2);assert.deepEqual(a,b);assert.equal(calls,1);await mediaForGame('kenshi');assert.equal(calls,1,'D1 cache must prevent a second upstream request');assert.equal(sqlite.prepare('SELECT count(*) AS n FROM catalog_cache').get().n,1);await assert.rejects(()=>mediaForGame('made-up-game'));await assert.rejects(()=>mediaForGame('https://evil.example/'));
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM catalog_media WHERE game_id=? AND source='steam-store-media'").get('kenshi').n,2);
assert.deepEqual(sqlite.prepare("SELECT media_id,url,payload FROM catalog_media WHERE game_id=? AND kind='cover' ORDER BY media_id").all('kenshi'),coverRows,'Source gallery refresh cannot remove covers');
assert.equal(sqlite.prepare('SELECT payload FROM catalog_media WHERE game_id=? AND media_id=?').get('kenshi','manual-gallery').payload,'{"verified":true}','Source gallery refresh cannot overwrite manual media');
const stale={...a,fetchedAt:'2020-01-01T00:00:00Z'};sqlite.prepare('UPDATE catalog_cache SET payload=?').run(JSON.stringify(stale));globalThis.fetch=async()=>{throw new Error('Offline')};assert.equal((await mediaForGame('kenshi')).stale,true);
const route=await moduleFor('app/api/media/route.ts');assert.equal((await route.GET(new Request('https://test.example/api/media?gameId=not-real'))).status,404);
console.log('Passed: video/image identity, trusted HTTPS CDN URLs, legacy MP4, empty gallery, concurrent fetch deduplication, persistent cache, stale fallback and invalid-game denial.');sqlite.close();
