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
 const source=fact?.sourceUrl||fact?.url;
 let sourceUrl;try{sourceUrl=new URL(source);}catch{throw Error('Puan kaynak adresi geçersiz.');}
 const unknown=fact.platform===null;
 const validUnknown=unknown&&sourceUrl.protocol==='https:'&&['www.metacritic.com','metacritic.com'].includes(sourceUrl.hostname)&&!sourceUrl.username&&!sourceUrl.password&&!sourceUrl.port&&sourceUrl.pathname==='/game/'+fact.metacriticId+'/'&&!sourceUrl.searchParams.has('platform');
 if(fact?.metric!=='user-score'||!(unknown?validUnknown:scoreUrlMatchesPlatform(source,fact.platform))||
  typeof fact.score!=='number'||!Number.isFinite(fact.score)||fact.score<0||fact.score>10||
  !proof||proof.metricLabel!=='User score'||proof.platformLabel!==fact.platform||
  !['user-supplied-capture','public-primary-cache','public-historical-dataset'].includes(proof.method))throw Error('Birincil kullanıcı puanı/platform kanıtı geçersiz.');
 if(unknown&&(proof.method!=='public-primary-cache'||proof.platformUnverified!==true||proof.pageHeading!=='Game overview'))throw Error('Platformu belirsiz puan için açık kullanıcı ortalaması kanıtı gerekli.');
 if(proof.method==='user-supplied-capture'&&!/^[a-f0-9]{64}$/.test(proof.captureSha256||''))throw Error('Ekran görüntüsü kanıtı eksik.');
 if(proof.method==='public-primary-cache'){
  const evidenceUrl=proof.platformEvidenceUrl?new URL(proof.platformEvidenceUrl):null;
  const overview=proof.pageHeading==='Game overview'&&/^turn\d+(?:search|view)\d+$/.test(proof.platformEvidenceReference||'')&&scoreUrlMatchesPlatform(proof.platformEvidenceUrl,fact.platform)&&evidenceUrl.searchParams.has('platform')&&evidenceUrl.pathname==='/game/'+fact.metacriticId+'/user-reviews/';
  const single=proof.pageHeading==='Game overview'&&proof.platformEvidenceKind==='single-platform'&&Array.isArray(proof.platformEvidencePlatforms)&&proof.platformEvidencePlatforms.length===1&&proof.platformEvidencePlatforms[0]===fact.platform&&/^turn\d+(?:search|view)\d+$/.test(proof.platformEvidenceReference||'')&&scoreUrlMatchesPlatform(proof.platformEvidenceUrl,fact.platform)&&evidenceUrl.pathname==='/game/'+fact.metacriticId+'/';
  if(!proof.sourceCrawlLabel||!/^turn\d+(?:search|view)\d+$/.test(proof.retrievalReference||'')||(!unknown&&proof.pageHeading!==fact.platform+' User Reviews'&&!overview&&!single))throw Error('Önbellek platform başlığı ve yaşı eksik.');
 }
 if(proof.method==='public-historical-dataset'){
  const row=proof.datasetRow;
  const pinned='https://github.com/StadynR/metacritic-reviews-dataset/blob/'+proof.datasetBlobSha+'/metacritic_dataset_raw.csv';
  if(fact.platform!=='PC'||!row||row.platform!=='PC'||typeof row.user_score!=='string'||!row.user_score.trim()||Number(row.user_score)!==fact.score||!row.name||!row.developer||!row.release_date||!/^\d{4}-\d{2}-\d{2}$/.test(proof.datasetCollectedAt||'')||proof.datasetCollectedAt>fact.snapshotDate||!/^\b[a-f0-9]{40}$/.test(proof.datasetBlobSha||'')||proof.datasetUrl!==pinned||fact.userRatings!==null)throw Error('Tarihî veri kümesi/platform/sayısal olgu kanıtı geçersiz.');
 }
 if(fact.userRatings!==null&&(!Number.isSafeInteger(fact.userRatings)||fact.userRatings<1))throw Error('Kullanıcı oy sayısı geçersiz.');
 return fact;
}
