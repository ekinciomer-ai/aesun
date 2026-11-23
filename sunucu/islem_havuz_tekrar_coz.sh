#!/bin/bash
# Yükleme Yöneticisi: aynı videonun iki kez teslim edilmiş kopyalarını arşivler (aynı başlık/kart, yalnız kod farklı),
# asıl sürümü yeniden kontrol edip Ömer onayıyla (22.11 18:33 "bekleyen iş kalmasın") onaylar;
# seri düzeyinde ortak "konu" anahtarı yüzünden takılan farklı başlıklı videoya kendi başlığını konu yapar. Kartlar satır satır (KART:).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import importlib.util, json, re, io, contextlib
spec = importlib.util.spec_from_file_location("yon", "/opt/aesun/havuz/yonetici.py"); Y = importlib.util.module_from_spec(spec); spec.loader.exec_module(Y)
NOT = "Ömer 22.11 18:33: bekleyen iş kalmasın"
KOPYA = {"KZ_MRK_01_GUNES": "KZ_MRK_01_GUNES2", "KZ_MRK_01_GUNES3": "KZ_MRK_01_GUNES2", "KZ_MRK_02_PANEL": "KZ_MRK_02_PANEL2",
         "KZ_MRK_03_AY2": "KZ_MRK_03_AY", "KZ_MRK_04_TURBIN2": "KZ_MRK_04_TURBIN"}
idx = Y.yukle()
for kopya, asil in KOPYA.items():
    a, b = idx.get(kopya), idx.get(asil)
    if not a or not b or a.get("durum") != "kontrol_hatasi":
        print(f"NOT: {kopya}: atlandı ({a and a.get('durum')})"); continue
    if a["kart"].get("baslik") != b["kart"].get("baslik"):
        print(f"NOT: {kopya}: başlık farklı, arşivlenmedi"); continue
    a["durum"] = "arsiv"; Y.olay(a, f"aynı videonun ikinci teslimi; asıl: {asil} (Ömer 22.11)")
    print(f"NOT: {kopya}: arşivlendi (asıl {asil})")
Y.kaydet(idx)
# konu çakışması: farklı başlıklı videolar ortak seri konusu yüzünden takılıyorsa kendi başlığı konu olur
idx = Y.yukle()
for kod, it in idx.items():
    if it.get("durum") == "kontrol_hatasi" and it.get("kontrol", {}).get("engel") and all(e.startswith("14 gün içinde aynı konu") for e in it["kontrol"]["engel"]):
        diger = [e.split(": ", 1)[1] for e in it["kontrol"]["engel"]]
        bas = it["kart"].get("baslik", "")
        if all(idx.get(d, {}).get("kart", {}).get("baslik") != bas for d in diger):
            print(f"NOT: {kod}: konu '{it['kart'].get('konu')}' ortak; başlıklar farklı → konu=başlık")
            it["kart"]["konu"] = bas
Y.kaydet(idx)
# yeniden kontrol: engeli yalnız konu tekrarı olanlar
idx = Y.yukle()
for kod, it in sorted(idx.items()):
    if it.get("durum") in ("kontrol_hatasi", "onay_bekliyor") and not it["kart"].get("bekletme"):
        eng = it.get("kontrol", {}).get("engel", [])
        if eng and not all(e.startswith("14 gün içinde aynı konu") for e in eng):
            print(f"NOT: {kod}: başka engel var, dokunulmadı: {'; '.join(eng)[:120]}"); continue
        engel, uyari, kk = Y.kontrol(it["kart"], it["dosya"], idx)
        it["kontrol"] = {"engel": engel, "uyari": uyari, "olcum": kk.get("olcum", {})}
        it["durum"] = "kontrol_hatasi" if engel else "onay_bekliyor"
        Y.olay(it, "yeniden kontrol: " + ("engel: " + "; ".join(engel) if engel else "geçti"))
        print(f"NOT: {kod}: yeniden kontrol → {it['durum']}" + (f" · {'; '.join(engel)[:150]}" if engel else ""))
Y.kaydet(idx)
with contextlib.redirect_stdout(io.StringIO()): Y.planla(sessiz=True)
idx = Y.yukle()
for kod, it in sorted(idx.items()):
    if it.get("durum") == "onay_bekliyor" and not it["kart"].get("bekletme"):
        Y.onay(kod, "evet", NOT)
buf = io.StringIO()
with contextlib.redirect_stdout(buf): Y.yonlendir()
t = buf.getvalue()
for l in t.splitlines():
    if l.startswith("NOT:"): print(l)
m = re.search(r"===YONLENDIR===\n(.*?)\n===SON===", t, re.S)
for c in (json.loads(m.group(1)) if m else []):
    print("KART:", json.dumps(c, ensure_ascii=False))
from collections import Counter
idx = Y.yukle()
print("NOT: durum özeti:", dict(Counter(it.get("durum") for it in idx.values())))
for kod, it in sorted(idx.items()):
    if it.get("durum") in ("onay_bekliyor", "kontrol_hatasi", "onaylandi"):
        print("BEKLEYEN:", kod, "|", it["durum"], "|", (it["kart"].get("bekletme") or "")[:70], "|", "; ".join(it.get("kontrol", {}).get("engel", []))[:150], "|", it.get("kilit") or "")
PY
