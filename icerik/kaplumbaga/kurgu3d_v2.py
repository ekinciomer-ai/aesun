#!/usr/bin/env python3
"""Kaplumbağa Terbiyecisi 3D — anlatımsız sürüm.
Kamera gerçek tablonun içine dalar -> 5 sahne 3D -> kamera tablodan geri çıkar.
Ses: kliplerin kendi efektleri + her duygu değişiminde değişen müzik (m1 gizemli, m2 sinsi, m3 gerilim, m4 ney/marş).
Girdi: k1..k5.mp4, tablo_dikey.jpg, m1..m4.mp3. Kullanım: python3 kurgu3d_v2.py <girdi> <cikti.mp4>"""
import subprocess, sys
from pathlib import Path

G = Path(sys.argv[1]); CIKTI = sys.argv[2]
P, X0, K, GE, XF, F = 3.5, 0.6, 6.0, 0.35, 0.8, 3.5
ks = [P - X0 + i * (K - GE) for i in range(5)]          # klip başlangıçları
fs = ks[4] + K - XF                                      # final tablo başlangıcı
TOPLAM = fs + F
# (müzik, müzikteki başlangıç, videoda başlangıç, bitiş)
MUZIK = [("m1", 7, 0, ks[1]), ("m2", 8, ks[1], ks[2]), ("m3", 2.5, ks[2], ks[3]),
         ("m4", 2.5, ks[3], ks[4]), ("m2", 20, ks[4], fs + 0.4), ("m1", 9, fs + 0.4, TOPLAM)]

def az(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
def sh(*a): subprocess.run(list(a), check=True)

def tablo_klip(cikis, z0, z1, sure):
    n = int(sure * 30)
    sh("ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(G / "tablo_dikey.jpg"), "-f", "lavfi", "-t", str(sure), "-i", "anullsrc=r=44100:cl=stereo",
       "-vf", f"scale=2160:3840,zoompan=z='{z0}+({z1}-{z0})*(on/{n})*(on/{n})*(3-2*on/{n})':x='iw*0.585-iw/zoom/2':y='ih*0.30-ih/zoom/2':d={n}:s=1080x1920:fps=30",
       "-t", str(sure), "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(cikis))

def altyazi(yol):
    s = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Ust,Inter Black,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,4,8,60,60,190,1
Style: Etiket,Inter ExtraBold,40,&H00FFFFFF,&H00FFFFFF,&H00422A0E,&HE6422A0E,-1,0,0,0,100,100,0,0,3,14,0,8,60,60,120,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    L = [f"Dialogue: 1,{az(0)},{az(ks[0]+1.2)},Ust,,0,0,0,,{{\\fad(150,250)}}1906'dan beri aynı poz.\\N{{\\c&H0028CDFF&}}Neden?",
         f"Dialogue: 1,{az(0.2)},{az(P-0.5)},Etiket,,0,0,0,,{{\\fad(200,200)}}Osman Hamdi Bey · Kaplumbağa Terbiyecisi · 1906",
         f"Dialogue: 1,{az(fs+F-2.2)},{az(TOPLAM)},Ust,,0,0,0,,{{\\fad(300,0)\\pos(540,1500)}}Bu yüzden."]
    Path(yol).write_text(s + "\n".join(L) + "\n", encoding="utf-8")

def main():
    gec = G / "_gec2"; gec.mkdir(exist_ok=True)
    tablo_klip(gec / "giris.mp4", 1.0, 2.2, P)
    tablo_klip(gec / "cikis.mp4", 2.2, 1.0, F)
    gir = [gec / "giris.mp4"] + [G / f"k{i}.mp4" for i in range(1, 6)] + [gec / "cikis.mp4"]
    sur = [P] + [K] * 5 + [F]
    args, fc = [], []
    for i, (p, d) in enumerate(zip(gir, sur)):
        args += ["-i", str(p)]
        zoom = ""
        if i == 1:  # tablodan dalış: 3D sahne yakından başlayıp açılır
            zoom = ",zoompan=z='if(lt(in_time,1.4),1.6-0.6*(in_time/1.4)*(in_time/1.4)*(3-2*in_time/1.4),1)':x='iw*0.36-iw/zoom/2':y='ih*0.30-ih/zoom/2':d=1:s=1080x1920:fps=30"
        if i == 5:  # tablodan çıkış öncesi 3D sahne yaklaşır
            zoom = f",zoompan=z='if(gt(in_time,{d-1.4}),1+0.5*((in_time-{d-1.4})/1.4)*((in_time-{d-1.4})/1.4),1)':x='iw*0.30-iw/zoom/2':y='ih*0.25-ih/zoom/2':d=1:s=1080x1920:fps=30"
        fc.append(f"[{i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1{zoom},trim=0:{d},setpts=PTS-STARTPTS[v{i}]")
        fc.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:{d},asetpts=PTS-STARTPTS,apad=whole_dur={d}[a{i}]")
    gecis = [("fade", X0)] + [("fade", GE)] * 4 + [("dissolve", XF)]
    sv, sa, t = "v0", "a0", P
    for i in range(1, len(gir)):
        tr, d = gecis[i - 1]
        fc.append(f"[{sv}][v{i}]xfade=transition={tr}:duration={d}:offset={t - d:.3f}[x{i}]")
        fc.append(f"[{sa}][a{i}]acrossfade=d={d}[y{i}]")
        sv, sa, t = f"x{i}", f"y{i}", t + sur[i] - d
    n = len(gir); mi = {}
    for ad in ("m1", "m2", "m3", "m4"):
        mi[ad] = n + len(mi); args += ["-i", str(G / f"{ad}.mp3")]
    parca = []
    for j, (ad, off, b, e) in enumerate(MUZIK):
        bb = max(0, b - 0.3); L = e - bb + 0.3
        fc.append(f"[{mi[ad]}:a]aresample=44100,aformat=channel_layouts=stereo,atrim={off}:{off+L:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-20:TP=-2,aresample=44100,"
                  f"afade=t=in:d={0.3 if j else 0.8},afade=t=out:st={L-0.5:.3f}:d=0.5,adelay={int(bb*1000)}|{int(bb*1000)}[m{j}]")
        parca.append(f"[m{j}]")
    fc.append(f"{''.join(parca)}amix=inputs={len(parca)}:normalize=0,volume=0.55,afade=t=out:st={TOPLAM-1.2:.2f}:d=1.2[muz]")
    fc.append(f"[{sa}]volume=0.9[efekt]")
    fc.append(f"[efekt][muz]amix=inputs=2:duration=longest:normalize=0,atrim=0:{TOPLAM:.2f},loudnorm=I=-14:TP=-1.5:LRA=11[a]")
    altyazi(gec / "alt.ass")
    fc.append(f"[{sv}]eq=saturation=1.06,drawbox=x=0:y=0:w='iw*t/{TOPLAM:.2f}':h=10:color=0xFFCD28:t=fill,ass={gec/'alt.ass'}[v]")
    sh("ffmpeg", "-v", "error", "-y", *args, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-t", f"{TOPLAM:.2f}",
       "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", CIKTI)
    print("tamam", CIKTI, round(TOPLAM, 2))

if __name__ == "__main__":
    main()
