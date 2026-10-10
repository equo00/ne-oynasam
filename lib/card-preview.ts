import {gameById} from './catalog-repository';
import {db} from './db';
import {validId} from './security';

type Clip={src:string;format:'mp4'|'webm';loopSeconds:6;source:'steam-microtrailer'};
export type CardPreview={gameId:string;steamAppId:number;name:string;preview:Clip|null;fetchedAt:string;stale?:boolean};
const sourceOrigin='https://video.akamai.steamstatic.com/store_trailers/';
const normalized=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function previewCandidates(input:any,appid:number,name:string):Clip[]{
 const items=input?.response?.store_items;
 if(!Array.isArray(items)||items.length!==1)throw Error('Önizleme kaynak kimliği geçersiz.');
 const item=items[0];
 if(item.appid!==appid||item.id!==appid||item.item_type!==0||item.type!==0||item.success!==1||item.visible!==true||normalized(item.name||'')!==normalized(name))throw Error('Önizleme oyun kimliği eşleşmedi.');
 const result:Clip[]=[];
 for(const trailer of [...(item.trailers?.highlights||[]),...(item.trailers?.other_trailers||[])].slice(0,20)){
  for(const format of ['mp4','webm'] as const){
   const source=(Array.isArray(trailer.microtrailer)?trailer.microtrailer:[]).find((clip:any)=>clip.type==='video/'+format&&typeof clip.filename==='string'&&new RegExp('^'+appid+'/[0-9]+/[a-f0-9]{32,64}/[0-9]+/microtrailer\\.'+format+'$','i').test(clip.filename));
   if(source)result.push({src:sourceOrigin+source.filename,format,loopSeconds:6,source:'steam-microtrailer'});
  }
  // Kaynağın ilk uygun kısa videosu; tam fragman alternatif olarak kullanılmaz.
  if(result.length)break;
 }
 return result;
}
export function validPreview(clip:any,appid:number):boolean{
 if(!clip||clip.source!=='steam-microtrailer'||clip.loopSeconds!==6||!['mp4','webm'].includes(clip.format))return false;
 try{const u=new URL(clip.src);return u.protocol==='https:'&&u.origin==='https://video.akamai.steamstatic.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&new RegExp('^/store_trailers/'+appid+'/[0-9]+/[a-f0-9]{32,64}/[0-9]+/microtrailer\\.'+clip.format+'$','i').test(u.pathname);}catch{return false;}
}
let activeLoads=0;
export async function cardPreviewForGame(id:string):Promise<CardPreview>{
 if(!validId(id))throw Error('INVALID_GAME');
 const game=await gameById(id);
 if(!game||!game.platforms.includes('PC')||!Number.isSafeInteger(game.steamAppId)||!game.steamAppId||game.steamAppId<1||game.steamAppId>99999999)throw Error('INVALID_GAME');
 const appid=game.steamAppId,key='card-preview-v1:'+appid;let cached:CardPreview|null=null;
 try{
  const row=await db().prepare('SELECT payload FROM catalog_cache WHERE id=?').bind(key).first<{payload:string}>();
  if(row){const value=JSON.parse(row.payload);if(value.gameId===id&&value.steamAppId===appid&&normalized(value.name)===normalized(game.name)&&(value.preview===null||validPreview(value.preview,appid)))cached=value;}
 }catch{}
 const ttl=cached?.preview?86400000:3600000;
 if(cached&&Date.now()-Date.parse(cached.fetchedAt)<ttl)return cached;
 if(activeLoads>=8)throw Error('Önizleme kaynağı meşgul.');
 activeLoads++;let stage='store-items',sourceStatus:number|null=null;
 try{
  const input={ids:[{appid}],context:{language:'english',country_code:'US'},data_request:{include_trailers:true}};
  const url='https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json='+encodeURIComponent(JSON.stringify(input));
  const response=await fetch(url,{headers:{'User-Agent':'NeOynasam/3.0 game discovery'},signal:AbortSignal.timeout(10000)});sourceStatus=response.status;
  if(!response.ok)throw Error('Önizleme kaynağı yanıt vermedi.');
  stage='identity';const candidates=previewCandidates(await response.json(),appid,game.name);let preview:Clip|null=null;
  stage='cdn';
  for(const clip of candidates){
   try{const head=await fetch(clip.src,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(4000)});sourceStatus=head.status;const type=head.headers.get('content-type')?.split(';')[0];const size=Number(head.headers.get('content-length')||0);if(head.ok&&type==='video/'+clip.format&&size<=10000000){preview=clip;break;}}catch{sourceStatus=null;}
  }
  // Kaynakta kısa video var ama CDN yanıt vermiyorsa yokmuş gibi kalıcı kaydetme.
  if(candidates.length&&!preview)throw Error('Kısa video şu an erişilebilir değil.');
  const result:CardPreview={gameId:id,steamAppId:appid,name:game.name,preview,fetchedAt:new Date().toISOString()};
  stage='cache';await db().prepare('INSERT INTO catalog_cache(id,payload,fetched_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(result),result.fetchedAt).run();
  return result;
 }catch(error){console.warn('card-preview-source-failure',JSON.stringify({appid,stage,status:sourceStatus}));if(cached?.preview)return {...cached,stale:true};throw error;}finally{activeLoads--;}
}
