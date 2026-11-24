# Efrâsiyâb Tebessüm — sıfır hışırtılı, saf tınılı duygusal müzik (neşeli başlangıç -> dokunaklı durak -> sıcak majör çözülme) + saf efektler (telifsiz, kodla).
# Kullanım: python3 -I mix.py <hikaye_klasörü>
import json, subprocess, sys
from pathlib import Path
import numpy as np

SR = 48000
story = Path(sys.argv[1])
cues = json.loads((story / 'audio' / 'cues.json').read_text(encoding='utf-8'))
DUR = float(cues['DUR'])
N = int(round(DUR * SR))

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def save(p, x):
    p.parent.mkdir(parents=True, exist_ok=True)
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))

def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i] * g

T = lambda d: np.arange(max(1, int(round(d * SR)))) / SR

# ------------------------------------------------------------------ saf sinüs/armonik çalgılar (ZERO white noise!)
def harp(f, d=1.3):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t)
         + .30 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 5)
         + .10 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 9))
    return x * env(len(t), .004, d * .36)

def warm_piano(f, d=1.6):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t) * .72
         + np.sin(2 * np.pi * f * 2 * t) * .22 * np.exp(-t * 3.5)
         + np.sin(2 * np.pi * f * 3 * t) * .06 * np.exp(-t * 6))
    return x * env(len(t), .005, d * .42)

def bell(f, d=2.4):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 1.6), (2, .25, 3.2), (3, .08, 5.0)]) * env(len(t), .006, 9)

def pizz(f, d=.55):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .24 * np.sin(4 * np.pi * f * t)
    return x * env(len(t), .004, .16)

def pad(f, d, amp=.038):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t) * .65 + np.sin(2 * np.pi * f * 1.5 * t) * .25 + np.sin(2 * np.pi * f * 2.0 * t) * .10) * amp
    return x * np.minimum(1, np.minimum(t / .9, (d - t) / .9))

NOTE = {
    'C2': 65.41, 'D2': 73.42, 'G2': 98.0, 'A2': 110.0, 'F2': 87.31,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0, 'A3': 220.0,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99
}

W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .28, DUR * .52, DUR * .74])[:3]
beat = 60 / 94
music = np.zeros(N)

# A: meraklı giriş | B: çocukların neşeli şakaları | C: duygusal ikindi & sıcak majör çözülme (tebessüm!)
A_mel = ['E4', None, 'G4', None, 'A4', None, 'G4', None, 'E4', None, 'D4', None, 'C4', None, None, None]
B_mel = ['C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'C5', None, 'D5', 'C5', 'A4', 'G4', 'E4', None, 'G4', None]
C_mel = ['G4', None, 'A4', None, 'C5', None, 'E5', None, 'D5', None, 'C5', None, 'G4', None, 'E4', None]
bass = {'A': ['A2', None, 'E3', None], 'B': ['C3', 'G2', 'A2', 'G2'], 'C': ['F2', None, 'C3', 'G2']}

i = 0; t = 0.0
while t < DUR - .3:
    sec = 'A' if t < tB else 'B' if t < tC else 'C'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]
        if n: put(music, t, harp(NOTE[n], 1.2), .22)
    elif sec == 'B':
        n = B_mel[step]
        if n: put(music, t, harp(NOTE[n], .85), .24)
    else:
        n = C_mel[step]
        if n: put(music, t, warm_piano(NOTE[n], 1.8), .28)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .7), .45)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['A2'], tB + .3, .036))
put(music, tB, pad(NOTE['C3'], max(.5, tC - tB + .3), .036))
put(music, tC, pad(NOTE['C3'], max(.5, DUR - tC), .045))
# Sıcak Do Majör 9 kapanış akoru (tebessüm!)
for f in ('C4', 'E4', 'G4', 'D5'): put(music, max(0, DUR - 2.2), bell(NOTE[f], 2.2), .15)

# ------------------------------------------------------------------ saf efektler (ZERO white noise / sıfır hışırtı!)
sfx = np.zeros(N)
def soft_whoosh():
    tt = T(.24)
    f = 165 + 145 * np.sin(np.pi * tt / .24)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * (np.sin(np.pi * tt / .24) ** 2) * .11

for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        put(sfx, t0, soft_whoosh(), .55)
    elif ty == 'steps':
        for k in range(max(1, int(d * 4.5))):
            tt = T(.055)
            st = (np.sin(2 * np.pi * 140 * tt) * .65 + np.sin(2 * np.pi * 260 * tt) * .35) * env(len(tt), .002, .016)
            put(sfx, t0 + k / 4.5, st, .32)
    elif ty == 'water':
        tt = T(.20)
        f = 540 + 720 * (tt / .20) ** 1.35
        ph = 2 * np.pi * np.cumsum(f) / SR
        put(sfx, t0, np.sin(ph) * env(len(tt), .003, .05), .60)
    elif ty == 'chime':
        tt = T(1.6)
        put(sfx, t0, (np.sin(2 * np.pi * 523.25 * tt) * .55 + np.sin(2 * np.pi * 783.99 * tt) * .45) * env(len(tt), .006, .52), .38)
    elif ty == 'shimmer':
        tt = T(2.2)
        put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + idx * .05, .95) for idx, f in enumerate([523.25, 659.25, 783.99, 1046.50])) / 4, .28)

voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.25 * SR)) / int(.25 * SR), mode='same')
duck = 1 - .50 * np.clip(active, 0, 1)

def rms(x):
    nz = x[np.abs(x) > 1e-5]
    return float(np.sqrt(np.mean(nz ** 2))) if len(nz) else 1.0

vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-19 / 20)
sfx_peak = float(np.max(np.abs(sfx))) if np.any(sfx) else 1.0
sfx *= (vr * 0.50) / max(sfx_peak, 1e-6)

mix = voice + music * duck + sfx
fl = int(.4 * SR); mix[-fl:] *= np.linspace(1, 0, fl)

out = story / 'audio'
save(out / 'music.wav', music * duck)
save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .72)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'highpass=f=65,loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK CLEAN TEBESSUM mix.wav (ZERO HISS)', round(DUR, 2), 's')
