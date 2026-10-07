import seed from '../data/catalog.json';
import pool from '../data/spotlight-pool.json';
import {spotlightSequence} from './spotlight-rotation';

// Fixed editorial membership keeps published daily choices reproducible.
// New catalog imports do not silently enter homepage recommendations.
const known=new Map(seed.map(g=>[g.id,g]));
export const spotlightPool=pool.map(entry=>{
 const game=known.get(entry.gameId);
 if(!game||game.steamAppId!==entry.steamAppId||game.name!==entry.name||!game.platforms.includes('PC')||game.sourceType!=='game')throw new Error('Keşif oyunu katalogla eşleşmedi.');
 return entry;
});
export function dailySpotlight(now=new Date()){
 const dayMs=86400000,offset=3*3600000,day=Math.floor((now.getTime()+offset)/dayMs);
 const firstDay=Math.floor((Date.UTC(2026,9,6)+offset)/dayMs);
 const games=spotlightSequence(spotlightPool,day-firstDay).map(({gameId,kicker,reason})=>({gameId,kicker,reason}));
 return {date:new Date(day*dayMs).toISOString().slice(0,10),timezone:'Europe/Istanbul',refreshHours:24,nextRefreshAt:new Date((day+1)*dayMs-offset).toISOString(),poolSize:spotlightPool.length,repeatPolicy:'full-pool-first',games};
}
