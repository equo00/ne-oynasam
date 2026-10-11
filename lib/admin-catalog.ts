import {prepareSourceGame} from './catalog';
import {catalogDatabase,invalidateCatalogMetadata} from './catalog-repository';
import {ingestGames} from './catalog-ingest';
import {normalizeSearch,type CatalogGame} from './catalog-normalize';
import {AdminError} from './admin-auth';
import {ensureAdminSchema} from './admin-schema';
import {steamGame} from './steam';
import {steamAsset,type MediaItem} from './media';
import {validId} from './security';
export const adminFields=['desc','long','genres','steamTags','coverUrl','coverFallbackUrl','media','catalogStatus'];
type Override={field:string;value:string};
type Snapshot={base:CatalogGame|null;overrides:Override[];reviews:any[]};
type RecordState={row:any;state:Snapshot;etag:string};
export async function adminDatabase(){const d=await catalogDatabase();await ensureAdminSchema(d);return d;}
export async function adminState(id:string,database?:D1Database):Promise<RecordState>{
 if(!validId(id))throw new AdminError('Geçersiz oyun kimliği.');const d=database||await adminDatabase();
 const row=await d.prepare('SELECT g.*,COALESCE(a.revision,0) AS admin_revision FROM catalog_games g LEFT JOIN catalog_admin_versions a ON a.game_id=g.id WHERE g.id=?').bind(id).first<any>();
 const overrides=await d.prepare('SELECT field,value FROM catalog_overrides WHERE game_id=? ORDER BY field').bind(id).all<Override>();
 const reviews=await d.prepare('SELECT source,verdict,note,updated_by,updated_at FROM catalog_admin_reviews WHERE game_id=? ORDER BY source').bind(id).all<any>();
 return {row,state:{base:row?JSON.parse(row.base_payload):null,overrides:overrides.results,reviews:reviews.results},etag:row?row.content_hash+'.'+row.admin_revision:'new'};
}
export function adminReason(value:unknown){if(typeof value!=='string'||value.trim().length<3||value.length>1000)throw new AdminError('Değişiklik gerekçesi 3–1000 karakter olmalı.');return value.trim();}
function checkedAsset(value:unknown,appid:number,kind:'image'|'video',thumbnail=false,known=new Set<string>()){
 const src=steamAsset(value);if(!src||src.length>2048)throw new AdminError('Görsel/video için geçerli bir Steam CDN HTTPS bağlantısı gir.');
 const u=new URL(src),p=u.pathname;
 if(!thumbnail&&!known.has(src)&&!(kind==='image'?new RegExp('/(?:steam/apps|apps)/'+appid+'/').test(p):p.startsWith('/store_trailers/'+appid+'/')))throw new AdminError('Medya bağlantısındaki oyun kimliği eşleşmiyor.');
 if(!thumbnail&&!known.has(src)&&!(kind==='image'?/\.(png|jpe?g|webp|avif)$/i:/\.(mp4|webm|m3u8)$/i).test(p))throw new AdminError('Medya dosya biçimi desteklenmiyor.');
 return src;
}
export function validateAdminMedia(value:any,appid:number,known=new Set<string>()):MediaItem[]{
 if(!Array.isArray(value)||value.length>30)throw new AdminError('Galeride en fazla 30 medya olabilir.');
 const ids=new Set<string>();return value.map(m=>{
  if(!m||!validId(m.id)||ids.has(m.id)||!['image','video'].includes(m.kind)||typeof m.name!=='string'||m.name.trim().length<1||m.name.length>200)throw new AdminError('Galeri kaydı veya kimliği geçersiz.');ids.add(m.id);
  const src=checkedAsset(m.src,appid,m.kind,false,known),format=m.kind==='image'?'image':new URL(src).pathname.endsWith('.m3u8')?'hls':new URL(src).pathname.endsWith('.webm')?'webm':'mp4';
  const thumbnail=m.kind==='image'?checkedAsset(m.thumbnail||src,appid,'image'):checkedAsset(m.thumbnail,appid,'image',true);
  return {id:m.id,kind:m.kind,name:m.name.trim(),src,thumbnail,format,...(m.kind==='video'?{poster:thumbnail}:{}),...(m.fallbackSrc?{fallbackSrc:checkedAsset(m.fallbackSrc,appid,'video',false,known)}: {})} as MediaItem;
 });
}
async function validatedPatch(patch:any,record:RecordState,d:D1Database){
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length>adminFields.length||Object.keys(patch).some(k=>!adminFields.includes(k)))throw new AdminError('Kimlik ve puan alanları bu formdan değiştirilemez.');
 const values:Record<string,any>={},base=record.state.base!;
 for(const [field,value]of Object.entries(patch)){
  if(field==='desc'||field==='long'){if(typeof value!=='string'||!value.trim()||value.length>(field==='desc'?1200:6000))throw new AdminError('Açıklama uzunluğu geçersiz.');values[field]=value.trim();}
  else if(field==='genres'){if(!Array.isArray(value)||!value.length||value.length>12||value.some(v=>typeof v!=='string'||!v.trim()||v.length>80))throw new AdminError('En fazla 12 geçerli tür gir.');values[field]=[...new Set(value.map(v=>v.trim()))];}
  else if(field==='catalogStatus'){if(!['published','archived'].includes(String(value)))throw new AdminError('Görünürlük geçersiz.');values[field]=value;}
  else if(field==='coverUrl'||field==='coverFallbackUrl'){values[field]=value===''?'':checkedAsset(value,Number(base.steamAppId),'image');}
  else if(field==='media'){const rows=(await d.prepare("SELECT url,payload FROM catalog_media WHERE game_id=? AND kind IN ('image','video')").bind(base.id).all<any>()).results;const known=new Set<string>(rows.flatMap(m=>{const p=JSON.parse(m.payload);return [m.url,p.src,p.fallbackSrc].filter(v=>typeof v==='string'&&steamAsset(v)).map(steamAsset);}));values.media={items:validateAdminMedia(value,Number(base.steamAppId),known)};}
  else if(field==='steamTags'){
   if(!Array.isArray(value)||value.length>20||value.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(value).size!==value.length)throw new AdminError('En fazla 20 farklı, kayıtlı etiket seç.');
   const found=(await d.prepare('SELECT id,name FROM catalog_tags WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(value)).all<{id:number;name:string}>()).results;
   if(found.length!==value.length||!base.steamAppId)throw new AdminError('Etiket kimlikleri kaynak kaydıyla eşleşmedi.');
   const current=JSON.parse(record.row.payload).steamTags?.tags||[];
   values.steamTags={steamAppId:base.steamAppId,identityTitle:base.name,tags:value.map(id=>({...found.find(t=>t.id===id),count:current.find((t:any)=>t.id===id)?.count??null})),complete:false,sourceKind:'manual-admin',retrievedAt:new Date().toISOString()};
  }
 }
 return values;
}
/** The optimistic guard, manual/source snapshot, all projections and audit commit together. */
export async function commitAdminGame(id:string,expected:string,next:Snapshot,actor:string,action:string,reason:string,database?:D1Database){
 const d=database||await adminDatabase(),current=await adminState(id,d);if(current.etag!==expected)throw new AdminError('Kayıt değişti. Güncel kaydı yükleyip yeniden dene.',409);
 if(!next.base||next.base.id!==id||current.state.base&&(next.base.steamAppId!==current.state.base.steamAppId||next.base.qid!==current.state.base.qid))throw new AdminError('Kalıcı oyun/kaynak kimliği değiştirilemez.');
 const stamp=new Date().toISOString(),token=crypto.randomUUID(),auditId=crypto.randomUUID(),revision=Number(current.row?.admin_revision||0)+1;
 const before=[d.prepare('INSERT INTO catalog_admin_guard(id,valid) VALUES(?,CASE WHEN '+(current.row?'EXISTS(SELECT 1 FROM catalog_games g LEFT JOIN catalog_admin_versions a ON a.game_id=g.id WHERE g.id=? AND g.content_hash=? AND COALESCE(a.revision,0)=?)':'NOT EXISTS(SELECT 1 FROM catalog_games WHERE id=?)')+' THEN 1 ELSE 0 END)').bind(token,...(current.row?[id,current.row.content_hash,current.row.admin_revision]:[id])),
  d.prepare('DELETE FROM catalog_overrides WHERE game_id=?').bind(id),
  d.prepare("INSERT INTO catalog_overrides(game_id,field,value,updated_at,updated_by) SELECT ?,json_extract(value,'$.field'),json_extract(value,'$.value'),?,? FROM json_each(?)").bind(id,stamp,actor,JSON.stringify(next.overrides)),
  d.prepare('DELETE FROM catalog_admin_reviews WHERE game_id=?').bind(id),
  d.prepare("INSERT INTO catalog_admin_reviews(game_id,source,verdict,note,updated_by,updated_at) SELECT ?,json_extract(value,'$.source'),json_extract(value,'$.verdict'),json_extract(value,'$.note'),json_extract(value,'$.updated_by'),json_extract(value,'$.updated_at') FROM json_each(?)").bind(id,JSON.stringify(next.reviews)),
  d.prepare('INSERT INTO catalog_admin_versions(game_id,revision) VALUES(?,?) ON CONFLICT(game_id) DO UPDATE SET revision=excluded.revision').bind(id,revision),
  d.prepare('INSERT INTO catalog_admin_audit(id,game_id,actor,action,reason,before_state,after_state,after_revision,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(auditId,id,actor,action,reason,JSON.stringify(current.state),JSON.stringify(next),revision,stamp)];
 const tail=[d.prepare("UPDATE catalog_admin_audit SET after_hash=(SELECT content_hash FROM catalog_games WHERE id=?),after_state=json_set(after_state,'$.base',json((SELECT base_payload FROM catalog_games WHERE id=?))) WHERE id=?").bind(id,id,auditId),d.prepare('DELETE FROM catalog_admin_guard WHERE id=?').bind(token)];
 const last=current.row?null:await d.prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM catalog_games').first<{next:number}>();
 try{await ingestGames(d,[next.base],{priority:current.row?.source_priority??30,sortOrder:last?.next||0,manualOverrides:next.overrides.map(o=>({...o,game_id:id})),before,tail,writeLegacy:true,replaceBase:action==='rollback'});}catch(e){if(e instanceof Error&&/CHECK constraint failed/.test(e.message))throw new AdminError('Kayıt başka bir işlemde değişti. Yeniden yükle.',409);throw e;}
 invalidateCatalogMetadata();return {id,etag:(await adminState(id,d)).etag,auditId};
}
export async function editAdminGame(body:any,actor:string){
 const d=await adminDatabase(),record=await adminState(body.gameId,d);if(!record.row)throw new AdminError('Oyun bulunamadı.',404);
 const reason=adminReason(body.reason),patch=await validatedPatch(body.patch||{},record,d),clear=body.clear||[];
 if(!Array.isArray(clear)||clear.length>adminFields.length||clear.some((k:any)=>!adminFields.includes(k))||clear.some((k:any)=>Object.hasOwn(patch,k)))throw new AdminError('Kaynağa döndürülecek alanlar geçersiz.');
 if(!Object.keys(patch).length&&!clear.length)throw new AdminError('Kaydedilecek değişiklik yok.');
 const overrides=record.state.overrides.filter(o=>!clear.includes(o.field)&&!Object.hasOwn(patch,o.field));for(const [field,value]of Object.entries(patch))overrides.push({field,value:JSON.stringify(value)});
 return commitAdminGame(body.gameId,body.expected,{...record.state,overrides},actor,'edit',reason,d);
}
export async function reviewAdminGame(body:any,actor:string){
 const d=await adminDatabase(),record=await adminState(body.gameId,d);if(!record.row)throw new AdminError('Oyun bulunamadı.',404);
 if(!['steam','metacritic'].includes(body.source)||!['pending','verified','conflict'].includes(body.verdict))throw new AdminError('İnceleme kararı geçersiz.');
 const note=adminReason(body.note),review={source:body.source,verdict:body.verdict,note,updated_by:actor,updated_at:new Date().toISOString()};
 return commitAdminGame(body.gameId,body.expected,{...record.state,reviews:[...record.state.reviews.filter(r=>r.source!==body.source),review]},actor,'review',note,d);
}
export async function rollbackAdminGame(body:any,actor:string){
 const d=await adminDatabase(),record=await adminState(body.gameId,d);
 const audit=typeof body.auditId==='string'?await d.prepare('SELECT * FROM catalog_admin_audit WHERE id=? AND game_id=?').bind(body.auditId,body.gameId).first<any>():null;
 if(!audit||!record.row)throw new AdminError('Değişiklik bulunamadı.',404);
 if(record.etag!==audit.after_hash+'.'+audit.after_revision)throw new AdminError('Daha yeni bir düzenleme veya kaynak güncellemesi var. Önce onu incele.',409);
 const previous=JSON.parse(audit.before_state) as Snapshot;
 const next=previous.base?previous:{...record.state,overrides:[...record.state.overrides.filter(o=>o.field!=='catalogStatus'),{field:'catalogStatus',value:'"archived"'}]};
 return commitAdminGame(body.gameId,body.expected,next,actor,'rollback',adminReason(body.reason),d);
}
export async function getAdminGame(id:string){
 const d=await adminDatabase(),record=await adminState(id,d);if(!record.row)throw new AdminError('Oyun bulunamadı.',404);
 const [sources,editions,scores,media,history]=await Promise.all([
  d.prepare('SELECT * FROM catalog_source_ids WHERE game_id=? ORDER BY source LIMIT 50').bind(id).all<any>(),
  d.prepare('SELECT * FROM catalog_editions WHERE game_id=? LIMIT 20').bind(id).all<any>(),
  d.prepare('SELECT * FROM catalog_scores WHERE game_id=? ORDER BY retrieved_at DESC LIMIT 50').bind(id).all<any>(),
  d.prepare("SELECT * FROM catalog_media WHERE game_id=? AND kind IN ('image','video') ORDER BY position LIMIT 60").bind(id).all<any>(),
  d.prepare('SELECT id,actor,action,reason,after_hash,after_revision,created_at FROM catalog_admin_audit WHERE game_id=? ORDER BY created_at DESC,id DESC LIMIT 20').bind(id).all<any>()]);
 return {game:JSON.parse(record.row.payload),base:record.state.base,status:record.row.status,etag:record.etag,overrides:Object.fromEntries(record.state.overrides.map(o=>[o.field,JSON.parse(o.value)])),reviews:record.state.reviews,sources:sources.results,editions:editions.results,scores:scores.results.map(s=>({...s,payload:JSON.parse(s.payload)})),media:media.results.map(m=>({...m,payload:JSON.parse(m.payload)})),history:history.results.map(a=>({...a,canRollback:record.etag===a.after_hash+'.'+a.after_revision}))};
}
export async function listAdminGames(params:URLSearchParams){
 const d=await adminDatabase(),q=params.get('q')?.trim()||'',status=params.get('status')||'',cursor=Number(params.get('cursor')||0);if(q.length>160||!['','published','archived'].includes(status)||!Number.isSafeInteger(cursor)||cursor<0||cursor>10000)throw new AdminError('Arama veya sayfalama geçersiz.');
 const where=[],args:any[]=[];if(status){where.push('status=?');args.push(status);}if(q){const token=normalizeSearch(q);where.push('(id=? OR name_search>=? AND name_search<?)');args.push(q,token,token+'\uffff');}
 const rows=(await d.prepare('SELECT id,name,status,steam_app_id,score_value,updated_at FROM catalog_games'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY name_search,id LIMIT 26 OFFSET ?').bind(...args,cursor).all<any>()).results;
 return {games:rows.slice(0,25),nextCursor:rows.length>25?cursor+25:null};
}
export async function listAdminTags(q:string){if(q.length>80)throw new AdminError('Etiket araması çok uzun.');const d=await adminDatabase();return {tags:(await d.prepare("SELECT id,name,label FROM catalog_tags WHERE name LIKE ? OR label LIKE ? ORDER BY game_count DESC,id LIMIT 25").bind('%'+q.replace(/[%_]/g,'')+'%','%'+q.replace(/[%_]/g,'')+'%').all<any>()).results};}
export async function listAdminJobs(){const d=await adminDatabase();const [jobs,bootstrap]=await Promise.all([d.prepare('SELECT * FROM catalog_admin_jobs ORDER BY started_at DESC,id DESC LIMIT 25').all<any>(),d.prepare('SELECT id,stage,cursor,processed,lease_until,updated_at FROM catalog_bootstrap ORDER BY updated_at DESC LIMIT 20').all<any>()]);return {jobs:jobs.results.map(j=>({...j,requested:JSON.parse(j.requested),result:j.result?JSON.parse(j.result):null})),bootstrap:bootstrap.results};}
export async function adminJob(kind:string,actor:string,requested:any,work:(jobId:string,d:D1Database)=>Promise<any>){
 const d=await adminDatabase(),id=crypto.randomUUID();await d.prepare('INSERT INTO catalog_admin_jobs(id,kind,actor,status,requested,started_at) VALUES(?,?,?,\'running\',?,?)').bind(id,kind,actor,JSON.stringify(requested),new Date().toISOString()).run();
 try{const result=await work(id,d);await d.prepare('UPDATE catalog_admin_jobs SET status=?,result=?,error=?,finished_at=? WHERE id=?').bind(result.failed?.length?'partial':'succeeded',JSON.stringify(result),result.failed?.length?'Bazı kaynak kayıtları yenilenemedi; mevcut verileri korundu.':null,new Date().toISOString(),id).run();return {...result,jobId:id};}
 catch(e){await d.prepare("UPDATE catalog_admin_jobs SET status='failed',error=?,finished_at=? WHERE id=?").bind(e instanceof AdminError?e.message:'Kaynağa erişilemedi veya işlem tamamlanamadı. Mevcut kayıtları ve değişiklik geçmişini incele.',new Date().toISOString(),id).run();throw e;}
}
export async function refreshAdminGames(ids:any,actor:string){
 if(!Array.isArray(ids)||ids.length<1||ids.length>4||!ids.every(validId)||new Set(ids).size!==ids.length)throw new AdminError('Bir istekte en fazla 4 farklı oyun yenilenebilir.');
 return adminJob('refresh',actor,{ids},async(jobId,d)=>{
  const updated:string[]=[],failed:string[]=[],failedDetails:{id:string;error:string}[]=[];
  for(const id of ids){try{const record=await adminState(id,d),g=record.state.base;if(!g?.steamAppId||record.row.status!=='published')throw new AdminError('Yenilenebilir PC kaydı bulunamadı.');const patch=await steamGame(g.steamAppId);if(patch.steamAppId!==g.steamAppId||normalizeSearch(patch.name)!==normalizeSearch(g.name))throw new AdminError('Kaynak oyun adı veya sürüm kimliği değişti; inceleme gerekli.');await commitAdminGame(id,record.etag,{...record.state,base:{...g,...patch,platforms:g.platforms} as CatalogGame},actor,'refresh','Resmî Steam kaynak bilgisi yenilendi.',d);updated.push(id);}catch(e){if(e instanceof AdminError&&e.status===409)throw e;failed.push(id);failedDetails.push({id,error:e instanceof AdminError?e.message:'Kaynak yanıt vermedi veya kimlik doğrulanamadı.'});}await d.prepare('UPDATE catalog_admin_jobs SET processed=processed+1 WHERE id=?').bind(jobId).run();}
  await d.prepare('UPDATE catalog_admin_jobs SET result=? WHERE id=?').bind(JSON.stringify({updated:updated.length,failed,failedDetails}),jobId).run();
  if(!updated.length)throw new AdminError('Kaynak bilgileri yenilenemedi. Mevcut kayıtlar korundu.',503);
  return {updated:updated.length,failed,failedDetails,games:await Promise.all(updated.map(async id=>(await getAdminGame(id)).game)),fetchedAt:new Date().toISOString()};
 });
}

export async function addAdminSourceGame(qid:any,actor:string){
 if(typeof qid!=='string'||!/^Q\d{1,12}$/.test(qid))throw new AdminError('Geçersiz kaynak kaydı.');
 return adminJob('add',actor,{qid},async(jobId,d)=>{
  const prepared=await prepareSourceGame(qid);if(!prepared.existing)await commitAdminGame(prepared.game.id,'new',{base:prepared.game,overrides:[],reviews:[]},actor,'add','PC kaynak kimliği doğrulanarak oyun eklendi.',d);
  await d.prepare('UPDATE catalog_admin_jobs SET processed=1 WHERE id=?').bind(jobId).run();
  return {game:(await getAdminGame(prepared.game.id)).game,updated:prepared.existing?0:1};
 });
}
