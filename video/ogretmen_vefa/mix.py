# mix.py (Öğretmenler Günü: Vefa) — özgün müzik + efektler, numpy ile sentezlenir, sesin altına miks edilir. Örnek ses dosyası yok, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
# Okur: voice/voice.wav, audio/cues.json (render.mjs --cues yazar). Yazar: audio/mix.wav (+ music.wav, sfx.wav)
# Müzik: Re majör pentatonik, 96 bpm. Bölümler ilk üç whoosh ipucundan:
#   A orman (merak: seyrek kalimba + alçak pad)  B iskele (hareketli: bas + çıngırak)  C kütük (sıcak melodi)  D tepe (yavaş arpej, çözülme)
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(11)

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def save(p, x):
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4), len(x))
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i] * g
def noise(d): return rng.standard_normal(max(1, int(round(d * SR))))
T = lambda d: np.arange(int(d * SR)) / SR

# ------------------------------------------------------------------ çalgılar
def kalimba(f, d=1.4):            # tını: temel + 2,76 kat (metal dil), çabuk sönen
    t = T(d); return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9)) * env(len(t), .002, d * .32)
def bell(f, d=2.0):
    t = T(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.2), (2, .4, 3.5), (3.01, .2, 5)]) * env(len(t), .004, 9)
def pizz(f, d=.5):                # pizzikato bas
    t = T(d); x = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t); return x * env(len(t), .003, .12)
def shaker():
    return band(noise(.09), 4000, 11000) * env(int(.09 * SR), .01, .025)
def pad(f, d, amp=.06):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.004, .996, 2.003)); x = band(x, 60, 1200) * amp
    return x * np.minimum(1, np.minimum(t / 1.0, (d - t) / 1.0))

