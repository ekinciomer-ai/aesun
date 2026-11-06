#!/usr/bin/env python3
"""Nükte Motoru — sahne durumuna göre uygun hazır cevap tekniğini ve örnek tavırları seçer,
Claude'a verilecek senaryo istemini hazırlar. Harici paket gerekmez.

Kullanım:
  python3 nukte_motoru.py sec  --durum guc_gosterisi --sahne "Sezar Kleopatra'ya pahalı hediye gösteriyor"
  python3 nukte_motoru.py ekle --dosya yeni_kayit.json
  python3 nukte_motoru.py liste
  python3 nukte_motoru.py akim --bolge ES            # akım → tarih eşlemeleri
  python3 nukte_motoru.py soz  --bolge TR            # günün tek fotoğraflık söz kartı
"""
import argparse, json, shutil, sys
from datetime import datetime
from pathlib import Path

KUTUPHANE = Path(__file__).with_name("nukte_kutuphanesi.json")

# Durum tipi -> tekniklerin ağırlığı (0-3). Kayıtlardaki gerçek kullanım da puana eklenir.
MATRIS = {
    "hakaret":       {"T1": 3, "T3": 3, "T7": 2, "T2": 1},
    "guc_gosterisi": {"T12": 3, "T7": 3, "T1": 1, "T11": 1},
    "sacma_talep":   {"T9": 3, "T4": 2, "T2": 2, "T8": 1},
    "suclama":       {"T8": 3, "T9": 2, "T4": 2, "T1": 1},
    "ovunme":        {"T1": 3, "T2": 2, "T5": 2, "T6": 1},
    "sinav":         {"T5": 3, "T4": 2, "T10": 2, "T7": 1},
    "yasak":         {"T2": 3, "T12": 2, "T4": 2, "T6": 1},
    "ikilem":        {"T4": 3, "T6": 2, "T9": 1},
    "dislanma":      {"T11": 3, "T2": 2, "T6": 1, "T12": 1},
}


def yukle():
    return json.loads(KUTUPHANE.read_text(encoding="utf-8"))


def sec(durum, sahne, adet=3):
    k = yukle()
    if durum not in k["durum_tipleri"]:
        sys.exit(f"Bilinmeyen durum. Seçenekler: {', '.join(k['durum_tipleri'])}")
    puan = dict(MATRIS.get(durum, {}))
    for r in k["kayitlar"]:
        if r["durum_tipi"] == durum:
            for t in r["teknikler"]:
                puan[t] = puan.get(t, 0) + 1
    secilen = sorted(puan, key=lambda t: -puan[t])[:adet]
    sonuc, kullanilan = [], set()
    for t in secilen:
        ornek = [r for r in k["kayitlar"] if t in r["teknikler"]]
        ornek.sort(key=lambda r: (r["id"] in kullanilan, r["durum_tipi"] != durum, r["telif"] != "kamu"))
        if ornek: kullanilan.add(ornek[0]["id"])
        sonuc.append({"teknik": t, **k["teknikler"][t], "puan": puan[t], "ornekler": ornek[:2]})
    return sonuc, istem_uret(sahne, durum, sonuc)


def istem_uret(sahne, durum, sonuc):
    satir = [f"SAHNE: {sahne}", f"DURUM TİPİ: {durum}", "Her teknik için 1 replik yaz (en fazla 15 kelime):"]
    for s in sonuc:
        o = s["ornekler"][0] if s["ornekler"] else None
        ref = f" | tavır örneği: {o['kisi']} — {o['tavir']} (iskelet: {o['iskelet']})" if o else ""
        satir.append(f"- {s['ad']}: {s['tarif']}{ref}")
    satir.append("Kurallar: birebir alıntı yok, kendi cümlen; kişiye ait diye gösterme; hakaret/küfür yok; hedef kitlenin kültürüne uygun.")
    return "\n".join(satir)


def akim(bolge, sorgu=None):
    """Bölgeye (TR/EN/ES) uygun akım → tarih eşlemeleri ve bağlı söz kartı."""
    k = yukle()
    kartlar = {s["id"]: s for s in k.get("soz_kartlari", [])}
    for a in k.get("akimlar", []):
        if bolge not in a["bolge"]: continue
        if sorgu and sorgu.lower() not in (a["akim"] + a["tarih"]).lower(): continue
        print(f"{a['id']} {a['akim']}\n   Bugün: {a['bugun']}\n   Tarih: {a['tarih']}\n   Açı:   {a['aci']}")
        s = kartlar.get(a.get("soz"))
        if s and s.get("soz"): print(f"   Kart:  {s['kisi']} — {s['soz']} ({s['kaynak']})")
        print()


