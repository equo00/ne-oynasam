import {db} from './db';
import {ingestGames,type BootstrapGate} from './catalog-ingest';
import {validCatalogGame,type CatalogGame} from './catalog-normalize';
import {metacriticScoreForGame} from './metacritic-identity.mjs';
export const CATALOG_BOOTSTRAP_ID='catalog-v2-seed-20261007';
export type CatalogReadiness={ready:boolean;stage:string;phase:string;cursor:string;processed:number};
let seedPromise:Promise<{games:CatalogGame[];labels:Record<string,string>;identities:any;scores:any;profiles:any}>|null=null;
async function seedData(){if(!seedPromise)seedPromise=(async()=>{const [seed,archived,scores,identities,profiles,labels,editorial,reviews,gameplay]=await Promise.all([import('../data/catalog.json'),import('../data/legacy-catalog.json'),import('../data/metacritic-users.json'),import('../data/game-identities.json'),import('../data/steam-tags.json'),import('../data/steam-tag-labels.json'),import('../public/editorial.json'),import('../data/steam-all-reviews.json'),import('../data/steam-gameplay.json')]);const byAppId=new Map(Object.values(editorial.default).filter((e:any)=>Number.isSafeInteger(e.steamAppId)).map((e:any)=>[e.steamAppId,e]));const allReviews=new Map(reviews.default.changes.map(c=>[c.gameId,c]));const gameplayById=new Map(gameplay.default.changes.map(c=>[c.gameId,c]));const attach=(g:any)=>{const observation=allReviews.get(g.id),review=observation&&observation.steamAppId===g.steamAppId?observation.review:null;const e=byAppId.get(g.steamAppId),profile=(profiles.default as any)[String(g.steamAppId)];return {...g,...(e?{editorial:e,...e}:{}),id:g.id,name:g.name,steamAppId:g.steamAppId,...(gameplayById.has(g.id)&&gameplayById.get(g.id)!.steamAppId===g.steamAppId?{gameplay:gameplayById.get(g.id)!.gameplay}:{}),...(review?{steamReview:review,steamReviewHistory:g.steamReview?[g.steamReview]:[]}:{}),...(profile?{steamTags:profile}:{}),metacriticUser:metacriticScoreForGame(g,identities.default,scores.default)};};return {games:[...seed.default.map(attach),...archived.default.map(g=>attach({...g,catalogScope:'archive'}))] as CatalogGame[],labels:labels.default,identities:identities.default,scores:scores.default,profiles:profiles.default};})();return seedPromise;}
function readiness(row:any):CatalogReadiness{return {ready:row.stage==='done',stage:row.stage,phase:row.stage,cursor:row.cursor,processed:row.processed};}
// Share immutable seed data, never pending request-owned D1 operations. The
// persisted lease below serializes chunks even when an earlier request aborts.
export async function ensureCatalogReady(database:D1Database=db(),options:{maxBatches?:number;batchSize?:number}={}):Promise<CatalogReadiness>{return run(database,options);}
async function run(database:D1Database,options:{maxBatches?:number;batchSize?:number}){
 let row:any=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(CATALOG_BOOTSTRAP_ID).first();if(row?.stage==='done')return readiness(row);
 const stamp=new Date().toISOString();await database.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'seed','0',0,?) ON CONFLICT(id) DO NOTHING").bind(CATALOG_BOOTSTRAP_ID,stamp).run();
 row=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(CATALOG_BOOTSTRAP_ID).first();if(row.stage==='done')return readiness(row);
 // Each public invocation performs one bounded atomic chunk. No open transaction spans requests.
 const size=Math.max(1,Math.min(50,options.batchSize??20)),max=Math.max(1,Math.min(1,options.maxBatches??1));
 for(let batch=0;batch<max;batch++){
  const token=crypto.randomUUID(),now=new Date().toISOString(),until=new Date(Date.now()+90000).toISOString();
  const claimed:any=await database.prepare("UPDATE catalog_bootstrap SET lease_token=?,lease_until=? WHERE id=? AND stage<>'done' AND (lease_token IS NULL OR lease_until<?) RETURNING *").bind(token,until,CATALOG_BOOTSTRAP_ID,now).first();if(!claimed)return readiness((await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(CATALOG_BOOTSTRAP_ID).first())!);
  const data=await seedData(),gate:BootstrapGate={id:CATALOG_BOOTSTRAP_ID,stage:claimed.stage,cursor:claimed.cursor,token};let games:CatalogGame[]=[],nextStage=claimed.stage,nextCursor=claimed.cursor,sortOrder=0,priority=10;
  try{
   if(claimed.stage==='seed'){sortOrder=Number(claimed.cursor);games=data.games.slice(sortOrder,sortOrder+size);nextCursor=String(sortOrder+games.length);if(Number(nextCursor)>=data.games.length){nextStage='legacy';nextCursor='';}}
   else if(claimed.stage==='legacy'){priority=20;const records=(await database.prepare('SELECT id,payload FROM source_games WHERE id>? ORDER BY id LIMIT ?').bind(claimed.cursor,size).all<any>()).results;nextCursor=records.length?records[records.length-1].id:claimed.cursor;for(const record of records){let g;try{g=JSON.parse(record.payload);}catch{throw new Error('Eski katalog JSON kaydı okunamadı: '+record.id);}if(!validCatalogGame(g))throw new Error('Eski katalog kimliği geçersiz: '+record.id);const sourceScore=metacriticScoreForGame(g,data.identities,data.scores);games.push({...g,...(sourceScore?{metacriticUser:sourceScore}:{}),...(g.steamTags?{}:data.profiles[String(g.steamAppId)]?{steamTags:data.profiles[String(g.steamAppId)]}:{}),catalogScope:g.platforms.includes('PC')&&g.coverUrl?'pc':g.catalogScope});}if(records.length<size)nextStage='done';sortOrder=data.games.length+claimed.processed;}
   const tail=database.prepare('UPDATE catalog_bootstrap SET stage=?,cursor=?,processed=processed+?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND stage=? AND cursor=? AND lease_token=?').bind(nextStage,nextCursor,games.length,new Date().toISOString(),gate.id,gate.stage,gate.cursor,gate.token);
   await ingestGames(database,games,{priority,sortOrder,labels:data.labels,gate,tail:[tail]});
  }catch(error){await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(CATALOG_BOOTSTRAP_ID,token).run();throw error;}
  row=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(CATALOG_BOOTSTRAP_ID).first();if(row.stage==='done')return readiness(row);
 }
 return readiness(row);
}
