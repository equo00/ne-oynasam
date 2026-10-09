import fs from 'node:fs';
import path from 'node:path';
import {steamReviewUrl,steamReviewSummary} from '../lib/steam-reviews.mjs';

const checkpoint='/workspace/scratch/194b75ede87c/pc-import';
fs.mkdirSync(checkpoint,{recursive:true});
const original=JSON.parse(fs.readFileSync('data/wikidata-seed.json','utf8'));
const stamp=new Date().toISOString().slice(0,10);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 for(let n=0;n<4;n++){
  try{const r=await fetch(url,{headers:{'User-Agent':'NeOynasam/2.0 game discovery catalog'},signal:AbortSignal.timeout(25000)});if(r.status===429){await wait(15000*(n+1));continue;}if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){if(n===3)throw e;await wait(2000*(n+1));}
 }
 throw Error('Rate limited');
}
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const translations={'Action':'Aksiyon','Adventure':'Macera','RPG':'RPG','Strategy':'Strateji','Simulation':'Simülasyon','Indie':'Bağımsız','Casual':'Gündelik','Racing':'Yarış','Sports':'Spor','Survival':'Hayatta kalma','Open World':'Açık dünya','Puzzle':'Bulmaca','Platformer':'Platform','2D Platformer':'Platform','3D Platformer':'Platform','FPS':'Nişancı','Third-Person Shooter':'Nişancı','Shooter':'Nişancı','Roguelike':'Roguelike','Action Roguelike':'Roguelike','Rogue-lite':'Roguelike','Horror':'Korku','Survival Horror':'Korku','Tactical':'Strateji','Turn-Based Strategy':'Strateji','RTS':'Strateji','City Builder':'Simülasyon','Farming Sim':'Simülasyon','Visual Novel':'Görsel roman'};
const tags=await get('https://store.steampowered.com/tagdata/populartags/english');
const tagMap=new Map(tags.map(t=>[t.tagid,t.name]));
fs.writeFileSync(path.join(checkpoint,'tags.json'),JSON.stringify(tags));
const aliases=new Map();
for(let start=0;start<original.length;start+=40){
 const ids=original.slice(start,start+40).map(g=>g.qid).join('|');
 const url=new URL('https://www.wikidata.org/w/api.php');url.search=new URLSearchParams({action:'wbgetentities',ids,props:'claims',format:'json'}).toString();
 try{const j=await get(url);for(const g of original.slice(start,start+40)){for(const c of j.entities?.[g.qid]?.claims?.P1733||[]){const id=Number(c.mainsnak?.datavalue?.value);if(c.rank!=='deprecated'&&Number.isSafeInteger(id)&&id>0)aliases.set(id,g);}}}catch(e){console.log('Wikidata alias group unavailable:',start,e.message);}
}
const games=new Map();
function parse(html){
 for(const match of html.matchAll(/<a\b[^>]*data-ds-appid="(\d+)"[\s\S]*?<\/a>/g)){
  const row=match[0],appid=Number(match[1]);
  if(!/class="platform_img win"/.test(row))continue;
  const name=decode(row.match(/<span class="title">([\s\S]*?)<\/span>/)?.[1]||'').trim();
  const rawDate=decode(row.match(/class="search_released[^\"]*">([\s\S]*?)<\/div>/)?.[1]||'').trim();
  const dt=new Date(rawDate);if(!name||!Number.isFinite(+dt)||+dt>Date.now())continue;
  const rawTags=JSON.parse(row.match(/data-ds-tagids="([^\"]+)"/)?.[1]||'[]').map(id=>tagMap.get(id)).filter(Boolean);
  const genres=[...new Set(rawTags.map(t=>translations[t]).filter(Boolean))];
  const legacy=aliases.get(appid);
  const capsule=decode(row.match(/<img src="([^\"]+)"/)?.[1]||'');
  const systems=['Windows',...(/platform_img mac/.test(row)?['macOS']:[]),...(/platform_img linux/.test(row)?['Linux']:[])];
  const game={...(legacy||{}),id:legacy?.id||'steam-'+appid,name,steamAppId:appid,year:dt.getUTCFullYear(),releaseDate:rawDate,yearSource:'Steam store release date; may reflect full release or rerelease',genres:genres.length?genres:legacy?.genres||[],platforms:[...new Set(['PC',...(legacy?.platforms||[])])],pcSystems:systems,studio:legacy?.studio||'',url:'https://store.steampowered.com/app/'+appid+'/',sourceKind:'steam',sourceUrl:'https://store.steampowered.com/app/'+appid+'/',sourceRetrievedAt:stamp,sourceGenreValues:rawTags,sourcePlatformValues:systems,genresRaw:rawTags,platformsRaw:systems,tagsRaw:rawTags,coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/'+appid+'/header.jpg',coverFallbackUrl:capsule,coverSource:'Steam publisher store artwork',coverSourceUrl:'https://store.steampowered.com/app/'+appid+'/',steamReview:null,metacriticUser:null};
  games.set(appid,game);
 }
}
for(const filter of ['topsellers','reviews']){
 for(let start=0;start<1000;start+=100){
  const file=path.join(checkpoint,filter+'-'+start+'.json');
  let j;
  if(fs.existsSync(file))j=JSON.parse(fs.readFileSync(file,'utf8'));
  else{const u=new URL('https://store.steampowered.com/search/results/');u.search=new URLSearchParams({query:'',start:String(start),count:'100',dynamic_data:'',sort_by:filter==='reviews'?'Reviews_DESC':'_ASC',...(filter==='topsellers'?{filter:'topsellers'}:{}),category1:'998',os:'win',supportedlang:'english',hidecomingsoon:'1',infinite:'1',ignore_preferences:'1'}).toString();j=await get(u);fs.writeFileSync(file,JSON.stringify(j));await wait(1800);}
  if(!j.success||!j.results_html)throw Error('Search response invalid');
  parse(j.results_html);console.log('PC catalog',filter,start,games.size);
  if(filter==='reviews'&&games.size>=1250)break;
 }
 if(games.size>=1250)break;
}
// Preserve old game IDs for existing personal lists. Query each known PC title
// by its verified Wikidata Steam identifier instead of guessing title matches.
for(const [appid,legacy] of aliases){
 if(!legacy.platforms.includes('PC')||games.has(appid))continue;
 try{
  const j=await get('https://store.steampowered.com/api/appdetails?appids='+appid+'&l=english');const d=j[appid]?.data;
  if(!j[appid]?.success||d.type!=='game'||!d.platforms?.windows)continue;
  games.set(appid,{...legacy,steamAppId:appid,name:d.name,coverUrl:d.header_image,coverFallbackUrl:d.capsule_image||d.header_image,coverSource:'Steam publisher store artwork',coverSourceUrl:'https://store.steampowered.com/app/'+appid+'/',steamUrl:'https://store.steampowered.com/app/'+appid+'/',pcSystems:['Windows',...(d.platforms.mac?['macOS']:[]),...(d.platforms.linux?['Linux']:[])],metacriticUser:null,metacriticCritic:d.metacritic?{score:d.metacritic.score,url:d.metacritic.url,retrievedAt:stamp}:null});
  await wait(1800);
 }catch(e){console.log('Legacy Steam record unavailable:',appid,e.message);}
}
const byId=new Map([...games.values()].map(g=>[g.id,g]));
for(const old of original){if(!byId.has(old.id)&&old.platforms.includes('PC'))byId.set(old.id,{...old,metacriticUser:null});}
const all=[...byId.values()];
// Mağaza arama ipucundaki dil kapsamını puan verisi olarak kullanma.
for(const game of all){if(!game.steamAppId)continue;try{const url=steamReviewUrl(game.steamAppId);game.steamReview=steamReviewSummary(await get(url),game.steamAppId,new Date().toISOString(),url);}catch{console.log('Tüm dil değerlendirmesi alınamadı:',game.steamAppId);game.steamReview=null;}await wait(250);}
if(all.filter(g=>g.platforms.includes('PC')&&g.steamAppId).length<1000)throw Error('Insufficient verified PC games');
fs.writeFileSync(path.join(checkpoint,'catalog-raw.json'),JSON.stringify(all,null,2));
fs.writeFileSync(path.join(checkpoint,'legacy-archive.json'),JSON.stringify(original.filter(g=>!g.platforms.includes('PC')),null,2));
console.log(JSON.stringify({games:all.length,pc:all.filter(g=>g.platforms.includes('PC')).length,steam:all.filter(g=>g.steamAppId).length,archive:original.filter(g=>!g.platforms.includes('PC')).length,checkpoint}));
