#!/usr/bin/env python3
"""n8n yönetim aracı: aktif AEGündem / AEMonitoring iş akışlarında eksik olan hata yakalayıcıyı (QQkA9MHLmFtH6FYx) bağlar.
Eski 5 iş akışına kesinlikle dokunulmaz. Sır yazdırmaz."""
import json, os, sys, urllib.error, urllib.request

KOK = os.environ.get("N8N_URL", "https://xbay.app.n8n.cloud").rstrip("/") + "/api/v1"
ANAHTAR = os.environ.get("N8N_ANAHTAR", "").strip()
HATA_AKISI = "QQkA9MHLmFtH6FYx"
DOKUNMA = {"mGUBazyZw83HLiQG", "wMuIzwWRebIRngsg", "i783dL0YIX2xE0EL", "v8WZV9rcADpvp9zT", "3gaBo1YnRgSQ2Djp", HATA_AKISI}

if not ANAHTAR:
    sys.exit("::error::N8N_ANAHTAR sırrı tanımlı değil")


def istek(metot, yol, veri=None):
    bas = {"X-N8N-API-KEY": ANAHTAR, "Accept": "application/json", "User-Agent": "aesun-n8n"}
    govde = None
    if veri is not None:
        bas["Content-Type"] = "application/json"
        govde = json.dumps(veri, ensure_ascii=False).encode("utf-8")
    r = urllib.request.Request(f"{KOK}/{yol.lstrip('/')}", data=govde, headers=bas, method=metot)
    try:
        with urllib.request.urlopen(r, timeout=30) as y:
            return json.loads(y.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        h = e.read().decode("utf-8", "ignore")[:300]
        raise RuntimeError(f"HTTP {e.code} ({metot} {yol}): {h}")


def main():
    mod = sys.argv[1] if len(sys.argv) > 1 else "hata_yakalayici"
    wfs = istek("GET", "workflows?limit=250").get("data") or []
    print(f"::notice::Toplam {len(wfs)} iş akışı bulundu.")
    eksik, tamam = [], []
    for w in wfs:
        wid, ad, aktif = w.get("id"), w.get("name", ""), bool(w.get("active"))
        if wid in DOKUNMA or not aktif:
            continue
        ayar = w.get("settings") or {}
        hy = ayar.get("errorWorkflow") or ""
        if hy:
            tamam.append(f"{ad} ({wid}) -> {hy}")
        elif ad.startswith("AEGündem") or ad.startswith("AEMonitoring"):
            eksik.append((wid, ad))
    print(f"::notice::Aktif akışlarda hata yakalayıcı: {len(tamam)} bağlı, {len(eksik)} eksik")
    if mod == "listele" or not eksik:
        for wid, ad in eksik:
            print(f"  eksik: {ad} ({wid})")
        return

    baglanan = []
    for wid, ad in eksik:
        det = istek("GET", f"workflows/{wid}")
        ayar = dict(det.get("settings") or {})
        ayar["errorWorkflow"] = HATA_AKISI
        yuk = {
            "name": det["name"],
            "nodes": det["nodes"],
            "connections": det["connections"],
            "settings": ayar,
        }
        if det.get("staticData") is not None:
            yuk["staticData"] = det["staticData"]
        istek("PUT", f"workflows/{wid}", yuk)
        baglanan.append(f"{ad} ({wid})")
        print(f"✓ Bağlandı: {ad} ({wid}) -> {HATA_AKISI}")
    print(f"::notice::{len(baglanan)} akışa hata yakalayıcı bağlandı: " + ", ".join(baglanan))


if __name__ == "__main__":
    main()
