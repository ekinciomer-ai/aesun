#!/usr/bin/env python3
"""Pumpkin 2 (Dedikodu) için özgün müzik: tamamen kodla sentezlenir (sample/kayıt yok) → telif ve lisans sorunu yok.
Zamanlar kelimeler.json'dan alınır; metin/ses değişirse müzik kendiliğinden hizalanır.
Çıktı: public/dedikodu/muzik.wav (44.1 kHz stereo). Konuşma anlarında müzik kısılır (ducking)."""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
KOK = Path(__file__).resolve().parent.parent
K = json.load(open(KOK / "public/dedikodu/kelimeler.json", encoding="utf-8"))
SURE = K[-1]["e"] + 1.6
N = int(SURE * SR)
rng = np.random.default_rng(7)


def L(c, i=0):
    s = [k for k in K if k["c"] == c]
    return s[min(i, len(s) - 1)]["s"]


def ka(c, bas):
    for k in K:
        if k["c"] == c and k["w"].lower().startswith(bas):
            return k["s"]
    return L(c)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTA = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def m(ad):  # "D4" → midi
    return 12 * (int(ad[-1]) + 1) + NOTA[ad[:-1]]


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


mix = np.zeros((2, N))


def koy(sinyal, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    s = sinyal[: N - i] * gain
    mix[0, i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    mix[1, i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def zaman(d):
    return np.arange(int(d * SR)) / SR


def pluck(f, d=0.7, parlak=1.0):
    t = zaman(d)
    x = sum((1 / k) * np.sin(2 * np.pi * k * f * t) * np.exp(-t * (3 + k * 2.2 / parlak)) for k in range(1, 9))
    return x * np.minimum(1, t / 0.004) * 0.5


def bell(f, d=1.6):
    t = zaman(d)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec) for r, a, dec in ((1, 1, 2.2), (2.76, 0.4, 4), (5.4, 0.2, 7), (2.0, 0.25, 3)))
    return x * np.minimum(1, t / 0.002) * 0.35


def pad(notalar, d, atak=0.6, birak=0.8, kesim=1600, tremolo=0.0):
    t = zaman(d)
    x = np.zeros_like(t)
    for f in notalar:
        for det in (-0.004, 0.0, 0.0045):
            ff = f * (1 + det)
            x += sum((1 / k) * np.sin(2 * np.pi * k * ff * t + det * 100) for k in range(1, 10))
    x = lp(x / (len(notalar) * 3), kesim)
    e = np.minimum(1, t / atak) * np.minimum(1, np.maximum(0, (d - t) / birak))
    if tremolo:
        e *= 0.6 + 0.4 * np.sin(2 * np.pi * tremolo * t)
    return x * e * 0.4


def drone(f, d):
    t = zaman(d)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 1.5 * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return x * (0.75 + 0.25 * np.sin(2 * np.pi * 0.25 * t)) * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.4) * 0.25


def cello(m0, m1, d):
    t = zaman(d)
    f = hz(m0) * (hz(m1) / hz(m0)) ** (t / d)
    faz = 2 * np.pi * np.cumsum(f * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t))) / SR
    x = sum((1 / k) * np.sin(k * faz) for k in range(1, 14))
    return lp(x, 1400) * np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 0.3) * 0.28


def tik():
    t = zaman(0.06)
    x = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 90) + hp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 120) * 0.3
    return x * 0.35


def kalp():
    t = zaman(0.25)
    tum = (np.sin(2 * np.pi * (55 - 20 * t) * t) * np.exp(-t * 18))
    x = np.concatenate([tum, np.zeros(int(0.05 * SR)), tum * 0.7])
    return lp(x, 300) * 0.9


def vurus():  # "Kim söyledi?": derin vuruş + Re minör akor
    t = zaman(2.2)
    boom = np.sin(2 * np.pi * (60 - 25 * t) * t) * np.exp(-t * 3.5)
    akor = sum(pluck(hz(m(n)), 2.2, 1.5) for n in ("D3", "A3", "D4", "F4"))
    gurultu = lp(rng.normal(0, 1, len(t)), 2500) * np.exp(-t * 4) * 0.15
    return boom * 0.9 + akor * 0.8 + gurultu


def kayis(m0, m1, d):  # komik iniş ("pıh")
    t = zaman(d)
    f = hz(m0) * (hz(m1) / hz(m0)) ** (t / d)
    faz = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(faz) + 0.3 * np.sin(2 * faz)) * np.exp(-t * 2) * np.minimum(1, t / 0.01) * 0.4


# ---- A: dedikodu (sinsi, oyuncu) 0 → satır 3
BEAT = 0.6
A_son = L(3) - 0.25
ezgi = ["A3", "D4", "F4", "E4", "D4", "C#4", "D4", "A3"]
t = 0.0
i = 0
while t < A_son - 0.2:
    koy(pluck(hz(m(["D2", "A2"][i % 2])), 0.5, 0.6), t, 0.9)
    if i % 2 == 0 or t > L(1):
        koy(pluck(hz(m(ezgi[i % len(ezgi)])), 0.45), t + BEAT / 2, 0.55, pan=0.3)
    if L(1) <= t < L(2):  # fısıltı: tiz staccato üçlemeler
        for j, n in enumerate(("F5", "E5", "D5")):
            koy(pluck(hz(m(n)), 0.25, 1.4), t + j * 0.1, 0.25, pan=-0.4)
    koy(tik(), t + BEAT / 2, 0.25, pan=0.5)
    t += BEAT
    i += 1
for j, n in enumerate(("D4", "F4", "A4", "D5")):  # müşteri şaşırdı
    koy(pluck(hz(m(n)), 0.8, 1.3), L(2) + 0.05 + j * 0.09, 0.6, pan=-0.2)

