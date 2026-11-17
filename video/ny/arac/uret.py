# Nasıl Yapıldı · otomatik kısa video hattı (Shorts / Reels / TikTok, 9:16)
# Kullanım: python3 uret.py <KOD> [onizleme|final] [--kare N]
#   1) Google TTS parçaları (video/ny/ses/<KOD>/sNN.mp3) hızlandırılır, sessizlik kırpılır, zamanlanır
#   2) Kelime zamanları + altyazı grupları + kurgu.json
#   3) Ses tasarımı kodla: müzik yatağı, atmosfer, geçiş/vurgu efektleri (telifsiz, tamamen sentez)
#   4) 3D motor (motor/sahne.html, three.js) kare kare kaydedilir
#   5) Miks: anlatım + kısılan müzik + efektler, -14 LUFS → çıktı/<KOD>_<mod>.mp4
import json, os, re, subprocess, sys, math
import numpy as np
from scipy.signal import fftconvolve, lfilter
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TEMPO = float(os.environ.get("NY_TEMPO", "1.17"))
def sh(*a): subprocess.run(a, check=True)
def sure(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
def wav_oku(f):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, np.float32).copy()
def wav_yaz(f, x):
    x = np.asarray(x, np.float32); ch = 1 if x.ndim == 1 else x.shape[1]
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-i", "-", "-c:a", "pcm_s24le", f], stdin=subprocess.PIPE)
    p.communicate(x.tobytes())

