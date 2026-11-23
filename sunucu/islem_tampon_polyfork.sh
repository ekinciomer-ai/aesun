#!/bin/bash
# Tampon bölge: Polyfork (polyfork.dev) low-poly 3D model kataloğunu dener.
# Yalnız /opt/tampon/polyfork altına yazar; canlı sistemlere dokunmaz.
# Lisans (23.11.2026 okundu): kişisel+ticari kullanım serbest, değiştirilebilir, atıf gerekmez.
#   Ücretsiz modellerin GLB (mesh) dosyaları ayrıca CC BY 4.0; .mjs kaynak ve HD sürümler yeniden dağıtılamaz.
set -uo pipefail
SD=$(cd "$(dirname "$0")" && pwd)
T=/opt/tampon/polyfork; M=$T/modeller; K=$T/kapak; V=$T/vendor; D=/opt/tampon/disari
mkdir -p $M $K $V $T/mjs_inceleme $D
cd $T
UA="Mozilla/5.0 (aesun-tampon)"

# 1) Katalog + lisans metni
curl -sS -L --max-time 60 -o catalog.json https://raw.githubusercontent.com/lucas-martinic/polyfork-catalog/main/catalog.json \
  && echo "NOT: katalog indi ($(python3 -c "import json;print(len(json.load(open('catalog.json'))['assets']))") model)" || { echo "NOT: HATA katalog inmedi"; exit 1; }
curl -sS -L --max-time 60 -A "$UA" -o lisans.html https://polyfork.dev/licensing && echo "NOT: lisans sayfası kaydedildi ($(wc -c < lisans.html) bayt)" || echo "NOT: lisans sayfası alınamadı"
python3 - <<'P' | sed 's/^/NOT: lisans: /'
import re,html
t=open('lisans.html',encoding='utf-8',errors='ignore').read()
t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S);t=html.unescape(re.sub(r'<[^>]+>',' ',t));t=re.sub(r'\s+',' ',t)
for k in ['commercial','attribution','redistribut','CC BY','AI','resell','prohibit','may not']:
  i=t.find(k)
  if i>=0: print(k,'=>',t[max(0,i-120):i+160].strip())
P

# 2) Örnek modeller (GES şantiye, tarih, bina, araç, insan, doğa)
LISTE="solar-array-rack-789c93 roof-solar-array-c4b996 solar-panel-wing-a66d89 mobile-crane-671d3f tower-crane-top-d8d9c9 tower-crane-mast-1784a3 tracked-excavator-8ebd3c mini-excavator-cbe1ae crawler-bulldozer-b851fb concrete-mixer-truck-4a8d94 articulated-dump-truck-ee50f3 cargo-forklift-91f591 cargo-container-fd73bc pickup-truck-a34bf2 compact-tractor-35b84b construction-worker-c1ad8c groundworker-083f5c crane-banksman-3994e0 scaffolding-section-6554c0 cement-mixer-on-a-8fb979 arched-stone-bridge-9474cf broken-stone-column-c91287 armoured-knight-hero-07121f barded-war-horse-6e921e camel-base commander-s-tent-c8b8b5 adobe-colonial-farmhouse-cf13d8 brick-church-322885 blue-domed-chapel-297391 boxy-sedan-70s-7d55f7 oak-tree-50ee7c tall-pine-tree-ab4108"
bas=$(date +%s); ok=0; hata=0
for id in $LISTE; do
  if curl -sS -L --max-time 60 -A "$UA" -o $M/$id.glb https://polyfork.dev/cdn/$id.glb; then
    if [ "$(head -c 4 $M/$id.glb)" = "glTF" ]; then ok=$((ok+1)); else echo "NOT: $id GLB değil"; rm -f $M/$id.glb; hata=$((hata+1)); fi
  else echo "NOT: $id inmedi"; hata=$((hata+1)); fi
  tn=$(python3 -c "import json;print(next(x['thumbnail'] for x in json.load(open('catalog.json'))['assets'] if x['id']=='$id'))" 2>/dev/null)
  [ -n "$tn" ] && curl -sS -L --max-time 30 -A "$UA" -o $K/$id.png "$tn" || true
  sleep 0.3
