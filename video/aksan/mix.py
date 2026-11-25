# mix.py (Bölüm 7: Yabancı Aksan Sendromu) — özgün müzik + efektler, numpy ile sentezlenir, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
# Müzik: Re minör İskandinav piyano + yumuşak yaylı ped + alçak pizzikato (114 bpm).
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(77)

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

def piano(f, d=1.5):
    t = T(d)
    x = (
        np.sin(2 * np.pi * f * t)
        + .42 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 3.8)
        + .18 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 6.5)
        + .08 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 10.0)
    )
    return x * env(len(t), .004, d * .36)

def bell(f, d=2.0):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.0), (2, .35, 3.2), (3.01, .16, 5.0)]) * env(len(t), .005, 8)

def pizz(f, d=.45):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t); return x * env(len(t), .003, .11)

def pad(f, d, amp=.048):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 880) * amp
    return x * np.minimum(1, np.minimum(t / .7, (d - t) / .7))

NOTE = {
    'D2': 73.4, 'F2': 87.3, 'G2': 98.0, 'A2': 110.0, 'Bb2': 116.5, 'C3': 130.8,
    'D3': 146.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196.0, 'A3': 220.0, 'Bb3': 233.1,
    'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2, 'G4': 392.0, 'A4': 440.0,
    'Bb4': 466.2, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3, 'F5': 698.5,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .52, DUR * .64, DUR * .82])[:3]
beat = 60 / 114
music = np.zeros(N)
A_mel = ['D4', None, 'F4', None, 'A4', None, 'G4', None, 'F4', None, 'E4', None, 'D4', None, None, None]
B_mel = ['A4', 'F4', 'D4', 'F4', 'G4', 'A4', 'Bb4', 'A4', 'G4', 'F4', 'E4', 'F4', 'A4', None, 'D5', None]
C_mel = ['F4', None, 'E4', 'D4', 'C4', None, 'D4', None, 'F4', None, 'A4', None, 'G4', None, None, None]
D_arp = ['D3', 'F3', 'A3', 'D4', 'A3', 'F3']
bass = {'A': ['D2', None, 'A2', None], 'B': ['D2', 'Bb2', 'G2', 'A2'], 'C': ['D2', None, 'Bb2', None], 'D': ['D2', None, None, None]}

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]; n and put(music, t, piano(NOTE[n], 1.35), .25)
    elif sec == 'B':
        n = B_mel[step]; n and put(music, t, piano(NOTE[n], .95), .22)
    elif sec == 'C':
        n = C_mel[step]; n and put(music, t, piano(NOTE[n], 1.4), .24)
    else:
        if i % 2 == 0: put(music, t, piano(NOTE[D_arp[(i // 2) % 6]], 1.8), .22)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .55), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['D3'], max(.5, tB + .3), .046))
put(music, tB, pad(NOTE['A2'], max(.5, tD - tB + .3), .044))
put(music, tD, pad(NOTE['D3'], max(.5, DUR - tD), .054))
for f in ('D4', 'F4', 'A4'): put(music, max(0, DUR - 1.6), bell(NOTE[f], 1.6), .18)

sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'spark':
        tt = T(.28); ph = 2 * np.pi * np.cumsum(np.linspace(1100, 420, len(tt))) / SR
        put(sfx, t0, np.sin(ph) * env(len(tt), .004, .09) + band(noise(.28), 2200, 7500) * env(len(tt), .002, .05) * .3, .36)
    elif ty == 'wave':
        tt = T(.45); ph = 2 * np.pi * np.cumsum(np.linspace(380, 760, len(tt))) / SR
        put(sfx, t0, np.sin(ph) * np.sin(np.pi * tt / .45) ** 2, .26)
    elif ty == 'boom':
        nb = int(.95 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (52 + 32 * np.exp(-tt * 8)) * tt) * env(nb, .003, .28) + band(noise(.95), 60, 440) * env(nb, .002, .1) * .4, .52)
    elif ty == 'piano_shift':
        # Aynı piyano notaları, ama 3. nota milisaniye kaymış!
        for dt, fn in [(0.0, 'D4'), (0.28, 'F4'), (0.64, 'A4'), (1.02, 'Bb4'), (1.42, 'A4'), (1.84, 'F4')]:
            if dt < d:
                put(sfx, t0 + dt, piano(NOTE[fn], .75), .34)
    elif ty == 'harbor':
        x = band(noise(d), 160, 780); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .6, (d - tt) / .6)), .05)
    elif ty == 'shimmer':
        tt = T(2.0); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .85) for i, f in enumerate([587.3, 698.5, 880.0, 1174.7])) / 4, .18)

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
