"""EPDK 14531 mahsuplasma - eski paneldeki (mahsupYukleAsync) JS hesabinin birebir Python karsiligi.

- 2026-01..04: AYLIK mantik (A3 icin manuel deger varsa once A3, sonra T2, T1; yoksa basamakli)
- 2026-05+   : SAATLIK kaynak takipli havuz (uretim buyukten kucuge; her ureticiden T2 -> A3 -> T1)
Mahsup disi aboneler (YD, AM) ayri 'izleme' alaninda tasinir, hesaba girmez.
"""

SAATLIK_BASLANGIC = "2026-05"

MHS_MANUEL_AKS3 = {
    "2026-01": 29373.75,
    "2026-02": 63949.58,
    "2026-03": 89689.95,
    "2026-04": 191206.98,
}
MHS_2025_TOPLAM = 4549 + 0 + 1448407.80
MHS_BEDELLI_LIMIT = MHS_2025_TOPLAM * 2

KOD = {"tekyildiz_1": "T1", "tekyildiz_2": "T2", "aksaray_3": "A3"}
TIP = {"T1": (True, True), "T2": (True, True), "A3": (False, True)}


def _bos():
    return {"T1": 0.0, "T2": 0.0, "A3": 0.0, "TPL": 0.0}


def basamakli(tuk, uretim_tpl):
    sira = sorted([("T1", tuk["T1"]), ("T2", tuk["T2"]), ("A3", tuk["A3"])],
                  key=lambda x: -x[1])
    mahsup, sonra = _bos(), _bos()
    kalan = uretim_tpl or 0
    for ab, t in sira:
        if kalan >= t:
            mahsup[ab] = t; sonra[ab] = 0; kalan -= t
        else:
            mahsup[ab] = kalan; sonra[ab] = t - kalan; kalan = 0
    mahsup["TPL"] = mahsup["T1"] + mahsup["T2"] + mahsup["A3"]
    sonra["TPL"] = sonra["T1"] + sonra["T2"] + sonra["A3"]
    return mahsup, sonra, kalan


def manuel_a3(tuk, uretim_tpl, manuel):
    mahsup, sonra = _bos(), _bos()
    kalan = uretim_tpl or 0
    mahsup["A3"] = min(manuel, tuk["A3"])
    sonra["A3"] = tuk["A3"] - mahsup["A3"]
    kalan -= mahsup["A3"]
    for ab in ("T2", "T1"):
        if kalan > 0 and tuk[ab] > 0:
            mahsup[ab] = min(kalan, tuk[ab]); sonra[ab] = tuk[ab] - mahsup[ab]; kalan -= mahsup[ab]
        else:
            sonra[ab] = tuk[ab]
    mahsup["TPL"] = mahsup["T1"] + mahsup["T2"] + mahsup["A3"]
    sonra["TPL"] = sonra["T1"] + sonra["T2"] + sonra["A3"]
    return mahsup, sonra, max(0, kalan)


def havuz(ur, tk):
    ureticiler = sorted([["T1", ur["T1"]], ["T2", ur["T2"]]], key=lambda x: -x[1])
    tuk = {"T1": tk["T1"], "T2": tk["T2"], "A3": tk["A3"]}
    kaynak = {"T1": {"T1": 0, "T2": 0, "A3": 0, "bedelli": 0},
              "T2": {"T1": 0, "T2": 0, "A3": 0, "bedelli": 0}}
    mahsup = _bos()
    for u in ureticiler:
        if u[1] <= 0:
            continue
        for ab in ("T2", "A3", "T1"):
            if u[1] <= 0 or tuk[ab] <= 0:
                continue
            m = min(u[1], tuk[ab])
            kaynak[u[0]][ab] += m; mahsup[ab] += m; u[1] -= m; tuk[ab] -= m
        if u[1] > 0:
            kaynak[u[0]]["bedelli"] += u[1]; u[1] = 0
    mahsup["TPL"] = mahsup["T1"] + mahsup["T2"] + mahsup["A3"]
    sonra = {"T1": tuk["T1"], "T2": tuk["T2"], "A3": tuk["A3"],
             "TPL": tuk["T1"] + tuk["T2"] + tuk["A3"]}
    return mahsup, sonra, kaynak["T1"]["bedelli"] + kaynak["T2"]["bedelli"]


def _ekle(hedef, kaynak):
    for k in ("T1", "T2", "A3", "TPL"):
        hedef[k] += kaynak[k]


