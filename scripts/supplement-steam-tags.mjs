// Public SteamSpy tag facts only, for primary pages that are unavailable.
// Respect the publisher's maximum one request per second; do not retry within 24h.
import fs from 'node:fs';
const root='/workspace/scratch/194b75ede87c/steam-tags-import';
const games=JSON.parse(fs.readFileSync('data/catalog.json'));
const primary=JSON.parse(fs.readFileSync(root+'/primary.json'));
const profiles=fs.existsSync(root+'/steamspy.json')?JSON.parse(fs.readFileSync(root+'/steamspy.json')):{};
const attempts=fs.existsSync(root+'/steamspy-attempts.json')?JSON.parse(fs.readFileSync(root+'/steamspy-attempts.json')):{};
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const tags=new Map(JSON.parse(fs.readFileSync('/workspace/scratch/194b75ede87c/pc-import/tags.json')).map(t=>[normalize(t.name),t.tagid]));
for(const p of Object.values(primary))for(const t of p.tags)tags.set(normalize(t.name),t.id);
const pending=games.filter(g=>!primary[g.steamAppId]&&!attempts[g.steamAppId]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const save=()=>{fs.writeFileSync(root+'/steamspy.json',JSON.stringify(profiles));fs.writeFileSync(root+'/steamspy-attempts.json',JSON.stringify(attempts));};
let completed=0;
for(const g of pending){
 const started=Date.now();
 try{
  const url=`https://steamspy.com/api.php?request=appdetails&appid=${g.steamAppId}`;
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const row=await response.json();
  if(row.appid!==g.steamAppId||typeof row.name!=='string'||normalize(row.name)!==normalize(g.name))throw new Error('Steam ID/title mismatch');
  const ranked=Object.entries(row.tags||{}).filter(([name,count])=>typeof count==='number'&&count>0&&tags.has(normalize(name))).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,count])=>({id:tags.get(normalize(name)),name,count}));
  if(!ranked.length)throw new Error('No usable public tag facts');
  profiles[g.steamAppId]={steamAppId:g.steamAppId,identityTitle:g.name,tags:ranked,sourceKind:'steamspy',sourceUrl:url,retrievedAt:new Date().toISOString()};
  attempts[g.steamAppId]={status:'matched',tagCount:ranked.length};
 }catch(e){attempts[g.steamAppId]={status:'unavailable',reason:e.message};}
 completed++;if(completed%10===0){save();console.log(JSON.stringify({completed,total:pending.length,matched:Object.keys(profiles).length}));}
 await wait(Math.max(0,1100-(Date.now()-started)));
}
save();console.log(JSON.stringify({completed,total:pending.length,matched:Object.keys(profiles).length}));