# ---------------- Türkçe sayı → rakam (altyazı için) ----------------
BIR = {"bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, "yedi": 7, "sekiz": 8, "dokuz": 9}
ON = {"on": 10, "yirmi": 20, "otuz": 30, "kırk": 40, "elli": 50, "altmış": 60, "yetmiş": 70, "seksen": 80, "doksan": 90}
def sayi_kelime(w): return re.sub(r"[^\wçğıöşüâî']", "", w.lower())
def sayilari_birlestir(kel):
    out, i = [], 0
    while i < len(kel):
        j, top, ara, son_tip, kullan = i, 0, 0, None, []
        while j < len(kel):
            w = sayi_kelime(kel[j]["w"])
            if w in BIR and son_tip not in ("bir", "on"): ara += BIR[w]; son_tip = "bir"
            elif w in BIR and son_tip == "on": ara += BIR[w]; son_tip = "bir"
            elif w in ON and son_tip in (None, "yuz", "bin"): ara += ON[w]; son_tip = "on"
            elif w == "yüz" and son_tip in (None, "bir", "bin"): ara = (ara or 1) * 100; son_tip = "yuz"
            elif w == "bin" and son_tip != "bin_": top += (ara or 1) * 1000; ara = 0; son_tip = "bin"
            else: break
            kullan.append(kel[j]); j += 1
            if re.search(r"[.,!?:]$", kel[j - 1]["w"]): break
        deg = top + ara
        if len(kullan) >= 2 or (len(kullan) == 1 and deg >= 10 and sayi_kelime(kullan[0]["w"]) not in ("on",)):
            if len(kullan) >= 2 and sayi_kelime(kullan[0]["w"]) == "bir" and sayi_kelime(kullan[1]["w"]) in BIR: kullan = []
        else: kullan = []
        if kullan:
            son = kullan[-1]["w"]; ek = re.search(r"[.,!?:]+$", son)
            tok = {"w": f"{deg:,}".replace(",", ".") + (ek.group(0) if ek else ""), "t0": kullan[0]["t0"], "t1": kullan[-1]["t1"]}; i += len(kullan)
            if not ek and i < len(kel):
                nw = kel[i]["w"]; low = nw.lower()
                for kok_, bir_ in (("kilometrekare", "km²"), ("kilometre", "km"), ("metre", "m")):
                    if low.startswith(kok_):
                        kalan = nw[len(kok_):]; m_ = re.match(r"^([^\W\d_]*)(.*)$", kalan)
                        tok = {"w": tok["w"] + " " + bir_ + ("'" + m_.group(1) if m_.group(1) else "") + m_.group(2), "t0": tok["t0"], "t1": kel[i]["t1"]}; i += 1; break
            out.append(tok)
        else: out.append(kel[i]); i += 1
    return out
def kelime_zamanla(metin, t0, t1):
    ws = metin.split(); ag = [len(re.sub(r"\W", "", w)) + 2 + (5 if re.search(r"(\.\.\.|[.!?])$", w) else 2 if re.search(r"[,:]$", w) else 0) for w in ws]
    T = sum(ag); t = t0; out = []
    for w, a in zip(ws, ag):
        d = (t1 - t0) * a / T; out.append({"w": w, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return out
def grupla(kel, pid):
    gr, cur = [], []
    for w in kel:
        if cur and sum(len(x["w"]) + 1 for x in cur) + len(w["w"]) > 19: gr.append(cur); cur = []
        cur.append(w)
        if len(cur) >= 3 or sum(len(x["w"]) for x in cur) >= 16 or re.search(r"[.,!?:]$", w["w"]):
            gr.append(cur); cur = []
    if cur: gr.append(cur)
    return [{"k": f"{pid}_{i}", "t0": g[0]["t0"], "t1": g[-1]["t1"], "w": [{"w": re.sub(r"[.,!?:]+$", "", x["w"]) if not re.match(r"^[\d.]+$", x["w"]) else x["w"].rstrip(".,"), "t0": x["t0"]} for x in g]} for i, g in enumerate(gr)]
def norm(w): return re.sub(r"[^\wçğıöşüâî]", "", w.lower().replace("İ", "i").replace("I", "ı"))

# ---------------- ses tasarımı (sentez) ----------------
rng = np.random.default_rng(7)
def zarf(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
def onepole(x, fc):  # zamanla değişen alçak geçiren (fc dizi olabilir)
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y
def lp(x, fc): a = math.exp(-2 * math.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
def hp(x, fc): return x - lp(x, fc)
def bp(x, lo, hi): return lp(hp(x, lo), hi)
def pan(x, p): p = np.broadcast_to(np.asarray(p, float), x.shape); return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], 1)
IR = None
def reverb(x, sure_=1.6, kuru=.75):
    global IR
    if IR is None:
        n = int(sure_ * SR); t = np.arange(n) / SR
        IR = np.stack([lp(rng.standard_normal(n), 5000) * np.exp(-t * 4.2) for _ in range(2)], 1) * .05
    if x.ndim == 1: x = np.stack([x, x], 1)
    w = np.stack([fftconvolve(x[:, c], IR[:, c])[:len(x)] for c in range(2)], 1)
    return x * kuru + w
def whoosh(d=.75, yon=1):
    n = int(d * SR); t = np.linspace(0, 1, n); x = rng.standard_normal(n)
    fc = 250 + 5200 * np.sin(np.pi * t) ** 2.2; y = onepole(x, fc); y = hp(y, 180)
    e = np.sin(np.pi * t) ** 1.6; y *= e; y /= np.abs(y).max() + 1e-9
    return pan(y * .8, (t * 2 - 1) * .7 * yon)
def boom(d=2.2, f0=95, f1=32):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 7); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 2.2); nz = lp(rng.standard_normal(n), 900) * np.exp(-t * 14) * .9
    k = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 90) * .25
    y = s + nz + k; y /= np.abs(y).max(); return reverb(y * .9, 1.6, .85)
def tik(f=2400):
    n = int(.03 * SR); t = np.arange(n) / SR; y = np.sin(2 * np.pi * f * t) * np.exp(-t * 180)
    return pan(y * .5, 0)
def damga():
    n = int(.5 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (60 + 140 * np.exp(-t * 30)) * t) * np.exp(-t * 9) + lp(rng.standard_normal(n), 3000) * np.exp(-t * 25) * .7
    return reverb(y / np.abs(y).max() * .9, 1.2, .8)
def zil(f=880):
    n = int(1.8 * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for m, a, dcy in ((1, 1, 3), (2.76, .45, 5), (5.4, .25, 8), (8.93, .12, 11)): y += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dcy)
    y *= np.minimum(1, t / .004); return reverb(y / np.abs(y).max() * .55, 1.6, .7)
