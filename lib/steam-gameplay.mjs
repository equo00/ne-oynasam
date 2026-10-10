// Kimlikler mağazanın özellik kayıtlarıdır; topluluk etiketleri kullanılmaz.
export const GAMEPLAY_DEFINITIONS=[
 ['single','Tek oyunculu',2,'Single-player'],
 ['coop','Co-op',9,'Co-op'],['coop-online','Online co-op',38,'Online Co-op'],['coop-lan','LAN co-op',48,'LAN Co-op'],['coop-local','Aynı cihazda co-op',39,'Shared/Split Screen Co-op'],
 ['pvp','PvP',49,'PvP'],['pvp-online','Online PvP',36,'Online PvP'],['pvp-lan','LAN PvP',47,'LAN PvP'],['pvp-local','Aynı cihazda PvP',37,'Shared/Split Screen PvP'],
 ['cross-play','Cross-play',27,'Cross-Platform Multiplayer'],['remote-play-together','Remote Play Together',44,'Remote Play Together']
];
export const GAMEPLAY_KEYS=GAMEPLAY_DEFINITIONS.map(d=>d[0]);
export function parseSteamGameplay(data,appid,retrievedAt=new Date().toISOString()){
 if(!Number.isSafeInteger(appid)||appid<1||data?.steam_appid!==appid||data.type!=='game'||typeof data.name!=='string'||!Array.isArray(data.categories)||!data.categories.length)throw Error('Oynanış kaynağı veya oyun kimliği doğrulanamadı.');
 const categories=data.categories.filter(c=>Number.isSafeInteger(c.id)&&c.id>0&&typeof c.description==='string').map(c=>({id:c.id,description:c.description}));
 const flags=Object.fromEntries(GAMEPLAY_DEFINITIONS.map(([key,,id,label])=>[key,categories.some(c=>c.id===id&&c.description===label)?true:null]));
 for(const kind of ['coop','pvp'])if(GAMEPLAY_KEYS.some(k=>k.startsWith(kind+'-')&&flags[k]===true))flags[kind]=true;
 return {steamAppId:appid,sourceName:data.name,sourceKind:'steam-store-categories',sourceUrl:'https://store.steampowered.com/app/'+appid+'/',retrievedAt,categories,features:flags,crossPlayPlatforms:null};
}
export function validGameplay(value,appid=value?.steamAppId){
 if(!value||value.steamAppId!==appid||value.sourceKind!=='steam-store-categories'||!Number.isSafeInteger(appid)||!Number.isFinite(Date.parse(value.retrievedAt)))return false;
 try{const expected=parseSteamGameplay({steam_appid:appid,type:'game',name:value.sourceName,categories:value.categories},appid,value.retrievedAt);return JSON.stringify(expected.features)===JSON.stringify(value.features)&&value.sourceUrl===expected.sourceUrl&&value.crossPlayPlatforms===null;}catch{return false;}
}
export function gameplayKeys(game){return validGameplay(game?.gameplay,game?.steamAppId)?GAMEPLAY_KEYS.filter(k=>game.gameplay.features[k]===true):[];}
export function preserveGameplay(previous,incoming,appid){
 if(!validGameplay(incoming.gameplay,appid))return previous.gameplay?{gameplay:previous.gameplay,...(previous.gameplayHistory?{gameplayHistory:previous.gameplayHistory}:{})}:{};
 const current=incoming.gameplay,old=previous.gameplay;
 if(validGameplay(old,appid)&&Date.parse(old.retrievedAt)>Date.parse(current.retrievedAt))return {gameplay:old,...(previous.gameplayHistory?{gameplayHistory:previous.gameplayHistory}:{})};
 const history=[...(previous.gameplayHistory||[])];if(old&&JSON.stringify(old)!==JSON.stringify(current)&&!history.some(x=>JSON.stringify(x)===JSON.stringify(old)))history.push(old);
 return {gameplay:current,gameplayHistory:history};
}
