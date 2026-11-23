#!/usr/bin/env python3
"""Kozmos Lab · Merak Shorts üretim hattı (sunucu / GitHub Actions; bilgisayar gerekmez).
Adımlar: ses (sunucuda Gemini, onaylı ses kütüphanesi) → kurgu (zaman çizelgesi) → görüntü (3D kare kare) → ses tasarımı (kodla) → karıştırma → mp4

Kullanım:
  python3 uret.py <senaryo.json> [--is is_klasoru] [--sahte-ses] [--adim ses,kurgu,goruntu,sfx,birlestir]
Çıktı: <is>/<KOD>/<KOD>.mp4 (+ kurgu.json, ses.wav, kapak.jpg)
"""
import json, os, re, sys, subprocess, argparse, wave, math
import numpy as np

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TEMPO = 1.12          # gTTS biraz yavaş; doğal hıza çek
ARA = 0.22            # parçalar arası nefes
ILK = 0.45            # video başında sessizlik


def sh(*a, **k):
    r = subprocess.run(list(a), capture_output=True, text=True, **k)
    if r.returncode:
        raise SystemExit(f"HATA {' '.join(map(str, a))[:200]}\n{r.stderr[-1500:]}")
    return r.stdout


def wav_oku(f):
    with wave.open(f) as w:
        n = w.getnframes(); ch = w.getnchannels()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
        return x.reshape(-1, ch).mean(1) if ch > 1 else x


def wav_yaz(f, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1: x = np.stack([x, x], 1)
    with wave.open(f, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


# ---------------- 1) SES: Google TTS ----------------
def ses(S, IS, sahte=False):
    os.makedirs(f"{IS}/ses", exist_ok=True)
    for p in S["parcalar"]:
        mp3, wv = f"{IS}/ses/{p['id']}.mp3", f"{IS}/ses/{p['id']}.wav"
        if os.path.exists(wv): continue
        if sahte:  # yerel deneme: tahmini süreli sessizlik
            d = max(1.5, len(p["metin"]) / 15.5)
            wav_yaz(wv, np.zeros(int(d * SR))); continue
        if not os.path.exists(mp3):  # ses sunucudaki Gemini kuyruğundan gelir; gTTS/edge-tts kullanılmaz (Ömer 17.11.2026)
            raise SystemExit(f"HATA ses yok: {mp3} (sunucu seslendirmesi başarısız)")
        # baş/son sessizliği kırp, hızlandır, hafif ses rengi (sıcaklık + parlaklık), 48 kHz
        sh("ffmpeg", "-v", "error", "-y", "-i", mp3, "-af",
           "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.3:stop_silence=0.16,areverse,"
           "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,"
           f"atempo={TEMPO},highpass=f=70,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3500:t=q:w=1.2:g=2,"
           "acompressor=threshold=-18dB:ratio=3:attack=8:release=120,aresample=48000",
           "-ac", "1", wv)


# ---------------- 2) KURGU ----------------
def hece(w):
    return max(1, len(re.findall(r"[aeıioöuüâîûAEIİOÖUÜÂÎÛ]", w)))


def norm(s):
    return s.replace("İ", "i").replace("I", "ı").lower().strip(".,!?;:…'\"’")


def kurgu(S, IS):
    t = ILK; parcalar = []
    for i, p in enumerate(S["parcalar"]):
        d = len(wav_oku(f"{IS}/ses/{p['id']}.wav")) / SR
        ws = p["metin"].split()
        ag = [hece(w) + (1.6 if re.search(r"[.!?]$", w) else 0.9 if re.search(r"[,;:]$", w) else 0) for w in ws]
        top = sum(ag); kel = []; c = t
        for w, a in zip(ws, ag):
            dd = d * a / top
            kel.append({"w": w, "b": round(c, 3), "s": round(c + dd * .92, 3)}); c += dd
        ekran = []
        for e in p.get("ekran", []):
            e = dict(e); zt = t + 0.3
            if e.get("k"):
                hk = norm(e["k"])
                for k in kel:
                    if norm(k["w"]).startswith(hk): zt = k["b"]; break
            elif "an" in e: zt = t + d * e["an"]
            e["t"] = round(zt, 3); ekran.append(e)
        parcalar.append({"id": p["id"], "sahne": p["sahne"], "p": p.get("p", {}), "bas": round(t, 3), "son": round(t + d, 3),
                         "kelimeler": kel, "ekran": ekran, "metin": p["metin"]})
        t += d + (0.35 if i == 0 else ARA)
    K = {"kod": S["kod"], "no": S.get("no", ""), "soru": S["soru"], "parcalar": parcalar, "toplam": round(t - ARA + 1.3, 2)}
    json.dump(K, open(f"{IS}/kurgu.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"kurgu: {K['toplam']} sn, {len(parcalar)} parça")
    return K


# ---------------- 4) SES TASARIMI (kodla sentez) ----------------
R = np.random.default_rng(11)


def zarf(n, a, d, egri=3.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * egri / max(d, 1e-3))
    return e


def lp(x, fc):  # tek kutuplu alçak geçiren (zamanla değişebilir fc)
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y


def lp_hizli(x, fc):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, fc, "low", fs=SR, output="sos"), x)


def bp(x, f1, f2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, [f1, f2], "band", fs=SR, output="sos"), x)


def hp(x, fc):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, fc, "high", fs=SR, output="sos"), x)


