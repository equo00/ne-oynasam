import {pendingCatalogResponse} from '../../../lib/catalog-repository';
import {mediaForGame} from '../../../lib/media';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{return json(await mediaForGame(new URL(req.url).searchParams.get('gameId')||''));}catch(e){const pending=pendingCatalogResponse(e);if(pending)return pending;if(e instanceof Error&&e.message==='INVALID_GAME')return json({error:'Bu oyun için galeri kaydı bulunamadı.'},404);return json({error:'Görsellere şu an ulaşılamıyor. Biraz sonra yeniden dene.'},503);}}
