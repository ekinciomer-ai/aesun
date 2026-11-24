# Efrâsiyâb Kaynana — sıfır hışırtılı, saf tınılı neşeli Anadolu kara mizah müziği (Re Majör / Hüseyni) + saf efektler (telifsiz, kodla).
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
def baglama(f, d=.95):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t)
         + .40 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
         + .15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 12))
    return x * env(len(t), .003, d * .28)

def bell(f, d=2.0):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.0), (2, .28, 3.8), (3, .10, 5.5)]) * env(len(t), .005, 9)

def pizz(f, d=.5):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)
    return x * env(len(t), .004, .14)

def wood_tap():
    t = T(.05)
    return (np.sin(2 * np.pi * 420 * t) * .65 + np.sin(2 * np.pi * 810 * t) * .35) * env(len(t), .002, .012)

def pad(f, d, amp=.038):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t) * .65 + np.sin(2 * np.pi * f * 1.5 * t) * .25 + np.sin(2 * np.pi * f * 2.0 * t) * .10) * amp
    return x * np.minimum(1, np.minimum(t / .9, (d - t) / .9))

NOTE = {
    'D2': 73.42, 'G2': 98.0, 'A2': 110.0, 'B2': 123.47, 'D3': 146.83, 'E3': 164.81, 'F#3': 185.0, 'G3': 196.0, 'A3': 220.0,
    'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25
}

W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .28, DUR * .60, DUR * .80])[:3]
beat = 60 / 102
music = np.zeros(N)

A_mel = ['D4', None, 'A4', None, 'G4', 'F#4', 'E4', None, 'D4', None, 'E4', 'F#4', 'A4', None, None, None]
B_mel = ['A4', 'G4', 'F4', 'E4', 'D4', None, 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'A3', None, 'D4', None]
C_mel = ['D5', None, 'B4', 'A4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'F#4', 'E4', 'D4', None]
bass = {'A': ['D2', None, 'A2', None], 'B': ['D2', 'A2', 'G2', 'A2'], 'C': ['D2', 'A2', 'B2', 'G2']}

i = 0; t = 0.0
while t < DUR - .3:
    sec = 'A' if t < tB else 'B' if t < tD else 'C'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]
        if n: put(music, t, baglama(NOTE[n], 1.0), .24)
    elif sec == 'B':
        n = B_mel[step]
        if n: put(music, t, baglama(NOTE[n], .85), .25)
        if i % 2 == 1: put(music, t, wood_tap(), .10)
    else:
        n = C_mel[step]
        if n: put(music, t, baglama(NOTE[n], .9), .26)
        if i % 2 == 1: put(music, t, wood_tap(), .12)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .6), .50)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['D3'], tB + .3, .038))
put(music, tB, pad(NOTE['A2'], max(.5, tD - tB + .3), .035))
put(music, tD, pad(NOTE['D3'], max(.5, DUR - tD), .042))
for f in ('D4', 'F#4', 'A4', 'D5'): put(music, max(0, DUR - 1.8), bell(NOTE[f], 1.8), .14)

# ------------------------------------------------------------------ saf efektler (ZERO white noise / sıfır hışırtı!)
sfx = np.zeros(N)
def soft_whoosh():
    tt = T(.25)
    f = 165 + 160 * np.sin(np.pi * tt / .25)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * (np.sin(np.pi * tt / .25) ** 2) * .12

for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        put(sfx, t0, soft_whoosh(), .6)
    elif ty == 'stone':
        tt = T(d)
        rumb = (np.sin(2 * np.pi * 62 * tt) * .5 + np.sin(2 * np.pi * 94 * tt) * .3) * np.sin(np.pi * tt / d) ** 1.5
        put(sfx, t0, rumb, .40)
    elif ty == 'boom':
        nb = int(.75 * SR); tt = np.arange(nb) / SR
        thump = np.sin(2 * np.pi * (50 + 36 * np.exp(-tt * 9)) * tt) * env(nb, .003, .22)
        wood = np.sin(2 * np.pi * 155 * tt) * env(nb, .002, .05) * .35
        put(sfx, t0, thump + wood, .75)
    elif ty == 'gold':
        tt = T(1.8)
        chime = sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .004 + k * .04, .65) for k, f in enumerate([880.0, 1108.73, 1318.51, 1760.0])) / 4
        put(sfx, t0, chime, .65)
    elif ty == 'tractor':
        # yumuşak, komik düşük frekanslı traktör pıt-pıt ritmi (sıfır hışırtı!)
        tt = T(d)
        chug = np.sin(2 * np.pi * 76 * tt) * (.55 + .45 * np.sin(2 * np.pi * 8.5 * tt)) * .16
        put(sfx, t0, chug * np.minimum(1, np.minimum(tt / .3, (d - tt) / .4)), .45)
    elif ty == 'shimmer':
        tt = T(1.8)
        put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + idx * .05, .8) for idx, f in enumerate([587.33, 739.99, 880.0, 1174.66])) / 4, .22)

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
sfx *= (vr * 0.55) / max(sfx_peak, 1e-6)

mix = voice + music * duck + sfx
fl = int(.4 * SR); mix[-fl:] *= np.linspace(1, 0, fl)

out = story / 'audio'
save(out / 'music.wav', music * duck)
save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .72)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'highpass=f=65,loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK CLEAN KAYNANA mix.wav (ZERO HISS)', round(DUR, 2), 's')
