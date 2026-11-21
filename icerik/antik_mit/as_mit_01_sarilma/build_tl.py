"""Seslerin sürelerinden zaman çizelgesi (tl.json) kurar. Eksik ses için tahmini süre kullanır."""
import json, os, re, subprocess

VO = json.load(open('vo.json'))  # [{"ad":"V1","metin":"..."}...]
CPS = 15.5  # tahmini karakter/sn
GAP = 0.3

def dur(ad, metin):
    f = f'ses/{ad}.wav'
    if os.path.exists(f):
        return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])), True
    return round(len(metin) / CPS, 2), False

D = {"hook": 0, "olay": 6.5, "olay2": 15, "poll": 27, "rew": 34, "karar": 43, "ders": 54, "end": 64, "fin": 66}
segname = {"V1": "hook", "V2": "olay", "V3": "olay2", "V4": "poll", "V5": "rew", "V6": "karar", "V7": "ders"}
t = GAP
starts, durs, real = {}, {}, {}
seg = {}
for p in VO:
    d, r = dur(p['ad'], p['metin'])
    seg[segname[p['ad']]] = round(t - GAP, 3) if p['ad'] != 'V1' else 0
    starts[p['ad']] = t; durs[p['ad']] = d; real[p['ad']] = r
    t += d + GAP
    if p['ad'] == 'V4':
        cd0 = t; t += 5.2          # oylama geri sayımı
    if p['ad'] == 'V5':
        t += 0.4
seg['end'] = round(t, 3); seg['fin'] = round(t + 2.6, 3)

DIG = [(r'\bon beş\b', '15'), (r'\büç madeni', '3 madeni'), (r'\büç pet', '3 pet'), (r'yirmiden fazla', "20'den fazla")]
def caps_for(ad):
    m = VO_MAP[ad]
    for a, b in DIG: m = re.sub(a, b, m)
    parts = [x.strip() for x in re.split(r'(?<=[.!?:;])\s+|(?<=,)\s+', m) if x.strip()]
    chunks, cur = [], ''
    for x in parts:
        if cur and len(cur) + 1 + len(x) > 50: chunks.append(cur); cur = x
        else: cur = (cur + ' ' + x).strip()
    if cur: chunks.append(cur)
    tot = sum(len(c) for c in chunks); s = starts[ad]; out = []
    for c in chunks:
        d = durs[ad] * len(c) / tot
        # 2 satıra böl (~26 karakter)
        w = c.split(); l1 = ''
        while w and len(l1) + len(w[0]) < max(26, len(c) / 2): l1 = (l1 + ' ' + w.pop(0)).strip()
        txt = l1 + ('<br>' + ' '.join(w) if w else '')
        out.append([round(s, 2), round(s + d, 2), txt]); s += d
    return out

VO_MAP = {p['ad']: p['metin'] for p in VO}
caps = []
for p in VO: caps += caps_for(p['ad'])
# ipuçları: V5 cümle başlarına göre (ilk cümle "Geri saralım")
c5 = [c for c in caps if starts['V5'] <= c[0] < starts['V5'] + durs['V5']]
clue_t = [c5[min(i, len(c5) - 1)][0] for i in (1, 2, 3)]
TL = {
    "D": D, "seg": seg, "cd0": round(cd0, 2),
    "map": [[0, 0], [6.5, 2.4], [8.0, 3.8], [9.6, 5.6], [10.6, 7.0], [12.8, 8.8], [15, 12.5], [17, 19.5], [24, 25.5], [27, 25.5]],
    "rew": [[34, 12.5], [36.5, 4.0], [36.51, 20.0], [43, 23.0]],
    "clues": [[clue_t[0], "1", "Ceza tek bir olay için verilmedi"], [clue_t[1], "2", "Tutanak: olaylara 21–22 kişi karıştı"], [clue_t[2], "3", "O, sahaya hiçbir şey fırlatmadı"]],
    "reasons": ["Seyircisiz maç cezası 21–22 kişinin eylemi yüzünden verildi", "Zararın yarısı tek bir taraftara yüklenemez", "Onun kusuru ve cezaya etkisi ayrıca hesaplanmalı"],
    "hukum": "SONUÇ: Yerel mahkeme kararı BOZULDU", "onay": "YARGITAY BOZDU",
    "caps": caps, "vo": {k: [round(starts[k], 3), durs[k], real[k]] for k in starts}}
json.dump(TL, open('tl.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(seg), 'cd0', TL['cd0'], 'real:', [k for k in real if real[k]])
