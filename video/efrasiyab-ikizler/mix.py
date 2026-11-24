"""Efrâsiyâb'ın Hikâyeleri — Yapışık İkizler (Abuzer & Alemdar): sıfır hışırtılı saf tınılı miks."""
import json, math, os, subprocess, sys, wave
import numpy as np

SR = 48000
ROOT = sys.argv[1]
VOICE = os.path.join(ROOT, 'audio', 'voice.wav')
CUES_F = os.path.join(ROOT, 'audio', 'cues.json')
OUT = os.path.join(ROOT, 'audio', 'mix.wav')


def rwav(p):
    with wave.open(p, 'rb') as w:
        sr, ch = w.getframerate(), w.getnchannels()
        d = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        d = d.reshape(-1, ch).mean(1)
    if sr != SR:
        n = int(round(len(d) * SR / sr))
        d = np.interp(np.linspace(0, len(d) - 1, n), np.arange(len(d)), d).astype(np.float32)
    return d


def wwav(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def lp(x, fc):
    a = 1 - math.exp(-2 * math.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a * (x[i] - s)
        y[i] = s
    return y


def add(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(sig))
    s = sig[a - i:b - i] * gain
    L = math.cos((pan + 1) * math.pi / 4)
    R = math.sin((pan + 1) * math.pi / 4)
    buf[a:b, 0] += s * L
    buf[a:b, 1] += s * R


def oud(f, dur, bright=1.0):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.006) * np.exp(-t * 4.5)
    y = (np.sin(2 * math.pi * f * t)
         + 0.42 * bright * np.sin(2 * math.pi * f * 2 * t) * np.exp(-t * 6.0)
         + 0.14 * bright * np.sin(2 * math.pi * f * 3 * t) * np.exp(-t * 9.5))
    return (y * env).astype(np.float32)


def warm_pad(notes, dur):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.35) * np.minimum(1, np.maximum(0, (dur - t) / 0.50))
    y = np.zeros_like(t)
    for m in notes:
        f = m2f(m)
        y += np.sin(2 * math.pi * f * t) + 0.16 * np.sin(2 * math.pi * f * 2 * t)
    return (y / max(1, len(notes)) * env).astype(np.float32)


def pizz(f, dur=0.40):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.005) * np.exp(-t * 7.5)
    return ((np.sin(2 * math.pi * f * t) + 0.25 * np.sin(2 * math.pi * f * 2 * t)) * env).astype(np.float32)


# ---- SIFIR HIŞIRTILI SAF TINILI SFX ----
def soft_whoosh(dur=0.28):
    t = np.arange(int(dur * SR)) / SR
    env = np.sin(math.pi * t / dur) ** 1.5
    ph = 2 * math.pi * np.cumsum(np.linspace(145, 360, len(t))) / SR
    return (np.sin(ph) * 0.40 * env).astype(np.float32)


def clock_tick():
    t = np.arange(int(0.18 * SR)) / SR
    s1 = np.sin(2 * math.pi * 1120 * t) * np.exp(-t * 48)
    s2 = np.sin(2 * math.pi * 880 * t) * np.exp(-t * 52)
    return np.concatenate([s1 * 0.45, np.zeros(int(0.18 * SR), np.float32), s2 * 0.40]).astype(np.float32)


def crunch_pop():
    t = np.arange(int(0.24 * SR)) / SR
    f = 420 * np.exp(-t * 14) + 180
    return (np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t * 20) * 0.65).astype(np.float32)


def glass_clink():
    t = np.arange(int(0.45 * SR)) / SR
    y = (np.sin(2 * math.pi * 1568 * t) * np.exp(-t * 11)
         + 0.45 * np.sin(2 * math.pi * 2349 * t) * np.exp(-t * 16))
    return (y * 0.50).astype(np.float32)


def wobble_boom():
    t = np.arange(int(0.65 * SR)) / SR
    f = 135 * np.exp(-t * 5.0) + 46 + 14 * np.sin(2 * math.pi * 7.5 * t) * np.exp(-t * 2.5)
    return (np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5) * 0.85).astype(np.float32)


