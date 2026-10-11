import {env} from 'cloudflare:workers';
import {AdminError} from './admin-auth';
export type SteamCandidate={appid:number;name:string;last_modified:number};
export function steamDeltaReady(){return typeof (env as any).STEAM_WEB_API_KEY==='string'&&!!(env as any).STEAM_WEB_API_KEY.trim();}
export function parseSteamDelta(value:any,cursor:number){
 const r=value?.response;if(!r||!Array.isArray(r.apps)||r.apps.length>100||typeof r.have_more_results!=='boolean')throw new AdminError('Steam Delta yanıtı doğrulanamadı.',502);
 let last=cursor;const apps:SteamCandidate[]=r.apps.map((a:any)=>{if(!Number.isSafeInteger(a.appid)||a.appid<=last||a.appid>99999999||typeof a.name!=='string'||a.name.length>500||!Number.isSafeInteger(a.last_modified)||a.last_modified<0)throw new AdminError('Steam Delta kaynak kimliği veya sıralaması geçersiz.',502);last=a.appid;return {appid:a.appid,name:a.name,last_modified:a.last_modified};});
 if(r.have_more_results&&(!apps.length||r.last_appid!==last))throw new AdminError('Steam Delta devam noktası ilerlemiyor.',502);
 return {apps,hasMore:r.have_more_results,cursor:last};
}
export async function fetchSteamDelta(since:number,cursor:number){
 if(!steamDeltaReady())throw new AdminError('Steam Web API anahtarı eksik. Delta kaynağına bağlanılamıyor.',503);
 const input={if_modified_since:since,include_games:true,include_dlc:false,include_software:false,include_videos:false,include_hardware:false,last_appid:cursor,max_results:100};
 const url='https://api.steampowered.com/IStoreService/GetAppList/v1/?key='+encodeURIComponent((env as any).STEAM_WEB_API_KEY)+'&input_json='+encodeURIComponent(JSON.stringify(input));
 try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'NeOynasam/3.0 catalog transfer'}});if(!r.ok)throw new Error();return parseSteamDelta(await r.json(),cursor);}catch(e){if(e instanceof AdminError)throw e;throw new AdminError('Steam Delta kaynağına erişilemedi. Devam noktası korundu.',503);}
}
