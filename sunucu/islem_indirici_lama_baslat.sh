#!/bin/bash
# İndirici: LaMa ile bölme + yazı silme işini sunucuda ARKA PLANDA başlatır (GitHub süre sınırına takılmaz).
# Diğer sistemleri yavaşlatmamak için en fazla 4 çekirdek (CPUQuota=400%), 6 GB bellek, düşük öncelik.
set -u
KOK=/opt/tampon/indirici; C=$KOK/parcalar_v2; mkdir -p $KOK/model $KOK/disari $C
if systemctl is-active --quiet tampon-parcala; then echo "NOT: zaten çalışıyor"; exit 0; fi
$KOK/venv/bin/pip install -q "numpy<2.3" "opencv-python-headless<4.13" scenedetect rapidocr-onnxruntime onnxruntime >/dev/null 2>&1 || { echo "NOT: HATA paketler"; exit 1; }
[ -s $KOK/model/lama_fp32.onnx ] || { curl -fsSL --max-time 900 -o $KOK/model/l.tmp https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx && mv $KOK/model/l.tmp $KOK/model/lama_fp32.onnx; } || { echo "NOT: HATA model"; exit 1; }
cat > $KOK/lama.py <<'PY'
"""LaMa (ONNX) ile yazı silme yardımcıları. Model: Carve/LaMa-ONNX (Apache-2.0)."""
import cv2, numpy as np, onnxruntime as ort, os

