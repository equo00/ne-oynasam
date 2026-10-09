import {contentHash} from './catalog-normalize';
import {validAllSteamReview,STEAM_REVIEW_POLICY} from './steam-reviews.mjs';

type Change={gameId:string;steamAppId:number;review:any};
type Bundle={id:string;changes:Change[]};
export type SteamReviewSyncState={ready:boolean;processed:number;total:number;stage:string};
let bundled:Promise<Bundle>|null=null;
async function bundle():Promise<Bundle>{if(!bundled)bundled=(async()=>{const {default:input}=await import('../data/steam-all-reviews.json');const seen=new Set<string>();if(input.schemaVersion!==1||input.policy!==STEAM_REVIEW_POLICY)throw Error('Steam aktarım paketi geçersiz.');for(const c of input.changes){if(seen.has(c.gameId)||!validAllSteamReview(c.review,c.steamAppId)||!Number.isSafeInteger(c.steamAppId))throw Error('Steam puan kimliği veya toplamları geçersiz.');seen.add(c.gameId);}return {id:'steam-all-'+(await contentHash(input.changes)).slice(0,24),changes:input.changes};})();return bundled;}
const completed=new WeakMap<object,SteamReviewSyncState>();
/** Her çağrıda en fazla 25 kayıt, kalıcı devam noktası ve atomik veri grubu. */
export async function ensureSteamReviews(database:D1Database):Promise<SteamReviewSyncState>{
 const cached=completed.get(database);if(cached)return cached;
 const data=await bundle(),stamp=new Date().toISOString();
 await database.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'steam-reviews','0',0,?) ON CONFLICT(id) DO NOTHING").bind(data.id,stamp).run();
 const state=(r:any):SteamReviewSyncState=>({ready:r.stage==='done',processed:r.processed,total:data.changes.length,stage:r.stage});
 let row:any=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();if(row.stage==='done'){const value=state(row);completed.set(database,value);return value;}
 const token=crypto.randomUUID(),until=new Date(Date.now()+90000).toISOString();
 const claimed:any=await database.prepare("UPDATE catalog_bootstrap SET lease_token=?,lease_until=? WHERE id=? AND stage='steam-reviews' AND (lease_token IS NULL OR lease_until<?) RETURNING *").bind(token,until,data.id,stamp).first();if(!claimed)return state(row);
 const guard="EXISTS(SELECT 1 FROM catalog_bootstrap WHERE id=? AND stage='steam-reviews' AND cursor=? AND lease_token=?)",guardArgs=[data.id,claimed.cursor,token];
 try{
  const offset=Number(claimed.cursor),changes=data.changes.slice(offset,offset+25),ids=JSON.stringify(changes.map(c=>c.gameId));
  const rows=(await database.prepare('SELECT id,steam_app_id,status,payload,base_payload,content_hash FROM catalog_games WHERE id IN (SELECT value FROM json_each(?))').bind(ids).all<any>()).results;
  const manual=new Set((await database.prepare("SELECT game_id FROM catalog_overrides WHERE field='steamReview' AND game_id IN (SELECT value FROM json_each(?))").bind(ids).all<any>()).results.map(r=>r.game_id));
  const byId=new Map(rows.map(r=>[r.id,r])),statements:D1PreparedStatement[]=[],expected:{id:string;hash:string}[]=[];
  for(const c of changes){const saved=byId.get(c.gameId);if(!saved||saved.steam_app_id!==c.steamAppId)throw Error('Steam aktarımı canlı oyun kimliğiyle uyuşmuyor: '+c.gameId);
   const oldBase=JSON.parse(saved.base_payload),oldGame=JSON.parse(saved.payload),old=oldBase.steamReview;
   if(manual.has(c.gameId)||(validAllSteamReview(old)&&Date.parse(old.retrievedAt)>=Date.parse(c.review.retrievedAt))){expected.push({id:c.gameId,hash:saved.content_hash});continue;}
   const history=[...(Array.isArray(oldBase.steamReviewHistory)?oldBase.steamReviewHistory:[])];if(old&&!history.some(r=>JSON.stringify(r)===JSON.stringify(old)))history.push(old);
   const base={...oldBase,steamReview:c.review,steamReviewHistory:history},game={...oldGame,steamReview:c.review,steamReviewHistory:history};
   const hash=await contentHash({base,game,status:saved.status});expected.push({id:c.gameId,hash});
   statements.push(database.prepare(`UPDATE catalog_games SET base_payload=?,payload=?,steam_positive_percent=?,content_hash=?,revision=revision+1,updated_at=? WHERE id=? AND steam_app_id=? AND content_hash=? AND ${guard}`).bind(JSON.stringify(base),JSON.stringify(game),c.review.positivePercent,hash,stamp,c.gameId,c.steamAppId,saved.content_hash,...guardArgs));
   // Eski ayna kaydının da sadece değerlendirme alanlarına dokunulur.
   statements.push(database.prepare(`UPDATE source_games SET payload=json_set(payload,'$.steamReview',json(?),'$.steamReviewHistory',json(?)) WHERE id=? AND EXISTS(SELECT 1 FROM catalog_games WHERE id=? AND content_hash=?) AND ${guard}`).bind(JSON.stringify(c.review),JSON.stringify(history),c.gameId,c.gameId,hash,...guardArgs));
  }
  if(statements.length)statements.push(database.prepare(`UPDATE catalog_meta SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT),updated_at=? WHERE id='revision' AND ${guard}`).bind(stamp,...guardArgs));
  const next=offset+changes.length;
  statements.push(database.prepare(`UPDATE catalog_bootstrap SET stage=?,cursor=?,processed=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND cursor=? AND lease_token=? AND NOT EXISTS(SELECT 1 FROM json_each(?) e LEFT JOIN catalog_games g ON g.id=json_extract(e.value,'$.id') WHERE g.id IS NULL OR g.content_hash IS NOT json_extract(e.value,'$.hash'))`).bind(next>=data.changes.length?'done':'steam-reviews',String(next),next,stamp,data.id,claimed.cursor,token,JSON.stringify(expected)));
  await database.batch(statements);row=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();
  if(row.lease_token===token)await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();
  const value=state(row);if(value.ready)completed.set(database,value);return value;
 }catch(e){await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();throw e;}
}
