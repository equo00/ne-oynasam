import fs from 'node:fs';
const [primaryFile,secondaryFile,labelsFile]=process.argv.slice(2);
if(!labelsFile)throw new Error('Provide primary, dated snapshot facts and Turkish labels paths.');
const read=file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
const primary=read(primaryFile),secondary=read(secondaryFile),labels=read(labelsFile),supplement=read('/workspace/scratch/194b75ede87c/steam-tags-import/steamspy.json');
const seed=JSON.parse(fs.readFileSync('data/catalog.json'));
const english=read('/workspace/scratch/194b75ede87c/pc-import/tags.json');
const tagIds=new Map(english.map(t=>[t.name,t.tagid]));
const records={},counts={'steam-store':0,'steamspy':0,'steamdb-snapshot':0,'steam-search':0,missing:0};
const identity=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
for(const g of seed){
 const id=String(g.steamAppId);
 let profile=primary[id]||supplement[id]||secondary[id];
 if(!profile&&g.tagsRaw?.length){const tags=[...new Set(g.tagsRaw)].map(name=>({id:tagIds.get(name),name,count:null})).filter(t=>t.id).slice(0,20);if(tags.length)profile={steamAppId:g.steamAppId,identityTitle:g.name,tags,sourceKind:'steam-search',sourceUrl:g.sourceUrl,retrievedAt:g.sourceRetrievedAt,complete:false};}
 if(profile&&profile.steamAppId===g.steamAppId&&identity(profile.identityTitle)===identity(g.name)&&profile.tags.length){records[id]=profile;counts[profile.sourceKind]++;}else counts.missing++;
}
fs.writeFileSync('data/steam-tags.json',JSON.stringify(records));
fs.writeFileSync('data/steam-tag-labels.json',JSON.stringify(labels));
// Inspectable subset and provenance for the dated GPL source facts.
fs.writeFileSync('public/steam-tags.json',JSON.stringify(records));
fs.writeFileSync('data/STEAM-TAGS-REPORT.json',JSON.stringify({generatedAt:new Date().toISOString(),games:seed.length,profiles:Object.keys(records).length,sources:counts,twentyTags:Object.values(records).filter(p=>p.tags.length===20).length,shortProfiles:Object.values(records).filter(p=>p.tags.length<20).map(p=>({steamAppId:p.steamAppId,name:p.identityTitle,tags:p.tags.length,sourceKind:p.sourceKind,complete:p.complete!==false})),allTags:Object.values(records).reduce((n,p)=>n+p.tags.length,0),recommendationStrategy:'Public Steam similar-items source order first; local top-20-tag completion; at most twenty games',algorithm:'Weighted Jaccard tag completion; Valve coefficients are not reproduced'},null,2));
console.log(JSON.stringify({profiles:Object.keys(records).length,sources:counts,twentyTags:Object.values(records).filter(p=>p.tags.length===20).length}));
