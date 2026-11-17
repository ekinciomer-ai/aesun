#!/usr/bin/env python3
"""LVL MAX sıralama kurgusu (ffmpeg). Kullanım: kurgu.py plan.json kaynak_klasoru cikti.mp4 [onizleme]
plan.json: {"baslik":["RANKING BEST","PARACHUTE MOMENTS"], "renk":"#FFD400",
            "sira":[{"no":6,"kaynak":"k3","bas":1.2,"sure":4.5,"etiket":"FLYING CAR","zoom":[2.0,0.6]} ...]}
sira listesi gösterim sırasıdır (#6 -> #1). zoom: [an_sn, sure_sn] darbe anında yakınlaştırma (isteğe bağlı).
"""
import json, os, subprocess, sys, tempfile, math, wave, struct, random

plan = json.load(open(sys.argv[1], encoding="utf-8"))
SRC, OUT = sys.argv[2], sys.argv[3]
ONIZ = len(sys.argv) > 4
W, H, FPS = (540, 960, 30) if ONIZ else (1080, 1920, 30)
K = W / 1080
FONT = next((f for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                          "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"] if os.path.exists(f)), None)
TMP = tempfile.mkdtemp(prefix="lvl_")
RENK = plan.get("renk", "#FFD400")
sira = plan["sira"]
N = len(sira)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print("NOT: HATA ffmpeg", r.stderr[-400:]); sys.exit(1)


def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def sfx(path, kind, sr=44100):
    """Telifsiz, sentetik efektler: whoosh (gürültü süpürmesi), ding (çan), boom (alçak darbe)."""
    n = int(sr * {"whoosh": 0.45, "ding": 0.6, "boom": 0.5}[kind])
    out = []
    lp = 0.0
    for i in range(n):
        t = i / sr; p = i / n
        if kind == "whoosh":
            a = math.sin(math.pi * p) ** 2
            cut = 0.02 + 0.5 * p
            lp += cut * (random.uniform(-1, 1) - lp)
            v = lp * a * 1.8
        elif kind == "ding":
            v = (math.sin(2 * math.pi * 1318 * t) + 0.5 * math.sin(2 * math.pi * 2637 * t)) * math.exp(-6 * t) * 0.45
        else:
            f = 90 * math.exp(-4 * t) + 40
            v = math.sin(2 * math.pi * f * t) * math.exp(-5 * t) * 0.9
        out.append(max(-1, min(1, v)))
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(x * 32000)) for x in out))


for k in ("whoosh", "ding", "boom"):
    sfx(f"{TMP}/{k}.wav", k)

# 1) Her sırayı ayrı parça olarak işle (dikey kadraj + bulanık dolgu + zoom + kendi sesi kısık)
parcalar, t0 = [], 0.0
zamanlar = []
for i, s in enumerate(sira):
    src = os.path.join(SRC, s["kaynak"] + ".mp4")
    d = float(s["sure"])
    z = s.get("zoom")
    zoomf = "1"
    if z:
        za, zs = float(z[0]), float(z[1])
        zoomf = f"if(between(t,{za},{za+zs}),1.35,1)"
    vf = (f"[0:v]setpts=PTS-STARTPTS,fps={FPS},split=2[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=20:2,eq=brightness=-0.15[bg];"
          f"[b]scale={W}:-2,scale=w='trunc(iw*{zoomf}/2)*2':h=-2:eval=frame,crop='min(iw\\,{W})':'min(ih\\,{int(H*0.78)})'[fg];"
          f"[bg][fg]overlay=(W-w)/2:(H-h)/2+{int(110*K)}:format=auto,setsar=1[v]")
    p = f"{TMP}/p{i}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(s["bas"]), "-t", str(d), "-i", src,
         "-f", "lavfi", "-t", str(d), "-i", "anullsrc=r=44100:cl=stereo",
         "-filter_complex", vf + f";[0:a]volume={s.get('ses',0.55)},aresample=44100,aformat=channel_layouts=stereo[ka];[ka][1:a]amix=inputs=2:duration=longest:normalize=0[aout]",
         "-map", "[v]", "-map", "[aout]", "-t", str(d), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", p])
    parcalar.append(p); zamanlar.append((t0, t0 + d)); t0 += d
