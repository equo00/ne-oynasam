import {db} from './db';
import {ensureCatalogReady} from './catalog-bootstrap';
import {ensureMetacriticScores} from './metacritic-sync';
import {normalize,validId,statuses} from './security';
import type {Game} from './catalog';

export const CATALOG_API_VERSION=2;
export const MAX_GAME_LOOKUP=60;
export type CatalogQuery={q?:string;genres?:string[];tags?:number[];system?:string;features?:string;era?:string;mood?:string;rating?:number|null;sort?:string;page?:number;pageSize?:number;library?:boolean;status?:string;collection?:string;random?:boolean};
export class CatalogNotReady extends Error {
 constructor(public state:{ready:boolean;stage:string;cursor:string|null;processed:number}){super('Katalog hazırlanıyor. Birkaç saniye sonra yeniden dene.');}
}
export class CatalogQueryError extends Error {}
export async function catalogDatabase(){const database=db();const state=await ensureCatalogReady(database);if(!state.ready)throw new CatalogNotReady(state);await ensureMetacriticScores(database);return database;}
export function pendingCatalogResponse(e:unknown):Response|null{if(!(e instanceof CatalogNotReady))return null;return Response.json({apiVersion:2,ready:false,error:e.message,stage:e.state.stage,retryAfter:1},{status:202,headers:{'Cache-Control':'no-store','Retry-After':'1','X-Content-Type-Options':'nosniff'}});}
const one=(p:URLSearchParams,k:string)=>p.get(k)||'';
function integer(p:URLSearchParams,k:string,fallback:number,min:number,max:number){const v=one(p,k);if(!v)return fallback;if(!/^\d+$/.test(v)||Number(v)<min||Number(v)>max)throw new CatalogQueryError(`${k} geçersiz.`);return Number(v);}
export function parseCatalogQuery(p:URLSearchParams):CatalogQuery{
 const q=one(p,'q').trim();if(q.length>160)throw new CatalogQueryError('Arama en fazla 160 karakter olabilir.');if(searchTokens(q).length>12)throw new CatalogQueryError('Arama en fazla 12 sözcük olabilir.');
 const genres=[...new Set(p.getAll('genre').filter(Boolean))];if(genres.length>12||genres.some(x=>x.length>80))throw new CatalogQueryError('Tür seçimi geçersiz.');
 const rawTags=[...new Set(p.getAll('tag').filter(Boolean))];if(rawTags.length>20||rawTags.some(x=>!/^\d{1,9}$/.test(x)||Number(x)<1))throw new CatalogQueryError('Etiket seçimi geçersiz.');
 const system=one(p,'system'),features=one(p,'features'),era=one(p,'era'),mood=one(p,'mood'),sort=one(p,'sort')||'editor',status=one(p,'status'),collection=one(p,'collection');
 if(system&&!['Windows','macOS','Linux'].includes(system))throw new CatalogQueryError('PC işletim sistemi geçersiz.');
 if(features&&!['turkish','coop'].includes(features))throw new CatalogQueryError('Özellik geçersiz.');
 if(era&&!['2020','2010','classic'].includes(era))throw new CatalogQueryError('Dönem geçersiz.');
 if(mood&&!['relax','world','challenge','story','think'].includes(mood))throw new CatalogQueryError('Ruh hali geçersiz.');
 if(!['editor','new','old','name','rating','steam','views'].includes(sort))throw new CatalogQueryError('Sıralama geçersiz.');
 if(status&&!statuses.includes(status as typeof statuses[number]))throw new CatalogQueryError('Koleksiyon durumu geçersiz.');
 if(collection.length>100)throw new CatalogQueryError('Koleksiyon geçersiz.');
 const ratingRaw=one(p,'rating'),rating=ratingRaw?Number(ratingRaw):null;if(ratingRaw&&(!Number.isFinite(rating)||rating!<0||rating!>10))throw new CatalogQueryError('Puan filtresi geçersiz.');
 const library=one(p,'library');if(library&&!['0','1'].includes(library))throw new CatalogQueryError('Koleksiyon seçimi geçersiz.');
 const random=one(p,'random');if(random&&!['0','1'].includes(random))throw new CatalogQueryError('Keşif seçimi geçersiz.');
 return {q,genres,tags:rawTags.map(Number),system,features,era,mood,rating,sort,page:integer(p,'page',1,1,1000000),pageSize:integer(p,'pageSize',24,1,60),library:library==='1',status,collection,random:random==='1'};
}
export function searchTokens(value:string){return [...new Set(normalize(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').split(/[^\p{L}\p{N}]+/u).filter(Boolean))];}
const marks=(n:number)=>Array(n).fill('?').join(',');
function parsedGame(row:{payload:string;view_count?:number}):Game{const game=JSON.parse(row.payload) as Game;return {...game,viewCount:Number(row.view_count||0)};}
export function buildCatalogWhere(query:CatalogQuery,userId?:string|null){
 const args:unknown[]=[],where:string[]=[];
 if(query.library){if(!userId)throw new CatalogQueryError('Koleksiyonunu görmek için giriş yap.');where.push('EXISTS (SELECT 1 FROM library l WHERE l.user_id=? AND l.game_id=g.id)');args.push(userId);}else where.push("g.status='published'");
 // Archived PC entries remain resolvable in saved collections and direct links.
 where.push("EXISTS (SELECT 1 FROM catalog_game_platforms p WHERE p.game_id=g.id AND p.platform='PC')");
 if(query.status){if(!userId)throw new CatalogQueryError('Duruma göre filtrelemek için giriş yap.');where.push('EXISTS (SELECT 1 FROM library l WHERE l.user_id=? AND l.game_id=g.id AND l.status=?)');args.push(userId,query.status);}
 if(query.collection){if(!userId)throw new CatalogQueryError('Koleksiyonunu görmek için giriş yap.');where.push('EXISTS (SELECT 1 FROM list_games lg JOIN lists li ON li.id=lg.list_id WHERE lg.game_id=g.id AND lg.list_id=? AND li.user_id=?)');args.push(query.collection,userId);}
 for(const genre of query.genres||[]){where.push('EXISTS (SELECT 1 FROM catalog_game_genres gg JOIN catalog_genres d ON d.id=gg.genre_id WHERE gg.game_id=g.id AND d.name=?)');args.push(genre);}
 for(const tag of query.tags||[]){where.push('EXISTS (SELECT 1 FROM catalog_game_tags gt WHERE gt.game_id=g.id AND gt.tag_id=?)');args.push(tag);}
 if(query.system){where.push('EXISTS (SELECT 1 FROM catalog_game_systems sys WHERE sys.game_id=g.id AND sys.system=?)');args.push(query.system);}
 if(query.features==='turkish')where.push('g.has_turkish=1');if(query.features==='coop')where.push('g.has_coop=1');
 if(query.era==='2020')where.push('g.year>=2020');if(query.era==='2010')where.push('g.year BETWEEN 2010 AND 2019');if(query.era==='classic')where.push('g.year<=2009');
 if(query.mood){where.push('g.mood=?');args.push(query.mood);}
 if(query.rating!=null){where.push('g.score_value>=?');args.push(query.rating);}
 for(const token of searchTokens(query.q||'')){where.push('g.id IN (SELECT st.game_id FROM catalog_search_terms st WHERE st.token>=? AND st.token<?)');args.push(token,token+'\uffff');}
 return {sql:where.join(' AND '),args};
}
export const catalogSorts:Record<string,string>={editor:'g.sort_order ASC,g.id ASC',new:'g.year DESC,g.id ASC',old:'g.year IS NULL ASC,g.year ASC,g.sort_order ASC,g.id ASC',name:'g.name_search ASC,g.id ASC',rating:'g.score_value DESC,g.id ASC',steam:'g.steam_positive_percent DESC,g.id ASC',views:'COALESCE(v.count,0) DESC,g.sort_order ASC,g.id ASC'};
let metadataCache:{db:D1Database;revision:string;expires:number;value:any}|null=null;
export function invalidateCatalogMetadata(){metadataCache=null;}
export async function catalogMetadata(database?:D1Database){
 const d=database||await catalogDatabase();const revision=(await d.prepare("SELECT value FROM catalog_meta WHERE id='revision'").first<{value:string}>())?.value||'';if(metadataCache?.db===d&&metadataCache.revision===revision&&metadataCache.expires>Date.now())return metadataCache.value;
 const [stats,genres,tags,moods,stamp]=await Promise.all([
 d.prepare("SELECT COUNT(*) AS games,COALESCE(SUM(cover_present),0) AS covers,COUNT(score_value) AS scores,MAX(catalog_added_at) AS lastAdded FROM catalog_games WHERE status='published'").first<any>(),
 d.prepare('SELECT name FROM catalog_genres ORDER BY name').all<{name:string}>(),
 d.prepare('SELECT id,name,label FROM catalog_tags ORDER BY label').all<{id:number;name:string;label:string}>(),
 d.prepare("SELECT mood,COUNT(*) AS count FROM catalog_games WHERE status='published' GROUP BY mood").all<{mood:string;count:number}>(),
 d.prepare("SELECT fetched_at FROM catalog_cache WHERE id='wikidata-v1'").first<{fetched_at:string}>()
 ]);
 const value={catalogStats:{games:Number(stats?.games||0),covers:Number(stats?.covers||0),scores:Number(stats?.scores||0)},genres:genres.results.map(g=>g.name),steamTagLabels:Object.fromEntries(tags.results.map(t=>[t.id,t.label||t.name])),moodCounts:{'':Number(stats?.games||0),...Object.fromEntries(moods.results.map(m=>[m.mood,m.count]))},fetchedAt:stamp?.fetched_at||stats?.lastAdded||null};
 metadataCache={db:d,revision,expires:Date.now()+15000,value};return value;
}
export async function queryCatalog(query:CatalogQuery={},userId?:string|null){
 if(query.pageSize!=null&&(!Number.isInteger(query.pageSize)||query.pageSize<1||query.pageSize>60)||query.page!=null&&(!Number.isInteger(query.page)||query.page<1)||query.sort&&!catalogSorts[query.sort])throw new CatalogQueryError('Sayfalama veya sıralama geçersiz.');
 const d=await catalogDatabase(),w=buildCatalogWhere(query,userId),totalRow=await d.prepare(`SELECT COUNT(*) AS n FROM catalog_games g WHERE ${w.sql}`).bind(...w.args).first<{n:number}>(),total=Number(totalRow?.n||0),pageSize=query.random?1:query.pageSize||24,pageCount=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(query.page||1,pageCount),offset=query.random?Math.floor(Math.random()*total):(page-1)*pageSize,sort=catalogSorts[query.sort||'editor'];
 const rows=await d.prepare(`SELECT g.payload,COALESCE(v.count,0) AS view_count FROM catalog_games g LEFT JOIN game_views v ON v.game_id=g.id WHERE ${w.sql} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...w.args,pageSize,offset).all<{payload:string;view_count:number}>();
 return {apiVersion:2,ready:true,games:rows.results.map(parsedGame),total,page:query.random?1:page,pageSize,pageCount,...await catalogMetadata(d)};
}
export async function gamesByIds(ids:string[],database?:D1Database){if(ids.length>MAX_GAME_LOOKUP||!ids.every(validId))throw new CatalogQueryError('Bir istekte en fazla 60 geçerli oyun seçilebilir.');if(!ids.length)return [];const d=database||await catalogDatabase();const rows=await d.prepare(`SELECT g.id,g.payload,COALESCE(v.count,0) AS view_count FROM catalog_games g LEFT JOIN game_views v ON v.game_id=g.id WHERE g.id IN (${marks(ids.length)})`).bind(...ids).all<{id:string;payload:string;view_count:number}>();const byId=new Map(rows.results.map(r=>[r.id,parsedGame(r)]));return ids.map(id=>byId.get(id)).filter((g):g is Game=>!!g);}
export async function gamesBySteamIds(ids:number[],database?:D1Database){if(ids.length>MAX_GAME_LOOKUP||ids.some(id=>!Number.isSafeInteger(id)||id<1||id>99999999))throw new CatalogQueryError('Bir istekte en fazla 60 geçerli mağaza kimliği seçilebilir.');if(!ids.length)return [];const d=database||await catalogDatabase();const rows=await d.prepare(`SELECT g.payload,COALESCE(v.count,0) AS view_count FROM catalog_games g LEFT JOIN game_views v ON v.game_id=g.id WHERE g.status='published' AND EXISTS (SELECT 1 FROM catalog_game_platforms p WHERE p.game_id=g.id AND p.platform='PC') AND g.steam_app_id IN (${marks(ids.length)})`).bind(...ids).all<{payload:string;view_count:number}>();const bySteam=new Map(rows.results.map(r=>{const g=parsedGame(r);return [g.steamAppId,g]}));return ids.map(id=>bySteam.get(id)).filter((g):g is Game=>!!g);}
export async function gameById(id:string){if(!validId(id))return null;return (await gamesByIds([id]))[0]||null;}
export async function gameBySourceId(source:string,externalId:string,database?:D1Database){const d=database||await catalogDatabase();const row=await d.prepare('SELECT game_id FROM catalog_source_ids WHERE source=? AND external_id=?').bind(source,externalId).first<{game_id:string}>();return row?(await gamesByIds([row.game_id],d))[0]||null:null;}

export async function baseGamesByIds(ids:string[],database?:D1Database){if(ids.length>MAX_GAME_LOOKUP||!ids.every(validId))throw new CatalogQueryError('Bir istekte en fazla 60 geçerli oyun seçilebilir.');if(!ids.length)return [];const d=database||await catalogDatabase();const rows=await d.prepare(`SELECT id,base_payload FROM catalog_games WHERE id IN (${marks(ids.length)})`).bind(...ids).all<{id:string;base_payload:string}>();const byId=new Map(rows.results.map(row=>[row.id,JSON.parse(row.base_payload) as Game]));return ids.map(id=>byId.get(id)).filter((g):g is Game=>!!g);}
