import {requireTransferWorker} from '../../../../lib/transfer-auth';
import {startTransfer,stepTransfer,controlTransfer,transferStatus,approveTransfer} from '../../../../lib/catalog-transfer';
import {AdminError} from '../../../../lib/admin-auth';
import {adminBody,adminFailure} from '../../../../lib/admin-http';
import {json} from '../../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{await requireTransferWorker(req);const p=new URL(req.url).searchParams;return json(await transferStatus(p.get('id')||undefined,Number(p.get('cursor')||0)));}catch(e){return adminFailure(e);}}
export async function POST(req:Request){try{const actor=await requireTransferWorker(req),b=await adminBody(req);switch(b.action){case 'start':return json(await startTransfer(b,actor));case 'step':return json(await stepTransfer(b.id));case 'control':return json(await controlTransfer(b));case 'approve':return json(await approveTransfer(b));default:throw new AdminError('Geçersiz aktarım işlemi.');}}catch(e){return adminFailure(e);}}
