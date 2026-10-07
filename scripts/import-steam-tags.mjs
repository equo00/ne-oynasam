// Resume-safe primary Store tag collection for existing games only; no catalog expansion.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const esbuildPackage=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',esbuildPackage,'node_modules/esbuild/lib/main.js')));
const bundled='/tmp/neoynasam-steam-tags-parser.mjs';
await build({entryPoints:['lib/steam-tags.ts'],outfile:bundled,bundle:true,platform:'node',format:'esm'});
const {parseSteamTags}=await import(pathToFileURL(bundled));
const games=JSON.parse(fs.readFileSync('data/catalog.json'));
const directory='/workspace/scratch/194b75ede87c/steam-tags-import';fs.mkdirSync(directory,{recursive:true});
const output=path.join(directory,'primary.json'),reportFile=path.join(directory,'attempts.json');
const profiles=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):{};
const report=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile)):{};
let cursor=0,finished=Object.keys(report).length,cooldown=0;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function save(){fs.writeFileSync(output,JSON.stringify(profiles));fs.writeFileSync(reportFile,JSON.stringify(report));}
async function worker(){
 while(cursor<games.length){
  const g=games[cursor++],key=String(g.steamAppId);if(report[key])continue;
  while(cooldown>Date.now())await delay(Math.min(1000,cooldown-Date.now()));
  try{
   const response=await fetch(`https://store.steampowered.com/app/${g.steamAppId}/?l=english`,{headers:{'User-Agent':'NeOynasam/3.0 game discovery'},signal:AbortSignal.timeout(20000)});
   if(response.status===429){cooldown=Date.now()+45000;throw new Error('HTTP 429; retry later');}
   if(!response.ok)throw new Error('HTTP '+response.status);
   if(new URL(response.url).pathname.startsWith('/agecheck/'))throw new Error('Public page requires age verification');
   profiles[key]=parseSteamTags(await response.text(),g.steamAppId,g.name);
   report[key]={status:'verified',tagCount:profiles[key].tags.length};
  }catch(e){report[key]={status:'unavailable',reason:e.message};}
  finished++;if(finished%25===0){save();console.log(JSON.stringify({completed:finished,total:games.length,primary:Object.keys(profiles).length}));}
  await delay(500);
 }
}
await Promise.all([worker(),worker(),worker()]);save();
console.log(JSON.stringify({completed:finished,total:games.length,primary:Object.keys(profiles).length,unavailable:games.length-Object.keys(profiles).length,directory}));
