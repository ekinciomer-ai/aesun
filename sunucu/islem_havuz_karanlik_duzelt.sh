#!/bin/bash
# Yükleme Yöneticisi: ilk karesi karanlık (siyah açılışlı) Shorts'ları düzeltir, yeniden kontrol eder,
# Ömer onayıyla (22.11 18:33 "düzelt ve sorunu gider, bekleyen iş kalmasın") onaylar ve kuyruğa yönlendirir.
# Düzeltme: açılıştaki karanlık kareler, videonun ilk aydınlık karesiyle değiştirilir (süre ve ses aynen kalır).
# Orijinal video /opt/aesun/havuz/video/yedek/<kod>.orj.mp4 olarak saklanır (geri alınabilir).
# Kuyruk kartları günlükte kaybolmasın diye satır satır "KART: <json>" olarak yazılır.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import importlib.util, json, os, re, shutil, subprocess, sys, io, contextlib
spec = importlib.util.spec_from_file_location("yon", "/opt/aesun/havuz/yonetici.py"); Y = importlib.util.module_from_spec(spec); spec.loader.exec_module(Y)
NOT = "Ömer 22.11 18:33: ilk kare karanlığı düzeltildi, onaylandı"

def calis(*a, t=600):
    return subprocess.run(list(a), capture_output=True, text=True, timeout=t)

def kareler(yol, sn=3.0):
    r = calis("ffmpeg", "-hide_banner", "-nostats", "-t", str(sn), "-i", yol, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-an", "-f", "null", "-")
    return [float(x) for x in re.findall(r"YAVG=([\d.]+)", r.stdout + r.stderr)]

def duzelt(kod, yol):
    ys = kareler(yol)
    if not ys: return f"ölçülemedi"
    if ys[0] >= 22: return f"zaten aydınlık ({ys[0]})"
    i = next((n for n, y in enumerate(ys) if y >= 45), None)
    if i is None: i = max(range(len(ys)), key=lambda n: ys[n])
    os.makedirs(f"{Y.KOK}/video/yedek", exist_ok=True)
    yedek = f"{Y.KOK}/video/yedek/{kod}.orj.mp4"
    if not os.path.exists(yedek): shutil.copy2(yol, yedek)
    ek = ",eq=brightness=0.06:gamma=1.35:enable='lt(t,1.2)'" if ys[i] < 35 else ""
    if i == 0:
        fc = f"[0:v]format=yuv420p{ek}[v]"
    else:
        fc = (f"[0:v]split=2[a][b];[b]trim=start_frame={i}:end_frame={i+1},setpts=PTS-STARTPTS,loop=loop={i-1}:size=1:start=0,setpts=N/(FRAME_RATE*TB)[f];"
              f"[a]trim=start_frame={i},setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1:a=0,format=yuv420p{ek}[v]")
    gecici = f"/tmp/{kod}.duz.mp4"
    r = calis("ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", yedek, "-filter_complex", fc, "-map", "[v]", "-map", "0:a?",
              "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "copy", "-movflags", "+faststart", gecici, t=900)
    if r.returncode != 0 or not os.path.exists(gecici):
        return "HATA ffmpeg: " + (r.stderr or "")[-150:]
    d0 = float(calis("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", yedek).stdout or 0)
    d1 = float(calis("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", gecici).stdout or 0)
    if abs(d0 - d1) > 0.3:
        os.remove(gecici); return f"HATA süre değişti ({d0}->{d1}), uygulanmadı"
    shutil.move(gecici, yol)
    return f"düzeltildi: ilk {i} kare → kare #{i} (YAVG {ys[0]}→{kareler(yol, 0.1)[0] if kareler(yol, 0.1) else '?'})"

idx = Y.yukle()
# 0) bekleyen her işin durumu
for kod, it in sorted(idx.items()):
    if it.get("durum") in ("onay_bekliyor", "kontrol_hatasi", "onaylandi"):
        k = it.get("kart", {}); ko = it.get("kontrol", {})
        print("BEKLEYEN:", kod, "|", it["durum"], "|", (k.get("bekletme") or "")[:60], "|", "; ".join(ko.get("engel", []))[:200], "|", it.get("kilit") or "")

# 1) karanlık açılışlı Short'ları düzelt + yeniden kontrol
hedef = [kod for kod, it in idx.items() if it.get("durum") in ("onay_bekliyor", "onaylandi")
         and not it.get("kart", {}).get("bekletme")
         and any("ilk karesi çok karanlık" in u for u in it.get("kontrol", {}).get("uyari", []))]
for kod in sorted(hedef):
    idx = Y.yukle(); it = idx[kod]
    sonuc = duzelt(kod, it["dosya"])
    print(f"NOT: {kod}: {sonuc}")
    if sonuc.startswith("düzeltildi"):
        engel, uyari, kk = Y.kontrol(it["kart"], it["dosya"], {a: b for a, b in idx.items() if a != kod})
        it.update(sha256=Y.sha(it["dosya"]), boyut=os.path.getsize(it["dosya"]), kontrol={"engel": engel, "uyari": uyari, "olcum": kk.get("olcum", {})})
        Y.olay(it, "ilk kare karanlığı düzeltildi (orijinal yedekte) · yeniden kontrol: " + ("engel: " + "; ".join(engel) if engel else "geçti"))
        if engel and it["durum"] == "onay_bekliyor": it["durum"] = "kontrol_hatasi"
        idx[kod] = it; Y.kaydet(idx)
        kal = [u for u in uyari if "karanlık" in u]
        print(f"NOT: {kod}: yeniden kontrol · engel={len(engel)} · karanlık uyarısı {'SÜRÜYOR' if kal else 'yok'}")

# 2) plan + onay (yalnız düzeltilip engelsiz kalanlar)
with contextlib.redirect_stdout(io.StringIO()): Y.planla(sessiz=True)
idx = Y.yukle()
for kod in sorted(hedef):
    it = idx[kod]
    if it["durum"] == "onay_bekliyor" and not it["kontrol"]["engel"]:
        Y.onay(kod, "evet", NOT)

# 3) yönlendir, kartları satır satır yaz
buf = io.StringIO()
with contextlib.redirect_stdout(buf): Y.yonlendir()
t = buf.getvalue()
for l in t.splitlines():
    if l.startswith("NOT:"): print(l)
m = re.search(r"===YONLENDIR===\n(.*?)\n===SON===", t, re.S)
for c in (json.loads(m.group(1)) if m else []):
    print("KART:", json.dumps(c, ensure_ascii=False))
idx = Y.yukle()
from collections import Counter
print("NOT: durum özeti:", dict(Counter(it.get("durum") for it in idx.values())))
PY
