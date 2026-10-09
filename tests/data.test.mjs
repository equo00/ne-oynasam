import fs from 'node:fs';import {strict as assert} from 'node:assert';
import {metacriticScoreForGame} from '../lib/metacritic-identity.mjs';
import {scorePlatformSlugs,validatePrimaryScoreFact} from '../lib/metacritic-platform.mjs';
const games=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const old=JSON.parse(fs.readFileSync('data/wikidata-seed.json','utf8'));
const archived=JSON.parse(fs.readFileSync('data/legacy-catalog.json','utf8'));
const scores=JSON.parse(fs.readFileSync('data/metacritic-users.json','utf8'));
const identities=JSON.parse(fs.readFileSync('data/game-identities.json','utf8'));
assert(games.length>=1000);assert.equal(new Set(games.map(g=>g.id)).size,games.length);assert.equal(new Set(games.map(g=>g.steamAppId)).size,games.length);
for(const g of games){assert(/^[a-z0-9][a-z0-9-]{0,99}$/.test(g.id));assert(Number.isSafeInteger(g.steamAppId)&&g.steamAppId>0);assert(g.sourceType==='game');assert(g.platforms.includes('PC'));assert(g.pcSystems.includes('Windows'));assert(g.name.trim());assert(g.year===null||Number.isInteger(g.year)&&g.year>=1970&&g.year<=new Date().getUTCFullYear());assert(g.sourceRetrievedAt&&g.yearSource);assert(g.coverVerifiedAt||g.coverSourceCheckedAt);assert(g.coverValidation);const u=new URL(g.coverUrl);assert(u.protocol==='https:'&&u.hostname.endsWith('.steamstatic.com'));assert(Array.isArray(g.sourceGenreValues)&&Array.isArray(g.sourcePlatformValues));}
for(const g of old)assert([...games,...archived].some(x=>x.id===g.id),'Legacy list identity lost: '+g.id);
const allIds=new Set(games.map(g=>String(g.steamAppId)));
for(const [id,r]of Object.entries(scores)){assert.equal(r.recordId,id);assert.equal(r.metric,'user-score');assert(typeof r.metacriticId==='string');assert(typeof r.score==='number'&&r.score>=0&&r.score<=10);assert(new URL(r.url).hostname==='www.metacritic.com');assert(r.sourceLabel&&r.sourceUrl&&r.snapshotDate&&r.verification);assert(['GPL-3.0','CC0 1.0','Source rights retained'].includes(r.license));assert(r.platform===null||scorePlatformSlugs(r.platform));if(r.license==='Source rights retained'){validatePrimaryScoreFact(r);assert(r.provenance);if(r.platform!==null)assert(scorePlatformSlugs(r.platform).includes(new URL(r.url).searchParams.get('platform')));else assert(!new URL(r.url).searchParams.has('platform'));assert.equal(r.scoreDate,null);assert(r.provenance.method!=='public-primary-cache'||r.provenance.sourceCrawlLabel);}if(r.license==='GPL-3.0'){assert.equal(r.scoreDate,null);assert.equal(r.platform,null);}}
assert.equal(Object.keys(identities).length,games.length);
for(const g of games){const identity=identities[g.id];assert.equal(identity.gameId,g.id);assert.equal(identity.steamAppId,g.steamAppId);if(identity.status==='ready'){const r=metacriticScoreForGame(g,identities,scores);assert(r,'Broken ID relationship for '+g.id);assert.equal(r.metacriticId,identity.metacritic.resourceId);}else{assert.equal(metacriticScoreForGame(g,identities,scores),null);assert(identity.reason);}}
const scoreForId=appid=>metacriticScoreForGame(games.find(g=>g.steamAppId===appid),identities,scores);
assert.equal(scoreForId(730).metacriticId,'counter-strike-2','CS2 must not receive the old CS:GO resource');assert.equal(scoreForId(730).score,5.5);assert.equal(scoreForId(730).platform,'PC');assert(!scoreForId(292030),'Remastered edition must not inherit an unverified original-edition score');
assert.equal(scoreForId(553850).score,7.5,'Helldivers 2 user-score regression');
console.log('Passed: '+games.length+' unique released Windows games with source-provided cover URLs; all old personal-list IDs retained; ID-based user scores, identity/platform/date safeguards.');
