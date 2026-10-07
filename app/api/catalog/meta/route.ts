import {catalogMetadata,pendingCatalogResponse} from '../../../../lib/catalog-repository';
import {json} from '../../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(){try{return json({apiVersion:2,ready:true,...await catalogMetadata()});}catch(e){return pendingCatalogResponse(e)||json({error:'Katalog bilgileri şu an yüklenemedi.'},503);}}
