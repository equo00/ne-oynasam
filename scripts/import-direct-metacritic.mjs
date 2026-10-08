// SPDX-License-Identifier: GPL-3.0-or-later
// Reviewed Metacritic facts and explicit IDs; no Steam crosslink prerequisite.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildScoreCatalog,refreshScoreFiles} from './refresh-metacritic-scores.mjs';

const file=process.argv[2];if(!file)throw Error('Kullanım: node scripts/import-direct-metacritic.mjs <incelenmiş-küçük-grup.json>');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const batch=read(file);if(batch.schemaVersion!==1||!batch.batchId||!Array.isArray(batch.facts)||batch.facts.length>10||!Array.isArray(batch.identityReviews)||!Array.isArray(batch.investigations))throw Error('İncelenmiş grup geçersiz veya on kayıttan büyük.');
const games=read('data/catalog.json'),source=read('data/metacritic-score-input.json'),evidence=read('data/metacritic-identity-evidence.json'),reviewed=read('data/metacritic-reviewed-facts.json');
const oldRecords=read('data/metacritic-users.json'),oldIdentities=read('data/game-identities.json'),delta=read('data/metacritic-direct-score-updates.json'),report=read('data/METACRITIC-STEP3-REPORT.json');
const prior=buildScoreCatalog(games,source,evidence,reviewed);
assert.deepEqual(prior.records,oldRecords,'Saklanan puanlar yeniden üretimle uyuşmuyor.');
const gameByApp=new Map(games.map(g=>[g.steamAppId,g]));
for(const review of batch.identityReviews){
 const g=gameByApp.get(review.steamAppId);if(!g||review.status!=='approved'||!review.evidenceURLs?.length||!review.rationale||!review.reviewedMetadata)throw Error('Kaynak oyun/sürüm kimlik incelemesi eksik.');
 const previous=evidence.manualReviews.find(r=>r.steamAppId===review.steamAppId);
 if(previous&&JSON.stringify(previous)!==JSON.stringify(review))throw Error('Önceki manuel kimlik kararı değişmiş; ayrı inceleme gerekir.');
 if(!previous)evidence.manualReviews.push(review);
}
const existingIds=new Set(reviewed.facts.map(f=>f.recordId));
for(const fact of batch.facts){
 const g=gameByApp.get(fact.steamAppId);if(!g||g.id!==fact.gameId)throw Error('Kalıcı oyun kimliği uyuşmuyor.');
 if(existingIds.has(fact.recordId)){assert.deepEqual(reviewed.facts.find(f=>f.recordId===fact.recordId),fact);continue;}
 if(oldIdentities[g.id].scoreRecordId)throw Error('Bu grup yalnızca eksik puanları doldurabilir.');
 reviewed.facts.push(fact);existingIds.add(fact.recordId);
}
const next=buildScoreCatalog(games,source,evidence,reviewed);
for(const [id,record] of Object.entries(oldRecords))assert.deepEqual(next.records[id],record,'Önceki puan kaydı değiştirilemez: '+id);
for(const [id,identity] of Object.entries(oldIdentities))if(identity.scoreRecordId)assert.equal(next.identities[id].scoreRecordId,identity.scoreRecordId,'Mevcut seçilmiş puan değiştirilemez: '+id);
const changes=[];
for(const g of games)if(!oldIdentities[g.id].scoreRecordId&&next.identities[g.id].scoreRecordId){
 const score=next.records[next.identities[g.id].scoreRecordId];changes.push({gameId:g.id,steamAppId:g.steamAppId,previousRecordId:null,score});
}
for(const change of changes){if(delta.changes.some(c=>c.gameId===change.gameId))throw Error('Yinelenen aktarım kimliği.');delta.changes.push(change);}
const auditPath='data/METACRITIC-DIRECT-REPORT.json';
const audit=fs.existsSync(auditPath)?read(auditPath):{schemaVersion:1,policy:delta.policy,baselineScores:Object.keys(oldRecords).length,baselineSha256:createHash('sha256').update(JSON.stringify(oldRecords)).digest('hex'),batches:[]};
if(!audit.batches.some(b=>b.batchId===batch.batchId))audit.batches.push({batchId:batch.batchId,checkedAt:batch.checkedAt,inputPath:file,added:changes.map(c=>({gameId:c.gameId,recordId:c.score.recordId,score:c.score.score,platform:c.score.platform,userRatings:c.score.userRatings})),investigations:batch.investigations});
// All validation precedes writes. Re-running a saved input is idempotent.
const write=(p,value)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
write('data/metacritic-identity-evidence.json',evidence);write('data/metacritic-reviewed-facts.json',reviewed);write('data/metacritic-direct-score-updates.json',delta);
const result=refreshScoreFiles();
const notes=new Map(audit.batches.flatMap(b=>b.investigations).map(r=>[r.gameId,r]));
report.remaining=result.report.missing.map(r=>({...(report.remaining.find(p=>p.gameId===r.gameId)||{}),...r,metacritic:result.identities[r.gameId].metacritic,...(notes.has(r.gameId)?{directInvestigation:notes.get(r.gameId)}:{})}));
report.policy=delta.policy;report.checkedAt=batch.checkedAt;report.scores=result.report.userScores;report.remainingMissing=report.remaining.length;
report.verifiedPcScores=Object.values(result.records).filter(r=>r.platform==='PC').length;
report.verifiedOtherPlatformScores=Object.values(result.records).filter(r=>r.platform!=null&&r.platform!=='PC').length;
report.platformUnknown=Object.values(result.records).filter(r=>r.platform==null).length;
report.recoveredMissing=report.previouslyMissing-report.remainingMissing;
report.directAdded=delta.changes.length;report.platformUnknownBlocksScoreDisplay=false;
report.sourceLimitation='Metacritic birincil sayfaları bağımsız aranır. Erişilebilir önbellek yaşı ve kullanıcı görüntüsü kanıtı korunur; tbd, erişim engeli ve kimlik belirsizliği ayrı raporlanır. Bu kayıtlar canlı ölçüm değildir.';
audit.scores=report.scores;audit.remainingMissing=report.remainingMissing;audit.verifiedPcScores=report.verifiedPcScores;audit.verifiedOtherPlatformScores=report.verifiedOtherPlatformScores;audit.platformUnknown=report.platformUnknown;
write('data/METACRITIC-STEP3-REPORT.json',report);write(auditPath,audit);
console.log(JSON.stringify({batchId:batch.batchId,added:changes.length,scores:report.scores,pc:report.verifiedPcScores,other:report.verifiedOtherPlatformScores,unknown:report.platformUnknown,remaining:report.remainingMissing}));
