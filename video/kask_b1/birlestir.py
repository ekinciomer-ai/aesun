"""Kask Kamerası B1 · Shorts 1 (TR) önizleme kurgusu.
python3 birlestir.py <ham klasörü (kozmos-ham dalı)> <çalışma klasörü (canlandırma mp4'leri burada)> <çıktı.mp4>"""
import json, os, re, subprocess, sys
HAM, IS, OUT = sys.argv[1:4]
K = os.path.dirname(os.path.abspath(__file__))
SES = os.path.join(K, "../../sunucu/ses_kuyruk")
FONT = os.path.join(K, "../vanguard/fonts")
MUZIK = os.path.join(K, "../ruzgar_mag/muzik.mp3")
KOD = os.environ.get("KOD", "KZ_KASK1_S1_TR")
W, H, FPS = 1080, 1920, 30
def run(a): subprocess.run(a, check=True)
def sure(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))

# 1) anlatım zamanları
J = json.load(open(f"{SES}/tamam/{KOD}.json", encoding="utf-8")) if os.path.exists(f"{SES}/tamam/{KOD}.json") else json.load(open(f"{SES}/{KOD}.json", encoding="utf-8"))
t, BOS, zaman = 0.30, 0.35, []
for p in J["parcalar"]:
    d = sure(f"{SES}/cikti/{KOD}__{p['ad']}.mp3"); zaman.append((p, t, d)); t += d + BOS
TOPLAM = round(t + 2.2, 2)
b = [z[1] for z in zaman]  # parça başlangıçları

# 2) görüntü parçaları: (tür, kaynak, süre, ek)
FOT = os.path.join(HAM, "kask_b1"); TEM = os.path.join(HAM, "kask_b1_temsili/jsc2026m000932_Spacewalk_101_AVAIL1080p.mp4")
parcalar = [
    ("vid", f"{IS}/c_kanca.mp4", b[1] - 0.05, 0),
    ("foto", f"{FOT}/iss036e019886.jpg", (b[1] + b[2]) / 2 - b[1] + 0.05, "in"),
    ("foto", f"{FOT}/iss036e019555.jpg", b[2] - (b[1] + b[2]) / 2, "out"),
    ("tem", TEM, 3.4, 19.6),
    ("tem", TEM, b[3] - b[2] - 3.4, 169.0),
    ("vid", f"{IS}/c_gece.mp4", b[4] - b[3], 0),
    ("foto", f"{FOT}/iss036e037249.jpg", 3.6, "in"),
    ("foto", f"{FOT}/iss036e037243.jpg", 0, "out"),
]
ETIKET = ["CANLANDIRMA", "NASA FOTOĞRAFI · 16 TEMMUZ 2013", "NASA FOTOĞRAFI · 16 TEMMUZ 2013", "TEMSİLİ GÖRÜNTÜ · NASA",
          "TEMSİLİ GÖRÜNTÜ · NASA", "CANLANDIRMA", "NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ", "NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ"]
