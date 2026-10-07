'use strict';

// Recomputed from the live catalog, never a saved list of game IDs.
const relatedPageSize=3,relatedNewWindow=30*24*60*60*1000;
let relatedPage=0,relatedGameId=null;
const nativeRelated=new Map(),nativeRelatedPending=new Map();
function isNewCatalogGame(g,now=Date.now()){
  const added=Date.parse(g.catalogAddedAt||'');
  return Number.isFinite(added)&&added<=now&&now-added<relatedNewWindow;
}
// Steam publishes top-tag overlap, not its complete recommendation formula.
// This local matcher uses the source's top 20 tags and favors distinctive shared tags.
const relatedLimit=20;
const genericSteamTags=new Set([19,21,492,4182,3859,597,493,113]);
let relatedIndexCache=null;
function steamTagsFor(g){
  const profile=g.steamTags;
  if(!profile||profile.steamAppId!==g.steamAppId||norm(profile.identityTitle||'')!==norm(g.name))return [];
  const seen=new Set();
  return (profile.tags||[]).filter(t=>Number.isSafeInteger(t.id)&&t.id>0&&typeof t.name==='string'&&!seen.has(t.id)&&seen.add(t.id)).slice(0,20);
}
function steamTagLabel(t){return state.tagLabels?.[t.id]||t.name;}
function relatedIndex(games){
  if(relatedIndexCache?.games===games&&relatedIndexCache.length===games.length)return relatedIndexCache;
  const seen=new Set(),items=[],frequency=new Map();
  for(const game of games){
    if(seen.has(game.id)||game.catalogScope==='archive'||!game.platforms?.includes('PC'))continue;
    seen.add(game.id);const tags=steamTagsFor(game);if(!tags.length)continue;
    items.push({game,tags});for(const t of tags)frequency.set(t.id,(frequency.get(t.id)||0)+1);
  }
  const rarity=new Map([...frequency].map(([id,count])=>[id,1+Math.log((items.length+1)/(count+1))]));
  const vector=tags=>{
    const maximum=Math.max(1,...tags.map(t=>typeof t.count==='number'&&t.count>0?t.count:0)),values=new Map();
    for(const t of tags){const strength=typeof t.count==='number'&&t.count>0?Math.sqrt(t.count/maximum):1,w=strength*(rarity.get(t.id)||1);values.set(t.id,w);}
    return {values};
  };
  for(const item of items)item.vector=vector(item.tags);
  relatedIndexCache={games,length:games.length,items,rarity,vector};return relatedIndexCache;
}
function relatedMatches(g,games=state.games){
  const target=steamTagsFor(g);if(!g.platforms?.includes('PC')||!target.length)return [];
  const index=relatedIndex(games),vector=index.vector(target),ids=new Set(target.map(t=>t.id));
  const targetSpecific=target.filter(t=>!genericSteamTags.has(t.id)).length,matches=[];
  for(const item of index.items){
    if(item.game.id===g.id||item.game.steamAppId===g.steamAppId)continue;
    const shared=item.tags.filter(t=>ids.has(t.id)),specific=shared.filter(t=>!genericSteamTags.has(t.id)).length;
    // Generic labels alone (Action/Indie/Singleplayer etc.) do not establish useful similarity.
    if(!specific||shared.length<Math.min(2,target.length)||specific<Math.min(2,targetSpecific))continue;
    const overlap=shared.reduce((n,t)=>n+Math.min(vector.values.get(t.id),item.vector.values.get(t.id)),0);
    let union=0;for(const [id,w] of vector.values)union+=Math.max(w,item.vector.values.get(id)||0);for(const [id,w] of item.vector.values)if(!vector.values.has(id))union+=w;
    const confidence=g.steamTags.complete===false?Math.sqrt(target.length/20):1,candidateConfidence=item.game.steamTags.complete===false?Math.sqrt(item.tags.length/20):1;
    const score=overlap/union*confidence*candidateConfidence;
    if(!Number.isFinite(score)||score<=0)continue;
    shared.sort((a,b)=>(index.rarity.get(b.id)||1)-(index.rarity.get(a.id)||1));
    matches.push({game:item.game,score,shared});
  }
  matches.sort((a,b)=>b.score-a.score||b.shared.length-a.shared.length||a.game.name.localeCompare(b.game.name,'tr')||a.game.id.localeCompare(b.game.id));
  return matches.slice(0,relatedLimit);
}
function relatedRecommendations(g,games=state.games){
  if(!g.platforms?.includes('PC'))return [];
  const source=nativeRelated.get(g.id),result=[],seen=new Set([g.id]);
  if(source?.steamAppId===g.steamAppId){
    const bySteam=new Map(games.filter(x=>x.catalogScope!=='archive'&&x.platforms?.includes('PC')).map(x=>[x.steamAppId,x]));
    for(const appid of source.candidateAppIds){const game=bySteam.get(appid);if(!game||seen.has(game.id)||game.steamAppId===g.steamAppId)continue;seen.add(game.id);result.push({game,origin:'steam',shared:sharedSteamTags(game,g)});if(result.length===relatedLimit)break;}
  }
  for(const match of result.length<relatedLimit?relatedMatches(g,games):[]){if(result.length===relatedLimit)break;if(!seen.has(match.game.id)){seen.add(match.game.id);result.push({...match,origin:'tags'});}}
  return result;
}
function relatedGames(g,games=state.games){return relatedRecommendations(g,games).map(m=>m.game);}
function mountNativeRelated(g){
  if(!g.steamAppId)return;
  const cached=nativeRelated.get(g.id);if(cached&&Date.now()-cached.receivedAt<300000)return;
  if(nativeRelatedPending.has(g.id))return;
  const request=api('/api/related?gameId='+encodeURIComponent(g.id)).then(r=>{
    if(r.steamAppId!==g.steamAppId||!Array.isArray(r.candidateAppIds)||!r.candidateAppIds.every(n=>Number.isSafeInteger(n)&&n>0&&n<=99999999))throw new Error('Geçersiz Steam öneri kaydı.');
    nativeRelated.set(g.id,{...r,receivedAt:Date.now()});
  }).catch(()=>{nativeRelated.set(g.id,{steamAppId:g.steamAppId,candidateAppIds:[],receivedAt:Date.now(),unavailable:true});}).finally(()=>{
    nativeRelatedPending.delete(g.id);if(state.current?.id===g.id&&$('detail').open)renderRelated();
  });nativeRelatedPending.set(g.id,request);
}
function sharedSteamTags(g,target){const ids=new Set(steamTagsFor(target).map(t=>t.id)),index=relatedIndex(state.games);return steamTagsFor(g).filter(t=>ids.has(t.id)).sort((a,b)=>(index.rarity.get(b.id)||1)-(index.rarity.get(a.id)||1));}
function relatedScore(g){
  const r=userScore(g),date=r?.scoreDate||r?.snapshotDate;
  const label=r?scoreText(g):'Veri yok';
  const note=r?`Tarihli kullanıcı puanı${date?' · '+date:''}; güncel puan farklı olabilir.`:'Bu oyun için eşleşen Metacritic kullanıcı puanı bulunamadı.';
  return `<span class="related-score ${r?(r.score>=7?'good':r.score>=5?'mixed':'low'):'missing'}" aria-label="Metacritic kullanıcı: ${esc(label)}" title="${esc(note)}"><small>Metacritic kullanıcı</small><strong>${r?r.score.toLocaleString('tr',{minimumFractionDigits:1,maximumFractionDigits:1})+'<small>/10</small>':'Veri yok'}</strong></span>`;
}
function relatedCard(g,target,origin='tags'){
  const shared=sharedSteamTags(g,target).map(steamTagLabel);
  return `<button type="button" class="related-card" data-open="${esc(g.id)}" aria-label="${esc(g.name)} detaylarını aç · Metacritic kullanıcı: ${esc(scoreText(g))}"><span class="related-cover">${cover(g)}${relatedScore(g)}${isNewCatalogGame(g)?'<span class="related-new">Yeni eklendi</span>':''}</span><span class="related-card-body"><strong class="related-name">${esc(g.name)}</strong><span class="related-genres" title="Ortak etiketler: ${esc(shared.join(' · '))}">${esc(shared.slice(0,2).join(' · ')||'Keşfetmeye değer başka bir dünya')}</span></span></button>`;
}
function relatedMarkup(){
  return '<section class="related" aria-labelledby="relatedTitle"><div class="related-heading"><h3 id="relatedTitle">Ortak türlerden başka dünyalar</h3><div class="related-controls"><button type="button" data-related-page="-1" aria-label="Önceki benzer oyunlar" aria-controls="relatedCards">'+icon('left')+'</button><button type="button" data-related-page="1" aria-label="Sonraki benzer oyunlar" aria-controls="relatedCards">'+icon('right')+'</button></div></div><p class="related-range" id="relatedRange" role="status" aria-live="polite"></p><div class="related-cards" id="relatedCards"></div><details class="related-tag-profile"><summary>Oyunun dünyası ve oynanışı</summary><div id="relatedTagProfile"></div></details></section>';
}
function renderRelated(g=state.current,reset=false){
  const cards=$('relatedCards');if(!g||!cards)return;
  if(reset||relatedGameId!==g.id){relatedPage=0;relatedGameId=g.id;}
  const recommendations=relatedRecommendations(g),games=recommendations.map(m=>m.game),pages=Math.ceil(games.length/relatedPageSize);
  relatedPage=Math.min(Math.max(0,relatedPage),Math.max(0,pages-1));
  const start=relatedPage*relatedPageSize,visible=games.slice(start,start+relatedPageSize);
  cards.innerHTML=visible.map((x,i)=>relatedCard(x,g,recommendations[start+i].origin)).join('')||'<span class="related-empty">Henüz yeterince yakın oyun bulunamadı.</span>';
  cards.scrollLeft=0;
  const source=g.steamTags;$('relatedTagProfile').innerHTML=source?`<div class="tags">${steamTagsFor(g).map(t=>`<span>${esc(steamTagLabel(t))}</span>`).join('')}</div>${source.complete===false?'<p>Bu oyunda şimdilik daha az etiket bulunuyor.</p>':''}`:'<p>Bu oyun için henüz ayrıntılı etiket yok.</p>';
  $('relatedRange').title='Benzer dünyalar, oynanış biçimleri ve ortak ilgi alanları';
  $('relatedRange').textContent=games.length?`${start+1}–${Math.min(start+relatedPageSize,games.length)} / ${games.length} oyun`:'Katalog genişledikçe uygun eşleşmeler burada görünecek.';
  document.querySelectorAll('[data-related-page]').forEach(button=>{button.disabled=button.dataset.relatedPage==='-1'?relatedPage===0:relatedPage>=pages-1;});
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-related-page]');if(!button||button.disabled||!state.current)return;
  relatedPage+=Number(button.dataset.relatedPage);renderRelated();
});
