# mix.py (Bölüm 3: Cotard Sendromu) — özgün müzik + efektler, numpy ile sentezlenir, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
# Müzik: La minör gizemli celesta + pizzikato nabız + yumuşak gerilim pad (108 bpm).
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(31)

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

# ------------------------------------------------------------------ çalgılar (gizemli celesta + pizzikato)
def celesta(f, d=1.5):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 6) + .12 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 11)) * env(len(t), .003, d * .35)
def bell(f, d=2.2):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.0), (2, .35, 3.2), (3.01, .18, 5.0)]) * env(len(t), .005, 8)
def pizz(f, d=.45):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t); return x * env(len(t), .003, .11)
def pad(f, d, amp=.055):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 950) * amp
    return x * np.minimum(1, np.minimum(t / .8, (d - t) / .8))

NOTE = {
    'A2': 110.0, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196.0,
    'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2,
    'G4': 392.0, 'A4': 440.0, 'B4': 493.9, 'C5': 523.3, 'E5': 659.3,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .52, DUR * .74, DUR * .84])[:3]
beat = 60 / 108
music = np.zeros(N)
A_mel = ['E4', None, 'A4', None, 'C5', None, 'B4', None, 'A4', None, 'E4', None, 'F4', None, 'E4', None]
B_mel = ['A4', 'C5', 'E5', 'C5', 'B4', 'A4', 'G4', 'E4', 'F4', 'A4', 'C5', 'A4', 'E4', None, 'G4', None]
C_mel = ['E4', None, 'F4', None, 'E4', None, 'C4', None, 'A3', None, None, None, 'E4', None, None, None]
D_arp = ['A3', 'C4', 'E4', 'A4', 'E4', 'C4']
bass = {'A': ['A2', None, 'E3', None], 'B': ['A2', 'F3', 'D3', 'E3'], 'C': ['A2', None, 'F3', None], 'D': ['A2', None, None, None]}

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]; n and put(music, t, celesta(NOTE[n], 1.4), .24)
    elif sec == 'B':
        n = B_mel[step]; n and put(music, t, celesta(NOTE[n], .9), .22)
    elif sec == 'C':
        n = C_mel[step]; n and put(music, t, celesta(NOTE[n], 1.6), .26)
    else:
        if i % 2 == 0: put(music, t, celesta(NOTE[D_arp[(i // 2) % 6]], 1.9), .20)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .55), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['A2'], max(.5, tB + .3), .05))
put(music, tB, pad(NOTE['E3'], max(.5, tC - tB + .3), .045))
put(music, tC, pad(NOTE['A2'], max(.5, DUR - tC), .055))
for f in ('A3', 'C4', 'E4', 'A4'): put(music, max(0, DUR - 1.6), bell(NOTE[f], 1.6), .16)

# ------------------------------------------------------------------ efektler
sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'rise':
        x = noise(d); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 350, 2800) * (tt / max(d, .05)) ** 1.5 * np.minimum(1, (d - tt) / .05), .22)
    elif ty == 'heartbeat':
        bt = t0
        while bt < t0 + d - .2:
            for dt, g0 in [(0.0, .48), (.19, .32)]:
                nb = int(.22 * SR); tt = np.arange(nb) / SR
                put(sfx, bt + dt, np.sin(2 * np.pi * (56 - 16 * tt) * tt) * env(nb, .005, .06), g0)
            bt += .84
    elif ty == 'slide':
        x = band(noise(d), 400, 2400); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.sin(np.pi * tt / max(d, .05)), .26)
    elif ty == 'boom':
        nb = int(.95 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (52 + 30 * np.exp(-tt * 8)) * tt) * env(nb, .003, .28) + band(noise(.95), 60, 420) * env(nb, .002, .1) * .4, .55)
    elif ty == 'snap':
        put(sfx, t0, band(noise(.12), 1400, 6800) * env(int(.12 * SR), .001, .02), .55)
        put(sfx, t0 + .035, band(noise(.09), 700, 3500) * env(int(.09 * SR), .001, .02), .35)
    elif ty == 'shimmer':
        tt = T(2.0); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .85) for i, f in enumerate([880, 1046.5, 1318.5, 1760])) / 4, .18)
    elif ty == 'evening':
        x = band(noise(d), 180, 820); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .6, (d - tt) / .6)), .045)

# ------------------------------------------------------------------ miks: ses üstte, müzik -17 dB + konuşurken %45 kısık
voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.22 * SR)) / int(.22 * SR), mode='same')
duck = 1 - .45 * np.clip(active, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2)) if np.any(np.abs(x) > 1e-5) else 1
vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-17 / 20)
sfx *= (vr / max(rms(sfx), 1e-6)) * 10 ** (-16 / 20)
mix = voice + music * duck + sfx
fl = int(.35 * SR); mix[-fl:] *= np.linspace(1, 0, fl)
out = story / 'audio'
save(out / 'music.wav', music * duck); save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .7)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK mix.wav', round(DUR, 2), 's')