def yukselen(d):
    n = int(d * SR); t = np.linspace(0, 1, n); x = rng.standard_normal(n)
    y = onepole(x, 200 + 7000 * t ** 2.5) * (t ** 1.8)
    f = 160 + 900 * t ** 2; s = np.sin(2 * np.pi * np.cumsum(f) / SR) * t ** 2 * .35
    sh_ = np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * t ** 3 * .2
    y = y / (np.abs(y).max() + 1e-9) + s + sh_; return reverb(y * .7, 1.2, .8)
def nota(m): return 440 * 2 ** ((m - 69) / 12)
def muzik(T, kes, bolumler):
    """kes: [(t0,t1)] müziğin inceldiği aralıklar; bolumler: yoğunluk eğrisi [(t, yogunluk)]"""
    n = int(T * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    bpm = 100; vur = 60 / bpm; bar = vur * 4
    akor = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    kok = [45, 41, 48, 43]
    yog = np.interp(t, [b[0] for b in bolumler], [b[1] for b in bolumler])
    inc = np.ones(n)
    for a, b in kes: inc[(t >= a) & (t < b)] = 0
    inc = lp(inc, 3)
    # pad
    pad = np.zeros(n)
    for bi in range(int(T / bar) + 1):
        s0, s1 = int(bi * bar * SR), min(n, int((bi + 1) * bar * SR + .3 * SR))
        if s0 >= n: break
        tt = np.arange(s1 - s0) / SR; e = np.minimum(1, tt / .6) * np.minimum(1, (s1 - s0 - np.arange(s1 - s0)) / (.35 * SR))
        for m in akor[bi % 4]:
            for det in (-.08, .08):
                f = nota(m) * 2 ** (det / 12); ph = 2 * np.pi * f * tt
                pad[s0:s1] += e * (np.sin(ph) + .35 * np.sin(2 * ph) + .15 * np.sin(3 * ph)) * .07
    pad = lp(pad, 1800)
    # alt bas + kick + hihat + arp
    bas = np.zeros(n); kick = np.zeros(n); hat = np.zeros(n); arp = np.zeros(n)
    kn = int(.35 * SR); kt = np.arange(kn) / SR; ks = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-kt * 28)) / SR) * np.exp(-kt * 9)
    hn = int(.06 * SR); hs = hp(rng.standard_normal(hn), 7000) * np.exp(-np.arange(hn) / SR * 70)
    an = int(.4 * SR); at_ = np.arange(an) / SR
    pump = np.ones(n)
    for k in range(int(T / vur) + 1):
        s0 = int(k * vur * SR)
        if s0 >= n: break
        bi = int(k * vur / bar) % 4
        e = min(kn, n - s0); kick[s0:s0 + e] += ks[:e]
        pn = min(int(.25 * SR), n - s0); pump[s0:s0 + pn] = np.minimum(pump[s0:s0 + pn], .45 + .55 * (np.arange(pn) / pn))
        for off in (0, .5):
            h0 = int((k + off) * vur * SR); e = min(hn, n - h0)
            if e > 0: hat[h0:h0 + e] += hs[:e] * (.6 if off else .35)
        bn = min(int(vur * SR), n - s0); bt = np.arange(bn) / SR
        bas[s0:s0 + bn] += np.sin(2 * np.pi * nota(kok[bi] - 12) * bt) * np.minimum(1, bt / .01) * np.exp(-bt * 1.2) * .5
        for j, off in enumerate((0, .25, .5, .75)):
            a0 = int((k + off) * vur * SR); e = min(an, n - a0)
            if e > 0:
                m = akor[bi][(k * 4 + j) % 3] + 12
                arp[a0:a0 + e] += np.sign(np.sin(2 * np.pi * nota(m) * at_[:e])) * np.exp(-at_[:e] * 9) * .05
    arp = lp(arp, 2600)
    ritim = (kick * .55 + hat * .12 + bas * pump) * np.clip(yog * 1.2 - .2, 0, 1) * inc
    ust = arp * np.clip(yog * 1.5 - .5, 0, 1) * inc
    mono_pad = pad * (.55 + .45 * yog)
    out += pan(mono_pad, 0) + pan(ritim, 0) + pan(ust, np.sin(t * .7) * .5)
    return reverb(out, 1.8, .85)