BASLIK = "UZAYDA\\NBOĞULMAK\\NÜZEREYDİ"; SAYAC = [(b[1] + 2.2, b[2], "EVA-23 · 00:44")]
SON_BAS = b[4] + 3.6; SON_YAZI = "DEVAMI YARIN\\N{\\c&H00FAF5F3&\\fs60}Astronot Kask Kamerası · Bölüm 1"
if "_S2" in KOD:  # magazin: "NASA bu hatayı bir hafta önce görmüştü"
    o12, o45 = (b[1] + b[2]) / 2, (b[4] + b[5]) / 2
    parcalar = [("foto", f"{FOT}/iss036e037249.jpg", b[1], "in"),
                ("foto", f"{FOT}/iss036e016531.jpg", o12 - b[1], "in"), ("foto", f"{FOT}/iss036e016853.jpg", b[2] - o12, "out"),
                ("foto", f"{FOT}/iss036e018184.jpg", b[3] - b[2], "in"), ("foto", f"{FOT}/iss036e019555.jpg", b[4] - b[3], "out"),
                ("foto", f"{FOT}/iss036e037243.jpg", o45 - b[4], "in"), ("foto", f"{FOT}/iss036e037230.jpg", b[5] - o45, "out"),
                ("foto", f"{FOT}/iss036e037249.jpg", 0, "out")]
    ETIKET = ["NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ", "NASA FOTOĞRAFI · 9 TEMMUZ 2013", "NASA FOTOĞRAFI · 9 TEMMUZ 2013",
              "NASA FOTOĞRAFI · 14 TEMMUZ 2013", "NASA FOTOĞRAFI · 16 TEMMUZ 2013", "NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ",
              "NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ", "NASA FOTOĞRAFI · 27 AĞUSTOS 2013 TESTİ"]
    BASLIK = "NASA BU HATAYI\\NÖNCEDEN\\NGÖRMÜŞTÜ"
    SAYAC = [(b[1] + 0.3, b[2], "EVA-22 · 9 TEMMUZ"), (b[3] + 0.3, b[4], "EVA-23 · 16 TEMMUZ")]
    SON_BAS = b[5]; SON_YAZI = "SENCE NEDEN?\\N{\\c&H00FAF5F3&\\fs60}Yorumlara yaz"
son = TOPLAM - sum(p[2] for p in parcalar[:-1]); parcalar[-1] = parcalar[-1][:2] + (son, "out")
P_ = f"{IS}/p_{KOD}"; os.makedirs(P_, exist_ok=True); liste = []
for i, (tur, src, d, ek) in enumerate(parcalar):
    o = f"{P_}/{i:02d}.mp4"; n = int(round(d * FPS))
    if tur == "foto":  # yavaş yakınlaştırma, dikey kırpma
        z = "min(1.0+0.0009*on,1.25)" if ek == "in" else "max(1.22-0.0009*on,1.0)"
        vf = (f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
              f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},eq=contrast=1.05:saturation=1.05")
        run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", src, "-vf", vf, "-frames:v", str(n), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", o])
    elif tur == "tem":  # yatay NASA videosu: bulanık dolgu + ortada tam genişlik
        vf = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.15[bg];"
              f"[b]scale={W*1.25:.0f}:-2,crop={W}:ih[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2-80,fps={FPS}")
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(ek), "-t", f"{d:.3f}", "-i", src, "-filter_complex", vf, "-frames:v", str(n), "-an", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", o])
    else:
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"fps={FPS},tpad=stop_mode=clone:stop_duration=2", "-frames:v", str(n), "-an", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", o])
    liste.append(o)
open(f"{P_}/liste.txt", "w").write("".join(f"file '{x}'\n" for x in liste))
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{P_}/liste.txt", "-c", "copy", f"{P_}/goruntu.mp4"])

# 3) yazılar (ASS)
def ts(s): s = max(0, s); return f"{int(s//3600)}:{int(s%3600//60):02d}:{s%60:05.2f}"
sinirlar = []; a = 0
for p in parcalar: sinirlar.append((a, a + p[2])); a += p[2]
ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0", "",
       "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Alt,Instrument Sans,64,&H00FAF5F3,&H00FFFFFF,&H00000000,&H90100805,1,0,0,0,100,100,0,0,3,14,0,2,90,90,330,1",
       "Style: Etiket,Space Mono,30,&H006BC4F2,&H00FFFFFF,&H00000000,&H99000000,1,0,0,0,100,100,3,0,3,10,0,9,60,60,96,1",
       "Style: Logo,Space Mono,32,&H00FFE36F,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,9,0,1,0,2,7,64,60,96,1",
       "Style: Baslik,Archivo,118,&H00FAF5F3,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,80,100,1,0,1,0,6,8,70,70,250,1",
       "Style: Sayac,Space Mono,44,&H006BC4F2,&H00FFFFFF,&H00000000,&H99000000,1,0,0,0,100,100,4,0,3,12,0,8,60,60,250,1",
       "Style: Son,Archivo,96,&H006BC4F2,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,85,100,1,0,1,0,6,5,70,70,0,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
