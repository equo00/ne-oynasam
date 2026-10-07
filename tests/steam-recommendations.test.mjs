import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import vm from 'node:vm';import {DatabaseSync} from 'node:sqlite';import {strict as assert} from 'node:assert';
const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js')));
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async run(){return sqlite.prepare(this.sql).run(...this.args)}}
globalThis.testDb={prepare:sql=>new Statement(sql)};
const plugin={name:'test-env',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={DB:globalThis.testDb};',loader:'js'}));}};
const dest='/tmp/neoynasam-steam-recommendations-test.mjs';await build({entryPoints:['lib/related.ts'],outfile:dest,bundle:true,platform:'node',format:'esm',plugins:[plugin]});const {parseSteamRelated,relatedForGame}=await import(pathToFileURL(dest));
const capsule=(id,host='store.steampowered.com')=>`<a class="similar_grid_capsule" data-ds-appid="${id}" href="https://${host}/app/${id}/Game/">Cover</a>`;
const page=`<title>Recommended - Similar items - Kenshi</title><div class="header_image" data-ds-appid="233860"></div>${capsule(777777)}<div class="similar_grid_ctn" id="released">${[233860,1857950,1203620,1129580,1203620].map(id=>capsule(id)).join('')}${capsule(123,'evil.example')}<div class="similar_grid_ctn" id="unreleased">${capsule(888888)}`;
assert.deepEqual(parseSteamRelated(page,233860,'Kenshi').candidateAppIds,[1857950,1203620,1129580]);
assert.throws(()=>parseSteamRelated(page,233860,'A different game'));
assert.throws(()=>parseSteamRelated(page,123,'Kenshi'));
assert.throws(()=>parseSteamRelated('<title>Login</title>',233860,'Kenshi'));
let calls=0;globalThis.fetch=async url=>{calls++;assert.equal(url,'https://store.steampowered.com/recommended/morelike/app/233860/?l=english');return new Response(page);};
const [a,b]=await Promise.all([relatedForGame('kenshi'),relatedForGame('kenshi')]);assert.deepEqual(a,b);assert.equal(calls,1);await relatedForGame('kenshi');assert.equal(calls,1);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM catalog_cache WHERE id LIKE ?').get('steam-related-v1:%').n,1);
await assert.rejects(()=>relatedForGame('made-up-game'));await assert.rejects(()=>relatedForGame('https://evil.example/'));
sqlite.prepare('UPDATE catalog_cache SET payload=?').run(JSON.stringify({...a,fetchedAt:'2020-01-01T00:00:00Z'}));globalThis.fetch=async()=>{throw new Error('Offline')};const stale=await relatedForGame('kenshi');assert(stale.stale);assert.deepEqual(stale.candidateAppIds,a.candidateAppIds);
sqlite.close();console.log('Passed: Steam source/header/title identity, real capsule order, current/self/duplicate/foreign/upcoming exclusion, one-hour D1 cache, request dedup and stale fallback.');

const parserDest='/tmp/neoynasam-steam-tags-test.mjs';await build({entryPoints:['lib/steam-tags.ts'],outfile:parserDest,bundle:true,platform:'node',format:'esm'});const {parseSteamTags}=await import(pathToFileURL(parserDest));
const tags=Array.from({length:24},(_,i)=>({tagid:8000+i,name:'Tag '+i,count:24-i,browseable:true}));tags.push({tagid:9999,name:'Most important',count:1000,browseable:true},{tagid:8000,name:'Duplicate',count:1,browseable:true},{tagid:777,name:'Not browsable',count:10000,browseable:false},{tagid:778,name:'Invalid',count:-1});
const html='<div id="appHubAppName">Kenshi</div><script>InitAppTagModal(233860,'+JSON.stringify(tags)+',[]);</script>';
const parsed=parseSteamTags(html,233860,'Kenshi');assert.equal(parsed.tags.length,20);assert.equal(parsed.tags[0].id,9999);assert.equal(new Set(parsed.tags.map(t=>t.id)).size,20);assert(!parsed.tags.some(t=>[777,778].includes(t.id)));
assert.throws(()=>parseSteamTags(html,233860,'Different name'));assert.throws(()=>parseSteamTags(html,999,'Kenshi'));
console.log('Passed: effective source weights choose the highest twenty, sorted counts, distinct IDs, malformed/unbrowsable tags and wrong title/app rejection.');

const profiles=JSON.parse(fs.readFileSync('data/steam-tags.json'));const games=JSON.parse(fs.readFileSync('data/catalog.json')).map(g=>({...g,steamTags:profiles[g.steamAppId]||null}));
const ctx={state:{games},norm:s=>String(s).toLowerCase(),document:{addEventListener(){}},Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/related.js','utf8'),ctx);ctx.target=games.find(g=>g.id==='kenshi');ctx.native=a;
vm.runInContext('nativeRelated.set(target.id,native)',ctx);let results=vm.runInContext('relatedRecommendations(target)',ctx);assert.equal(results.length,20);assert.deepEqual(Array.from(results.slice(0,3),r=>r.game.steamAppId),a.candidateAppIds);assert(results.slice(0,3).every(r=>r.origin==='steam'));assert(results.slice(3).every(r=>r.origin==='tags'));assert.equal(new Set(results.map(r=>r.game.id)).size,20);
ctx.newId=9999002;vm.runInContext('nativeRelated.get(target.id).candidateAppIds.unshift(newId)',ctx);assert(!vm.runInContext('relatedGames(target).some(g=>g.steamAppId===newId)',ctx));
vm.runInContext("state.games.push({id:'new-native',name:'New native match',steamAppId:newId,platforms:['PC'],genres:[]})",ctx);results=vm.runInContext('relatedRecommendations(target)',ctx);assert.equal(results[0].game.id,'new-native','A newly cataloged game already recommended by Steam must appear without a hard-coded map or new deployment');assert.equal(results.length,20);
console.log('Passed: native Steam order precedes tag completion, cap twenty, dedup, and new catalog entries immediately enter the same live recommendation list.');
