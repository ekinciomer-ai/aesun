#!/bin/bash
# Yükleme Yöneticisi: Ömer 22.11 19:32 "yayınla ya da sıraya al" — bekletilen son 4 işi açar:
# Albastı ve Vecihi (2) bekletmesi kalkar; Vecihi kartları ekran yazısı tasarım gereği (Ömer'in 14.11 istisnası) işaretlenip yeniden kontrol edilir;
# Boğaz 1621 kar tetiği beklemeden ilk uygun saate alınır. Hepsi onaylanır, kuyruk kartları satır satır (KART:).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import importlib.util, json, re, io, contextlib
spec = importlib.util.spec_from_file_location("yon", "/opt/aesun/havuz/yonetici.py"); Y = importlib.util.module_from_spec(spec); spec.loader.exec_module(Y)
NOT = "Ömer 22.11 19:32: yayınla ya da sıraya al"
for kod in ("AS_HB_ALBASTI", "AS_GT_VECIHI_IZINSIZ", "AS_GT_VECIHI_NARGIN"):
    Y.beklet(kod, "kaldir")
idx = Y.yukle()
for kod in ("AS_GT_VECIHI_IZINSIZ", "AS_GT_VECIHI_NARGIN"):
    it = idx.get(kod)
    if not it: print(f"NOT: {kod} yok"); continue
    print(f"NOT: {kod}: seri={it['kart'].get('seri')} · önceki engel: {'; '.join(it['kontrol']['engel'])[:120]}")
    it["kart"]["ekran_yazisi"] = "tasarim"
    engel, uyari, kk = Y.kontrol(it["kart"], it["dosya"], idx)
    it["kontrol"] = {"engel": engel, "uyari": uyari, "olcum": kk.get("olcum", {})}
    it["durum"] = "kontrol_hatasi" if engel else "onay_bekliyor"
    Y.olay(it, "Ömer onayı: ekran yazısı tasarım gereği; yeniden kontrol: " + ("engel: " + "; ".join(engel) if engel else "geçti"))
    print(f"NOT: {kod}: yeniden kontrol → {it['durum']}" + (f" · {'; '.join(engel)[:150]}" if engel else ""))
Y.kaydet(idx)
idx = Y.yukle()
if idx.get("AS_GT_BOGAZ1621", {}).get("durum") == "onay_bekliyor":
    Y.tetik_onay("AS_GT_BOGAZ1621", NOT + " (kar beklenmeden)")
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
