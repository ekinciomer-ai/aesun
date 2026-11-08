#!/usr/bin/env python3
"""Kaplumbağa Terbiyecisi Shorts kurgusu.
Girdi klasörü: k01.mp4..k10.mp4 (Topview klipleri), ses.mp3 (klon ses), muzik.mp3, kelimeler.json (whisper)
Çıktı: kaplumbaga_tr.mp4 (1080x1920, 30 fps). Altyazı: senaryodaki doğru yazım + whisper zamanları; anahtar kelimeler sarı.
Kullanım: python3 kurgu.py <girdi_klasoru> <cikti.mp4>"""
import json, re, subprocess, sys, difflib
from pathlib import Path

G = Path(sys.argv[1]); CIKTI = sys.argv[2]
SES_SURE = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(G / "ses.mp3")], capture_output=True, text=True).stdout)
TOPLAM = round(SES_SURE + 1.2, 2)

# Sahne zaman çizelgesi (seslendirmedeki kelime başlangıçlarına göre)
KES = [0.0, 4.5, 6.3, 11.1, 14.5, 18.0, 22.4, 25.3, 31.2, 35.1, TOPLAM]
SAHNE_ETIKET = ["Pera Müzesi · gece", "", "Çıtır · marul uzmanı", "Selfie · 0 takipçi", "Kaçak · 2 saattir kapıda",
                "Paşa · toplantı", "Hoca · 1906'dan beri", "", "", "Sabah 09.00"]

METIN = ("Bu tablodaki kaplumbağalar yüz yirmi yıldır yerinden kımıldamıyor... sanıyorsunuz. Müze kapanınca mesai başlıyor. "
         "Çıtır'ın uzmanlık alanı: görünmez olmak. Hızı mı? Saatte 300 metre. Selfie'nin hedefi 1 milyon takipçi. Şu an: 0. "
         "Kaçak 2 saattir kapıda. Özgürlüğe bir basamak kaldı. Paşa toplantı çağrısı yaptı. Katılım: sadece Uyku. O da uyuyor. "
         "Ve geliyor... 1906'dan beri aynı sabır. Bir dürtme... marul iade. Bir dürtme... telefon iade. Kaçak'a tek dokunuş: yön değiştirme. "
         "Disiplinin sırrı bağırmak değil... doğru notayı bulmak. Sabah 9. Her şey yerli yerinde. Neredeyse. "
         "Bu tablodaki kaplumbağalar hiç kımıldamıyor... sanıyorsunuz.")
VURGU = {"kaplumbağalar", "sanıyorsunuz", "görünmez", "300", "0", "basamak", "uyuyor", "sabır", "iade", "notayı", "neredeyse", "1906'dan"}

def norm(s): return re.sub(r"[^a-zçğıöşü0-9]", "", s.lower().replace("İ", "i").replace("I", "ı"))

def zamanla():
    w = json.load(open(G / "kelimeler.json", encoding="utf-8"))
    wh = [x["k"] for x in w]; ws = [x["b"] for x in w]; we = [x["s"] for x in w]
    dog = METIN.replace("...", " ").split()
    # yüz yirmi → whisper '120' gibi farkları karakter düzeyinde hizala
    a = "".join(norm(t) for t in dog); b = "".join(norm(t) for t in wh)
    def konumlar(tokenlar):
        k, p = [], 0
        for t in tokenlar: n = len(norm(t)); k.append((p, p + max(n, 1))); p += n
        return k
    ka, kb = konumlar(dog), konumlar(wh)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    harita = {}
    for bl in sm.get_matching_blocks():
        for i in range(bl.size): harita[bl.a + i] = bl.b + i
    def bzaman(ci, bas=True):
        for j, (s, e) in enumerate(kb):
            if s <= ci < e: return ws[j] if bas else we[j]
        return None
    out = []
    for t, (s, e) in zip(dog, ka):
        c = next((harita[i] for i in range(s, e) if i in harita), None)
        c2 = next((harita[i] for i in range(e - 1, s - 1, -1) if i in harita), None)
        out.append([t, bzaman(c) if c is not None else None, bzaman(c2, False) if c2 is not None else None])
    for i, o in enumerate(out):  # boşlukları doldur
        if o[1] is None: o[1] = out[i - 1][2] if i else 0.0
        if o[2] is None: o[2] = o[1] + 0.3
    return out

