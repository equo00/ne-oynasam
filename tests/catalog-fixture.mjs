import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

// SQLite executes the actual production statements, rather than matching SQL
// strings in a mock. The D1 shape includes changes for bootstrap lease checks.
export function createCatalogFixture(filename=':memory:') {
 const sqlite=new DatabaseSync(filename),queries=[];
 for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
 class Statement {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async all(){queries.push({sql:this.sql,args:this.args});return {results:sqlite.prepare(this.sql).all(...this.args),success:true,meta:{changes:0}};}
  async first(column){queries.push({sql:this.sql,args:this.args});const row=sqlite.prepare(this.sql).get(...this.args)||null;return column?row?.[column]??null:row;}
  async run(){queries.push({sql:this.sql,args:this.args});const stmt=sqlite.prepare(this.sql);if(stmt.columns().length)return {results:stmt.all(...this.args),success:true,meta:{changes:0}};const r=stmt.run(...this.args);return {results:[],success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
  async raw(){return (await this.all()).results.map(row=>Object.values(row));}
 }
 const database={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},exec:async sql=>{sqlite.exec(sql);return {count:1,duration:0};}};
 globalThis.testDb=database;
 return {sqlite,database,queries,clearQueries(){queries.length=0;},close(){sqlite.close();}};
}

let build;
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'neoynasam-catalog-tests-'));
let sequence=0;
export async function moduleFor(file,{auth=false}={}) {
 if(!build){const pkg=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));({build}=await import(pathToFileURL(path.resolve('node_modules/.pnpm',pkg,'node_modules/esbuild/lib/main.js'))));}
 const dest=path.join(temporary,sequence+++'-'+file.replaceAll('/','-')+'.mjs');
 const plugin={name:'actual-sqlite-d1',setup(b){b.onResolve({filter:/cloudflare:workers/},()=>({path:'env',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env={DB:globalThis.testDb};',loader:'js'}));if(auth){b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'mock-auth'}));b.onLoad({filter:/.*/,namespace:'mock-auth'},()=>({contents:'export async function getChatGPTUser(){return globalThis.testUser||null;}',loader:'js'}));}}};
 await build({entryPoints:[file],outfile:dest,bundle:true,platform:'node',format:'esm',plugins:[plugin]});
 return import(pathToFileURL(dest));
}

export async function readyCatalog(repository,{maxAttempts=200}={}) {
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const result=await repository.ensureCatalogReady(globalThis.testDb);
  if(result===true||result?.ready===true)return result;
 }
 throw new Error('Catalog bootstrap did not finish within bounded test attempts.');
}
