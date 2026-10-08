// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import {validateObservation} from '../lib/metacritic-observation.mjs';
import {buildScoreCatalog,refreshScoreFiles} from './refresh-metacritic-scores.mjs';

// Candidates must first receive an explicit reviewed external-ID relationship.
// This importer never matches names, invents URLs, or relaxes edition exclusions.
const inputPath = process.argv[2];
if (!inputPath) throw Error('Kullanım: node scripts/import-reviewed-metacritic.mjs <gözlem-JSON>');
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const games=read('data/catalog.json'), input=read('data/metacritic-score-input.json'), evidence=read('data/metacritic-identity-evidence.json');
const reviewed=read('data/metacritic-reviewed-facts.json'), {observations,attempts=[]}=read(inputPath);
const established=buildScoreCatalog(games,input,evidence,reviewed), byGame=new Map(reviewed.facts.map(f=>[f.gameId,f]));
const baselinePath='data/metacritic-score-history.json';
if (!fs.existsSync(baselinePath)) {
  const identities=read('data/game-identities.json'), records=read('data/metacritic-users.json');
  fs.writeFileSync(baselinePath,JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),notice:'3. adım öncesindeki sayısal kayıtlar. Tarihsel veya platformu belirsiz puanlar PC puanı olarak yeniden etiketlenmez.',identities,records},null,2)+'\n');
}
const added=[];
for (const game of games) {
  const identity=established.identities[game.id];
  if (byGame.has(game.id) || identity.scorePlatform === 'PC' || !identity.metacritic) continue;
  const observation=observations[identity.metacritic.resourceId];
  if (!observation) continue;
  validateObservation(observation);
  if (identity.metacritic.resourceId !== observation.resourceId) throw Error('Dış kaynak kimliği uyuşmuyor.');
  const fact={recordId:`mc-user:reviewed:${game.steamAppId}:PC:${observation.retrievedAt.slice(0,10)}`,
    gameId:game.id,steamAppId:game.steamAppId,metacriticId:identity.metacritic.resourceId,metacriticNumericId:identity.metacritic.numericId,
    metric:'user-score',platform:'PC',score:observation.score,userRatings:observation.userRatings,sourceUrl:observation.sourceUrl,
    retrievedAt:observation.retrievedAt,snapshotDate:observation.retrievedAt.slice(0,10),scoreDate:null,
    provenance:{method:'public-primary-cache',metricLabel:'User score',platformLabel:'PC',pageHeading:'PC User Reviews',
      sourceCrawlLabel:observation.sourceCrawlLabel,retrievalReference:observation.retrievalReference,ratingBuckets:observation.ratingBuckets,
      evidenceSummary:'Açık PC başlığından sayısal kullanıcı ortalaması. Kesin oy sayısı yalnızca aynı gözlemdeki üç tam grubun toplamıdır; yazılı yorum ve kısaltılmış sayılar kullanılmaz. Önbellek yaşı korunur.'}};
  byGame.set(game.id,fact);added.push(game.id);
}
reviewed.facts=[...byGame.values()];
// Validate everything before modifying the accepted numerical input.
buildScoreCatalog(games,input,evidence,reviewed);
fs.writeFileSync('data/metacritic-reviewed-facts.json',JSON.stringify(reviewed,null,2)+'\n');
const result=refreshScoreFiles(),baseline=read(baselinePath);
const changes=[];
for (const game of games) {
 const beforeIdentity=baseline.identities[game.id],afterIdentity=result.identities[game.id];
 const previous=baseline.records[beforeIdentity?.scoreRecordId]||null,next=result.records[afterIdentity.scoreRecordId]||null;
 if (JSON.stringify(previous)!==JSON.stringify(next)) {
  if (!next || next.platform!=='PC') throw Error('Aktarım mevcut puanı silemez veya PC dışı kayıtla değiştiremez.');
  changes.push({gameId:game.id,steamAppId:game.steamAppId,previousRecordId:previous?.recordId||null,score:next});
 }
}
fs.writeFileSync('data/metacritic-score-updates.json',JSON.stringify({schemaVersion:1,changes},null,2)+'\n');
const missing=games.filter(g=>!result.identities[g.id].scoreRecordId).map(g=>({gameId:g.id,steamAppId:g.steamAppId,name:g.name,
  status:result.identities[g.id].status,metacritic:result.identities[g.id].metacritic,
  investigation:'Erişilebilir kaynaklarda bu oyun/PC sürümü için kabul edilebilir kimlik ve sayısal puan birlikte doğrulanamadı. Metacritic puanı olmadığı sonucuna varılmaz.',
  attempts:attempts.filter(a=>a.games?.includes(g.id)||a.resources?.includes(baseline.identities[g.id]?.metacritic?.resourceId))}));
const summary={schemaVersion:1,checkedAt:new Date().toISOString(),catalogGames:games.length,
  baselineScores:Object.keys(baseline.records).length,scores:result.report.userScores,previouslyMissing:games.length-Object.keys(baseline.records).length,
  recoveredMissing:changes.filter(c=>!c.previousRecordId).length,verifiedUnknownPlatform:changes.filter(c=>c.previousRecordId).length,
  verifiedPcScores:Object.values(result.records).filter(r=>r.platform==='PC').length,
  platformUnknown:Object.values(result.records).filter(r=>r.platform==null).length,remainingMissing:missing.length,
  checkedGames:games.filter(g=>attempts.some(a=>a.games?.includes(g.id)||a.resources?.includes(baseline.identities[g.id]?.metacritic?.resourceId))).length,attemptCount:attempts.length,sourceLimitation:'Doğrudan Metacritic erişimi engellendi; erişilebilir birincil önbellekler ve mağaza kimlik kanıtları incelendi. Önbellek gözlemleri canlı puan değildir.',
  changedGames:changes.map(c=>({gameId:c.gameId,steamAppId:c.steamAppId,previousRecordId:c.previousRecordId,recordId:c.score.recordId,score:c.score.score,userRatings:c.score.userRatings})),remaining:missing};
fs.writeFileSync('data/METACRITIC-STEP3-REPORT.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,changedGames:undefined,remaining:undefined,newlyAccepted:added.length}));
