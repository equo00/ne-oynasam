import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {strict as assert} from 'node:assert';

const seed=JSON.parse(fs.readFileSync('data/catalog.json'));
const now=Date.parse('2026-10-06T12:00:00Z');
let nextId=9900000;
const make=(id,tags,extra={})=>{const steamAppId=nextId++;return {id,name:id,genres:['RPG'],platforms:['PC'],steamAppId,steamTags:{steamAppId,identityTitle:id,tags:tags.map((t,i)=>({id:t,name:'Tag '+t,count:1000-i*10})),sourceKind:'steam-store',retrievedAt:'2026-10-06T10:00:00Z'},...extra};};
const target=make('target',[901,902,903,19,4182]);
const close=[...Array(30)].map((_,i)=>make('close-'+String(i).padStart(2,'0'),[901,902,903,19,4182]));
const weak=make('new-weak',[901,902,9991,9992],{catalogAddedAt:new Date(now-1000).toISOString()});
const unrelated=make('new-unrelated',[811,812,19,4182],{catalogAddedAt:new Date(now).toISOString()});
const fixtures=[target,...close,weak,unrelated,make('archived',[901,902,903],{catalogScope:'archive'}),make('console',[901,902,903],{platforms:['PlayStation']}),close[0]];
const ctx={state:{games:fixtures,current:target},Date,norm:s=>String(s).toLowerCase(),document:{addEventListener(){}},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/related.js','utf8'),ctx);
const recommend=(game,games)=>{ctx.testGame=game;ctx.testGames=games;return vm.runInContext('relatedGames(testGame,testGames)',ctx);};
let results=recommend(target,fixtures);
assert.equal(results.length,20,'Return at most the best twenty games');
assert.equal(new Set(results.map(g=>g.id)).size,20);
assert(!results.some(g=>['target','new-unrelated','archived','console','new-weak'].includes(g.id)),'Newness cannot override Steam-tag relevance');
const fresh=make('AAA-new-strong',[901,902,903,19,4182],{genres:['Yarış'],catalogAddedAt:new Date(now-1000).toISOString()});
fixtures.push(fresh);results=recommend(target,fixtures);
assert(results.some(g=>g.id===fresh.id),'A newly inserted matching game must enter the recalculated top twenty, irrespective of broad genre');
assert.equal(results.length,20);assert.equal(results[0].id,fresh.id);
const withoutFresh=fixtures.filter(g=>g.id!==fresh.id);
assert(!recommend(target,withoutFresh).some(g=>g.id===fresh.id),'Removed catalog records cannot persist in recommendations');
assert.equal(recommend(make('generic-only',[19,4182]),fixtures).length,0,'Action and Singleplayer alone do not establish useful similarity');
assert.equal(recommend({...target,steamTags:null},fixtures).length,0,'No coarse-genre fallback can masquerade as a Steam tag match');
assert.equal(recommend({...target,steamTags:{...target.steamTags,identityTitle:'Different game'}},fixtures).length,0);
const twenty=Array.from({length:20},(_,i)=>4000+i);
const target21=make('target-21',[...twenty,7000,7001]);
const candidate21=make('outside-top20',[7000,7001]);
assert.equal(recommend(target21,[target21,candidate21]).length,0,'Tags beyond the source top twenty cannot influence the match');
const rated=fixtures.map(g=>({...g,metacriticUser:{score:Math.random()*10}}));
assert.deepEqual(recommend(target,rated).map(g=>g.id),recommend(target,fixtures).map(g=>g.id),'Metacritic score cannot influence the related-game ranking');
const stored=JSON.parse(fs.readFileSync('data/steam-tags.json'));
const real=seed.map(g=>({...g,steamTags:stored[g.steamAppId]||null}));
const valheim=real.find(g=>g.name==='Valheim');assert(valheim);
results=recommend(valheim,real);
assert.equal(results.length,20);assert(results.every(g=>g.id!==valheim.id));
assert.deepEqual(results.map(g=>g.id),recommend(valheim,[...real].reverse()).map(g=>g.id),'Source insertion order must not decide similarity');
ctx.realGame=valheim;ctx.realGames=real;
const matches=vm.runInContext('relatedMatches(realGame,realGames)',ctx);
assert(matches.every(m=>m.shared.length>=2&&m.score>0&&m.score<=1.000001));
assert(matches.every((m,i)=>i===0||m.score<=matches[i-1].score));
console.log('Passed: top-20 Steam tags and top-20 games, specific shared tags, no coarse-genre fallback, new matching addition, no forced-new promotion, removal, duplicate/self/archive/console exclusion, source identity, score independence and deterministic real Valheim ranking.');

// Check the durable addition timestamp through the actual import and refresh paths.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args}
  bind(...args){return new Statement(this.sql,args)}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}
  async first(){return sqlite.prepare(this.sql).get(...this.args)||null}
  async run(){return sqlite.prepare(this.sql).run(...this.args)}
}
globalThis.testDb={prepare:sql=>new Statement(sql),batch:async stmts=>{const results=[];for(const s of stmts)results.push(await s.run());return results;}};
const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js')));
const dest='/tmp/neoynasam-related-catalog-test.mjs';
await build({entryPoints:['lib/catalog.ts'],outfile:dest,bundle:true,platform:'node',format:'esm',plugins:[{name:'test-env',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={DB:globalThis.testDb};',loader:'js'}));}}]});
const {catalog,addSourceGame,refreshSelected}=await import(pathToFileURL(dest));
const snak=value=>({rank:'normal',mainsnak:{snaktype:'value',datavalue:{value}}});
const steamId=9999001;assert(!seed.some(g=>g.steamAppId===steamId));
const steam={name:'New matching fixture',type:'game',platforms:{windows:true},release_date:{coming_soon:false,date:'Jan 2, 2025'},genres:[{description:'RPG'}],developers:['Fixture Studio'],header_image:`https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/header.jpg`,supported_languages:'English',categories:[]};
let tagPageAvailable=true;
const primaryTags=Array.from({length:24},(_,i)=>({tagid:8500+i,name:'Fixture Tag '+i,count:200-i,browseable:true}));
const tagHtml='<div id="appHubAppName">'+steam.name+'</div><script>InitAppTagModal('+steamId+','+JSON.stringify(primaryTags)+',[])</script>';
globalThis.fetch=async url=>{
 if(String(url).includes('/api/appdetails'))return Response.json({[steamId]:{success:true,data:steam}});
 if(String(url).includes('steampowered.com')){if(!tagPageAvailable)throw new Error('Store tag page unavailable');return new Response(tagHtml);}
 return Response.json({entities:{Q987654321:{labels:{en:{value:steam.name}},claims:{P31:[snak({id:'Q7889'})],P1733:[snak(String(steamId))],P400:[snak({id:'Q1406'})],P136:[snak({id:'Q2762504'})],P577:[snak({time:'+2025-01-02T00:00:00Z',precision:11})]}},Q1406:{labels:{en:{value:'Microsoft Windows'}}},Q2762504:{labels:{en:{value:'role-playing video game'}}}}});
};
const added=await addSourceGame('Q987654321');
assert(Number.isFinite(Date.parse(added.catalogAddedAt)));assert.equal(added.steamTags.tags.length,20);assert.equal(added.steamTags.tags[0].id,8500);assert.equal(added.steamTags.steamAppId,steamId);
let current=await catalog();assert.equal(current.games.length,seed.length+1);
assert.equal(current.games.find(g=>g.id===added.id).catalogAddedAt,added.catalogAddedAt);
assert.equal((await addSourceGame('Q987654321')).catalogAddedAt,added.catalogAddedAt,'Re-importing an existing game cannot reset its addition date');
sqlite.prepare('UPDATE source_games SET payload=? WHERE id=?').run(JSON.stringify({...added,catalogAddedAt:'2026-09-01T00:00:00Z'}),added.id);
tagPageAvailable=false;const updated=await refreshSelected([added.id]);
assert.deepEqual(updated.games[0].steamTags,added.steamTags,'If a tag refresh fails, the last verified profile must survive');
assert.equal(updated.games[0].catalogAddedAt,'2026-09-01T00:00:00Z','Refreshing store metadata must preserve the original addition date');
assert.equal((await catalog()).games.find(g=>g.id===added.id).catalogAddedAt,'2026-09-01T00:00:00Z');
sqlite.close();console.log('Passed: new-game Steam tags and addition time persist in D1; duplicate imports, store refresh and tag-source failure preserve verified data.');
