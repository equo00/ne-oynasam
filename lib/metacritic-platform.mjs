// The source platform describes the score, independently of PC catalog scope.
const platforms = {
 PC:['pc'], 'PlayStation 5':['playstation-5','ps5'], 'PlayStation 4':['playstation-4','ps4'],
 'PlayStation 3':['playstation-3','ps3'], 'PlayStation 2':['playstation-2','ps2'], PlayStation:['playstation'],
 'Xbox Series X':['xbox-series-x'], 'Xbox One':['xbox-one'], 'Xbox 360':['xbox-360'], Xbox:['xbox'],
 'Nintendo Switch':['switch','nintendo-switch'], 'Nintendo Switch 2':['switch-2','nintendo-switch-2'],
 Switch:['switch','nintendo-switch'], Wii:['wii'], 'Wii U':['wii-u'], DS:['ds'], '3DS':['3ds'],
 GameCube:['gamecube'], PSP:['psp'], 'PS Vita':['ps-vita'], Dreamcast:['dreamcast'], iOS:['ios'], Android:['android']
};
export function scorePlatformSlugs(platform){return platforms[platform]||null;}
export function scoreUrlMatchesPlatform(value,platform){
 const slugs=scorePlatformSlugs(platform);if(!slugs)return false;
 try{const url=new URL(value),queries=url.searchParams.getAll('platform'),first=url.pathname.split('/').filter(Boolean)[1];
  if(url.protocol!=='https:'||!['www.metacritic.com','metacritic.com'].includes(url.hostname)||url.username||url.password||url.port||!url.pathname.startsWith('/game/'))return false;
  const allSlugs=Object.values(platforms).flat();
  return queries.every(q=>slugs.includes(q))&&(!allSlugs.includes(first)||slugs.includes(first));
 }catch{return false;}
}
export function validatePrimaryScoreFact(fact){
 const proof=fact?.provenance;
 if(fact?.metric!=='user-score'||!scoreUrlMatchesPlatform(fact.sourceUrl||fact.url,fact.platform)||
  typeof fact.score!=='number'||!Number.isFinite(fact.score)||fact.score<0||fact.score>10||
  !proof||proof.metricLabel!=='User score'||proof.platformLabel!==fact.platform||
  !['user-supplied-capture','public-primary-cache'].includes(proof.method))throw Error('Birincil kullanıcı puanı/platform kanıtı geçersiz.');
 if(proof.method==='user-supplied-capture'&&!/^[a-f0-9]{64}$/.test(proof.captureSha256||''))throw Error('Ekran görüntüsü kanıtı eksik.');
 if(proof.method==='public-primary-cache'){
  const evidenceUrl=proof.platformEvidenceUrl?new URL(proof.platformEvidenceUrl):null;
  const overview=proof.pageHeading==='Game overview'&&/^turn\d+(?:search|view)\d+$/.test(proof.platformEvidenceReference||'')&&scoreUrlMatchesPlatform(proof.platformEvidenceUrl,fact.platform)&&evidenceUrl.searchParams.has('platform')&&evidenceUrl.pathname==='/game/'+fact.metacriticId+'/user-reviews/';
  if(!proof.sourceCrawlLabel||!/^turn\d+(?:search|view)\d+$/.test(proof.retrievalReference||'')||(proof.pageHeading!==fact.platform+' User Reviews'&&!overview))throw Error('Önbellek platform başlığı ve yaşı eksik.');
 }
 if(fact.userRatings!==null&&(!Number.isSafeInteger(fact.userRatings)||fact.userRatings<1))throw Error('Kullanıcı oy sayısı geçersiz.');
 return fact;
}
