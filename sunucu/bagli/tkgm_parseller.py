"""Kurtuluş Mah. (Bağlıkaya, mahalleId 208169) parsellerini TKGM parsel sorgu servisinden çeker.
Ada 438–465, parsel 1–40 taranır; ard arda 8 boş parselde adayı bırakır. İstekler arasında 0,8 sn beklenir.
Çıktı: parseller_tkgm.json (yerel metrik xy, orijin 38.497350 K · 33.919770 D)"""
import json, math, sys, time, urllib.request, os
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
MAH = 208169; LAT0, LON0, R = 38.497350, 33.919770, 6371008.8; COS = math.cos(math.radians(38.499735))
xy = lambda lon, lat: [round(math.radians(lon - LON0) * R * COS, 2), round(math.radians(lat - LAT0) * R, 2)]
H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Referer': 'https://parselsorgu.tkgm.gov.tr/', 'Origin': 'https://parselsorgu.tkgm.gov.tr', 'Accept': 'application/json'}
def al(ada, p):
    u = f'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api/parsel/{MAH}/{ada}/{p}'
    for k in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=12); return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (404, 400, 204): return None
            print('HTTP', e.code, ada, p, flush=True); time.sleep(3)
        except Exception as e: print('HATA', ada, p, e, flush=True); time.sleep(2)
    return 'hata'
sonuc, hata = [], 0
# önce erişim testi
t = al(446, 1); print('TEST 446/1:', 'ok' if isinstance(t, dict) else t, flush=True)
if not isinstance(t, dict): sys.exit(0)
for ada in range(438, 466):
    bos, enbuyuk = 0, 0
    for p in range(1, 41):
        d = al(ada, p); time.sleep(0.8)
        if d == 'hata': hata += 1; continue
        if not d or not d.get('geometry'): bos += 1
        else:
            bos = 0; enbuyuk = p; pr = d.get('properties', {}); g = d['geometry']
            ring = g['coordinates'][0] if g['type'] == 'Polygon' else g['coordinates'][0][0]
            sonuc.append({'id': f'{ada}/{p}', 'ada': ada, 'parsel': p, 'm2': float(str(pr.get('alan', '0')).replace('.', '').replace(',', '.') or 0), 'nitelik': pr.get('nitelik'), 'pafta': pr.get('pafta'), 'xy': [xy(c[0], c[1]) for c in ring]})
        if bos >= 8 and p > enbuyuk + 7: break
    print('ada', ada, 'en büyük parsel', enbuyuk, 'toplam', len(sonuc), flush=True)
    json.dump(sonuc, open(os.path.join(OUT, 'parseller_tkgm.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(sonuc, open(os.path.join(OUT, 'parseller_tkgm.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('TKGM_BITTI', len(sonuc), 'hata', hata)