def shimmer():
    t = np.arange(int(1.25 * SR)) / SR
    y = np.zeros_like(t)
    for k, m in enumerate([69, 74, 76, 81]):
        d = k * 0.09
        u = np.maximum(0, t - d)
        y += np.where(t >= d, np.sin(2 * math.pi * m2f(m) * u) * np.exp(-u * 3.2), 0)
    return (y * 0.25).astype(np.float32)


def build():
    info = json.load(open(CUES_F, encoding='utf-8'))
    dur = float(info['DUR'])
    N = int(round(dur * SR))
    voice = rwav(VOICE)
    if len(voice) < N:
        voice = np.pad(voice, (0, N - len(voice)))
    else:
        voice = voice[:N]

    mus = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)

    # Neşeli-ironik Anadolu / D minör–F majör ritmik ezgi (sıfır hışırtı!)
    bar = 2.0
    chords = [
        ([50, 57, 62, 65], [62, 65, 69, 65, 67, 65, 64, 62]),
        ([53, 57, 60, 65], [65, 69, 72, 69, 67, 65, 64, 60]),
        ([46, 53, 58, 62], [62, 65, 67, 69, 67, 65, 62, 58]),
        ([45, 52, 57, 61], [61, 64, 67, 69, 67, 64, 61, 57]),
    ]
    n_bars = int(dur / bar) + 1
    for b in range(n_bars):
        t0 = b * bar
        pad_n, mel = chords[b % len(chords)]
        in_finale = t0 > dur * 0.72
        add(mus, t0, warm_pad(pad_n, bar * 1.15), 0.13 if in_finale else 0.10, 0.0)
        # Tempolu bas pizzicato
        for step, bass_n in [(0.0, pad_n[0] - 12), (0.5, pad_n[1] - 12), (1.0, pad_n[0] - 12), (1.5, pad_n[2] - 24)]:
            add(mus, t0 + step, pizz(m2f(bass_n), 0.36), 0.16 if not in_finale else 0.11, -0.10)
        # Kıvrak mizahi ud/keman melodisi
        for k, mn in enumerate(mel):
            if in_finale and k % 2 == 1:
                continue
            add(mus, t0 + k * (bar / 8), oud(m2f(mn), 0.42, 0.72 if in_finale else 1.0),
                0.14 if not in_finale else 0.12, 0.18 if k % 2 else -0.18)

    for c in info.get('cues', []):
        t0, tp = float(c['t']), c['type']
        if tp == 'whoosh':
            add(sfx, t0, soft_whoosh(), 0.55)
        elif tp == 'tick':
            add(sfx, t0, clock_tick(), 0.72)
        elif tp == 'crunch':
            add(sfx, t0, crunch_pop(), 0.78)
        elif tp == 'clink':
            add(sfx, t0, glass_clink(), 0.75)
        elif tp == 'boom':
            add(sfx, t0, wobble_boom(), 0.85)
        elif tp == 'shimmer':
            add(sfx, t0, shimmer(), 0.72)

    # Ses seviyesi normalizasyonu + voice ducking (peak-safe, sıfır hışırtı)
    env = lp(np.abs(voice), 6.0)
    duck = 1.0 - 0.54 * np.clip(env / (np.percentile(env, 95) + 1e-6), 0, 1)
    vr = float(np.sqrt(np.mean(voice ** 2)) + 1e-6)
    mr = float(np.sqrt(np.mean(mus ** 2)) + 1e-6)
    mus *= (vr * 0.22 / mr) * duck[:, None]

    sfx_peak = float(np.max(np.abs(sfx)) + 1e-6)
    if sfx_peak > 1e-5:
        sfx *= min(0.55, (vr * 1.45) / sfx_peak)

    mix = np.stack([voice, voice], 1) + mus + sfx
    fade_out = int(min(0.6 * SR, N))
    if fade_out > 0:
        mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

    tmp = OUT + '.raw.wav'
    wwav(tmp, mix / max(1.0, float(np.max(np.abs(mix))) * 1.05))
    subprocess.run([
        'ffmpeg', '-y', '-i', tmp,
        '-af', 'loudnorm=I=-14.2:TP=-2.7:LRA=7:linear=true',
        '-ar', str(SR), '-ac', '2', OUT
    ], check=True)
    os.remove(tmp)
    print('MIX_OK', OUT)


if __name__ == '__main__':
    build()
