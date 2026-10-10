const vm=require('node:vm'),assert=require('node:assert/strict');
const {createHarness}=require('./frontend-harness.cjs');
(async()=>{
 let mode='',release,heldData;
 const f=createHarness({initialRecords:[{gameId:'kenshi',status:'playing',note:'Notumu koru',rating:4}],initialLists:[{id:'three',name:'Üç oyun',games:['kenshi','portal-2','steam-312520']}],requestHook:async({url,data,response})=>{
  if(url.pathname==='/api/catalog'&&url.searchParams.get('random')==='1'){
   if(mode==='error')return response({error:'Test bağlantı hatası'},503);
   if(mode==='hold'){heldData=data;return new Promise(r=>release=()=>r(response(heldData)));}
  }
 }});
 const {ctx,elements:e,requests}=f,run=code=>vm.runInContext(code,ctx),pause=()=>new Promise(r=>setTimeout(r,5));
 await new Promise(r=>setTimeout(r,30));
 const originalGrid=e.grid.innerHTML;run('state.page=2');e.sort.value='name';
 await e.surprise.onclick();await pause();
 const first=run('state.current.id');
 assert(e.detail.open);assert(e.detailContent.innerHTML.includes('Yeniden şaşırt'));
 assert(!run('state.games.some(g=>g.id===state.current.id)'),'Selection uses entire server pool, not visible page');
 assert.equal(e.grid.innerHTML,originalGrid);assert.equal(run('state.page'),2);
 e.detailSurprise.focus=opts=>{e.detailSurprise.focused=opts};
 ctx.Hls=class{static Events={ERROR:'error',MANIFEST_PARSED:'manifest'};static isSupported(){return true}constructor(){this.destroyed=false}on(){}attachMedia(){}loadSource(){}destroy(){this.destroyed=true}};
 await run('playMedia()');const oldVideo=e.mediaVideo,oldPlayer=run('mediaPlayer');
 await run('surpriseGame(true)');await pause();
 assert.notEqual(run('state.current.id'),first);assert(oldVideo.paused);assert(oldPlayer.destroyed);
 assert(e.detail.open);assert.equal(e.detailSurprise.focused.preventScroll,true);
 assert.equal(e.grid.innerHTML,originalGrid);assert.equal(run('state.page'),2);assert.equal(e.sort.value,'name');
 assert.equal(f.records[0].note,'Notumu koru');assert.equal(f.records[0].rating,4);
 assert.equal(f.lists[0].name,'Üç oyun');
 const second=run('state.current.id');const req=requests.filter(r=>r.path.includes('random=1')).at(-1);
 const p=new URL(req.path,'https://test.example').searchParams;assert.equal(p.get('current'),first);assert(p.getAll('exclude').includes(first));assert.equal(p.get('sort'),'name');
 const views=()=>requests.filter(r=>r.path==='/api/views'&&r.method==='POST').length;
 mode='error';const beforeFailure=views();await run('surpriseGame(true)');
 assert.equal(run('state.current.id'),second);assert(e.detail.open);assert.equal(views(),beforeFailure);assert(!e.detailSurprise.disabled);
 mode='hold';const pending=run('surpriseGame(true)');await pause();
 assert(e.detailSurprise.disabled);assert(e.surprise.disabled);
 const requestCount=requests.length;await run('surpriseGame(true)');assert.equal(requests.length,requestCount,'Repeated click cannot start another request');
 e.detail.close();release();await pending;assert.equal(run('state.current'),null);assert.equal(views(),beforeFailure);
 mode='';await run("openGame('kenshi')");await pause();
 assert(e.detailContent.innerHTML.includes('Notumu koru'));assert(run("state.entries.get('kenshi').rating")===4);
 mode='hold';const stale=run('surpriseGame(true)');await pause();await run("openGame('portal-2')");const opened=views();release();await stale;
 assert.equal(run('state.current.id'),'portal-2');assert.equal(views(),opened);
 const filterPending=run('surpriseGame(true)');await pause();e.search.value='kenshi';release();await filterPending;assert.equal(run('state.current.id'),'portal-2');assert(e.detailSurpriseStatus.textContent.includes('Filtreler değişti'));
 mode='';await run("openGame('kenshi')");await pause();const onlyViews=views();await run('surpriseGame(true)');
 assert.equal(run('state.current.id'),'kenshi');assert(e.detailSurpriseStatus.textContent.includes('başka oyun yok'));assert.equal(views(),onlyViews);
 e.search.value='qzxnotarealgame';await run('surpriseGame(true)');assert(e.detailSurpriseStatus.textContent.includes('bulunamadı'));assert.equal(e.search.value,'qzxnotarealgame');
 e.search.value='';run("state.collection='three';state.compare=new Set(['kenshi','portal-2'])");
 const seen=new Set(['kenshi']);for(let i=0;i<2;i++){await run('surpriseGame(true)');await pause();const id=run('state.current.id');assert(!seen.has(id));seen.add(id);}
 await run('surpriseGame(true)');assert(e.detailSurpriseStatus.textContent.includes('tur'));assert.equal(run("state.compare.size"),2);
 assert(run('surpriseHistory.length')<=30);
 mode='hold';const timeout=run('surpriseGame(true,{timeoutMs:5})');await new Promise(r=>setTimeout(r,15));release();const timeoutViews=views();await timeout;
 assert(e.detailSurpriseStatus.textContent.includes('gecikti'));assert.equal(views(),timeoutViews);assert(!e.detailSurprise.disabled);
 run('cancelSurprise();closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)');
 console.log('Passed: shared filtered server selection, open detail transitions, video cleanup, page/filter/library preservation, bounded tour history, focus, busy/error/timeout states, stale close/game/filter responses and actual-open view events.');
})().catch(err=>{console.error(err);process.exitCode=1});
