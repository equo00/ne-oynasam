'use strict';

// Recomputed from the live catalog, never a saved list of game IDs.
const relatedPageSize=3,relatedNewWindow=30*24*60*60*1000;
let relatedPage=0,relatedGameId=null;
const nativeRelated=new Map(),nativeRelatedPending=new Map();
function isNewCatalogGame(g,now=Date.now()){
  const added=Date.parse(g.catalogAddedAt||'');
  return Number.isFinite(added)&&added<=now&&now-added<relatedNewWindow;
}
// The server resolves the top twenty against indexed catalog records.
const relatedLimit=20;
function cacheRelated(id,record){nativeRelated.delete(id);nativeRelated.set(id,record);while(nativeRelated.size>5)nativeRelated.delete(nativeRelated.keys().next().value);}
function steamTagsFor(g){const profile=g.steamTags;if(!profile||profile.steamAppId!==g.steamAppId||norm(profile.identityTitle||'')!==norm(g.name))return [];const seen=new Set();return (profile.tags||[]).filter(t=>Number.isSafeInteger(t.id)&&t.id>0&&typeof t.name==='string'&&!seen.has(t.id)&&seen.add(t.id)).slice(0,20);}
function steamTagLabel(t){return state.tagLabels?.[t.id]||t.name;}
function sharedSteamTags(g,target){const ids=new Set(steamTagsFor(target).map(t=>t.id));return steamTagsFor(g).filter(t=>ids.has(t.id));}
function relatedRecommendations(g){return g.platforms?.includes('PC')?(nativeRelated.get(g.id)?.recommendations||[]):[];}
function relatedGames(g){return relatedRecommendations(g).map(m=>m.game);}
function mountNativeRelated(g){
 if(!g.platforms?.includes('PC'))return;
 const cached=nativeRelated.get(g.id);if(cached&&Date.now()-cached.receivedAt<300000)return;
 if(nativeRelatedPending.has(g.id))return;
 const request=api('/api/related?gameId='+encodeURIComponent(g.id)).then(r=>{
  if(!Array.isArray(r.recommendations))throw new Error('Öneri kaydı okunamadı.');
  const seen=new Set([g.id]),recommendations=r.recommendations.filter(m=>m.game&&m.game.platforms?.includes('PC')&&m.game.catalogScope!=='archive'&&!seen.has(m.game.id)&&seen.add(m.game.id)).slice(0,relatedLimit);
  cacheRelated(g.id,{recommendations,receivedAt:Date.now()});
  rememberGames(recommendations.map(m=>m.game));
 }).catch(()=>{cacheRelated(g.id,{recommendations:cached?.recommendations||[],receivedAt:Date.now(),unavailable:true});}).finally(()=>{nativeRelatedPending.delete(g.id);if(state.current?.id===g.id&&$('detail').open)renderRelated();});
 nativeRelatedPending.set(g.id,request);
}
function relatedScore(g){
  const r=userScore(g),date=r?.scoreDate||r?.snapshotDate;
  const label=r?scoreText(g):'Veri yok';
  const note=r?`Tarihli kullanıcı puanı${date?' · '+date:''}; güncel puan farklı olabilir.`:'Bu oyun için eşleşen Metacritic kullanıcı puanı bulunamadı.';
  return `<span class="related-score ${r?(r.score>=7?'good':r.score>=5?'mixed':'low'):'missing'}" aria-label="Metacritic kullanıcı: ${esc(label)}" title="${esc(note)}"><small>Metacritic kullanıcı</small><strong>${r?r.score.toLocaleString('tr',{minimumFractionDigits:1,maximumFractionDigits:1})+'<small>/10</small>':'Veri yok'}</strong></span>`;
}
function relatedCard(g,target,match={}){
  const shared=(match.shared||sharedSteamTags(g,target)).map(steamTagLabel);
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
  cards.innerHTML=visible.map((x,i)=>relatedCard(x,g,recommendations[start+i])).join('')||`<span class="related-empty">${nativeRelatedPending.has(g.id)?'Benzer oyunlar yükleniyor…':'Henüz yeterince yakın oyun bulunamadı.'}</span>`;
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
