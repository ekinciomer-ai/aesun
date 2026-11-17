#!/usr/bin/env python3
"""LVL MAX · "Gerçek mi, Yapay Zekâ mı?" sinematik sıralama kurgusu (yalnız ffmpeg, telifsiz sentetik ses).
Kullanım: kurgu_gai.py plan.json kaynak_klasoru cikti.mp4 [onizleme]
plan.json:
 {"dil":"en", "metin":{...isteğe bağlı çeviri...},
  "seviye":[{"no":1,"gercek":"g1","ai":"a1","gercek_ust":true,"etiket":"OCEAN"}, ...]}
Kaynak klasöründe <ad>.mp4 dosyaları. Her seviyede üstte A, altta B paneli; cevap anında GERÇEK / AI mührü.
"""
import json, os, subprocess, sys, tempfile, math, wave, struct, random

plan = json.load(open(sys.argv[1], encoding="utf-8"))
SRC, OUT = sys.argv[2], sys.argv[3]
ONIZ = len(sys.argv) > 4
W, H, FPS = (540, 960, 30) if ONIZ else (1080, 1920, 30)
K = W / 1080
FONT = next((f for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                          "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"] if os.path.exists(f)), None)
FNT = f"fontfile={FONT}:" if FONT else ""
TMP = tempfile.mkdtemp(prefix="gai_")
random.seed(7)

METIN = {
    "en": {"b1": "REAL or AI?", "b2": "Can you pass level 5?", "soru": "WHICH ONE IS REAL?",
           "gercek": "REAL", "ai": "AI", "son1": "How many did you get?", "son2": "Comment your score"},
    "tr": {"b1": "GERÇEK mi AI mı?", "b2": "5. seviyeyi geçebilir misin?", "soru": "HANGİSİ GERÇEK?",
           "gercek": "GERÇEK", "ai": "YAPAY ZEKÂ", "son1": "Kaçını bildin?", "son2": "Skorunu yoruma yaz"},
    "es": {"b1": "¿REAL o IA?", "b2": "¿Superas el nivel 5?", "soru": "¿CUÁL ES REAL?",
           "gercek": "REAL", "ai": "IA", "son1": "¿Cuántas acertaste?", "son2": "Escribe tu puntuación"},
}
T = dict(METIN.get(plan.get("dil", "en"), METIN["en"]))
T.update(plan.get("metin", {}))

GIRIS, SEV, SON = 2.2, 5.6, 2.6        # saniye
SORU_AN, CEVAP_AN = 2.8, 4.1           # seviye içindeki anlar
PW, PH = W, int(H * 0.355)             # panel boyu
UST = int(H * 0.12)                    # üst siyah bant (seviye başlığı)
ARA = int(H * 0.04)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print("NOT: HATA ffmpeg", r.stderr[-600:]); sys.exit(1)


def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%").replace(",", "\\,")


def yaz_wav(path, ornek, sr=44100):
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x)) * 30000)) for x in ornek))


def sesler(sr=44100):
    """Telifsiz sentetik sinema sesleri: braaam, tik, darbe, drone."""
    # braaam: alçak testere dalgaları + yavaş açılan filtre
    n = int(sr * 2.2); out = []; lp = 0.0
    for i in range(n):
        t = i / sr; p = i / n
        env = min(1, t / 0.05) * math.exp(-1.6 * t)
        raw = sum(((t * f) % 1) * 2 - 1 for f in (43.65, 43.9, 87.3, 65.4)) / 4
        cut = 0.01 + 0.08 * math.exp(-2 * t)
        lp += cut * (raw - lp)
        out.append(lp * env * 3.2)
    yaz_wav(f"{TMP}/braaam.wav", out)
    n = int(sr * 0.08)
    yaz_wav(f"{TMP}/tik.wav", [math.sin(2 * math.pi * 1800 * i / sr) * math.exp(-60 * i / sr) * 0.5 for i in range(n)])
    n = int(sr * 1.2); out = []; lp = 0.0
    for i in range(n):
        t = i / sr
        f = 55 * math.exp(-3 * t) + 30
        v = math.sin(2 * math.pi * f * t) * math.exp(-3.5 * t)
        lp += 0.05 * (random.uniform(-1, 1) - lp)
        out.append(v * 0.9 + lp * math.exp(-8 * t) * 2)
    yaz_wav(f"{TMP}/darbe.wav", out)
    toplam = GIRIS + SEV * len(plan["seviye"]) + SON
    n = int(sr * toplam); out = []
    for i in range(n):
        t = i / sr
        v = (math.sin(2 * math.pi * 55 * t) * 0.5 + math.sin(2 * math.pi * 82.4 * t) * 0.3
             + math.sin(2 * math.pi * 110.3 * t) * 0.15) * (0.6 + 0.4 * math.sin(2 * math.pi * 0.12 * t))
        out.append(v * 0.10)
    yaz_wav(f"{TMP}/drone.wav", out)


