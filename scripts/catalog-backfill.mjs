// Offline development/restore helper. Production migrations remain the hosting provider's responsibility.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {argumentsFor,localFile,writeSnapshot} from './catalog-snapshot.mjs';
let sqlite,temp;
try{
 const args=argumentsFor(process.argv.slice(2)),file=localFile(args.database);if(!fs.existsSync(file))throw new Error('Geçişleri uygulanmış yerel SQLite dosyası gerekli.');const maxChunks=Math.max(1,Math.min(100,Number(args['max-chunks']||10)));if(!Number.isInteger(maxChunks))throw new Error('max-chunks tam sayı olmalı.');
 const rollback=file+'.before-backfill-'+Date.now()+'.sqlite';await writeSnapshot(file,rollback);sqlite=new DatabaseSync(file);if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_bootstrap'").get())throw new Error('Yeni Drizzle geçişleri önce uygulanmalı. Bu komut şema oluşturmaz.');
 class Statement{constructor(sql,params=[]){this.sql=sql;this.params=params;}bind(...params){return new Statement(this.sql,params);}async all(){return {results:sqlite.prepare(this.sql).all(...this.params)};}async first(){return sqlite.prepare(this.sql).get(...this.params)||null;}async run(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{results:statement.all(...this.params)}:statement.run(...this.params);}}
 globalThis.neOynasamLocalCatalogDb={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));const {build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js')));temp=fs.mkdtempSync(path.join(os.tmpdir(),'neoynasam-backfill-'));const target=path.join(temp,'bootstrap.mjs');await build({entryPoints:['lib/catalog-bootstrap.ts'],outfile:target,bundle:true,platform:'node',format:'esm',plugins:[{name:'offline-catalog',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'local'}));b.onLoad({filter:/.*/,namespace:'local'},()=>({contents:'export const env={DB:globalThis.neOynasamLocalCatalogDb};',loader:'js'}));}}]});const {ensureCatalogReady}=await import(pathToFileURL(target));let result;for(let i=0;i<maxChunks;i++){result=await ensureCatalogReady(globalThis.neOynasamLocalCatalogDb);if(result.ready)break;}console.log(JSON.stringify({database:file,rollbackBackup:rollback,...result}));
}catch(error){console.error(error.message);process.exitCode=1;}finally{sqlite?.close();if(temp)fs.rmSync(temp,{recursive:true});delete globalThis.neOynasamLocalCatalogDb;}
