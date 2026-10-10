const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const script=fs.readFileSync('public/discovery.js','utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fixture({dpr=1,width=600,assets={},media={},mediaDelay=0}={}){
 const requested=[],apiCalls=[],stage={clientWidth:width,replaceChildren(image){this.image=image}},cache=new Map();
 class Image {
  set src(src){this._src=src;requested.push(src);const asset=assets[src];setTimeout(()=>{if(this._src!==src)return;this.naturalWidth=asset?.width||0;this.naturalHeight=asset?.height||0;if(asset)this.onload?.();else this.onerror?.();},asset?.delay||0);}
  get src(){return this._src} removeAttribute(){this._src=''}
 }
 const ctx={Image,AbortController,URL,Map,Date,Number,RegExp,Set,setTimeout,clearTimeout,devicePixelRatio:dpr,$:id=>id==='heroIllustration'?stage:null,mediaCache:cache,api:async path=>{apiCalls.push(path);await sleep(mediaDelay);return media},console};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return {ctx,stage,requested,apiCalls,run:expr=>vm.runInContext(expr,ctx)};
}
const game={id:'kenshi',steamAppId:233860,name:'Kenshi',coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/233860/capsule_231x87.jpg'};
const base='https://cdn.akamai.steamstatic.com/steam/apps/233860/',regular=base+'library_hero.jpg',large=base+'library_hero_2x.jpg',screenshot=base+'ss_full.jpg';
(async()=>{
 const before=JSON.stringify(game),mobile=fixture({width:350,assets:{[regular]:{width:1920,height:620}}});mobile.ctx.game=game;
 await mobile.run('mountHeroArtwork(game)');assert.equal(mobile.stage.image.src,regular);assert.equal(mobile.stage.image.alt,'Kenshi tanıtım görseli');assert.equal(mobile.apiCalls.length,0);assert(!mobile.requested.includes(game.coverUrl));
 await mobile.run('mountHeroArtwork(game)');assert.equal(mobile.run('heroArtworkCache.size'),1);assert(mobile.requested.every(src=>src===regular));
 const desktop=fixture({dpr:2,assets:{[large]:{width:3840,height:1240}}});desktop.ctx.game=game;await desktop.run('mountHeroArtwork(game)');assert.equal(desktop.stage.image.src,large);assert.equal(desktop.stage.image.width,3840);
 // A 404 or unexpectedly tiny response is rejected before publication to the stage.
 const fallback=fixture({dpr:2,assets:{[regular]:{width:460,height:215},[screenshot]:{width:1920,height:1080}},media:{steamAppId:233860,items:[{kind:'video',src:screenshot},{kind:'image',src:'https://evil.test/steam/apps/233860/ss.jpg'},{kind:'image',src:base.replace('233860','999')+'ss.jpg'},{kind:'image',src:screenshot}]}});fallback.ctx.game=game;await fallback.run('mountHeroArtwork(game)');assert.equal(fallback.stage.image.src,screenshot);assert.equal(fallback.apiCalls.length,1);assert.equal(fallback.run('mediaCache.size'),1);assert(!fallback.requested.some(url=>url.includes('999')||url.includes('evil.test')));
 const absent=fixture({assets:{[regular]:{width:231,height:87}},media:{steamAppId:233860,items:[]}});absent.ctx.game=game;absent.stage.image={src:'retained-fallback'};await absent.run('mountHeroArtwork(game)');assert.equal(absent.stage.image.src,'retained-fallback');const failedCount=absent.requested.length;await absent.run('mountHeroArtwork(game)');assert.equal(absent.requested.length,failedCount,'Failures are briefly cached, leaving the safe card fallback');
 const second={id:'other',steamAppId:361420,name:'Astroneer'},other='https://cdn.akamai.steamstatic.com/steam/apps/361420/library_hero.jpg';
 const race=fixture({assets:{[regular]:{width:1920,height:620,delay:40},[other]:{width:1920,height:620}}});race.ctx.game=game;race.ctx.second=second;
 const old=race.run('mountHeroArtwork(game)');await sleep(2);await race.run('mountHeroArtwork(second)');await old;await sleep(45);assert.equal(race.stage.image.src,other,'Late image cannot overwrite the newly selected game');
 const pending=fixture({mediaDelay:35,media:{steamAppId:233860,items:[{kind:'image',src:screenshot}]},assets:{[other]:{width:1920,height:620},[screenshot]:{width:1920,height:1080}}});pending.ctx.game=game;pending.ctx.second=second;const delayed=pending.run('mountHeroArtwork(game)');await sleep(10);await pending.run('mountHeroArtwork(second)');await delayed;assert.equal(pending.stage.image.src,other);assert(!pending.requested.includes(screenshot));
 assert.equal(mobile.run('heroAssetUrl("https://cdn.akamai.steamstatic.com/steam/apps/2338600/test.jpg",233860)'), '');
 assert.equal(mobile.run('heroAssetUrl("https://user:pass@cdn.akamai.steamstatic.com/steam/apps/233860/test.jpg",233860)'), '');
 const wrong=fixture({media:{steamAppId:999,items:[{kind:'image',src:screenshot}]}});wrong.ctx.game=game;await wrong.run('mountHeroArtwork(game)');assert(!wrong.requested.includes(screenshot));
 mobile.run('for(let i=0;i<100;i++)cacheHeroArtwork(String(i),"https://example.test");');assert.equal(mobile.run('heroArtworkCache.size'),60);
 assert.equal(JSON.stringify(game),before,'No catalogue, score, cover or media field is mutated');
 console.log('Passed: separate hero/card source, responsive resolution, dimensions, missing/small assets, exact AppID and safe host, screenshot fallback, bounded cache, aborted images/media and stale slide protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
