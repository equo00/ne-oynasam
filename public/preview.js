'use strict';
const previewCache=new Map(),previewCacheLimit=40,previewHoverDelay=450;
const previewMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
const previewHover=globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')||{matches:false};
let previewEnabled=true,previewJob=null,previewSequence=0;
try{previewEnabled=localStorage.getItem('neoynasam-auto-previews')!=='off';}catch{}
function initPreviewPreferences(){
 const input=$('autoPreviews');if(!input)return;
 input.checked=previewEnabled&&!previewMotion.matches;input.disabled=previewMotion.matches;
 input.title=previewMotion.matches?'Hareketi azaltma tercihin nedeniyle otomatik önizleme kapalı.':'Fare kartın üzerinde bekleyince sessiz kısa video oynat.';
 $('previewPreferenceNote').hidden=!previewMotion.matches;
}
function previewMarkup(g){
 if(!Number.isSafeInteger(g.steamAppId)||g.steamAppId<1)return '';
 return `<button type="button" class="card-preview-toggle" data-preview-toggle="${esc(g.id)}" aria-label="${esc(g.name)} kısa video önizlemesini oynat" aria-pressed="false">${icon('play')}<span>Önizle</span></button>`;
}
function previewButton(card){return card.querySelector('[data-preview-toggle]');}
function previewButtonState(job,busy=false,playing=false){
 const button=previewButton(job.card);if(!button)return;
 button.setAttribute('aria-busy',String(busy));button.setAttribute('aria-pressed',String(busy||playing));
 button.setAttribute('aria-label',job.name+' kısa video önizlemesini '+(busy||playing?'durdur':'oynat'));
 button.innerHTML=icon(busy||playing?'close':'play')+'<span>'+(busy?'Yükleniyor…':playing?'Durdur':'Önizle')+'</span>';
}
function previewVisible(card){
 if(card.isConnected===false)return false;
 const r=card.getBoundingClientRect();
 return !Number.isFinite(globalThis.innerHeight)||r.bottom>0&&r.top<globalThis.innerHeight&&r.right>0&&r.left<globalThis.innerWidth;
}
function stopCardPreview(){
 previewSequence++;const job=previewJob;previewJob=null;if(!job)return;
 clearTimeout(job.timer);clearTimeout(job.timeout);job.controller.abort();job.observer?.disconnect();
 if(job.video){job.video.pause();job.video.removeAttribute('src');job.video.load();job.video.remove();}
 job.card.classList.remove('preview-playing');previewButtonState(job);
}
function validCardClip(clip,appid){
 if(!clip||clip.loopSeconds!==6||clip.source!=='steam-microtrailer'||!['mp4','webm'].includes(clip.format))return false;
 try{const u=new URL(clip.src);return u.protocol==='https:'&&u.origin==='https://video.akamai.steamstatic.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&new RegExp('^/store_trailers/'+appid+'/[0-9]+/[a-f0-9]{32,64}/[0-9]+/microtrailer\\.'+clip.format+'$','i').test(u.pathname);}catch{return false;}
}
async function previewMetadata(job){
 const hit=previewCache.get(job.id);
 if(hit&&hit.expires>Date.now()){previewCache.delete(job.id);previewCache.set(job.id,hit);return hit.data;}
 const data=await api('/api/preview?gameId='+encodeURIComponent(job.id),'GET',undefined,{signal:job.controller.signal});
 if(data.gameId!==job.id||data.steamAppId!==job.appid||data.preview!==null&&!validCardClip(data.preview,job.appid))throw Error('Kısa önizleme oyunla eşleşmedi.');
 if(job.controller.signal.aborted)return null;
 previewCache.delete(job.id);previewCache.set(job.id,{data,expires:Date.now()+(data.preview?1800000:300000)});
 while(previewCache.size>previewCacheLimit)previewCache.delete(previewCache.keys().next().value);
 return data;
}
function previewRelevant(job){
 return previewJob===job&&job.sequence===previewSequence&&!job.controller.signal.aborted&&!document.hidden&&!$('detail').open&&previewVisible(job.card);
}
function previewFailed(job,message='Kısa video şu an oynatılamıyor. Kapak gösteriliyor.'){
 if(previewJob!==job)return;stopCardPreview();
 const button=previewButton(job.card);if(button)button.title=message;
 if(job.manual)toast(message);
}
async function playCardPreview(job){
 if(!previewRelevant(job)){if(previewJob===job)stopCardPreview();return;}
 job.timeout=setTimeout(()=>previewFailed(job,'Önizleme yüklemesi gecikti. Yeniden deneyebilirsin.'),20000);
 previewButtonState(job,true);
 try{
  const data=await previewMetadata(job);if(!previewRelevant(job)){if(previewJob===job)stopCardPreview();return;}
  if(!data?.preview){previewFailed(job,'Bu oyun için kısa video önizlemesi bulunmuyor.');return;}
  const video=document.createElement('video');job.video=video;
  video.className='card-preview-video';video.muted=true;video.defaultMuted=true;video.volume=0;video.loop=true;video.playsInline=true;video.preload='none';
  video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.disablePictureInPicture=true;
  video.addEventListener('loadedmetadata',()=>{if(previewRelevant(job)&&(!Number.isFinite(video.duration)||video.duration<1||video.duration>15))previewFailed(job);});
  video.addEventListener('timeupdate',()=>{if(previewRelevant(job)&&video.currentTime>=6)video.currentTime=0;});
  video.addEventListener('volumechange',()=>{if(video.volume!==0)video.volume=0;if(!video.muted)video.muted=true;});
  video.addEventListener('playing',()=>{if(!previewRelevant(job)){if(previewJob===job)stopCardPreview();return;}clearTimeout(job.timeout);if(!job.historyRecorded){recordVisitEvent(nameGame(job.id),'preview');job.historyRecorded=true;}job.card.classList.add('preview-playing');previewButtonState(job,false,true);});
  video.addEventListener('error',()=>previewFailed(job));
  job.card.querySelector('.open-card').appendChild(video);video.src=data.preview.src;
  await video.play();if(!previewRelevant(job)&&previewJob===job)stopCardPreview();
 }catch(error){if(previewJob===job&&error.name!=='AbortError')previewFailed(job);}
}
function startCardPreview(card,manual=false){
 if(document.hidden||$('detail').open||!card||!previewVisible(card))return;
 if(!manual&&(!previewEnabled||previewMotion.matches||!previewHover.matches))return;
 if(previewJob?.card===card)return;
 const id=card.dataset.previewGame,appid=Number(card.dataset.previewApp),g=nameGame(id);
 if(!validGameId(id)||!g||g.steamAppId!==appid)return;
 stopCardPreview();stopMedia();
 const job={card,id,appid,name:g.name,manual,sequence:previewSequence,controller:new AbortController()};previewJob=job;
 if(globalThis.IntersectionObserver){job.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.target===card&&!e.isIntersecting)&&previewJob===job)stopCardPreview();},{threshold:0});job.observer.observe(card);}
 if(manual)return playCardPreview(job);
 job.timer=setTimeout(()=>playCardPreview(job),previewHoverDelay);
}
document.addEventListener('pointerover',e=>{
 if(e.pointerType&&e.pointerType!=='mouse')return;
 const card=e.target.closest?.('.card[data-preview-game]');if(!card||card.contains(e.relatedTarget))return;
 startCardPreview(card);
});
document.addEventListener('pointerout',e=>{
 const card=e.target.closest?.('.card[data-preview-game]');if(card&&previewJob?.card===card&&!card.contains(e.relatedTarget))stopCardPreview();
});
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-preview-toggle]');if(!button)return;e.preventDefault();e.stopPropagation();
 const card=button.closest('.card[data-preview-game]');
 if(previewJob?.card===card)stopCardPreview();else startCardPreview(card,true);
});
document.addEventListener('focusout',e=>{if(previewJob&&previewJob.card.contains(e.target)&&!previewJob.card.contains(e.relatedTarget))stopCardPreview();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCardPreview();});
document.addEventListener('scroll',()=>{if(previewJob&&!previewVisible(previewJob.card))stopCardPreview();},true);
globalThis.addEventListener?.('pagehide',stopCardPreview);
document.addEventListener('input',e=>{if(e.target.closest?.('#explore'))stopCardPreview();});
document.addEventListener('change',e=>{
 if(e.target.id==='autoPreviews'){previewEnabled=e.target.checked;try{localStorage.setItem('neoynasam-auto-previews',previewEnabled?'on':'off');}catch{}stopCardPreview();initPreviewPreferences();}
 else if(e.target.closest?.('#explore'))stopCardPreview();
});
previewMotion.addEventListener?.('change',()=>{stopCardPreview();initPreviewPreferences();});
previewHover.addEventListener?.('change',()=>{stopCardPreview();});
