"""Puan alt kümesinin kaynak kodunu ve saklanan girdilerini yeniden paketle."""
import gzip
import io
from pathlib import Path
import shutil
import tarfile

files = [
 'scripts/refresh-metacritic-scores.mjs', 'scripts/import-reviewed-metacritic.mjs',
 'scripts/import-direct-metacritic.mjs', 'scripts/package-score-source.py',
 'lib/metacritic-identity.mjs', 'lib/metacritic-observation.mjs', 'lib/metacritic-platform.mjs',
 'data/catalog.json', 'data/metacritic-score-input.json', 'data/metacritic-identity-evidence.json',
 'data/metacritic-reviewed-facts.json', 'data/metacritic-score-history.json',
 'data/metacritic-score-updates.json', 'data/metacritic-direct-score-updates.json',
 'data/game-identities.json', 'data/metacritic-users.json', 'data/METACRITIC-REPORT.json',
 'data/METACRITIC-STEP3-REPORT.json', 'data/METACRITIC-DIRECT-REPORT.json',
 'data/PC-IMPORT-REPORT.json', 'data/METACRITIC-SOURCES.md', 'public/score-data-LICENSE.txt',
] + [str(p) for p in sorted(Path('data/metacritic-direct-batches').glob('*.json'))]
buffer = io.BytesIO()
with tarfile.open(fileobj=buffer, mode='w') as archive:
 for name in files:
  info = archive.gettarinfo(name, arcname=name)
  info.uid = info.gid = info.mtime = 0
  info.uname = info.gname = ''
  with open(name, 'rb') as source:
   archive.addfile(info, source)
Path('public/score-data-source.tar.gz').write_bytes(gzip.compress(buffer.getvalue(), mtime=0))
shutil.copyfile('scripts/refresh-metacritic-scores.mjs', 'public/score-data-source.mjs')
print(f'Puan kaynak paketi güncellendi: {len(files)} dosya.')
