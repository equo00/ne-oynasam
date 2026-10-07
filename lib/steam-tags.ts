export type SteamTag={id:number;name:string;count:number|null};
export type SteamTagProfile={steamAppId:number;identityTitle:string;tags:SteamTag[];sourceKind:string;sourceUrl:string;retrievedAt:string;snapshotDate?:string};
const identity=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
export function parseSteamTags(html:string,appid:number,name:string):SteamTagProfile{
 const match=html.match(new RegExp('InitAppTagModal\\s*\\(\\s*'+appid+'\\s*,\\s*(\\[[\\s\\S]*?\\])\\s*,'));
 if(!match)throw new Error('Steam ayrıntılı etiket kaydı erişilebilir değil.');
 const actual=html.match(/<div\b[^>]*id="appHubAppName"[^>]*>([\s\S]*?)<\/div>/)?.[1];
 if(!actual||identity(decode(actual.replace(/<[^>]*>/g,'')).trim())!==identity(name))throw new Error('Steam etiket oyun kimliği eşleşmedi.');
 const raw=JSON.parse(match[1]);if(!Array.isArray(raw))throw new Error('Steam etiket biçimi geçersiz.');
 const seen=new Set<number>(),tags:SteamTag[]=[];
 for(const t of raw){
  if(!Number.isSafeInteger(t?.tagid)||t.tagid<1||typeof t.name!=='string'||!t.name.trim()||t.name.length>100||!Number.isFinite(t.count)||t.count<=0||t.browseable===false||seen.has(t.tagid))continue;
  seen.add(t.tagid);tags.push({id:t.tagid,name:t.name.trim(),count:t.count});
 }
 // Steam provides effective tag counts/weights; retain the highest 20 only.
 tags.sort((a,b)=>(b.count||0)-(a.count||0));
 if(!tags.length)throw new Error('Steam etiketleri bulunamadı.');
 return {steamAppId:appid,identityTitle:name,tags:tags.slice(0,20),sourceKind:'steam-store',sourceUrl:`https://store.steampowered.com/app/${appid}/`,retrievedAt:new Date().toISOString()};
}
export async function fetchSteamTagPage(appid:number){
 if(!Number.isSafeInteger(appid)||appid<1||appid>99999999)throw new Error('Geçersiz Steam kimliği.');
 const r=await fetch(`https://store.steampowered.com/app/${appid}/?l=english`,{headers:{'User-Agent':'NeOynasam/3.0 game discovery'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Steam etiket kaynağı yanıt vermedi.');
 if(new URL(r.url||`https://store.steampowered.com/app/${appid}/`).pathname.startsWith('/agecheck/'))throw new Error('Steam etiket kaydı yaş kontrolü arkasında.');
 return await r.text();
}
export async function fetchSteamTags(appid:number,name:string){return parseSteamTags(await fetchSteamTagPage(appid),appid,name);}
