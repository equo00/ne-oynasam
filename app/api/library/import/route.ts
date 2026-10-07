import {getChatGPTUser} from '../../../chatgpt-auth';
import {db} from '../../../../lib/db';
import {checkOrigin,readBody,validateLibrary,validId,json} from '../../../../lib/security';
import {knownGame} from '../../../../lib/catalog';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!checkOrigin(req))return json({error:'İstek reddedildi.'},403);
 const user=await getChatGPTUser();if(!user)return json({error:'Giriş yapmalısın.'},401);
 try{
  const body=await readBody(req,100000),stamp=new Date().toISOString();
  if(Array.isArray(body.entries)){
   if(body.entries.length<1||body.entries.length>40)throw Error('Bir grupta 1–40 oyun aktarılabilir.');
   const entries=body.entries.map(validateLibrary);
   if(new Set(entries.map((e:any)=>e.gameId)).size!==entries.length)throw Error('Tekrarlanan oyun kimliği.');
   for(const e of entries)if(!await knownGame(e.gameId))throw Error('Oyun katalogda bulunamadı.');
   await db().batch(entries.map((e:any)=>db().prepare('INSERT INTO library(user_id,game_id,status,note,rating,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,game_id) DO UPDATE SET status=excluded.status,note=excluded.note,rating=excluded.rating,updated_at=excluded.updated_at').bind(user.userId,e.gameId,e.status,e.note,e.rating,stamp)));
   return json({updated:entries.length});
  }
  const name=typeof body.collectionName==='string'?body.collectionName.trim():'';
  if(!name||name.length>60||!Array.isArray(body.games)||body.games.length>40||!body.games.every(validId)||new Set(body.games).size!==body.games.length)throw Error('Geçersiz koleksiyon aktarımı.');
  for(const id of body.games){const e=await db().prepare('SELECT game_id FROM library WHERE user_id=? AND game_id=?').bind(user.userId,id).first();if(!e)throw Error('Koleksiyon oyunu önce kendi listene aktarılmalı.');}
  let list=await db().prepare('SELECT id FROM lists WHERE user_id=? AND name=? ORDER BY created_at LIMIT 1').bind(user.userId,name).first<{id:string}>();
  const statements=[];
  if(!list){const n=await db().prepare('SELECT count(*) AS n FROM lists WHERE user_id=?').bind(user.userId).first<{n:number}>();if((n?.n||0)>=30)throw Error('En fazla 30 koleksiyon olabilir.');list={id:crypto.randomUUID()};statements.push(db().prepare('INSERT INTO lists(id,user_id,name,created_at) VALUES(?,?,?,?)').bind(list.id,user.userId,name,stamp));}
  statements.push(...body.games.map((id:string)=>db().prepare('INSERT OR IGNORE INTO list_games(list_id,game_id) VALUES(?,?)').bind(list!.id,id)));
  if(statements.length)await db().batch(statements);
  return json({listId:list.id,updated:body.games.length});
 }catch(e){return json({error:e instanceof Error?e.message:'Aktarım tamamlanamadı.'},400);}
}
