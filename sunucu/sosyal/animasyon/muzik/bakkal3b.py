#!/usr/bin/env python3
"""Pumpkin Bakkal (Masal Bebek 3B) için özgün müzik: tamamen kodla sentezlenir (sample/kayıt yok) → telif ve lisans sorunu yok.
Zamanlar kelimeler.json'dan alınır; metin/ses değişirse müzik kendiliğinden hizalanır.
Çıktı: public/bakkal/muzik3b.wav (44.1 kHz stereo). Konuşma anlarında müzik kısılır (ducking)."""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
KOK = Path(__file__).resolve().parent.parent
K = json.load(open(KOK / "public/bakkal/kelimeler.json", encoding="utf-8"))
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


# ---- yağmur (bütün video, bakkalda kısılır)
yagmur = lp(hp(rng.normal(0, 1, N), 400), 6000)
yagmur *= 0.05 * (1 - 0.6 * np.clip((np.arange(N) / SR - L(9)) / 1.5, 0, 1))
mix[0] += yagmur
mix[1] += np.roll(yagmur, 911)

# ---- A: açılış (meraklı, hafif hüzünlü) 0 → satır 2
BEAT = 0.55
t, i = 0.0, 0
ezgi = ["B3", "E4", "G4", "F#4", "E4", "D4", "E4", "B3"]
while t < L(2) - 0.2:
    koy(pluck(hz(m(["E2", "B2"][i % 2])), 0.5, 0.6), t, 0.8)
    koy(pluck(hz(m(ezgi[i % len(ezgi)])), 0.5), t + BEAT / 2, 0.5, pan=0.3)
    t += BEAT
    i += 1
koy(pad([hz(m(n)) for n in ("E3", "G3", "B3")], L(2) - L(1) + 0.4, 0.8, 0.5), L(1), 0.6)

# ---- B: sabah (müzik kutusu, gün doğumu)
B0, B1 = L(2) - 0.1, L(3)
koy(pad([hz(m(n)) for n in ("G3", "B3", "D4")], B1 - B0 + 0.4, 0.6, 0.5), B0, 0.7)
for j, n in enumerate(("G5", "B5", "D6", "B5", "G5", "A5", "B5", "D6")):
    koy(bell(hz(m(n)), 1.2), B0 + 0.1 + j * (B1 - B0) / 8, 0.4, pan=0.25 * (-1) ** j)

# ---- C: marketler (tekdüze motif + her "market"te komik iniş)
C0, C1 = L(3), L(6)
t, i = C0, 0
while t < C1 - 0.1:
    koy(pluck(hz(m(("D4", "D4", "A3", "D4")[i % 4])), 0.25, 1.2), t, 0.45, pan=0.2)
    koy(tik(), t, 0.3, pan=-0.4)
    t += 0.4
    i += 1
for c in (3, 4, 5):
    koy(kayis(m("A4"), m("E4"), 0.45), ka(c, "market") + 0.1, 0.5)
koy(pad([hz(m(n)) for n in ("D3", "F3", "A3")], C1 - ka(5, "hepsi") + 0.3, 0.3, 0.3), ka(5, "hepsi"), 0.5)

# ---- D: yokuş ve merdiven (yükselen, sonra inen basamaklar)
D0, D1 = L(6), L(7)
basamak = ["E3", "G3", "A3", "B3", "D4", "E4", "D4", "B3", "A3", "G3", "E3"]
for j, n in enumerate(basamak):
    tt = D0 + j * (D1 - D0 - 0.2) / len(basamak)
    koy(pluck(hz(m(n)), 0.4, 1.0), tt, 0.6, pan=0.3 * (-1) ** j)
    koy(pluck(hz(m("E2")), 0.3, 0.6), tt, 0.4)

# ---- E: vazgeçme anı (tek hüzünlü ton) → F: tabela (parıltı + çan)
koy(pad([hz(m(n)) for n in ("E3", "B3")], L(8) - L(7) + 0.2, 0.4, 0.3), L(7) - 0.1, 0.6)
koy(cello(m("E3"), m("D3"), L(8) - L(7)), L(7), 0.6)
tabela = ka(8, "bakkal")
for j, n in enumerate(("G4", "B4", "D5", "G5", "B5")):
    koy(bell(hz(m(n)), 1.4), L(8) + j * (tabela - L(8)) / 5, 0.3, pan=0.3 * (-1) ** j)
koy(bell(hz(m("G6")), 2.2), tabela, 0.6)

# ---- G: bakkal ve ders (sıcak majör)
G0, G1 = L(9) - 0.1, L(12)
akorlar = [("G3", "B3", "D4"), ("C3", "E3", "G3"), ("D3", "F#3", "A3"), ("G3", "B3", "D4")]
ad = (G1 - G0) / len(akorlar)
for j, a in enumerate(akorlar):
    koy(pad([hz(m(n)) for n in a], ad + 0.6, 0.5, 0.5), G0 + j * ad, 0.8)
ezgi2 = ["D5", "B4", "G4", "A4", "B4", "D5", "E5", "D5", "B4", "A4", "G4", "B4"]
for j, n in enumerate(ezgi2):
    koy(pluck(hz(m(n)), 0.7, 1.2), G0 + 0.2 + j * (G1 - G0) / len(ezgi2), 0.45, pan=0.25 * (-1) ** j)
koy(bell(hz(m("D6"))), ka(10, "sakız"), 0.4)

# ---- H: soru (çözülmeyen sus2)
H0 = L(12) - 0.1
koy(pad([hz(m(n)) for n in ("G3", "A3", "D4", "G4")], SURE - H0, 0.6, 1.4), H0, 0.8)
koy(bell(hz(m("D6")), 2.5), H0 + 0.3, 0.35)

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

cikti = KOK / "public/bakkal/muzik3b.wav"
with wave.open(str(cikti), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())
print("muzik", round(SURE, 2), "sn ->", cikti)
