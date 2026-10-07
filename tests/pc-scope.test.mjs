import vm from 'node:vm';
import assert from 'node:assert/strict';
import harness from './frontend-harness.cjs';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';

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

await vm.runInContext('clear()',h.ctx);
h.ctx.FormData=class {constructor(form){this.form=form}get(key){return this.form[key]??null}};
await h.elements.quizForm.onsubmit({preventDefault(){},target:{mood:'',system:'macOS',era:''}});
assert.equal(h.elements.system.value,'macOS');
assert(vm.runInContext('filtered().length>0&&filtered().every(g=>g.platforms.includes("PC")&&g.pcSystems.includes("macOS"))',h.ctx));
assert(h.location.search.includes('system=macOS'));
assert(!h.location.search.includes('platform='));
assert(h.elements.notice.textContent.includes('PC işletim sistemi'));

const score={metric:'user-score',platform:'PC',score:8.6};
h.ctx.pcFixture={id:'pc-fixture',name:'Fixture',steamAppId:99990001,platforms:['PC','PlayStation'],genres:[],pcSystems:['Windows'],metacriticUser:score};
for(const platform of ['PlayStation','Android']){
 h.ctx.pcFixture.metacriticUser={...score,platform};
 assert.equal(vm.runInContext('userScore(pcFixture)',h.ctx),null);
 assert(!vm.runInContext('scoreBadge(pcFixture)',h.ctx).includes('8,6'));
}
h.ctx.pcFixture.metacriticUser={...score,platform:null};
assert.equal(vm.runInContext('scoreText(pcFixture)',h.ctx),'8,6/10');
assert(vm.runInContext('scoreRecordText(pcFixture)',h.ctx).includes('Platform belirtilmemiş'));
assert(!vm.runInContext('scoreBadge(pcFixture)',h.ctx).includes('· PC'));
h.ctx.pcFixture.metacriticUser=score;
assert.equal(vm.runInContext('scoreText(pcFixture)',h.ctx),'8,6/10');
assert(!vm.runInContext('card(pcFixture)',h.ctx).includes('PlayStation'));
await vm.runInContext('clear()',h.ctx);vm.runInContext('rememberGames([{...pcFixture,url:"https://store.playstation.com/another-edition"}]);detail(nameGame("pc-fixture"))',h.ctx);
assert(h.elements.detailContent.innerHTML.includes('DİĞER PLATFORMLAR · BİLGİ'));
assert(h.elements.detailContent.innerHTML.includes('PlayStation'));
assert(h.elements.detailContent.innerHTML.includes('https://store.steampowered.com/app/99990001/'));
assert(!h.elements.detailContent.innerHTML.includes('https://store.playstation.com/'));
await vm.runInContext('state.compare=new Set(["pc-fixture","kenshi"]);showCompare()',h.ctx);
assert(h.elements.compareContent.innerHTML.includes('Metacritic kullanıcı'));
assert(!h.elements.compareContent.innerHTML.includes('PlayStation'));
h.ctx.pcFixture.platforms=['PlayStation'];
assert.equal(vm.runInContext('userScore(pcFixture)',h.ctx),null);
assert.equal(vm.runInContext('relatedRecommendations(pcFixture).length',h.ctx),0);
assert(vm.runInContext('relatedGames(nameGame("kenshi")).every(g=>g.platforms.includes("PC"))',h.ctx));

// Execute the real migration/bootstrap and production SQL repository.
const fixture=createCatalogFixture();
const bootstrap=await moduleFor('lib/catalog-bootstrap.ts');
await readyCatalog(bootstrap);
const {catalog}=await moduleFor('lib/catalog.ts');
const {gamesByIds}=await moduleFor('lib/catalog-repository.ts');
const c=await catalog();
assert.equal(c.total,h.source.length);
assert.equal(c.games.length,24,'Compatibility facade returns a bounded catalog page');
assert.equal(c.catalogStats.games,h.source.length);
assert.equal(c.catalogStats.scores,901);
assert(c.games.every(g=>g.platforms.includes('PC')));
const counts=fixture.sqlite.prepare(`SELECT COUNT(*) AS scores,
 SUM(CASE WHEN score_platform IS NULL THEN 1 ELSE 0 END) AS unspecified,
 SUM(CASE WHEN score_platform IS NOT NULL AND score_platform <> 'PC' THEN 1 ELSE 0 END) AS foreign_platform,
 SUM(CASE WHEN json_extract(payload,'$.metacriticUser.metric')='user-score' THEN 1 ELSE 0 END) AS user_scores
 FROM catalog_games WHERE status='published' AND score_value IS NOT NULL`).get();
assert.equal(counts.scores,901,'All historical source score rows survive normalization');
assert.equal(counts.unspecified,881);
assert.equal(counts.foreign_platform,0);
assert.equal(counts.user_scores,901);
assert.equal(fixture.sqlite.prepare(`SELECT COUNT(*) AS n FROM catalog_games g
 WHERE g.status='published' AND NOT EXISTS(SELECT 1 FROM catalog_game_platforms p WHERE p.game_id=g.id AND p.platform='PC')`).get().n,0,'Every published game belongs to PC scope');
const unspecified=h.source.find(g=>h.scoreData[h.scoreIdentities[g.id]?.scoreRecordId]?.platform===null);
assert(unspecified);
const [record]=await gamesByIds([unspecified.id]);
assert.equal(record.metacriticUser.score,h.scoreData[h.scoreIdentities[unspecified.id].scoreRecordId].score);
assert.equal(record.metacriticUser.platform,null,'Unknown platform records are preserved and accurately labeled');
assert.equal(record.metacriticUser.metric,'user-score');
assert.equal(h.scoreData[h.scoreIdentities[unspecified.id].scoreRecordId].platform,null,'Original source records remain intact');
fixture.close();
vm.runInContext('closeMedia();stopSpotlight();clearTimeout(spotlightRefreshTimer)',h.ctx);
console.log('Passed: obsolete platform URL compatibility, OS quiz/filter, preserved source scores and comparison, PC store URL, auxiliary platform details, recommendation scope and actual server catalog.');
