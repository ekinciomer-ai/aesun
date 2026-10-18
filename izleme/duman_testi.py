#!/usr/bin/env python3
"""Duman testi: izleme/uclar.json'daki uç noktaları dener. Kullanım: duman_testi.py [grup ...] [--json]
Çıkış kodu: 0 hepsi geçti, 1 en az biri kaldı. Yalnız standart kütüphane (GitHub Actions, ns1 ve Pi'de çalışır)."""
import json, os, ssl, sys, time, urllib.request, urllib.error
K = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "uclar.json")))
gruplar = [a for a in sys.argv[1:] if not a.startswith("--")]
ctx = ssl.create_default_context()
sonuc = []
for u in K["uclar"]:
    if gruplar and u["grup"] not in gruplar:
        continue
    t0 = time.time(); kod, govde, hata = None, "", None
    for deneme in range(2):                       # anlık ağ hıçkırığı yanlış alarm olmasın: bir kez daha dene
        try:
            r = urllib.request.urlopen(urllib.request.Request(u["url"] + ("&" if "?" in u["url"] else "?") + "_t=" + str(int(time.time())),
                                       headers={"User-Agent": "aesun-duman-testi"}), context=ctx, timeout=25)
            kod, govde = r.status, r.read(200000).decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            kod, govde = e.code, e.read(20000).decode("utf-8", "ignore")
        except Exception as e:
            hata = str(e)[:120]
        if kod in u["beklenen"] and (not u.get("icerir") or u["icerir"] in govde):
            break
        time.sleep(3)
    ok = kod in u["beklenen"] and (not u.get("icerir") or u["icerir"] in govde)
    neden = "" if ok else (hata or (f"kod {kod} (beklenen {u['beklenen']})" if kod not in u["beklenen"] else f"yanıtta '{u['icerir']}' yok"))
    sonuc.append({"ad": u["ad"], "grup": u["grup"], "ok": ok, "kod": kod, "ms": round((time.time() - t0) * 1000), "neden": neden})
if "--json" in sys.argv:
    print(json.dumps(sonuc, ensure_ascii=False))
else:
    for s in sonuc:
        print(("✓ " if s["ok"] else "✗ ") + f"{s['ad']}: {s['kod']} · {s['ms']} ms" + (f" — {s['neden']}" if s["neden"] else ""))
    k = [s for s in sonuc if not s["ok"]]
    if k:
        print("::error::Duman testi: " + "; ".join(f"{s['ad']} ({s['neden']})" for s in k))
sys.exit(1 if any(not s["ok"] for s in sonuc) else 0)
