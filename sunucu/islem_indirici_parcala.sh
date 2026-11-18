#!/bin/bash
# İndirici: rank/ içindeki sıralama derlemelerini ayrı kliplere böler, başlık/numara/altyazı yazılarını kaldırır.
# Araçlar: PySceneDetect (BSD-3), RapidOCR (Apache-2.0), OpenCV. Yalnız /opt/tampon/indirici içinde çalışır.
# Çıktı: /opt/tampon/indirici/disari/parcalar.tgz
set -u
KOK=/opt/tampon/indirici; G=$KOK/rank; C=$KOK/parcalar; mkdir -p $C $KOK/disari
$KOK/venv/bin/pip install -q "numpy<2.3" "opencv-python-headless<4.13" scenedetect rapidocr-onnxruntime >/dev/null 2>&1 || { echo "NOT: HATA paketler kurulamadı"; exit 1; }
cat > $KOK/parcala.py <<'PY'
#!/usr/bin/env python3
"""Sıralama derlemesini ayrı kliplere böler, yazıları kaldırır.
Kullanım: parcala.py <video.mp4> <cikti_klasoru>
1) Sahne geçişleri (PySceneDetect) -> klipler
2) Üst/alt sabit şeritler (başlık, kanal adı) kırpılır
3) Kalan yazılar (sıra numaraları, altyazı, filigran) OCR kutularıyla bulunur, çevreden doldurulur (inpaint)
"""
import sys, os, subprocess, json
import cv2, numpy as np
from scenedetect import detect, ContentDetector
from rapidocr_onnxruntime import RapidOCR

GIRIS, CIKTI = sys.argv[1], sys.argv[2]
os.makedirs(CIKTI, exist_ok=True)
AD = os.path.basename(GIRIS).split("__")[0]
MAKS_GEN = 1080          # çıktı genişliği üst sınırı (Shorts 1080x1920)
EN_KISA = 1.0            # saniye; daha kısa sahneler atılır
ocr = RapidOCR()

# AV1/VP9 gibi kodekleri OpenCV okuyamayabilir: önce 1080 genişlikte ara h264 kopya
ARA = os.path.join(CIKTI, f".{AD}_ara.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", GIRIS, "-vf", f"scale='min({MAKS_GEN},iw)':-2",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-an", ARA], check=True)

cap = cv2.VideoCapture(ARA)
FPS = cap.get(cv2.CAP_PROP_FPS) or 30
N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

def kare(i):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return f if ok else None

# --- 1) sahneler
sahneler = [(a.get_frames(), b.get_frames()) for a, b in detect(ARA, ContentDetector(threshold=27, min_scene_len=int(FPS*0.4)))]
if not sahneler: sahneler = [(0, N)]

# --- 2) sabit üst/alt şerit: zamansal değişimi çok düşük satırlar
ornek = [kare(i) for i in np.linspace(0, N-1, 40).astype(int)]
ornek = [cv2.cvtColor(cv2.resize(f, (W//4, H//4)), cv2.COLOR_BGR2GRAY).astype(np.float32) for f in ornek if f is not None]
std = np.std(np.stack(ornek), axis=0)          # piksel bazlı zamansal sapma
satir = np.median(std, axis=1)                  # satır bazlı
def serit(sira):
    n = 0
    for v in sira:
        if v < 6: n += 1
        else: break
    return n
ust = serit(satir) * 4; alt = serit(satir[::-1]) * 4
if ust < H*0.04: ust = 0
if alt < H*0.04: alt = 0
y0, y1 = ust, H - alt
# kırpılan alan çift sayı olsun
y0 += (y1 - y0) % 2

# --- 3) yazı maskesi: her sahnede ~4 kare/sn OCR, kutuların birleşimi
OL = 0.5  # OCR için küçültme
def kutular(f):
    k = cv2.resize(f[y0:y1], None, fx=OL, fy=OL)
    sonuc, _ = ocr(k, use_det=True, use_cls=False, use_rec=False)
    return [] if sonuc is None else [np.array(b[0] if isinstance(b[0][0], (list, tuple)) else b, dtype=np.float32) / OL for b in sonuc]

def sahne_maskesi(a, b):
    m = np.zeros((y1-y0, W), np.uint8)
    for i in range(a, b, max(1, int(FPS/2))):
        f = kare(i)
        if f is None: continue
        for kt in kutular(f):
            cv2.fillPoly(m, [kt.astype(np.int32)], 255)
    pay = max(3, W // 120)
    return cv2.dilate(m, np.ones((pay*2+1, pay*2+1), np.uint8))

# --- 4) her sahneyi yaz
olcek = min(1.0, MAKS_GEN / W)
OW = int(W*olcek)//2*2; OH = int((y1-y0)*olcek)//2*2
rapor = []
no = 0
for a, b in sahneler:
    if (b - a) / FPS < EN_KISA: continue
    orta = kare((a + b) // 2)
    if orta is None: continue
    g = cv2.cvtColor(orta[y0:y1], cv2.COLOR_BGR2GRAY)
    if g.mean() < 25 or g.std() < 12: continue   # siyah / boş geçiş karesi
    no += 1
    m = sahne_maskesi(a, b)
    m_k = cv2.resize(m, (OW, OH), interpolation=cv2.INTER_NEAREST)
    oran = float((m_k > 0).mean())
    hedef = os.path.join(CIKTI, f"{AD}_klip{no:02d}.mp4")
    ss, sure = a / FPS, (b - a) / FPS
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
        "-ss", f"{ss:.3f}", "-t", f"{sure:.3f}", "-i", GIRIS,
        "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", hedef],
        stdin=subprocess.PIPE)
    cap.set(cv2.CAP_PROP_POS_FRAMES, a)
    for _ in range(a, b):
        ok, f = cap.read()
        if not ok: break
        f = cv2.resize(f[y0:y1], (OW, OH), interpolation=cv2.INTER_AREA)
        if oran > 0: f = cv2.inpaint(f, m_k, 5, cv2.INPAINT_TELEA)
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()
    rapor.append({"klip": no, "baslangic": round(ss, 2), "sure": round(sure, 2), "yazi_orani": round(oran, 3)})

os.remove(ARA)
print(json.dumps({"video": AD, "kirpma_ust": int(ust), "kirpma_alt": int(alt), "klipler": rapor}, ensure_ascii=False))
PY
ls $G/*.mp4 >/dev/null 2>&1 || { echo "NOT: HATA rank klasörü boş"; exit 1; }
export OMP_NUM_THREADS=2
$KOK/venv/bin/python -c "import numpy, cv2, rapidocr_onnxruntime, scenedetect" 2>/tmp/imp.err || { echo "NOT: HATA kütüphane: $(tail -1 /tmp/imp.err | cut -c1-150)"; exit 1; }
ls $G/*.mp4 | xargs -P 4 -I{} sh -c 'nice -n 10 timeout 3000 '$KOK'/venv/bin/python '$KOK'/parcala.py "{}" '$C' > "{}.json" 2>"{}.log" || echo "NOT: HATA $(basename {}): $(tail -1 "{}.log" | cut -c1-150)"'
for j in $G/*.json; do python3 -c "import json,sys;d=json.load(open('$j'));print('NOT:',d['video'],'→',len(d['klipler']),'klip')" 2>/dev/null; done
rm -f $G/*.json $G/*.log
echo "NOT: toplam $(ls $C/*.mp4 | wc -l) klip · $(du -sh $C | cut -f1)"
tar cf $KOK/disari/parcalar.tgz -C $C . && echo "NOT: paket hazır"
