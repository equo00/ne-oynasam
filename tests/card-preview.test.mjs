import {strict as assert} from 'node:assert';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';
const fixture=createCatalogFixture();await readyCatalog(await moduleFor('lib/catalog-bootstrap.ts'));
const {previewCandidates,validPreview,cardPreviewForGame}=await moduleFor('lib/card-preview.ts');
const clip={filename:'233860/196167/94e2c70a95fc0e7528cd3585f10dfad63735e35a/1750491260/microtrailer.mp4',type:'video/mp4'};
const item={item_type:0,id:233860,appid:233860,success:1,visible:true,type:0,name:'Kenshi',trailers:{highlights:[{microtrailer:[clip]}]}};
const input=()=>({response:{store_items:[structuredClone(item)]}});
const candidates=previewCandidates(input(),233860,'Kenshi');
assert.equal(candidates.length,1);assert(validPreview(candidates[0],233860));assert(!validPreview(candidates[0],1));
assert(!validPreview({...candidates[0],src:candidates[0].src.replace('https://','https://user:pass@')},233860));
assert(!validPreview({...candidates[0],src:candidates[0].src.replace('microtrailer.mp4','trailer.mp4')},233860));
assert(!validPreview({...candidates[0],src:candidates[0].src.replace('video.akamai.steamstatic.com','evil.example')},233860));
for(const field of ['id','appid']){const wrong=input();wrong.response.store_items[0][field]=1;assert.throws(()=>previewCandidates(wrong,233860,'Kenshi'));}
assert.throws(()=>previewCandidates(input(),233860,'Other game'));
const none=input();none.response.store_items[0].trailers.highlights[0].microtrailer=[];assert.equal(previewCandidates(none,233860,'Kenshi').length,0);
for(const filename of [clip.filename.replace('233860/','1/'),'https://evil.example/microtrailer.mp4',clip.filename.replace('microtrailer.mp4','hls_master.m3u8'),clip.filename.replace('196167','../196167')]){
 const bad=input();bad.response.store_items[0].trailers.highlights[0].microtrailer[0].filename=filename;assert.equal(previewCandidates(bad,233860,'Kenshi').length,0);
}
await assert.rejects(()=>cardPreviewForGame('missing-game'));
const before=fixture.sqlite.prepare('SELECT * FROM catalog_media ORDER BY game_id,media_id').all();
fixture.sqlite.prepare('INSERT INTO library(user_id,game_id,status,note,rating,updated_at) VALUES(?,?,?,?,?,?)').run('preview-user','kenshi','playing','Notum',5,'now');
let reads=0,heads=0,mode='ok';
globalThis.fetch=async(url,options={})=>{
 if(options.method==='HEAD'){heads++;assert.equal(url,candidates[0].src);assert.equal(options.redirect,'error');if(mode==='cdn-fail')return new Response(null,{status:404});return new Response(null,{headers:{'content-type':'video/mp4','content-length':'2848931'}});}
 reads++;const request=JSON.parse(new URL(url).searchParams.get('input_json'));assert.deepEqual(request.ids,[{appid:233860}]);
 if(mode==='offline')throw Error('Offline');
 if(mode==='none')return Response.json(none);
 return Response.json(input());
};
let result=await cardPreviewForGame('kenshi');assert.deepEqual(result.preview,candidates[0]);assert.equal(reads,1);assert.equal(heads,1);
assert.deepEqual(await cardPreviewForGame('kenshi'),result);assert.equal(reads,1,'Persistent metadata cache avoids another upstream call');
assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM catalog_media ORDER BY game_id,media_id').all(),before,'Preview fetch cannot replace covers, gallery or manual media');
assert.equal(fixture.sqlite.prepare('SELECT note,rating FROM library WHERE user_id=?').get('preview-user').note,'Notum');
const key='card-preview-v1:233860';
fixture.sqlite.prepare('UPDATE catalog_cache SET payload=? WHERE id=?').run(JSON.stringify({...result,fetchedAt:'2020-01-01'}),key);
mode='offline';assert.equal((await cardPreviewForGame('kenshi')).stale,true);
fixture.sqlite.prepare('DELETE FROM catalog_cache WHERE id=?').run(key);mode='cdn-fail';
await assert.rejects(()=>cardPreviewForGame('kenshi'));assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_cache WHERE id=?').get(key).n,0,'Unavailable CDN is not recorded as absent media');
mode='none';result=await cardPreviewForGame('kenshi');assert.equal(result.preview,null);const beforeNegative=reads;await cardPreviewForGame('kenshi');assert.equal(reads,beforeNegative,'Missing short clips are cached without substituting full trailers');
await assert.rejects(()=>cardPreviewForGame('invalid/id'));
const route=await moduleFor('app/api/preview/route.ts');assert.equal((await route.GET(new Request('https://test.example/api/preview?gameId=not-real'))).status,404);
fixture.close();console.log('Passed: authoritative microtrailer identity, strict clip/CDN validation, availability HEAD, cached/missing/stale media, source failure, no full-trailer substitution and preserved covers/gallery/library.');
