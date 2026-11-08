# Nazar Short — "Celtic konsepti" kurgu: sinematik fotogerçekçi sahneler (3-4 sn), beyaz kalın başlık + sarı anahtar satır,
# etiket kutusu, beyaz altyazı (anahtar kelimeler sarı), yumuşak çapraz geçiş + yavaş yakınlaşma, toz, vinyet, 30 fps.
# Ses: parça parça (NAZAR8_*__sN.mp3) + whisper kelime zamanları (kelimeler/NAZAR8_*__sN.json). Kullanım: DIL=tr|en|es [KURU=1] python3 karma_celtic.py
import os, sys, subprocess, json, math, re, random, difflib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

K = os.path.dirname(os.path.abspath(__file__)); DIL = os.environ.get("DIL", "tr"); KURU = os.environ.get("KURU") == "1"
IMG_KLASOR = os.environ.get("IMG", "img_acik"); TEMA = "acik"
W, H, FPS = 1080, 1920, 30
FI = {"black": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "xbold": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", "bold": "/usr/share/fonts/opentype/inter/Inter-Bold.otf"}
_FC = {}
def font(ad, px):
    if (ad, px) not in _FC: _FC[(ad, px)] = ImageFont.truetype(FI[ad], px)
    return _FC[(ad, px)]
def ease(p): return 1 - (1 - p) ** 3
def norm(x): return re.sub(r"[^\w]", "", x.lower())
def tr_upper(s): return (s.replace("i", "İ").replace("ı", "I") if DIL == "tr" else s).upper()
random.seed(7); np.random.seed(3)
SARI = (255, 214, 0); BEYAZ = (255, 255, 255)

# ---------- metin + tek parça ses (NAZAR7, v2) + whisper kelime zamanları ----------
M = [l.strip() for l in open(f"{K}/metin_{DIL}.txt", encoding="utf-8") if l.strip()]
SES = f"{K}/NAZAR7_{DIL.upper()}_SES__tam.mp3"
def sure(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
SURE = sure(SES); KUYRUK = 1.5; TOPLAM = SURE + KUYRUK; N = int(TOPLAM * FPS)
WJ = json.load(open(f"{K}/kelimeler/NAZAR7_{DIL.upper()}_SES__tam.json", encoding="utf-8"))
KELIME = [w for s in M for w in s.split()]; CUMLE_BAS = []; n = 0
for s in M: CUMLE_BAS.append(n); n += len(s.split())
sm = difflib.SequenceMatcher(None, [norm(x) for x in KELIME], [norm(x["k"]) for x in WJ], autojunk=False)
ZT = [None] * len(KELIME)
for tag, a0, a1, b0, b1 in sm.get_opcodes():
    if tag == "equal":
        for k in range(a1 - a0): ZT[a0 + k] = (WJ[b0 + k]["b"], WJ[b0 + k]["s"])
idx = [k for k, v in enumerate(ZT) if v]; print(f"hizalanan kelime {len(idx)}/{len(KELIME)}")
for k in range(len(KELIME)):
    if ZT[k] is None:
        on = max([j for j in idx if j < k], default=None); so = min([j for j in idx if j > k], default=None)
        a_ = ZT[on][1] if on is not None else 0.0; b_ = ZT[so][0] if so is not None else SURE
        n1 = on if on is not None else -1; n2 = so if so is not None else len(KELIME)
        ZT[k] = (a_ + (b_ - a_) * (k - n1) / (n2 - n1), a_ + (b_ - a_) * (k + 1 - n1) / (n2 - n1))
Z = []; T = []
for i, s in enumerate(M):
    b0 = CUMLE_BAS[i]; e0 = CUMLE_BAS[i + 1] if i + 1 < len(M) else len(KELIME)
    Z.append(ZT[b0:e0]); T.append((ZT[b0][0], ZT[e0 - 1][1]))
def kelime_t(i, anahtar):
    for k, x in enumerate(M[i].split()):
        if norm(x).startswith(norm(anahtar)): return Z[i][k][0]
    return T[i][0]

# ---------- sahneler: (cümle, anahtar|None, görsel, yön, etiket|None, başlık beyaz, başlık sarı) ----------
B = {"tr": [
    (0, None, "c01", 1, "TÜRKİYE · BUGÜN", "3 KİŞİDEN 2'Sİ", "NAZARA İNANIYOR"),
    (0, "Bir", "c14", -1, None, "BİR BAKIŞ", "HASTA EDER Mİ?"),
    (1, None, "c02", 1, "AMA ASIL ŞOK", "BU KORKU", "5.000 YAŞINDA"),
    (2, None, "c03", -1, "MÖ 1300 · UGARİT", "KİL TABLETLERDE", "KEM GÖZ YAZILI"),
    (2, "Mezopotamya", "c04", 1, None, "MEZOPOTAMYA'DAN", "MISIR, YUNAN, ROMA"),
    (3, None, "c05", -1, "YUNAN", "PLUTARKHOS", "GÖZ IŞIN SAÇAR"),
    (3, "Romalılar", "c06", 1, "ROMA", "KAPIDAKİ MUSKA", "LEPTİS MAGNA"),
    (4, None, "c07", -1, "ROMA · 1850", "PAPA IX. PİUS", "KUTSADIĞI BELA BULDU"),
    (4, "Halk", "c08", 1, None, "HALK ONA", "NAZARLI DEDİ"),
    (5, None, "c09", -1, "İZMİR · 1890", "ARAP CAM USTALARI", "DUMAN ŞEHRİ BOĞDU"),
    (5, "Görece", "c10", 1, "GÖRECE · 1930'LAR", "ŞİŞE KIRIĞINDAN", "GÖZ YAPTILAR"),
    (6, None, "c11", -1, "BUGÜN", "NAZARKÖY", "OCAKLAR SÖNDÜ"),
    (7, None, "c12", 1, "186 TOPLUM", "BİR EKONOMİST", "NEDEN ÖLMÜYOR?"),
    (7, "Kıskançlık", "c13", -1, "CEVAP", "KISKANÇLIK", "EŞİTSİZLİK ↑ NAZAR ↑"),
    (8, None, "c14", 1, None, "GÖZLER AYNI", "KORKU AYNI!"),
], "en": [
    (0, None, "c15", 1, "GREECE · INDIA · MEXICO", "MILLIONS", "BELIEVE IT"),
    (0, "One", "c14", -1, None, "ONE LOOK", "CAN MAKE YOU SICK?"),
    (1, None, "c02", 1, "THE REAL SHOCK", "THIS FEAR IS", "5,000 YEARS OLD"),
    (2, None, "c03", -1, "1300 BC · UGARIT", "CLAY TABLETS", "ALREADY WARNED"),
    (2, "Mesopotamia", "c04", 1, None, "FROM MESOPOTAMIA", "EGYPT, GREECE, ROME"),
    (3, None, "c05", -1, "GREECE", "PLUTARCH", "EYES SHOOT RAYS"),
    (3, "Romans", "c06", 1, "ROME", "A CHARM ON THE DOOR", "LEPTIS MAGNA"),
    (4, None, "c07", -1, "ROME · 1850s", "POPE PIUS IX", "BLESSED → DISASTER"),
    (4, "People", "c08", 1, None, "THEY CALLED HIM", "CURSED"),
    (5, None, "c16", -1, "EVERY CULTURE", "ONE FEAR", "A THOUSAND CHARMS"),
    (5, "Mexico", "c17", 1, "MEXICO", "AN EGG", "PULLS THE EYE OUT"),
    (6, None, "c14", -1, None, "DIFFERENT CHARMS", "SAME FEAR"),
    (7, None, "c12", 1, "186 SOCIETIES", "AN ECONOMIST", "WHY WON'T IT DIE?"),
    (7, "envy", "c13", -1, "THE ANSWER", "ENVY", "INEQUALITY ↑ EVIL EYE ↑"),
    (8, None, "c14", 1, None, "SAME EYES", "SAME FEAR!"),
], "es": [
    (0, None, "c18", 1, "ROMA · 1923", "ALFONSO XIII", "NADIE QUERÍA RECIBIRLO"),
    (0, "Decían", "c14", -1, None, "DECÍAN QUE TENÍA", "MAL DE OJO"),
    (1, None, "c02", 1, "EL VERDADERO SUSTO", "ESTE MIEDO TIENE", "5.000 AÑOS"),
    (2, None, "c03", -1, "1300 A.C. · UGARIT", "LAS TABLILLAS", "YA LO DECÍAN"),
    (2, "Nació", "c04", 1, None, "DE MESOPOTAMIA", "A EGIPTO, GRECIA, ROMA"),
    (3, None, "c05", -1, "GRECIA", "PLUTARCO", "EL OJO LANZA RAYOS"),
    (3, "romanos", "c06", 1, "ROMA", "UN AMULETO EN LA PUERTA", "LEPTIS MAGNA"),
    (4, None, "c07", -1, "ROMA · 1850", "PÍO NONO", "BENDECÍA → DESGRACIA"),
    (4, "pueblo", "c08", 1, None, "EL PUEBLO", "LO LLAMÓ GAFE"),
    (5, None, "c19", -1, "ESPAÑA · SIGLO XVI", "LA HIGA DE AZABACHE", "CONTRA LA ENVIDIA"),
    (5, "conquistadores", "c17", 1, "AMÉRICA", "CRUZÓ EL OCÉANO", "HASTA MÉXICO"),
    (6, None, "c20", -1, "HOY", "UN HUEVO", "Y UNA ORACIÓN"),
    (7, None, "c12", 1, "186 SOCIEDADES", "UN ECONOMISTA", "¿POR QUÉ NO MUERE?"),
    (7, "envidia", "c13", -1, "LA RESPUESTA", "ENVIDIA", "DESIGUALDAD ↑ MAL DE OJO ↑"),
    (8, None, "c14", 1, None, "LOS MISMOS OJOS", "¡EL MISMO MIEDO!"),
]}[DIL]
SAHNE = []
for (ci, anahtar, ad, yon, etiket, b1, b2) in B:
    SAHNE.append([kelime_t(ci, anahtar) if anahtar else T[ci][0], None, ad, yon, etiket, b1, b2])
for k in range(len(SAHNE)): SAHNE[k][1] = SAHNE[k + 1][0] if k + 1 < len(SAHNE) else TOPLAM
ALT = {"tr": "Temsili görseller: yapay zekâ · Ses: yapay zekâ ile klonlanmış kendi sesim · Müzik: kanal üretimi",
       "en": "Illustrative visuals: AI generated · Voice: my own AI-cloned voice · Music: made by the channel",
       "es": "Imágenes ilustrativas: IA · Voz: mi propia voz clonada con IA · Música: producción propia"}[DIL]
KANAL = {"tr": "ANTİK STÜDYO", "en": "ANCIENT STUDIO", "es": "ESTUDIO ANTIGUO"}[DIL]
KAPANIS = {"tr": ("TAMAMI KANALDA", "YORUMLARA YAZ ▼"), "en": ("FULL STORY ON THE CHANNEL", "TELL US BELOW ▼"), "es": ("HISTORIA COMPLETA EN EL CANAL", "CUÉNTANOS ABAJO ▼")}[DIL]
# altyazıda sarı olacak anahtar kelimeler (ön ek eşleşmesi, küçük harf)
ANAHTAR = {"tr": ["nazar", "kem", "göz", "bakış", "5000", "beş", "ugarit", "plutarkhos", "pius", "papa", "izmir", "görece", "nazarköy", "kıskançlık", "eşitsizlik", "186", "yüz", "kanal", "şok", "muska", "boncuk"],
           "en": ["evil", "eye", "look", "sick", "5,000", "five", "ugarit", "plutarch", "pius", "pope", "cursed", "envy", "inequality", "186", "charm", "mati", "fatima", "egg", "shock", "channel"],
           "es": ["mal", "ojo", "alfonso", "5", "cinco", "ugarit", "plutarco", "pío", "papa", "gafe", "higa", "azabache", "envidia", "desigualdad", "186", "huevo", "susto", "canal", "méxico"]}[DIL]
def sari_mi(w): n = norm(w); return any(n.startswith(norm(a)) for a in ANAHTAR)

# ---------- altyazı grupları (kesintisiz, 3 kelime) ----------
GRUP = []
for i, s in enumerate(M):
    w = s.split(); g = [list(range(k, min(k + 3, len(w)))) for k in range(0, len(w), 3)]
    if len(g) > 1 and len(g[-1]) == 1: g[-2] += g[-1]; g.pop()
    for ids in g:
        t0 = Z[i][ids[0]][0]; son = ids[-1]
        t1 = Z[i][son + 1][0] if son + 1 < len(w) else (T[i + 1][0] if i + 1 < len(M) else T[i][1] + 0.8)
        GRUP.append((t0, t1, [w[j] for j in ids]))

# ---------- görseller / katmanlar ----------
IMG = {}
def gorsel(ad):
    if ad not in IMG:
        im = Image.open(f"{K}/{IMG_KLASOR}/{ad}.png").convert("RGB")
        r = max(W * 1.12 / im.width, H * 1.12 / im.height); IMG[ad] = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    return IMG[ad]
DUST = [(random.random(), random.random(), random.uniform(1.2, 3.0), random.uniform(0.004, 0.012), random.random() * 6.28) for _ in range(50)]
_g = np.zeros((H, W, 4), np.uint8); yy = np.arange(H)[:, None]
_g[..., 3] = np.clip(70 * np.clip(1 - yy / 620, 0, 1) ** 1.3 + 90 * np.clip((yy - (H - 560)) / 560, 0, 1) ** 1.3, 0, 255).astype(np.uint8)
GOLGE = Image.fromarray(_g, "RGBA")
yy, xx = np.mgrid[0:H, 0:W]; VIN = (1 - 0.12 * np.clip(((xx - W / 2) / (W * 0.65)) ** 2 + ((yy - H / 2) / (H * 0.65)) ** 2, 0, 1) ** 1.5).astype(np.float32)[..., None]
GRAIN = [np.zeros((H, W, 1), np.int16) for _ in range(6)]
def sahne_taban(si, tz):
    t0, t1, ad, yon = SAHNE[si][:4]; p = min(1, max(0, (tz - t0) / max(0.8, t1 - t0)))
    im = gorsel(ad); w, h = im.size; z = 1.0 + 0.08 * (ease(p) if yon > 0 else 1 - ease(p)); cw, ch = int(W / z), int(H / z)
    cx = (w - cw) // 2 + int((w - cw) * 0.25 * math.sin(p * 3.14) * yon); cy = (h - ch) // 2 + int((h - ch) * 0.12 * (p - 0.5) * yon)
    return im.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.BILINEAR)
def sigdir(d, metin, ad, px, maxw):
    ft = font(ad, px)
    while d.textlength(metin, font=ft) > maxw and px > 30: px -= 4; ft = font(ad, px)
    return ft
def baslik(d, s, tz, alfa=1.0):
    t0, _, _, _, etiket, b1, b2 = s; y = 150
    g0 = ease(min(1, max(0, (tz - t0) / 0.35))) * alfa
    if etiket:
        ft = font("xbold", 34); tw = d.textlength(etiket, font=ft); bx = (W - tw) / 2 - 22
        d.rounded_rectangle((bx, y, bx + tw + 44, y + 58), 14, fill=(18, 28, 56, int(235 * g0)))
        d.text((bx + 22, y + 9), etiket, font=ft, fill=(255, 214, 0, int(255 * g0))); y += 80
    for j, (metin, renk) in enumerate([(b1, BEYAZ), (b2, SARI)]):
        g = ease(min(1, max(0, (tz - t0 - 0.12 * (j + 1)) / 0.4))) * alfa; ft = sigdir(d, metin, "black", 92 if j == 0 else 76, W - 90)
        tw = d.textlength(metin, font=ft); d.text(((W - tw) / 2, y + (1 - g) * 30), metin, font=ft, fill=renk + (int(255 * g),), stroke_width=7, stroke_fill=(18, 28, 56, int(235 * g)))
        y += (92 if j == 0 else 76) + 14
def altyazi(d, tz):
    for (t0, t1, kel) in GRUP:
        if t0 <= tz < t1:
            px = 66; metin = tr_upper(" ".join(kel)); ft = sigdir(d, metin, "black", px, W - 60); px = ft.size
            x = (W - d.textlength(metin, font=ft)) / 2; y = 1440
            for wd in kel:
                u = tr_upper(wd); d.text((x, y), u, font=ft, fill=SARI if sari_mi(wd) else BEYAZ, stroke_width=7, stroke_fill=(18, 28, 56)); x += d.textlength(u + " ", font=ft)
            break
GECIS = 0.35
def kare(fi):
    tz = fi / FPS
    si = next((i for i, s in enumerate(SAHNE) if tz < s[1]), len(SAHNE) - 1); s = SAHNE[si]; t0 = s[0]
    fr = sahne_taban(si, tz); karisim = 0.0
    if si > 0 and tz - t0 < GECIS: karisim = 1 - ease((tz - t0) / GECIS); fr = Image.blend(fr, sahne_taban(si - 1, tz), karisim)
    arr = np.clip(np.asarray(fr).astype(np.float32) * VIN, 0, 255).astype(np.int16) + GRAIN[fi % 6]
    fr = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA"); fr = Image.alpha_composite(fr, GOLGE); d = ImageDraw.Draw(fr, "RGBA")
    # ilerleme çubuğu (üstte, sarı)
    d.rectangle((0, 0, W, 8), fill=(18, 28, 56)); d.rectangle((0, 0, W * tz / TOPLAM, 8), fill=SARI)
    if karisim > 0: baslik(d, SAHNE[si - 1], tz, alfa=karisim)
    if si == len(SAHNE) - 1 and tz > T[-1][1] - 0.2:   # kapanış kartı
        g = ease(min(1, max(0, (tz - (T[-1][1] - 0.2)) / 0.4))); ft = font("black", 56); ft2 = font("black", 48)
        for j, (m, renk, yy0) in enumerate([(KAPANIS[0], BEYAZ, 150), (KAPANIS[1], SARI, 230)]):
            f = ft if j == 0 else ft2; f = sigdir(d, m, "black", f.size, W - 80); tw = d.textlength(m, font=f)
            d.text(((W - tw) / 2, yy0), m, font=f, fill=renk + (int(255 * g),), stroke_width=7, stroke_fill=(18, 28, 56, int(235 * g)))
    else: baslik(d, s, tz)
    altyazi(d, tz)
    ft = font("black", 28); d.text(((W - d.textlength(KANAL, font=ft)) / 2, H - 76), KANAL, font=ft, fill=BEYAZ, stroke_width=3, stroke_fill=(0, 0, 0))
    ft = font("bold", 20); d.text((W - d.textlength(ALT, font=ft) - 20, H - 40), ALT, font=ft, fill=(210, 210, 210), stroke_width=2, stroke_fill=(0, 0, 0))
    if tz > TOPLAM - 0.6: d.rectangle((0, 0, W, H), fill=(0, 0, 0, int(255 * (tz - (TOPLAM - 0.6)) / 0.6)))
    return fr.convert("RGB")

if KURU:
    print(json.dumps({"toplam": round(TOPLAM, 1), "sahne": [(s[2], round(s[0], 1), round(s[1], 1)) for s in SAHNE]}, ensure_ascii=False))
    for n, si in enumerate([0, 2, 6, 9, 13, 14]): kare(int((SAHNE[si][0] + 1.2) * FPS)).save(f"{K}/kuru_{DIL}_{n}.png")
    sys.exit()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", SES, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-ac", "1", f"{K}/ses_{DIL}_konusma.wav"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{K}/ses_{DIL}_konusma.wav", "-i", f"{K}/altyapi.wav", "-filter_complex",
                f"[0:a]apad=pad_dur={KUYRUK}[v];[1:a]atrim=0:{TOPLAM:.2f},afade=t=in:d=1.5,afade=t=out:st={TOPLAM-2.5:.2f}:d=2.5,volume=0.14[m];[v][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.5[a]",
                "-map", "[a]", "-ar", "44100", f"{K}/ses_{DIL}.m4a"], check=True)
out = f"{K}/NAZAR_{DIL.upper()}_acik.mp4"
ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{K}/ses_{DIL}.m4a",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for fi in range(N):
    ff.stdin.write(kare(fi).tobytes())
    if fi % 300 == 0: print(f"kare {fi}/{N}", flush=True)
ff.stdin.close(); ff.wait(); print("bitti", out, os.path.getsize(out) // 1024, "KB")