# ---- B: Pumpkin sakin (sıcak) satır 3 → 5
B0, B1 = L(3) - 0.1, L(5) - 0.05
yarim = (B1 - B0) / 2
koy(pad([hz(m(n)) for n in ("F3", "A3", "C4")], yarim + 0.6, 1.0, 0.6), B0, 0.9)
koy(pad([hz(m(n)) for n in ("A#2", "D3", "F3")], yarim + 0.4, 0.6, 0.4), B0 + yarim, 0.9)
for j, n in enumerate(("A5", "F5", "C6", "A5")):
    koy(bell(hz(m(n))), B0 + 0.8 + j * yarim / 2, 0.35, pan=0.3 * (-1) ** j)
koy(vurus(), ka(5, "kim") - 0.02, 1.0)

# ---- C: gerilim satır 6 → 9
C0, C1 = L(6), L(9)
koy(drone(hz(m("D2")), C1 - C0 + 0.3), C0, 1.0)
koy(drone(hz(m("A2")), C1 - C0 + 0.3), C0 + 0.4, 0.6)
tt = C0
while tt < C1 - 0.3:
    koy(tik(), tt, 0.5, pan=0.6)
    tt += 0.75
tt, aralik = L(7), 0.85
while tt < C1 - 0.3:
    koy(kalp(), tt, 0.9)
    tt += aralik
    aralik = max(0.6, aralik * 0.97)
koy(cello(m("D3"), m("F3"), L(8) - L(7) + 1.0), L(7), 1.0, pan=-0.2)
koy(pad([hz(m(n)) for n in ("A4", "D5", "F5")], C1 - ka(8, "kâğıd"), 0.4, 0.1, 3000, tremolo=8), ka(8, "kâğıd"), 0.7, pan=0.2)
koy(bell(hz(m("A5")), 2.6), C1, 0.5)

# ---- D: itiraf (müzik kutusu, minörden majöre) satır 10 → 11
D0, D1 = L(10) - 0.2, L(11)
akorlar = [("D3", "F3", "A3"), ("A#2", "D3", "F3"), ("F3", "A3", "C4"), ("C3", "E3", "G3")]
ad = (D1 - D0) / len(akorlar)
for j, a in enumerate(akorlar):
    koy(pad([hz(m(n)) for n in a], ad + 0.5, 0.3, 0.4), D0 + j * ad, 0.8)
kutu = ["A5", "F5", "D5", "E5", "F5", "G5", "A5", "C6"]
for j, n in enumerate(kutu):
    koy(bell(hz(m(n)), 1.2), D0 + 0.1 + j * (D1 - D0) / len(kutu), 0.45, pan=0.25 * (-1) ** j)

# ---- E: huzur (sıcak majör) satır 11 → 12
E0, E1 = L(11), L(12)
koy(pad([hz(m(n)) for n in ("F3", "A3", "C4", "F4")], E1 - E0 + 0.6, 0.4, 0.6), E0, 0.9)
for j, n in enumerate(("F4", "A4", "C5", "F5", "C5", "A4", "C5", "F5")):
    koy(pluck(hz(m(n)), 0.6, 1.2), E0 + j * (E1 - E0) / 8, 0.4, pan=0.3 * (-1) ** j)
koy(bell(hz(m("C6"))), ka(11, "gülüms"), 0.4)

# ---- F: fabl (zıplayan kedi, komik iniş)
F0, F1 = L(12), L(13)
mundar = ka(12, "mundar")
koy(pad([hz(m(n)) for n in ("F3", "C4")], F1 - F0 + 0.4, 0.3, 0.4), F0, 0.5)
kedi0 = ka(12, "kedi")
tt, j = kedi0, 0
while tt < mundar - 0.35:
    koy(pluck(hz(m(("C5", "F5", "A5", "F5")[j % 4])), 0.3, 1.5), tt, 0.5, pan=0.4 * (-1) ** j)
    koy(pluck(hz(m("F3")), 0.3, 0.7), tt, 0.4)
    tt += np.pi / 4.2
    j += 1
koy(kayis(m("A4"), m("D4"), 0.6), mundar - 0.3, 0.8)
koy(pluck(hz(m("D3")), 0.5, 0.6), mundar + 0.35, 0.6)

# ---- G: soru (çözülmeyen sus2 akor)
G0 = L(13) - 0.1
koy(pad([hz(m(n)) for n in ("F3", "G3", "C4", "F4")], SURE - G0, 0.6, 1.4), G0, 0.8)
koy(bell(hz(m("C6")), 2.5), G0 + 0.3, 0.35)
koy(bell(hz(m("G5")), 2.5), G0 + 1.1, 0.25, pan=0.4)

# ---- yankı + konuşma anlarında kısma
ir_t = zaman(1.8)
ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 3.2)
ir = lp(ir, 5000) / np.sqrt(np.sum(ir ** 2))
islak = np.vstack([fftconvolve(mix[0], ir)[:N], fftconvolve(mix[1], np.roll(ir, 37))[:N]])
mix = mix * 0.8 + islak * 0.35

ses = np.zeros(N)
for k in K:
    ses[int(max(0, k["s"] - 0.08) * SR):int((k["e"] + 0.12) * SR)] = 1
egri = np.convolve(ses, np.ones(int(0.18 * SR)) / int(0.18 * SR), mode="same")
mix *= 1 - 0.55 * egri  # konuşurken müzik ~%45'e iner
son = np.minimum(1, (SURE - np.arange(N) / SR) / 1.2)
mix *= son
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89

cikti = KOK / "public/dedikodu/muzik.wav"
with wave.open(str(cikti), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())
print("muzik", round(SURE, 2), "sn ->", cikti)
