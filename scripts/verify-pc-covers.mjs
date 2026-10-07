import fs from 'node:fs';
const folder='/workspace/scratch/194b75ede87c/pc-import';
const games=JSON.parse(fs.readFileSync(folder+'/catalog-raw.json','utf8'));
const file=folder+'/cover-checks.json';
const checks=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
let cursor=0,completed=0;
async function check(url){try{const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)});return r.ok&&(r.headers.get('content-type')||'').startsWith('image/')&&Number(r.headers.get('content-length')||2000)>1000;}catch{return false;}}
async function worker(){while(cursor<games.length){const g=games[cursor++];if(!g.coverUrl)continue;if(checks[g.steamAppId]){completed++;continue;}let url=g.coverUrl;let ok=await check(url);if(!ok&&g.coverFallbackUrl&&g.coverFallbackUrl!==url){url=g.coverFallbackUrl;ok=await check(url);}checks[g.steamAppId]={ok,url,checkedAt:new Date().toISOString()};completed++;if(completed%25===0){fs.writeFileSync(file,JSON.stringify(checks));console.log('Cover checks',completed,'/',games.length);}}}
await Promise.all(Array.from({length:16},worker));fs.writeFileSync(file,JSON.stringify(checks));
console.log(JSON.stringify({checked:Object.keys(checks).length,verified:Object.values(checks).filter(c=>c.ok).length,failed:Object.values(checks).filter(c=>!c.ok).length}));
