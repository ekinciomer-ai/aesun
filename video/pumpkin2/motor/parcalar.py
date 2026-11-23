"""Seslendirme parçalarını (P01.mp3 ... P10.mp3) tek bir ses dosyasına diz; kelime saatlerini ve ağız zarfını çıkar.
Kullanım: python3 -I parcalar.py <mp3_klasörü> <kod> <metin.json> <hikaye_klasörü>
  metin.json: {"parcalar": [["P01", "metin", boşluk_sn], ...]}  (boşluk = bu parçadan SONRA bırakılacak sessizlik)
Çıktı: <hikaye>/voice/voice.wav, words.json (her kelimede "part"), env.json (kare başına 0..1)
Kelime saati: parçanın içindeki sesli bölümler bulunur; kelimeler harf sayılarına göre bu sesli zamana dağıtılır
(sessizlikler atlanır, böylece "..." duraklarında altyazı da durur)."""
import sys, json, os, subprocess, re, numpy as np
SR = 48000
mdir, kod, metin, story = sys.argv[1:5]
P = json.load(open(metin, encoding='utf-8'))['parcalar']

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

def trim(x, th=.012):
    h = int(.01 * SR); e = np.sqrt(np.convolve(x ** 2, np.ones(h) / h, 'same'))
    on = np.where(e > th * max(e.max(), 1e-9) * 3)[0]
    if not len(on): return x
    a, b = max(0, on[0] - int(.03 * SR)), min(len(x), on[-1] + int(.06 * SR))
    return x[a:b]

out, words, t = [], [], .12                     # 0,12 sn baş sessizliği
out.append(np.zeros(int(t * SR)))
for ad, txt, gap in P:
    x = trim(load(os.path.join(mdir, f'{kod}__{ad}.mp3')))
    n = len(x); h = int(.01 * SR)
    fr = n // h; e = np.sqrt((x[:fr * h].reshape(fr, h) ** 2).mean(1))
    voiced = e > .08 * e.max()
    # kısa boşlukları (<120 ms) sesli say
    v = voiced.copy(); i = 0
    while i < fr:
        if not v[i]:
            j = i
            while j < fr and not v[j]: j += 1
            if j - i < 12 and i > 0 and j < fr: v[i:j] = True
            i = j
        else: i += 1
    vt = np.cumsum(v) / 100.0                  # kümülatif sesli süre (sn), kare kare
    total = vt[-1] if fr else 0
    toks = txt.split()
    w8 = np.array([len(re.sub(r'[^\w]', '', w)) + 1.5 for w in toks], float); cw = np.r_[0, np.cumsum(w8)] / w8.sum()
    def at(frac):                               # sesli süre oranı -> parça içi zaman
        target = frac * total
        k = int(np.searchsorted(vt, target)); return min(k, fr) / 100.0
    for k, w in enumerate(toks):
        s, e2 = at(cw[k]), at(cw[k + 1])
        words.append({'word': w, 'start': round(t + s, 3), 'end': round(t + max(e2, s + .08), 3), 'part': ad})
    out.append(x); t += n / SR
    out.append(np.zeros(int(gap * SR))); t += gap
y = np.concatenate(out); y = y / max(np.abs(y).max(), 1e-9) * .89
os.makedirs(os.path.join(story, 'voice'), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', os.path.join(story, 'voice', 'voice.wav')], input=y.tobytes(), check=True)
json.dump({'words': words, 'duration': round(len(y) / SR, 3)}, open(os.path.join(story, 'voice', 'words.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
# ağız zarfı: kare başına (30 fps) RMS, 0..1
h = SR // 30; fr = len(y) // h; e = np.sqrt((y[:fr * h].reshape(fr, h) ** 2).mean(1)); e = np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)
json.dump([round(float(v), 3) for v in e], open(os.path.join(story, 'voice', 'env.json'), 'w'))
print(f'{len(words)} kelime, {len(y) / SR:.2f} sn')
for ad, *_ in P:
    ws = [w for w in words if w['part'] == ad]; print(f"  {ad}: {ws[0]['start']:.2f}-{ws[-1]['end']:.2f}  {' '.join(w['word'] for w in ws)[:60]}")
