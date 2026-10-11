import {env} from 'cloudflare:workers';
import {getChatGPTUser,type ChatGPTUser} from '../app/chatgpt-auth';
import {db} from './db';
import {ensureAdminSchema} from './admin-schema';
export class AdminError extends Error{constructor(message:string,public status=400){super(message);}}
export async function isCatalogAdmin(user:ChatGPTUser|null):Promise<boolean>{
 if(!user?.userId||!user.email)return false;
 const settings=env as unknown as Record<string,unknown>;
 const ids=typeof settings.ADMIN_USER_IDS==='string'?settings.ADMIN_USER_IDS.split(',').map(x=>x.trim()).filter(Boolean):[];
 if(ids.includes(user.userId))return true;
 const bootstrap=typeof settings.ADMIN_BOOTSTRAP_EMAIL==='string'?settings.ADMIN_BOOTSTRAP_EMAIL.trim().toLowerCase():'';
 if(!bootstrap)return false;
 const database=db();await ensureAdminSchema(database);
 let owner=await database.prepare("SELECT user_id FROM catalog_admins WHERE id='owner'").first<{user_id:string}>();
 // An explicitly configured owner may bind their Site-scoped identity once.
 // Neither first-login order nor browser-supplied role/name grants access.
 if(!owner&&user.email.trim().toLowerCase()===bootstrap){await database.prepare("INSERT INTO catalog_admins(id,user_id,created_at) VALUES('owner',?,?) ON CONFLICT DO NOTHING").bind(user.userId,new Date().toISOString()).run();owner=await database.prepare("SELECT user_id FROM catalog_admins WHERE id='owner'").first<{user_id:string}>();}
 return owner?.user_id===user.userId;
}
export async function requireCatalogAdmin(){const user=await getChatGPTUser();if(!user)throw new AdminError('Yönetim için giriş yapmalısın.',401);if(!await isCatalogAdmin(user))throw new AdminError('Bu işlem yalnızca yöneticiye açık.',403);return user;}
