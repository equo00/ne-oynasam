'use strict';
// Slider görselleri kart kapağı ve galeri medyasından ayrı seçilir.
const heroArtworkCache=new Map(),heroArtworkCacheLimit=60;
let heroArtworkController=null,heroArtworkSequence=0;
function heroAssetUrl(value,appid){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.endsWith('.steamstatic.com')&&new RegExp('^/(?:store_item_assets/)?steam/apps/'+appid+'/').test(u.pathname)?u.href:'';}catch{return '';}
}
function heroArtworkCandidates(g,large=false){
 if(!Number.isSafeInteger(g.steamAppId)||g.steamAppId<1)return [];
 const base='https://cdn.akamai.steamstatic.com/steam/apps/'+g.steamAppId+'/';
 const preferred=g.heroArtwork?.steamAppId===g.steamAppId?heroAssetUrl(g.heroArtwork.src,g.steamAppId):'';
 return [...new Set([preferred,...(large?['library_hero_2x.jpg','library_hero.jpg']:['library_hero.jpg','library_hero_2x.jpg']).map(file=>base+file)].filter(Boolean))];
}
function probeHeroArtwork(src,signal){
 return new Promise(resolve=>{
  if(signal.aborted){resolve(null);return;}
  const image=new Image();let settled=false;
  const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);image.onload=image.onerror=null;if(!ok)image.removeAttribute('src');resolve(ok?image:null);};
  const cancel=()=>finish(false),timer=setTimeout(cancel,3000);
  image.onload=()=>finish(image.naturalWidth>=900&&image.naturalHeight>=430);
  image.onerror=cancel;image.decoding='async';image.fetchPriority='high';signal.addEventListener('abort',cancel,{once:true});image.src=src;
 });
}
function cacheHeroArtwork(key,src){
 heroArtworkCache.delete(key);heroArtworkCache.set(key,{src,expires:Date.now()+(src?86400000:300000)});
 while(heroArtworkCache.size>heroArtworkCacheLimit)heroArtworkCache.delete(heroArtworkCache.keys().next().value);
}
async function mountHeroArtwork(g){
 heroArtworkController?.abort();const controller=heroArtworkController=new AbortController(),signal=controller.signal,sequence=++heroArtworkSequence,stage=$('heroIllustration');
 if(!stage||typeof Image==='undefined'||!Number.isSafeInteger(g.steamAppId))return;
 const deadline=setTimeout(()=>controller.abort(),15000);try{
 // Dar ekranda yarım boyut, yoğun veya geniş ekranda büyük kaynak tercih edilir.
 const large=(globalThis.devicePixelRatio||1)>1.5||(stage.clientWidth||0)>900,key=g.id+':'+g.steamAppId+':'+(large?'large':'regular');
 const relevant=()=>!signal.aborted&&sequence===heroArtworkSequence&&$('heroIllustration')===stage;
 const display=image=>{if(!relevant())return;image.className='hero-photo';image.alt=g.name+' tanıtım görseli';image.width=image.naturalWidth;image.height=image.naturalHeight;stage.replaceChildren(image);};
 const cached=heroArtworkCache.get(key);if(cached&&cached.expires>Date.now()){
  if(!cached.src)return;
  const image=await probeHeroArtwork(cached.src,signal);if(image){display(image);return;}if(!relevant())return;heroArtworkCache.delete(key);
 }
 for(const src of heroArtworkCandidates(g,large)){
  const image=await probeHeroArtwork(src,signal);if(!relevant())return;
  if(image){cacheHeroArtwork(key,src);display(image);return;}
 }
 // Galerinin yalnızca resim kayıtları kullanılır; fragman veya küçük görsel büyütülmez.
 try{
  const media=mediaCache.get(g.id)||await api('/api/media?gameId='+encodeURIComponent(g.id),'GET',undefined,{signal});
  if(!relevant()||media.steamAppId!==g.steamAppId)return;
  if(!media.stale&&!mediaCache.has(g.id)){if(mediaCache.size>=40)mediaCache.delete(mediaCache.keys().next().value);mediaCache.set(g.id,media);}
  const candidates=(media.items||[]).filter(item=>item.kind==='image').map(item=>heroAssetUrl(item.src,g.steamAppId)).filter(Boolean).slice(0,3);
  for(const src of candidates){const image=await probeHeroArtwork(src,signal);if(!relevant())return;if(image){cacheHeroArtwork(key,src);display(image);return;}}
 }catch{}
 if(relevant())cacheHeroArtwork(key,'');
 }finally{clearTimeout(deadline);}
}
let spotlightGames=[],spotlightIndex=0,spotlightTimer,spotlightRefreshTimer,spotlightPaused=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,spotlightBusy=false;
function stopSpotlight(){clearTimeout(spotlightTimer);}
function scheduleSpotlight(){stopSpotlight();if($('spotlight')&&!spotlightPaused&&!spotlightBusy&&!document.hidden&&!$('detail').open&&spotlightGames.length>1)spotlightTimer=setTimeout(()=>{showSpotlight(spotlightIndex+1);},7500);}
function showSpotlight(index){if(!spotlightGames.length)return;spotlightIndex=(index+spotlightGames.length)%spotlightGames.length;const {gameId,kicker,reason}=spotlightGames[spotlightIndex],g=nameGame(gameId);if(!g)return;stopSpotlight();$('heroIllustration').innerHTML=cover(g,true);const artwork=mountHeroArtwork(g),artworkSequence=heroArtworkSequence;artwork.finally(()=>{if(artworkSequence===heroArtworkSequence&&spotlightGames[spotlightIndex]?.gameId===gameId)scheduleSpotlight();});$('featureName').textContent=g.name;$('featureTags').textContent=g.genres.slice(0,3).join(' · ');$('featureKicker').textContent=kicker;$('featureReason').textContent=reason;$('featureCounter').textContent=String(spotlightIndex+1).padStart(2,'0')+' / 05';$('featured').setAttribute('aria-label',g.name+' detaylarını aç');$('featured').onclick=()=>detail(g);$('featured').classList.remove('slide-enter');requestAnimationFrame(()=>$('featured').classList.add('slide-enter'));$('spotlightDots').innerHTML=spotlightGames.map((x,i)=>`<button class="spotlight-dot ${i===spotlightIndex?'active':''}" data-spotlight="${i}" aria-label="${esc(nameGame(x.gameId)?.name)} önerisine git" aria-current="${i===spotlightIndex?'true':'false'}"></button>`).join('');}
async function loadSpotlight(){try{const data=await api('/api/spotlight');const records=data.games||[];rememberGames(records.map(r=>r.game).filter(Boolean));await hydrateGames(records.map(r=>r.gameId));spotlightGames=records.filter(g=>nameGame(g.gameId));showSpotlight(0);$('spotlightDate').textContent=new Date(data.date+'T12:00:00+03:00').toLocaleDateString('tr',{day:'numeric',month:'long'})+' seçkisi · Her gün 00.00’da yenilenir';clearTimeout(spotlightRefreshTimer);const delay=Math.max(1000,Date.parse(data.nextRefreshAt)-Date.now()+1000);spotlightRefreshTimer=setTimeout(loadSpotlight,Math.min(delay,86401000));}catch{$('spotlightDate').textContent='Günün keşifleri yüklenemedi. Yeniden deneniyor…';spotlightRefreshTimer=setTimeout(loadSpotlight,30000);}}
function initSpotlight(){const pause=$('spotlightPause');pause.innerHTML=icon(spotlightPaused?'play':'pause');pause.setAttribute('aria-label',spotlightPaused?'Otomatik geçişi başlat':'Otomatik geçişi durdur');pause.setAttribute('aria-pressed',String(spotlightPaused));pause.onclick=()=>{spotlightPaused=!spotlightPaused;pause.innerHTML=icon(spotlightPaused?'play':'pause');pause.setAttribute('aria-label',spotlightPaused?'Otomatik geçişi başlat':'Otomatik geçişi durdur');pause.setAttribute('aria-pressed',String(spotlightPaused));scheduleSpotlight();};$('spotlightPrev').onclick=()=>showSpotlight(spotlightIndex-1);$('spotlightNext').onclick=()=>showSpotlight(spotlightIndex+1);$('spotlightDots').addEventListener('click',e=>{const button=e.target.closest('[data-spotlight]');if(button)showSpotlight(Number(button.dataset.spotlight));});const region=$('spotlight');region.addEventListener('mouseenter',()=>{spotlightBusy=true;stopSpotlight();});region.addEventListener('mouseleave',()=>{spotlightBusy=false;scheduleSpotlight();});region.addEventListener('focusin',()=>{spotlightBusy=true;stopSpotlight();});region.addEventListener('focusout',e=>{if(!region.contains(e.relatedTarget)){spotlightBusy=false;scheduleSpotlight();}});region.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showSpotlight(spotlightIndex+(e.key==='ArrowRight'?1:-1));}});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpotlight();else{scheduleSpotlight();loadSpotlight();}});return loadSpotlight();}
