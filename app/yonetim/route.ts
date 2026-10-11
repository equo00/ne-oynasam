import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import {isCatalogAdmin} from '../../lib/admin-auth';
import {adminPage} from '../../lib/admin-page';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();let allowed=false;try{allowed=await isCatalogAdmin(user);}catch{return html('<p>Yönetim yetkisi şu an doğrulanamadı. Yeniden dene.</p>',503);}
 if(allowed)return html(adminPage,200,true);
 return html(user?'<h1>Yönetim yalnızca yöneticiye açık.</h1><a href="/">Keşfe dön</a>':'<h1>Yönetim için giriş yap.</h1><a target="_top" href="'+chatGPTSignInPath('/yonetim')+'">ChatGPT ile giriş yap</a>',user?403:401);
}
function html(content:string,status:number,full=false){return new Response(full?content:'<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yönetim — Ne Oynasam?</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/style.css"></head><body><main style="padding:50px 24px">'+content+'</main></body></html>',{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});}
