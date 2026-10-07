import {gamesByIds,gamesBySteamIds,CatalogQueryError,pendingCatalogResponse} from '../../../lib/catalog-repository';
import {json,validId} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  const p=new URL(req.url).searchParams,ids=[...new Set((p.get('ids')||'').split(',').filter(Boolean))],raw=[...new Set((p.get('steamAppIds')||'').split(',').filter(Boolean))];
  if(ids.length+raw.length>60||ids.some(id=>!validId(id))||raw.some(id=>!/^\d{1,8}$/.test(id)||Number(id)<1)||ids.length&&raw.length)return json({error:'Bir istekte en fazla 60 oyun kimliği ya da mağaza kimliği seçilebilir.'},400);
  return json({apiVersion:2,games:ids.length?await gamesByIds(ids):raw.length?await gamesBySteamIds(raw.map(Number)):[]});
 }catch(e){return pendingCatalogResponse(e)||json({error:e instanceof CatalogQueryError?e.message:'Oyun bilgilerine şu an ulaşılamıyor.'},e instanceof CatalogQueryError?400:503);}
}
