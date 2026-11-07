"""Extrait des fichiers SHD-VAS 2020 (CNRC) les valeurs 2 %/50 ans par classe d'emplacement XA à XE.
Usage : python -I extract_shd.py <dossier SHD-VAS_2020> <sortie.json>
Le nom de la localité et les coordonnées viennent du nom de fichier (le contenu a des accents mal encodés)."""
import json
import os
import re
import sys

root, out = sys.argv[1], sys.argv[2]
KEYS = ['Sa0_2', 'Sa0_5', 'Sa1_0', 'Sa2_0', 'Sa5_0', 'Sa10_0', 'PGA', 'PGV']
data = []
for prov in sorted(os.listdir(root)):
    pdir = os.path.join(root, prov)
    if not os.path.isdir(pdir):
        continue
    for fn in sorted(os.listdir(pdir)):
        m = re.match(r'2020_([A-Z]{2})_(.+?)(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)\.csv$', fn)
        if not m:
            print('ignoré :', fn)
            continue
        name, lon, lat = m.group(2), float(m.group(3)), float(m.group(4))
        text = open(os.path.join(pdir, fn), 'rb').read().decode('utf-16-le', errors='replace')
        classes = {}
        for line in text.splitlines():
            cells = [c.strip() for c in line.split(',')]
            if cells and cells[0] in ('XA', 'XB', 'XC', 'XD', 'XE'):
                vals = [float(v) for v in cells[1:9]]
                classes[cells[0]] = dict(zip(KEYS, vals))
        if len(classes) != 5:
            print('incomplet :', fn, sorted(classes))
        data.append({'prov': m.group(1), 'name': name, 'lat': lat, 'lon': lon, 'classes': classes})
meta = {
    'source': 'CNRC, données sismiques de calcul CNB 2020 partie 4 (SHD-VAS 2020), doi 10.4224/nqzr-dz38',
    'probability': '2 % en 50 ans',
    'units': 'Sa et PGA en g ; PGV en m/s',
    'count': len(data),
}
json.dump({'meta': meta, 'sites': data}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(data), 'localités')