TOPLAM = t0

# 2) Birleştir
with open(f"{TMP}/liste.txt", "w") as f:
    for p in parcalar:
        f.write(f"file '{p}'\n")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{TMP}/liste.txt", "-c", "copy", f"{TMP}/govde.mp4"])

# 3) Yazılar: başlık + sol sıra merdiveni (1 en üstte); her sıra kendi anında açılır, aktif olan parlar
fnt = f"fontfile={FONT}:" if FONT else ""
ciz = []
bas = plan["baslik"]
fs_b = int(64 * K)
for j, satir in enumerate(bas):
    ciz.append(f"drawtext={fnt}text='{esc(satir)}':fontsize={fs_b}:fontcolor=white:borderw={int(6*K)}:bordercolor=black:"
               f"x=(w-text_w)/2:y={int(60*K)+j*int(78*K)}")
fs_r = int(46 * K); y0 = int(250 * K); dy = int(70 * K)
for no in range(1, N + 1):
    y = y0 + (no - 1) * dy
    ciz.append(f"drawtext={fnt}text='{no}.':fontsize={fs_r}:fontcolor=white:borderw={int(4*K)}:bordercolor=black:x={int(28*K)}:y={y}")
for i, s in enumerate(sira):
    no = int(s["no"]); a, b = zamanlar[i]
    y = y0 + (no - 1) * dy
    et = esc(s["etiket"].upper())
    ciz.append(f"drawtext={fnt}text='{et}':fontsize={fs_r}:fontcolor={RENK}:borderw={int(4*K)}:bordercolor=black:"
               f"x={int(92*K)}:y={y}:enable='gte(t,{a})':alpha='if(lt(t,{a}+0.25),(t-{a})/0.25,1)'")
    ciz.append(f"drawbox=x={int(18*K)}:y={y-int(8*K)}:w={int(560*K)}:h={int(62*K)}:color={RENK}@0.9:t={int(5*K)}:enable='between(t,{a},{b})'")
    # büyük sıra rozeti (ilk 1 sn)
    ciz.append(f"drawtext={fnt}text='#{no}':fontsize={int(190*K)}:fontcolor={RENK}:borderw={int(10*K)}:bordercolor=black:"
               f"x=(w-text_w)/2:y=h*0.62:enable='between(t,{a},{a+0.9})'")
ciz.append(f"drawtext={fnt}text='LVL MAX':fontsize={int(34*K)}:fontcolor=white@0.85:borderw={int(3*K)}:bordercolor=black:x=w-text_w-{int(24*K)}:y=h-{int(70*K)}")
vf = ",".join(ciz)

# 4) Efekt izi: her geçişte whoosh + ding; son sırada ekstra boom
gir = ["-i", f"{TMP}/govde.mp4", "-i", f"{TMP}/whoosh.wav", "-i", f"{TMP}/ding.wav", "-i", f"{TMP}/boom.wav"]
fx, etik = [], []
for i, (a, _) in enumerate(zamanlar):
    ms = int(a * 1000)
    fx.append(f"[1:a]adelay={max(0,ms-150)}|{max(0,ms-150)},volume=0.8[w{i}]"); etik.append(f"[w{i}]")
    fx.append(f"[2:a]adelay={ms+80}|{ms+80},volume=0.7[d{i}]"); etik.append(f"[d{i}]")
ms = int(zamanlar[-1][0] * 1000)
fx.append(f"[3:a]adelay={ms}|{ms},volume=1.0[bm]"); etik.append("[bm]")
af = ";".join(fx) + ";" + "[0:a]" + "".join(etik) + f"amix=inputs={len(etik)+1}:duration=first:normalize=0,alimiter=limit=0.95[a]"
run(["ffmpeg", "-v", "error", "-y", *gir, "-filter_complex", f"[0:v]{vf}[v];{af}", "-map", "[v]", "-map", "[a]",
     "-c:v", "libx264", "-preset", "veryfast" if ONIZ else "medium", "-crf", "23" if ONIZ else "19",
     "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT])
print(f"NOT: kurgu tamam · {TOPLAM:.1f} sn · {W}x{H} · {OUT}")
