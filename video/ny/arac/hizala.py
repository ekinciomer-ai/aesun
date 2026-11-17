# Tek parça anlatımı (tam.wav) metindeki paragraflara böler: faster-whisper kelime zamanları + metin eşleme.
# python3 hizala.py <tam.wav> <kuyruk.json> <çıktı klasörü>
import json, re, sys, os, difflib, subprocess
from faster_whisper import WhisperModel
wav, kf, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
P = json.load(open(kf, encoding="utf-8"))["parcalar"]
def n(w): return re.sub(r"[^a-zçğıöşü0-9]", "", w.lower().replace("İ", "i").replace("I", "ı"))
m = WhisperModel(os.environ.get("NY_WHISPER", "small"), device="cpu", compute_type="int8")
import numpy as np
ses = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", wav, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"]), np.float32)
seg, _ = m.transcribe(ses, language="tr", word_timestamps=True, beam_size=5)
W = [(n(w.word), w.start, w.end) for s in seg for w in s.words if n(w.word)]
S, bas = [], []
for p in P:
    bas.append(len(S)); S += [n(w) for w in p["metin"].split() if n(w)]
sm = difflib.SequenceMatcher(None, S, [w[0] for w in W], autojunk=False); es = {}
for a, b, k in sm.get_matching_blocks():
    for i in range(k): es[a + i] = b + i
def zaman(i):  # metin kelimesi i'nin başlangıcı (eşleşmeyense komşulardan tahmin)
    if i in es: return W[es[i]][1], W[es[i] - 1][2] if es[i] > 0 else 0
    sol = max([j for j in es if j < i], default=None); sag = min([j for j in es if j > i], default=None)
    if sol is None or sag is None: return None, None
    t0, t1 = W[es[sol]][2], W[es[sag]][1]; t = t0 + (t1 - t0) * (i - sol) / (sag - sol); return t, t
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]))
kes = [0.0]
for k in range(1, len(P)):
    s, onceki_son = zaman(bas[k])
    if s is None: sys.exit(f"HATA sınır {k} bulunamadı")
    kes.append(max(kes[-1] + .3, (s + onceki_son) / 2 if onceki_son else s - .08))
kes.append(dur)
print("eşleşen kelime", len(es), "/", len(S))
for k, p in enumerate(P):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ss", f"{kes[k]:.3f}", "-to", f"{kes[k+1]:.3f}", "-c:a", "pcm_s16le", f"{out}/{p['id']}.wav"], check=True)
    print(p["id"], f"{kes[k]:.2f}-{kes[k+1]:.2f}")
