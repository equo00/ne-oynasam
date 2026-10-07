import fs from 'node:fs';
import {argumentsFor,localFile,writeSnapshot} from './catalog-snapshot.mjs';
try{const args=argumentsFor(process.argv.slice(2));const database=localFile(args.database),output=localFile(args.output);if(!fs.existsSync(database))throw new Error('Kaynak SQLite dosyası bulunamadı.');const result=await writeSnapshot(database,output);console.log(JSON.stringify({backup:output,manifest:output+'.manifest.json',integrity:result.integrity,tables:result.tables}));}catch(error){console.error(error.message);process.exitCode=1;}
