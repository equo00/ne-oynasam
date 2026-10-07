import seed from '../data/catalog.json';
import {db} from './db';
import {steamDetails} from './steam';
import {validId} from './security';
export type MediaItem={id:string;kind:'video'|'image';name:string;thumbnail:string;src:string;format:'hls'|'mp4'|'webm'|'image';poster?:string;fallbackSrc?:string};
export type GameMedia={steamAppId:number;name:string;items:MediaItem[];sourceUrl:string;fetchedAt:string;stale?:boolean};
export function steamAsset(value:unknown){
 if(typeof value!=='string')return '';
 try{const u=new URL(value);if(u.username||u.password||!['https:','http:'].includes(u.protocol)||!(u.hostname.endsWith('.steamstatic.com')||u.hostname==='steamcdn-a.akamaihd.net'))return '';u.protocol='https:';return u.href;}catch{return '';}
}
const identity=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function parseSteamMedia(d:any,appid:number,expectedName:string):GameMedia{
 if(identity(d?.name||'')!==identity(expectedName)||(d.steam_appid!==undefined&&d.steam_appid!==appid))throw new Error('Oyun adı kaynakla eşleşmedi.');
 const items:MediaItem[]=[],seen=new Set<string>();
 for(const [index,m] of (Array.isArray(d.movies)?d.movies:[]).slice(0,20).entries()){
  const hls=steamAsset(m.hls_h264),mp4=steamAsset(m.mp4?.max)||steamAsset(m.mp4?.['480']),webm=steamAsset(m.webm?.max)||steamAsset(m.webm?.['480']);
  const src=hls||mp4||webm,thumbnail=steamAsset(m.thumbnail);if(!src||!thumbnail||seen.has(src))continue;
  const trailerApp=new URL(src).pathname.match(/^\/store_trailers\/(\d+)\//);if(trailerApp&&Number(trailerApp[1])!==appid)continue;
  if(!/\.(m3u8|mp4|webm)$/i.test(new URL(src).pathname))continue;
  seen.add(src);items.push({id:'video-'+index,kind:'video',name:typeof m.name==='string'?m.name.slice(0,200):'Fragman '+(index+1),thumbnail,poster:thumbnail,src,format:hls?'hls':mp4?'mp4':'webm',...(hls&&(mp4||webm)?{fallbackSrc:mp4||webm}:{})});
 }
 for(const [index,s] of (Array.isArray(d.screenshots)?d.screenshots:[]).slice(0,30).entries()){
  const src=steamAsset(s.path_full),thumbnail=steamAsset(s.path_thumbnail)||src;if(!src||!thumbnail||seen.has(src))continue;
  const p=new URL(src).pathname;if(!p.includes('/steam/apps/'+appid+'/'))continue;
  seen.add(src);items.push({id:'image-'+index,kind:'image',name:'Ekran görüntüsü '+(index+1),thumbnail,src,format:'image'});
 }
 return {steamAppId:appid,name:expectedName,items,sourceUrl:'https://store.steampowered.com/app/'+appid+'/',fetchedAt:new Date().toISOString()};
}
const pending=new Map<string,Promise<GameMedia>>();
export async function mediaForGame(id:string):Promise<GameMedia>{
 if(!validId(id))throw new Error('INVALID_GAME');
 let game:any=seed.find(g=>g.id===id);try{const row=await db().prepare('SELECT payload FROM source_games WHERE id=?').bind(id).first<{payload:string}>();if(row)game={...game,...JSON.parse(row.payload)};}catch{}
 if(!game||!Number.isSafeInteger(game.steamAppId)||!game.platforms?.includes('PC'))throw new Error('INVALID_GAME');
 const key='steam-media-v1:'+game.steamAppId;let cached:GameMedia|null=null;
 try{const row=await db().prepare('SELECT payload FROM catalog_cache WHERE id=?').bind(key).first<{payload:string}>();if(row){const value=JSON.parse(row.payload);if(value.steamAppId===game.steamAppId&&identity(value.name)===identity(game.name)&&Array.isArray(value.items))cached=value;}}catch{}
 if(cached&&Date.now()-Date.parse(cached.fetchedAt)<86400000)return cached;
 if(pending.has(key))return pending.get(key)!;
 if(pending.size>=100)throw new Error('Medya kaynağı meşgul.');
 const load=(async()=>{try{const d=await steamDetails(game.steamAppId),media=parseSteamMedia(d,game.steamAppId,game.name);try{await db().prepare('INSERT INTO catalog_cache(id,payload,fetched_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(media),media.fetchedAt).run();}catch{}return media;}catch(e){if(cached)return {...cached,stale:true};throw e;}finally{pending.delete(key);}})();pending.set(key,load);return load;
}
