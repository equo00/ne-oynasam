import {refreshAdminGames} from '../../../lib/admin-catalog';
import {requireCatalogAdmin} from '../../../lib/admin-auth';
import {adminFailure,adminBody} from '../../../lib/admin-http';
import {queryCatalog,parseCatalogQuery,CatalogQueryError,pendingCatalogResponse} from '../../../lib/catalog-repository';
import {checkOrigin,readBody,json,validId} from '../../../lib/security';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const query=parseCatalogQuery(new URL(req.url).searchParams),scoped=query.library||query.collection||query.status,u=scoped?await getChatGPTUser():null;if(scoped&&!u)return json({error:'Koleksiyonunu görmek için giriş yap.'},401);return json({...await queryCatalog(query,u?.userId),scope:'pc',source:'Steam + Wikidata',license:'Mixed sources; see source information',scoreSource:'Historical CC0 and GPL-3.0 snapshots; platform unknown unless specified'});}catch(e){return pendingCatalogResponse(e)||json({error:e instanceof CatalogQueryError?e.message:'Katalog şu an yüklenemedi. Yeniden dene.'},e instanceof CatalogQueryError?400:503);}}
export async function POST(req:Request){if(!checkOrigin(req))return json({error:'İstek reddedildi.'},403);try{const u=await requireCatalogAdmin(),b=await adminBody(req);return json(await refreshAdminGames(b.ids,u.userId));}catch(e){return adminFailure(e);}}