class Lama:
    def __init__(self, yol, thread=2):
        so = ort.SessionOptions(); so.intra_op_num_threads = thread
        self.s = ort.InferenceSession(yol, so, providers=["CPUExecutionProvider"])
        self.g = [i.name for i in self.s.get_inputs()]

    def _calis(self, img, m):
        x = cv2.resize(img, (512, 512), interpolation=cv2.INTER_AREA)[:, :, ::-1].astype(np.float32) / 255.0
        mk = (cv2.resize(m, (512, 512), interpolation=cv2.INTER_NEAREST) > 0).astype(np.float32)
        x = x.transpose(2, 0, 1)[None]; mk = mk[None, None]
        y = self.s.run(None, {self.g[0]: x, self.g[1]: mk})[0][0].transpose(1, 2, 0)
        if y.max() <= 1.5: y = y * 255.0
        return np.clip(y, 0, 255).astype(np.uint8)[:, :, ::-1]

    def doldur(self, f, m):
        """f: BGR kare, m: 0/255 maske. Maskenin çevresini kare pencereyle 512'ye indirip doldurur, yalnız maskeli pikselleri değiştirir."""
        if not m.any(): return f
        H, W = m.shape
        sayi, etiket, st, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8), 8)
        # yakın bileşenleri tek pencerede birleştir: maske sınır kutularını büyütüp birleşimini al
        kutular = []
        for i in range(1, sayi):
            x, y, w, h, _ = st[i]; kutular.append([x, y, x + w, y + h])
        kutular.sort()
        birlesik = []
        for k in kutular:
            for b in birlesik:
                if k[0] < b[2] + 80 and k[2] > b[0] - 80 and k[1] < b[3] + 80 and k[3] > b[1] - 80:
                    b[0], b[1], b[2], b[3] = min(b[0], k[0]), min(b[1], k[1]), max(b[2], k[2]), max(b[3], k[3]); break
            else: birlesik.append(list(k))
        cikti = f.copy()
        for x0, y0, x1, y1 in birlesik:
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            kenar = int(max(x1 - x0, y1 - y0) * 1.5) + 96
            kenar = min(kenar, max(H, W))
            ax0 = max(0, min(W - kenar, cx - kenar // 2)) if kenar <= W else 0
            ay0 = max(0, min(H - kenar, cy - kenar // 2)) if kenar <= H else 0
            ax1, ay1 = min(W, ax0 + kenar), min(H, ay0 + kenar)
            parca, mp = cikti[ay0:ay1, ax0:ax1], m[ay0:ay1, ax0:ax1]
            dol = cv2.resize(self._calis(parca, mp), (ax1 - ax0, ay1 - ay0), interpolation=cv2.INTER_CUBIC)
            yumus = cv2.GaussianBlur((mp > 0).astype(np.float32), (9, 9), 0)[:, :, None]
            cikti[ay0:ay1, ax0:ax1] = (dol * yumus + parca * (1 - yumus)).astype(np.uint8)
        return cikti
PY
cat > $KOK/parcala.py <<'PY'
#!/usr/bin/env python3
"""Sıralama derlemesini ayrı kliplere böler, üstündeki yazıları/emoji/filigranı kaldırır (v2).
Kullanım: parcala.py <video.mp4> <cikti_klasoru> [--ornek]   (--ornek: yalnız her klibin orta karesinin önce/sonra görüntüsü)
1) Sahne geçişleri (PySceneDetect)
2) Sabit üst/alt şerit (başlık, kanal adı) ve her sahnedeki siyah kenarlar kırpılır
3) Yazı maskesi: OCR kutuları (hassas ayar) + sahne boyunca kıpırdamayan, kenarı keskin bindirmeler (emoji, ok, numara)
4) Doldurma: LaMa yapay zeka modeli (ONNX)
"""
import sys, os, subprocess, json
import cv2, numpy as np
from scenedetect import detect, ContentDetector
from rapidocr_onnxruntime import RapidOCR
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lama import Lama

GIRIS, CIKTI = sys.argv[1], sys.argv[2]; ORNEK = "--ornek" in sys.argv
os.makedirs(CIKTI, exist_ok=True)
AD = os.path.basename(GIRIS).split("__")[0]
MAKS_GEN = 1080; EN_KISA = 1.0
ocr = RapidOCR(det_box_thresh=0.3, det_unclip_ratio=1.9, det_limit_side_len=1280)
lama = Lama(os.environ.get("LAMA_MODEL", "/opt/tampon/indirici/model/lama_fp32.onnx"), int(os.environ.get("LAMA_THREAD", "2")))

ARA = os.path.join(CIKTI, f".{AD}_ara.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", GIRIS, "-vf", f"scale='min({MAKS_GEN},iw)':-2",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-an", ARA], check=True)
cap = cv2.VideoCapture(ARA)
FPS = cap.get(cv2.CAP_PROP_FPS) or 30; N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
def kare(i):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return f if ok else None

sahneler = [(a.frame_num, b.frame_num) for a, b in detect(ARA, ContentDetector(threshold=27, min_scene_len=int(FPS * 0.4)))] or [(0, N)]

# --- genel sabit şerit (bütün video boyunca değişmeyen üst/alt bant)
ornek = [kare(i) for i in np.linspace(0, N - 1, 40).astype(int)]
ornek = [cv2.cvtColor(cv2.resize(f, (W // 4, H // 4)), cv2.COLOR_BGR2GRAY).astype(np.float32) for f in ornek if f is not None]
satir = np.median(np.std(np.stack(ornek), axis=0), axis=1)
def serit(s):
    n = 0
    for v in s:
        if v < 6: n += 1
        else: break
    return n
gu = serit(satir) * 4; ga = serit(satir[::-1]) * 4
gu = gu if gu >= H * 0.04 else 0; ga = ga if ga >= H * 0.04 else 0

def sahne_kareleri(a, b, adim):
    out = []
    for i in range(a, b, adim):
        f = kare(i)
        if f is not None: out.append(f[gu:H - ga])
    return out

def siyah_kenar(fs, m):
    """Satır/sütunun %88'i koyu ya da yazı maskesiyse kenar sayılır (siyah şerit + içindeki başlık)."""
    mx = np.max(np.stack([cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in fs]), axis=0)
    koyu = (mx < 32) | (m > 0)
    r = koyu.mean(axis=1) > 0.88; c = koyu.mean(axis=0) > 0.88
    def bas(v):
        n = 0
        for x in v:
            if x: n += 1
            else: break
        return n
    return bas(r), bas(r[::-1]), bas(c), bas(c[::-1])

def maske(fs):
    h, w = fs[0].shape[:2]; m = np.zeros((h, w), np.uint8)
    for f in fs[::2]:
        res, _ = ocr(f, use_det=True, use_cls=False, use_rec=False)
        for b in (res or []):
            kt = np.array(b[0] if isinstance(b[0][0], (list, tuple)) else b, np.int32)
            cv2.fillPoly(m, [kt], 255)
    # kıpırdamayan, keskin kenarlı bindirmeler (emoji, ok, renkli numara)
    if len(fs) >= 4:
        g = np.stack([cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in fs])
        std = g.std(0); hareket = float(np.median(std))
        if hareket > 6:
            kenar = cv2.Laplacian(g.mean(0), cv2.CV_32F, ksize=3)
            sabit = ((std < 5.5) & (np.abs(kenar) > 20)).astype(np.uint8) * 255
            sabit = cv2.morphologyEx(sabit, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
            n, et, st, _ = cv2.connectedComponentsWithStats(sabit, 8)
            for i in range(1, n):
                x, y, ww, hh, alan = st[i]
                if 120 < alan < 0.04 * h * w and ww < 0.5 * w and hh < 0.3 * h:
                    m[et == i] = 255
    pay = max(4, w // 90)
    return cv2.dilate(m, np.ones((pay * 2 + 1, pay * 2 + 1), np.uint8))

rapor = []; no = 0
for a, b in sahneler:
    if (b - a) / FPS < EN_KISA: continue
    fs = sahne_kareleri(a, b, max(1, int(FPS / 3)))
    if not fs: continue
    orta = fs[len(fs) // 2]; gr = cv2.cvtColor(orta, cv2.COLOR_BGR2GRAY)
    if gr.mean() < 25 or gr.std() < 12: continue
    m = maske(fs)
    su, sa, ss, sg = siyah_kenar(fs, m)
    hh, ww = orta.shape[:2]
    if (hh - su - sa) < hh * 0.3 or (ww - ss - sg) < ww * 0.3: su = sa = ss = sg = 0
    fs = [f[su:hh - sa, ss:ww - sg] for f in fs]
    m = m[su:hh - sa, ss:ww - sg]
    no += 1
    if ORNEK:
        o = fs[len(fs) // 2]; t = lama.doldur(o, m)
        cv2.imwrite(os.path.join(CIKTI, f"{AD}_klip{no:02d}_once.jpg"), o)
        cv2.imwrite(os.path.join(CIKTI, f"{AD}_klip{no:02d}_sonra.jpg"), t)
        rapor.append({"klip": no}); continue
    OH, OW = m.shape[0] // 2 * 2, m.shape[1] // 2 * 2
    hedef = os.path.join(CIKTI, f"{AD}_klip{no:02d}.mp4"); bas, sure = a / FPS, (b - a) / FPS
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
        "-ss", f"{bas:.3f}", "-t", f"{sure:.3f}", "-i", GIRIS, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", hedef], stdin=subprocess.PIPE)
    cap.set(cv2.CAP_PROP_POS_FRAMES, a)
    for _ in range(a, b):
        ok, f = cap.read()
        if not ok: break
        f = f[gu:H - ga][su:hh - sa, ss:ww - sg]
        f = lama.doldur(f, m)[:OH, :OW]
        enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close(); enc.wait()
    open(os.path.join(CIKTI, ".ilerleme.log"), "a").write(f"{AD} klip{no:02d} tamam\n")
    rapor.append({"klip": no, "baslangic": round(bas, 2), "sure": round(sure, 2), "yazi_orani": round(float((m > 0).mean()), 3)})
os.remove(ARA)
print(json.dumps({"video": AD, "klipler": rapor}, ensure_ascii=False))
PY
cat > $KOK/lama_calis.sh <<'SH'
#!/bin/bash
KOK=/opt/tampon/indirici; C=$KOK/parcalar_v2
export OMP_NUM_THREADS=1 LAMA_THREAD=1 LAMA_MODEL=$KOK/model/lama_fp32.onnx
date +%s > $C/.basla
ls -S -r $KOK/rank/*.mp4 | xargs -P 4 -I{} sh -c 'f="{}"; b=$(basename "$f" | cut -d_ -f1); [ -f '$C'/.bitti_$b ] && exit 0; timeout 36000 '$KOK'/venv/bin/python '$KOK'/parcala.py "$f" '$C' >'$C'/.$b.json 2>'$C'/.$b.err && touch '$C'/.bitti_$b || echo "$b HATA: $(tail -1 '$C'/.$b.err)" >> '$C'/.hatalar'
date +%s > $C/.son
SH
chmod +x $KOK/lama_calis.sh
rm -f $C/.son
systemd-run --unit=tampon-parcala --collect -p CPUQuota=400% -p MemoryMax=6G -p Nice=10 /bin/bash $KOK/lama_calis.sh >/dev/null 2>&1 && echo "NOT: arka planda başladı (16 video, 4 paralel)" || echo "NOT: HATA başlatılamadı"
