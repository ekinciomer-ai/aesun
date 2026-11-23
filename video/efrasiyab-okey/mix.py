# Efrâsiyâb Okey — sıfır hışırtılı, saf tınılı özgün müzik (Re Hicaz / minör) + saf ahşap/darbe efektleri (telifsiz, kodla).
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

# ------------------------------------------------------------------ saf sinüs/armonik çalgılar (ZERO white noise, sıfır hışırtı!)
def oud(f, d=1.1):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t)
         + .38 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
         + .16 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 11))
    return x * env(len(t), .004, d * .30)

def bell(f, d=2.2):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.0), (2, .28, 3.6), (3, .10, 5.5)]) * env(len(t), .006, 9)

def pizz(f, d=.55):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .26 * np.sin(4 * np.pi * f * t)
    return x * env(len(t), .004, .14)

def wood_tap():
    t = T(.055)
    return (np.sin(2 * np.pi * 410 * t) * .65 + np.sin(2 * np.pi * 790 * t) * .35) * env(len(t), .002, .012)

def pad(f, d, amp=.045):
    t = T(d)
    x = (np.sin(2 * np.pi * f * t) * .65
         + np.sin(2 * np.pi * f * 1.5 * t) * .25
         + np.sin(2 * np.pi * f * 2.0 * t) * .10) * amp
    return x * np.minimum(1, np.minimum(t / .9, (d - t) / .9))

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
        if i % 2 == 1: put(music, t, wood_tap(), .10)
    elif sec == 'C':
        n = C_mel[step]
        if n: put(music, t, oud(NOTE[n], 1.3), .26)
        if i % 4 == 2: put(music, t, wood_tap(), .08)
    else:
        if i % 2 == 0: put(music, t, oud(NOTE[D_arp[(i // 2) % 6]], 1.8), .20)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .7), .52)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['D3'], tB + .3, .04))
put(music, tB, pad(NOTE['A2'], max(.5, tC - tB + .3), .035))
put(music, tC, pad(NOTE['D3'], max(.5, tD - tC + .3), .04))
put(music, tD, pad(NOTE['D2'], max(.5, DUR - tD), .045))
for f in ('D4', 'A4', 'D5'): put(music, max(0, DUR - 1.9), bell(NOTE[f], 1.9), .15)

# ------------------------------------------------------------------ saf efektler (sıfır beyaz gürültü / sıfır hışırtı!)
sfx = np.zeros(N)
def okey_clack():
    tt = T(.065)
    return (np.sin(2 * np.pi * 1820 * tt) * .55
            + np.sin(2 * np.pi * 2940 * tt) * .30
            + np.sin(2 * np.pi * 760 * tt) * .25) * env(len(tt), .001, .013)

def soft_whoosh():
    tt = T(.26)
    f = 160 + 170 * np.sin(np.pi * tt / .26)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * (np.sin(np.pi * tt / .26) ** 2) * .12

for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        put(sfx, t0, soft_whoosh(), .6)
    elif ty == 'snap':
        put(sfx, t0, okey_clack(), .55)
        put(sfx, t0 + .055, okey_clack(), .30)
    elif ty == 'boom':
        nb = int(.75 * SR); tt = np.arange(nb) / SR
        thump = np.sin(2 * np.pi * (48 + 34 * np.exp(-tt * 9)) * tt) * env(nb, .003, .22)
        wood = np.sin(2 * np.pi * 145 * tt) * env(nb, .002, .05) * .35
        put(sfx, t0, thump + wood, .75)
    elif ty == 'tremble':
        tt = T(d)
        pulse = .6 + .4 * np.sin(2 * np.pi * 3.5 * tt)
        sh_w = (np.sin(2 * np.pi * 146.83 * tt) + np.sin(2 * np.pi * 155.56 * tt)) * .12 * pulse
        put(sfx, t0, sh_w * np.minimum(1, np.minimum(tt / .3, (d - tt) / .3)), .55)
    elif ty == 'steps':
        for k in range(max(1, int(d * 2.1))):
            tt = T(.07)
            step_thud = (np.sin(2 * np.pi * 92 * tt) * .7 + np.sin(2 * np.pi * 185 * tt) * .3) * env(len(tt), .002, .022)
            put(sfx, t0 + k / 2.1, step_thud, .32)
    elif ty == 'shimmer':
        tt = T(2.0)
        put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + idx * .05, .85) for idx, f in enumerate([587.33, 880.0, 1174.66])) / 3, .18)

# ------------------------------------------------------------------ miks: saf ses üstte, müzik -19 dB (konuşurken %50 kısık), sfx kontrollü (şişirilmez)
voice = load(story / 'voice' / 'voice.wav'); voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
win = int(.05 * SR); ve = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = np.convolve((ve > .02).astype(float), np.ones(int(.25 * SR)) / int(.25 * SR), mode='same')
duck = 1 - .50 * np.clip(active, 0, 1)

def rms(x):
    nz = x[np.abs(x) > 1e-5]
    return float(np.sqrt(np.mean(nz ** 2))) if len(nz) else 1.0

vr = rms(voice)
music *= (vr / rms(music)) * 10 ** (-19 / 20)
# sfx'i seyrek RMS ile şişirmek yerine doğrudan ses seviyesine orantılı temiz kazançla uygula
sfx_peak = float(np.max(np.abs(sfx))) if np.any(sfx) else 1.0
sfx *= (vr * 0.55) / max(sfx_peak, 1e-6)

mix = voice + music * duck + sfx
fl = int(.4 * SR); mix[-fl:] *= np.linspace(1, 0, fl)

out = story / 'audio'
save(out / 'music.wav', music * duck)
save(out / 'sfx.wav', sfx)
save(out / 'premix.wav', mix / max(1e-6, np.abs(mix).max()) * .72)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'premix.wav'), '-af', 'highpass=f=65,loudnorm=I=-14:TP=-2.8:LRA=11,aresample=48000', str(out / 'mix.wav')], check=True)
print('OK CLEAN mix.wav (ZERO HISS)', round(DUR, 2), 's')
