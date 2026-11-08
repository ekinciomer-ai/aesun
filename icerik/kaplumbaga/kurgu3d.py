#!/usr/bin/env python3
"""Kaplumbağa Terbiyecisi 3D Shorts kurgusu.
Girdi klasörü: k1..k5.mp4 (Topview klipleri, kendi efekt sesleriyle), ses.mp3 (klon ses), muzik.mp3,
kelimeler.json (whisper), tablo.jpg (gerçek 1906 tablosu, kamu malı).
Çıktı: 1080x1920 30 fps. Kullanım: python3 kurgu3d.py <girdi> <cikti.mp4>"""
import json, subprocess, sys
from pathlib import Path

G = Path(sys.argv[1]); CIKTI = sys.argv[2]
KLIP = 6.0; GECIS = 0.35; FINAL = 3.2
N = 5
TOPLAM = N * KLIP - (N - 1) * GECIS + FINAL - GECIS
# Seslendirme parçaları: (sesteki başlangıç, bitiş, videodaki yer)
def bas(i): return i * (KLIP - GECIS)
PARCA = [(0.0, 4.45, 0.35), (4.50, 8.85, bas(3) + 0.4), (8.85, 9.87, bas(4) + 3.3)]
# Ekrandaki doğru yazım (whisper sırasına göre aynı sayıda kelime)
DOGRU = "Bu adam 120 yıldır aynı pozda duruyor. Neden ney'i hep arkasında saklıyor? Kaplumbağaya hız öğretemezsin. Ama doğru notayı bulursan... sıraya girer. Neredeyse.".split()
SARI = {"120", "ney'i", "hız", "notayı", "neredeyse."}

def sure(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)
def az(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"

def altyazi(yol):
    w = json.load(open(G / "kelimeler.json", encoding="utf-8"))
    assert len(w) == len(DOGRU), (len(w), len(DOGRU))
    def kaydir(t):
        for a, b, y in PARCA:
            if a - 0.05 <= t <= b + 0.05: return y + (t - a)
        return None
    kel = [(DOGRU[i], kaydir(x["b"]), kaydir(x["s"])) for i, x in enumerate(w)]
    s = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alt,Inter Black,78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,70,70,380,1
Style: Ust,Inter Black,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,4,8,60,60,190,1
Style: Etiket,Inter ExtraBold,40,&H00FFFFFF,&H00FFFFFF,&H00422A0E,&HE6422A0E,-1,0,0,0,100,100,0,0,3,14,0,8,60,60,120,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    L = []
    # 2'şerli gruplar; noktalama grubu kapatır
    gr, g = [], []
    for k in kel:
        g.append(k)
        if len(g) == 2 or k[0][-1] in ".?": gr.append(g); g = []
    if g: gr.append(g)
    for gi, g in enumerate(gr):
        son = min(g[-1][2] + 0.5, gr[gi + 1][0][1]) if gi + 1 < len(gr) else g[-1][2] + 0.8
        for ki, k in enumerate(g):
            b = k[1]; e = g[ki + 1][1] if ki + 1 < len(g) else son
            if e <= b: continue
            t = " ".join(("{\\c&H0028CDFF&}" if (j == ki or x[0].lower() in SARI) else "{\\c&H00FFFFFF&}") + x[0] for j, x in enumerate(g))
            L.append(f"Dialogue: 0,{az(b)},{az(e)},Alt,,0,0,0,,{t}")
    L.append(f"Dialogue: 1,{az(0)},{az(bas(1))},Ust,,0,0,0,,{{\\fad(150,200)}}1906'dan beri aynı poz.\\N{{\\c&H0028CDFF&}}Neden?")
    f0 = bas(5)
    L.append(f"Dialogue: 1,{az(f0 + 0.2)},{az(TOPLAM)},Etiket,,0,0,0,,{{\\fad(300,0)}}Osman Hamdi Bey · Kaplumbağa Terbiyecisi · 1906")
    L.append(f"Dialogue: 1,{az(f0 + 0.9)},{az(TOPLAM)},Ust,,0,0,0,,{{\\fad(300,0)\\pos(540,1500)}}Bu yüzden.")
    Path(yol).write_text(s + "\n".join(L) + "\n", encoding="utf-8")

def main():
    gec = G / "_gec"; gec.mkdir(exist_ok=True)
    # tablo finali: yavaş uzaklaşma
    fr = int(FINAL * 30)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(G / "tablo.jpg"), "-f", "lavfi", "-t", str(FINAL), "-i", "anullsrc=r=44100:cl=stereo",
                    "-vf", f"scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='1.25-0.25*on/{fr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps=30",
                    "-t", str(FINAL), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(gec / "final.mp4")], check=True)
    girdiler = [G / f"k{i}.mp4" for i in range(1, N + 1)] + [gec / "final.mp4"]
    args, fc = [], []
    for i, p in enumerate(girdiler):
        args += ["-i", str(p)]
        d = KLIP if i < N else FINAL
        ses = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip()
        fc.append(f"[{i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,trim=0:{d},setpts=PTS-STARTPTS[v{i}]")
        if ses: fc.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:{d},asetpts=PTS-STARTPTS,apad=whole_dur={d}[a{i}]")
        else: fc.append(f"anullsrc=r=44100:cl=stereo,atrim=0:{d}[a{i}]")
    son_v, son_a = "v0", "a0"; t = KLIP
    for i in range(1, len(girdiler)):
        d = KLIP if i < N else FINAL
        fc.append(f"[{son_v}][v{i}]xfade=transition=fade:duration={GECIS}:offset={t - GECIS:.3f}[x{i}]")
        fc.append(f"[{son_a}][a{i}]acrossfade=d={GECIS}[y{i}]")
        son_v, son_a = f"x{i}", f"y{i}"; t += d - GECIS
    altyazi(gec / "alt.ass")
    ns = len(girdiler)
    args += ["-i", str(G / "ses.mp3"), "-i", str(G / "muzik.mp3")]
    anl = []
    for j, (a, b, y) in enumerate(PARCA):
        fc.append(f"[{ns}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=out:st={b-a-0.06}:d=0.06,adelay={int(y*1000)}|{int(y*1000)}[n{j}]")
        anl.append(f"[n{j}]")
    fc.append(f"{''.join(anl)}amix=inputs={len(anl)}:normalize=0[nar]")
    fc.append(f"[{son_a}]volume=0.85[efekt]")
    fc.append(f"[{ns+1}:a]volume=0.14,afade=t=in:d=0.4,afade=t=out:st={TOPLAM-1.5}:d=1.5[muz]")
    fc.append(f"[nar][efekt][muz]amix=inputs=3:duration=longest:normalize=0,atrim=0:{TOPLAM},loudnorm=I=-14:TP=-1.5:LRA=11[a]")
    fc.append(f"[{son_v}]eq=saturation=1.08,drawbox=x=0:y=0:w='iw*t/{TOPLAM}':h=10:color=0xFFCD28:t=fill,ass={gec/'alt.ass'}[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-t", f"{TOPLAM:.2f}",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", CIKTI], check=True)
    print("tamam", CIKTI, round(TOPLAM, 2))

if __name__ == "__main__":
    main()
