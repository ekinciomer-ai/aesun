# mix.py (Bölüm 4: Taş Adam Sendromu — FOP) — özgün müzik + efektler, numpy ile sentezlenir, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
# Müzik: Mi minör meraklı marimba + cam çan + alçak pizzikato (110 bpm).
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(44)

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

def marimba(f, d=1.1):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + .22 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 14)) * env(len(t), .002, d * .26)
def bell(f, d=2.0):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.1), (2, .35, 3.4), (3.01, .16, 5.2)]) * env(len(t), .004, 8)
def pizz(f, d=.45):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .28 * np.sin(4 * np.pi * f * t); return x * env(len(t), .003, .11)
def pad(f, d, amp=.052):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 960) * amp
    return x * np.minimum(1, np.minimum(t / .7, (d - t) / .7))

NOTE = {
    'E2': 82.4, 'G2': 98.0, 'A2': 110.0, 'B2': 123.5, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8,
    'G3': 196.0, 'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F#4': 370.0,
    'G4': 392.0, 'A4': 440.0, 'B4': 493.9, 'D5': 587.3, 'E5': 659.3,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .52, DUR * .64, DUR * .76])[:3]
beat = 60 / 110
music = np.zeros(N)
A_mel = ['E4', None, 'G4', None, 'B4', None, 'A4', None, 'G4', None, 'F#4', None, 'E4', None, None, None]
B_mel = ['B4', 'G4', 'E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4', 'F#4', 'E4', 'G4', None, 'B4', None]
C_mel = ['E4', None, 'B4', 'A4', 'G4', None, 'F#4', None, 'E4', None, 'D4', None, 'E4', None, None, None]
D_arp = ['E3', 'G3', 'B3', 'E4', 'B3', 'G3']
bass = {'A': ['E2', None, 'B2', None], 'B': ['E2', 'C3', 'A2', 'B2'], 'C': ['E2', None, 'C3', None], 'D': ['E2', None, None, None]}

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]; n and put(music, t, marimba(NOTE[n], 1.1), .25)
    elif sec == 'B':
        n = B_mel[step]; n and put(music, t, marimba(NOTE[n], .85), .23)
    elif sec == 'C':
        n = C_mel[step]; n and put(music, t, marimba(NOTE[n], 1.2), .25)
    else:
        if i % 2 == 0: put(music, t, marimba(NOTE[D_arp[(i // 2) % 6]], 1.6), .20)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, pizz(NOTE[b], .55), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['E3'], max(.5, tB + .3), .048))
put(music, tB, pad(NOTE['B2'], max(.5, tD - tB + .3), .045))
put(music, tD, pad(NOTE['E3'], max(.5, DUR - tD), .055))
for f in ('E4', 'G4', 'B4', 'E5'): put(music, max(0, DUR - 1.6), bell(NOTE[f], 1.6), .16)

sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'bump':
        nb = int(.22 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (95 - 40 * tt) * tt) * env(nb, .002, .05) + band(noise(.22), 120, 900) * env(nb, .002, .03) * .4, .52)
    elif ty == 'xray':
        tt = T(d); put(sfx, t0, np.sin(2 * np.pi * 620 * tt) * .25 * np.sin(np.pi * tt / max(d, .05)) + band(noise(d), 1200, 4200) * .08 * np.sin(np.pi * tt / max(d, .05)), .24)
    elif ty == 'boom':
        nb = int(.95 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 8)) * tt) * env(nb, .003, .28) + band(noise(.95), 60, 420) * env(nb, .002, .1) * .4, .55)
    elif ty == 'snap':
        put(sfx, t0, band(noise(.12), 1400, 6800) * env(int(.12 * SR), .001, .02), .52)
    elif ty == 'concrete':
        for k in range(4):
            nb = int(.26 * SR); tt = np.arange(nb) / SR
            put(sfx, t0 + k * .26, band(noise(.26), 90, 750) * env(nb, .005, .08) + np.sin(2 * np.pi * (68 - 20 * tt) * tt) * env(nb, .003, .06) * .5, .44)
    elif ty == 'shimmer':
        tt = T(2.0); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .85) for i, f in enumerate([659.3, 784.0, 987.8, 1318.5])) / 4, .18)
    elif ty == 'evening':
        x = band(noise(d), 180, 820); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .6, (d - tt) / .6)), .045)

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
