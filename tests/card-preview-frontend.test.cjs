const vm=require('node:vm'),assert=require('node:assert/strict');
const {createHarness}=require('./frontend-harness.cjs');
(async()=>{
 const motion={matches:false,addEventListener(t,cb){this.change=cb}},hover={matches:true,addEventListener(t,cb){this.change=cb}};
 const observers=[],videos=[];let mode='',release,playMode='';
 const environment={
  innerHeight:800,innerWidth:1200,matchMedia:q=>q.includes('reduced-motion')?motion:hover,
  IntersectionObserver:class{constructor(cb){this.cb=cb;observers.push(this)}observe(card){this.card=card}disconnect(){this.disconnected=true}},
  setTimeout:(fn,delay)=>{const t=setTimeout(fn,delay===450?25:delay===20000?80:delay);if(delay>100)t.unref();return t}
 };
 const f=createHarness({environment,requestHook:async({url,data,response})=>{
  if(url.pathname==='/api/preview'){
   if(mode==='hold')return new Promise(r=>release=()=>r(response(data)));
   if(mode==='none')return response({...data,preview:null});
   if(mode==='wrong')return response({...data,preview:{...data.preview,src:data.preview.src.replace('/store_trailers/','/other/')}});
   if(mode==='error')return response({error:'Test hatası'},503);
  }
 }});
 const {ctx,elements:e,listeners,requests}=f,run=code=>vm.runInContext(code,ctx),wait=ms=>new Promise(r=>setTimeout(r,ms));
 ctx.document.createElement=tag=>{
  assert.equal(tag,'video');
  const video={duration:8.133333,currentTime:0,handlers:{},addEventListener(t,fn){this.handlers[t]=fn},setAttribute(k,v){(this.attributes??={})[k]=v},removeAttribute(k){delete this[k];if(this.attributes)delete this.attributes[k]},pause(){this.paused=true},load(){this.loads=(this.loads||0)+1},remove(){this.removed=true},
   play(){if(playMode==='reject')return Promise.reject(Error('Autoplay denied'));if(playMode==='hang')return new Promise(()=>{});this.handlers.loadedmetadata?.();this.handlers.playing?.();return Promise.resolve()}};
  videos.push(video);return video;
 };
 await wait(35);
 const records=f.records,ids=['kenshi','portal-2','steam-312520'];await run('hydrateGames('+JSON.stringify(ids)+')');
 function card(id){
  const g=f.allGames.find(g=>g.id===id),flags=new Set(),button={id:'',dataset:{previewToggle:id},setAttribute(k,v){this[k]=v},innerHTML:'',closest:q=>q==='[data-preview-toggle]'||q==='button'?button:q==='.card[data-preview-game]'?c:null};
  const surface={appendChild(video){this.video=video}};
  const c={dataset:{previewGame:id,previewApp:String(g.steamAppId)},isConnected:true,flags,button,surface,rect:{left:0,right:230,top:0,bottom:120},contains:x=>x===button||x===surface,querySelector:q=>q==='[data-preview-toggle]'?button:q==='.open-card'?surface:null,classList:{add:x=>flags.add(x),remove:x=>flags.delete(x)},getBoundingClientRect(){return this.rect}};
  return c;
 }
 const a=card(ids[0]),b=card(ids[1]),c=card(ids[2]);ctx.cardA=a;ctx.cardB=b;ctx.cardC=c;
 const previewRequests=()=>requests.filter(r=>r.path.startsWith('/api/preview')).length;
 const views=()=>requests.filter(r=>r.path==='/api/views').length;
 assert.equal(previewRequests(),0,'Opening a many-card page downloads no preview metadata or videos');
 assert.equal(e.autoPreviews.checked,true);assert(e.grid.innerHTML.includes('data-preview-toggle='));
 const pointer=(type,card,pointerType='mouse',relatedTarget=null)=>listeners[type]({pointerType,relatedTarget,target:{closest:q=>q==='.card[data-preview-game]'?card:null}});
 pointer('pointerover',a);pointer('pointerout',a);await wait(35);assert.equal(previewRequests(),0,'Fast mouse passes do not fetch media');
 pointer('pointerover',a,'touch');await wait(35);assert.equal(previewRequests(),0,'Touch pointer does not imply hover');
 pointer('pointerover',a);await wait(40);
 assert.equal(previewRequests(),1);assert(a.flags.has('preview-playing'));assert.equal(videos.length,1);
 const first=videos[0];assert.equal(first.muted,true);assert.equal(first.volume,0);assert.equal(first.loop,true);assert.equal(first.playsInline,true);assert(!first.controls);
 first.currentTime=6.1;first.handlers.timeupdate();assert.equal(first.currentTime,0,'Source clip longer than six seconds still uses a short loop');
 assert.equal(views(),0,'Preview playback is not an open-detail view event');
 pointer('pointerover',b);await wait(40);assert(first.paused&&first.removed);assert.equal(first.src,undefined);assert(!a.flags.has('preview-playing'));
 assert(b.flags.has('preview-playing'));assert.equal(run('previewJob.id'),ids[1]);
 pointer('pointerout',b);assert.equal(run('previewJob'),null);assert(!b.flags.has('preview-playing'));
 const beforeCached=previewRequests();await run('startCardPreview(cardA,true)');assert.equal(previewRequests(),beforeCached,'Explicit touch/keyboard action shares bounded metadata cache');
 let prevented=0;await listeners.click({target:a.button,preventDefault(){prevented++},stopPropagation(){}});
 assert.equal(prevented,1);assert.equal(run('previewJob'),null);assert.equal(views(),0,'Preview button does not open detail');
 await run('startCardPreview(cardA,true)');observers.at(-1).cb([{target:a,isIntersecting:false}]);assert.equal(run('previewJob'),null);
 await run('startCardPreview(cardA,true)');ctx.document.hidden=true;listeners.visibilitychange({});assert.equal(run('previewJob'),null);ctx.document.hidden=false;
 await run('startCardPreview(cardA,true)');run('render()');assert.equal(run('previewJob'),null);
 await run('startCardPreview(cardA,true)');await run('loadPage()');assert.equal(run('previewJob'),null,'Filtering stops video before response');
 mode='hold';run('previewCache.clear()');const old=run('startCardPreview(cardA,true)');await wait(5);run('stopCardPreview()');mode='';await run('startCardPreview(cardB,true)');const beforeLate=videos.length;release();await old;
 assert.equal(run('previewJob.id'),ids[1]);assert.equal(videos.length,beforeLate,'Late metadata cannot start video on old card');
 run('stopCardPreview();previewCache.clear()');mode='none';await run('startCardPreview(cardC,true)');assert.equal(run('previewJob'),null);assert(!c.flags.has('preview-playing'));assert(c.button.title.includes('bulunmuyor'));
 run('previewCache.clear()');mode='wrong';await run('startCardPreview(cardC,true)');assert.equal(run('previewJob'),null);
 run('previewCache.clear()');mode='error';await run('startCardPreview(cardC,true)');assert.equal(run('previewJob'),null);
 mode='';playMode='reject';await run('startCardPreview(cardC,true)');assert.equal(run('previewJob'),null);assert(videos.at(-1).removed);
 playMode='hang';run('startCardPreview(cardA,true)');await wait(100);assert.equal(run('previewJob'),null,'Slow playback timeout restores cover');
 playMode='';await run('startCardPreview(cardA,true)');a.rect.top=900;a.rect.bottom=1050;listeners.scroll({});assert.equal(run('previewJob'),null);a.rect.top=0;a.rect.bottom=120;
 await run('startCardPreview(cardA,true)');e.autoPreviews.checked=false;listeners.change({target:e.autoPreviews});assert.equal(run('previewJob'),null);assert.equal(f.storage['neoynasam-auto-previews'],'off');
 const offCount=previewRequests();pointer('pointerover',a);await wait(35);assert.equal(previewRequests(),offCount);assert.equal(run('previewJob'),null);
 await run('startCardPreview(cardA,true)');assert(run('previewJob'),'Explicit button still works when automatic preview is off');
 listeners.focusout({target:a.button,relatedTarget:{}});assert.equal(run('previewJob'),null);
 e.autoPreviews.checked=true;listeners.change({target:e.autoPreviews});motion.matches=true;motion.change();
 assert.equal(e.autoPreviews.checked,false);assert(e.autoPreviews.disabled);pointer('pointerover',a);await wait(35);assert.equal(run('previewJob'),null);
 await run('startCardPreview(cardA,true)');assert(run('previewJob'),'Reduced motion suppresses automatic play, not explicit action');
 const active=run('previewJob.video');await run("openGame('kenshi')");assert(active.paused&&active.removed);assert.equal(run('previewJob'),null);
 await run('startCardPreview(cardB,true)');assert.equal(run('previewJob'),null,'Gallery dialog and card preview cannot play together');
 e.detail.close();motion.matches=false;motion.change();
 const all=f.source.slice(0,42).map(g=>g.id);await run('hydrateGames('+JSON.stringify(all)+')');
 for(const id of all){ctx.cacheCard=card(id);await run('startCardPreview(cacheCard,true)');run('stopCardPreview()');}
 assert.equal(run('previewCache.size'),40);
 assert.deepEqual(f.records,records);assert.equal(views(),1,'Only actual detail open counts');
 run('stopCardPreview();closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)');
 const saved=createHarness({storage:{'neoynasam-auto-previews':'off'},environment});await wait(25);assert.equal(saved.elements.autoPreviews.checked,false);
 vm.runInContext('stopCardPreview();closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)',saved.ctx);
 console.log('Passed: delayed lazy hover, touch/keyboard toggle, short muted single playback, bounded cache, late responses, missing/unsafe media, autoplay rejection, cleanup on leave/visibility/filter/dialog, persistent preference and reduced motion without fake views.');
})().catch(error=>{console.error(error);process.exitCode=1});
