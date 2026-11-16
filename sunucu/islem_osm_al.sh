#!/bin/bash
# OpenStreetMap yol verisini (Overpass) çeker, sıkıştırıp loga basar. Kozmos Lab B8 navigasyon için (Ankara: Kızılay → Anıtkabir).
set -u
Q='[out:json][timeout:60];(way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|primary_link|secondary_link|tertiary_link)$"](39.9135,32.8300,39.9325,32.8600);way["tourism"="attraction"]["name"~"Anıtkabir"](39.92,32.83,39.93,32.845);way["leisure"="park"](39.9135,32.8300,39.9325,32.8600););out geom;'
curl -s -m 90 --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter -o /tmp/osm.json || curl -s -m 90 --data-urlencode "data=$Q" https://overpass.kumi.systems/api/interpreter -o /tmp/osm.json
python3 - <<'P'
import json,gzip,base64
d=json.load(open('/tmp/osm.json'));out=[]
for e in d.get('elements',[]):
    if e.get('type')=='way' and 'geometry' in e:
        out.append([e['tags'].get('highway') or e['tags'].get('leisure') or e['tags'].get('tourism'),e['tags'].get('name',''),[[round(p['lat'],6),round(p['lon'],6)] for p in e['geometry']]])
b=base64.b64encode(gzip.compress(json.dumps(out,ensure_ascii=False).encode())).decode()
print('NOT: OSM yol sayısı',len(out),'bayt',len(b))
print('===OSM==='+b+'===SON===')
P