ass.append(f"Dialogue: 1,{ts(0)},{ts(TOPLAM)},Logo,,0,0,0,,KOZMOS {{\\c&H006BC4F2&}}LAB")
for (s, e), et in zip(sinirlar, ETIKET): ass.append(f"Dialogue: 1,{ts(s)},{ts(e)},Etiket,,0,0,0,,{et}")
ass.append(f"Dialogue: 2,{ts(0.15)},{ts(b[1]-0.1)},Baslik,,0,0,0,,{{\\fad(150,200)}}{BASLIK}")
for a0, a1, yz in SAYAC: ass.append(f"Dialogue: 2,{ts(a0)},{ts(a1)},Sayac,,0,0,0,,{{\\fad(200,200)}}{yz}")
ass.append(f"Dialogue: 2,{ts(SON_BAS)},{ts(TOPLAM)},Son,,0,0,0,,{{\\fad(300,0)}}{SON_YAZI}")
for p, s, d in zaman:  # altyazı: cümle parçaları, karakter sayısına göre süre
    m = re.sub(r"\[[^\]]*\]\s*", "", p["metin"]).strip(); ch, cur = [], ""
    for w in m.split():
        if len(cur) + len(w) + 1 > 30 and cur: ch.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
        if cur.endswith((".", "!", "?")) and len(cur) > 12: ch.append(cur); cur = ""
    if cur: ch.append(cur)
    tot = sum(len(c) for c in ch); u = s
    for c in ch:
        dd = d * len(c) / tot
        if not (p is zaman[-1][0] and u >= SON_BAS - 0.05): ass.append(f"Dialogue: 0,{ts(u)},{ts(u+dd)},Alt,,0,0,0,,{c}")
        u += dd
open(f"{P_}/yazi.ass", "w", encoding="utf-8").write("\n".join(ass) + "\n")

# 4) anlatım izi
gir, fil = [], []
for i, (p, s, d) in enumerate(zaman):
    gir += ["-i", f"{SES}/cikti/{KOD}__{p['ad']}.mp3"]; fil.append(f"[{i}:a]aresample=48000,adelay={int(s*1000)}:all=1[a{i}]")
fil.append("".join(f"[a{i}]" for i in range(len(zaman))) + f"amix=inputs={len(zaman)}:normalize=0,apad,atrim=0:{TOPLAM}[o]")
run(["ffmpeg", "-v", "error", "-y", *gir, "-filter_complex", ";".join(fil), "-map", "[o]", "-ac", "1", f"{P_}/anlatim.wav"])

# 5) birleştir: yazılar + anlatım + alçak müzik (8. sahne başında müzik kısılır)
g0, g1 = (b[3], b[4]) if "_S2" not in KOD else (-1, -1)
fc = (f"[0:v]ass={P_}/yazi.ass:fontsdir={FONT}[v];"
      f"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit[n1][n2];"
      f"[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{TOPLAM},afade=t=in:d=0.8,afade=t=out:st={TOPLAM-2}:d=2,"
      f"volume='if(between(t,{g0},{g1}),0.05,0.18)':eval=frame[m];"
      f"[m][n1]sidechaincompress=threshold=0.025:ratio=10:attack=15:release=400[md];[md][n2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]")
run(["ffmpeg", "-v", "error", "-y", "-i", f"{P_}/goruntu.mp4", "-i", f"{P_}/anlatim.wav", "-stream_loop", "-1", "-i", MUZIK,
     "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-c:a", "aac", "-b:a", "192k",
     "-t", str(TOPLAM), "-movflags", "+faststart", OUT])
print("bitti", OUT, TOPLAM, "sn")
