"""Steam App ID'leriyle tüm dillerin özetini küçük, devam ettirilebilir gruplarda al."""
import argparse, concurrent.futures, datetime, json, math, subprocess, time
from pathlib import Path
from urllib.parse import urlencode

def fetch(game):
 appid=game['steamAppId']; params={'appid':appid,'languages':['all'],'review_type':0,'purchase_type':1,'filter':1,'filter_offtopic_activity':False,'num_per_page':1}
 url='https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?'+urlencode({'input_json':json.dumps(params,separators=(',',':'))})
 for attempt in range(3):
  r=subprocess.run(['curl','-fsS','--max-time','25',url],capture_output=True)
  try:
   data=json.loads(r.stdout); q=data.get('response',data)['query_summary']; counts=[q[k] for k in ['total_positive','total_negative','total_reviews']]
   if r.returncode or data.get('success',1)!=1 or any(type(n)!=int or n<0 for n in counts) or counts[0]+counts[1]!=counts[2]:raise ValueError('Özet sayıları uyuşmuyor')
   positive,negative,total=counts
   return {'gameId':game['id'],'steamAppId':appid,'review':{'positivePercent':math.floor(positive/total*10000+0.5)/100 if total else None,'total':total,'positive':positive,'negative':negative,'scope':'all-languages','languages':['all'],'countryFilter':None,'purchaseType':'all','offTopicIncluded':True,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'url':f'https://store.steampowered.com/app/{appid}/#app_reviews_hash','sourceUrl':url}},None
  except (ValueError,KeyError,TypeError):
   if attempt<2:time.sleep(2*(attempt+1))
 return None,{'gameId':game['id'],'steamAppId':appid,'error':'Steam özeti alınamadı veya doğrulanamadı'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--batch-size',type=int,default=50);p.add_argument('--max-batches',type=int,default=100);args=p.parse_args()
 if not 1<=args.batch_size<=100 or args.max_batches<1:p.error('Parça boyutu 1–100, grup sayısı pozitif olmalıdır')
 source=json.loads(Path('data/catalog.json').read_text());out=Path('data/steam-all-reviews.json')
 bundle=json.loads(out.read_text()) if out.exists() else {'schemaVersion':1,'policy':'all-languages-no-country-filter','changes':[],'failed':[]}
 done={r['gameId'] for r in bundle['changes']};pending=[g for g in source if g.get('steamAppId') and g['id'] not in done]
 for batch in range(args.max_batches):
  group=pending[batch*args.batch_size:(batch+1)*args.batch_size]
  if not group:break
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
   for row,error in pool.map(fetch,group):
    if row:bundle['changes'].append(row)
    if error:bundle['failed'].append(error)
  bundle['changes'].sort(key=lambda r:r['gameId']);success={r['gameId'] for r in bundle['changes']};bundle['failed']=list({r['gameId']:r for r in bundle['failed'] if r['gameId'] not in success}.values())
  tmp=out.with_suffix('.tmp');tmp.write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+'\n');tmp.replace(out)
  subprocess.run(['git','add','data/steam-all-reviews.json'],check=True)
  subprocess.run(['git','commit','-m',f"Steam tüm dil değerlendirmelerinde {len(success)} oyunu kaydet"],check=True,stdout=subprocess.DEVNULL)
  print(json.dumps({'saved':len(success),'target':len(source),'failed':len(bundle['failed'])}),flush=True)
  time.sleep(1)
if __name__=='__main__':main()
