import {resolvedDailySpotlight} from '../../../lib/spotlight';
import {pendingCatalogResponse} from '../../../lib/catalog-repository';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(){try{return json(await resolvedDailySpotlight());}catch(e){return pendingCatalogResponse(e)||json({error:'Günün keşifleri şu an yüklenemedi.'},503);}}