def panel(src, cikti, sure):
    """Klibi panel boyuna kırp, sinema rengi + gren + vinyet uygula."""
    run(["ffmpeg", "-v", "error", "-y", "-stream_loop", "-1", "-i", src, "-t", str(sure), "-an",
         "-vf", (f"fps={FPS},scale={PW}:{PH}:force_original_aspect_ratio=increase,crop={PW}:{PH},"
                 "eq=contrast=1.08:saturation=0.92,colorbalance=rs=-0.04:bs=0.05:rh=0.05:bh=-0.04,"
                 f"noise=alls={6 if ONIZ else 8}:allf=t,vignette=PI/5,setsar=1"),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", cikti])


sesler()
ys = [UST, UST + PH + ARA]   # A ve B panel y
fs_l, fs_m, fs_s = int(64 * K), int(46 * K), int(34 * K)
parcalar = []

# Giriş
gir = f"{TMP}/giris.mp4"
run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}:d={GIRIS}",
     "-vf", (f"drawtext={FNT}text='{esc(T['b1'])}':fontsize={int(96*K)}:fontcolor=white:x=(w-text_w)/2:y=h*0.40:"
             f"alpha='min(1,t/0.4)',"
             f"drawtext={FNT}text='{esc(T['b2'])}':fontsize={fs_m}:fontcolor=#E8C27A:x=(w-text_w)/2:y=h*0.40+{int(130*K)}:"
             f"alpha='if(lt(t,0.6),0,min(1,(t-0.6)/0.4))',noise=alls=8:allf=t,format=yuv420p"),
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", gir])
parcalar.append(gir)

for s in plan["seviye"]:
    no = s["no"]
    a_src, b_src = (s["gercek"], s["ai"]) if s.get("gercek_ust", True) else (s["ai"], s["gercek"])
    pa, pb = f"{TMP}/a{no}.mp4", f"{TMP}/b{no}.mp4"
    panel(os.path.join(SRC, a_src + ".mp4"), pa, SEV)
    panel(os.path.join(SRC, b_src + ".mp4"), pb, SEV)
    ust_gercek = s.get("gercek_ust", True)
    etiket_a = T["gercek"] if ust_gercek else T["ai"]
    etiket_b = T["ai"] if ust_gercek else T["gercek"]
    renk_a = "#3DDC84" if ust_gercek else "#FF3B3B"
    renk_b = "#FF3B3B" if ust_gercek else "#3DDC84"
    c, q = CEVAP_AN, SORU_AN
    ciz = [
        # seviye başlığı (üst bant)
        f"drawtext={FNT}text='LEVEL {no}':fontsize={fs_l}:fontcolor=#E8C27A:x=(w-text_w)/2:y={int(UST*0.22)}",
        f"drawtext={FNT}text='{esc(s.get('etiket',''))}':fontsize={fs_s}:fontcolor=white@0.8:x=(w-text_w)/2:y={int(UST*0.22)+int(78*K)}",
        # A / B harfleri
        f"drawtext={FNT}text='A':fontsize={fs_l}:fontcolor=white:borderw={int(5*K)}:bordercolor=black:x={int(30*K)}:y={ys[0]+int(20*K)}",
        f"drawtext={FNT}text='B':fontsize={fs_l}:fontcolor=white:borderw={int(5*K)}:bordercolor=black:x={int(30*K)}:y={ys[1]+int(20*K)}",
        # soru + geri sayım
        f"drawtext={FNT}text='{esc(T['soru'])}':fontsize={fs_m}:fontcolor=white:x=(w-text_w)/2:y={ys[1]+PH+int(36*K)}:enable='between(t,{q},{c})'",
        f"drawtext={FNT}text='%{{eif\\:ceil({c}-t)\\:d}}':fontsize={int(96*K)}:fontcolor=#E8C27A:borderw={int(8*K)}:bordercolor=black:x=(w-text_w)/2:y={ys[1]-ARA//2}-text_h/2:enable='between(t,{q},{c-0.01})'",
        # cevap: kaybeden panel kararır, mühürler
        f"drawbox=x=0:y={ys[1] if ust_gercek else ys[0]}:w={PW}:h={PH}:color=black@0.45:t=fill:enable='gte(t,{c})'",
        f"drawbox=x=0:y={ys[0]}:w={PW}:h={PH}:color={renk_a}:t={int(8*K)}:enable='gte(t,{c})'",
        f"drawbox=x=0:y={ys[1]}:w={PW}:h={PH}:color={renk_b}:t={int(8*K)}:enable='gte(t,{c})'",
        f"drawtext={FNT}text='{esc(etiket_a)}':fontsize={int(110*K)}:fontcolor={renk_a}:borderw={int(8*K)}:bordercolor=black:"
        f"x=(w-text_w)/2:y={ys[0]}+({PH}-text_h)/2:enable='gte(t,{c})'",
        f"drawtext={FNT}text='{esc(etiket_b)}':fontsize={int(110*K)}:fontcolor={renk_b}:borderw={int(8*K)}:bordercolor=black:"
        f"x=(w-text_w)/2:y={ys[1]}+({PH}-text_h)/2:enable='gte(t,{c})'",
        f"drawtext={FNT}text='LVL MAX':fontsize={int(30*K)}:fontcolor=white@0.6:x=(w-text_w)/2:y=h-{int(70*K)}",
        "format=yuv420p",
    ]
    fc = (f"color=c=black:s={W}x{H}:r={FPS}:d={SEV}[bg];"
          f"[bg][0:v]overlay=0:{ys[0]}[x];[x][1:v]overlay=0:{ys[1]},"
          # seviye girişinde kısa beyaz flaş
          f"drawbox=x=0:y=0:w={W}:h={H}:color=white@0.35:t=fill:enable='lt(t,0.08)',"
          + ",".join(ciz) + "[v]")
    p = f"{TMP}/sev{no}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", pa, "-i", pb, "-filter_complex", fc, "-map", "[v]", "-t", str(SEV),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", p])
    parcalar.append(p)

son = f"{TMP}/son.mp4"
run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}:d={SON}",
     "-vf", (f"drawtext={FNT}text='{esc(T['son1'])}':fontsize={int(66*K)}:fontcolor=white:x=(w-text_w)/2:y=h*0.42:alpha='min(1,t/0.4)',"
             f"drawtext={FNT}text='{esc(T['son2'])}':fontsize={fs_m}:fontcolor=#E8C27A:x=(w-text_w)/2:y=h*0.42+{int(120*K)}:"
             f"alpha='if(lt(t,0.5),0,min(1,(t-0.5)/0.4))',"
             f"drawtext={FNT}text='LVL MAX':fontsize={int(30*K)}:fontcolor=white@0.6:x=(w-text_w)/2:y=h-{int(70*K)},format=yuv420p"),
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", son])
parcalar.append(son)

