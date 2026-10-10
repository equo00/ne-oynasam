#!/usr/bin/env python3
"""Doğrulanmış oyun kimliklerinden küçük, devam ettirilebilir özellik grupları."""
import json,subprocess,concurrent.futures,time,datetime,argparse,urllib.parse
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--batch-size',type=int,default=50);parser.add_argument('--workers',type=int,default=4);parser.add_argument('--max-batches',type=int,default=100);parser.add_argument('--method',choices=['browse','details'],default='browse');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];file=root/'data/steam-gameplay.json'
seed=json.loads((root/'data/catalog.json').read_text());definitions=[('single',2,'Single-player'),('coop',9,'Co-op'),('coop-online',38,'Online Co-op'),('coop-lan',48,'LAN Co-op'),('coop-local',39,'Shared/Split Screen Co-op'),('pvp',49,'PvP'),('pvp-online',36,'Online PvP'),('pvp-lan',47,'LAN PvP'),('pvp-local',37,'Shared/Split Screen PvP'),('cross-play',27,'Cross-Platform Multiplayer'),('remote-play-together',44,'Remote Play Together')]
data=json.loads(file.read_text()) if file.exists() else {'schemaVersion':1,'policy':'verified-steam-store-categories','changes':[],'failed':[]}
byid={r['gameId']:r for r in data['changes']};failed={r['gameId']:r for r in data['failed']};pending=[g for g in seed if g['id'] not in byid]
def fetch(g):
 appid=g['steamAppId'];url=f'https://store.steampowered.com/api/appdetails?appids={appid}&filters=basic,categories&l=english'
 try:
  raw=subprocess.check_output(['curl','-fsS','--retry','1','--retry-delay','2','--max-time','18',url],stderr=subprocess.DEVNULL);wrapper=json.loads(raw).get(str(appid),{});d=wrapper.get('data',{})
  if not wrapper.get('success') or d.get('steam_appid')!=appid or d.get('type')!='game' or not isinstance(d.get('name'),str) or not d.get('categories'):raise ValueError('Kimlik veya özellik kaydı bulunamadı')
  categories=[{'id':c['id'],'description':c['description']} for c in d['categories'] if isinstance(c.get('id'),int) and isinstance(c.get('description'),str)]
  features={key:True if any(c['id']==i and c['description']==label for c in categories) else None for key,i,label in definitions}
  for kind in ['coop','pvp']:
   if any(v is True for k,v in features.items() if k.startswith(kind+'-')):features[kind]=True
  stamp=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
  return {'gameId':g['id'],'steamAppId':appid,'gameplay':{'steamAppId':appid,'sourceName':d['name'],'sourceKind':'steam-store-categories','sourceUrl':f'https://store.steampowered.com/app/{appid}/','retrievedAt':stamp,'categories':categories,'features':features,'crossPlayPlatforms':None}},None
 except Exception as e:return None,{'gameId':g['id'],'steamAppId':appid,'reason':str(e)}
 finally:time.sleep(.25)
def browse(group):
 params={'ids':[{'appid':g['steamAppId']} for g in group],'context':{'language':'english','country_code':'US'},'data_request':{'include_basic_info':True}}
 url='https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?'+urllib.parse.urlencode({'input_json':json.dumps(params)})
 raw=subprocess.check_output(['curl','-fsS','--retry','1','--max-time','25',url],stderr=subprocess.DEVNULL)
 items=json.loads(raw).get('response',{}).get('store_items',[]);byapp={d.get('appid'):d for d in items}
 names={c['id']:c['description'] for r in byid.values() for c in r['gameplay']['categories']}
 # Önceki doğrudan mağaza kayıtlarında doğrulanmış kategori kimliği/adı eşlemesi.
 for _,i,label in definitions:
  if names.get(i)!=label:raise ValueError('Kategori kimliği doğrudan kaynakla doğrulanmamış: '+str(i))
 results=[]
 for g in group:
  d=byapp.get(g['steamAppId'],{});appid=g['steamAppId'];cats=d.get('categories',{})
  if d.get('id')!=appid or d.get('item_type')!=0 or d.get('type')!=0 or d.get('success')!=1 or not isinstance(d.get('name'),str) or not cats:
   results.append(fetch(g));continue
  ids=set(v for groupids in cats.values() if isinstance(groupids,list) for v in groupids if isinstance(v,int))
  categories=[{'id':i,'description':names.get(i,'Feature '+str(i))} for i in sorted(ids)]
  features={key:True if i in ids else None for key,i,label in definitions}
  for kind in ['coop','pvp']:
   if any(v is True for k,v in features.items() if k.startswith(kind+'-')):features[kind]=True
  stamp=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
  results.append(({'gameId':g['id'],'steamAppId':appid,'gameplay':{'steamAppId':appid,'sourceName':d['name'],'sourceKind':'steam-store-categories','sourceUrl':f'https://store.steampowered.com/app/{appid}/','sourceApi':'IStoreBrowseService/GetItems/v1','sourceContext':{'language':'english','countryCode':'US'},'retrievedAt':stamp,'categories':categories,'features':features,'crossPlayPlatforms':None}},None))
 return results
for batch in range(min(args.max_batches,(len(pending)+args.batch_size-1)//args.batch_size)):
 group=pending[batch*args.batch_size:(batch+1)*args.batch_size]
 if args.method=='browse':
  try:results=browse(group)
  except Exception as e:
   print('Toplu kaynak kullanılamadı:',str(e),flush=True)
   with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:results=list(pool.map(fetch,group))
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:results=list(pool.map(fetch,group))
 for g,(result,error) in zip(group,results):
  if result:byid[g['id']]=result;failed.pop(g['id'],None)
  else:failed[g['id']]=error
 data['changes']=[byid[g['id']] for g in seed if g['id'] in byid];data['failed']=list(failed.values());data['total']=len(seed)
 temp=file.with_suffix('.json.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));temp.replace(file)
 subprocess.run(['git','add','data/steam-gameplay.json'],cwd=root,check=True)
 subprocess.run(['git','commit','-m',f'Oynanış kaynaklarında {len(byid)} oyunu doğrula'],cwd=root,check=True,stdout=subprocess.DEVNULL)
 print(json.dumps({'verified':len(byid),'failed':len(failed),'total':len(seed)}),flush=True)
