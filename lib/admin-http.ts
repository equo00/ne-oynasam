import {AdminError} from './admin-auth';
import {pendingCatalogResponse} from './catalog-repository';
import {json,readBody} from './security';
export async function adminBody(req:Request){let value:any;try{value=await readBody(req,80000);}catch{throw new AdminError('İstek geçerli JSON olmalı ve 80 KB sınırını aşmamalı.');}if(!value||typeof value!=='object'||Array.isArray(value))throw new AdminError('Geçerli bir işlem gönder.');return value;}
export function adminFailure(e:unknown){return pendingCatalogResponse(e)||json({error:e instanceof AdminError?e.message:'İşlem tamamlanamadı. Kayıtları ve görev geçmişini inceleyip yeniden dene.'},e instanceof AdminError?e.status:503);}
