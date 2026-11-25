# mix.py (Bölüm 8: Mavi Derili Aile — Kentucky Fugate) — özgün Apalaş akustik banjo/gitar + damar nabzı, telif yok.
#   python3 -I mix.py <hikaye_klasörü>
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1])
cues = json.load(open(story / 'audio' / 'cues.json', encoding='utf-8'))
DUR = cues['DUR']; N = int(DUR * SR)
rng = np.random.default_rng(88)

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

# Apalaş akustik tel / banjo tınısı (parlak harmonikli mızrap)
def pluck(f, d=1.1):
    t = T(d)
    x = (
        np.sin(2 * np.pi * f * t)
        + .52 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 5.2)
        + .26 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 9.0)
        + .12 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 14.0)
    )
    return x * env(len(t), .002, d * .26)

def bell(f, d=2.0):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.0), (2, .35, 3.2), (3.01, .16, 5.0)]) * env(len(t), .005, 8)

def bass_pluck(f, d=.5):
    t = T(d); x = np.sin(2 * np.pi * f * t) + .28 * np.sin(4 * np.pi * f * t); return x * env(len(t), .003, .13)

def pad(f, d, amp=.045):
    t = T(d); x = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.003, .997, 2.002)); x = band(x, 65, 860) * amp
    return x * np.minimum(1, np.minimum(t / .7, (d - t) / .7))

NOTE = {
    'E2': 82.4, 'G2': 98.0, 'A2': 110.0, 'B2': 123.5, 'C3': 130.8, 'D3': 146.8,
    'E3': 164.8, 'G3': 196.0, 'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7,
    'E4': 329.6, 'G4': 392.0, 'A4': 440.0, 'B4': 493.9, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3,
}
W = sorted(c['t'] for c in cues['cues'] if c['type'] == 'whoosh')
tB, tC, tD = (W + [DUR * .45, DUR * .68, DUR * .82])[:3]
beat = 60 / 116
music = np.zeros(N)
# Apalaş pentatonik motif (Mi minör / Sol majör havası)
A_mel = ['E4', 'G4', 'A4', None, 'B4', 'A4', 'G4', None, 'E4', 'D4', 'E4', None, 'G4', None, None, None]
B_mel = ['B4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4', None, 'E4', None]
C_mel = ['G4', None, 'A4', 'B4', 'D5', None, 'B4', None, 'A4', 'G4', 'E4', None, 'G4', None, None, None]
D_arp = ['G3', 'B3', 'D4', 'G4', 'D4', 'B3']
bass = {'A': ['E2', None, 'B2', None], 'B': ['E2', 'C3', 'G2', 'D3'], 'C': ['G2', None, 'D3', None], 'D': ['G2', None, None, None]}

i = 0; t = 0.0
while t < DUR - .25:
    sec = 'A' if t < tB else 'B' if t < tC else 'C' if t < tD else 'D'
    step = i % 16
    if sec == 'A':
        n = A_mel[step]; n and put(music, t, pluck(NOTE[n], 1.0), .24)
    elif sec == 'B':
        n = B_mel[step]; n and put(music, t, pluck(NOTE[n], .85), .22)
    elif sec == 'C':
        n = C_mel[step]; n and put(music, t, pluck(NOTE[n], 1.15), .24)
    else:
        if i % 2 == 0: put(music, t, pluck(NOTE[D_arp[(i // 2) % 6]], 1.4), .22)
    b = bass[sec][(i // 4) % 4] if i % 4 == 0 else None
    if b: put(music, t, bass_pluck(NOTE[b], .55), .48)
    t += beat / 2; i += 1

put(music, 0, pad(NOTE['E3'], max(.5, tB + .3), .044))
put(music, tB, pad(NOTE['B2'], max(.5, tD - tB + .3), .044))
put(music, tD, pad(NOTE['G3'], max(.5, DUR - tD), .052))
for f in ('G4', 'B4', 'D5'): put(music, max(0, DUR - 1.6), bell(NOTE[f], 1.6), .18)

sfx = np.zeros(N)
for c in cues['cues']:
    t0, ty, d = c['t'], c['type'], c.get('dur', 1.0)
    if ty == 'whoosh':
        x = noise(.42); tt = np.arange(len(x)) / SR; put(sfx, t0, band(x, 300, 3400) * np.sin(np.pi * tt / .42) ** 2, .35)
    elif ty == 'creek':
        x = band(noise(d), 750, 4800); tt = np.arange(len(x)) / SR
        put(sfx, t0, x * np.minimum(1, np.minimum(tt / .5, (d - tt) / .5)), .06)
    elif ty == 'heartbeat':
        bt = t0
        while bt < t0 + d - .35:
            for dt, f0 in [(0.0, 58), (0.18, 46)]:
                nb = int(.22 * SR); tt = np.arange(nb) / SR
                put(sfx, bt + dt, np.sin(2 * np.pi * f0 * tt) * env(nb, .005, .06), .42)
            bt += .75
    elif ty == 'drop':
        tt = T(.14); ph = 2 * np.pi * np.cumsum(np.linspace(540, 1520, len(tt))) / SR
        put(sfx, t0, np.sin(ph) * env(len(tt), .003, .038), .44)
    elif ty == 'unlock':
        # Metalik kilit tıkı + parlak açılma çınlaması!
        tt = T(.45); put(sfx, t0, (band(noise(.45), 1400, 5200) * env(len(tt), .002, .035) * .6 + np.sin(2 * np.pi * 880 * tt) * env(len(tt), .004, .14) * .4), .42)
    elif ty == 'boom':
        nb = int(.95 * SR); tt = np.arange(nb) / SR
        put(sfx, t0, np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 8)) * tt) * env(nb, .003, .28) + band(noise(.95), 60, 420) * env(nb, .002, .1) * .4, .50)
    elif ty == 'shimmer':
        tt = T(2.0); put(sfx, t0, sum(np.sin(2 * np.pi * f * tt) * env(len(tt), .01 + i * .06, .85) for i, f in enumerate([587.3, 784.0, 987.8, 1174.7])) / 4, .19)

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
