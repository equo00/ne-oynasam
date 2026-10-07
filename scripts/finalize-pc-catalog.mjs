// SPDX-License-Identifier: GPL-3.0-or-later
// Numerical score subset derived from leinstay/steamdb, with CC0 Wikidata facts.
import fs from 'node:fs';
import {refreshScoreFiles} from './refresh-metacritic-scores.mjs';
const root='/workspace/scratch/194b75ede87c';
const folder=root+'/pc-import';
const games=JSON.parse(fs.readFileSync(folder+'/catalog-raw.json','utf8'));
const checks=JSON.parse(fs.readFileSync(folder+'/cover-checks.json','utf8'));
const original=JSON.parse(fs.readFileSync('data/wikidata-seed.json','utf8'));
const dataset=JSON.parse(fs.readFileSync(root+'/steamdb-user-score-facts.json','utf8'));
const extras=JSON.parse(fs.readFileSync(folder+'/extra-facts.json','utf8'));
const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const extra=new Map(extras.map(r=>[r.steamAppId,r]));
const out=[],archive=[];
for(const raw of games){
 const g={...raw};const c=checks[g.steamAppId];
 if(!g.steamAppId||!g.coverFallbackUrl){archive.push(g);continue;}
 g.coverUrl=c?.ok?c.url:g.coverFallbackUrl;g.coverVerifiedAt=c?.ok?c.checkedAt:null;g.coverSourceCheckedAt=g.sourceRetrievedAt;g.coverValidation=c?.ok?'HTTP image response verified':'Image URL supplied in the retrieved Steam store record';g.catalogScope='pc';g.sourceType='game';
 // Steam upgraded this very app to The Final Cut. Retain the site's original
 // game ID; do not merge separately sold remasters or editions by title.
 if(g.steamAppId===632470){const legacy=original.find(g=>g.id==='disco-elysium');if(legacy){g.id=legacy.id;g.qid=legacy.qid;g.wikidataUrl=legacy.sourceUrl;}}
 const e=extra.get(g.steamAppId);
 if(e&&normalize(e.name)===normalize(g.name)){
  if(!g.studio&&e.developers?.length){g.studio=e.developers.join(', ');g.studioSource='leinstay/steamdb · 2026-10-04';}
  g.publishers=e.publishers||[];
  g.hasTurkish=Array.isArray(e.languages)?e.languages.includes('Turkish'):null;
  g.languageSource='leinstay/steamdb · 2026-10-04';
  g.hasCoop=Array.isArray(e.categories)?e.categories.some(x=>/co-op/i.test(x)):null;
  g.modeSource='leinstay/steamdb · 2026-10-04';
 }
 // Scores stay in their separately licensed, downloadable subset.
 delete g.metacriticUser;delete g.metacriticCritic;out.push(g);
}
if(out.length<1000)throw Error('At least 1000 verified PC games and covers required');
if(new Set(out.map(g=>g.id)).size!==out.length||new Set(out.map(g=>g.steamAppId)).size!==out.length)throw Error('Duplicate game identities');
fs.writeFileSync('data/catalog.json',JSON.stringify(out,null,2));
const activeIds=new Set(out.map(g=>g.id));const retainedArchive=archive.filter(g=>!activeIds.has(g.id)).map(g=>({...g,catalogScope:'archive'}));
fs.writeFileSync('data/legacy-catalog.json',JSON.stringify(retainedArchive,null,2));
fs.copyFileSync(root+'/steamdb-GPL-3.0-LICENSE.txt','public/score-data-LICENSE.txt');
fs.writeFileSync('public/source-facts.json',JSON.stringify({license:'GPL-3.0',attribution:'leinstay/steamdb, release2026-10-04; selected factual metadata subset',sourceRelease:dataset.downloadUrl,metadata:extras},null,2));
fs.copyFileSync(root+'/catalog-sources-report.md','data/PC-SOURCES.md');
fs.writeFileSync('data/PC-IMPORT-REPORT.json',JSON.stringify({retrievedAt:new Date().toISOString(),games:out.length,verifiedCovers:out.filter(g=>g.coverVerifiedAt).length,sourceProvidedCovers:out.length,userScores:0,verifiedHistoricalPcScores:0,excludedScoreMappings:[],legacyArchived:retainedArchive.map(g=>({id:g.id,name:g.name})),developers:out.filter(g=>g.studio).length},null,2));
refreshScoreFiles();
console.log(JSON.stringify({games:out.length,covers:out.length,developers:out.filter(g=>g.studio).length,archived:retainedArchive.length}));
