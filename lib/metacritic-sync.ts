import {contentHash,type CatalogGame} from './catalog-normalize';
import {ingestGames,type BootstrapGate} from './catalog-ingest';
import {metacriticResource} from './metacritic-identity.mjs';
import {validatePrimaryScoreFact} from './metacritic-platform.mjs';

type ScoreBundle={id:string;changes:ScoreChange[];fillOnly?:boolean};
type ScoreChange={gameId:string;steamAppId:number;previousRecordId:string|null;score:any};
export type ScoreImportState={ready:boolean;processed:number;total:number;stage:string};
let bundled:Promise<{id:string;changes:ScoreChange[]}>|null=null;
async function bundle(){
 if(!bundled)bundled=(async()=>{
  const {default:input}=await import('../data/metacritic-score-updates.json');
  if(input.schemaVersion!==1||!Array.isArray(input.changes))throw new Error('Puan aktarım paketi geçersiz.');
  const ids=new Set<string>();
  for(const change of input.changes as ScoreChange[]){const score=change.score,resource=metacriticResource(score.url);
   if(ids.has(change.gameId)||score.gameId!==change.gameId||score.steamAppId!==change.steamAppId||score.platform!=='PC'||score.metric!=='user-score'||resource?.id!==score.metacriticId||
     !Number.isFinite(score.score)||score.score<0||score.score>10||score.provenance?.platformLabel!=='PC'||score.provenance?.metricLabel!=='User score'||score.provenance?.pageHeading!=='PC User Reviews'||
     new URL(score.url).searchParams.getAll('platform').some(p=>p!=='pc'))throw new Error('Aktarımda oyun/PC kullanıcı puanı kimliği geçersiz.');
   ids.add(change.gameId);
  }
  return {id:'metacritic-pc-'+(await contentHash(input)).slice(0,24),changes:input.changes as ScoreChange[]};
 })();return bundled;
}
let directBundled:Promise<ScoreBundle>|null=null;
async function directBundle(){
 if(!directBundled)directBundled=(async()=>{
  const {default:input}=await import('../data/metacritic-direct-score-updates.json');
  if(input.schemaVersion!==1||input.policy!=='metacritic-primary-pc-preferred-platform-fallback'||!Array.isArray(input.changes))throw Error('Doğrudan Metacritic paketi geçersiz.');
  const ids=new Set<string>();
  for(const change of input.changes as ScoreChange[]){const score=change.score,resource=metacriticResource(score.url);
   if(ids.has(change.gameId)||score.gameId!==change.gameId||score.steamAppId!==change.steamAppId||resource?.id!==score.metacriticId||change.previousRecordId!==null)throw Error('Doğrudan puan oyun/sürüm kimliği geçersiz.');
   validatePrimaryScoreFact(score);ids.add(change.gameId);
  }
  return {id:'metacritic-direct-'+(await contentHash(input)).slice(0,24),changes:input.changes as ScoreChange[],fillOnly:true};
 })();return directBundled;
}
const completed=new WeakMap<object,Map<string,ScoreImportState>>();

/** One bounded trusted chunk per request. No remote scraping or user-supplied writes. */
export async function ensureMetacriticScores(database:D1Database):Promise<ScoreImportState>{
 const bundles=await Promise.all([bundle(),directBundle()]),total=bundles.reduce((sum,b)=>sum+b.changes.length,0);
 let processed=0;const saved=completed.get(database)||new Map<string,ScoreImportState>();completed.set(database,saved);
 // Share only completed values, never request-owned pending D1 operations.
 for(const data of bundles){const result=saved.get(data.id)||await run(database,data);processed+=result.processed;
  if(!result.ready)return {...result,processed,total};saved.set(data.id,result);
 }
 return {ready:true,processed,total,stage:'done'};
}
async function run(database:D1Database,data:ScoreBundle):Promise<ScoreImportState>{
 if(!data.changes.length)return {ready:true,processed:0,total:0,stage:'done'};
 const stamp=new Date().toISOString();
 await database.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'scores','0',0,?) ON CONFLICT(id) DO NOTHING").bind(data.id,stamp).run();
 const state=(row:any):ScoreImportState=>({ready:row.stage==='done',processed:row.processed,total:data.changes.length,stage:row.stage});
 let row:any=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();
 if(row.stage==='done')return state(row);
 const token=crypto.randomUUID(),until=new Date(Date.now()+90000).toISOString();
 const claimed:any=await database.prepare("UPDATE catalog_bootstrap SET lease_token=?,lease_until=? WHERE id=? AND stage='scores' AND (lease_token IS NULL OR lease_until<?) RETURNING *").bind(token,until,data.id,stamp).first();
 if(!claimed)return state((await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first())!);
 const gate:BootstrapGate={id:data.id,stage:claimed.stage,cursor:claimed.cursor,token};
 try{
  const offset=Number(claimed.cursor),changes=data.changes.slice(offset,offset+10);
  const rows=(await database.prepare('SELECT id,steam_app_id,base_payload,payload FROM catalog_games WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(changes.map(c=>c.gameId))).all<any>()).results;
  const byId=new Map(rows.map(r=>[r.id,r])),patches:CatalogGame[]=[],accepted:any[]=[];
  for(const change of changes){const saved=byId.get(change.gameId);if(!saved||saved.steam_app_id!==change.steamAppId)throw new Error('Canlı oyun kimliği puan paketiyle uyuşmuyor: '+change.gameId);
   const base=JSON.parse(saved.base_payload||saved.payload),current=base.metacriticUser;
   // An existing verified PC observation, including later/manual work, wins.
   if(current&&(data.fillOnly||current.platform==='PC')){accepted.push({gameId:change.gameId,recordId:current.recordId});continue;}
   if(current&&current.recordId!==change.previousRecordId)throw new Error('Canlı puan değişmiş; yeni kimlik incelemesi gerekli: '+change.gameId);
   patches.push({id:base.id,name:base.name,steamAppId:base.steamAppId,genres:base.genres,platforms:base.platforms,metacriticUser:change.score});
   accepted.push({gameId:change.gameId,recordId:change.score.recordId});
  }
  const next=offset+changes.length;
  const tail=database.prepare("UPDATE catalog_bootstrap SET stage=?,cursor=?,processed=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND stage=? AND cursor=? AND lease_token=? AND NOT EXISTS(SELECT 1 FROM json_each(?) expected LEFT JOIN catalog_games g ON g.id=json_extract(expected.value,'$.gameId') WHERE g.id IS NULL OR json_extract(g.base_payload,'$.metacriticUser.recordId') IS NOT json_extract(expected.value,'$.recordId'))")
   .bind(next>=data.changes.length?'done':'scores',String(next),next,new Date().toISOString(),gate.id,gate.stage,gate.cursor,gate.token,JSON.stringify(accepted));
  await ingestGames(database,patches,{scoreOnly:true,writeLegacy:true,gate,tail:[tail]});
  row=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();
  if(row.lease_token===token){await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();}
  return state(row);
 }catch(error){await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();throw error;}
}
