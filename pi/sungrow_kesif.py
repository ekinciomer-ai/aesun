#!/usr/bin/env python3
"""Sungrow keşif: bir santralin (varsayılan Anka, 5038906) cihazlarından okunabilen TÜM ölçüm noktalarını çıkarır.

- Cihaz listesi (tür, ad, model, iletişim/arıza durumu; seri no yalnız son 4 hane)
- Nokta adları: /openapi/getOpenPointInfo (destekleniyorsa)
- Nokta tarama: her cihaz türünden/modelden bir örnekte p1..p999 (santralde p83001..p83300) gerçek zamanlı okunur,
  değer dönenler listelenir; bulunan noktalar tüm inverterlerde bir kez okunur
- 5 dk geçmiş veri erişimi denemesi (getDevicePointMinuteDataList)
Çıktı: epias-ptf/inverter/sungrow_kesif_<ps>.json. saha_inverter.py sürüm işareti yoksa bir kez çağırır.
Elle:  python3 ~/aesun/pi/sungrow_kesif.py [ps_id]
"""
import json, sys, time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "toplayicilar"))
from ortak import TR, gh, log  # noqa: E402

SURUM = 1


def _maske(sn):
    sn = str(sn or "")
    return ("…" + sn[-4:]) if len(sn) > 4 else sn


def tara(cli, S, tur, key, araliklar, paket=100):
    bulunan = {}
    for bas, son in araliklar:
        for i in range(bas, son + 1, paket):
            ids = [str(x) for x in range(i, min(i + paket, son + 1))]
            try:
                rows = cli.realtime(tur, [key], ids)
            except Exception as e:
                bulunan.setdefault("_hata", []).append(f"{ids[0]}-{ids[-1]}: {str(e)[:80]}")
                continue
            for r in rows:
                p = r.get("device_point", r)
                for k, v in p.items():
                    if k.startswith("p") and k[1:].isdigit() and v not in (None, "", "--"):
                        bulunan[k] = v
            time.sleep(0.3)
    return bulunan


def nokta_adlari(cli, tur):
    for govde in ({"device_type": tur, "type": "2", "curPage": 1, "size": 999},
                  {"device_type": tur, "type": "1", "curPage": 1, "size": 999},
                  {"device_type": tur, "curPage": 1, "size": 999}):
        try:
            rd = cli.call("/openapi/getOpenPointInfo", govde)
            l = rd.get("pageList") or rd.get("point_list") or rd.get("list") or []
            if l:
                return {("p" + str(x.get("point_id"))): {"ad": x.get("point_name"), "birim": x.get("storage_unit") or x.get("point_unit"),
                                                          "periyot": x.get("point_cal_type") or x.get("period")} for x in l}, govde
        except Exception as e:
            hata = str(e)[:120]
    return {}, {"hata": locals().get("hata")}


def main(ps="5038906"):
    import sungrow_collector as S
    cli = S.SungrowClient()
    simdi = datetime.now(TR)
    out = {"ps_id": ps, "olusturma": simdi.isoformat(timespec="seconds"), "surum": SURUM, "cihazlar": [], "turler": {}}
    cihaz = cli.devices(ps)
    for d in cihaz:
        out["cihazlar"].append({"ps_key": d.get("ps_key"), "tur": d.get("device_type"), "tur_ad": d.get("type_name"),
                                "ad": d.get("device_name"), "model": d.get("device_model_code") or d.get("device_model"),
                                "sn": _maske(d.get("device_sn")), "iletisim": d.get("dev_status"),
                                "ariza": d.get("dev_fault_status"), "alanlar": sorted(d.keys())})
    # tür / model başına bir örnek
    ornek = {}
    for d in cihaz:
        t = int(d.get("device_type") or 0)
        m = d.get("device_model_code") or d.get("device_model") or "?"
        if d.get("ps_key") and str(d.get("dev_status")) != "0":
            ornek.setdefault((t, m), d["ps_key"])
    ornek.setdefault((11, "santral"), f"{ps}_11_0_0")
    for (t, m), key in ornek.items():
        ad, govde = nokta_adlari(cli, t)
        ara = [(83001, 83300)] if t == 11 else [(1, 999)]
        deger = tara(cli, S, t, key, ara)
        out["turler"][f"{t}|{m}"] = {"ornek": key, "nokta_sayisi": len([k for k in deger if k != "_hata"]),
                                     "noktalar": {k: {"deger": v, **(ad.get(k) or {})} for k, v in sorted(deger.items(), key=lambda x: (x[0] == "_hata", int(x[0][1:]) if x[0][1:].isdigit() else 0))},
                                     "ad_kaynagi": govde if ad else None, "ad_sayisi": len(ad),
                                     "adlar_tum": ad if len(ad) <= 400 else None}
        log("keşif:", t, m, len(deger), "nokta,", len(ad), "ad")
    # inverterlerin tümünde bulunan noktalar
    inv = [d["ps_key"] for d in cihaz if int(d.get("device_type") or 0) == 1 and d.get("ps_key")]
    nk = sorted({k[1:] for kk, v in out["turler"].items() if kk.startswith("1|") for k in v["noktalar"] if k[1:].isdigit()}, key=int)
    tum = {}
    for i in range(0, len(inv), 50):
        for j in range(0, len(nk), 100):
            try:
                for r in cli.realtime(1, inv[i:i + 50], nk[j:j + 100]):
                    p = r.get("device_point", r)
                    tum.setdefault(p.get("ps_key"), {}).update({k: v for k, v in p.items() if k.startswith("p") and v not in (None, "", "--")})
            except Exception as e:
                out.setdefault("hatalar", []).append(str(e)[:120])
    out["inverter_anlik"] = tum
    # 5 dk geçmiş deneme
    if inv:
        try:
            bas = (simdi - timedelta(hours=2)).strftime("%Y%m%d%H%M00")
            rd = cli.call("/openapi/getDevicePointMinuteDataList", {"ps_key_list": inv[:1], "points": "p24,p1",
                          "start_time_stamp": bas, "end_time_stamp": simdi.strftime("%Y%m%d%H%M00"), "minute_interval": 5,
                          "is_get_data_acquisition_time": "1"})
            v = next(iter(rd.values()), []) if isinstance(rd, dict) else rd
            out["gecmis_5dk"] = {"durum": "var", "kayit": len(v) if isinstance(v, list) else None, "ornek": (v[:3] if isinstance(v, list) else str(v)[:300])}
        except Exception as e:
            out["gecmis_5dk"] = {"durum": "yok", "hata": str(e)[:200]}
    yol = f"inverter/sungrow_kesif_{ps}.json"
    _, sha = gh(yol)
    gh(yol, out, sha, "Sungrow keşif " + ps)
    log("keşif yazıldı:", yol, sum(v["nokta_sayisi"] for v in out["turler"].values()), "nokta")
    return out


if __name__ == "__main__":
    import saha_inverter  # noqa: F401  (osos.env yükler)
    main(sys.argv[1] if len(sys.argv) > 1 else "5038906")
