"""Tek istekte okunmuş seslendirmeyi parçalara böler (kota dostu yöntem).

Neden: Gemini TTS ücretsiz katmanında her istek günlük kotadan düşer. Bir videonun
bütün parçaları tek istekte (parçalar arasında boş satır) okutulur, sonra bu araçla
parça sınırlarındaki sessizliklerden kesilir.

Metin: parçalar tek metinde "[long pause]" ile ayrılır (Gemini TTS duraklama etiketi).

Kullanım:
  python3 ses_bol.py <birlesik.mp3|wav> <vo.json> <cikis_klasoru> [parca_adlari virgüllü]
  vo.json: [{"ad":"V2","metin":"..."}, ...]  (okuma sırasıyla)
Çıktı: <cikis_klasoru>/<ad>.wav (44.1 kHz mono)
"""
import json, re, subprocess, sys

def sessizlikler(dosya, esik="-38dB", en_az=0.30):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", dosya, "-af", f"silencedetect=noise={esik}:d={en_az}", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    bas = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r)]
    son = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r)]
    return [(a, b) for a, b in zip(bas, son)]

def sure(dosya):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dosya]))

def bol(dosya, parcalar, cikis, isaretli=True):
    """isaretli=True: parçalar arasına metinde [long pause] konduysa en uzun K sessizlik sınırdır (güvenilir yol)."""
    T = sure(dosya); S = [(a, b) for a, b in sessizlikler(dosya) if a > .2 and b < T - .2]  # baş/son sessizlik sayılmaz
    K = len(parcalar) - 1
    uzun = sorted(sorted(S, key=lambda x: -(x[1] - x[0]))[:K]) if isaretli else []
    if isaretli and len(uzun) == K and all(b - a >= 0.9 for a, b in uzun):
        sinirlar = [(a + b) / 2 for a, b in uzun]
        return kes(dosya, parcalar, cikis, T, sinirlar)
    print("NOT: belirgin uzun duraklama bulunamadı, karakter oranıyla tahmini bölünüyor (kontrol et)")
    uz = [len(p["metin"]) for p in parcalar]; top = sum(uz)
    # beklenen sınırlar (karakter oranı) + sıralı dinamik seçim: uzun sessizlik iyi, beklenenden uzaklık ceza
    K = len(parcalar) - 1; bek = []; birikim = 0
    for i in range(K): birikim += uz[i]; bek.append(T * birikim / top)
    orta = [((a + b) / 2, b - a) for a, b in S]
    NEG = -1e9; n = len(orta)
    puan = lambda k, j: orta[j][1] * 3.0 - abs(orta[j][0] - bek[k]) / (T * 0.06)
    dp = [[NEG] * n for _ in range(K)]; geri = [[-1] * n for _ in range(K)]
    for j in range(n): dp[0][j] = puan(0, j)
    for k in range(1, K):
        for j in range(n):
            en, ej = NEG, -1
            for i in range(j):
                if dp[k-1][i] > en: en, ej = dp[k-1][i], i
            if ej >= 0: dp[k][j] = en + puan(k, j); geri[k][j] = ej
    j = max(range(n), key=lambda x: dp[K-1][x]); sec = []
    for k in range(K - 1, -1, -1): sec.append(j); j = geri[k][j]
    sinirlar = [orta[j][0] for j in reversed(sec)]
    return kes(dosya, parcalar, cikis, T, sinirlar)

def kes(dosya, parcalar, cikis, T, sinirlar):
    import numpy as np, wave
    noktalar = [0.0] + sorted(sinirlar) + [T]
    ham = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", dosya, "-f", "s16le", "-ac", "1", "-ar", "44100", "-"]), np.int16)
    for i, p in enumerate(parcalar):
        x = ham[int(noktalar[i] * 44100):int(noktalar[i + 1] * 44100)]
        aktif = np.flatnonzero(np.abs(x) > 32768 * 10 ** (-45 / 20))
        if len(aktif): x = x[max(0, aktif[0] - 441):aktif[-1] + 441]   # 10 ms pay
        with wave.open(f"{cikis}/{p['ad']}.wav", "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100); w.writeframes(x.tobytes())
        print(p["ad"], f"{noktalar[i]:.2f}-{noktalar[i+1]:.2f}", f"{len(x)/44100:.2f}s")

if __name__ == "__main__":
    vo = json.load(open(sys.argv[2]))
    if len(sys.argv) > 4:
        secim = sys.argv[4].split(","); vo = [p for p in vo if p["ad"] in secim]
    bol(sys.argv[1], vo, sys.argv[3])
