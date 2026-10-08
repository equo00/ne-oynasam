const vm=require('node:vm'),assert=require('node:assert/strict');
const {createHarness}=require('./frontend-harness.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const run=(h,code)=>vm.runInContext(code,h.ctx);
const stop=h=>run(h,'closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer);clearTimeout(searchTimer)');
(async()=>{
 const h=createHarness();await pause(30);
 h.elements.search.value='hel';h.elements.search.oninput();
 h.elements.search.value='helld';h.elements.search.oninput();
 await pause(350);
 assert.equal(run(h,'state.games[0].steamAppId'),553850);
 assert.equal(h.requests.filter(r=>r.path.includes('q=hel')).length,1,'Typing produces one debounced request');
 h.elements.search.value='Portal 2';h.elements.search.oninput();let prevented=false;
 h.elements.search.onkeydown({key:'Enter',preventDefault(){prevented=true;}});await pause(30);
 assert(prevented);assert.equal(run(h,'state.games[0].name'),'Portal 2');
 h.elements.search.value='Kenshi';await h.elements.searchSubmit.onclick();assert.equal(run(h,'state.games[0].name'),'Kenshi');
 h.elements.search.value='';await h.elements.search.onsearch();assert.equal(run(h,'state.total'),1323);
 h.elements.search.value='helldr';await h.elements.searchSubmit.onclick();assert.equal(run(h,'state.total'),0);assert.equal(run(h,'state.loading'),false);
 stop(h);

 let hang=false;
 const timeout=createHarness({requestHook:({url,options,data,response})=>{
  if(hang&&url.pathname==='/api/catalog')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error('Aborted');e.name='AbortError';reject(e);},{once:true}));
  return response(data);
 }});await pause(30);hang=true;timeout.elements.search.value='Kenshi';
 assert.equal(await run(timeout,'loadPage({force:true,timeoutMs:20})'),false);
 assert.equal(run(timeout,'state.loading'),false);assert.equal(timeout.elements.grid['aria-busy'],'false');
 assert(timeout.elements.grid.innerHTML.includes('Arama yanıtı gecikti'));assert(timeout.elements.grid.innerHTML.includes('retryCatalog'));
 hang=false;await run(timeout,'loadPage({force:true})');assert.equal(run(timeout,'state.games[0].name'),'Kenshi');stop(timeout);
 console.log('Passed: debounced typing, Enter, search button, clearing, empty results, stalled request timeout and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