NOTE = {'D3': 146.8, 'E3': 164.8, 'F#3': 185.0, 'A3': 220.0, 'B3': 246.9, 'D4': 293.7, 'E4': 329.6, 'F#4': 370.0, 'A4': 440.0, 'B4': 493.9, 'D5': 587.3, 'E5': 659.3, 'F#5': 740.0, 'A2': 110.0, 'D2': 73.4, 'B2': 123.5, 'G2': 98.0, 'G3': 196.0}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .4, DUR * .55, DUR * .8])[:3]
beat = 60 / 76
music = np.zeros(N)
A_mel = ['A4', None, 'F#4', None, 'D5', None, 'B4', None, 'A4', None, 'E4', None, None, None, None, None]
B_mel = ['D5', 'B4', 'A4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'B4', 'A4', 'F#4', 'E4', 'F#4']
C_mel = ['F#4', None, 'A4', 'B4', 'A4', None, 'F#4', 'E4', 'D4', None, 'E4', 'F#4', 'A4', None, None, None]
D_arp = ['D4', 'F#4', 'A4', 'D5', 'A4', 'F#4']
bass = {'A': ['D2', None, None, None], 'B': ['D2', None, 'G2', None], 'C': [None, None, None, None], 'D': ['D2', None, None, None]}
i = 0; t = 0.0
while t < DUR - .3:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step];  n and put(music, t, kalimba(NOTE[n]), .26)
    elif sec == 'B':                                       # yıllar sonra: sıcak, dolu melodi (çan + kalimba)
        n = C_mel[step];  n and (put(music, t, kalimba(NOTE[n], 1.8), .28), put(music, t, bell(NOTE[n] * 2, 1.2), .05))
    elif sec == 'C':                                       # karne anısı: tek tük çan, uzak
        if step in (0, 6, 12): put(music, t, bell(NOTE[A_mel[0]], 2.4), .14)
    else:
        if i % 2 == 0: put(music, t, kalimba(NOTE[D_arp[(i // 2) % 6]], 2.0), .2)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .7 if sec != 'B' else .35), .5)
    t += beat / 2; i += 1                                   # sekizlik nota adımı
put(music, 0, pad(NOTE['D3'], tB + .4, .05)); put(music, tB, pad(NOTE['A3'], tC - tB + .4, .04))
put(music, tC, pad(NOTE['D3'], tD - tC + .4, .05)); put(music, tD, pad(NOTE['D3'], DUR - tD, .06))
for f in ('D4', 'F#4', 'A4', 'D5'): put(music, DUR - 1.8, bell(NOTE[f], 1.8), .18)   # son: Re majör akor

# ------------------------------------------------------------------ efektler
sfx = np.zeros(N)
def chirp(f0, f1, d):
    t = T(d); ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, len(t))) / SR; return np.sin(ph) * np.sin(np.pi * t / d) ** 2
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0); n = int(d * SR)
    if ty == 'whoosh':
        x = noise(.45); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3500) * np.sin(np.pi * tt / .45) ** 2, .15 if c.get('quiet') else .35)
    elif ty == 'knock':                                    # kapı: üç tahta vuruşu
        for k in range(3): put(sfx, t0 + k * .17, band(noise(.08), 120, 1400) * env(int(.08 * SR), .001, .025) + .6 * np.sin(2 * np.pi * 180 * T(.08)) * env(int(.08 * SR), .001, .03), .55)
    elif ty == 'chair':                                    # sandalye gıcırtısı / ayağa kalkma
        tt = T(.25); put(sfx, t0, np.sin(2 * np.pi * np.cumsum(np.linspace(700, 520, len(tt))) / SR) * band(noise(.25), 400, 3000) * .6 * np.sin(np.pi * tt / .25), .06)
    elif ty == 'pages':                                    # uçuşan takvim yaprakları: kâğıt hışırtıları
        for k in range(int(d * 10)): put(sfx, t0 + k / 10 + rng.uniform(0, .05), band(noise(.12), 2000, 9000) * env(int(.12 * SR), .01, .04), .18)
    elif ty == 'flash':                                    # anıya geçiş: yumuşak çan
        put(sfx, t0, bell(1174.7, 1.6), .2)
    elif ty == 'camera':                                   # eski fotoğraf: deklanşör
        put(sfx, t0, band(noise(.05), 1500, 8000) * env(int(.05 * SR), .001, .012), .6); put(sfx, t0 + .09, band(noise(.06), 1000, 6000) * env(int(.06 * SR), .001, .015), .45)
    elif ty == 'rise':
        x = noise(d); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 400, 3000) * (tt / d) ** 1.5 * np.minimum(1, (d - tt) / .05), .22)
    elif ty == 'birds':                                    # orman kuşları: rastgele cıvıltılar, çok kısık
        for _ in range(int(d * 1.6)):
            tb = t0 + rng.uniform(0, max(.1, d - .5)); f = rng.uniform(2600, 4200)
            for k in range(rng.integers(2, 5)): put(sfx, tb + k * .09, chirp(f, f * rng.uniform(1.1, 1.4), .07), .05)
    elif ty == 'rustle':                                   # çalı hışırtısı: kısa yaprak gürültüsü patlamaları
        for k in range(int(d * 9)):
            x = band(noise(.08), 1500, 7000) * env(int(.08 * SR), .005, .03); put(sfx, t0 + k / 9 + rng.uniform(0, .04), x, .3)
    elif ty == 'boom':
        nb = int(1.0 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (52 + 30 * np.exp(-tt * 8)) * tt) * env(nb, .003, .3) + band(noise(1.0), 60, 400) * env(nb, .002, .1) * .4, .55)
    elif ty == 'tremble':                                  # titreme: hızlı, kısık takırtı
        for k in range(int(d * 14)): put(sfx, t0 + k / 14, band(noise(.03), 800, 3000) * env(int(.03 * SR), .002, .01), .08)
    elif ty == 'horn':                                     # vapur düdüğü: iki alçak, hafif bozuk ses
        tt = T(1.3); x = sum(np.sign(np.sin(2 * np.pi * f * tt)) for f in (110, 138.6)); x = band(x, 80, 900)
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .08, (1.3 - tt) / .25)), .16)
    elif ty == 'gulls':
        for _ in range(int(d * 1.2)):
            tb = t0 + rng.uniform(0, max(.1, d - .4))
            for k in range(2): put(sfx, tb + k * .22, chirp(1900, 1100, .18) + .3 * chirp(3800, 2200, .18), .06)
    elif ty == 'crowd':                                    # kalabalık uğultusu
        x = band(noise(d), 250, 1600); tt = np.arange(len(x)) / SR
        x *= (.6 + .4 * np.sin(2 * np.pi * 1.3 * tt) * np.sin(2 * np.pi * .37 * tt)) * np.minimum(1, np.minimum(tt / .3, (d - tt) / .3)); put(sfx, t0, x, .09)
    elif ty == 'steps':
        for k in range(int(d * 7)): put(sfx, t0 + k / 7, band(noise(.06), 80, 600) * env(int(.06 * SR), .002, .02), .4)
    elif ty == 'snap':                                     # simit ikiye bölünür: kuru çıtırtı
        put(sfx, t0, band(noise(.12), 1200, 6000) * env(int(.12 * SR), .001, .02), .5)
        put(sfx, t0 + .04, band(noise(.08), 600, 3000) * env(int(.08 * SR), .001, .02), .3)
    elif ty == 'shimmer':
        tt = T(2.2); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .9) for i, f in enumerate([1174.7, 1480, 1760, 2349.3])) / 4, .18)
    elif ty == 'evening':                                  # akşam: hafif rüzgâr ve uzak cırcır böceği
        x = band(noise(d), 200, 900); tt = np.arange(len(x)) / SR; put(sfx, t0, x * np.minimum(1, np.minimum(tt / .8, (d - tt) / .8)), .04)
        cr = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > .6) * (np.sin(2 * np.pi * .9 * tt) > 0); put(sfx, t0, cr * np.minimum(1, tt / 1.5), .012)

# ------------------------------------------------------------------ miks: ses üstte, müzik sesin altında ve konuşurken kısılır
voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.25 * SR)) / int(.25 * SR), mode='same')
duck = 1 - .45 * np.clip(active, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2)) if np.any(np.abs(x) > 1e-5) else 1
vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-17 / 20)
sfx *= (vr / max(rms(sfx), 1e-6)) * 10 ** (-16 / 20)
mix = voice + music * duck + sfx
fl = int(.4 * SR); mix[-fl:] *= np.linspace(1, 0, fl)
out = story / 'audio'
save(out / 'music.wav', music * duck); save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .7)
# AAC kodlama tepeyi yükseltir: TP -2,8 (analizde örnek videonun -1,9 dBTP'ye çıktığı görüldü)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK mix.wav', round(DUR, 2), 's')
