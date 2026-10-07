import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {strict as assert} from 'node:assert';
const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js')));
const dest='/tmp/neoynasam-source-test.mjs';
await build({entryPoints:['lib/catalog.ts'],outfile:dest,bundle:true,platform:'node',format:'esm',plugins:[{name:'env',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env={};',loader:'js'}));}}]});
const snak=value=>({rank:'normal',mainsnak:{snaktype:'value',datavalue:{value}}});
globalThis.fetch=async url=>{
 const u=new URL(url);assert.equal(u.searchParams.get('languages'),'en|tr|mul');
 const entities={Q60770258:{labels:{mul:{value:'Kenshi'},tr:{value:'Kenshi (video oyunu)'}},claims:{P31:[snak({id:'Q7889'})],P136:[snak({id:'Qgenre'})],P400:[snak({id:'Qplatform'})],P856:[snak('javascript:alert(1)'),snak('https://lofigames.com')],P577:[snak({time:'+2018-12-06T00:00:00Z',precision:11})]}},Q123:{labels:{en:{value:'A film'}},claims:{P31:[snak({id:'Q11424'})]}},Qgenre:{labels:{mul:{value:'role-playing video game'}}},Qplatform:{labels:{en:{value:'Microsoft Windows'}}}};
 // Entity IDs in the real API are numeric; use numeric fixture IDs for labels.
 entities.Q60770258.claims.P136=[snak({id:'Q2762504'})];entities.Q60770258.claims.P400=[snak({id:'Q1406'})];entities.Q2762504=entities.Qgenre;entities.Q1406=entities.Qplatform;
 return Response.json({entities});
};
const {metadataForQids,catalog}=await import(pathToFileURL(dest));
const actualCatalog=await catalog();const liveHelldivers=actualCatalog.games.find(g=>g.steamAppId===553850);assert.equal(liveHelldivers.metacriticUser.score,7.5);assert.equal(liveHelldivers.metacriticUser.metacriticNumericId,'1300595968');assert.equal(actualCatalog.games.find(g=>g.steamAppId===730).metacriticUser,null);assert.equal(actualCatalog.games.filter(g=>g.metacriticUser).length,JSON.parse(fs.readFileSync('data/METACRITIC-REPORT.json','utf8')).userScores);
const mortal=actualCatalog.games.find(g=>g.steamAppId===2584270);assert.equal(mortal.metacriticUser.score,7.8);assert.equal(mortal.metacriticUser.platform,'PC');assert.equal(mortal.metacriticUser.userRatings,507);assert.equal(mortal.metacriticUser.metacriticNumericId,'1300689309');
const games=await metadataForQids(['Q60770258','Q123']);
assert.equal(games.length,1);assert.equal(games[0].name,'Kenshi');assert.equal(games[0].year,2018);assert.deepEqual(games[0].genres,['RPG']);assert.deepEqual(games[0].platforms,['PC']);assert.equal(games[0].url,'https://lofigames.com/');
console.log('Passed: multilingual default labels, game-only source verification, genre/platform metadata and unsafe URL exclusion.');

const steamDest='/tmp/neoynasam-steam-test.mjs';await build({entryPoints:['lib/steam.ts'],outfile:steamDest,bundle:true,platform:'node',format:'esm'});
const {steamGame}=await import(pathToFileURL(steamDest));
let steamData={name:'Test game',type:'game',platforms:{windows:true,linux:true},release_date:{coming_soon:false,date:'Jan 2, 2023'},genres:[{description:'RPG'}],developers:['Test Studio'],header_image:'https://cdn.akamai.steamstatic.com/steam/apps/123/header.jpg',supported_languages:'English, Turkish',categories:[{description:'Online Co-op'}],metacritic:{score:99,url:'https://www.metacritic.com/game/test/'}};
globalThis.fetch=async()=>Response.json({'123':{success:true,data:steamData}});
const pc=await steamGame(123);assert.equal(pc.name,'Test game');assert(pc.pcSystems.includes('Windows'));assert(pc.hasTurkish&&pc.hasCoop);assert(!('metacriticUser' in pc),'Critic score cannot become user score');
steamData={...steamData,type:'dlc'};await assert.rejects(()=>steamGame(123));steamData={...steamData,type:'game',platforms:{windows:false}};await assert.rejects(()=>steamGame(123));await assert.rejects(()=>steamGame(-1));
console.log('Passed: primary Steam game-only Windows checks, language/co-op metadata, artwork host validation and critic/user separation.');
