import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import harness from './frontend-harness.cjs';

const esbuildPkg = fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const {build} = await import(pathToFileURL(path.resolve('node_modules/.pnpm',esbuildPkg,'node_modules/esbuild/lib/main.js')));
async function route(file) {
  const output = '/tmp/neoynasam-page-' + file.replaceAll('/','-') + '.mjs';
  await build({entryPoints:[file],outfile:output,bundle:true,platform:'node',format:'esm',plugins:[{
    name:'raw-html',setup(b) {
      b.onResolve({filter:/\.html\?raw$/},args=>({path:path.resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'raw'}));
      b.onLoad({filter:/.*/,namespace:'raw'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'text'}));
    }
  }]});
  return import(pathToFileURL(output));
}
const home = await route('app/route.ts'), collection = await route('app/koleksiyonum/route.ts');
const response = await collection.GET(), html = await response.text();
assert.equal(response.status,200);
assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');
assert.equal(response.headers.get('cache-control'),'no-cache');
assert(html.includes('<title>Koleksiyonum · Ne Oynasam?</title>'));
assert(html.includes('data-page="library"'));
assert(html.includes('id="mylist" class="nav active" aria-current="page" href="/koleksiyonum"'));
assert(!html.includes('id="spotlight"'));
assert(!html.includes('id="curations"'));
assert(!html.includes('class="collection-banner"'));
assert(html.includes('id="collectionHeading">Koleksiyonum.'));
assert.equal((html.match(/\bid="[^"]+"/g)||[]).length,new Set((html.match(/\bid="[^"]+"/g)||[])).size,'No duplicate shared UI IDs');

const kenshi = {gameId:'kenshi',status:'playing',note:'Sınır kasabasında kaldım',rating:4};
const portal = {gameId:'portal-2',status:'completed',note:'Bitirdim',rating:5};
const list = {id:'my-puzzles',name:'Bulmacalar',games:['portal-2']};
const loaded = harness.createHarness({html,pathname:'/koleksiyonum',initialRecords:[kenshi,portal],initialLists:[list]});
await new Promise(r=>setTimeout(r,40));
assert.equal(vm.runInContext('state.loaded',loaded.ctx),true);
assert.equal(vm.runInContext('state.tab',loaded.ctx),'library');
assert.equal(loaded.elements.resultCount.textContent,'2 oyun');
assert.equal(loaded.elements.libraryControls.hidden,false);
assert.equal(loaded.elements.catalogStats.hidden,true);
assert(loaded.elements.grid.innerHTML.includes('Kenshi'));
assert(loaded.elements.grid.innerHTML.includes('Portal 2'));
assert(!loaded.elements.grid.innerHTML.includes('AION 2'));
assert(!loaded.requests.some(r=>r.path==='/api/spotlight'),'Personal page does not load daily discovery carousel');
assert.equal(loaded.elements.explore.scrollCalls||0,0,'Collection opens at the top without jumping down the discovery page');
assert(loaded.location.pathname==='/koleksiyonum');
loaded.elements.collectionSelect.value=list.id;loaded.elements.collectionSelect.onchange();
assert.equal(loaded.elements.resultCount.textContent,'1 oyun');
assert(loaded.elements.grid.innerHTML.includes('Portal 2'));
assert(!loaded.elements.grid.innerHTML.includes('Kenshi'));
assert(loaded.location.search.includes('collection=my-puzzles'));
vm.runInContext('detail(nameGame("kenshi"))',loaded.ctx);
assert(loaded.elements.detailContent.innerHTML.includes(kenshi.note));
assert(!loaded.elements.detailContent.innerHTML.includes('YENİ BİR DÜNYAYA BAKIŞ'));
assert(loaded.location.search.includes('game=kenshi'));
loaded.elements.detail.close();
assert.equal(loaded.location.pathname,'/koleksiyonum');
vm.runInContext('mode("discover")',loaded.ctx);
assert.equal(loaded.navigation.at(-1),'/');
assert.equal(vm.runInContext('state.tab',loaded.ctx),'library','Navigation does not rewrite the current page');

const reload = harness.createHarness({html,pathname:'/koleksiyonum',search:'?collection=my-puzzles&game=portal-2',initialRecords:[kenshi,portal],initialLists:[list]});
await new Promise(r=>setTimeout(r,40));
assert.equal(reload.elements.resultCount.textContent,'1 oyun');
assert.equal(vm.runInContext('state.current.id',reload.ctx),'portal-2');
assert(reload.elements.detail.open);
assert.equal(reload.elements.explore.scrollCalls||0,0);

const anonymous = harness.createHarness({html,pathname:'/koleksiyonum',user:null});
await new Promise(r=>setTimeout(r,40));
assert.equal(anonymous.elements.libraryControls.hidden,true);
assert(!anonymous.requests.some(r=>r.path==='/api/library'||r.path==='/api/lists'));
assert(anonymous.elements.notice.textContent.includes('giriş yap'));
vm.runInContext('accountDialog()',anonymous.ctx);
assert(anonymous.elements.accountContent.innerHTML.includes('return_to=%2Fkoleksiyonum'));
assert(anonymous.elements.accountContent.innerHTML.includes('target="_top"'));

const homeHtml = await (await home.GET(new Request('https://test.example/'))).text();
assert(homeHtml.includes('id="spotlight"'));
assert(homeHtml.includes('id="curations"'));
assert(homeHtml.includes('id="mylist" class="nav" href="/koleksiyonum"'));
const root = harness.createHarness({html:homeHtml,search:'?q=Kenshi'});
await new Promise(r=>setTimeout(r,40));
const original = root.elements.grid.innerHTML, originalSearch = root.elements.search.value;
vm.runInContext('mode("library")',root.ctx);
assert.equal(root.navigation.at(-1),'/koleksiyonum');
assert.equal(root.elements.grid.innerHTML,original);
assert.equal(root.elements.search.value,originalSearch);
assert.equal(root.elements.explore.scrollCalls||0,0);
assert(!root.elements.catalogStats.innerHTML.includes('PC ile başlıyoruz'));

const legacy = await home.GET(new Request('https://test.example/?tab=library&collection=my-puzzles&game=kenshi'));
assert.equal(legacy.status,302);
assert.equal(legacy.headers.get('location'),'/koleksiyonum?collection=my-puzzles&game=kenshi');
// Production also serves / from the static HTML; migrate before fetching data.
const legacyStatic = harness.createHarness({html:homeHtml,search:'?tab=library&collection=my-puzzles&game=kenshi'});
await new Promise(r=>setTimeout(r,40));
assert.equal(legacyStatic.navigation.at(-1),'/koleksiyonum?collection=my-puzzles&game=kenshi');
assert.equal(legacyStatic.requests.length,0);
assert.equal(vm.runInContext('state.loaded',legacyStatic.ctx),false);
for (const f of [root,loaded,reload,anonymous,legacyStatic]) vm.runInContext('closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)',f.ctx);
console.log('Passed: separate collection route, native navigation, unchanged discovery filters/grid, direct load and reload, owned collections/notes, game deep links, anonymous sign-in path, no discovery carousel/scroll jump, legacy links and removed slogans.');