def soz(bolge, gun=None):
    """Bölgeye göre günün söz kartı: gün numarasına göre döner, her kart sırayla gelir."""
    k = yukle()
    liste = [s for s in k.get("soz_kartlari", []) if bolge in s["bolge"] and s.get("soz")]
    if not liste: sys.exit("Bu bölge için kart yok")
    gun = gun if gun is not None else datetime.now().timetuple().tm_yday
    s = liste[gun % len(liste)]
    bag = next((a["aci"] for a in k.get("akimlar", []) if a.get("soz") == s["id"]), "")
    metin = s.get("metin", {}).get(bolge, s["soz"])
    yerel = "" if bolge == "TR" else " [taslak — hedef ülkeye göre yeniden yaz]"
    print(f"KART {s['id']} ({bolge})\nBaşlık (bugünle bağ): {bag or '—'}{yerel if bag else ''}\nSöz: {metin}")
    print(f"Alt satır: {s['kisi']} · {s['yil']} · {s['kaynak']}\nGörsel istemi: {s['gorsel']}, 4:5 ve 9:16, açık tema, canlı renk, yazısız\nDoğrulama: {s['dogrulama']}")
    if s.get("not_"): print(f"Not: {s['not_']}")


def ekle(dosya):
    yeni = json.loads(Path(dosya).read_text(encoding="utf-8"))
    yeni = yeni if isinstance(yeni, list) else [yeni]
    k = yukle()
    gerekli = {"id", "kisi", "telif", "durum_tipi", "durum", "tavir", "teknikler", "iskelet", "guven"}
    idler = {r["id"] for r in k["kayitlar"]}
    for r in yeni:
        eksik = gerekli - r.keys()
        if eksik: sys.exit(f"{r.get('id')} eksik alan: {eksik}")
        if r["id"] in idler: sys.exit(f"{r['id']} zaten var")
        if r["durum_tipi"] not in k["durum_tipleri"]: sys.exit(f"{r['id']} geçersiz durum_tipi")
        if any(t not in k["teknikler"] for t in r["teknikler"]): sys.exit(f"{r['id']} geçersiz teknik")
        if r["telif"] != "kamu" and len(r["iskelet"].split()) > 15:
            sys.exit(f"{r['id']} telifli kişi: iskelet 15 kelimeyi geçemez")
    yedek = KUTUPHANE.with_suffix(f".yedek-{datetime.now():%Y%m%d-%H%M%S}.json")
    shutil.copy2(KUTUPHANE, yedek)  # her eklemede otomatik yedek
    k["kayitlar"].extend(yeni)
    KUTUPHANE.write_text(json.dumps(k, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(yeni)} kayıt eklendi. Yedek: {yedek.name}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    alt = p.add_subparsers(dest="komut", required=True)
    s = alt.add_parser("sec"); s.add_argument("--durum", required=True); s.add_argument("--sahne", required=True); s.add_argument("--adet", type=int, default=3)
    e = alt.add_parser("ekle"); e.add_argument("--dosya", required=True)
    alt.add_parser("liste")
    ak = alt.add_parser("akim"); ak.add_argument("--bolge", default="TR", choices=["TR", "EN", "ES"]); ak.add_argument("--ara")
    sz = alt.add_parser("soz"); sz.add_argument("--bolge", default="TR", choices=["TR", "EN", "ES"]); sz.add_argument("--gun", type=int)
    a = p.parse_args()
    if a.komut == "akim": akim(a.bolge, a.ara); sys.exit()
    if a.komut == "soz": soz(a.bolge, a.gun); sys.exit()
    if a.komut == "sec":
        sonuc, istem = sec(a.durum, a.sahne, a.adet)
        for x in sonuc:
            print(f"[{x['teknik']}] {x['ad']} (puan {x['puan']}) — örnek: " + ", ".join(o["kisi"] for o in x["ornekler"]))
        print("\n--- CLAUDE İSTEMİ ---\n" + istem)
    elif a.komut == "ekle":
        ekle(a.dosya)
    else:
        k = yukle()
        for r in k["kayitlar"]:
            print(f"{r['id']:6} {r['kisi']:32} {r['durum_tipi']:14} {','.join(r['teknikler'])}")
