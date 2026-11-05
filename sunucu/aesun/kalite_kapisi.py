#!/usr/bin/env python3
"""Yayın öncesi kalite kapısı (ffmpeg/ffprobe). Kullanım: kalite_kapisi.py <video.mp4> [kayit.json]
Çıktı: JSON {"gecti": bool, "engel": [...], "uyari": [...], "olcum": {...}}; çıkış kodu 0 = geçti, 1 = engellendi.
Engel (yayın durur): çözünürlük düşük, ses yok, süre yok, siyah kare çok, ses seviyesi çok düşük/yüksek.
Uyarı (yayın sürer, rapora girer): renk soluk, yapay zekâ beyanı ya da kaynak/lisans bilgisi eksik."""
import json, re, subprocess, sys


def calis(*a, sure=600):
    return subprocess.run(a, capture_output=True, text=True, timeout=sure)


def olc(yol):
    p = json.loads(calis("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", yol).stdout or "{}")
    v = next((s for s in p.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in p.get("streams", []) if s.get("codec_type") == "audio"), None)
    o = {"genislik": int(v.get("width") or 0), "yukseklik": int(v.get("height") or 0),
         "sure_sn": round(float(p.get("format", {}).get("duration") or 0), 1), "ses": a is not None}
    if o["sure_sn"] <= 0:
        return o
    # siyah kare oranı + renk doygunluğu (saniyede 2 kare örneklenir)
    r = calis("ffmpeg", "-hide_banner", "-nostats", "-i", yol, "-vf", "fps=2,blackdetect=d=0.5:pix_th=0.10,signalstats,metadata=print:key=lavfi.signalstats.SATAVG",
              "-an", "-f", "null", "-")
    siyah = sum(float(x) for x in re.findall(r"black_duration:([\d.]+)", r.stderr))
    sat = [float(x) for x in re.findall(r"SATAVG=([\d.]+)", r.stdout + r.stderr)]
    o["siyah_oran"] = round(siyah / o["sure_sn"], 3)
    o["doygunluk_ort"] = round(sum(sat) / len(sat), 1) if sat else None
    if a is not None:
        r = calis("ffmpeg", "-hide_banner", "-nostats", "-i", yol, "-af", "ebur128", "-vn", "-f", "null", "-")
        m = re.findall(r"I:\s*(-?[\d.]+) LUFS", r.stderr)
        o["ses_lufs"] = float(m[-1]) if m else None
    return o


def degerlendir(o, kayit):
    engel, uyari = [], []
    kisa = min(o["genislik"], o["yukseklik"])
    if kisa < 1080:
        engel.append(f"çözünürlük düşük ({o['genislik']}x{o['yukseklik']}; en az 1080p)")
    if o["sure_sn"] <= 0:
        engel.append("video süresi okunamadı")
    if not o["ses"]:
        engel.append("ses yok")
    if o.get("siyah_oran", 0) > 0.15:
        engel.append(f"siyah kare oranı yüksek (%{round(o['siyah_oran']*100)})")
    l = o.get("ses_lufs")
    if l is not None and not (-24 <= l <= -9):
        engel.append(f"ses seviyesi uygun değil ({l} LUFS; -24 ile -9 arası olmalı)")
    d = o.get("doygunluk_ort")
    if d is not None and d < 18:
        uyari.append(f"renkler soluk görünüyor (doygunluk {d})")
    if kayit is not None:
        if "sentetik" not in kayit:
            uyari.append("yapay zekâ beyanı (sentetik) belirtilmemiş")
        if not (kayit.get("kaynaklar") or kayit.get("muzik_lisans")):
            uyari.append("görsel kaynakları / müzik lisansı kaydı yok")
    return engel, uyari


if __name__ == "__main__":
    yol = sys.argv[1]
    kayit = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else None
    try:
        o = olc(yol)
        engel, uyari = degerlendir(o, kayit)
    except Exception as e:
        o, engel, uyari = {}, [f"ölçüm yapılamadı: {type(e).__name__}"], []
    print(json.dumps({"gecti": not engel, "engel": engel, "uyari": uyari, "olcum": o}, ensure_ascii=False))
    sys.exit(0 if not engel else 1)
