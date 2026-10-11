const vm=require('node:vm'),assert=require('node:assert/strict');
const {createHarness}=require('./frontend-harness.cjs');
const key='neoynasam-visit-history-v1',wait=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 const timers=new Map(),observers=[],globalListeners={};let timerId=10000;
 const environment={innerHeight:800,innerWidth:1200,
  IntersectionObserver:class{constructor(cb){this.cb=cb;observers.push(this)}observe(){}disconnect(){}},
  setTimeout(fn,delay){if(delay===1000||delay===750){const id=++timerId;timers.set(id,{fn,delay});return id;}const t=setTimeout(fn,delay);if(delay>100)t.unref();return t;},
  clearTimeout(id){if(timers.has(id))timers.delete(id);else clearTimeout(id);},
  addEventListener(type,fn){globalListeners[type]=fn;}
 };
 const storage={'neoynasam-theme':'dark','neoynasam-auto-previews':'off'};
 const f=createHarness({user:null,storage,environment}),run=code=>vm.runInContext(code,f.ctx);
 await wait();await run("hydrateGames(['kenshi','portal-2'])");
 const snapshot=()=>JSON.parse(run('JSON.stringify(visitRows)'));
 const tick=delay=>{for(const [id,t] of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}};
 const a={dataset:{historyGame:'kenshi'},isConnected:true,rect:{left:0,right:230,top:0,bottom:120},getBoundingClientRect(){return this.rect;}};
 const b={dataset:{historyGame:'portal-2'},isConnected:true,rect:{left:0,right:230,top:900,bottom:1020},getBoundingClientRect(){return this.rect;}};
 const dialogs=()=>Object.values(f.elements).filter(x=>/Dialog|detail|quiz/.test(x.id));
 f.ctx.document.querySelectorAll=q=>q==='[data-history-game]'?[a,b]:q==='dialog'?dialogs():[];
 run('refreshVisitCards()');const observer=observers[0];
 observer.cb([{target:a,isIntersecting:true,intersectionRatio:0.5}]);
 assert.equal(snapshot().length,0,'A rendered card alone is not a seen event');
 observer.cb([{target:a,isIntersecting:false,intersectionRatio:0}]);tick(1000);assert.equal(snapshot().length,0,'Fast passes are not impressions');
 observer.cb([{target:b,isIntersecting:true,intersectionRatio:1}]);tick(1000);assert.equal(snapshot().length,0,'Offscreen cards are excluded');
 observer.cb([{target:a,isIntersecting:true,intersectionRatio:1}]);tick(1000);
 assert.equal(snapshot()[0].seen.count,1);assert(!snapshot()[0].detail&&!snapshot()[0].preview);
 assert.equal(storage[key],undefined,'Impressions do not synchronously write for every card');tick(750);assert(storage[key]);
 run('refreshVisitCards()');observer.cb([{target:a,isIntersecting:true,intersectionRatio:1}]);tick(1000);assert.equal(snapshot()[0].seen.count,1,'Rerenders do not inflate impressions');
 await run("openGame('kenshi')");assert.equal(snapshot()[0].detail.count,1,'Anonymous visitors get local actual-open history');
 const views=()=>f.requests.filter(x=>x.path==='/api/views').length;
 const viewCount=views();run("detail(state.current,false)");assert.equal(snapshot()[0].detail.count,1);assert.equal(views(),viewCount,'Editing personal fields cannot create another open event');
 f.elements.detail.close();
 run("recordVisitEvent(nameGame('portal-2'),'preview')");assert.equal(snapshot().find(x=>x.id==='portal-2').preview.count,1);assert.equal(views(),viewCount,'Preview events do not affect server views');
 const beforeOpenRequests=f.requests.length;run('showVisitHistory()');assert(f.elements.historyDialog.open);assert.equal(f.requests.length,beforeOpenRequests,'Opening history does not hydrate or scan the catalog');
 assert(f.elements.historyItems.innerHTML.includes('Kenshi'));assert(!f.elements.historyItems.innerHTML.includes('Portal 2'));
 f.elements.historypreview.onclick();assert(f.elements.historyItems.innerHTML.includes('Portal 2'));assert.equal(f.elements.historypreview['aria-pressed'],'true');
 b.rect.top=0;b.rect.bottom=120;observer.cb([{target:b,isIntersecting:true,intersectionRatio:1}]);tick(1000);
 assert(!snapshot().find(x=>x.id==='portal-2').seen,'A modal masks underlying cards');
 f.elements.historyDialog.close();observer.cb([{target:b,isIntersecting:true,intersectionRatio:1}]);
 f.ctx.document.hidden=true;f.listeners.visibilitychange({});tick(1000);assert(!snapshot().find(x=>x.id==='portal-2').seen,'Hidden pages cancel dwell');f.ctx.document.hidden=false;
 const requestsBeforeClear=f.requests.length;run('clearVisitHistory()');tick(750);assert.equal(snapshot().length,0);assert.equal(storage[key],undefined);assert.equal(f.requests.length,requestsBeforeClear);
 assert.equal(storage['neoynasam-theme'],'dark');assert.equal(storage['neoynasam-auto-previews'],'off');
 await run("openGame('portal-2')");assert.equal(snapshot()[0].detail.count,1);
 const persisted=JSON.parse(storage[key]);assert.deepEqual(Object.keys(persisted).sort(),['games','version']);assert(!JSON.stringify(persisted).includes('email'));
 run('showVisitHistory()');const beforeHistoryOpen=f.requests.length;
 run("gameCache.delete('kenshi')");await f.listeners.click({target:{closest:q=>q==='[data-history-open]'?{dataset:{historyOpen:'kenshi'}}:null},preventDefault(){}});
 assert(!f.elements.historyDialog.open&&f.elements.detail.open);assert.equal(run('state.current.id'),'kenshi');
 assert(f.requests.slice(beforeHistoryOpen).some(x=>x.path.startsWith('/api/games?ids=kenshi')),'Only the selected history game is hydrated');f.elements.detail.close();
 const reload=createHarness({user:{name:'Other account',email:'other@example.test'},storage});await wait();
 const readReload=c=>vm.runInContext(c,reload.ctx);assert.equal(readReload('visitRows[0].id'),'kenshi');assert(readReload("visitRows.some(x=>x.id==='portal-2')"));
 assert.equal(reload.requests.filter(x=>x.path==='/api/library/import'||x.path.includes('history')).length,0,'Login does not merge browser history into an account');
 globalListeners.storage({key,newValue:null});assert.equal(snapshot().length,0);tick(750);assert.equal(snapshot().length,0,'Another tab clearing history cancels pending writes');
 const now=Date.now();f.ctx.raw={version:1,games:[{id:'x',name:'Expired',detail:{at:now-91*86400000,count:1}},{id:'bad/id',name:'Wrong',detail:{at:now,count:1}},{id:'ok',name:'<img src=x onerror=alert(1)>',detail:{at:now,count:1}},{id:'future',name:'Future',detail:{at:now+86400000,count:1}}]};
 assert.equal(run('cleanVisitRows(raw).length'),1);run('visitRows=cleanVisitRows(raw);visitFilter="detail";renderVisitHistory()');assert(f.elements.historyItems.innerHTML.includes('&lt;img'));assert(!f.elements.historyItems.innerHTML.includes('<img'));
 f.ctx.raw={version:1,games:Array.from({length:300},(_,i)=>({id:'game-'+i,name:'Game '+i,detail:{at:now-i,count:1}}))};
 run('visitRows=cleanVisitRows(raw);visitShown=20;renderVisitHistory()');assert.equal(snapshot().length,200);assert.equal(snapshot()[0].id,'game-0');assert.equal((f.elements.historyItems.innerHTML.match(/<li>/g)||[]).length,20);
 f.elements.historyMore.onclick();assert.equal((f.elements.historyItems.innerHTML.match(/<li>/g)||[]).length,40);
 assert.equal(run("parseVisitHistory('{broken').length"),0);
 f.ctx.localStorage.setItem=()=>{throw Error('Quota exceeded');};run("recordVisitEvent(nameGame('kenshi'),'detail');renderVisitHistory()");assert.equal(run('visitStorageAvailable'),false);assert(f.elements.historyStorage.textContent.includes('sayfa açıkken'));
 assert.equal(f.records.length,0);assert.equal(f.lists.length,0);
 const fallback=createHarness({user:null,storage:{[key]:'{broken'},environment:{...environment,IntersectionObserver:undefined}});await wait();
 fallback.ctx.document.querySelectorAll=q=>q==='[data-history-game]'?[a]:[];
 await vm.runInContext("(async()=>{await hydrateGames(['kenshi']);refreshVisitCards()})()",fallback.ctx);tick(1000);
 assert.equal(vm.runInContext('visitRows[0].seen.count',fallback.ctx),1,'Visibility fallback works without IntersectionObserver and ignores corrupt storage');
 for(const ctx of [f.ctx,reload.ctx,fallback.ctx])vm.runInContext('cancelVisitDwell();clearTimeout(visitSaveTimer);stopCardPreview();closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)',ctx);
 console.log('Passed: anonymous bounded/expiring browser history, visible dwell, distinct impression/preview/open events, modal/hidden cleanup, throttled writes, reload/login isolation, clear/cross-tab clear, safe text, paging and storage failure without account mutations.');
})().catch(e=>{console.error(e);process.exitCode=1});