def whoosh(d=0.75, yon=1):
    n = int(d * SR); x = R.standard_normal(n)
    t = np.linspace(0, 1, n)
    fc = 300 * (14 ** (t if yon > 0 else 1 - t))
    # süpürülen bant: iki LP farkı
    y = lp(x, fc * 1.6) - lp(x, fc * .55)
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.6
    return y * env * 2.2


def suzul(d=0.7, yon=1):  # gürültüsüz geçiş: yumuşak yükselen/alçalan ton (Ömer 23.11: "fış" sesi itici)
    n = int(d * SR); t = np.linspace(0, 1, n)
    f = 220 * (2 ** ((t if yon > 0 else 1 - t) * 1.0))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + .35 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    return y * np.sin(np.pi * t) ** 2 * .5


def darbe(d=1.4, f0=58, f1=32):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 7); ph = 2 * np.pi * np.cumsum(f) / SR
    g = np.sin(ph) * zarf(n, .004, d * .55, 3.5)
    gov = lp_hizli(R.standard_normal(n), 250) * zarf(n, .002, .12, 4) * .3
    return (g * 1.1 + gov)


def ping(f=1320, d=1.2, parlak=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.01 * t) * parlak + .2 * np.sin(2 * np.pi * f * 3.98 * t) * parlak)
    return y * zarf(n, .002, d * .5, 4) * .5


