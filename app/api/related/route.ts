import {relatedForGame} from '../../../lib/related';
import {pendingCatalogResponse} from '../../../lib/catalog-repository';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{return json(await relatedForGame(new URL(req.url).searchParams.get('gameId')||''));}catch(e){const pending=pendingCatalogResponse(e);if(pending)return pending;if(e instanceof Error&&e.message==='INVALID_GAME')return json({error:'Bu oyun için öneri kaydı bulunamadı.'},404);return json({error:'Öneri listesine şu an ulaşılamıyor; daha sonra yeniden dene.'},503);}}
