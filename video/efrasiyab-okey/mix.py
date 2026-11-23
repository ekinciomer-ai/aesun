# Efrâsiyâb Okey — özgün kahvehane noir müzik (Re Hicaz / minör) + okey taşı / yağmur / darbe efektleri (telifsiz, kodla).
# Kullanım: python3 -I mix.py <hikaye_klasörü>
import json, subprocess, sys
from pathlib import Path
import numpy as np

SR = 48000
story = Path(sys.argv[1])
cues = json.loads((story / 'out' / 'cues.json').read_text(encoding='utf-8'))
DUR = float(cues['dur'])
N = int(round(DUR * SR))
rng = np.random.default_rng(1974)

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def save(p, x):
    p.parent.mkdir(parents=True, exist_ok=True)
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4), len(x))

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))

def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i] * g

def noise(d): return rng.standard_normal(max(1, int(round(d * SR))))
T = lambda d: np.arange(max(1, int(round(d * SR)))) / SR

def oud(f, d=1.1):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t)
         + .45 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 5)
         + .22 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 9)
         + .12 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 14))
    return x * env(len(t), .003, d * .30)

def bell(f, d=2.2):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 1.9), (2, .35, 3.2), (3.01, .16, 4.8)]) * env(len(t), .005, 9)

def pizz(f, d=.55):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .32 * np.sin(4 * np.pi * f * t)
    return x * env(len(t), .003, .14)

def rimtap():
    return band(noise(.06), 1400, 5200) * env(int(.06 * SR), .002, .016)

def pad(f, d, amp=.055):
    t = T(d)
    x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002))
    x = band(x, 60, 900) * amp
    return x * np.minimum(1, np.minimum(t / .8, (d - t) / .8))

NOTE = {
    'D2': 73.42, 'A2': 110.0, 'Bb2': 116.54, 'G2': 98.0, 'C3': 130.81,
    'D3': 146.83, 'Eb3': 155.56, 'F#3': 185.0, 'G3': 196.0, 'A3': 220.0, 'Bb3': 233.08,
    'D4': 293.66, 'Eb4': 311.13, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.0, 'A4': 440.0, 'Bb4': 466.16, 'C5': 523.25, 'D5': 587.33
}

W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .35, DUR * .62, DUR * .84])[:3]
beat = 60 / 92
music = np.zeros(N)

A_mel = ['A4', None, 'Bb4', None, 'A4', None, 'F#4', None, 'G4', None, 'F#4', 'Eb4', 'D4', None, None, None]
B_mel = ['D4', 'F#4', 'A4', None, 'Bb4', 'A4', 'G4', 'F#4', 'A4', None, 'G4', 'F#4', 'Eb4', None, 'D4', None]
C_mel = ['D5', None, 'Bb4', 'A4', None, 'F#4', 'G4', None, 'A4', None, 'Eb4', None, 'D4', None, None, None]
D_arp = ['D4', 'A4', 'F4', 'D4', 'A3', 'D4']
bass = {'A': ['D2', None, 'A2', None], 'B': ['D2', 'A2', 'Bb2', 'A2'], 'C': ['D2', None, 'G2', 'A2'], 'D': ['D2', None, None, None]}

i = 0; t = 0.0
while t < DUR - .3:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]
        if n: put(music, t, oud(NOTE[n], 1.1), .24)
    elif sec == 'B':
        n = B_mel[step]
        if n: put(music, t, oud(NOTE[n], .95), .25)
        if i % 2 == 1: put(music, t, rimtap(), .14)
    elif sec == 'C':
        n = C_mel[step]
        if n: put(music, t, oud(NOTE[n], 1.3), .26)
        if i % 4 == 2: put(music, t, rimtap(), .11)
    else:
        if i % 2 == 0: put(music, t, oud(NOTE[D_arp[(i // 2) % 6]], 1.8), .20)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .7), .52)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['D3'], tB + .3, .048))
put(music, tB, pad(NOTE['A2'], max(.5, tC - tB + .3), .045))
put(music, tC, pad(NOTE['D3'], max(.5, tD - tC + .3), .052))
put(music, tD, pad(NOTE['D2'], max(.5, DUR - tD), .055))
for f in ('D4', 'A4', 'D5'): put(music, max(0, DUR - 1.9), bell(NOTE[f], 1.9), .16)

sfx = np.zeros(N)
def okey_clack():
    tt = T(.09)
    return (np.sin(2 * np.pi * 1950 * tt) * .55 + np.sin(2 * np.pi * 3250 * tt) * .3 + band(noise(.09), 1500, 6500) * .35) * env(len(tt), .001, .018)

for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.40); tt = np.arange(len(x)) / SR
        put(sfx, t0, band(x, 280, 3200) * np.sin(np.pi * tt / .40) ** 2, .34)
    elif ty == 'snap':
        put(sfx, t0, okey_clack(), .55)
        put(sfx, t0 + .055, okey_clack(), .30)
    elif ty == 'boom':
        nb = int(.9 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (55 + 34 * np.exp(-tt * 9)) * tt) * env(nb, .003, .26) + band(noise(.9), 70, 420) * env(nb, .002, .11) * .45, .62)
    elif ty == 'tremble':
        tt = T(d)
        sh_w = band(noise(d), 400, 2600) * .12 + (np.sin(2 * np.pi * 220 * tt) + np.sin(2 * np.pi * 233.08 * tt)) * .08
        put(sfx, t0, sh_w * np.minimum(1, np.minimum(tt / .25, (d - tt) / .25)), .42)
    elif ty == 'rain':
        x = band(noise(d), 700, 6200); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .3, (d - tt) / .3)), .055)
    elif ty == 'steps':
        for k in range(max(1, int(d * 2.2))):
            put(sfx, t0 + k / 2.2, band(noise(.08), 80, 520) * env(int(.08 * SR), .002, .025), .38)
    elif ty == 'shimmer':
        tt = T(2.0)
        put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + idx * .05, .85) for idx, f in enumerate([587.33, 880.0, 1174.66])) / 3, .16)

voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.25 * SR)) / int(.25 * SR), mode='same')
duck = 1 - .45 * np.clip(active, 0, 1)

def rms(x):
    nz = x[np.abs(x) > 1e-5]
    return float(np.sqrt(np.mean(nz ** 2))) if len(nz) else 1.0

vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-17 / 20)
sfx *= (vr / max(rms(sfx), 1e-6)) * 10 ** (-16 / 20)
mix = voice + music * duck + sfx
fl = int(.4 * SR); mix[-fl:] *= np.linspace(1, 0, fl)

out = story / 'audio'
save(out / 'music.wav', music * duck)
save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .7)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK mix.wav', round(DUR, 2), 's')
