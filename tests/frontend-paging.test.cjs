const vm=require('node:vm'),assert=require('node:assert/strict');
const {createHarness}=require('./frontend-harness.cjs');
const coverage=require('../data/METACRITIC-STEP3-REPORT.json');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const run=(h,code)=>vm.runInContext(code,h.ctx);
const catalogRequests=h=>h.requests.filter(r=>r.method==='GET'&&r.path.startsWith('/api/catalog?'));
const stop=h=>run(h,'closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)');
(async()=>{
 const linked=createHarness({search:'?genre=Aksiyon&rating=7&system=Windows'});
 linked.elements.genre.value='RPG';assert.equal(linked.elements.genre.value,'','An unlisted select value resets to empty, as in the browser');
 await sleep(30);
 const linkedQuery=new URL(catalogRequests(linked)[0].path,'https://test').searchParams;
 assert.equal(linkedQuery.get('genre'),'Aksiyon','The first request preserves the URL genre before facets arrive');
 assert.equal(linked.elements.genre.value,'Aksiyon','The selection survives replacement by server genre facets');
 assert(linked.location.search.includes('genre=Aksiyon'));
 assert(run(linked,'state.total>0&&state.games.every(g=>g.genres.includes("Aksiyon")&&userScore(g).score>=7&&g.pcSystems.includes("Windows"))'));
 stop(linked);
 const sample=createHarness();await sleep(30);
 assert.equal(run(sample,'state.games.length'),24,'A result page contains at most 24 records');
 assert.equal(run(sample,'state.total'),1323,'The UI total comes from server metadata, not the page length');
 assert(sample.elements.catalogStats.innerHTML.includes('<b>'+coverage.scores.toLocaleString('tr')+'</b>'),'All existing source score records remain counted');
 assert(!sample.requests.some(r=>r.path==='/api/catalog'||r.path.startsWith('/editorial.json')||(r.path==='/api/views'&&r.method==='GET')),'Bootstrap never downloads a full catalog/editorial/views map');
 assert(catalogRequests(sample).every(r=>new URL(r.path,'https://test').searchParams.get('pageSize')==='24'));
 const first=run(sample,'state.games.map(g=>g.id).join(",")');
 await run(sample,'state.page=2;loadPage()');assert.notEqual(run(sample,'state.games.map(g=>g.id).join(",")'),first);
 assert.equal((sample.elements.grid.innerHTML.match(/<article class="card">/g)||[]).length,24);
 const page2=run(sample,'state.games.map(g=>g.id)');
 await run(sample,'state.page=1;loadPage()');assert.equal(run(sample,'state.games.map(g=>g.id).join(",")'),first);
 assert.equal(catalogRequests(sample).length,2,'Returning to a cached page does not refetch it');run(sample,'for(const value of pageCache.values())value.cachedAt=Date.now()-30001');await run(sample,'loadPage()');assert.equal(catalogRequests(sample).length,3,'Expired pages refresh totals and new catalog records');
 const before=catalogRequests(sample).length;run(sample,'render();render();render()');assert.equal(catalogRequests(sample).length,before,'Painting, comparison and saving state do not trigger request loops');
 for(let page=3;page<=18;page++)await run(sample,`state.page=${page};loadPage()`);
 assert(run(sample,'pageCache.size<=10&&gameCache.size<=360'),'Browsing many pages keeps memory bounded');
 sample.elements.genre.value='RPG';sample.elements.rating.value='8';sample.elements.system.value='Windows';await run(sample,'state.page=1;loadPage()');
 const query=new URL(catalogRequests(sample).at(-1).path,'https://test').searchParams;
 assert.equal(query.get('genre'),'RPG');assert.equal(query.get('rating'),'8');assert.equal(query.get('system'),'Windows');
 assert(run(sample,'state.games.every(g=>g.genres.includes("RPG")&&userScore(g).score>=8&&g.pcSystems.includes("Windows"))'));
 await run(sample,'clear();');await run(sample,'state.page=2;loadPage()');
 const refreshPage=run(sample,'state.games.map(g=>g.id)');await run(sample,'refreshData()');
 const refreshed=sample.requests.filter(r=>r.path==='/api/catalog'&&r.method==='POST').flatMap(r=>r.body.ids);
 assert.deepEqual(Array.from(refreshed),Array.from(refreshPage),'Refresh mutates the currently displayed page, preserving stable IDs');
 assert.equal(new Set(refreshed).size,24);assert.notDeepEqual(Array.from(refreshed),Array.from(first.split(',')));
 await run(sample,'clear()');sample.elements.genre.value='Bulmaca';await run(sample,'loadPage()');await sample.elements.surprise.onclick();
 const randomRequest=catalogRequests(sample).find(r=>r.path.includes('random=1'));
 assert(randomRequest&&new URL(randomRequest.path,'https://test').searchParams.get('genre')==='Bulmaca');
 assert(run(sample,'state.current.genres.includes("Bulmaca")'),'Random discovery searches the complete filtered result, not only the visible page');
 stop(sample);

 const last=sample.source.at(-1),archive=sample.archived.find(g=>!sample.source.some(x=>x.id===g.id));assert(last&&archive);
 const deep=createHarness({search:'?game='+encodeURIComponent(last.id),storage:{'neoynasam-compare':JSON.stringify(['../invalid',last.id,archive.id])}});await sleep(40);
 assert.equal(run(deep,'state.current.id'),last.id);assert.equal(run(deep,'state.games.length'),24);
 assert(run(deep,'state.compare.size===2'),'Restored off-page and archived comparison IDs survive the first paint');
 assert(deep.requests.some(r=>r.path.startsWith('/api/games?')&&r.path.includes(encodeURIComponent(last.id))));
 await run(deep,'showCompare()');assert(deep.elements.compareContent.innerHTML.includes(last.name));assert(deep.elements.compareContent.innerHTML.includes(archive.name));
 for(let page=2;page<=18;page++)await run(deep,`state.page=${page};loadPage()`);
 assert.equal(run(deep,'state.current.id'),last.id);assert(run(deep,'[...state.compare].every(id=>nameGame(id))'));
 stop(deep);

 const optionalFailure=createHarness({storage:{'neoynasam-compare':JSON.stringify([last.id,archive.id])},requestHook:({url,data,response})=>url.pathname==='/api/games'?response({error:'Geçici kesinti'},503):response(data)});await sleep(30);assert.equal(run(optionalFailure,'state.loaded'),true);assert.equal(optionalFailure.elements.resultCount.textContent,'1323 oyun');assert(optionalFailure.elements.grid.innerHTML.includes('class="card"'),'An optional comparison hydration failure keeps the usable catalog visible');stop(optionalFailure);

 // The deliberately slower first request ignores AbortSignal to prove the sequence guard.
 const race=createHarness({requestHook:async({url,data,response})=>{if(url.pathname==='/api/catalog'&&url.searchParams.get('q')==='Kenshi')await sleep(40);return response(data);}});await sleep(30);
 race.elements.search.value='Kenshi';const slow=run(race,'loadPage({force:true})');race.elements.search.value='Portal 2';const fast=run(race,'loadPage({force:true})');await Promise.all([slow,fast]);
 assert.equal(run(race,'state.games[0].name'),'Portal 2');assert.equal(race.elements.resultCount.textContent,'1 oyun');assert(race.location.search.includes('Portal+2'));
 const searches=catalogRequests(race).slice(-2);assert(searches[0].signal.aborted,'Changing filters cancels the preceding request');
 stop(race);

 let bootstrapCount=0;
 const warmup=createHarness({requestHook:({url,data,response})=>{if(url.pathname==='/api/catalog'&&bootstrapCount++===0)return response({ready:false,retryAfter:0.01,error:'Katalog hazırlanıyor'},202);return response(data);}});await sleep(150);
 assert.equal(run(warmup,'state.loaded'),true,'A bootstrap-in-progress response retries instead of showing an empty catalog');assert.equal(catalogRequests(warmup).length,2);stop(warmup);
 const unavailable=createHarness({requestHook:({url,data,response})=>url.pathname==='/api/catalog'?response({error:'Geçici kesinti'},503):response(data)});await sleep(30);
 assert.equal(run(unavailable,'state.loaded'),false);assert(unavailable.elements.grid.innerHTML.includes('retryCatalog'));assert(unavailable.elements.grid.innerHTML.includes('Geçici kesinti'));stop(unavailable);

 // Import a larger chosen list than the cache can retain; ID validation must not drop early chunks.
 const importing=createHarness();await sleep(30);
 const selection=importing.source.slice(0,430).map(g=>({gameId:g.id,status:'planned',note:'',rating:null}));importing.ctx.importFixture={version:1,entries:selection,lists:[]};await run(importing,'importEntries(importFixture)');
 assert.equal(importing.records.length,430,'Selective import validation spans multiple 60-ID batches without cache eviction losing records');
 assert(importing.requests.filter(r=>r.path.startsWith('/api/games?')).every(r=>decodeURIComponent(new URL(r.path,'https://test').searchParams.get('ids')).split(',').length<=60));
 assert(run(importing,'gameCache.size<=360'));stop(importing);
 console.log('Passed: bounded pages/cache, metadata totals and preserved accepted scores, no bulk startup downloads, server filters/random, current-page refresh, off-page and archived deep links/comparison, request races/cancellation, bootstrap retry, visible retry failures and chunked import.');
})().catch(error=>{console.error(error);process.exitCode=1});
