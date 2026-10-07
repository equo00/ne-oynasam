import seed from '../data/catalog.json';
import {db} from './db';
import {validId} from './security';
type SteamRelated={steamAppId:number;name:string;candidateAppIds:number[];sourceUrl:string;fetchedAt:string;stale?:boolean};
const identity=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const decode=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
export function parseSteamRelated(html:string,appid:number,name:string):SteamRelated{
 const header=html.match(/\bclass="header_image"[^>]*\bdata-ds-appid="(\d+)"/);
 if(Number(header?.[1])!==appid)throw new Error('Steam benzer oyun kimliği eşleşmedi.');
 const title=decode(html.match(/<title>([^<]*)<\/title>/)?.[1]||'').replace(/^Recommended\s*-\s*Similar items\s*-\s*/,'');
 if(identity(title)!==identity(name))throw new Error('Steam benzer oyun kimliği eşleşmedi.');
 const start=html.search(/<div\b[^>]*\bid="released"[^>]*>/);
 if(start<0)throw new Error('Steam benzer oyun listesi erişilebilir değil.');
 const rest=html.slice(start),next=rest.search(/<div\b[^>]*\bid="unreleased"[^>]*>/),section=next<0?rest:rest.slice(0,next);
 const seen=new Set([appid]),ids:number[]=[];
 for(const match of section.matchAll(/<a\b([^>]*\bclass="[^"]*\bsimilar_grid_capsule\b[^"]*"[^>]*)>/g)){
  const attrs=match[1],id=Number(attrs.match(/\bdata-ds-appid="(\d+)"/)?.[1]);
  const href=decode(attrs.match(/\bhref="([^"]+)"/)?.[1]||'');let u:URL;try{u=new URL(href);}catch{continue;}
  if(!Number.isSafeInteger(id)||id<1||id>99999999||seen.has(id)||u.protocol!=='https:'||u.hostname!=='store.steampowered.com'||!u.pathname.startsWith(`/app/${id}/`))continue;
  seen.add(id);ids.push(id);if(ids.length===200)break;
 }
 if(!ids.length)throw new Error('Steam benzer oyun listesi boş.');
 return {steamAppId:appid,name,candidateAppIds:ids,sourceUrl:`https://store.steampowered.com/recommended/morelike/app/${appid}/`,fetchedAt:new Date().toISOString()};
}
const pending=new Map<string,Promise<SteamRelated>>();
export async function relatedForGame(id:string):Promise<SteamRelated>{
 if(!validId(id))throw new Error('INVALID_GAME');
 let game:any=seed.find(g=>g.id===id);try{const row=await db().prepare('SELECT payload FROM source_games WHERE id=?').bind(id).first<{payload:string}>();if(row)game={...game,...JSON.parse(row.payload)};}catch{}
 if(!game||!Number.isSafeInteger(game.steamAppId)||game.steamAppId<1||game.steamAppId>99999999||!game.platforms?.includes('PC')||game.catalogScope==='archive')throw new Error('INVALID_GAME');
 const key='steam-related-v1:'+game.steamAppId;let cached:SteamRelated|null=null;
 try{const row=await db().prepare('SELECT payload FROM catalog_cache WHERE id=?').bind(key).first<{payload:string}>();if(row){const r=JSON.parse(row.payload);if(r.steamAppId===game.steamAppId&&identity(r.name||'')===identity(game.name)&&Array.isArray(r.candidateAppIds)&&r.candidateAppIds.length&&r.candidateAppIds.every((n:any)=>Number.isSafeInteger(n)&&n>0&&n<=99999999))cached=r;}}catch{}
 if(cached&&Date.now()-Date.parse(cached.fetchedAt)<3600000)return cached;
 if(pending.has(key))return pending.get(key)!;
 if(pending.size>=50)throw new Error('Kaynak şu an meşgul.');
 const task=(async()=>{try{
  const response=await fetch(`https://store.steampowered.com/recommended/morelike/app/${game.steamAppId}/?l=english`,{headers:{'User-Agent':'NeOynasam/3.0 game discovery'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Steam benzer oyun kaynağı yanıt vermedi.');
  const result=parseSteamRelated(await response.text(),game.steamAppId,game.name);
  try{await db().prepare('INSERT INTO catalog_cache(id,payload,fetched_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(result),result.fetchedAt).run();}catch{}
  return result;
 }catch(e){if(cached)return {...cached,stale:true};throw e;}finally{pending.delete(key);}})();pending.set(key,task);return task;
}
