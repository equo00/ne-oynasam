// Yalnızca uygulama kimliği kullanılır; dil/ülke ve değerlendirme türü daraltılmaz.
export const STEAM_REVIEW_POLICY='all-languages-no-country-filter';
export function steamReviewUrl(appid){
 if(!Number.isSafeInteger(appid)||appid<1||appid>99999999)throw Error('Geçersiz Steam kimliği.');
 const url=new URL('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/');
 url.searchParams.set('input_json',JSON.stringify({appid,languages:['all'],review_type:0,purchase_type:1,filter:1,filter_offtopic_activity:false,num_per_page:1}));
 return url.href;
}
function validateSteamReviewSource(sourceUrl,appid){
 steamReviewUrl(appid);const source=new URL(sourceUrl);
 if(source.protocol!=='https:')throw Error('Steam özet kaynağı geçersiz.');
 if(source.hostname==='api.steampowered.com'){
  const p=JSON.parse(source.searchParams.get('input_json')||'{}');
  if(source.pathname!=='/IUserReviewsService/GetAppReviews/v1/'||p.appid!==appid||p.languages?.length!==1||p.languages[0]!=='all'||p.purchase_type!==1||p.review_type!==0||p.filter_offtopic_activity!==false||Object.keys(p).some(k=>!['appid','languages','purchase_type','review_type','filter_offtopic_activity','filter','num_per_page'].includes(k)))throw Error('Steam özet kapsamı geçersiz.');
 }else if(source.hostname==='store.steampowered.com'){
  if(source.pathname!==`/appreviews/${appid}`||source.searchParams.get('language')!=='all'||source.searchParams.get('purchase_type')!=='all'||source.searchParams.get('review_type')!=='all'||source.searchParams.get('filter_offtopic_activity')!=='0'||[...source.searchParams.keys()].some(k=>!['json','language','purchase_type','review_type','filter_offtopic_activity','filter','num_per_page'].includes(k)))throw Error('Steam özet kapsamı geçersiz.');
 }else throw Error('Steam özet kaynağı geçersiz.');
 if(source.searchParams.has('cc')||source.searchParams.has('country'))throw Error('Steam ülke filtresi kullanılmaz.');
}
export function steamReviewSummary(input,appid,retrievedAt=new Date().toISOString(),sourceUrl=steamReviewUrl(appid)){
 validateSteamReviewSource(sourceUrl,appid);
 const data=input?.response||input,q=data?.query_summary;
 if(input?.success!==undefined&&input.success!==1)throw Error('Steam özeti başarısız.');
 const positive=q?.total_positive,negative=q?.total_negative,total=q?.total_reviews;
 if(![positive,negative,total].every(n=>Number.isSafeInteger(n)&&n>=0)||positive+negative!==total)throw Error('Steam değerlendirme sayıları uyuşmuyor.');
 return {positivePercent:total?Math.round(positive/total*10000)/100:null,total,positive,negative,scope:'all-languages',languages:['all'],countryFilter:null,purchaseType:'all',offTopicIncluded:true,retrievedAt,url:`https://store.steampowered.com/app/${appid}/#app_reviews_hash`,sourceUrl};
}
export function validAllSteamReview(review,appid){
 try{const link=new URL(review?.url);if(link.protocol!=='https:'||link.hostname!=='store.steampowered.com')return false;const match=link.pathname.match(/^\/app\/(\d+)\/$/),id=Number(match?.[1]);if(appid!==undefined&&id!==appid)return false;validateSteamReviewSource(review.sourceUrl,id);}catch{return false;}
 return review?.scope==='all-languages'&&review.languages?.length===1&&review.languages[0]==='all'&&review.countryFilter===null&&review.purchaseType==='all'&&review.offTopicIncluded===true&&[review.positive,review.negative,review.total].every(n=>Number.isSafeInteger(n)&&n>=0)&&review.positive+review.negative===review.total&&(review.total?Number.isFinite(review.positivePercent)&&Math.abs(review.positivePercent-Math.round(review.positive/review.total*10000)/100)<0.000001:review.positivePercent===null)&&Number.isFinite(Date.parse(review.retrievedAt));
}
export async function fetchSteamReviews(appid){const url=steamReviewUrl(appid),r=await fetch(url,{headers:{'User-Agent':'NeOynasam/2.0 PC discovery'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Steam değerlendirme kaynağı yanıt vermedi.');return steamReviewSummary(await r.json(),appid,new Date().toISOString(),url);}

// Başarısız/eski kaynak yenilemesi mevcut özeti veya geçmişi silemez.
export function preserveSteamReviewHistory(previous,incoming,appid){
 let review=incoming.steamReview,old=previous.steamReview;
 if(review?.scope==='all-languages'&&!validAllSteamReview(review,appid))throw Error('Steam yenileme kaydı geçersiz.');
 if(old&&(!review||(validAllSteamReview(old,appid)&&(!validAllSteamReview(review,appid)||Date.parse(review.retrievedAt)<Date.parse(old.retrievedAt)))))review=old;
 const history=[...(previous.steamReviewHistory||[]),...(incoming.steamReviewHistory||[])];
 if(old&&review&&JSON.stringify(old)!==JSON.stringify(review))history.push(old);
 const unique=[...new Map(history.map(r=>[JSON.stringify(r),r])).values()];
 return {...(review!==undefined?{steamReview:review}:{}),...(unique.length?{steamReviewHistory:unique}:{})};
}
