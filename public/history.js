'use strict';
const visitHistoryKey='neoynasam-visit-history-v1',visitHistoryLimit=200,visitHistoryDays=90;
const visitKinds=['seen','preview','detail'];
let visitRows=[],visitSaveTimer=null,visitDirty=false,visitStorageAvailable=true,visitFilter='detail',visitShown=20;
let visitObserver=null,visitObserved=new Set(),visitIntersecting=new Set(),visitSeenSession=new Set(),visitDwell=new Map(),visitFrame=false;
function cleanVisitRows(input,now=Date.now()){
 if(!input||input.version!==1||!Array.isArray(input.games))return [];
 const rows=new Map(),cutoff=now-visitHistoryDays*86400000;
 for(const raw of input.games.slice(0,400)){
  if(!raw||typeof raw.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(raw.id)||typeof raw.name!=='string'||!raw.name.trim())continue;
  const row=rows.get(raw.id)||{id:raw.id,name:raw.name.trim().slice(0,180)};
  for(const kind of visitKinds){const event=raw[kind];if(!event||!Number.isSafeInteger(event.at)||event.at<cutoff||event.at>now+60000||!Number.isSafeInteger(event.count)||event.count<1)continue;
   const count=Math.min(99999,event.count);if(!row[kind]||row[kind].at<event.at)row[kind]={at:event.at,count};
  }
  if(visitKinds.some(k=>row[k]))rows.set(row.id,row);
 }
 return [...rows.values()].sort((a,b)=>visitLastAt(b)-visitLastAt(a)).slice(0,visitHistoryLimit);
}
function visitLastAt(row){return Math.max(...visitKinds.map(k=>row[k]?.at||0));}
function parseVisitHistory(raw){try{return raw&&raw.length<=250000?cleanVisitRows(JSON.parse(raw)):[];}catch{return [];}}
try{visitRows=parseVisitHistory(localStorage.getItem(visitHistoryKey));}catch{visitStorageAvailable=false;}
function flushVisitHistory(){
 clearTimeout(visitSaveTimer);visitSaveTimer=null;
 if(!visitDirty)return;
 visitRows=cleanVisitRows({version:1,games:visitRows});
 try{localStorage.setItem(visitHistoryKey,JSON.stringify({version:1,games:visitRows}));visitStorageAvailable=true;visitDirty=false;}catch{visitStorageAvailable=false;}
}
function recordVisitEvent(game,kind){
 if(!game||!validGameId(game.id)||typeof game.name!=='string'||!visitKinds.includes(kind))return;
 visitRows=cleanVisitRows({version:1,games:visitRows});
 const row=visitRows.find(x=>x.id===game.id)||{id:game.id,name:game.name.slice(0,180)};
 row.name=game.name.slice(0,180);row[kind]={at:Date.now(),count:Math.min(99999,(row[kind]?.count||0)+1)};
 visitRows=[row,...visitRows.filter(x=>x.id!==row.id)].slice(0,visitHistoryLimit);
 visitDirty=true;
 if(kind==='detail')flushVisitHistory();else{clearTimeout(visitSaveTimer);visitSaveTimer=setTimeout(flushVisitHistory,750);}
 if($('historyDialog')?.open)renderVisitHistory();
}
function visitCardVisible(node){
 if(document.hidden||node.isConnected===false)return false;
 const dialogs=[...document.querySelectorAll('dialog')].filter(x=>x.open);
 if(dialogs.some(x=>!x.contains(node)))return false;
 const r=node.getBoundingClientRect(),height=globalThis.innerHeight,width=globalThis.innerWidth;
 if(!Number.isFinite(height)||!Number.isFinite(width))return false;
 const area=Math.max(0,r.right-r.left)*Math.max(0,r.bottom-r.top);
 const visible=Math.max(0,Math.min(r.right,width)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,height)-Math.max(r.top,0));
 return area>0&&visible/area>=0.5;
}
function cancelVisitDwell(){for(const timer of visitDwell.values())clearTimeout(timer);visitDwell.clear();}
function considerVisitCard(node,intersecting=true){
 const id=node.dataset.historyGame;
 if(!intersecting||!visitCardVisible(node)){clearTimeout(visitDwell.get(node));visitDwell.delete(node);return;}
 if(visitSeenSession.has(id)||visitDwell.has(node))return;
 visitDwell.set(node,setTimeout(()=>{
  visitDwell.delete(node);if(!visitObserved.has(node)||!visitCardVisible(node)||visitSeenSession.has(id)||node.dataset.historyGame!==id)return;
  const game=nameGame(id);if(!game)return;
  visitSeenSession.add(id);while(visitSeenSession.size>visitHistoryLimit)visitSeenSession.delete(visitSeenSession.values().next().value);
  recordVisitEvent(game,'seen');
 },1000));
}
function refreshVisitCards(){
 cancelVisitDwell();visitObserver?.disconnect();visitIntersecting.clear();
 visitObserved=new Set([...document.querySelectorAll('[data-history-game]')].slice(0,80));
 if(globalThis.IntersectionObserver){
  visitObserver??=new IntersectionObserver(entries=>{for(const e of entries)if(visitObserved.has(e.target)){if(e.isIntersecting&&e.intersectionRatio>=0.5)visitIntersecting.add(e.target);else visitIntersecting.delete(e.target);considerVisitCard(e.target,visitIntersecting.has(e.target));}},{threshold:[0,0.5]});
  for(const node of visitObserved)visitObserver.observe(node);
 }else for(const node of visitObserved)considerVisitCard(node);
}
function checkVisitVisibility(){
 if(visitFrame)return;visitFrame=true;requestAnimationFrame(()=>{visitFrame=false;for(const node of visitObserved)considerVisitCard(node,!globalThis.IntersectionObserver||visitIntersecting.has(node));});
}
function renderVisitHistory(){
 visitRows=cleanVisitRows({version:1,games:visitRows});
 const labels={detail:'Açtıkların',preview:'Önizlediklerin',seen:'Gördüklerin'};
 for(const kind of visitKinds){const button=$('history'+kind);button.setAttribute('aria-pressed',String(kind===visitFilter));button.textContent=labels[kind]+' ('+visitRows.filter(x=>x[kind]).length+')';}
 const rows=visitRows.filter(x=>x[visitFilter]).sort((a,b)=>b[visitFilter].at-a[visitFilter].at);
 $('historyItems').innerHTML=rows.length?rows.slice(0,visitShown).map(row=>`<li><button type="button" data-history-open="${esc(row.id)}"><strong>${esc(row.name)}</strong><span><time datetime="${new Date(row[visitFilter].at).toISOString()}">${esc(new Date(row[visitFilter].at).toLocaleString('tr',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</time><span>${row[visitFilter].count.toLocaleString('tr')} ${visitFilter==='detail'?'açılış':visitFilter==='preview'?'önizleme':'gösterim'}</span></span></button></li>`).join(''):`<li class="history-empty">${visitFilter==='detail'?'Henüz bir oyun ayrıntısı açmadın.':visitFilter==='preview'?'Henüz kısa video önizlemesi izlemedin.':'Henüz görünür bir oyun kartı kaydedilmedi.'}</li>`;
 $('historyMore').hidden=rows.length<=visitShown;$('clearHistory').disabled=!visitRows.length;
 $('historyStorage').textContent=visitStorageAvailable?'Bu cihaz ve tarayıcıya özel. Son 200 oyun, en fazla 90 gün saklanır; hesabınla birleştirilmez.':'Bu tarayıcıda kalıcı kayıt kullanılamıyor. Geçmiş yalnızca bu sayfa açıkken tutuluyor.';
}
function showVisitHistory(){stopCardPreview();stopSpotlight();cancelVisitDwell();visitShown=20;renderVisitHistory();$('historyDialog').showModal();}
function clearVisitHistory(){
 clearTimeout(visitSaveTimer);visitSaveTimer=null;visitDirty=false;cancelVisitDwell();visitRows=[];
 try{localStorage.removeItem(visitHistoryKey);visitStorageAvailable=true;}catch{visitStorageAvailable=false;}
 visitShown=20;renderVisitHistory();$('historyStatus').textContent='Geçmiş temizlendi.';
}
function initVisitHistory(){
 $('visitHistory').onclick=showVisitHistory;$('clearHistory').onclick=clearVisitHistory;
 $('historyMore').onclick=()=>{visitShown+=20;renderVisitHistory();};
 for(const kind of visitKinds)$('history'+kind).onclick=()=>{visitFilter=kind;visitShown=20;renderVisitHistory();};
 $('historyDialog').addEventListener('close',()=>{$('historyStatus').textContent='';scheduleSpotlight();});
 document.addEventListener('close',refreshVisitCards,true);
 document.addEventListener('visibilitychange',()=>{cancelVisitDwell();if(document.hidden)flushVisitHistory();else refreshVisitCards();});
 document.addEventListener('scroll',checkVisitVisibility,true);globalThis.addEventListener?.('resize',checkVisitVisibility);
 globalThis.addEventListener?.('pagehide',flushVisitHistory);
 globalThis.addEventListener?.('storage',event=>{if(event.key!==visitHistoryKey)return;clearTimeout(visitSaveTimer);visitSaveTimer=null;visitDirty=false;cancelVisitDwell();visitRows=parseVisitHistory(event.newValue);if($('historyDialog').open)renderVisitHistory();});
}
