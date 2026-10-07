import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import harness from './frontend-harness.cjs';

const h=harness.createHarness({search:'?platform=PlayStation&q=Kenshi&sort=name&custom=keep'});
await new Promise(r=>setTimeout(r,40));
assert.equal(vm.runInContext('state.loaded',h.ctx),true);
assert.equal(h.elements.platform,undefined);
assert.equal(h.elements.quizPlatform,undefined);
assert.equal(h.elements.resultCount.textContent,'1 oyun');
assert(!h.location.search.includes('platform='));
assert(h.location.search.includes('q=Kenshi')&&h.location.search.includes('custom=keep'));
assert(!h.elements.grid.innerHTML.includes('PC + diğerleri'));
assert.deepEqual(h.elements.quizSystem.options.map(o=>o.value),['','Windows','macOS','Linux']);

vm.runInContext('clear()',h.ctx);
h.ctx.FormData=class {constructor(form){this.form=form}get(key){return this.form[key]??null}};
h.elements.quizForm.onsubmit({preventDefault(){},target:{mood:'',system:'macOS',era:''}});
assert.equal(h.elements.system.value,'macOS');
assert(vm.runInContext('filtered().length>0&&filtered().every(g=>g.platforms.includes("PC")&&g.pcSystems.includes("macOS"))',h.ctx));
assert(h.location.search.includes('system=macOS'));
assert(!h.location.search.includes('platform='));
assert(h.elements.notice.textContent.includes('PC işletim sistemi'));

const score={metric:'user-score',platform:'PC',score:8.6};
h.ctx.pcFixture={id:'pc-fixture',name:'Fixture',steamAppId:99990001,platforms:['PC','PlayStation'],genres:[],pcSystems:['Windows'],metacriticUser:score};
for(const platform of [null,'PlayStation','Android']){
 h.ctx.pcFixture.metacriticUser={...score,platform};
 assert.equal(vm.runInContext('userScore(pcFixture)',h.ctx),null);
 assert(!vm.runInContext('scoreBadge(pcFixture)',h.ctx).includes('8,6'));
}
h.ctx.pcFixture.metacriticUser=score;
assert.equal(vm.runInContext('scoreText(pcFixture)',h.ctx),'8,6/10');
assert(!vm.runInContext('card(pcFixture)',h.ctx).includes('PlayStation'));
vm.runInContext('clear();state.games.push({...pcFixture,url:"https://store.playstation.com/another-edition"});detail(nameGame("pc-fixture"))',h.ctx);
assert(h.elements.detailContent.innerHTML.includes('DİĞER PLATFORMLAR · BİLGİ'));
assert(h.elements.detailContent.innerHTML.includes('PlayStation'));
assert(h.elements.detailContent.innerHTML.includes('https://store.steampowered.com/app/99990001/'));
assert(!h.elements.detailContent.innerHTML.includes('https://store.playstation.com/'));
vm.runInContext('state.compare=new Set(["pc-fixture","kenshi"]);showCompare()',h.ctx);
assert(h.elements.compareContent.innerHTML.includes('Metacritic kullanıcı · PC'));
assert(!h.elements.compareContent.innerHTML.includes('PlayStation'));
h.ctx.pcFixture.platforms=['PlayStation'];
assert.equal(vm.runInContext('userScore(pcFixture)',h.ctx),null);
assert.equal(vm.runInContext('relatedRecommendations(pcFixture).length',h.ctx),0);
assert(vm.runInContext('relatedGames(nameGame("kenshi")).every(g=>g.platforms.includes("PC"))',h.ctx));

// Inspect the actual server catalog, not just the browser's score guard.
globalThis.pcScopeDb={prepare(){return {bind(){return this},async all(){return {results:[]}},async first(){return null}}}};
const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js')));
const dest='/tmp/neoynasam-pc-scope-catalog.mjs';
await build({entryPoints:['lib/catalog.ts'],outfile:dest,bundle:true,platform:'node',format:'esm',plugins:[{name:'pc-test-env',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={DB:globalThis.pcScopeDb};',loader:'js'}));}}]});
const {catalog}=await import(pathToFileURL(dest));
const c=await catalog();
assert.equal(c.games.length,h.source.length);
assert(c.games.every(g=>g.platforms.includes('PC')));
const verified=c.games.filter(g=>g.metacriticUser);
assert(verified.length>0&&verified.length<c.games.length);
assert(verified.every(g=>g.metacriticUser.platform==='PC'&&g.metacriticUser.metric==='user-score'));
const unspecified=h.source.find(g=>h.scoreData[h.scoreIdentities[g.id]?.scoreRecordId]?.platform===null);
assert(unspecified);
assert.equal(c.games.find(g=>g.id===unspecified.id).metacriticUser,null);
assert.equal(h.scoreData[h.scoreIdentities[unspecified.id].scoreRecordId].platform,null,'Original source records remain intact');
vm.runInContext('closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)',h.ctx);
console.log('Passed: obsolete platform URL compatibility, OS quiz/filter, PC-only score display and comparison, PC store URL, auxiliary platform details, recommendation scope and actual server catalog.');
