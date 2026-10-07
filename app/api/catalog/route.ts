import {catalog,refreshSelected} from '../../../lib/catalog';
import {checkOrigin,readBody,json,validId} from '../../../lib/security';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){const c=await catalog();return json({...c,scope:'pc',source:'Steam + Wikidata',license:'Mixed sources; see source information',scoreSource:'Historical CC0 and GPL-3.0 snapshots; platform unknown unless specified'});}
export async function POST(req:Request){if(!checkOrigin(req))return json({error:'İstek reddedildi.'},403);if(!await getChatGPTUser())return json({error:'Veri güncellemek için giriş yap.'},401);try{const b=await readBody(req);if(!Array.isArray(b.ids)||b.ids.length<1||b.ids.length>4||!b.ids.every(validId)||new Set(b.ids).size!==b.ids.length)return json({error:'Bir istekte en fazla 4 farklı oyun yenilenebilir.'},400);return json(await refreshSelected(b.ids));}catch{return json({error:'Oyun bilgileri şu an güncellenemiyor. Mevcut katalog korunuyor; daha sonra yeniden deneyebilirsin.'},503);}}
