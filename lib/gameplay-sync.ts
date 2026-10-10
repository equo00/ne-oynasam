import {contentHash} from './catalog-normalize';
import {validGameplay,gameplayKeys,preserveGameplay} from './steam-gameplay.mjs';
import {ensureGameplaySchema} from './gameplay-schema';
type Change={gameId:string;steamAppId:number;gameplay:any};
let bundled:Promise<{id:string;changes:Change[]}>|null=null;
async function bundle(){if(!bundled)bundled=(async()=>{const {default:input}=await import('../data/steam-gameplay.json');const seen=new Set();if(input.schemaVersion!==1||input.policy!=='verified-steam-store-categories')throw Error('Oynanış aktarım paketi geçersiz.');for(const c of input.changes){if(seen.has(c.gameId)||!validGameplay(c.gameplay,c.steamAppId))throw Error('Oynanış kimliği veya kaynak özelliği geçersiz.');seen.add(c.gameId);}return {id:'gameplay-'+(await contentHash(input.changes)).slice(0,24),changes:input.changes as Change[]};})();return bundled;}
const completed=new WeakMap<object,any>();
export async function ensureGameplay(database:D1Database){
 if(completed.has(database))return completed.get(database);
 await ensureGameplaySchema(database);const data=await bundle(),stamp=new Date().toISOString();
 await database.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'gameplay','0',0,?) ON CONFLICT(id) DO NOTHING").bind(data.id,stamp).run();
 const state=(r:any)=>({ready:r.stage==='done',processed:r.processed,total:data.changes.length,stage:r.stage});
 let row:any=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();if(row.stage==='done'){const s=state(row);completed.set(database,s);return s;}
 const token=crypto.randomUUID(),until=new Date(Date.now()+90000).toISOString();
 const claim:any=await database.prepare("UPDATE catalog_bootstrap SET lease_token=?,lease_until=? WHERE id=? AND stage='gameplay' AND (lease_token IS NULL OR lease_until<?) RETURNING *").bind(token,until,data.id,stamp).first();if(!claim)return state(row);
 const guard="EXISTS(SELECT 1 FROM catalog_bootstrap WHERE id=? AND stage='gameplay' AND cursor=? AND lease_token=?)",guardArgs=[data.id,claim.cursor,token];
 try{
 const offset=Number(claim.cursor),changes=data.changes.slice(offset,offset+20),ids=JSON.stringify(changes.map(c=>c.gameId));
 const saved=(await database.prepare('SELECT id,steam_app_id,status,payload,base_payload,content_hash FROM catalog_games WHERE id IN (SELECT value FROM json_each(?))').bind(ids).all<any>()).results;
 const byId=new Map(saved.map(r=>[r.id,r]));const manual=new Set((await database.prepare("SELECT game_id FROM catalog_overrides WHERE field IN ('gameplay','gameplayHistory') AND game_id IN (SELECT value FROM json_each(?))").bind(ids).all<any>()).results.map(r=>r.game_id));
 const statements:D1PreparedStatement[]=[],expected:any[]=[];
 for(const c of changes){const old=byId.get(c.gameId);if(!old||old.steam_app_id!==c.steamAppId)throw Error('Oynanış kaynağı canlı oyun kimliğiyle uyuşmuyor: '+c.gameId);
 const baseBefore=JSON.parse(old.base_payload),gameBefore=JSON.parse(old.payload),patch=manual.has(c.gameId)?{}:preserveGameplay(baseBefore,{gameplay:c.gameplay},c.steamAppId);
 const base={...baseBefore,...patch},game={...gameBefore,...patch};const hash=Object.keys(patch).length?await contentHash({base,game,status:old.status}):old.content_hash;expected.push({id:c.gameId,hash});
 if(hash!==old.content_hash){statements.push(database.prepare(`UPDATE catalog_games SET base_payload=?,payload=?,content_hash=?,revision=revision+1,updated_at=? WHERE id=? AND steam_app_id=? AND content_hash=? AND ${guard}`).bind(JSON.stringify(base),JSON.stringify(game),hash,stamp,c.gameId,c.steamAppId,old.content_hash,...guardArgs));
 statements.push(database.prepare(`UPDATE source_games SET payload=json_set(payload,'$.gameplay',json(?),'$.gameplayHistory',json(?)) WHERE id=? AND EXISTS(SELECT 1 FROM catalog_games WHERE id=? AND content_hash=?) AND ${guard}`).bind(JSON.stringify(game.gameplay),JSON.stringify(game.gameplayHistory||[]),c.gameId,c.gameId,hash,...guardArgs));}
 statements.push(database.prepare(`DELETE FROM catalog_game_features WHERE game_id=? AND EXISTS(SELECT 1 FROM catalog_games WHERE id=? AND content_hash=?) AND ${guard}`).bind(c.gameId,c.gameId,hash,...guardArgs));
 statements.push(database.prepare(`INSERT INTO catalog_game_features(game_id,feature,source,retrieved_at) SELECT ?,value,?,? FROM json_each(?) WHERE EXISTS(SELECT 1 FROM catalog_games WHERE id=? AND content_hash=?) AND ${guard}`).bind(c.gameId,game.gameplay?.sourceKind||null,game.gameplay?.retrievedAt||null,JSON.stringify(gameplayKeys(game)),c.gameId,hash,...guardArgs));
 }
 const next=offset+changes.length;
 statements.push(database.prepare(`UPDATE catalog_meta SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT),updated_at=? WHERE id='revision' AND ${guard}`).bind(stamp,...guardArgs));
 statements.push(database.prepare(`UPDATE catalog_bootstrap SET stage=?,cursor=?,processed=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND cursor=? AND lease_token=? AND NOT EXISTS(SELECT 1 FROM json_each(?) e LEFT JOIN catalog_games g ON g.id=json_extract(e.value,'$.id') WHERE g.id IS NULL OR g.content_hash IS NOT json_extract(e.value,'$.hash'))`).bind(next>=data.changes.length?'done':'gameplay',String(next),next,stamp,data.id,claim.cursor,token,JSON.stringify(expected)));
 await database.batch(statements);row=await database.prepare('SELECT * FROM catalog_bootstrap WHERE id=?').bind(data.id).first();if(row.lease_token===token)await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();const s=state(row);if(s.ready)completed.set(database,s);return s;
 }catch(e){await database.prepare('UPDATE catalog_bootstrap SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(data.id,token).run();throw e;}
}
