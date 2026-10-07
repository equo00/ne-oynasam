export type SpotlightEntry={gameId:string;kicker:string;reason:string};
const rotationSeed='hidden-gems-v2';
const launchIds=['kenshi','steam-312520','return-of-the-obra-dinn','a-short-hike','steam-365360'];

function seededRandom(key:string){
 let state=2166136261;
 for(const letter of key)state=Math.imul(state^letter.charCodeAt(0),16777619)>>>0;
 return ()=>{state=(state+0x6D2B79F5)>>>0;let n=Math.imul(state^(state>>>15),1|state);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296;};
}
function shuffled<T>(items:readonly T[],key:string){
 const result=[...items],random=seededRandom(key);
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
function rawCycle<T extends SpotlightEntry>(pool:readonly T[],cycle:number):T[]{
 // Preserve launch-day games already published; shuffle the rest of the first tour.
 if(cycle===0){const launch=launchIds.map(id=>pool.find(g=>g.gameId===id)).filter((g):g is T=>!!g);return [...launch,...shuffled(pool.filter(g=>!launchIds.includes(g.gameId)),rotationSeed+':'+cycle)];}
 return shuffled(pool,rotationSeed+':'+cycle);
}
function cycleOrder<T extends SpotlightEntry>(pool:readonly T[],cycle:number){
 const order=rawCycle(pool,cycle),window=Math.min(10,Math.floor(pool.length/3));
 const previousTail=new Set(rawCycle(pool,cycle-1).slice(-window).map(g=>g.gameId));
 // Exchange prefix/middle positions only, so each raw tail remains unchanged.
 // Boundary protection needs the previous tail, never recursive historical state.
 if(cycle!==0)for(let i=0;i<window;i++){
  if(!previousTail.has(order[i].gameId))continue;
  const j=order.findIndex((g,index)=>index>=window&&index<order.length-window&&!previousTail.has(g.gameId));
  if(j!==-1)[order[i],order[j]]=[order[j],order[i]];
 }
 return order;
}
export function spotlightSequence<T extends SpotlightEntry>(pool:readonly T[],dayIndex:number){
 if(pool.length<15||new Set(pool.map(g=>g.gameId)).size!==pool.length||!Number.isSafeInteger(dayIndex))throw new Error('Keşif havuzu geçerli değil.');
 const orders=new Map<number,T[]>(),games:T[]=[];
 for(let index=0;index<5;index++){
  const slot=dayIndex*5+index,cycle=Math.floor(slot/pool.length),position=((slot%pool.length)+pool.length)%pool.length;
  if(!orders.has(cycle))orders.set(cycle,cycleOrder(pool,cycle));
  games.push(orders.get(cycle)![position]);
 }
 return games;
}
