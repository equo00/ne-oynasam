"""Extract only matched ordered tag facts from the already licensed SteamDB snapshot."""
import sys, json, gzip, re, unicodedata
from pathlib import Path
from datetime import datetime, timezone

def identity(s):
    return re.sub('[^a-z0-9]', '', ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower())

catalog=json.loads(Path('data/catalog.json').read_text())
wanted={g['steamAppId']:g for g in catalog}
tag_map={t['name']:t['tagid'] for t in json.loads(Path(sys.argv[2]).read_text())}
records={};rejected=[];decoder=json.JSONDecoder()
with gzip.open(sys.argv[1], 'rt') as source:
    buffer=source.read(65536);pos=0;started=False;done=False
    while not done:
        while pos<len(buffer) and buffer[pos].isspace():pos+=1
        if not started:
            if buffer[pos]!='[':raise ValueError('Expected JSON array')
            pos+=1;started=True
        while pos<len(buffer) and (buffer[pos].isspace() or buffer[pos]==','):pos+=1
        if pos<len(buffer) and buffer[pos]==']':break
        try:
            row,end=decoder.raw_decode(buffer,pos);pos=end
        except json.JSONDecodeError:
            chunk=source.read(65536)
            if not chunk:raise
            buffer=buffer[pos:]+chunk;pos=0;continue
        appid=row.get('steam_appid');game=wanted.get(appid)
        if not game:continue
        if identity(row.get('name',''))!=identity(game['name']):
            rejected.append({'steamAppId':appid,'name':game['name'],'sourceName':row.get('name'),'reason':'identity mismatch'});continue
        names=list(dict.fromkeys(t for t in row.get('tags',[]) if isinstance(t,str) and t in tag_map))[:20]
        if not names:continue
        records[str(appid)]={'steamAppId':appid,'identityTitle':game['name'],'tags':[{'id':tag_map[t],'name':t,'count':None} for t in names], 'sourceKind':'steamdb-snapshot','sourceUrl':'https://github.com/leinstay/steamdb/releases/tag/2026-10-04','snapshotDate':'2026-10-04','retrievedAt':datetime.now(timezone.utc).isoformat()}
Path(sys.argv[3]).write_text(json.dumps(records,separators=(',',':'),ensure_ascii=False))
print(json.dumps({'matched':len(records),'missingCount':sum(str(g['steamAppId']) not in records for g in catalog),'rejected':rejected}))