def atmosfer(T, tip):
    n = int(T * SR); t = np.arange(n) / SR; x = rng.standard_normal((n, 2))
    if tip == "dag":  # rüzgâr
        fc = 500 + 400 * np.sin(2 * np.pi * t / 7.3) + 250 * np.sin(2 * np.pi * t / 3.1)
        y = np.stack([onepole(x[:, c], fc) for c in range(2)], 1); y = np.stack([hp(y[:, c], 120) for c in range(2)], 1)
        y *= (.6 + .4 * np.sin(2 * np.pi * t / 5.1))[:, None]
    else:  # akan su / göl dalgası
        y = np.stack([bp(x[:, c], 300, 2500) for c in range(2)], 1)
        mod = .55 + .3 * np.sin(2 * np.pi * t * (1.7 if tip == "nehir" else .35)) + .15 * np.sin(2 * np.pi * t * 4.3)
        y *= mod[:, None]
    return y / (np.abs(y).max() + 1e-9)
def koy(hedef, x, t, kazanc=1.0):
    if x.ndim == 1: x = pan(x, 0)
    s = int(max(0, t) * SR); e = min(len(hedef), s + len(x))
    if e > s: hedef[s:e] += x[:e - s] * kazanc

# ---------------- ana akış ----------------
def main():
    kod = sys.argv[1]; mod = sys.argv[2] if len(sys.argv) > 2 else "onizleme"
    kare_sinir = int(sys.argv[sys.argv.index("--kare") + 1]) if "--kare" in sys.argv else None
    konu = json.load(open(f"{KOK}/konular/{kod}.json"))
    is_ = f"{KOK}/is/{kod}"; os.makedirs(is_, exist_ok=True); os.makedirs(f"{KOK}/cikti", exist_ok=True)
    meta_f = f"{KOK}/ses/{kod}/meta.json"
    global TEMPO
    if os.path.exists(meta_f) and "NY_TEMPO" not in os.environ: TEMPO = json.load(open(meta_f)).get("tempo", TEMPO)
    metin = {p["id"]: p["metin"] for p in json.load(open(f"{KOK}/kuyruk/tamam/{kod}.json"))["parcalar"]}
    # 1) ses parçaları
    t, parcalar, anl = .35, [], []
    for i, p in enumerate(konu["parcalar"]):
        src = f"{KOK}/ses/{kod}/{p['id']}.mp3"; src = src if os.path.exists(src) else src[:-4] + ".wav"; dst = f"{is_}/{p['id']}.wav"
        sh("ffmpeg", "-v", "error", "-y", "-i", src, "-af",
           f"silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,atempo={TEMPO},highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=-18dB:ratio=3:attack=5:release=80",
           "-ar", str(SR), "-ac", "1", dst)
        d = sure(dst); onceki = konu["parcalar"][i - 1]["sahne"] if i else None
        if p["sahne"] == "bir_giris": t += .25
        if onceki == "bir_giris": t += .45
        if onceki == "kanca": t += .1
        q = {**p, "t0": round(t, 3), "t1": round(t + d, 3), "metin": metin[p["id"]]}
        kel = kelime_zamanla(metin[p["id"]], t + .03, t + d - .05)
        kel = sayilari_birlestir(kel)
        q["gruplar"] = grupla(kel, p["id"]); q["kelimeler"] = kel
        def bul(w):
            for k in kel:
                if norm(k["w"]).startswith(norm(w)): return k["t0"]
            return None
        if p.get("alt_kelime"): q["alt_t"] = bul(p["alt_kelime"])
        if p.get("cip_kelime"): q["cip_t"] = [bul(w) for w in p["cip_kelime"]]
        if p["sahne"] == "bir_giris": q["son_kelime_t"] = kel[-1]["t0"]
        parcalar.append(q); anl.append((t, dst)); t += d + .22
    T = round(parcalar[-1]["t1"] + 2.2, 2)
    K = {"toplam": T, "konu": {k: konu[k] for k in ("baslik_bant", "tip", "birim", "abartma", "ogeler")}, "parcalar": parcalar}
    json.dump(K, open(f"{is_}/kurgu.json", "w"), ensure_ascii=False, indent=1)
    print(f"süre {T} sn · {len(parcalar)} parça")
    # 2) anlatım izi
    n = int(T * SR); nar = np.zeros(n)
    for t0, f in anl:
        x = wav_oku(f); s = int(t0 * SR); nar[s:s + len(x)] += x[:n - s]
    # 3) ses tasarımı
    sfx = np.zeros((n, 2))
    bir_aralik = []
    for i, p in enumerate(parcalar):
        if i and p["sahne"] not in ("bir_giris",) and parcalar[i - 1]["sahne"] != "bir_giris": koy(sfx, whoosh(.8, 1 if i % 2 else -1), p["t0"] - .45, .5)
        if p["sahne"] == "kanca":
            koy(sfx, boom(), 0, .8)
            if p.get("alt_t"): koy(sfx, damga(), p["alt_t"] - .02, .75)
        if p["sahne"] == "soru": koy(sfx, zil(660), p["t0"] + .05, .35)
        if p["sahne"] == "sira":
            for k in range(18): koy(sfx, tik(2200 + k * 40), p["t0"] + .35 + k * 1.25 / 18, .22)
            koy(sfx, damga(), p["t0"] + 1.6, .55)
        if p["sahne"] == "bir_giris":
            st = p["son_kelime_t"]; koy(sfx, yukselen(st - p["t0"] + .1), p["t0"], .6); koy(sfx, boom(3, 110, 30), st - .03, 1.0)
            bir_aralik.append((p["t0"] - .2, st))
        for ct in (p.get("cip_t") or []):
            if ct: koy(sfx, zil(1046), ct, .3)
        if p["sahne"] == "kapanis":
            for k in range(5): koy(sfx, tik(1500 + k * 250), p["t0"] + .15 + k * .12, .4)
            koy(sfx, zil(784), p["t0"] + 1.1, .35)
    son = parcalar[-1]["t0"]
    yog = [(0, .35), (parcalar[1]["t0"], .7), (T * .55, .85), (son, 1.0), (T, .8)]
    muz = muzik(T, bir_aralik, yog)
    atm = atmosfer(T, konu["tip"])
    # anlatıma göre kısma (sidechain benzeri)
    env = lp(np.abs(nar), 8); env = env / (env.max() + 1e-9)
    konus = lp(np.clip(env * 8, 0, 1), 3)                       # anlatım varken 1
    duck = 1 - .78 * konus                                        # müzik konuşmada ~-13 dB
    sduck = 1 - .6 * konus                                        # efektler konuşmada ~-8 dB
    fade = np.minimum(1, np.arange(n) / (.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.8 * SR))
    nar = nar / (np.abs(nar).max() + 1e-9) * .9                   # anlatım referans seviye
    muz = muz / (np.abs(muz).max() + 1e-9); atm = atm / (np.abs(atm).max() + 1e-9); sfx = sfx / (np.abs(sfx).max() + 1e-9)
    mix = pan(nar, 0) + muz * (duck * .16 * fade)[:, None] + atm * (duck * .03 * fade)[:, None] + sfx * (sduck * .2)[:, None]
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)                     # yumuşak sınırlayıcı
    wav_yaz(f"{is_}/miks.wav", mix)
    if "--sadece-hazirla" in sys.argv: print("hazır", is_); return
    # 4) görüntü
    w = 540 if mod == "onizleme" else 1080; ar = "900" if mod == "onizleme" else "1300"
    sess = f"{is_}/sessiz_{mod}.mp4"
    if "--ses" not in sys.argv:
        env_ = {**os.environ, "NODE_PATH": subprocess.check_output(["npm", "root", "-g"]).decode().strip()}
        cmd = ["node", f"{KOK}/arac/kayit.js", f"{KOK}/motor", f"{is_}/kurgu.json", sess, str(w), "30", "0", str(kare_sinir or 10 ** 9), ar]
        subprocess.run(cmd, check=True, env=env_)
    # 5) birleştir
    out = f"{KOK}/cikti/{kod}_{mod}.mp4"
    sh("ffmpeg", "-v", "error", "-y", "-i", sess, "-i", f"{is_}/miks.wav", "-filter_complex", "[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
       "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "23" if mod == "onizleme" else "17", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out)
    print("çıktı", out, sure(out), "sn")
if __name__ == "__main__": main()
