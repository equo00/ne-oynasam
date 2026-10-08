import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {strict as assert} from 'node:assert';
import {createCatalogFixture,moduleFor,readyCatalog} from './catalog-fixture.mjs';

// This measures real indexed SQLite queries against synthetic data, not source
// availability, Cloudflare network latency, or a promise to import 140k games.
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'neoynasam-capacity-'));
const filename=path.join(directory,'catalog.sqlite');
const fixture=createCatalogFixture(filename);
try{
 const bootstrap=await moduleFor('lib/catalog-bootstrap.ts');
 await readyCatalog(bootstrap);
 // Finish the real catalog's score migration before replacing its identities
 // with synthetic ones; source updates must never target synthetic games.
 const scores=await moduleFor('lib/metacritic-sync.ts');
 let scoreState;
 do{scoreState=await scores.ensureMetacriticScores(fixture.database);}while(!scoreState.ready);
 const count=140000,sqlite=fixture.sqlite,start=performance.now();
 sqlite.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; BEGIN;');
 for(const table of ['catalog_game_tags','catalog_game_genres','catalog_game_systems','catalog_game_platforms','catalog_search_terms','catalog_source_ids','catalog_editions','catalog_scores','catalog_media','catalog_overrides','catalog_games','catalog_tags','catalog_genres'])sqlite.exec('DELETE FROM '+table);
 const gameInsert=sqlite.prepare('INSERT INTO catalog_games(id,status,name,name_search,year,steam_app_id,studio,payload,base_payload,content_hash,score_value,score_count,score_date,score_platform,catalog_added_at,sort_order,revision,source_priority,updated_at,mood,steam_positive_percent,has_turkish,has_coop,cover_present) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 const tagInsert=sqlite.prepare('INSERT INTO catalog_game_tags(game_id,tag_id,weight,rank) VALUES(?,?,?,?)');
 const genreInsert=sqlite.prepare('INSERT INTO catalog_game_genres(game_id,genre_id) VALUES(?,?)');
 const systemInsert=sqlite.prepare('INSERT INTO catalog_game_systems(game_id,system) VALUES(?,?)');
 const platformInsert=sqlite.prepare('INSERT INTO catalog_game_platforms(game_id,platform) VALUES(?,?)');
 const tokenInsert=sqlite.prepare('INSERT INTO catalog_search_terms(token,game_id) VALUES(?,?)');
 const editionInsert=sqlite.prepare('INSERT INTO catalog_editions(id,game_id,edition_key,platform,payload) VALUES(?,?,?,?,?)');
 const sourceInsert=sqlite.prepare('INSERT INTO catalog_source_ids(source,external_id,game_id,edition_id,source_url,retrieved_at) VALUES(?,?,?,?,?,?)');
 for(let n=0;n<1000;n++)sqlite.prepare('INSERT INTO catalog_tags(id,name,label) VALUES(?,?,?)').run(1000+n,'Synthetic tag '+n,'Etiket '+n);
 for(const name of ['Aksiyon','Korku','RPG','Strateji'])sqlite.prepare('INSERT INTO catalog_genres(id,name) VALUES(?,?)').run(name,name);
 const stamp='2026-10-07T19:00:00.000Z';
 for(let n=0;n<count;n++){
  const id='capacity-'+String(n).padStart(6,'0'),steamAppId=20000000+n,name='Capacity adventure '+String(n).padStart(6,'0'),year=1980+n%47,mood=['relax','world','challenge','story','think'][n%5];
  const tags=Array.from({length:20},(_,rank)=>({id:1000+(n*31+rank*7)%1000,name:'Synthetic tag '+((n*31+rank*7)%1000),count:1000-rank*5}));
  const genres=n%3?['Aksiyon','Korku']:['RPG','Strateji'];
  const score=n%5===0?null:{recordId:'capacity-score-'+n,metric:'user-score',score:(n%101)/10,platform:n%7?'PC':null,scoreDate:stamp,userRatings:n%7?n%10000:null,sourceUrl:'https://example.test/scores/'+n};
  const payload={id,steamAppId,name,year,genres,platforms:['PC'],pcSystems:['Windows',...(n%5===0?['Linux']:[])],studio:'Capacity Studio '+n%17,mood,coverUrl:'https://shared.akamai.steamstatic.com/steam/apps/'+steamAppId+'/header.jpg',sourceUrl:'https://example.test/source/'+n,sourceRetrievedAt:stamp,catalogAddedAt:stamp,sourceType:'game',catalogScope:'published',steamTags:{steamAppId,identityTitle:name,tags,sourceKind:'steam-store',retrievedAt:stamp},metacriticUser:score,discoveryHook:'A distinct synthetic adventure used solely to measure database and payload bounds.',discoveryBody:'Exploration, choices and a changing world. '.repeat(12),hasTurkish:n%8===0,hasCoop:n%4===0};
  gameInsert.run(id,'published',name,name.toLowerCase(),year,steamAppId,payload.studio,JSON.stringify(payload),JSON.stringify(payload),'synthetic-'+n,score?.score??null,score?.userRatings??null,score?.scoreDate??null,score?.platform??null,stamp,n,1,10,stamp,mood,n%101,payload.hasTurkish?1:0,payload.hasCoop?1:0,1);
  for(const [rank,t]of tags.entries())tagInsert.run(id,t.id,t.count,rank);
  for(const g of genres)genreInsert.run(id,g);
  systemInsert.run(id,'Windows');if(n%5===0)systemInsert.run(id,'Linux');
  platformInsert.run(id,'PC');
  for(const token of ['capacity','adventure',String(n).padStart(6,'0'),'studio',...genres.map(g=>g.toLocaleLowerCase('tr').replace('ı','i'))])tokenInsert.run(token,id);
  const edition=id+':pc';editionInsert.run(edition,id,'pc','PC',JSON.stringify({edition:'PC',gameId:id}));
  sourceInsert.run('steam',String(steamAppId),id,edition,'https://store.steampowered.com/app/'+steamAppId+'/',stamp);
  sourceInsert.run('synthetic',String(n),id,edition,'https://example.test/source/'+n,stamp);
 }
 sqlite.exec("UPDATE catalog_tags SET game_count=(SELECT COUNT(*) FROM catalog_game_tags gt WHERE gt.tag_id=catalog_tags.id); COMMIT; ANALYZE;");
 const insertMs=performance.now()-start,repository=await moduleFor('lib/catalog-repository.ts');
 repository.invalidateCatalogMetadata();
 const patterns=[
  ['first page',{}],['deep page',{page:5000}],['score',{rating:8,sort:'rating'}],['latest',{sort:'new'}],['name',{sort:'name'}],['exact prefix',{q:'capacity adventure 139999'}],['common prefix',{q:'capacity'}],['AND genres/tags',{genres:['Aksiyon','Korku'],tags:[1000,1007],system:'Windows'}],['mood',{mood:'world'}]
 ];
 const timings=[],payloads=[];
 for(const [label,query]of patterns){
  for(let run=0;run<3;run++){
   const started=performance.now(),result=await repository.queryCatalog(query),ms=performance.now()-started,bytes=Buffer.byteLength(JSON.stringify(result));
   timings.push({label,ms:Math.round(ms*100)/100,total:result.total});payloads.push(bytes);
   assert.equal(result.catalogStats.games,count);
   assert(result.games.length<=24);
   assert(bytes<200000,'Default page plus metadata remains bounded below 200 KB at 140k games');
   assert(ms<3000,'Local SQLite query exceeds the 3-second diagnostic budget');
   if(label==='exact prefix')assert.equal(result.total,1);
  }
 }
 fixture.clearQueries();
 const detail=await repository.gamesByIds(['capacity-139999']);
 assert.equal(detail.length,1);
 assert(fixture.queries.filter(x=>/SELECT.*payload/i.test(x.sql)).every(x=>/\bIN\s*\(/i.test(x.sql)));
 const plans={};
 for(const [label,sql,args]of [['discovery','SELECT id FROM catalog_games WHERE status=? ORDER BY sort_order,id LIMIT 24',['published']],['word prefix','SELECT game_id FROM catalog_search_terms WHERE token>=? AND token<?',['139999','139999\uffff']],['tag','SELECT game_id FROM catalog_game_tags WHERE tag_id=?',[1000]],['identity','SELECT game_id FROM catalog_source_ids WHERE source=? AND external_id=?',['steam','20139999']]]){
  const plan=sqlite.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(x=>x.detail);plans[label]=plan;
  assert(plan.some(x=>/USING (COVERING )?INDEX|USING INTEGER PRIMARY KEY/.test(x)),label+' must use an index');
 }
 const {localRelatedForGame}=await moduleFor('lib/related.ts'),related=[];
 let target=(await repository.gamesByIds(['capacity-000000']))[0],started=performance.now();
 const ordinary=await localRelatedForGame(target,fixture.database);
 related.push({case:'varied-20-tags',ms:Math.round((performance.now()-started)*100)/100,results:ordinary.length});
 assert.equal(ordinary.length,20);
 // Worst candidate breadth: all 140k records share two specific tags, while
 // retaining 18 varying tags. The algorithm must rank all, not truncate IDs.
 sqlite.exec('BEGIN; DELETE FROM catalog_game_tags WHERE rank>=18;');
 for(const id of [9000001,9000002]){
  sqlite.prepare('INSERT INTO catalog_tags(id,name,label,game_count) VALUES(?,?,?,?)').run(id,'Broad tag '+id,'Geniş etiket '+id,count);
  sqlite.prepare('INSERT INTO catalog_game_tags(game_id,tag_id,weight,rank) SELECT id,?,?,? FROM catalog_games').run(id,id===9000001?910:905,id===9000001?18:19);
 }
 sqlite.exec("UPDATE catalog_games SET payload=json_set(payload,'$.steamTags.tags[18].id',9000001,'$.steamTags.tags[19].id',9000002); UPDATE catalog_tags SET game_count=(SELECT COUNT(*) FROM catalog_game_tags gt WHERE gt.tag_id=catalog_tags.id); COMMIT; ANALYZE;");
 target=(await repository.gamesByIds(['capacity-000000']))[0];fixture.clearQueries();started=performance.now();
 const broad=await localRelatedForGame(target,fixture.database);
 const broadMs=performance.now()-started;
 related.push({case:'all-140k-share-two-specific-tags',ms:Math.round(broadMs*100)/100,results:broad.length});
 assert.equal(broad.length,20);
 assert(fixture.queries.filter(x=>/SELECT[^;]*g\.payload/i.test(x.sql)).every(x=>/\bIN\s*\(/i.test(x.sql)),'Even broad related ranking must hydrate only final20 payloads');
 const sorted=timings.map(x=>x.ms).sort((a,b)=>a-b);
 const report={test:'synthetic-140k-indexed-catalog',games:count,tagRelations:count*20,sourceMappings:count*2,insertMs:Math.round(insertMs),sqliteBytes:fs.statSync(filename).size,maxPayloadBytes:Math.max(...payloads),medianQueryMs:sorted[Math.floor(sorted.length/2)],p95QueryMs:sorted[Math.floor(sorted.length*.95)],timings,related,plans,diagnosticBudgets:{defaultPagePayloadBytes:200000,queryMs:3000,broadRelatedMs:30000},limits:'Yalnızca yerel SQLite ve sentetik veri ölçümüdür. Canlı gecikmeyi, D1 kotasını/depolamayı, kaynak kapsamını veya 140 bin yayımlanmış oyunu doğrulamaz.'};
 if(process.env.CATALOG_CAPACITY_REPORT)fs.writeFileSync(process.env.CATALOG_CAPACITY_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 assert(broadMs<30000,'Worst-breadth local fallback exceeds diagnostic 30-second budget: '+Math.round(broadMs)+'ms');
}finally{fixture.close();fs.rmSync(directory,{recursive:true,force:true});}
