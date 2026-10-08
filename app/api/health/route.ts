import {db} from '../../../lib/db';
import {ensureCatalogReady} from '../../../lib/catalog-bootstrap';
import {ensureMetacriticScores} from '../../../lib/metacritic-sync';
import {metadataForQids} from '../../../lib/catalog';
import {steamGame} from '../../../lib/steam';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  const database=db();await database.prepare('SELECT id FROM catalog_cache LIMIT 1').first();
  const migration=await ensureCatalogReady(database),scoreImport=migration.ready?await ensureMetacriticScores(database):null,count=await database.prepare("SELECT COUNT(*) AS n FROM catalog_games WHERE status='published'").first<{n:number}>();
  let source=null;
  if(new URL(req.url).searchParams.has('source'))try{if(new URL(req.url).searchParams.get('source')==='steam'){const game=await steamGame(233860);source={provider:'Steam',reachable:true,matched:game.steamAppId===233860,cover:!!game.coverUrl};}else{const records=await metadataForQids(['Q60770258']);source={reachable:true,matched:records.some(g=>g.qid==='Q60770258'),recordCount:records.length,recordName:records[0]?.name||null};}}catch{source={reachable:false,matched:false};}
  return json({ok:migration.ready,apiVersion:2,catalogSize:Number(count?.n||0),storage:'ready',catalog:migration,scoreImport,source},migration.ready?200:202);
 }catch{return json({ok:false,storage:'unavailable'},503);}
}
