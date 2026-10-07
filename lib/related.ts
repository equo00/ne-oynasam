import {gameById,catalogDatabase,gamesByIds,gamesBySteamIds} from './catalog-repository';
import type {Game} from './catalog';
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
async function nativeRelatedForGame(game:Game):Promise<SteamRelated>{
 if(!game||!Number.isSafeInteger(game.steamAppId)||Number(game.steamAppId)<1||Number(game.steamAppId)>99999999||!game.platforms?.includes('PC')||game.catalogScope==='archive')throw new Error('INVALID_GAME');
 const key='steam-related-v1:'+game.steamAppId;let cached:SteamRelated|null=null;
 try{const row=await db().prepare('SELECT payload FROM catalog_cache WHERE id=?').bind(key).first<{payload:string}>();if(row){const r=JSON.parse(row.payload);if(r.steamAppId===game.steamAppId&&identity(r.name||'')===identity(game.name)&&Array.isArray(r.candidateAppIds)&&r.candidateAppIds.length&&r.candidateAppIds.length<=200&&r.candidateAppIds.every((n:any)=>Number.isSafeInteger(n)&&n>0&&n<=99999999))cached=r;}}catch{}
 if(cached&&Date.now()-Date.parse(cached.fetchedAt)<3600000)return cached;
 if(pending.has(key))return pending.get(key)!;
 if(pending.size>=50)throw new Error('Kaynak şu an meşgul.');
 const task=(async()=>{try{
  const response=await fetch(`https://store.steampowered.com/recommended/morelike/app/${game.steamAppId}/?l=english`,{headers:{'User-Agent':'NeOynasam/3.0 game discovery'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Steam benzer oyun kaynağı yanıt vermedi.');
  const result=parseSteamRelated(await response.text(),Number(game.steamAppId),game.name);
  try{await db().prepare('INSERT INTO catalog_cache(id,payload,fetched_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(result),result.fetchedAt).run();}catch{}
  return result;
 }catch(e){if(cached)return {...cached,stale:true};throw e;}finally{pending.delete(key);}})();pending.set(key,task);return task;
}

const genericTags=new Set([19,21,492,4182,3859,597,493,113]);
function profileTags(game:Game){const profile=game.steamTags;if(!profile||profile.steamAppId!==game.steamAppId||identity(profile.identityTitle||'')!==identity(game.name))return [];const seen=new Set<number>();return (profile.tags||[]).filter((t:any)=>Number.isSafeInteger(t.id)&&t.id>0&&typeof t.name==='string'&&!seen.has(t.id)&&seen.add(t.id)).slice(0,20);}
export async function localRelatedForGame(game:Game,database?:D1Database){
 const target=profileTags(game);if(!target.length||!game.platforms.includes('PC')||game.catalogScope==='archive')return [];
 const d=database||await catalogDatabase();
 const [population,frequencies]=await Promise.all([
 d.prepare("SELECT COUNT(*) AS n FROM catalog_games g WHERE g.status='published' AND EXISTS(SELECT 1 FROM catalog_game_tags gt WHERE gt.game_id=g.id)").first<{n:number}>(),
 d.prepare('SELECT id,game_count FROM catalog_tags WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(target.map((t:any)=>t.id))).all<{id:number;game_count:number}>()
 ]);
 const count=Number(population?.n||0),rarity=new Map(frequencies.results.map(r=>[r.id,1+Math.log((count+1)/(r.game_count+1))])),maximum=Math.max(1,...target.map((t:any)=>Number(t.count)||0));
 const vector=target.map((t:any)=>({id:t.id,weight:(typeof t.count==='number'&&t.count>0?Math.sqrt(t.count/maximum):1)*(rarity.get(t.id)||1),specific:genericTags.has(t.id)?0:1}));
 const sum=vector.reduce((n:number,t:any)=>n+t.weight,0),minimumShared=Math.min(2,target.length),minimumSpecific=Math.max(1,Math.min(2,vector.filter((t:any)=>t.specific).length)),confidence=game.steamTags.complete===false?Math.sqrt(target.length/20):1;
 // Every eligible indexed shared-tag candidate is ranked in SQL. Only the final
 // 20 payloads cross the API boundary; no lexical candidate truncation occurs.
 const rows=await d.prepare(`
 WITH target AS MATERIALIZED (
  SELECT json_extract(value,'$.id') AS tag_id,json_extract(value,'$.weight') AS w,json_extract(value,'$.specific') AS specific FROM json_each(?)
 ), eligible AS MATERIALIZED (
  SELECT gt.game_id,COUNT(*) AS shared_count FROM target t CROSS JOIN catalog_game_tags gt INDEXED BY catalog_game_tags_filter_idx ON gt.tag_id=t.tag_id JOIN catalog_games g ON g.id=gt.game_id
  WHERE g.status='published' AND EXISTS(SELECT 1 FROM catalog_game_platforms p WHERE p.game_id=g.id AND p.platform='PC') AND g.id<>? AND (g.steam_app_id IS NULL OR g.steam_app_id<>?)
  GROUP BY gt.game_id HAVING COUNT(*)>=? AND SUM(t.specific)>=?
 ), raw_vectors AS (
  SELECT gt.game_id,gt.tag_id,gt.weight,MAX(gt.weight) OVER(PARTITION BY gt.game_id) AS maximum,d.game_count,e.shared_count
  FROM eligible e JOIN catalog_game_tags gt ON gt.game_id=e.game_id JOIN catalog_tags d ON d.id=gt.tag_id
 ), vectors AS (
  SELECT game_id,tag_id,shared_count,(CASE WHEN weight>0 THEN SQRT(weight/MAX(1,COALESCE(maximum,1))) ELSE 1 END)*(1+LN((?+1.0)/(game_count+1.0))) AS w FROM raw_vectors
 ), overlap AS (
  SELECT v.game_id,MAX(v.shared_count) AS shared_count,COUNT(*) AS tag_count,SUM(v.w) AS sum_weights,SUM(CASE WHEN t.w IS NULL THEN 0 ELSE MIN(v.w,t.w) END) AS common_weights
  FROM vectors v LEFT JOIN target t ON t.tag_id=v.tag_id GROUP BY v.game_id
 ), scores AS (
  SELECT o.game_id,o.shared_count,o.common_weights/(o.sum_weights+?-o.common_weights)*?*(CASE WHEN g.tag_profile_complete=0 THEN SQRT(o.tag_count/20.0) ELSE 1 END) AS score,g.name_search
  FROM overlap o JOIN catalog_games g ON g.id=o.game_id
 ) SELECT game_id,score,shared_count FROM scores WHERE score>0 ORDER BY score DESC,shared_count DESC,name_search ASC,game_id ASC LIMIT 20
 `).bind(JSON.stringify(vector),game.id,game.steamAppId||-1,minimumShared,minimumSpecific,count,sum,confidence).all<{game_id:string;score:number;shared_count:number}>();
 const games=await gamesByIds(rows.results.map(r=>r.game_id),d),byId=new Map(games.map(g=>[g.id,g])),targetIds=new Set(target.map((t:any)=>t.id));
 return rows.results.map(row=>{const candidate=byId.get(row.game_id)!;return {game:candidate,score:row.score,shared:profileTags(candidate).filter((t:any)=>targetIds.has(t.id)).sort((a:any,b:any)=>(rarity.get(b.id)||1)-(rarity.get(a.id)||1)),origin:'tags'};}).filter(r=>r.game);
}
export async function relatedForGame(id:string){
 if(!validId(id))throw new Error('INVALID_GAME');const game=await gameById(id);
 if(!game||!Number.isSafeInteger(game.steamAppId)||!game.platforms.includes('PC')||game.catalogScope==='archive')throw new Error('INVALID_GAME');
 const database=await catalogDatabase(),native=await nativeRelatedForGame(game).catch(()=>null),recommendations:any[]=[],seen=new Set([game.id]);
 if(native){for(let start=0;start<native.candidateAppIds.length&&recommendations.length<20;start+=60){const games=await gamesBySteamIds(native.candidateAppIds.slice(start,start+60),database);for(const candidate of games){if(seen.has(candidate.id)||candidate.steamAppId===game.steamAppId)continue;seen.add(candidate.id);const ids=new Set(profileTags(game).map((t:any)=>t.id));recommendations.push({game:candidate,score:null,shared:profileTags(candidate).filter((t:any)=>ids.has(t.id)),origin:'steam'});if(recommendations.length===20)break;}}}
 if(recommendations.length<20)for(const match of await localRelatedForGame(game,database)){if(seen.has(match.game.id))continue;seen.add(match.game.id);recommendations.push(match);if(recommendations.length===20)break;}
 return {apiVersion:2,steamAppId:game.steamAppId,name:game.name,candidateAppIds:native?.candidateAppIds||[],recommendations,fetchedAt:native?.fetchedAt||new Date().toISOString(),...(native?.stale?{stale:true}:{}),...(!native?{sourceUnavailable:true}:{})};
}