def hesapla(endeks, izleme_keys=("yilmaz_darilmaz", "anka_mineral"), yil="2026"):
    """endeks: 2026_osos_endeks.json icerigi.
    Donus: {ay: {uretim, tuketim, mahsup, mahsup_dag, sonra, bedelli, izleme:{key:{u,t}}, gunler:{gun:{...,saatler:{..}}}}}"""
    aylar = {}

    def gun_al(gun):
        ay = gun[:7]
        A = aylar.setdefault(ay, {"gunler": {}})
        return A["gunler"].setdefault(gun, {"saatler": {}})

    def saat_al(G, saat):
        return G["saatler"].setdefault(saat, {"uretim": _bos(), "tuketim": _bos(), "izleme": {}})

    for key, abone in (endeks or {}).items():
        if not isinstance(abone, dict) or not abone.get("veri"):
            continue
        kod = KOD.get(key)
        izle = key in izleme_keys
        if not kod and not izle:
            continue
        for gun, saatler in abone["veri"].items():
            if not gun.startswith(yil):
                continue
            G = gun_al(gun)
            for saat_raw, v in (saatler or {}).items():
                S = saat_al(G, saat_raw[:2])
                c = v.get("cekis", v.get("cekis_kwh", 0)) or 0
                w = v.get("veris", v.get("veris_kwh", 0)) or 0
                if izle:
                    z = S["izleme"].setdefault(key, {"u": 0.0, "t": 0.0})
                    z["u"] += w; z["t"] += c
                    continue
                uretim, tuketim = TIP[kod]
                if uretim:
                    S["uretim"][kod] += w; S["uretim"]["TPL"] += w
                if tuketim:
                    S["tuketim"][kod] += c; S["tuketim"]["TPL"] += c

    for ay, A in aylar.items():
        saatlik = ay >= SAATLIK_BASLANGIC
        A["uretim"], A["tuketim"] = _bos(), _bos()
        A["izleme"] = {}
        a_m, a_s, a_b = _bos(), _bos(), 0.0
        for gun, G in A["gunler"].items():
            G["uretim"], G["tuketim"] = _bos(), _bos()
            G["izleme"] = {}
            g_m, g_s, g_b = _bos(), _bos(), 0.0
            for saat, S in G["saatler"].items():
                _ekle(G["uretim"], S["uretim"]); _ekle(G["tuketim"], S["tuketim"])
                for k, z in S["izleme"].items():
                    gz = G["izleme"].setdefault(k, {"u": 0.0, "t": 0.0})
                    gz["u"] += z["u"]; gz["t"] += z["t"]
                if saatlik:
                    m, s, b = havuz(S["uretim"], S["tuketim"])
                    S["mahsup_dag"], S["sonra"], S["bedelli"] = m, s, b
                    S["mahsup"] = m["TPL"]
                    _ekle(g_m, m); _ekle(g_s, s); g_b += b
                else:
                    S["mahsup_dag"], S["sonra"], S["bedelli"], S["mahsup"] = _bos(), _bos(), 0.0, 0.0
            _ekle(A["uretim"], G["uretim"]); _ekle(A["tuketim"], G["tuketim"])
            for k, z in G["izleme"].items():
                az = A["izleme"].setdefault(k, {"u": 0.0, "t": 0.0})
                az["u"] += z["u"]; az["t"] += z["t"]
            G["mahsup_dag"], G["sonra"], G["bedelli"] = g_m, g_s, g_b
            G["mahsup"] = g_m["TPL"]
            _ekle(a_m, g_m); _ekle(a_s, g_s); a_b += g_b
        if saatlik:
            A["mahsup_dag"], A["sonra"], A["bedelli"] = a_m, a_s, a_b
        elif ay in MHS_MANUEL_AKS3:
            A["mahsup_dag"], A["sonra"], A["bedelli"] = manuel_a3(A["tuketim"], A["uretim"]["TPL"], MHS_MANUEL_AKS3[ay])
        else:
            A["mahsup_dag"], A["sonra"], A["bedelli"] = basamakli(A["tuketim"], A["uretim"]["TPL"])
        A["mahsup"] = A["mahsup_dag"]["TPL"]
        A["mod"] = "saatlik" if saatlik else "aylik"
    return aylar


def ozet(aylar):
    top = {"uretim": 0.0, "tuketim": 0.0, "mahsup": 0.0, "bedelli": 0.0}
    for A in aylar.values():
        top["uretim"] += A["uretim"]["TPL"]; top["tuketim"] += A["tuketim"]["TPL"]
        top["mahsup"] += A["mahsup"]; top["bedelli"] += A["bedelli"]
    top["bedelli_limit"] = MHS_BEDELLI_LIMIT
    top["bedelli_oran"] = top["bedelli"] / MHS_BEDELLI_LIMIT if MHS_BEDELLI_LIMIT else 0
    return top
