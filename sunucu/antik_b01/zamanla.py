# Ses parçalarının sürelerinden sahne zamanlarını ve kelime zamanlarını çıkarır. Kullanım: python zamanla.py <ses_klasoru> <cikti.json>
import json, sys, subprocess, glob, os
d, out = sys.argv[1], sys.argv[2]
ONCE, ARA, SON = 0.25, 0.45, 2.0   # sahne başında sessizlik, sahneler arası boşluk, son kart
sahneler, kelimeler, bas = [], [], 0.0
parcalar = sorted(glob.glob(os.path.join(d, 'p*.mp3')))
for i, mp3 in enumerate(parcalar):
    sure = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',mp3]).decode().strip())
    al = json.load(open(mp3.replace('.mp3','.json'), encoding='utf-8'))
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    w, ws = '', None
    for c, s, e in zip(ch, st, en):
        if c.isspace():
            if w: kelimeler.append({'w': w, 's': round(bas+ONCE+ws, 3), 'e': round(bas+ONCE+we, 3)}); w = ''
            continue
        if not w: ws = s
        w += c; we = e
    if w: kelimeler.append({'w': w, 's': round(bas+ONCE+ws, 3), 'e': round(bas+ONCE+we, 3)})
    s_sure = ONCE + sure + ARA + (SON if i == len(parcalar)-1 else 0)
    sahneler.append({'bas': round(bas, 3), 'sure': round(s_sure, 3), 'ses_bas': round(bas+ONCE, 3), 'ses': os.path.basename(mp3)})
    bas += s_sure
json.dump({'sahneler': sahneler, 'kelimeler': kelimeler, 'toplam': round(bas, 3)}, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print(f"zaman tamam: {len(sahneler)} sahne, {len(kelimeler)} kelime, {bas:.1f} sn")
