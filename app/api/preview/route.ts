import {cardPreviewForGame} from '../../../lib/card-preview';
import {pendingCatalogResponse} from '../../../lib/catalog-repository';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{return json(await cardPreviewForGame(new URL(req.url).searchParams.get('gameId')||''));}
 catch(error){const pending=pendingCatalogResponse(error);if(pending)return pending;return json({error:'Bu oyun için kısa önizleme şu an kullanılamıyor.'},error instanceof Error&&error.message==='INVALID_GAME'?404:503);}
}
