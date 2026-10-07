import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../../chatgpt-auth';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(){const u=await getChatGPTUser();return json({user:u?{name:u.displayName,email:u.email}:null,signin:chatGPTSignInPath('/koleksiyonum'),signout:chatGPTSignOutPath('/')});}
