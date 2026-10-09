import {fetchSteamReviews} from './steam-reviews.mjs';
import {safeUrl} from './security';import {fetchSteamTagPage,parseSteamTags} from './steam-tags';
export function steamCover(value:unknown){const url=safeUrl(value);if(!url)return '';const u=new URL(url);return u.protocol==='https:'&&u.hostname.endsWith('.steamstatic.com')?url:'';}
export async function steamDetails(appid:number){
 if(!Number.isSafeInteger(appid)||appid<1||appid>99999999)throw new Error('Geçersiz Steam kimliği.');
 const response=await fetch('https://store.steampowered.com/api/appdetails?appids='+appid+'&l=english',{headers:{'User-Agent':'NeOynasam/2.0 PC discovery'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Steam kaynağı yanıt vermedi.');
 const j:any=await response.json(),d=j[appid]?.data;
 if(!j[appid]?.success||typeof d?.name!=='string'||d?.type!=='game'||!d.platforms?.windows||d.release_date?.coming_soon||(d.steam_appid!==undefined&&d.steam_appid!==appid))throw new Error('Yayımlanmış Windows oyunu değil.');
 return d;
}
export async function steamGame(appid:number){
 const [d,tagPage,reviews]=await Promise.all([steamDetails(appid),fetchSteamTagPage(appid).catch(()=>null),fetchSteamReviews(appid).catch(()=>null)]);
 const translations:Record<string,string>={Action:'Aksiyon',Adventure:'Macera',RPG:'RPG',Strategy:'Strateji',Simulation:'Simülasyon',Indie:'Bağımsız',Casual:'Gündelik',Racing:'Yarış',Sports:'Spor','Massively Multiplayer':'Çok oyunculu'};
 const raw=(d.genres||[]).map((g:any)=>g.description).filter((v:any)=>typeof v==='string');
 const date=new Date(d.release_date?.date),year=Number.isFinite(+date)?date.getUTCFullYear():null;
 let steamTags;try{if(tagPage)steamTags=parseSteamTags(tagPage,appid,d.name);}catch{}
 return {...(reviews?{steamReview:reviews}:{}),...(steamTags?{steamTags}:{}),steamAppId:appid,name:d.name,year,releaseDate:d.release_date?.date||'',genres:[...new Set(raw.map((v:string)=>translations[v]).filter(Boolean))],genresRaw:raw,sourceGenreValues:raw,studio:(d.developers||[]).filter((v:any)=>typeof v==='string').join(', '),publishers:(d.publishers||[]).filter((v:any)=>typeof v==='string'),pcSystems:['Windows',...(d.platforms.mac?['macOS']:[]),...(d.platforms.linux?['Linux']:[])],coverUrl:steamCover(d.header_image),coverFallbackUrl:steamCover(d.capsule_image)||steamCover(d.header_image),coverSource:'Steam publisher store artwork',coverSourceUrl:'https://store.steampowered.com/app/'+appid+'/',steamUrl:'https://store.steampowered.com/app/'+appid+'/',sourceKind:'steam',sourceUrl:'https://store.steampowered.com/app/'+appid+'/',sourceRetrievedAt:new Date().toISOString().slice(0,10),yearSource:'Steam store release date; may reflect full release or rerelease',isFree:!!d.is_free,hasTurkish:typeof d.supported_languages==='string'?d.supported_languages.includes('Turkish'):null,hasCoop:Array.isArray(d.categories)?d.categories.some((c:any)=>typeof c.description==='string'&&/co-op/i.test(c.description)):null,languageSource:'Steam · '+new Date().toISOString().slice(0,10),modeSource:'Steam · '+new Date().toISOString().slice(0,10),sourceType:'game'};
}