with open(f"{TMP}/liste.txt", "w") as f:
    for p in parcalar:
        f.write(f"file '{p}'\n")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{TMP}/liste.txt", "-c", "copy", f"{TMP}/govde.mp4"])

# Ses izi: drone + her seviyede braaam, soru anında tikler, cevapta darbe
fx, et = [], []
k = 0
def ekle(giris, an, vol):
    global k
    ms = int(an * 1000)
    fx.append(f"[{giris}:a]adelay={ms}|{ms},volume={vol}[s{k}]"); et.append(f"[s{k}]"); k += 1
ekle(1, 0.0, 1.0)
for i in range(len(plan["seviye"])):
    b = GIRIS + i * SEV
    ekle(1, b, 0.9)
    for j in range(int(CEVAP_AN - SORU_AN + 0.99)):
        ekle(2, b + SORU_AN + j, 0.6)
    ekle(3, b + CEVAP_AN, 1.0)
ekle(1, GIRIS + len(plan["seviye"]) * SEV, 0.8)
af = (";".join(fx) + ";[4:a]volume=1[dr];" + "[dr]" + "".join(et) +
      f"amix=inputs={len(et)+1}:duration=first:normalize=0,alimiter=limit=0.9[a]")
run(["ffmpeg", "-v", "error", "-y", "-i", f"{TMP}/govde.mp4", "-i", f"{TMP}/braaam.wav", "-i", f"{TMP}/tik.wav",
     "-i", f"{TMP}/darbe.wav", "-i", f"{TMP}/drone.wav", "-filter_complex", af, "-map", "0:v", "-map", "[a]",
     "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT])
print(f"NOT: kurgu tamam · {GIRIS + SEV*len(plan['seviye']) + SON:.1f} sn · {W}x{H} · {OUT}")
