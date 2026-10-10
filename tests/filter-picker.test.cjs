const vm=require('node:vm'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createHarness}=require('./frontend-harness.cjs');const sleep=ms=>new Promise(r=>setTimeout(r,ms)),run=(h,c)=>vm.runInContext(c,h.ctx);
(async()=>{
 const h=createHarness();await sleep(70);const ids=['genrePicker','tagPicker','gameplayPicker'];
 for(const id of ids){const target=h.elements[id];target.open=true;h.listeners.toggle({target});assert(ids.filter(key=>h.elements[key].open).length===1);assert(target.open);}
 // Keyboard opening uses toggle; summary clicks close siblings before the default action.
 h.elements.genrePicker.open=true;h.listeners.click({target:{closest:s=>s==='.multi-filter'?h.elements.tagPicker:s==='summary'?{}:null}});assert.equal(h.elements.genrePicker.open,false);
 h.elements.tagPicker.open=true;h.listeners.click({target:{closest:s=>s==='.multi-filter'?h.elements.tagPicker:null}});assert(h.elements.tagPicker.open,'Selecting inside a picker keeps it open');
 h.listeners.click({target:{closest:()=>null}});assert(ids.every(id=>!h.elements[id].open),'Outside clicks close the panel');
 for(const [kind,listId,value]of [['genres','genreFilterList','Korku'],['tags','tagFilterList','19']]){
  const before=Array.from(run(h,`multiFilterOptions('${kind}').map(o=>o.value)`));assert(before.includes(value));
  // Replacing real scrollable content resets its position; model that behavior here.
  let html='',inputs=[];const list={scrollTop:0,querySelectorAll:()=>inputs};Object.defineProperty(list,'innerHTML',{get:()=>html,set:text=>{html=text;list.scrollTop=0;inputs=[...text.matchAll(/<input type="checkbox" data-multi="([^"]+)" value="([^"]+)" ([^>]*)>/g)].map(m=>({dataset:{multi:m[1]},value:m[2],checked:m[3].includes('checked'),focus(){h.ctx.document.activeElement=this;list.scrollTop=0;}}));}});h.elements[listId]=list;run(h,'renderMultiFilters()');const selected=inputs.find(input=>input.value===value);assert(selected);h.ctx.document.activeElement=selected;list.scrollTop=170;selected.checked=true;
  await h.listeners.change({target:selected});await sleep(40);
  assert.deepEqual(Array.from(run(h,`multiFilterOptions('${kind}').map(o=>o.value)`)),before,'Selection preserves the complete option order');assert.equal(list.scrollTop,170,'Selection and catalogue repaint preserve the scrolled position');assert(inputs.find(input=>input.value===value).checked,'The selected item remains checked in the same list');assert.equal(h.ctx.document.activeElement.value,value,'Checkbox focus survives catalogue repaint');
  const current=inputs.find(input=>input.value===value);current.checked=false;await h.listeners.change({target:current});await sleep(30);assert(!inputs.find(input=>input.value===value).checked);assert.equal(list.scrollTop,170);
 }
 const html=fs.readFileSync('public/index.html','utf8');for(const id of ids)assert(new RegExp('<details[^>]*name="discovery-multi-filter"[^>]*id="'+id+'"').test(html),'Native details grouping prevents simultaneous open panels');
 run(h,'closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)');console.log('Passed: exclusive pointer/keyboard filter panels, inside/outside click behavior, stable genre/tag option order, checked selections, scroll position and focus through catalogue updates.');
})().catch(e=>{console.error(e);process.exitCode=1});
