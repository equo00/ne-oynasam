import {db} from '../../../lib/db';
import seed from '../../../data/catalog.json';
import {metadataForQids} from '../../../lib/catalog';
import {steamGame} from '../../../lib/steam';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  await db().prepare('SELECT id FROM catalog_cache LIMIT 1').first();
  let source=null;
  if(new URL(req.url).searchParams.has('source'))try{
   if(new URL(req.url).searchParams.get('source')==='steam'){const game=await steamGame(233860);source={provider:'Steam',reachable:true,matched:game.steamAppId===233860,cover:!!game.coverUrl};}else{
   const records=await metadataForQids(['Q60770258']);
   source={reachable:true,matched:records.some(g=>g.qid==='Q60770258'),recordCount:records.length,recordName:records[0]?.name||null};}
  }catch{source={reachable:false,matched:false};}
  return json({ok:true,catalogSize:seed.length,storage:'ready',source});
 }catch{return json({ok:false,catalogSize:seed.length,storage:'unavailable'},503);}
}
