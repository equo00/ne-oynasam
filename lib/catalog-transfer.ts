import {adminDatabase,adminState,commitAdminGame} from './admin-catalog';
import {AdminError} from './admin-auth';
import {ensureTransferSchema} from './transfer-schema';
import {fetchSteamDelta,steamDeltaReady,type SteamCandidate} from './steam-delta';
import {steamGame} from './steam';
import {normalizeSearch,type CatalogGame} from './catalog-normalize';
const now=()=>Math.floor(Date.now()/1000),stamp=()=>new Date().toISOString();
const overlap=3600;
async function database(){const d=await adminDatabase();await ensureTransferSchema(d);return d;}
function runId(id:any){if(typeof id!=='string'||!/^[a-f\d-]{36}$/.test(id))throw new AdminError('Geçersiz aktarım kimliği.');return id;}
function appId(id:any){if(!Number.isSafeInteger(id)||id<1||id>99999999)throw new AdminError('Geçersiz Steam kimliği.');return id;}
async function run(d:D1Database,id:string){const r=await d.prepare('SELECT * FROM catalog_transfer_runs WHERE id=?').bind(runId(id)).first<any>();if(!r)throw new AdminError('Aktarım bulunamadı.',404);return r;}
function guard(d:D1Database,id:string,token:string){const key=crypto.randomUUID();return {before:[d.prepare("INSERT INTO catalog_admin_guard(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM catalog_transfer_runs WHERE id=? AND status='running' AND lease_token=? AND lease_until>?) THEN 1 ELSE 0 END)").bind(key,id,token,now())],tail:[d.prepare('DELETE FROM catalog_admin_guard WHERE id=?').bind(key)]};}
async function fenced(d:D1Database,id:string,token:string,statements:D1PreparedStatement[]){const g=guard(d,id,token);await d.batch([...g.before,...statements,...g.tail]);}
async function candidates(d:D1Database,id:string,apps:SteamCandidate[]){return Promise.all(apps.map(async a=>{const s=await d.prepare("SELECT game_id FROM catalog_source_ids WHERE source='steam' AND external_id=?").bind(String(a.appid)).first<{game_id:string}>();return d.prepare("INSERT INTO catalog_transfer_items(run_id,app_id,source_name,source_modified,lane,game_id,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(run_id,app_id) DO NOTHING").bind(id,a.appid,a.name,a.last_modified,s?'update':'add',s?.game_id||null,stamp());}));}
export async function startTransfer(body:any,actor:string){
 const mode=body.mode;if(!['trial','full','delta'].includes(mode))throw new AdminError('Aktarım biçimi geçersiz.');
 const d=await database(),s=await d.prepare("SELECT * FROM catalog_transfer_sources WHERE source='steam'").first<any>();
 let ids:number[]=[];if(mode==='trial'){if(!Array.isArray(body.appIds)||!body.appIds.length||body.appIds.length>20||new Set(body.appIds).size!==body.appIds.length)throw new AdminError('Deneme için 1–20 farklı Steam kimliği gir.');ids=body.appIds.map(appId);}else if(!steamDeltaReady())throw new AdminError('Steam Web API anahtarı tanımlı değil.',503);
 if(mode==='delta'&&!s.full_verified_at)throw new AdminError('Önce ilk Full aktarımı doğrulanmalı. Haftalık Delta kapalı.',409);
 if(mode==='full'&&s.full_verified_at)throw new AdminError('İlk Full tamamlanmış. Yeni değişiklikler için Delta kullan.',409);
 const id=crypto.randomUUID(),t=now(),since=mode==='delta'?Math.max(0,(s.last_success_at??s.full_started_at)-overlap):0;
 const statements=[d.prepare("INSERT INTO catalog_transfer_runs(id,source,mode,actor,status,window_start,window_end,scan_done,started_at,updated_at) VALUES(?,'steam',?,?,'running',?,?,?,?,?)").bind(id,mode,actor,since,t,mode==='trial'?1:0,stamp(),stamp())];
 if(mode==='delta'){
  const due=(await d.prepare("SELECT i.* FROM catalog_transfer_items i JOIN catalog_transfer_runs r ON r.id=i.run_id WHERE r.source='steam' AND r.status IN ('partial','succeeded') AND i.status IN ('pending','error') AND i.next_retry_at<=? AND i.attempts<6 ORDER BY i.next_retry_at,i.run_id,i.app_id LIMIT 20").bind(t).all<any>()).results;
  const selected=new Set<number>();for(const a of due){if(selected.has(a.app_id))continue;selected.add(a.app_id);statements.push(d.prepare("INSERT INTO catalog_transfer_items(run_id,app_id,source_name,source_modified,lane,game_id,attempts,approval,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(id,a.app_id,a.source_name,a.source_modified,a.lane,a.game_id,a.attempts,a.approval,stamp()),d.prepare("UPDATE catalog_transfer_items SET status='superseded',updated_at=? WHERE run_id=? AND app_id=? AND status IN ('pending','error')").bind(stamp(),a.run_id,a.app_id));}
 }
 if(mode==='full')statements.push(d.prepare("UPDATE catalog_transfer_sources SET full_started_at=COALESCE(full_started_at,?),updated_at=? WHERE source='steam'").bind(t,stamp()));
 if(ids.length)statements.push(...await candidates(d,id,ids.map(appid=>({appid,name:'Steam '+appid,last_modified:0}))));
 try{await d.batch(statements);}catch(e){if(e instanceof Error&&/UNIQUE constraint/.test(e.message))throw new AdminError('Başka bir aktarım açık. Önce onu tamamla veya kaldığı yerden sürdür.',409);throw e;}
 return transferStatus(id);
}
function facts(value:any):any{if(Array.isArray(value))return value.map(facts);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['retrievedAt','sourceRetrievedAt','languageSource','modeSource','yearSource','snapshotDate'].includes(k)).map(([k,v])=>[k,facts(v)]));return value;}
function merge(base:CatalogGame,patch:any){const next={...base};for(const [key,value]of Object.entries(patch)){if(['sourceRetrievedAt','languageSource','modeSource'].includes(key))continue;if(JSON.stringify(facts(base[key]))!==JSON.stringify(facts(value)))next[key]=value;}
 if(JSON.stringify(next)!==JSON.stringify(base))for(const key of ['sourceRetrievedAt','languageSource','modeSource'])next[key]=patch[key];return next;
}
function outcome(d:D1Database,id:string,a:any,status:string,error:string|null,prepared:any=null,auditId:string|null=null){return d.prepare('UPDATE catalog_transfer_items SET status=?,attempts=attempts+1,next_retry_at=?,error=?,prepared=?,audit_id=?,updated_at=? WHERE run_id=? AND app_id=?').bind(status,['error','pending'].includes(status)?now()+Math.min(7*86400,300*2**Math.min(a.attempts,10)):0,error,prepared?JSON.stringify(prepared):null,auditId,stamp(),id,a.app_id);}
async function processItem(d:D1Database,r:any,token:string,a:any){
 // Requests are reserved before network access, so interrupted attempts remain visible.
 await fenced(d,r.id,token,[d.prepare('UPDATE catalog_transfer_runs SET api_calls=api_calls+3,updated_at=? WHERE id=?').bind(stamp(),r.id)]);
 try{
  const patch=await steamGame(a.app_id),owner=await d.prepare("SELECT game_id FROM catalog_source_ids WHERE source='steam' AND external_id=?").bind(String(a.app_id)).first<{game_id:string}>();
  const id=owner?.game_id||'steam-'+a.app_id,record=await adminState(id,d);let next:any,action='transfer-update';
  if(record.row){
   if(!record.state.base||record.state.base.steamAppId!==a.app_id||normalizeSearch(record.state.base.name)!==normalizeSearch(patch.name)){await fenced(d,r.id,token,[outcome(d,r.id,a,'conflict','Kaynak kimliği/adı değişmiş; oyun ve sürüm eşleşmesini incele.',patch)]);return;}
   next={...record.state,base:merge(record.state.base,patch)};
   if(JSON.stringify(next.base)===JSON.stringify(record.state.base)){await fenced(d,r.id,token,[outcome(d,r.id,a,'skipped',null)]);return;}
  }else{
   const approval=a.approval?JSON.parse(a.approval):null;
   if(!approval||!patch.coverUrl||!patch.genres.length||!patch.steamTags?.tags?.length||!patch.gameplay){await fenced(d,r.id,token,[outcome(d,r.id,a,'pending',approval?'Kapak, tür, etiket veya oynanış doğrulanamadı.':'Yeni oyun: özgün Türkçe açıklama ve yayın onayı bekleniyor.',patch)]);return;}
   const base={...patch,id,platforms:['PC'],desc:approval.desc,long:approval.long,catalogAddedAt:stamp()} as CatalogGame;
   next={base,overrides:[{field:'desc',value:JSON.stringify(approval.desc)},{field:'long',value:JSON.stringify(approval.long)}],reviews:[]};action='transfer-add';
  }
  const g=guard(d,r.id,token);await commitAdminGame(id,record.etag,next,r.actor,action,'Steam kaynak kimliğiyle küçük aktarım parçası işlendi.',d,{before:g.before,tail:auditId=>[outcome(d,r.id,a,record.row?'updated':'added',null,null,auditId),d.prepare('UPDATE catalog_transfer_items SET game_id=? WHERE run_id=? AND app_id=?').bind(id,r.id,a.app_id),...g.tail]});
 }catch(e){
  const conflict=e instanceof AdminError&&e.status===409,pending=e instanceof Error&&e.message==='Yayımlanmış PC oyunu değil.';
  await fenced(d,r.id,token,[outcome(d,r.id,a,conflict?'conflict':pending?'pending':'error',conflict?'Kayıt başka bir işlemde değişti; inceleme gerekli.':pending?'Yayımlanmış PC oyunu doğrulanamadı; aday korunuyor.':'Kaynak doğrulanamadı. Mevcut oyun verileri korundu.')]);
 }
}
export async function stepTransfer(id:string){
 const d=await database(),r=await run(d,id);if(r.status!=='running')return transferStatus(id);
 const token=crypto.randomUUID(),leased=await d.prepare("UPDATE catalog_transfer_runs SET lease_token=?,lease_until=?,error=NULL WHERE id=? AND status='running' AND lease_until<=?").bind(token,now()+120,id,now()).run();
 if(!leased.meta.changes)throw new AdminError('Aktarımın bir parçası hâlen çalışıyor. Biraz sonra yeniden dene.',409);
 try{
  let items=(await d.prepare("SELECT * FROM catalog_transfer_items WHERE run_id=? AND status='queued' ORDER BY lane DESC,app_id LIMIT 2").bind(id).all<any>()).results;
  if(!items.length&&!r.scan_done){
   await fenced(d,id,token,[d.prepare('UPDATE catalog_transfer_runs SET api_calls=api_calls+1 WHERE id=?').bind(id)]);
   const page=await fetchSteamDelta(r.window_start,r.cursor);
   // Save the complete page AND its cursor atomically. Never skip late/unreleased IDs.
   await fenced(d,id,token,[...await candidates(d,id,page.apps),d.prepare('UPDATE catalog_transfer_runs SET cursor=?,scan_done=?,updated_at=? WHERE id=?').bind(page.cursor,page.hasMore?0:1,stamp(),id)]);
   items=(await d.prepare("SELECT * FROM catalog_transfer_items WHERE run_id=? AND status='queued' ORDER BY lane DESC,app_id LIMIT 2").bind(id).all<any>()).results;
  }
  for(const a of items)await processItem(d,r,token,a);
  const state=await run(d,id),queued=await d.prepare("SELECT 1 AS found FROM catalog_transfer_items WHERE run_id=? AND status='queued' LIMIT 1").bind(id).first();
  if(state.scan_done&&!queued){
   const deferred=await d.prepare("SELECT 1 AS found FROM catalog_transfer_items WHERE run_id=? AND status IN ('pending','error','conflict') LIMIT 1").bind(id).first();
   const statements=[d.prepare('UPDATE catalog_transfer_runs SET status=?,finished_at=?,updated_at=? WHERE id=?').bind(deferred?'partial':'succeeded',stamp(),stamp(),id)];
   // Full baseline is set only by a separate verified completion, from its START time.
   if(r.mode==='delta')statements.push(d.prepare("UPDATE catalog_transfer_sources SET last_success_at=MAX(COALESCE(last_success_at,0),?),updated_at=? WHERE source='steam'").bind(r.window_end,stamp()));
   await fenced(d,id,token,statements);
  }
 }catch(e){if(e instanceof Error&&/CHECK constraint failed/.test(e.message))throw new AdminError('Aktarım durduruldu veya kilit süresi doldu. Parça yeniden denenebilir.',409);await d.prepare('UPDATE catalog_transfer_runs SET error=? WHERE id=? AND lease_token=?').bind(e instanceof AdminError?e.message:'Aktarım parçası tamamlanamadı; devam noktası korundu.',id,token).run();throw e;}
 finally{await d.prepare('UPDATE catalog_transfer_runs SET lease_token=NULL,lease_until=0 WHERE id=? AND lease_token=?').bind(id,token).run();}
 return transferStatus(id);
}
export async function controlTransfer(body:any){
 const d=await database(),r=await run(d,body.id);if(body.command==='pause'){await d.prepare("UPDATE catalog_transfer_runs SET status='paused',lease_token=NULL,lease_until=0,updated_at=? WHERE id=? AND status='running'").bind(stamp(),r.id).run();}
 else if(body.command==='resume'||body.command==='retry'){
  if(r.lease_until>now())throw new AdminError('Çalışan parçanın bitmesini bekle.',409);
  if(body.command==='resume'&&r.status!=='paused')throw new AdminError('Bu aktarım duraklatılmış değil.',409);
  if(body.command==='retry'&&!['partial','succeeded'].includes(r.status))throw new AdminError('Önce mevcut aktarımı tamamla.',409);
  const sql=[d.prepare("UPDATE catalog_transfer_runs SET status='running',finished_at=NULL,updated_at=? WHERE id=?").bind(stamp(),r.id)];
  if(body.command==='retry')sql.push(d.prepare("UPDATE catalog_transfer_items SET status='queued' WHERE run_id=? AND status IN ('error','pending') AND next_retry_at<=? AND attempts<6").bind(r.id,now()));
  try{await d.batch(sql);}catch{throw new AdminError('Başka bir aktarım açık. Önce onu tamamla.',409);}
 }else throw new AdminError('Aktarım komutu geçersiz.');return transferStatus(r.id);
}
export async function approveTransfer(body:any){
 const d=await database(),r=await run(d,body.id),a=await d.prepare('SELECT * FROM catalog_transfer_items WHERE run_id=? AND app_id=?').bind(r.id,appId(body.appId)).first<any>();
 if(!a||a.status!=='pending'||a.lane!=='add'||!a.prepared||r.lease_until>now())throw new AdminError('Yayına hazırlanmış yeni aday bulunamadı veya parça hâlen çalışıyor.',409);
 if(typeof body.desc!=='string'||body.desc.trim().length<30||body.desc.length>1200||typeof body.long!=='string'||body.long.trim().length<60||body.long.length>6000)throw new AdminError('Özgün Türkçe kısa ve ayrıntılı açıklamayı doldur.');
 const approval=JSON.stringify({desc:body.desc.trim(),long:body.long.trim()}),g=crypto.randomUUID();
 try{await d.batch([d.prepare("INSERT INTO catalog_admin_guard(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM catalog_transfer_items WHERE run_id=? AND app_id=? AND status='pending' AND updated_at=?) AND EXISTS(SELECT 1 FROM catalog_transfer_runs WHERE id=? AND lease_until<=?) THEN 1 ELSE 0 END)").bind(g,r.id,a.app_id,body.expected,r.id,now()),d.prepare("UPDATE catalog_transfer_runs SET status='running',finished_at=NULL WHERE id=?").bind(r.id),d.prepare("UPDATE catalog_transfer_items SET approval=?,status='queued',next_retry_at=0,updated_at=? WHERE run_id=? AND app_id=?").bind(approval,stamp(),r.id,a.app_id),d.prepare('DELETE FROM catalog_admin_guard WHERE id=?').bind(g)]);}catch{throw new AdminError('Aday değişti veya başka bir aktarım açık. Yeniden yükle.',409);}
 return transferStatus(r.id);
}
export async function verifyFull(body:any){
 const d=await database(),r=await run(d,body.id);if(r.mode!=='full'||!['succeeded','partial'].includes(r.status)||!r.scan_done)throw new AdminError('İlk Full aktarımı hatasız tamamlanıp içerik kontrolü geçmeden doğrulanamaz.',409);
 if(await d.prepare("SELECT 1 AS found FROM catalog_transfer_items WHERE run_id=? AND status IN ('queued','error','conflict') LIMIT 1").bind(r.id).first())throw new AdminError('Full aktarımında çözülmemiş hata veya kimlik çakışması var.',409);
 if(!await d.prepare("SELECT 1 AS found FROM catalog_transfer_items WHERE run_id=? AND status IN ('added','updated','skipped') LIMIT 1").bind(r.id).first())throw new AdminError('Full aktarımında doğrulanmış oyun kaydı yok.',409);
 if(body.verified!==true)throw new AdminError('İlk Full için veri kalitesi ve performans kontrolleri doğrulanmalı.');
 await d.prepare("UPDATE catalog_transfer_sources SET full_verified_at=?,last_success_at=COALESCE(last_success_at,full_started_at),updated_at=? WHERE source='steam' AND full_started_at IS NOT NULL").bind(now(),stamp()).run();return transferStatus(r.id);
}
export async function transferStatus(id?:string,cursor=0){
 if(!Number.isSafeInteger(cursor)||cursor<0)throw new AdminError('Aday sayfalaması geçersiz.');const d=await database(),source=await d.prepare("SELECT * FROM catalog_transfer_sources WHERE source='steam'").first<any>();
 const runs=id?[await run(d,id)]:(await d.prepare('SELECT * FROM catalog_transfer_runs ORDER BY started_at DESC,id DESC LIMIT 10').all<any>()).results;
 const selected=runs[0];const items=selected?(await d.prepare('SELECT app_id,source_name,lane,status,attempts,next_retry_at,game_id,error,prepared,approval,updated_at FROM catalog_transfer_items WHERE run_id=? AND app_id>? ORDER BY app_id LIMIT 21').bind(selected.id,cursor).all<any>()).results:[];
 const results=selected?(await d.prepare('SELECT status,COUNT(*) AS count FROM catalog_transfer_items WHERE run_id=? GROUP BY status').bind(selected.id).all<any>()).results:[];
 return {source:{...source,apiKeyReady:steamDeltaReady(),weekly_enabled:false},runs:runs.map(({lease_token,...r})=>({...r,durationSeconds:Math.max(0,Math.floor((Date.parse(r.finished_at||stamp())-Date.parse(r.started_at))/1000))})),items:items.slice(0,20).map(a=>({...a,prepared:a.prepared?JSON.parse(a.prepared):null,approval:a.approval?JSON.parse(a.approval):null})),nextCursor:items.length>20?items[19].app_id:null,results};
}
