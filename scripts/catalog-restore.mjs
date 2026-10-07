import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {argumentsFor,localFile,verifyManifest,validateSnapshot,writeSnapshot} from './catalog-snapshot.mjs';
try{
 const args=argumentsFor(process.argv.slice(2)),database=localFile(args.database),snapshot=localFile(args.backup);if(database===snapshot)throw new Error('Yedek ve hedef dosya aynı olamaz.');if(!fs.existsSync(snapshot))throw new Error('Yedek dosyası bulunamadı.');const manifestPath=snapshot+'.manifest.json',manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):null;const verified=await verifyManifest(snapshot,manifest);
 if(!args.apply||args['dry-run'])console.log(JSON.stringify({dryRun:true,restoreFrom:snapshot,target:database,integrity:verified.integrity,tables:verified.tables}));
 else{
  if(fs.existsSync(database+'-wal')||fs.existsSync(database+'-shm'))throw new Error('Hedef SQLite kullanılıyor olabilir. Yerel uygulamayı kapat ve WAL bağlantılarını temiz kapat.');
  const rollback=database+'.before-restore-'+new Date().toISOString().replaceAll(':','-')+'-'+crypto.randomUUID()+'.sqlite';if(fs.existsSync(database))await writeSnapshot(database,rollback);
  fs.mkdirSync(path.dirname(database),{recursive:true});const temp=database+'.restoring-'+crypto.randomUUID(),source=new DatabaseSync(snapshot,{readOnly:true});try{await backup(source,temp);const actual=await validateSnapshot(temp);if(JSON.stringify(actual.tables)!==JSON.stringify(verified.tables))throw new Error('Geri yüklenen tablo adetleri yedekle uyuşmuyor.');fs.renameSync(temp,database);console.log(JSON.stringify({restored:true,database,rollbackBackup:fs.existsSync(rollback)?rollback:null,integrity:actual.integrity,tables:actual.tables}));}finally{source.close();if(fs.existsSync(temp))fs.unlinkSync(temp);}
 }
}catch(error){console.error(error.message);process.exitCode=1;}
