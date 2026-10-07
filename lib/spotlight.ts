import {gamesByIds} from './catalog-repository';
import pool from '../data/spotlight-pool.json';
import {spotlightSequence} from './spotlight-rotation';

// Fixed editorial membership keeps published daily choices reproducible.
// New catalog imports do not silently enter homepage recommendations.
export const spotlightPool=pool.map(entry=>{if(!/^[a-z0-9][a-z0-9-]{0,99}$/.test(entry.gameId)||!Number.isSafeInteger(entry.steamAppId)||entry.steamAppId<1)throw new Error('Keşif havuzu kimliği geçersiz.');return entry;});
export function dailySpotlight(now=new Date()){
 const dayMs=86400000,offset=3*3600000,day=Math.floor((now.getTime()+offset)/dayMs);
 const firstDay=Math.floor((Date.UTC(2026,9,6)+offset)/dayMs);
 const games=spotlightSequence(spotlightPool,day-firstDay).map(({gameId,kicker,reason})=>({gameId,kicker,reason}));
 return {date:new Date(day*dayMs).toISOString().slice(0,10),timezone:'Europe/Istanbul',refreshHours:24,nextRefreshAt:new Date((day+1)*dayMs-offset).toISOString(),poolSize:spotlightPool.length,repeatPolicy:'full-pool-first',games};
}

export async function resolvedDailySpotlight(now=new Date()){
 const rotation=dailySpotlight(now),byId=new Map((await gamesByIds(rotation.games.map(g=>g.gameId))).map(g=>[g.id,g]));
 const games=rotation.games.map(item=>({...item,game:byId.get(item.gameId)})).filter(item=>item.game?.platforms.includes('PC')&&item.game.catalogScope!=='archive');
 return {...rotation,apiVersion:2,games};
}
