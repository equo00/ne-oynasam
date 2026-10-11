import {sourceSearch} from '../../../lib/catalog';
import {addAdminSourceGame} from '../../../lib/admin-catalog';
import {requireCatalogAdmin,AdminError} from '../../../lib/admin-auth';
import {adminFailure,adminBody} from '../../../lib/admin-http';
import {json,checkOrigin} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{await requireCatalogAdmin();const q=new URL(req.url).searchParams.get('q')?.trim()||'';if(q.length<3||q.length>80)throw new AdminError('En az 3, en fazla 80 karakter gir.');return json({games:await sourceSearch(q)});}catch(e){return adminFailure(e);}}
export async function POST(req:Request){if(!checkOrigin(req))return json({error:'İstek reddedildi.'},403);try{const u=await requireCatalogAdmin(),b=await adminBody(req);return json(await addAdminSourceGame(b.qid,u.userId));}catch(e){return adminFailure(e);}}
