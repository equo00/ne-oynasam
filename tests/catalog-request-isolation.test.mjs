import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createCatalogFixture,moduleFor} from './catalog-fixture.mjs';

// Simulate a canceled invocation whose D1 operation never settles. A later
// invocation must use its own I/O; the database lease still protects writes.
async function check(file,method,id,processed){
 const fixture=createCatalogFixture(),database=fixture.database;
 fixture.sqlite.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'done',?,?,?)").run(id,String(processed),processed,'2026-10-08');
 if(method==='ensureMetacriticScores'){const input=JSON.parse(fs.readFileSync('data/metacritic-direct-score-updates.json','utf8')),count=input.changes.length;if(count)fixture.sqlite.prepare("INSERT INTO catalog_bootstrap(id,stage,cursor,processed,updated_at) VALUES(?,'done',?,?,?)").run('metacritic-direct-'+createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0,24),String(count),count,'2026-10-08');processed+=count;}
 const module=await moduleFor(file),prepare=database.prepare;
 let release,entered,held=false;
 const blocked=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 const wrap=statement=>new Proxy(statement,{get(target,key){
  if(key==='bind')return (...args)=>wrap(target.bind(...args));
  if(key==='run'||key==='first')return async(...args)=>{if(!held){held=true;entered();await blocked;}return target[key](...args);};
  const value=target[key];return typeof value==='function'?value.bind(target):value;
 }});
 database.prepare=sql=>wrap(prepare(sql));
 const first=module[method](database);await started;
 let timer;
 try{
  const second=await Promise.race([module[method](database),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(method+' waited on another request')),250))]);
  assert.equal(second.ready,true);assert.equal(second.processed,processed);
 }finally{clearTimeout(timer);release();await first;fixture.close();}
}
await check('lib/catalog-bootstrap.ts','ensureCatalogReady','catalog-v2-seed-20261007',1326);
await check('lib/metacritic-sync.ts','ensureMetacriticScores','metacritic-pc-c79f2902c2572df89da9146f',686);
console.log('Passed: canceled catalog and score import invocations cannot block a subsequent request.');