def tik(f=2400):
    n = int(.045 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * zarf(n, .0005, .02, 4) * .8


def yukselen(d=1.4):
    n = int(d * SR); t = np.linspace(0, 1, n)
    f = 110 * (2 ** (t * 2)); ton = np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * .2
    return ton * t ** 2.2


def guc_kes(d=2.2):  # güneş sönüyor: düşen ton + alt bas
    n = int(d * SR); t = np.arange(n) / SR
    f = 220 * np.exp(-t * 2.2) + 28; y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    y += .5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    gur = lp_hizli(R.standard_normal(n), 300) * .6
    return (y * .8 + gur) * zarf(n, .01, d * .6, 2.5)


def atmosfer(dur, mod="uzay"):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    kok = {"uzay": [55, 82.41, 110, 164.8], "enerji": [65.4, 98, 130.8, 196]}[mod]
    for i, f in enumerate(kok):
        for dt in (-.35, .35):
            lfo = 1 + .002 * np.sin(2 * np.pi * (.05 + i * .013) * t)
            y += np.sin(2 * np.pi * (f + dt) * lfo * t + i) * (.22 / (i + 1))
    ac = .5 + .5 * np.sin(2 * np.pi * t / 9.0 - 1.2)
    y *= .6 + .4 * ac
    # uzak pırıltılar
    for k in np.arange(2.0, dur - 1, 3.7):
        i0 = int((k + R.random()) * SR); s = ping(R.choice([1760, 1975, 2349, 2637]), 2.4, .5) * .18
        y[i0:i0 + len(s)] += s[:max(0, min(len(s), n - i0))]
    giris = np.minimum(1, t / 1.2); cikis = np.minimum(1, (dur - t) / 1.0)
    return y * giris * np.clip(cikis, 0, 1)


def ekle(y, s, t, g=1.0):
    i0 = int(t * SR)
    if i0 < 0: s = s[-i0:]; i0 = 0
    m = min(len(s), len(y) - i0)
    if m > 0: y[i0:i0 + m] += s[:m] * g


def sfx(K, IS, mod="uzay"):
    dur = K["toplam"]; n = int(dur * SR)
    fx = np.zeros(n)
    bed = atmosfer(dur, mod)
    # blok geçişleri: whoosh + darbe
    onceki = None
    for i, p in enumerate(K["parcalar"]):
        if p["sahne"] != onceki and i > 0:
            ekle(fx, suzul(.7), p["bas"] - .6, .3); ekle(fx, darbe(), p["bas"] - .02, .5)
        onceki = p["sahne"]
        # sahneye özel olaylar
        if p["sahne"] == "gunes" and p["p"].get("mod") == "son":
            ts = p["bas"] + (p["son"] - p["bas"]) * p["p"].get("an", .62)
            ekle(fx, yukselen(1.3), ts - 1.25, .5); ekle(fx, guc_kes(), ts, .9); ekle(fx, darbe(2.0, 50, 26), ts, .7)
        for e in p["ekran"]:
            if e["tip"] == "sayi":
                sure = e.get("sure", 1.1) if e.get("say") is not None else 0
                if sure:
                    k = 0
                    while k < sure * .92:
                        ekle(fx, tik(2600 + 400 * (k / sure)), e["t"] + k, .16); k += .09 * (1 - .55 * k / sure)
                ekle(fx, ping(988, 1.6), e["t"] + sure, .55); ekle(fx, darbe(.9, 70, 40), e["t"] + sure, .35)
            elif e["tip"] == "formul":
                ekle(fx, ping(1568, .6, .4), e["t"], .3)
            else:
                ekle(fx, ping(1318, .7, .6), e["t"], .3)
    # kapanış: son blok öncesi yükselen + son vuruş
    son = K["parcalar"][-1]
    ekle(fx, yukselen(1.6), son["bas"] - 1.5, .35); ekle(fx, darbe(2.2, 45, 24), dur - 1.6, .45)
    np.save(f"{IS}/fx.npy", fx.astype(np.float32)); np.save(f"{IS}/bed.npy", bed.astype(np.float32))
    print("ses tasarımı hazır")


# ---------------- 5) KARIŞTIR + BİRLEŞTİR ----------------
def birlestir(K, IS):
    dur = K["toplam"]; n = int(dur * SR)
    v = np.zeros(n)
    for p in K["parcalar"]:
        ekle(v, wav_oku(f"{IS}/ses/{p['id']}.wav"), p["bas"], 1.0)
    fx = np.load(f"{IS}/fx.npy")[:n]; bed = np.load(f"{IS}/bed.npy")[:n]
    # ducking: konuşma varken atmosfer -9 dB
    env = np.sqrt(np.convolve(v ** 2, np.ones(2400) / 2400, "same"))
    var = np.clip(env / .02, 0, 1)
    k = np.convolve(var, np.ones(int(.25 * SR)) / int(.25 * SR), "same")
    duck = 1 - .65 * np.clip(k, 0, 1)
    vn = v / (np.max(np.abs(v)) + 1e-6) * .85
    mix = vn * 1.0 + fx / (np.max(np.abs(fx)) + 1e-6) * .42 + bed / (np.max(np.abs(bed)) + 1e-6) * .2 * duck
    # stereo genişlik: atmosfer ve efektlere hafif gecikme
    sag = mix.copy(); d = int(.011 * SR)
    sag[d:] = vn[d:] + (fx[:-d] / (np.max(np.abs(fx)) + 1e-6)) * .42 + (bed[:-d] / (np.max(np.abs(bed)) + 1e-6)) * .2 * duck[d:]
    st = np.stack([mix, sag], 1)
    st /= max(1.0, np.max(np.abs(st)) / .98)
    wav_yaz(f"{IS}/karisim.wav", st)
    kod = K["kod"]
    sh("ffmpeg", "-v", "error", "-y", "-i", f"{IS}/goruntu.mp4", "-i", f"{IS}/karisim.wav",
       "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
       "-shortest", "-movflags", "+faststart", f"{IS}/{kod}.mp4")
    # kapak: sayı/soru görünen bir kare
    sh("ffmpeg", "-v", "error", "-y", "-ss", str(min(2.2, dur / 3)), "-i", f"{IS}/goruntu.mp4", "-frames:v", "1", "-q:v", "2", f"{IS}/kapak.jpg")
    print("hazır:", f"{IS}/{kod}.mp4")


def goruntu(K, IS, kareler=None):
    env = dict(os.environ)
    if kareler: env["KARELER"] = kareler
    hedef = f"{IS}/kare.jpg" if kareler else f"{IS}/goruntu.mp4"
    r = subprocess.run(["node", f"{KOK}/arac/kayit.js", f"{KOK}/sahne.html", f"{IS}/kurgu.json", hedef, "30"], env=env)
    if r.returncode: raise SystemExit("HATA görüntü")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("senaryo"); ap.add_argument("--is", default=os.path.join(KOK, "is"))
    ap.add_argument("--sahte-ses", action="store_true"); ap.add_argument("--adim", default="ses,kurgu,goruntu,sfx,birlestir")
    ap.add_argument("--kareler", default=None)
    a = ap.parse_args()
    S = json.load(open(a.senaryo, encoding="utf-8"))
    IS = os.path.join(a.is_ if hasattr(a, "is_") else getattr(a, "is"), S["kod"]); os.makedirs(IS, exist_ok=True)
    ad = a.adim.split(",")
    if "ses" in ad: ses(S, IS, a.sahte_ses)
    K = kurgu(S, IS) if "kurgu" in ad else json.load(open(f"{IS}/kurgu.json", encoding="utf-8"))
    if "goruntu" in ad: goruntu(K, IS, a.kareler)
    if "sfx" in ad: sfx(K, IS, S.get("ses_modu", "uzay"))
    if "birlestir" in ad: birlestir(K, IS)