done
echo "NOT: GLB indirme $ok başarılı, $hata hatalı, $(( $(date +%s)-bas )) sn, toplam $(du -sh $M | cut -f1)"

# 3) GLB doğrulama: glTF 2.0 yapısı, üçgen, doku, dış bağlantı
python3 - <<'P' | sed 's/^/NOT: /'
import json,struct,glob,os
toplam=0;dis=0;sorun=0
for f in sorted(glob.glob('/opt/tampon/polyfork/modeller/*.glb')):
  b=open(f,'rb').read();toplam+=len(b)
  try:
    mg,ver,ln=struct.unpack('<4sII',b[:12]);cl,ct=struct.unpack('<I4s',b[12:20]);j=json.loads(b[20:20+cl])
    tri=0
    for m in j.get('meshes',[]):
      for p in m['primitives']:
        a=j['accessors'][p['indices']] if 'indices' in p else j['accessors'][p['attributes']['POSITION']]
        tri+=a['count']//3
    uris=[x.get('uri','') for x in j.get('images',[])+j.get('buffers',[]) if x.get('uri')]
    ext=[u for u in uris if u.startswith('http')]; dis+=len(ext)
    if ver!=2 or ln!=len(b): sorun+=1
  except Exception as e: sorun+=1; print('HATA',os.path.basename(f),e)
print(f'doğrulama: bozuk={sorun}, dış bağlantılı={dis}, ortalama boyut={toplam//max(1,len(glob.glob("/opt/tampon/polyfork/modeller/*.glb")))//1024} KB')
P

# 4) .mjs güvenlik incelemesi (yalnız incelenir, dağıtılmaz)
for id in solar-array-rack-789c93 mobile-crane-671d3f construction-worker-c1ad8c oak-tree-50ee7c; do
  curl -sS -L --max-time 30 -A "$UA" -o $T/mjs_inceleme/$id.mjs https://polyfork.dev/cdn/$id.mjs || continue
  f=$T/mjs_inceleme/$id.mjs
  risk=$(grep -o -E 'fetch\(|XMLHttpRequest|sendBeacon|WebSocket|eval\(|new Function|document\.cookie|localStorage|navigator\.|import\(' $f | sort | uniq -c | tr '\n' ' ')
  imp=$(grep -o -E "from ['\"][^'\"]+['\"]" $f | sort -u | tr '\n' ' ')
  echo "NOT: mjs $id: $(wc -c <$f) bayt; riskli çağrı: ${risk:-yok}; importlar: ${imp:-yok}"
done

# 5) Yerel three.js (dış CDN bağımlılığı olmasın)
for p in build/three.module.js build/three.core.js examples/jsm/loaders/GLTFLoader.js examples/jsm/controls/OrbitControls.js examples/jsm/utils/BufferGeometryUtils.js; do
  mkdir -p $V/three/$(dirname $p); curl -sS -L --max-time 60 -o $V/three/$p https://cdn.jsdelivr.net/npm/three@0.180.0/$p || echo "NOT: three $p inmedi"
done
echo "NOT: three.js yerel kopya $(du -sh $V | cut -f1)"

# 6) Test sayfası + dışarı paket
python3 - <<'P'
import json
c={x['id']:x for x in json.load(open('/opt/tampon/polyfork/catalog.json'))['assets']}
import glob,os
ids=[os.path.basename(f)[:-4] for f in sorted(glob.glob('/opt/tampon/polyfork/modeller/*.glb'))]
json.dump([{'id':i,'ad':c[i]['title'],'tur':c[i]['type'],'ucgen':c[i]['triangles']} for i in ids],open('/opt/tampon/polyfork/liste.json','w'),ensure_ascii=False)
P
cp "$SD/tampon_polyfork/index.html" $T/index.html || echo "NOT: HATA test sayfası kopyalanamadı"
cd $T && tar czf $D/polyfork_test.tgz index.html liste.json modeller kapak vendor lisans.html catalog.json && echo "NOT: dışarı paket $(du -h $D/polyfork_test.tgz | cut -f1)"
echo "NOT: tampon klasörü $(du -sh $T | cut -f1)"
