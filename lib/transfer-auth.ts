import {env} from 'cloudflare:workers';
import {AdminError} from './admin-auth';
/** Separate machine credential: catalogue transfer only, never visitor/admin identity. */
export async function requireTransferWorker(req:Request){
 const expected=(env as any).CATALOG_WORKER_TOKEN,header=req.headers.get('authorization')||'';
 if(typeof expected!=='string'||expected.length<32)throw new AdminError('Aktarım servis erişimi yapılandırılmamış.',503);
 if(!header.startsWith('Bearer ')||header.length>1024)throw new AdminError('Aktarım servis yetkisi gerekli.',401);
 const encode=new TextEncoder(),[a,b]=await Promise.all([header.slice(7),expected].map(v=>crypto.subtle.digest('SHA-256',encode.encode(v))));let diff=0;const aa=new Uint8Array(a),bb=new Uint8Array(b);for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];if(diff)throw new AdminError('Aktarım servis yetkisi gerekli.',401);
 return 'catalog-worker';
}
