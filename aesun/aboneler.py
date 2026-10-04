"""Abone kayitlari - v3 panelin tek dogruluk kaynagi.

mahsup=True olanlar EPDK 14531 mahsuplasma havuzuna girer (T1, T2, A3).
mahsup=False olanlar sadece izlenir; hesaplara katilmaz.
5. abone (11111411) ayarlari v3_ayarlar.json'dan okunur, panelden duzenlenir.
"""

ABONELER = [
    {"key": "tekyildiz_1", "kod": "T1", "ad": "Tekyıldız 1", "tesisat": "11116344",
     "carpan": 1890.0, "uretim": True, "tuketim": True, "mahsup": True, "kurulu_kwp": 1007.13,
     "renk": 1},
    {"key": "tekyildiz_2", "kod": "T2", "ad": "Tekyıldız 2", "tesisat": "11116968",
     "carpan": 1890.0, "uretim": True, "tuketim": True, "mahsup": True, "kurulu_kwp": 1035.0,
     "renk": 2},
    {"key": "aksaray_3", "kod": "A3", "ad": "Aksaray 3", "tesisat": "11200108",
     "carpan": 3150.0, "uretim": False, "tuketim": True, "mahsup": True, "kurulu_kwp": None,
     "renk": 3},
    {"key": "yilmaz_darilmaz", "kod": "YD", "ad": "Yılmaz Darılmaz", "tesisat": "11201655",
     "carpan": 1260.0, "uretim": True, "tuketim": True, "mahsup": False, "kurulu_kwp": 1300.0,
     "inverter": {"kaynak": "sungrow", "ps_id": "5064453", "ad": "Darilmaz Ges"},
     "renk": 4},
    {"key": "anka_mineral", "kod": "Anka", "ad": "Anka Mineral", "tesisat": "11111411",
     "carpan": 6300.0, "sayac_seri": "40304004", "uretim": True, "tuketim": True,
     "mahsup": False, "kurulu_kwp": 3300.0,
     "inverter": {"kaynak": "sungrow", "ps_id": "5038906", "ad": "HG YATIRIM AŞ (Halil Gökçe)"},
     "renk": 5},
]

DUZENLENEBILIR = ("ad", "kod", "carpan", "uretim", "tuketim", "kurulu_kwp")


def abone_listesi(ayarlar=None):
    """Varsayilan kayitlarin uzerine v3_ayarlar.json'daki abone duzenlemelerini uygular."""
    ek = ((ayarlar or {}).get("aboneler") or {})
    sonuc = []
    for a in ABONELER:
        b = dict(a)
        for k, v in (ek.get(a["key"]) or {}).items():
            if k in DUZENLENEBILIR:
                b[k] = v
        sonuc.append(b)
    return sonuc


def abone_bul(key, ayarlar=None):
    for a in abone_listesi(ayarlar):
        if a["key"] == key:
            return a
    return None
