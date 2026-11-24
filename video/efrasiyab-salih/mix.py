# Efrâsiyâb Salih — sıfır hışırtılı, saf tınılı lirik-felsefi Anadolu müziği (Re Hüseyni/Uşşak, ney-flüt + ud + pizzikato) + saf efektler (telifsiz, kodla).
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
def oud(f, d=1.1):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t)
         + .36 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
         + .14 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 11))
    return x * env(len(t), .004, d * .32)

def ney(f, d=1.3):
    t = T(d)
    vib = 1.0 + .004 * np.sin(2 * np.pi * 5.2 * t)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) * .78 + np.sin(2 * ph) * .18
    fade = np.minimum(1, np.minimum(t / .16, (d - t) / .24))
    return x * fade * .22

def bell(f, d=2.2):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 1.8), (2, .25, 3.4), (3, .08, 5.2)]) * env(len(t), .006, 9)

def pizz(f, d=.55):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .24 * np.sin(4 * np.pi * f * t)
    return x * env(len(t), .004, .16)

def pad(f, d, amp=.038):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t) * .65 + np.sin(2 * np.pi * f * 1.5 * t) * .25 + np.sin(2 * np.pi * f * 2.0 * t) * .10) * amp
    return x * np.minimum(1, np.minimum(t / .9, (d - t) / .9))

NOTE = {
    'D2': 73.42, 'G2': 98.0, 'A2': 110.0, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0, 'A3': 220.0,
    'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25
}

W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .32, DUR * .58, DUR * .78])[:3]
beat = 60 / 96
music = np.zeros(N)

A_mel = ['A4', None, 'G4', None, 'F4', None, 'E4', None, 'D4', None, 'E4', 'F4', 'A4', None, None, None]
B_mel = ['D4', 'E4', 'F4', None, 'G4', 'A4', 'G4', 'F4', 'E4', None, 'F4', 'G4', 'A4', None, 'D4', None]
C_mel = ['A4', None, 'C5', None, 'D5', None, 'C5', 'A4', 'G4', None, 'F4', 'E4', 'D4', None, None, None]
bass = {'A': ['D2', None, 'A2', None], 'B': ['D2', 'C3', 'G2', 'A2'], 'C': ['D2', None, 'G2', None]}

i = 0; t = 0.0
while t < DUR - .3:
    sec = 'A' if t < tB else 'B' if t < tC else 'C'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]
        if n: put(music, t, oud(NOTE[n], 1.1), .24)
    elif sec == 'B':
        n = B_mel[step]
        if n: put(music, t, oud(NOTE[n], .95), .25)
    else:
        n = C_mel[step]
        if n: put(music, t, oud(NOTE[n], 1.3), .24)
        if step in (0, 8) and n: put(music, t, ney(NOTE[n], 1.4), .35)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .7), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['D3'], tB + .3, .038))
put(music, tB, pad(NOTE['A2'], max(.5, tC - tB + .3), .035))
put(music, tC, pad(NOTE['D3'], max(.5, DUR - tC), .042))
for f in ('D4', 'A4', 'E5'): put(music, max(0, DUR - 2.0), bell(NOTE[f], 2.0), .15)

# ------------------------------------------------------------------ saf efektler (sıfır beyaz gürültü / sıfır hışırtı!)
sfx = np.zeros(N)
def soft_whoosh():
    tt = T(.24)
    f = 160 + 150 * np.sin(np.pi * tt / .24)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * (np.sin(np.pi * tt / .24) ** 2) * .12

for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        put(sfx, t0, soft_whoosh(), .55)
    elif ty == 'stone':
        tt = T(d)
        rumb = (np.sin(2 * np.pi * 64 * tt) * .55 + np.sin(2 * np.pi * 96 * tt) * .28) * np.sin(np.pi * tt / d) ** 1.4
        put(sfx, t0, rumb, .45)
    elif ty == 'boom':
        nb = int(.70 * SR); tt = np.arange(nb) / SR
        thump = np.sin(2 * np.pi * (48 + 30 * np.exp(-tt * 9)) * tt) * env(nb, .003, .22)
        put(sfx, t0, thump, .70)
    elif ty == 'water':
        # berrak su damlası tınısı (yukarı kayan saf sinüs)
        tt = T(.18)
        f = 520 + 680 * (tt / .18) ** 1.4
        ph = 2 * np.pi * np.cumsum(f) / SR
        put(sfx, t0, np.sin(ph) * env(len(tt), .003, .045), .55)
    elif ty == 'chime':
        tt = T(1.4)
        put(sfx, t0, (np.sin(2 * np.pi * 587.33 * tt) * .6 + np.sin(2 * np.pi * 880.0 * tt) * .4) * env(len(tt), .006, .45), .35)
    elif ty == 'shimmer':
        tt = T(2.0)
        put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + idx * .05, .85) for idx, f in enumerate([587.33, 659.25, 880.0, 1174.66])) / 4, .24)

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
print('OK CLEAN SALIH mix.wav (ZERO HISS)', round(DUR, 2), 's')