def ass_zaman(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"

def altyazi(kel, yol):
    bas = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alt,Inter Black,74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,3,2,70,70,430,1
Style: Etiket,Inter ExtraBold,40,&H00FFFFFF,&H00FFFFFF,&H00422A0E,&HE6422A0E,-1,0,0,0,100,100,0,0,3,14,0,7,60,60,150,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    satirlar = []
    # 3'erli kelime grupları, konuşulan kelime sarı
    gruplar, g = [], []
    for k in kel:
        g.append(k)
        if len(g) == 3 or k[0][-1] in ".?:,": gruplar.append(g); g = []
    if g: gruplar.append(g)
    for gi, g in enumerate(gruplar):
        son = gruplar[gi + 1][0][1] if gi + 1 < len(gruplar) else g[-1][2] + 0.4
        for ki, k in enumerate(g):
            bas_t = k[1]; bit = g[ki + 1][1] if ki + 1 < len(g) else son
            if bit <= bas_t: continue
            parca = []
            for kj, x in enumerate(g):
                temiz = x[0].strip(".,:?")
                renk = "&H0028CDFF&" if (kj == ki or norm(temiz) in {norm(v) for v in VURGU}) else "&H00FFFFFF&"
                parca.append(f"{{\\c{renk}}}{x[0].replace('...', '…')}")
            satirlar.append(f"Dialogue: 0,{ass_zaman(bas_t)},{ass_zaman(bit)},Alt,,0,0,0,,{' '.join(parca)}")
    for i, e in enumerate(SAHNE_ETIKET):
        if e: satirlar.append(f"Dialogue: 1,{ass_zaman(KES[i] + 0.2)},{ass_zaman(KES[i + 1] - 0.1)},Etiket,,0,0,0,,{e}")
    Path(yol).write_text(bas + "\n".join(satirlar) + "\n", encoding="utf-8")

def main():
    gec = G / "_gec"; gec.mkdir(exist_ok=True)
    parcalar = []
    for i in range(10):
        sure = KES[i + 1] - KES[i]
        kaynak = G / f"k{i+1:02d}.mp4"
        cikis = gec / f"p{i+1:02d}.mp4"
        kd = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(kaynak)], capture_output=True, text=True).stdout)
        hiz = "" if kd >= sure else f",setpts={sure/kd:.4f}*PTS"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(kaynak), "-t", f"{sure:.3f}", "-an", "-vf",
                        f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30{hiz},eq=saturation=1.15",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-t", f"{sure:.3f}", str(cikis)], check=True)
        parcalar.append(cikis)
    (gec / "liste.txt").write_text("".join(f"file '{p}'\n" for p in parcalar))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(gec / "liste.txt"), "-c", "copy", str(gec / "goruntu.mp4")], check=True)
    kel = zamanla(); json.dump(kel, open(gec / "duzeltilmis.json", "w", encoding="utf-8"), ensure_ascii=False)
    altyazi(kel, gec / "alt.ass")
    fc = (f"[0:v]drawbox=x=0:y=0:w='iw*t/{TOPLAM}':h=10:color=0xFFCD28:t=fill,ass={gec/'alt.ass'}[v];"
          f"[1:a]volume=1.0,apad[a1];[2:a]volume=0.16,afade=t=in:d=0.5,afade=t=out:st={TOPLAM-1.2}:d=1.2[a2];"
          f"[a1][a2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(gec / "goruntu.mp4"), "-i", str(G / "ses.mp3"), "-i", str(G / "muzik.mp3"),
                    "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{TOPLAM}", "-c:v", "libx264", "-preset", "veryfast",
                    "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", CIKTI], check=True)
    print("tamam", CIKTI, TOPLAM)

if __name__ == "__main__":
    main()
