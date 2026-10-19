#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GES-ÇİZ  —  Parametrik GES proje çizim aracı (Aksaray Enerji)
Tek JSON parametre dosyasından 4 pafta + metraj + kontrol üretir:
  01 Genel Yerleşim | 02 OG/AG Tek Hat | 03 Topraklama | 04 Kablo Güzergâh
Çıktı: DWG (esas) + DXF + PDF (tüm paftalar) + HTML (interaktif) + metraj CSV/JSON
Kullanım:  python3 ges_ciz.py proje.json [--cikti klasor] [--seviye teklif|uygulama]
Gerekli:   pip install ezdxf shapely matplotlib   | DWG için: LibreDWG dxf2dwg
"""
import json, math, re, sys, os, csv, copy, shutil, subprocess, argparse, datetime, bisect, heapq, html as _html
from shapely.geometry import Polygon, LineString, box, Point, MultiLineString
from shapely.ops import unary_union, nearest_points
from shapely import affinity

SURUM = "1.0"

# Standart ekipman güçleri (boyutlandırma için)
# H.4 (kullanıcı kuralı 19.10.2026): 0,4 kV küçük tesiste standart üretim dağıtım trafoları (≤ 2000 kVA, tek trafo en çok 1600–2000);
# üst güçlerde net standart yok → yüke uygun değer seçilir (ör. 4000, 5000, 5750, 6250 kVA): 250 kVA adımla yukarı yuvarlanır.
TRAFO_KVA_STD = [630, 800, 1000, 1250, 1600, 2000]
TRAFO_ADIM_KVA = 250
INVERTER_KW_STD = [30, 36, 50, 60, 75, 100, 110, 125, 150, 175, 200, 215, 225, 250, 300, 330, 350]

def _std_ust(x, liste):
    """x'e eşit veya x'ten büyük en küçük standart (yoksa en büyük)."""
    return next((v for v in liste if v >= x - 1e-6), liste[-1])

def _std_alt(x, liste):
    """x'e eşit veya x'ten küçük en büyük standart (yoksa en küçük)."""
    return next((v for v in reversed(liste) if v <= x + 1e-6), liste[0])

def _trafo_sec(gerek_kva, volt=None):
    """H.3/H.4: ≤ 2000 kVA (0,4 kV) standart seriden bir üst; üstünde 250 kVA adımla yüke uygun değer."""
    if (volt == 400) or (volt is None and gerek_kva <= TRAFO_KVA_STD[-1]):
        return _std_ust(gerek_kva, TRAFO_KVA_STD)
    return max(1000, int(math.ceil(gerek_kva / TRAFO_ADIM_KVA - 1e-9) * TRAFO_ADIM_KVA))

def _sistem_sec(trafo_kva):
    """H.5: trafo gücüne göre AG gerilimi ve uygun inverter güç bandı.
    ≤ 2000 kVA → OG/0.4 kV çıkış → 100–125 kW inverter; > 2000 kVA → 0.8 kV → 300–350 kW inverter."""
    if trafo_kva <= 2000:
        return 400, "33/0,4 kV Dy11 ONAN", [100, 125]
    return 800, "33/0,8 kV Dy11 ONAN", [300, 350]

# ----------------------------------------------------------------- VARSAYILANLAR
# Değer = SHAMS-1 TR-1 uygulamasından (statik 826-S04, tek hat R4, yerleşim).
# None = kaynakta yok -> kullanıcı girmeli, kontrol "VERİ YOK" der.
VARSAYILAN = {
  "proje": {"kod": "PRJ", "isin_adi": "", "proje_sahibi": "", "yuklenici": "Aksaray Enerji San. ve Tic. Ltd. Şti.",
            "il_ilce_ada_parsel": "", "cizen": "", "kontrol": "", "revizyon": "R00", "tarih": None,
            "seviye": "teklif", "pafta": "oto", "enlem": None, "dil": "TR",
            "tesis_tipi": "lisanssiz", "yatirimci": "", "imalatci": "",
            "muellif": "", "muellif_unvan": "Elektrik Mühendisi", "pus_no": "", "smm_no": "", "oda_sicil": "",
            "revizyonlar": [],
            # onaylı antet formu (TEDAŞ onaylı GES projeleri): proje sorumlusu firma, proje sahibi adresi, yer, imza tablosu
            "firma": {"ad": "", "adres": "", "tel": "", "eposta": ""}, "proje_sahibi_adres": "",
            "il": "", "ilce": "", "mahalle": "", "ada": "", "parsel": "",
            "cizen_unvan": "", "cizen_oda": "", "cizen_smm": "", "kontrol_unvan": "", "kontrol_oda": "", "kontrol_smm": "",
            "pob_baslik": None, "notlar": [], "pafta_on_ek": "E"},
  "parsel": {"koordinat": None, "koordinat_sistemi": "", "cekme_mesafesi_m": 5.0, "cekme_kademeleri_m": [4.0, 3.0, 2.0],
             "hedef_masa": None, "max_masa": None, "cit_ic_ofset_m": 0.5, "yasak_alanlar": [], "eigm_alan_m2": None},
  "modul": {"en_mm": 1303, "boy_mm": 2384, "guc_wp": None, "voc_v": None, "vmp_v": None, "isc_a": None, "imp_a": None,
            "voc_sicaklik_katsayi_pct": None, "tmin_c": -25},
  "masa": {"tip": "2V13", "sira_sayisi": 2, "sira_modul": 13, "modul_boslugu_mm": 20, "uc_payi_mm": 80, "egim_derece": 25,
           "alt_kenar_m": 0.80, "masa_arasi_m": 0.50, "pitch_m": 8.70, "sira_acikligi_m": None, "azimut_derece": 0,
           "aks_sayisi": 7, "aks_araligi_m": 2.60, "kolon_sira_araligi_m": 2.50,
           "parca_carpani": {"kolon": 14, "kiris": 7, "asik": 12, "ruzgarlik": 12, "payanda": 7, "capraz": 12,
                              "orta_klemp": 48, "kenar_klemp": 8, "m12_civata": 140}},
  "elektrik": {"string_modul": 26, "inverter_tr": 19, "string_inverter_max": 20, "inverter_ac_kw": None,
               "inverter_model": "", "trafo_kva": 5750, "trafo_gerilim": "33/0,8 kV Dy11 ONAN",
               "trafo_marj_min_pct": 10, "og_kablo": "3x(1x120/16) NA2XSY 36 kV", "og_kablo_dm": "3x(1x240/25) NA2XSY 36 kV",
               "ac_kablo": "3x300/150 NA2XY", "ac_kesit_mm2": 300, "ac_iletken": "Al", "ag_kesit_oto": True, "dc_kablo": "H1Z2Z2-K 1x6",
               "dc_kesit_mm2": 6, "ag_gerilim_v": 800, "cosphi": 1.0,
               "rho_cu": 0.0206, "rho_al": 0.0333, "dc_dusum_max_pct": 1.5, "ac_dusum_max_pct": 1.5,
               "tm_hucreler": None, "dm_hucreler": None, "dm_yedek_fider": 1,   # None = SHAMS-1 onaylı tek hat hücre seti
               "og_bara": {"un_kv": 36, "in_a": 630, "ik_ka": 16, "malzeme": "Cu"},
               "dm_bara": {"un_kv": 36, "in_a": 1250, "ik_ka": 25, "malzeme": "Cu"},
               "dm_konum": None, "tm_konumlari": None, "tm_taraf": "dogu",
               # kullanıcı düzenlemesi: {"den": [x,y], "ye": [x,y]} — den noktasına en yakın TM/inverter ye noktasına taşınır
               "tm_tasi": [], "inv_tasi": [],
               "mppt_sayisi": None, "mppt_akim_a": None, "voc_marj_min_pct": 2.0, "dc_tek_yon_max_m": 80.0,
               "dcac_hedef": 1.25, "inverter_oto": None, "trafo_oto": None, "trafo_yuklenme_max_pct": 90.0,   # oto None = değer verilmemişse otomatik
               "inverter_derinlik_masa": 3, "sebeke_gerilim_kv": None, "dc_fire_pct": 3.0,
               "harici_trafo_min_kva": 2500, "og_gerilim_kv": 33.0, "og_kesit_mm2": 120, "og_kesit_dm_mm2": 240,
               "kappa_cu": 56.0, "kappa_al": 35.0, "og_dusum_max_pct": 7.0, "trafo_yag_l": None,
               "ag_pano_form": "Form 4b", "ag_pano_ip": "IP54", "ag_pano_icw_ka": 65, "ag_pano_in_a": 4000,
               "inverter_sinir_kw": None, "inverter_giris": None, "inverter_hiza": "trafo", "inverter_konum": "arka", "ag_cikis_ka": 36, "kosk": {}},
  "hendek": {"dc_derinlik_m": 0.70, "ag_derinlik_m": 0.80, "og_derinlik_m": 1.00, "genislik_m": 0.60,
             "kum_cm": 10, "koruyucu_cm": 6, "uyari_ust_cm": 30, "kablo_aralik_cm": 7, "yol_gecis_boru_ust_m": 1.0,
             # kademeli AG/OG kanal (Zorlu Tesis 1 GES onaylı kesitleri): b = taban + artış × (AC devre − 1) + OG eki (≥ 2 AC devrede)
             "ac_kanal_taban_m": 0.60, "ac_devre_artis_m": 0.20, "og_ek_m": 0.10, "detay_min_m": 15.0},
  "yol": {"genislik_m": 4.0, "tm_alan_m": [12.0, 10.0],
          # A.7 (18.10.2026): sıraları kesen K-G iç işletme-bakım yolları; aralık DC gerilim düşümünden (A.1)
          "ic_yol": True, "ic_genislik_m": 5.0, "ic_kanal_m": 1.0, "ic_pay_m": 1.0, "ic_aralik_m": None,
          # kullanıcı düzenlemesi: ek_yollar = [[x,y],…] polyline listesi (gerçek koordinat), sil_yollar = [x,y] (o noktaya en yakın otomatik iç yol kaldırılır)
          "ek_yollar": [], "sil_yollar": []},
  "metraj_pafta": {},
  "topraklama": {"serit": "Galvaniz şerit 30x3,5 mm", "goz_max_m": 40.0, "derinlik_m": 0.60, "mod": "kopru",
                 "kopru_kablo": "1x16 NYAF", "cit_baglanti_m": 50.0, "cubuk_araligi_m": 40.0, "tm_cubuk": 4,
                 "direnc_hedef_ohm": 1.0, "toprak_ozdirenc_ohm_m": None, "ik_toprak_a": None, "t_f_s": 1.0,
                 "cubuk_cap_mm": 16, "trafo_isletme_ayrim_m": 20},
  "guvenlik": {"direk_araligi_m": 40.0, "kamera_switch_basina": 5, "cit_direk_araligi_m": 3.0, "levha_araligi_m": 15.0},
  "santiye": {"alanlar": []},
}

KATMANLAR = {  # ad: (ACI renk, açıklama)
  "GES-SINIR": (7, "Parsel sınırı"), "GES-CEKME": (8, "Çekme mesafesi"), "GES-CIT": (1, "Çit"),
  "GES-YOL": (9, "Servis yolu (kenar)"), "GES-MASA": (5, "Masa"), "GES-MASA-NO": (5, "Masa no"),
  "GES-STRING-NO": (4, "String etiketi"), "GES-INV": (6, "İnverter"), "GES-TM": (30, "Trafo merkezi / DM"),
  "GES-DC-KABLO": (3, "DC kablo"), "GES-AC-KABLO": (2, "AG AC kablo"), "GES-OG-KABLO": (1, "OG kablo"),
  "GES-HENDEK-DC": (3, "DC hendek"), "GES-HENDEK-AC": (2, "AC/OG hendek"),
  "GES-TOPRAK-SERIT": (32, "Topraklama şeridi"), "GES-TOPRAK-CUBUK": (32, "Topraklama çubuğu"),
  "GES-TOPRAK-BAGLANTI": (40, "Topraklama bağlantı noktası"), "GES-AYD-CCTV": (211, "Aydınlatma+CCTV direği"),
  "GES-SANTIYE": (8, "Şantiye alanı"), "GES-TEKHAT": (7, "Tek hat şeması"), "GES-TEKHAT-OG": (1, "Tek hat OG"),
  "GES-OLCU": (8, "Ölçü"), "GES-NOT": (7, "Not / lejant"), "GES-DETAY": (7, "Detay çizimi"), "GES-DETAY-TARAMA": (8, "Detay tarama / ölçü yardımcı"), "GES-ANTET": (7, "Antet / çerçeve"),
  "GES-TH-BARA": (1, "Bara"), "GES-TH-HUCRE": (7, "OG hücre gövdesi"), "GES-TH-KOSK": (8, "Köşk / pano sınırı"),
  "GES-TH-KUMANDA": (5, "Kumanda / ölçü bağlantısı"), "GES-TH-TOPRAK": (3, "Topraklama (tek hat)"), "GES-TH-YAZI": (7, "Tek hat yazı / etiket"),
}
KESIKLI = {"GES-TH-KOSK", "GES-TH-KUMANDA"}
DASH_SVG = ' stroke-dasharray="1.8 1"'
# PDF çizgi kalınlığı (pt)
KAT_LW = {"GES-DETAY": 0.45, "GES-DETAY-TARAMA": 0.18, "GES-MASA": 0.25, "GES-TEKHAT-OG": 0.6, "GES-TEKHAT": 0.55, "GES-TH-HUCRE": 0.8, "GES-TH-KOSK": 0.7,
          "GES-TH-KUMANDA": 0.35, "GES-TH-TOPRAK": 0.5, "GES-TH-YAZI": 0.4, "GES-TH-BARA": 0.4, "GES-CIT": 0.8, "GES-SINIR": 0.8}
POB = {"lisanssiz": "TEDAŞ / yetkili EDAŞ", "lisansli": "ETKB / yetkili POB (TEİAŞ-TEDAŞ)",
       "iletim": "TEİAŞ", "osb": "OSB Müdürlüğü / EDAŞ", "yurtdisi": "İşveren / yerel mevzuat (TR yönetmelikleri referans)"}
PAFTA_MM = {"A0": (1189, 841), "A1": (841, 594), "A2": (594, 420), "A3": (420, 297), "B0": (1414, 1000)}
OLCEKLER = [10, 20, 25, 50, 100, 200, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000]


def birlestir(a, b):
    out = copy.deepcopy(a)
    for k, v in b.items():
        if k.startswith("_"):
            continue
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = birlestir(out[k], v)
        else:
            out[k] = v
    return out


# ----------------------------------------------------------------- PRIMITIVE KAYIT
KG_AYAK_MAX = 2.50   # K-G ön–arka ayak arası üst sınırı (m), kullanıcı kuralı

class Pafta:
    def __init__(self, kod, ad, olcekli=True):
        self.kod, self.ad, self.olcekli = kod, ad, olcekli
        self.p = []  # (tip, katman, veri, info)

    def cizgi(self, kat, pts, info=None): self.p.append(("L", kat, [tuple(map(float, q)) for q in pts], info))
    def poli(self, kat, pts, info=None, dolgu=False): self.p.append(("P", kat, [tuple(map(float, q)) for q in pts], (info, dolgu)))
    def yazi(self, kat, x, y, h, t, rot=0, hiz="L"): self.p.append(("T", kat, (float(x), float(y), float(h), str(t), float(rot), hiz), None))
    def daire(self, kat, x, y, r, info=None): self.p.append(("C", kat, (float(x), float(y), float(r)), info))

    def sinir(self):
        xs, ys = [], []
        for t, k, d, i in self.p:
            if t in ("L", "P"):
                for x, y in d: xs.append(x); ys.append(y)
            elif t == "T": xs.append(d[0]); ys.append(d[1])
            elif t == "C": xs += [d[0] - d[2], d[0] + d[2]]; ys += [d[1] - d[2], d[1] + d[2]]
        return (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 1, 1)


def dis_halkalar(g):
    """Polygon / MultiPolygon dış halkaları (çok parsel)."""
    if g is None or g.is_empty: return []
    if g.geom_type == "Polygon": return [g.exterior]
    return [q.exterior for q in getattr(g, "geoms", []) if q.geom_type == "Polygon"]


def geom_ciz(pf, kat, g, info=None):
    if g is None or g.is_empty: return
    if g.geom_type == "Polygon": pf.poli(kat, list(g.exterior.coords), info)
    elif g.geom_type == "LineString": pf.cizgi(kat, list(g.coords), info)
    elif hasattr(g, "geoms"):
        for s in g.geoms: geom_ciz(pf, kat, s, info)


# ----------------------------------------------------------------- MODEL
class Model:
    """Esaslar (A–H) koda gömülü:
    A.1 DC string tek yön ≤ 80 m · A.2 DC masa üstünden, zorunluysa masa altından; AG masa altından geçmez
    A.3 AG sıra açıklığından · A.4 inverter masa başında (ortasında değil) · A.5 inverter yol tarafında
    A.6 servis yolu/ana kanal parsel kenarında · A.7 masa alanında koridor yok
    B  açıklık→eksen · çekme 5 m, sığmazsa 4/3/2 · F DC fire %3, kanal ortak hendekten ayrı
    H  Elektriksel boyutlandırma (18.10.2026):
    H.1 Saha tümüyle doldurulur → DC (kWp).
    H.2 AC = DC / (DC/AC hedef); hedef varsayılan 1.25 (aksi belirtilmedikçe). AC verilirse o kullanılır.
    H.3 Gereken trafo = AC / 0.90 (trafo en çok %90 yüklenir) → standart kVA'dan bir üst değer.
    H.4 0,4 kV küçük tesiste standart üretim trafo (630…1600/2000 kVA); üst güçlerde standart yok → yüke uygun değer
        (250 kVA adım: 4000, 5000, 5750, 6250 …), her TR kendi yüküne göre.
    Kullanıcı inverter/trafo değeri verdiyse o geçerlidir (oto yalnız değer boşsa); AG kesiti hat başına büyür (paralel kablo).
    H.5 Gerilim + inverter trafoya göre: trafo ≤ 2000 kVA → AG 0.4 kV → inverter 100–125 kW;
        trafo > 2000 kVA → AG 0.8 kV → inverter 300–350 kW.
    H.6 İnverter tek tip (uniform); band içinde DC/AC'yi hedefe en yakın yapan güç. Blok ≈ inv_kW·hedef/string_kWp
        string; bloklar dengeli (singleton inverter oluşturulmaz)."""

    def __init__(self, P):
        self.P = P
        self.uyari = []
        self.kontrol = []
        m, e, mod = P["masa"], P["elektrik"], P["modul"]
        # kullanıcı kuralı (19.10.2026): K-G ön–arka ayak (kolon sırası) arası en çok 2,50 m
        if (m.get("kolon_sira_araligi_m") or 0) > KG_AYAK_MAX:
            self.uyari.append(f"K-G ayak arası {m['kolon_sira_araligi_m']:.2f} m verildi; en çok {KG_AYAK_MAX:.2f} m olabilir, {KG_AYAK_MAX:.2f} m alındı.")
            m["kolon_sira_araligi_m"] = KG_AYAK_MAX
        self.masa_L = (m["sira_modul"] * mod["en_mm"] + (m["sira_modul"] - 1) * m["modul_boslugu_mm"] + 2 * m.get("uc_payi_mm", 0)) / 1000.0
        self.masa_egik = (m["sira_sayisi"] * mod["boy_mm"] + (m["sira_sayisi"] - 1) * m["modul_boslugu_mm"]) / 1000.0
        a = math.radians(m["egim_derece"])
        self.masa_D = self.masa_egik * math.cos(a)            # yatay izdüşüm
        self.masa_H = self.masa_egik * math.sin(a)            # kot farkı
        if m.get("sira_acikligi_m") is not None:              # B: paftadaki "sıra mesafesi" = açıklık
            m["pitch_m"] = round(m["sira_acikligi_m"] + self.masa_D, 3)
        self.acik = m["pitch_m"] - self.masa_D
        self.masa_modul = m["sira_sayisi"] * m["sira_modul"]
        if self.masa_modul % e["string_modul"] != 0:
            self.uyari.append(f"Masa modülü {self.masa_modul} string boyu {e['string_modul']}'ın katı değil — string masayı bölüyor.")
        self.str_masa = max(1, self.masa_modul // e["string_modul"])
        if P.get("yol", {}).get("koridor_her_n_sira"):
            self.uyari.append("koridor_her_n_sira yok sayıldı — iç yollar A.7'ye göre DC gerilim düşümünden açılır (yol.ic_yol).")
        # A.1: DC tek yön sınırı gerilim düşümünden (ΔU %1); modül verisi yoksa pratik ön sınır
        if mod.get("vmp_v") and mod.get("imp_a"):
            self.dc_lim = 0.01 * e["dc_kesit_mm2"] * mod["vmp_v"] * e["string_modul"] / (2 * mod["imp_a"] * e["rho_cu"])
            self.dc_lim_kaynak = f"ΔU %1 → {self.dc_lim:.0f} m (Vmp {mod['vmp_v']} V × {e['string_modul']}, Imp {mod['imp_a']} A, {e['dc_kesit_mm2']} mm²)"
        else:
            self.dc_lim = e["dc_tek_yon_max_m"]
            self.dc_lim_kaynak = f"{self.dc_lim:.0f} m pratik ön sınır (modul.vmp_v / imp_a yok — ΔU hesaplanamadı)"
        self.ic_yollar = []; self.K_ic = None

    # ---------------------------------------------------------------- 1) saha
    def parsel_geom(self):
        """Parsel(ler). Kullanıcı kuralı 19.10.2026: dosyadaki ayrık parsellerin TÜMÜNDE işlem yapılır.
        self.parsel_sinir = parsellerin birleşimi (çizim, alan, çit, masa alanı); dönen geometri = parseller + aralarındaki
        geçiş koridorları (kablo/servis yolu geçişi; en kısa bağlantı ağacı) — güzergâh tek ağ kalır, koridora masa ve çit konmaz."""
        k = self.P["parsel"]["koordinat"]
        if not k: raise SystemExit("HATA: parsel.koordinat yok")
        coklu = isinstance(k[0][0], (list, tuple))
        polys = [Polygon(q).buffer(0) for q in (k if coklu else [k])]
        g = unary_union(polys)
        self.kopruler = []
        if g.geom_type != "Polygon":
            g2 = unary_union([p.buffer(0.5) for p in polys]).buffer(-0.5)
            if g2.geom_type == "Polygon": g = g2
        self.parsel_sinir = g
        if g.geom_type == "Polygon": return g
        par = sorted([q for q in g.geoms if q.area > 1], key=lambda q: -q.area)
        bag, kalan = [par[0]], par[1:]
        while kalan:                                   # Prim: ağa en yakın parça en kısa koridorla bağlanır
            en = min(((a.distance(b), a, b) for a in bag for b in kalan), key=lambda t: t[0])
            _, a, b = en; p, q = nearest_points(a, b); L = p.distance(q)
            ux, uy = ((q.x - p.x) / L, (q.y - p.y) / L) if L > 1e-6 else (1.0, 0.0)
            hat = LineString([(p.x - ux * 2, p.y - uy * 2), (q.x + ux * 2, q.y + uy * 2)])
            self.kopruler.append({"hat": hat, "L": L}); bag.append(b); kalan.remove(b)
        b_ = unary_union(par + [o["hat"].buffer(6.0, cap_style=2, join_style=2) for o in self.kopruler])
        _u = (f"{len(par)} ayrık parsel tek projede: parseller arası {len(self.kopruler)} geçiş koridoru (toplam {sum(o['L'] for o in self.kopruler):.0f} m; kablo geçişi/yol — izin ve boru geçişi ayrıca kontrol edilir).")
        if _u not in self.uyari: self.uyari.append(_u)
        if b_.geom_type != "Polygon":
            b_ = max(b_.geoms, key=lambda q: q.area); self.uyari.append("Parsel koridorları birleşemedi — en büyük parça kullanıldı.")
        return b_

    def saha(self, cekme):
        P = self.P
        self.parsel = self.parsel_geom()
        self.merkez = self.parsel.centroid
        self.az = P["masa"]["azimut_derece"]
        rot = lambda g: affinity.rotate(g, -self.az, origin=self.merkez) if self.az else g
        loc = rot(self.parsel)
        of = P["parsel"]["cit_ic_ofset_m"]
        self.cit = self.parsel_sinir.buffer(-of, join_style=2)   # çit her parselin kendi sınırında (koridorda çit yok)
        coklu_p = self.parsel_sinir.geom_type != "Polygon"
        loc_p = rot(self.parsel_sinir)
        # Cephe bazlı çekme (parsel.cepheler): yol / komşu parsel / diğer cephelerde farklı mesafe. Verilmeyen kenar = genel çekme (kademeli).
        kn = [] if coklu_p else self._cephe_kenarlar(loc, rot, cekme)
        self.cekme_cephe = kn
        if kn and any(abs(d - cekme) > 1e-6 for _, d, _ in kn):
            ofs = lambda f: self._duz_ofset(loc, kn, f)
            ic = ofs(lambda d: d)
            self.cekme = min(d for _, d, _ in kn)
        else:
            ofs = None
            ic = loc_p.buffer(-cekme, join_style=2)          # masa alanı yalnız parsellerde (koridorda masa yok)
            self.cekme = cekme
        for ya in P["parsel"]["yasak_alanlar"]:
            ic = ic.difference(rot(Polygon(ya["koordinat"]).buffer(ya.get("tampon_m", 0))))
        for s in P["santiye"]["alanlar"]:
            ic = ic.difference(rot(Polygon(s["koordinat"])))
        if ic.geom_type == "MultiPolygon":
            ic = unary_union([q for q in ic.geoms if q.area > 50])
        self.ic_loc = ic
        # A.6 servis yolu = çit ile masa alanı arasındaki kenar bandı; eksen bandın ortasında
        if ofs:
            self.yol_loc = loc.buffer(-of, join_style=2).difference(ofs(lambda d: d))
            h = ofs(lambda d: (of + d) / 2)
        else:
            self.yol_loc = loc.buffer(-of, join_style=2).difference(loc.buffer(-cekme, join_style=2))
            h = loc.buffer(-(of + cekme) / 2, join_style=2)
        if h.geom_type == "MultiPolygon": h = max(h.geoms, key=lambda q: q.area)
        self.halka = LineString(h.exterior.coords)
        self.alan_loc = ic
        self.koridor_loc = []
        self.ic_yollar = []

    @staticmethod
    def _duz_ofset(loc, kn, f):
        """Kenar başına farklı mesafeyle içe ofset — köşeler sivri (mitre), yuvarlak yok. kn: CCW sırada (kenar, d, tip)."""
        def nrm(e):
            (ax, ay), (bx, by) = e.coords[0], e.coords[-1]; L = math.hypot(bx - ax, by - ay) or 1.0
            return (ax, ay), (bx, by), ((bx - ax) / L, (by - ay) / L), (-(by - ay) / L, (bx - ax) / L)
        parca = []; K = len(kn)
        for e, d, _ in kn:
            dd = f(d)
            if dd <= 0: continue
            a, b, u, n = nrm(e)
            parca.append(Polygon([a, b, (b[0] + n[0] * dd, b[1] + n[1] * dd), (a[0] + n[0] * dd, a[1] + n[1] * dd)]))
        for i in range(K):                       # iç bükey (reflex) köşede iki ofset doğrusu kesişene kadar doldur
            e0, d0, _ = kn[i - 1]; e1, d1, _ = kn[i]
            a0, b0, u0, n0 = nrm(e0); a1, b1, u1, n1 = nrm(e1); D0, D1 = f(d0), f(d1)
            if u0[0] * u1[1] - u0[1] * u1[0] >= -1e-9 or max(D0, D1) <= 0: continue
            P0 = (b0[0] + n0[0] * D0, b0[1] + n0[1] * D0); P1 = (a1[0] + n1[0] * D1, a1[1] + n1[1] * D1)
            den = u0[0] * u1[1] - u0[1] * u1[0]
            t = ((P1[0] - P0[0]) * u1[1] - (P1[1] - P0[1]) * u1[0]) / den
            X = (P0[0] + u0[0] * t, P0[1] + u0[1] * t)
            V = b0
            q = Polygon([V, P0, X, P1]) if math.dist(X, V) <= 10 * max(D0, D1) else Polygon([V, P0, P1])
            if q.is_valid and q.area > 0: parca.append(q)
        return loc.difference(unary_union(parca)).buffer(0) if parca else loc

    def _cephe_kenarlar(self, loc, rot, cekme):
        """parsel.cepheler: [{"a":[x,y],"b":[x,y],"tip":"yol|parsel|diger","cekme_m":5}]. Dış sınırın her kenarı,
        iki ucu bir cephe doğrusuna ≤ 0,5 m ise o cephenin mesafesini alır; eşleşmeyen kenar genel çekmeyi (kademe) alır."""
        cs = self.P["parsel"].get("cepheler") or []
        if not cs: return []
        segs = [(rot(LineString([c["a"], c["b"]])), c) for c in cs if c.get("a") and c.get("b") and c.get("cekme_m") is not None]
        from shapely.geometry.polygon import orient
        k = list(orient(loc, 1.0).exterior.coords); out = []
        for i in range(len(k) - 1):
            e = LineString([k[i], k[i + 1]]); d, tip = cekme, None
            for sg, c in segs:
                if sg.distance(Point(k[i])) <= 0.5 and sg.distance(Point(k[i + 1])) <= 0.5:
                    d, tip = float(c["cekme_m"]), c.get("tip"); break
            out.append((e, d, tip))
        return out

    def ic_yol_kur(self):
        """A.7: sıraları dik kesen K-G iç işletme-bakım yolları. Aralık, yol kenarındaki (masa başı) inverterden en uzak
        masaya DC tek yön ≤ dc_lim (A.1, ΔU %1) olacak en geniş blok: K masa / yarım açıklık."""
        y, e, m = self.P["yol"], self.P["elektrik"], self.P["masa"]
        self.ic_yollar = []; self.K_ic = None; self.ag = None
        oto = y.get("ic_yol", True)
        if not oto and not y.get("ek_yollar"): return
        Lg = self.masa_L + m["masa_arasi_m"]; MX = e["string_inverter_max"]; s_ = self.str_masa; pitch = m["pitch_m"]
        K = 1
        for k in range(1, 60):
            rows = math.ceil(MX / (k * s_))
            if k * Lg + (rows - 1) / 2 * pitch + 3.0 + 1.0 <= self.dc_lim: K = k
        self.K_ic = K
        aralik = y.get("ic_aralik_m") or (2 * K * Lg - m["masa_arasi_m"])
        w, kn, pay = y["ic_genislik_m"], y["ic_kanal_m"], y["ic_pay_m"]
        serit = pay + w + kn + pay
        minx, miny, maxx, maxy = self.alan_loc.bounds
        Wt = maxx - minx
        B = aralik + 0.05                                          # iç blok: tam 2K masa (masa boyunun katı, artık şerit yok)
        E = K * Lg                                                 # kenar bloğu ≤ K masa: inverterler iç yol kenarında
        n = max(0, math.ceil((Wt - 2 * E + B) / (serit + B) - 1e-9)) if (Wt > 2 * E and oto) else 0
        e0 = (Wt - n * serit - (n - 1) * B) / 2                    # kenar blokları eşit (ortalanmış)
        cevre = Polygon(self.halka.coords)                         # yollar kenar servis yoluna bağlanır
        seritler = []
        for i in range(n):
            x0 = minx + e0 + (B + serit) * i
            yol = box(x0 + pay, miny - 50, x0 + pay + w, maxy + 50).intersection(cevre)
            kx = x0 + pay + w + kn / 2
            kl = LineString([(kx, miny - 50), (kx, maxy + 50)]).intersection(cevre.buffer(0.3))   # halkayı keser → ağda düğümlenir
            kanal = [g for g in (getattr(kl, "geoms", None) or [kl]) if g.geom_type == "LineString" and g.length > 1]
            if yol.is_empty or not kanal: continue
            self.ic_yollar.append({"no": len(self.ic_yollar) + 1, "x0": x0, "x1": x0 + serit, "xk": kx, "yol": yol, "kanal": kanal,
                                   "eksen": LineString([(x0 + pay + w / 2, miny - 50), (x0 + pay + w / 2, maxy + 50)]).intersection(cevre),
                                   "serit": box(x0, miny - 50, x0 + serit, maxy + 50)})
        # kullanıcı düzenlemesi: silinen otomatik yollar
        self.duzen_not = []
        for p in y.get("sil_yollar") or []:
            q = self._loc(p)
            if not self.ic_yollar: break
            r = min(self.ic_yollar, key=lambda r: r["yol"].distance(q))
            if r["yol"].distance(q) <= 15 and not r.get("elle"): self.ic_yollar.remove(r); self.duzen_not.append("iç yol kaldırıldı")
        # kullanıcı düzenlemesi: elle çizilen yollar (her yöne). Ucu ağa (kenar halka / başka kanal) değmiyorsa en yakın noktaya uzatılır.
        for pl in y.get("ek_yollar") or []:
            if not pl or len(pl) < 2: continue
            L = LineString([tuple(self._loc(q).coords[0]) for q in pl])
            if L.length < 5: continue
            ag_ = unary_union([self.halka] + [k for r in self.ic_yollar for k in r["kanal"]])
            c = list(L.coords)
            for uc in (0, -1):
                P_ = Point(c[uc])
                if P_.distance(ag_) > 2.0:
                    q = nearest_points(ag_, P_)[0]
                    if uc == 0: c.insert(0, (q.x, q.y))
                    else: c.append((q.x, q.y))
            L = LineString(c)
            yol = L.buffer(w / 2, cap_style=2, join_style=2).intersection(cevre)
            ko = L.parallel_offset(w / 2 + kn / 2, "left", join_style=2)
            ko = ko.intersection(cevre.buffer(0.3)) if not ko.is_empty else ko
            kanal = [g for g in (getattr(ko, "geoms", None) or [ko]) if g.geom_type == "LineString" and g.length > 1]
            # kanal uçlarını ağa bağla (düğümlenme)
            for k_i, kg in enumerate(kanal):
                kc = list(kg.coords)
                for uc in (0, -1):
                    P_ = Point(kc[uc])
                    if P_.distance(ag_) > 0.05 and P_.distance(ag_) < w + kn + 3:
                        q = nearest_points(ag_, P_)[0]
                        if uc == 0: kc.insert(0, (q.x, q.y))
                        else: kc.append((q.x, q.y))
                kanal[k_i] = LineString(kc)
            if yol.is_empty or not kanal: continue
            bx = L.bounds
            self.ic_yollar.append({"no": len(self.ic_yollar) + 1, "x0": bx[0] - w / 2 - pay, "x1": bx[2] + w / 2 + kn + pay, "xk": L.centroid.x,
                                   "yol": yol, "kanal": kanal, "eksen": L, "serit": L.buffer(w / 2 + kn + pay, cap_style=2, join_style=2).intersection(cevre), "elle": True})
            self.duzen_not.append("elle yol eklendi")
        for i, r in enumerate(self.ic_yollar): r["no"] = i + 1
        if self.ic_yollar:
            self.alan_loc = self.alan_loc.difference(unary_union([r["serit"] for r in self.ic_yollar]))
            self.yol_loc = unary_union([self.yol_loc] + [r["yol"] for r in self.ic_yollar])
            self.ag_kur()

    def _loc(self, p):
        """Gerçek koordinat → model (azimuta göre döndürülmüş) koordinatı."""
        return affinity.rotate(Point(p), -self.az, origin=self.merkez) if self.az else Point(p)

    # ---- kablo ağı: kenar halka + iç yol kanalları (en kısa yol, Dijkstra)
    def ag_kur(self):
        hatlar = [self.halka] + [k for r in self.ic_yollar for k in r["kanal"]]
        U = unary_union(hatlar)
        parcalar = list(U.geoms) if hasattr(U, "geoms") else [U]
        idx, xy, adj = {}, [], []
        def nid(p):
            k = (round(p[0], 2), round(p[1], 2))
            if k not in idx: idx[k] = len(xy); xy.append(k); adj.append([])
            return idx[k]
        for ls in parcalar:
            c = list(ls.coords)
            for a, b in zip(c, c[1:]):
                L = math.dist(a, b); n = max(1, int(L // 5))
                prev = nid(a)
                for i in range(1, n + 1):
                    cur = nid((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))
                    if cur != prev:
                        d = math.dist(xy[prev], xy[cur]); adj[prev].append((cur, d)); adj[cur].append((prev, d))
                    prev = cur
        self.ag = {"U": U, "xy": xy, "adj": adj, "agac": {}}

    def _ag_dugum(self, p):
        xy = self.ag["xy"]; return min(range(len(xy)), key=lambda i: (xy[i][0] - p[0]) ** 2 + (xy[i][1] - p[1]) ** 2)

    def _ag_agac(self, src):
        A = self.ag
        if src in A["agac"]: return A["agac"][src]
        dist = {src: 0.0}; prev = {}; h = [(0.0, src)]
        while h:
            d, u = heapq.heappop(h)
            if d > dist.get(u, 1e18): continue
            for v, w_ in A["adj"][u]:
                nd = d + w_
                if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(h, (nd, v))
        A["agac"][src] = (dist, prev); return A["agac"][src]

    def ag_yol(self, p, q):
        """p → q kablo ağı üzerinden (kanal/halka). Uçlar ağ üstündeki noktalar."""
        if not getattr(self, "ag", None): return self._halka_yol(p, q)
        a, b = self._ag_dugum(p), self._ag_dugum(q)
        if a == b: return LineString([tuple(p), tuple(q)])
        dist, prev = self._ag_agac(b)
        if a not in dist: return self._halka_yol(p, q)
        yol = [a]
        while yol[-1] != b: yol.append(prev[yol[-1]])
        xy = self.ag["xy"]
        return LineString([tuple(p)] + [xy[i] for i in yol] + [tuple(q)])

    def ag_mesafe(self, p, q):
        if not getattr(self, "ag", None): return math.dist(p, q)
        a, b = self._ag_dugum(p), self._ag_dugum(q); dist, _ = self._ag_agac(b); return dist.get(a, 1e18)

    def _aga(self, x, y, taraf):
        """Sıra açıklığından (y sabit) taraf yönünde ilk kablo kanalına (iç yol kanalı ya da kenar halka)."""
        if not getattr(self, "ag", None): return self._halkaya(x, y, taraf)
        U = self.ag["U"]; mnx, _, mxx, _ = U.bounds
        k = LineString([(x, y), ((mxx + 10) if taraf == "E" else (mnx - 10), y)]).intersection(U)
        pts = [k] if k.geom_type == "Point" else [g for g in getattr(k, "geoms", []) if g.geom_type == "Point"]
        if not pts:
            q = nearest_points(U, Point(x, y))[0]; return (q.x, q.y)
        p = min(pts, key=lambda q: abs(q.x - x)); return (p.x, p.y)

    # ---------------------------------------------------------------- 2) dizilim
    def _dizi(self, alan, xm, ym):
        """Izgara dizilimi: sıralar kuzey/güney/orta başlangıçlı, sıra içinde masalar batı/doğu/orta hizalı."""
        m = self.P["masa"]; minx, miny, maxx, maxy = alan.bounds
        pitch, D, L, g = m["pitch_m"], self.masa_D, self.masa_L, m["masa_arasi_m"]
        n = max(1, int((maxy - D - miny) // pitch) + 1)
        artik = (maxy - D - miny) - (n - 1) * pitch
        y = maxy - D - (artik if ym == "south" else artik / 2 if ym == "center" else 0.0)
        out, sira = [], 0
        while y >= miny - 1e-6:
            kes = alan.intersection(box(minx - 1, y, maxx + 1, y + D))
            parcalar = [kes] if kes.geom_type == "Polygon" else [q for q in getattr(kes, "geoms", []) if q.geom_type == "Polygon"]
            for pc in sorted(parcalar, key=lambda q: q.bounds[0]):
                if pc.is_empty: continue
                x0, xe = pc.bounds[0], pc.bounds[2]; sat = []
                if xm == "right":
                    x = xe
                    while x - L >= x0 - 1e-6:
                        mb = box(x - L, y, x, y + D)
                        if alan.contains(mb.buffer(-0.01)): sat.append(mb); x -= L + g
                        else: x -= 0.5
                else:
                    x = x0
                    while x + L <= xe + 1e-6:
                        mb = box(x, y, x + L, y + D)
                        if alan.contains(mb.buffer(-0.01)): sat.append(mb); x += L + g
                        else: x += 0.5
                    if xm == "center" and sat:
                        bos = xe - max(q.bounds[2] for q in sat)
                        if bos > 0.2:
                            kay = [affinity.translate(q, bos / 2, 0) for q in sat]
                            if all(alan.contains(q.buffer(-0.01)) for q in kay): sat = kay
                for mb in sat:
                    c = mb.centroid; out.append({"loc": mb, "sira": sira, "x": c.x, "y": c.y})
            sira += 1
            y -= pitch
        return out

    def dizilim(self, tm_alanlari=None):
        m = self.P["masa"]
        alan = self.alan_loc
        if tm_alanlari: alan = alan.difference(unary_union(tm_alanlari))
        minx, miny, maxx, maxy = alan.bounds
        pitch, D, L, g = m["pitch_m"], self.masa_D, self.masa_L, m["masa_arasi_m"]
        masalar, sira = [], 0
        y = maxy - D
        kon = m.get("konumlar") or []
        if kon:                                  # kullanıcı kuralı 19.10.2026: çizimdeki yerleşim (Arazi doldur / elle) esastır
            pts = []
            for c in kon:
                q = self._loc(c)
                mb = box(q.x - L / 2, q.y - D / 2, q.x + L / 2, q.y + D / 2)
                if tm_alanlari and any(mb.intersects(t) for t in tm_alanlari): continue
                pts.append((q.y, q.x, mb))
            pts.sort(key=lambda t: (-t[0], t[1]))
            ry = None
            for yy, xx, mb in pts:
                if ry is not None and abs(yy - ry) > D / 2: sira += 1
                if ry is None or abs(yy - ry) > D / 2: ry = yy
                masalar.append({"loc": mb, "sira": sira, "x": xx, "y": yy})
            y = miny - 1                         # ızgara dizilimi atlanır
        if not kon:
            # hizalama (AeCAD Arazi doldur ile aynı ayar, kullanıcı kuralı 19.10.2026): masa.hiza_x left/right/center/opt,
            # masa.hiza_y south/north/center; "opt" 9 bileşimden en çok masayı veren
            hx = m.get("hiza_x") or "left"; hy = m.get("hiza_y") or "north"
            xs_ = ["left", "right", "center"] if hx in ("opt", "duz") else [hx]
            ys_ = ["south", "north", "center"] if hx in ("opt", "duz") else [hy]
            best = None
            for xm_ in xs_:
                for ym_ in ys_:
                    r_ = self._dizi(alan, xm_, ym_)
                    if best is None or len(r_) > len(best): best = r_
            masalar = best or []
        mx = None if kon else self.P["parsel"].get("max_masa")
        if mx and len(masalar) > mx:            # hedef güç üst sınırı: orta sıralar korunur (A.7), dış sıralardan kesilir
            sm = (min(q["sira"] for q in masalar) + max(q["sira"] for q in masalar)) / 2
            xm = sum(q["x"] for q in masalar) / len(masalar)
            self.max_kesilen = len(masalar) - mx
            masalar = sorted(masalar, key=lambda q: (abs(q["sira"] - sm), abs(q["x"] - xm)))[:mx]
        else:
            self.max_kesilen = 0
        self.masalar = sorted(masalar, key=lambda q: (q["sira"], q["x"]))
        seg, onceki = 0, None
        for i, ms in enumerate(self.masalar):
            ms["no"] = i + 1
            if onceki is None or ms["sira"] != onceki["sira"] or ms["x"] - onceki["x"] > L + g + 0.6: seg += 1
            ms["seg"] = seg; onceki = ms
        self.seg_sayisi = seg
        self.sira_sayisi = len({q["sira"] for q in self.masalar})
        # segment içi derinlik (A.4/A.5 için)
        segs = {}
        for ms in self.masalar: segs.setdefault(ms["seg"], []).append(ms)
        for sg, lst in segs.items():
            lst.sort(key=lambda q: q["x"]); n = len(lst)
            sira_seg = [s for s in sorted({q["seg"] for q in self.masalar if q["sira"] == lst[0]["sira"]})]
            # A.7: iç yollu sahada segmentin yalnız bir ucu iç yola bakıyorsa tüm masalar o yola (inverter yol kenarında)
            yolW = yolE = False
            if self.ic_yollar:
                x0s, x1s = lst[0]["loc"].bounds[0], lst[-1]["loc"].bounds[2]
                ya0, ya1 = lst[0]["loc"].bounds[1], lst[0]["loc"].bounds[3]
                yolW = any(r["yol"].intersects(box(x0s - 3.5, ya0, x0s - 0.2, ya1)) for r in self.ic_yollar)
                yolE = any(r["yol"].intersects(box(x1s + 0.2, ya0, x1s + 3.5, ya1)) for r in self.ic_yollar)
            for i, ms in enumerate(lst):
                dW, dE = i, n - 1 - i
                if yolW != yolE:
                    ms["taraf"] = "W" if yolW else "E"; ms["derinlik"] = dW if yolW else dE
                else:
                    ms["taraf"] = "E" if dE < dW or (dE == dW and self.P["elektrik"]["tm_taraf"] == "dogu") else "W"
                    ms["derinlik"] = min(dW, dE)
                ms["segrank"] = sira_seg.index(sg) if ms["taraf"] == "W" else len(sira_seg) - 1 - sira_seg.index(sg)
                ms["uc_x"] = ms["loc"].bounds[2] if ms["taraf"] == "E" else ms["loc"].bounds[0]   # inverter yönündeki masa başı
        self.segs = segs
        # sıra yapısı: y aralığı ve x sıralı masalar (kablolar yalnız sıra açıklığı ve masa arası boşluktan geçer)
        self.siralar = {}
        for ms in self.masalar:
            r = self.siralar.setdefault(ms["sira"], {"y0": ms["loc"].bounds[1], "y1": ms["loc"].bounds[3], "m": []})
            r["m"].append(ms)
        for r in self.siralar.values():
            r["m"].sort(key=lambda q: q["x"])
            bb = [q["loc"].bounds for q in r["m"]]           # serbest_x için önbellek (sınırlar bir kez)
            r["b0"] = [b[0] for b in bb]; r["b2"] = [b[2] for b in bb]
            r["aday"] = [bb[0][0] - 0.4, bb[-1][2] + 0.4] + [(a[2] + b[0]) / 2 for a, b in zip(bb, bb[1:]) if b[0] - a[2] >= 0.3]
        self.masa_birlesik = unary_union([ms["loc"] for ms in self.masalar])

    def serbest_x(self, sira, x):
        """sira'yı dikey kesmek için x'e en yakın masa-dışı nokta: masa arası boşluk ortası veya sıra ucu dışı."""
        r = self.siralar.get(sira)
        if not r: return x
        b0, b2 = r["b0"], r["b2"]
        i = bisect.bisect_right(b0, x + 0.05) - 1     # x zaten boşluktaysa olduğu gibi
        if not any(0 <= j < len(b0) and b0[j] - 0.05 < x < b2[j] + 0.05 for j in (i, i - 1)):
            return x
        return min(r["aday"], key=lambda c: abs(c - x))

    def acik_y(self, sira, alt=True):
        """sira'nın altındaki (güney) / üstündeki (kuzey) sıra açıklığının ekseni."""
        r = self.siralar.get(sira)
        if r is None:                                  # boş sıra (ayrık parseller arası / boşluk): en yakın sıradan eksen aralığıyla
            ref = min(self.siralar, key=lambda q: abs(q - sira)); r0 = self.siralar[ref]; dy = (sira - ref) * self.P["masa"]["pitch_m"]
            r = {"y0": r0["y0"] + dy, "y1": r0["y1"] + dy}
        return r["y0"] - self.acik / 2 if alt else r["y1"] + self.acik / 2

    def dc_yol(self, ms, inv, ofset=-0.6):
        """İnverter masanın arkasındaysa (kullanıcı kuralı 19.10.2026): string inverterin masa başına kadar olağan yoldan gelir,
        masa arası boşluktan arka sıra açıklığına çıkar ve açıklıkta invertere ulaşır."""
        if not inv.get("arka"): return self._dc_yol0(ms, inv, ofset)
        im = inv["masa"]; gx = im["loc"].bounds[2] + 0.25 if inv["taraf"] == "E" else im["loc"].bounds[0] - 0.25
        pts, _ = self._dc_yol0(ms, {"masa": im, "taraf": inv["taraf"], "x": gx, "y": im["y"]}, ofset)
        return pts + [(gx, inv["y"]), (inv["x"], inv["y"])], 0.0

    def _dc_yol0(self, ms, inv, ofset=-0.6):
        """String: masa başından iner, sıra açıklığında yürür, sıraları yalnız masa arası boşluktan keser.
        ofset: DC hendeği açıklık ekseninden kaydırılır (AC ile aynı kanala girmez)."""
        s0, s1 = ms["sira"], inv["masa"]["sira"]
        x = ms["uc_x"] + (0.25 if ms["taraf"] == "E" else -0.25)      # masa başı (dışı)
        if s0 == s1:
            if abs(x - inv["x"]) < 0.6: return [(x, ms["y"]), (inv["x"], inv["y"])], 0.0
            y = self.acik_y(s0, alt=True) + ofset
            pts = [(x, ms["y"]), (x, y), (inv["x"], y), (inv["x"], inv["y"])]
            return pts, 0.0
        guney = s1 > s0
        pts = [(x, ms["y"])]
        sr = s0
        y = self.acik_y(sr, alt=guney) + ofset
        pts.append((x, y))
        adim = 1 if guney else -1
        sr += adim
        while True:
            if sr == s1:
                y2 = self.acik_y(sr, alt=not guney) + ofset
                xs = inv["x"]
                pts += [(xs, y), (xs, inv["y"])]
                break
            xg = self.serbest_x(sr, inv["x"] if abs(inv["x"] - x) > 0 else x)
            xg = self.serbest_x(sr, xg)
            y2 = self.acik_y(sr, alt=guney) + ofset
            pts += [(xg, y), (xg, y2)]
            x, y = xg, y2
            sr += adim
        return pts, 0.0

    # ---------------------------------------------------------------- 3) TR grupları + TM
    def gruplama(self):
        e = self.P["elektrik"]
        toplam_str = len(self.masalar) * self.str_masa
        self.n_tr = max(1, math.ceil(toplam_str / (e["inverter_tr"] * e["string_inverter_max"])))
        sirali = sorted(self.masalar, key=lambda q: (q["sira"], q["x"]))
        n = len(sirali)
        sn = [round(i * n / self.n_tr) for i in range(self.n_tr + 1)]
        self.tr_gruplari = [sirali[sn[t]:sn[t + 1]] for t in range(self.n_tr)]

    def _kenar_x(self, y, taraf):
        mnx, _, mxx, _ = self.ic_loc.bounds
        k = LineString([(mnx - 50, y), (mxx + 50, y)]).intersection(self.ic_loc)
        if k.is_empty: return mxx if taraf == "E" else mnx
        xs = [c[0] for gg in (k.geoms if hasattr(k, "geoms") else [k]) for c in gg.coords]
        return max(xs) if taraf == "E" else min(xs)

    def tm_yerlestir(self):
        P, e = self.P, self.P["elektrik"]
        w, h = P["yol"]["tm_alan_m"]
        taraf = "E" if e["tm_taraf"] == "dogu" else "W"
        rot = lambda p: affinity.rotate(Point(p), -self.az, origin=self.merkez) if self.az else Point(p)
        self.tm_loc = []
        for t, grp in enumerate(self.tr_gruplari):
            if e["tm_konumlari"] and t < len(e["tm_konumlari"]):
                c = rot(e["tm_konumlari"][t])
            elif self.ic_yollar and self._tm_elle_yol(grp, w, h) is not None:
                c = self._tm_elle_yol(grp, w, h)
            elif self.ic_yollar:   # A.7: TM iç yol kenarında, kablo kanalı tarafında; grubun ortasında
                cx = sum(q["x"] for q in grp) / len(grp)
                r = min([r for r in self.ic_yollar if not r.get("elle")] or self.ic_yollar, key=lambda r: abs(r["xk"] - cx))
                ys = sorted(q["y"] for q in grp); cy0 = ys[len(ys) // 2]
                xc = r["x1"] + w / 2 + 0.5; c = None; best = None
                for xx in (xc, r["x0"] - w / 2 - 0.5):
                    for dy in [0] + [s * k * 5 for k in range(1, 13) for s in (1, -1)]:   # grubun yanında (≤ 60 m); gölgeyle en az masa kaybı
                        bx = box(xx - w / 2, cy0 + dy - h / 2, xx + w / 2, cy0 + dy + h / 2)
                        if self.ic_loc.contains(bx) and not any(bx.intersects(o) for o in self.tm_loc):
                            sk = self._tm_kayip(Point(xx, cy0 + dy), w, h) + abs(dy) / 20.0 + (0 if xx == xc else 0.5)
                            if best is None or sk < best[0]: best = (sk, Point(xx, cy0 + dy))
                if best: c = best[1]
                if c is None: c = self._tm_bos_yer(grp, w, h)
            else:   # A.6: TM servis yolu kenarında, masa alanının kenar şeridinde
                cy0 = sorted(q["y"] for q in grp)[len(grp) // 2]; best = None
                for dy in [0] + [s_ * k * 5 for k in range(1, 9) for s_ in (1, -1)]:     # kenar şeridinde, gölgeyle en az masa kaybı
                    cy = cy0 + dy
                    try:
                        xe = min(self._kenar_x(cy - h / 2 + 0.1, taraf), self._kenar_x(cy + h / 2 - 0.1, taraf)) if taraf == "E" else \
                             max(self._kenar_x(cy - h / 2 + 0.1, taraf), self._kenar_x(cy + h / 2 - 0.1, taraf))
                    except Exception: continue
                    cc = Point(xe - w / 2 if taraf == "E" else xe + w / 2, cy)
                    bx = box(cc.x - w / 2, cy - h / 2, cc.x + w / 2, cy + h / 2)
                    if not self.ic_loc.buffer(0.5).contains(bx) or any(bx.intersects(o) for o in self.tm_loc): continue
                    sk = self._tm_kayip(cc, w, h) + abs(dy) / 20.0
                    if best is None or sk < best[0]: best = (sk, cc)
                if best: c = best[1]
                else:
                    cy = cy0
                    xe = min(self._kenar_x(cy - h / 2 + 0.1, taraf), self._kenar_x(cy + h / 2 - 0.1, taraf)) if taraf == "E" else \
                         max(self._kenar_x(cy - h / 2 + 0.1, taraf), self._kenar_x(cy + h / 2 - 0.1, taraf))
                    c = Point(xe - w / 2 if taraf == "E" else xe + w / 2, cy)
            self.tm_loc.append(box(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2))
        self.dm_ortak = False
        if e["dm_konum"]:
            c = rot(e["dm_konum"])
        elif len(self.tm_loc) == 1 and not e.get("dm_ayri"):
            # tek trafolu tesis: DM hücreleri TM köşkünde — ayrı DM binası yok (tek bina)
            c = self.tm_loc[0].centroid; self.dm_ortak = True
        else:   # DM: kuzey-TM tarafı köşesi (giriş/ENH tarafı parametreyle verilmeli)
            ymax = self.ic_loc.bounds[3] - h / 2 - 0.1
            xe = self._kenar_x(ymax, taraf)
            c = Point(xe - w / 2 if taraf == "E" else xe + w / 2, ymax)
            self.uyari.append("DM konumu otomatik (TM tarafı kuzey köşe). ENH bağlantı noktasına göre elektrik.dm_konum verin.")
        self.dm_loc = box(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2)
        if self.dm_ortak: self.dm_loc = self.tm_loc[0]
        # kullanıcı düzenlemesi: TM taşıma (den noktasına en yakın TM → ye)
        for t in e.get("tm_tasi") or []:
            if not self.tm_loc: break
            f, to = self._loc(t["den"]), self._loc(t["ye"])
            i = min(range(len(self.tm_loc)), key=lambda i: self.tm_loc[i].centroid.distance(f))
            if self.tm_loc[i].centroid.distance(f) <= 80:
                self.tm_loc[i] = box(to.x - w / 2, to.y - h / 2, to.x + w / 2, to.y + h / 2)

    # ---- köşk gölgesi (kullanıcı kuralı 19.10.2026): bina yüksekliğine göre 21 Aralık gölgesi; gölgedeki masalar kaldırılır,
    # TM yeri gölgenin en az masa kaybettirdiği noktaya konur
    def _gunes(self):
        if getattr(self, "_gunes_v", None) is not None: return self._gunes_v
        P = self.P; fi = math.radians(P["proje"].get("enlem") or 39.0); de = math.radians(-23.44)
        hw = float(P["masa"].get("golge_saat") or 2.0)
        Hb = ((P["elektrik"].get("kosk") or {}).get("H_mm") or KOSK_VARS["H_mm"]) / 1000.0
        V = []
        for k in (-1, -0.5, 0, 0.5, 1):
            H = math.radians(15 * hw * k)
            sa = math.sin(fi) * math.sin(de) + math.cos(fi) * math.cos(de) * math.cos(H)
            if sa <= 0.05: continue
            alt = math.asin(sa); az = math.atan2(math.sin(H), math.cos(H) * math.sin(fi) - math.tan(de) * math.cos(fi))
            L = Hb / math.tan(alt); vx, vy = math.sin(az) * L, math.cos(az) * L          # gerçek koordinatta (kuzey +y)
            if self.az:                                                                 # model eksenine
                a = math.radians(-self.az); vx, vy = vx * math.cos(a) - vy * math.sin(a), vx * math.sin(a) + vy * math.cos(a)
            V.append((vx, vy))
        self._gunes_v = V; return V

    def tm_golge(self, g):
        V = self._gunes()
        if not V: return g
        return unary_union([g] + [affinity.translate(g, vx, vy) for vx, vy in V]).convex_hull

    def tm_engel(self):
        return [self.tm_golge(t).buffer(1.0) for t in self.tm_loc] + ([] if getattr(self, "dm_ortak", False) else [self.tm_golge(self.dm_loc).buffer(1.0)])

    def _tm_kayip(self, c, w, h):
        g = self.tm_golge(box(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2)).buffer(1.0)
        return sum(1 for q in getattr(self, "masalar", []) if q["loc"].intersects(g))

    def _tm_bos_yer(self, grp, w, h):
        """Yol kenarında yer yoksa: saha içinde (çekme bandının içinde), grubun ağırlık merkezine en yakın boş TM yeri.
        TM hiçbir durumda parsel/çit dışına konmaz; altında kalan masalar dizilimde kaldırılır."""
        cx = sum(q["x"] for q in grp) / len(grp); cy = sum(q["y"] for q in grp) / len(grp)
        mnx, mny, mxx, mxy = self.ic_loc.bounds; best = None; st = 3.0
        erisim = unary_union([self.halka] + [q["yol"] for q in self.ic_yollar])     # TM servis yoluna / iç yola bitişik (A.6/A.7)
        yy = mny + h / 2
        while yy <= mxy - h / 2:
            xx = mnx + w / 2
            while xx <= mxx - w / 2:
                bx = box(xx - w / 2, yy - h / 2, xx + w / 2, yy + h / 2)
                if bx.distance(erisim) <= 3.0 and self.ic_loc.contains(bx) and not any(bx.intersects(o.buffer(2)) for o in self.tm_loc) and not any(bx.intersects(q["yol"]) for q in self.ic_yollar):
                    d = math.hypot(xx - cx, yy - cy) + 8.0 * self._tm_kayip(Point(xx, yy), w, h)
                    if best is None or d < best[0]: best = (d, xx, yy)
                xx += st
            yy += st
        if best: return Point(best[1], best[2])
        p = self.ic_loc.representative_point(); return Point(p.x, p.y)

    def _tm_elle_yol(self, grp, w, h):
        """Grubun inverterlerinin çoğu elle çizilmiş bir yoldaysa TM o yolun kanal tarafında, gruba en yakın noktada."""
        cx = sum(q["x"] for q in grp) / len(grp); cy = sum(q["y"] for q in grp) / len(grp); G_ = Point(cx, cy)
        r = min(self.ic_yollar, key=lambda r: r["yol"].distance(G_))
        if not r.get("elle"): return None
        kan = unary_union(r["kanal"]); P0 = nearest_points(kan, G_)[0]; A0 = nearest_points(r["eksen"], P0)[0]
        dx, dy = P0.x - A0.x, P0.y - A0.y; d = math.hypot(dx, dy) or 1.0; nx, ny = dx / d, dy / d
        hm = max(w, h) / 2 + 0.6
        for k in [0] + [s_ * j * 5 for j in range(1, 40) for s_ in (1, -1)]:
            base = kan.interpolate(max(0.0, min(kan.length, kan.project(P0) + k))) if kan.geom_type == "LineString" else P0
            c = Point(base.x + nx * hm, base.y + ny * hm)
            bx = box(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2)
            if self.ic_loc.contains(bx) and not any(bx.intersects(o) for o in self.tm_loc) and not any(bx.intersects(q["yol"]) for q in self.ic_yollar): return c
        return Point(P0.x + nx * hm, P0.y + ny * hm)

    # ---------------------------------------------------------------- 4) inverter (A.1, A.4, A.5)
    def inverter_ata(self):
        """Saha geneli: önce A.1'e uyan inverter blokları, sonra kuzeyden güneye TR'lere eşit dağıtım."""
        e = self.P["elektrik"]
        K = (self.K_ic if self.ic_yollar and self.K_ic else e["inverter_derinlik_masa"])
        L2 = 2 * self.masa_L
        for ms in self.masalar:
            ms.pop("str", None)
            ms["band"] = ms["derinlik"] // K
            sg = self.segs[ms["seg"]]
            ms["cap"] = max(q["loc"].bounds[2] for q in sg) if ms["taraf"] == "E" else min(q["loc"].bounds[0] for q in sg)
        # H: trafo bandına göre AG gerilimi + uniform inverter gücü → blok hedefi MX (string/inverter).
        #    Blok hedefi küçülür ama bloklar yine DC-kompakt zincirlerden kurulur (A.1 korunur).
        self._sys = None
        MX = e["string_inverter_max"]
        guc = self.P["modul"]["guc_wp"]
        if not hasattr(self, "_oto_inv"): self._oto_inv = self._oto("inverter_oto", "inverter_ac_kw"); self._oto_trafo = self._oto("trafo_oto", "trafo_kva")
        if guc and self._oto_inv:
            str_kwp = e["string_modul"] * guc / 1000.0
            dcac = e.get("dcac_hedef") or 1.25
            yuk = (e.get("trafo_yuklenme_max_pct") or 90.0) / 100.0
            dc_kwp = len(self.masalar) * self.str_masa * str_kwp
            trafo_on = _trafo_sec(dc_kwp / dcac / yuk) if self._oto_trafo else e["trafo_kva"]   # gerilim bandı için (verilen trafo esas)
            volt, tger, band = _sistem_sec(trafo_on)
            # DC-kompakt zincirler (uç hizası) — blok hedefi B'ye göre bölünür; zincir < B ise tek blok
            def _zincirler():
                zs = []
                for tb in sorted({(q["taraf"], q["band"]) for q in self.masalar}):
                    lst = sorted([q for q in self.masalar if (q["taraf"], q["band"]) == tb], key=lambda q: (q["sira"], q["cap"], q["derinlik"]))
                    zc = []
                    for q in lst:
                        ay = [z for z in zc if z["son"] == q["sira"] and z["seg"] == q["seg"]]
                        if ay: z = ay[0]
                        else:
                            ad = [z for z in zc if z["son"] == q["sira"] - 1 and abs(z["cap"] - q["cap"]) <= L2]
                            z = min(ad, key=lambda z: abs(z["cap"] - q["cap"])) if ad else None
                            if z is None: z = {"liste": []}; zc.append(z)
                        z["liste"].append(q); z["son"] = q["sira"]; z["seg"] = q["seg"]; z["cap"] = q["cap"]
                    zs += [len(z["liste"]) * self.str_masa for z in zc]
                return zs
            zlen = _zincirler()
            def _n_inv(c):
                B = max(1, round(c * dcac / str_kwp))
                return sum(math.ceil(n / B) for n in zlen), B
            inv_kw = min(band, key=lambda c: abs(dc_kwp / (_n_inv(c)[0] * c) - dcac))   # DC/AC'yi hedefe en yakın band gücü
            _, MX = _n_inv(inv_kw)
            self._sys = (volt, tger, inv_kw); self._band = band
        if e.get("inverter_adet"):   # kullanıcı inverter adedi (ör. 10 × 100 kW = 1000 kW): string/inverter = ⌈toplam string / adet⌉
            MX = max(1, math.ceil(len(self.masalar) * self.str_masa / int(e["inverter_adet"])))
        # (taraf, bant) içinde uç hizası sürekli sıra zincirleri — farklı segmentler karışmaz; her zincir MX'e göre bölünür
        bloklar = []
        for tb in sorted({(q["taraf"], q["band"]) for q in self.masalar}):
            lst = sorted([q for q in self.masalar if (q["taraf"], q["band"]) == tb], key=lambda q: (q["sira"], q["cap"], q["derinlik"]))
            zincir = []
            for q in lst:
                ayni = [z for z in zincir if z["son"] == q["sira"] and z["seg"] == q["seg"]]
                if ayni: z = ayni[0]
                else:
                    ad = [z for z in zincir if z["son"] == q["sira"] - 1 and abs(z["cap"] - q["cap"]) <= L2]
                    z = min(ad, key=lambda z: abs(z["cap"] - q["cap"])) if ad else None
                    if z is None: z = {"liste": []}; zincir.append(z)
                z["liste"].append(q); z["son"] = q["sira"]; z["seg"] = q["seg"]; z["cap"] = q["cap"]
            for z in zincir:
                strs = [ms for ms in z["liste"] for _ in range(self.str_masa)]
                n = math.ceil(len(strs) / MX)
                b0, r0 = divmod(len(strs), n); i0 = 0
                for i in range(n):
                    c = b0 + 1 if i < r0 else b0
                    bloklar.append(strs[i0:i0 + c]); i0 += c
        # A.1 zorlaması: bloğun en iyi masa başı konumunda bile tek yön > sınır ise ikiye böl
        lim = self.dc_lim
        def gecici_inv(h, tf=None):
            tf = tf or h["taraf"]; ux = h["loc"].bounds[2] if tf == "E" else h["loc"].bounds[0]
            return {"masa": h, "taraf": tf, "x": ux + (0.4 if tf == "E" else -0.4), "y": h["y"]}
        def yol_boy(q, inv):
            pts = self.dc_yol(q, inv)[0]
            return sum(math.dist(a, b) for a, b in zip(pts, pts[1:])) + 3.0
        def en_iyi(ms_, hedef=None):
            """Gerçek (masa arası) DC güzergâhıyla en uzun tek yönü en küçük yapan masa başı.
            elektrik.inverter_hiza: "yol" servis yoluna / çite yakın masa başı (varsayılan) · "orta" bloğun ortasındaki sıranın
            masa başı · "optimum" bloktaki tüm masa başlarından en kısa DC'yi veren."""
            hz = (self.P["elektrik"].get("inverter_hiza") or "trafo")
            if hz == "trafo" and hedef is not None:
                # kullanıcı kuralı 19.10.2026: DC tek yön sınırı (80 m / ΔU) içinde kalan en trafoya yakın masa başı — AC kısalır
                uygun, yedek = None, None
                for h in ms_:
                    for tf in ("E", "W"):
                        iv = gecici_inv(h, tf); m_ = max(yol_boy(q, iv) for q in ms_)
                        d_ = abs(iv["x"] - hedef[0]) + abs(iv["y"] - hedef[1])
                        if m_ <= lim and (uygun is None or d_ < uygun[3]): uygun = (m_, h, tf, d_)
                        if yedek is None or m_ < yedek[0]: yedek = (m_, h, tf, d_)
                b_ = uygun or yedek
                return (b_[0], b_[1], b_[2])
            if hz == "optimum":
                aday = list(ms_)
            elif hz == "orta":
                sr = sorted({q["sira"] for q in ms_}); sm = sr[len(sr) // 2]
                aday = [h for h in ms_ if h["sira"] == sm]
                sig = min(q["derinlik"] for q in aday); aday = [h for h in aday if h["derinlik"] == sig]
            else:
                sig = min(q["derinlik"] for q in ms_)
                aday = [h for h in ms_ if h["derinlik"] == sig]
            best = None
            for h in aday:
                iv = gecici_inv(h); m_ = max(yol_boy(q, iv) for q in ms_)
                if best is None or m_ < best[0]: best = (m_, h, h["taraf"])
            return best
        def enuzun(bl):
            return en_iyi(list({id(q): q for q in bl}.values()))[0]
        i = 0
        while i < len(bloklar):
            if len(bloklar[i]) > 1 and enuzun(bloklar[i]) > lim:
                bl = bloklar.pop(i); h = len(bl) // 2
                bloklar[i:i] = [bl[:h], bl[h:]]
            else:
                i += 1
        # H.6 dengeli blok: kısa zincirlerden kalan küçük blokları komşu (aynı taraf, yakın masa başı) bloklarla birleştir —
        # MX'i ve A.1 DC sınırını aşmadan. Az string'li inverter DC/AC'yi hedefin altına çeker.
        def mrk(bl): return (sum(q["uc_x"] for q in bl) / len(bl), sum(q["y"] for q in bl) / len(bl))
        degisti = True
        while degisti:
            degisti = False
            bloklar.sort(key=len)
            for a_ in list(bloklar):
                if a_ not in bloklar or len(a_) >= 0.8 * MX: continue
                ma = mrk(a_)
                aday = sorted([b_ for b_ in bloklar if b_ is not a_ and b_[0]["taraf"] == a_[0]["taraf"] and len(a_) + len(b_) <= MX
                               and math.dist(mrk(b_), ma) <= 2 * lim], key=lambda b_: math.dist(mrk(b_), ma))[:4]
                for b_ in aday:
                    bl = a_ + b_
                    if enuzun(bl) <= lim:
                        bloklar.remove(a_); bloklar.remove(b_); bloklar.append(bl); degisti = True; break
        # H.7 en az inverter: k komşu küçük blok toplamı (k−1)·MX'e sığıyorsa k−1 bloğa yeniden böl (A.1 korunur).
        #     Örn. MX=3, 2+2+2 → 3+3. İnverter sayısı alt sınıra (⌈string/MX⌉) iner; gereksiz inverter/TR çıkmaz.
        def _yeniden_bol(grup, k):
            strs = sorted([q for bl in grup for q in bl], key=lambda q: (q["sira"], q["uc_x"]))
            b0, r0 = divmod(len(strs), k); out, i0 = [], 0
            for i in range(k):
                c = b0 + 1 if i < r0 else b0; out.append(strs[i0:i0 + c]); i0 += c
            return out
        alt_sinir = math.ceil(sum(len(b) for b in bloklar) / MX)
        if e.get("inverter_adet"): alt_sinir = max(alt_sinir, int(e["inverter_adet"]))   # kullanıcı adedinin altına inilmez
        for _ in range(200):
            if len(bloklar) <= alt_sinir: break
            kucuk = sorted([b for b in bloklar if len(b) < MX], key=len)
            yapildi = False
            for a_ in kucuk:
                ma = mrk(a_)
                kom = sorted([b_ for b_ in bloklar if b_ is not a_ and len(b_) < MX and b_[0]["taraf"] == a_[0]["taraf"] and math.dist(mrk(b_), ma) <= 2 * lim],
                             key=lambda b_: math.dist(mrk(b_), ma))
                grup = [a_]
                for b_ in kom:
                    grup.append(b_)
                    k = len(grup) - 1
                    if sum(len(g) for g in grup) <= k * MX:
                        yeni = _yeniden_bol(grup, k)
                        if all(enuzun(y) <= lim for y in yeni):
                            for g in grup: bloklar.remove(g)
                            bloklar += yeni; yapildi = True
                        break
                if yapildi: break
            if not yapildi: break
        # TR ataması: bloklar kuzeyden güneye (ort. y), TR başına eşit sayıda
        if self.ic_yollar:   # A.7: TR blokları iç yol boyunca (yol sırası, kuzeyden güneye); TM o yolun kenarında
            def yol_no(bl):
                """Bloğun inverteri hangi yolun kenarında: masa başı (taraf) yönündeki ilk iç yol; yoksa en yakın."""
                tf = bl[0]["taraf"]; ux = sum(q["uc_x"] for q in bl) / len(bl); uy = sum(q["y"] for q in bl) / len(bl); R = self.ic_yollar
                ray = LineString([(ux, uy), (ux + (5000 if tf == "E" else -5000), uy)])   # AG'nin gideceği ilk iç yol kanalı
                vur = [(abs(ray.intersection(k).centroid.x - ux), i) for i in range(len(R)) for k in R[i]["kanal"] if ray.intersects(k)]
                if vur: return min(vur)[1]
                kapsar = [i for i in range(len(R)) if R[i]["yol"].bounds[1] - 1 <= uy <= R[i]["yol"].bounds[3] + 1
                          and R[i]["yol"].intersects(LineString([(R[i]["x0"] - 1, uy), (R[i]["x1"] + 1, uy)]))]
                yon = [i for i in kapsar if (R[i]["x0"] >= ux - 1.5 if tf == "E" else R[i]["x1"] <= ux + 1.5)]
                if yon: return min(yon, key=lambda i: abs((R[i]["x0"] if tf == "E" else R[i]["x1"]) - ux))
                aday = kapsar or list(range(len(R)))
                return min(aday, key=lambda i: abs(R[i]["xk"] - ux))
            bloklar.sort(key=lambda bl: (yol_no(bl), -sum(q["y"] for q in bl) / len(bl)))
        else:
            bloklar.sort(key=lambda bl: (-sum(q["y"] for q in bl) / len(bl), sum(q["x"] for q in bl) / len(bl)))
        if e.get("inverter_adet"):   # istenen adede tamamla: en büyük blok ikiye bölünür (eksik adet kalmaz)
            while len(bloklar) < int(e["inverter_adet"]):
                bl = max(bloklar, key=len)
                if len(bl) < 2: break
                bloklar.remove(bl); h = len(bl) // 2; bloklar += [bl[:h], bl[h:]]
        if e.get("inverter_adet") and len(bloklar) > int(e["inverter_adet"]):
            # kullanıcı adedi kesin (kullanıcı kuralı 19.10.2026): A.1 yüzünden fazla çıkan bloklar en yakın komşuyla birleştirilir;
            # DC tek yön sınırı aşılırsa kontrol ✖ ve uyarı yazılır, inverter sayısı artırılmaz
            fazla = len(bloklar) - int(e["inverter_adet"])
            while len(bloklar) > int(e["inverter_adet"]):
                best = None
                for a_ in bloklar:
                    for b_ in bloklar:
                        if a_ is b_ or a_[0]["taraf"] != b_[0]["taraf"]: continue
                        k = (len(a_) + len(b_), math.dist(mrk(a_), mrk(b_)))
                        if best is None or k < best[0]: best = (k, a_, b_)
                if best is None:   # farklı taraf: en yakın iki blok
                    for a_ in bloklar:
                        for b_ in bloklar:
                            if a_ is b_: continue
                            k = (len(a_) + len(b_), math.dist(mrk(a_), mrk(b_)))
                            if best is None or k < best[0]: best = (k, a_, b_)
                _, a_, b_ = best; i_ = bloklar.index(a_); bloklar.remove(a_); bloklar.remove(b_); bloklar.insert(min(i_, len(bloklar)), a_ + b_)
            if not getattr(self, "_adet_uy", False):
                self._adet_uy = True
                self.uyari.append(f"İnverter adedi kullanıcıdan: {int(e['inverter_adet'])} (A.1 DC sınırı tek yön ≤ {self.dc_lim:.0f} m için {int(e['inverter_adet']) + fazla} gerekirdi; aşan stringler kontrolde ✖). Modül Vmp/Imp girilirse sınır gerilim düşümünden hesaplanır.")
        # çizimdeki DC ataması (AeCAD DC ata / DC oto, kullanıcı kuralı 19.10.2026): masa → inverter bloğu çizimdeki gibidir;
        # çizimde atanmamış masa en yakın inverterin bloğuna eklenir. DC çiz boyları (string başına L) metraja aynen geçer.
        da = e.get("dc_atama") or []
        if da:
            inv_pts, atm = [], {}
            for d in da:
                q = self._loc(d["m"]); iq = self._loc(d["i"])
                k = next((j for j, p in enumerate(inv_pts) if math.dist(p, (iq.x, iq.y)) < 0.5), None)
                if k is None: inv_pts.append((iq.x, iq.y)); k = len(inv_pts) - 1
                atm.setdefault(k, []).append(((q.x, q.y), d.get("L")))
            yeni, atanmamis = {k: [] for k in atm}, []
            for ms in self.masalar:
                ms.pop("dc_cizim_L", None); best = None
                for k, lst in atm.items():
                    for p, Ls in lst:
                        dd = math.dist(p, (ms["x"], ms["y"]))
                        if dd < 2.0 and (best is None or dd < best[0]): best = (dd, k, Ls)
                if best: yeni[best[1]] += [ms] * self.str_masa; ms["dc_cizim_L"] = best[2]
                else: atanmamis.append(ms)
            for ms in atanmamis:
                k = min(yeni, key=lambda k: math.dist(inv_pts[k], (ms["x"], ms["y"]))); yeni[k] += [ms] * self.str_masa
            bloklar = [b for b in yeni.values() if b]
            bloklar.sort(key=lambda bl: (-sum(q["y"] for q in bl) / len(bl), sum(q["x"] for q in bl) / len(bl)))
            if atanmamis and not getattr(self, "_da_uy", False):
                self._da_uy = True; self.uyari.append(f"DC ataması çizimden: {len(atanmamis)} masa çizimde atanmamıştı, en yakın invertere bağlandı.")
        ni = len(bloklar)
        # H.8: TR sayısı GÜÇTEN — tesis AC çıkışı = min(Σ inverter AC, DC / DC-AC hedefi). A.1 yüzünden inverter adedi
        #      artsa bile DC'den fazla AC çıkmaz; kullanıcı trafo gücü verdiyse TR = ⌈AC çıkış / (kVA × %yük)⌉.
        IT = e["inverter_tr"]
        _kw = (self._sys[2] if self._sys else None) or e.get("inverter_ac_kw")
        _kva = e.get("trafo_kva") if not getattr(self, "_oto_trafo", True) else None
        if _kw and _kva and guc:
            _dc = sum(len(b) for b in bloklar) * e["string_modul"] * guc / 1000.0
            _ac = min(ni * _kw, _dc / (e.get("dcac_hedef") or 1.25))
            _yk = (e.get("trafo_yuklenme_max_pct") or 90.0) / 100.0
            _nt = max(1, math.ceil(_ac / (_kva * _yk) - 1e-9))
            if _nt > 1 and _ac / _yk <= TRAFO_KVA_STD[-1]:
                # H.9 (kullanıcı kuralı 19.10.2026): birden çok küçük trafo yerine tek, bir üst standart trafo (ör. 2 × 1250 → 1 × 1600)
                yeni = _trafo_sec(_ac / _yk, 400)
                if not getattr(self, "_tek_trafo", None):
                    self._tek_trafo = (_kva, yeni)
                    self.uyari.append(f"Trafo: {_nt} × {_kva} kVA yerine tek {yeni} kVA (çıkış {_ac:,.0f} kW, %{_yk*100:.0f} yük ≤ {yeni*_yk:,.0f} kW).")
                e["trafo_kva"] = yeni; _nt = 1
            IT = max(1, math.ceil(ni / _nt))
        n_tot = max(1, math.ceil(ni / IT))
        if self.ic_yollar:   # A.7: her TR tek bir iç yolun blokları (TR yollar arası bölünmez); yol başına eşit dağıtım
            yollar = {}
            for bl in bloklar: yollar.setdefault(yol_no(bl), []).append(bl)
            tr_bl = []
            sabit = getattr(self, "_tr_yol", None) or {}; self._tr_yol_son = {}
            if sum(max(1, math.ceil(len(l) / IT)) for l in yollar.values()) > n_tot:
                # H.8: TR sayısı toplam güçten (⌈inverter / TR başına⌉) — yol başına TR açılmaz; komşu yollar tek TR'de birleşir
                sira_ = [bl for k_ in sorted(yollar, key=lambda k: self.ic_yollar[k]["xk"]) for bl in yollar[k_]]
                s_ = [round(i * ni / n_tot) for i in range(n_tot + 1)]
                tr_bl = [sira_[s_[t]:s_[t + 1]] for t in range(n_tot)]
            else:
              for k_ in sorted(yollar):
                lst = yollar[k_]; nt = max(1, math.ceil(len(lst) / IT))
                if k_ in sabit: nt = max(nt, sabit[k_])       # yalnız artabilir → TM döngüsü yakınsar
                self._tr_yol_son[k_] = nt
                s_ = [round(i * len(lst) / nt) for i in range(nt + 1)]
                tr_bl += [lst[s_[t]:s_[t + 1]] for t in range(nt)]
        else:
            nt = n_tot
            s_ = [round(i * ni / nt) for i in range(nt + 1)]
            tr_bl = [bloklar[s_[t]:s_[t + 1]] for t in range(nt)]
        self.n_tr = len(tr_bl)
        self.inverterler, self.stringler, self.tr_gruplari = [], [], []
        for t in range(self.n_tr):
            tb = list(tr_bl[t])
            tb.sort(key=lambda bl: (min(q["sira"] for q in bl), sum(q["x"] for q in bl)))
            grp = []
            for i, blok in enumerate(tb):
                inv = {"tr": t + 1, "no": i + 1, "ad": f"TR{t+1}-ACB1-INV{i+1}", "n_str": len(blok), "masalar": []}
                for j, ms in enumerate(blok):
                    sad = f"{inv['ad']}-STR{j+1}"
                    ms["tr"] = t + 1; ms.setdefault("str", []).append(sad); ms["inv"] = inv["ad"]
                    self.stringler.append({"ad": sad, "masa": ms, "inv": inv})
                    if ms not in inv["masalar"]: inv["masalar"].append(ms); grp.append(ms)
                # A.4: masa başı; en uzun tek yön DC'yi küçülten sığ masa
                if getattr(self, "tm_loc", None) and t < len(self.tm_loc): _c = self.tm_loc[t].centroid; hd = (_c.x, _c.y)
                else:
                    _b = self.alan_loc.bounds; hd = (_b[2] if e["tm_taraf"] == "dogu" else _b[0], sum(q["y"] for q in inv["masalar"]) / len(inv["masalar"]))
                _, hm, htf = en_iyi(inv["masalar"], hd)
                inv["masa"], inv["taraf"] = hm, htf
                if (e.get("inverter_konum") or "arka") == "arka":   # kullanıcı kuralı 19.10.2026: inverter masanın arkasında (kuzey açıklık), masa ucuna yakın
                    inv["x"] = (hm["loc"].bounds[2] - 1.0) if htf == "E" else (hm["loc"].bounds[0] + 1.0)
                    inv["y"] = hm["loc"].bounds[3] + 0.5; inv["arka"] = True
                else:
                    inv["x"] = (hm["loc"].bounds[2] + 0.4) if htf == "E" else (hm["loc"].bounds[0] - 0.4)
                    inv["y"] = hm["y"]
                inv["yol_tarafi"] = (hm["derinlik"] == 0)
                self.inverterler.append(inv)
            self.tr_gruplari.append(grp)
        # kullanıcı düzenlemesi: inverter taşıma — kendi masalarından hedefe en yakın masa başına (A.4 korunur)
        for t in e.get("inv_tasi") or []:
            if not self.inverterler: break
            f, to = self._loc(t["den"]), self._loc(t["ye"])
            inv = min(self.inverterler, key=lambda i: math.dist((i["x"], i["y"]), (f.x, f.y)))
            if math.dist((inv["x"], inv["y"]), (f.x, f.y)) > 40: continue
            best = None
            for ms in inv["masalar"]:
                for tf in ("E", "W"):
                    hx = ms["loc"].bounds[2] + 0.4 if tf == "E" else ms["loc"].bounds[0] - 0.4
                    dd = math.dist((hx, ms["y"]), (to.x, to.y))
                    if best is None or dd < best[0]: best = (dd, ms, tf, hx)
            _, ms, tf, hx = best
            inv["masa"], inv["taraf"], inv["x"], inv["y"] = ms, tf, hx, ms["y"]; inv["elle"] = True
        # çizimdeki inverter konumları (kullanıcı kuralı 19.10.2026): her inverter en yakın çizim konumuna, kendi masalarının başında
        ik = [self._loc(p) for p in (e.get("inv_konumlari") or [])]
        if ik and self.inverterler:
            ciftler = sorted(((math.dist((i["x"], i["y"]), (q.x, q.y)), a, b) for a, i in enumerate(self.inverterler) for b, q in enumerate(ik)))
            ia, ib = set(), set()
            for d_, a, b in ciftler:
                if a in ia or b in ib: continue
                ia.add(a); ib.add(b); inv = self.inverterler[a]; q = ik[b]
                best = None
                for ms in inv["masalar"]:
                    for tf in ("E", "W"):
                        hx = ms["loc"].bounds[2] + 0.4 if tf == "E" else ms["loc"].bounds[0] - 0.4
                        dd = math.dist((hx, ms["y"]), (q.x, q.y))
                        if best is None or dd < best[0]: best = (dd, ms, tf, hx)
                if best:
                    _, ms, tf, hx = best
                    inv["masa"], inv["taraf"], inv["x"], inv["y"] = ms, tf, hx, ms["y"]; inv["elle"] = True
            if len(ik) != len(self.inverterler) and not getattr(self, "_ik_uyari", False):
                self._ik_uyari = True
                self.uyari.append(f"Çizimde {len(ik)} inverter var, projede {len(self.inverterler)}; konumu olmayanlar otomatik yerleştirildi.")

    def tr_ac(self, t):
        """TR çıkış gücü (kW): min(Σ inverter AC, TR'nin DC'si / DC-AC hedefi) — DC'den fazla AC üretilemez."""
        e = self.P["elektrik"]; guc = self.P["modul"]["guc_wp"] or 0
        invs = [i for i in self.inverterler if i["tr"] == t + 1]
        ac = sum((i.get("ac_kw") or e["inverter_ac_kw"] or 0) for i in invs)
        dc = sum(i["n_str"] for i in invs) * e["string_modul"] * guc / 1000.0
        return min(ac, dc / (e.get("dcac_hedef") or 1.25)) if dc else ac

    def _oto(self, anahtar, deger_anahtari):
        e = self.P["elektrik"]; v = e.get(anahtar)
        return (e.get(deger_anahtari) is None) if v is None else bool(v)

    def _boyutlandir(self):
        """H: trafo bandına göre UNIFORM inverter gücü + AG gerilimi (inverter_ata'da _sys'e konur);
        trafo gücü her TR için AC/%yük → bir üst standart (1600'den kaçınılır), tüm TR'ler tek tip (en büyük gereken).
        inverter_oto=False → kullanıcının inverter_ac_kw'si; trafo_oto=False → kullanıcının trafo_kva'sı korunur."""
        e = self.P["elektrik"]; guc = self.P["modul"]["guc_wp"]
        if not guc or not self.inverterler:
            return
        str_kwp = e["string_modul"] * guc / 1000.0
        dcac = e.get("dcac_hedef") or 1.25
        dc_kwp = len(self.stringler) * str_kwp
        sys = getattr(self, "_sys", None)
        if sys and self._oto_inv:
            volt, tger, inv_kw = sys
            # bloklar kesinleştikten sonra (A.1 bölme + birleştirme) band içinde gerçek DC/AC'yi hedefe en yakın yapan güç
            n_ = len(self.inverterler)
            inv_kw = min(getattr(self, "_band", [inv_kw]), key=lambda c: abs(dc_kwp / (n_ * c) - dcac)); self._sys = sys = (volt, tger, inv_kw)
            onceki = (e["inverter_ac_kw"], e["ag_gerilim_v"])
            for inv in self.inverterler: inv["ac_kw"] = inv_kw
            e["inverter_ac_kw"] = inv_kw; e["ag_gerilim_v"] = volt; e["trafo_gerilim"] = tger
            self._inv_oto = (onceki[0], inv_kw, volt)
        else:
            for inv in self.inverterler: inv["ac_kw"] = e["inverter_ac_kw"]
        ac_top = sum((i.get("ac_kw") or e["inverter_ac_kw"] or 0) for i in self.inverterler)
        # trafo: TR başına AC ≤ %yük → üst standart (1600 kaçın); tüm TR'ler en büyük gereken
        yuk = (e.get("trafo_yuklenme_max_pct") or 90.0) / 100.0
        ac_tr = [self.tr_ac(t) for t in range(self.n_tr)]
        if self._oto_trafo and ac_top:
            volt0 = _sistem_sec(_trafo_sec(sum(ac_tr) / yuk))[0] if not sys else sys[0]
            self.tr_kva = [_trafo_sec(ac / yuk, volt0) for ac in ac_tr]          # H.4: her TR kendi yüküne göre
            self._trafo_oto = (e["trafo_kva"], self.tr_kva)
            e["trafo_kva"] = max(self.tr_kva)
        else:
            self.tr_kva = [e["trafo_kva"]] * self.n_tr
        if not sys:   # H.5: AG gerilimi trafo gücüne göre (inverter elle verildiyse de)
            volt, tger, _ = _sistem_sec(max(self.tr_kva))
            if e.get("ag_gerilim_oto", True): e["ag_gerilim_v"] = volt; e["trafo_gerilim"] = tger
        # bilgilendirme
        if getattr(self, "_inv_oto", None) and ac_top:
            self.uyari.append(f"H boyutlandırma: {len(self.inverterler)} × {self._inv_oto[1]} kW inverter @ {self._inv_oto[2]} V AG "
                              f"= {ac_top:.0f} kW AC · DC {dc_kwp:.0f} kWp · plant DC/AC {dc_kwp/ac_top:.2f} "
                              f"(hedef {dcac:g}; önceki giriş {self._inv_oto[0]} kW).")
        if getattr(self, "_trafo_oto", None):
            ts = {}
            for v in self._trafo_oto[1]: ts[v] = ts.get(v, 0) + 1
            self.uyari.append("Trafo gücü yüke göre seçildi: " + " + ".join(f"{n}×{v}" for v, n in sorted(ts.items(), reverse=True)) + f" kVA (TR başına AC ≤ %{(e.get('trafo_yuklenme_max_pct') or 90):g}).")

    def _ag_kesit_sec(self):
        """D / EKAT md.58 / Gömce 8.2: AG hattının gerilim düşümü sınırı aşarsa O HATTIN kesiti büyür — üç damarlı kabloda
        pratik üst sınır 3×300; daha büyüğü paralel hat: 2×(3×240) → 2×(3×300) → 3×(3×300) → 4×(3×300). Kısa hatlar temel kesitte kalır."""
        e = self.P["elektrik"]
        rho = e["rho_cu"] if e["ac_iletken"] == "Cu" else e["rho_al"]
        S0, ad0 = e["ac_kesit_mm2"], e["ac_kablo"]
        tip = ad0.split(" ", 1)[1] if " " in ad0 else "NA2XY"
        merdiven = [(1, S0, ad0)] + [(n, c, f"{n}×(3x{c}/{c // 2}) {tip}") for n, c in [(2, 240), (2, 300), (3, 300), (4, 300)] if n * c > S0]
        for i in self.inverterler: i["ag_n"], i["ag_s"], i["ag_kablo"] = 1, S0, ad0
        if not e.get("ag_kesit_oto", True) or not e["inverter_ac_kw"] or not getattr(self, "inverterler", None):
            return
        def du(i, Seff):
            I = (i.get("ac_kw") or e["inverter_ac_kw"]) * 1000 / (math.sqrt(3) * e["ag_gerilim_v"] * e["cosphi"])
            return math.sqrt(3) * i["ac_m"] * I * rho * e["cosphi"] / Seff / e["ag_gerilim_v"] * 100
        buy, kalan = 0, []
        for i in self.inverterler:
            for n, c, ad in merdiven:
                i["ag_n"], i["ag_s"], i["ag_kablo"] = n, c, ad
                if du(i, n * c) <= e["ac_dusum_max_pct"]: break
            if i["ag_n"] * i["ag_s"] > S0: buy += 1
            if du(i, i["ag_n"] * i["ag_s"]) > e["ac_dusum_max_pct"]: kalan.append(i["ad"])
        if buy: self.uyari.append(f"AG kesiti {buy} uzun hatta büyütüldü (paralel kablo; AG ΔU ≤ %{e['ac_dusum_max_pct']:g}).")
        if kalan: self.uyari.append(f"AG ΔU {len(kalan)} hatta 4×(3×300)'de bile sınırı aşıyor ({', '.join(kalan[:4])}…) — köşkü yük merkezine yaklaştır ya da TR sayısını artır.")

    # ---------------------------------------------------------------- 5) güzergâh
    def _halka_yol(self, p, q):
        from shapely.ops import substring
        R = self.halka; L = R.length
        d1, d2 = R.project(Point(p)), R.project(Point(q))
        a, b = min(d1, d2), max(d1, d2)
        if b - a <= L / 2:
            g = substring(R, a, b)
        else:
            parca1 = substring(R, b, L); parca2 = substring(R, 0, a)
            g = LineString(list(parca1.coords) + list(parca2.coords)[1:])
        c = list(g.coords)                              # p ucundan başlasın (düz atlama olmasın)
        if len(c) < 2: return LineString([tuple(p), tuple(q)])   # iki uç halkada aynı noktaya düşüyor
        if Point(c[0]).distance(Point(p)) > Point(c[-1]).distance(Point(p)): c.reverse()
        return LineString(c)

    def _halkaya(self, x, y, taraf):
        """Sıra açıklığından (y sabit) yol tarafındaki halka kesişimine."""
        mnx, _, mxx, _ = self.halka.bounds
        ln = LineString([(x, y), ((mxx + 10) if taraf == "E" else (mnx - 10), y)])
        k = ln.intersection(self.halka)
        pts = [k] if k.geom_type == "Point" else list(getattr(k, "geoms", []))
        if not pts:
            p = self.halka.interpolate(self.halka.project(Point(x, y))); return (p.x, p.y)
        p = min(pts, key=lambda q: abs(q.x - x)); return (p.x, p.y)

    def guzergah(self):
        self._ac_kul = set()
        e, m = self.P["elektrik"], self.P["masa"]
        self.dc_hat, self.dc_ust, self.ac_hat = [], [], []
        dc_toplam = 0.0; sayac = {}
        for s in self.stringler:
            ms, inv = s["masa"], s["inv"]
            pts, _ = self.dc_yol(ms, inv)
            ls = LineString(pts)
            L1 = ls.length + 3.0                                 # tek yön (A.1): güzergâh + iniş
            s["dc_tek_yon_m"] = L1
            s["dc_m"] = 2 * L1 + (self.masa_L if self.str_donus() else 0.0)   # (+)(−) ev dönüşü; masa içi dönüş yalnız string uçları masanın iki ucundaysa
            Lc = ms.get("dc_cizim_L")                            # çizimdeki DC çiz boyu (AeCAD) esastır
            if Lc:
                j = sayac.get(id(ms), 0); sayac[id(ms)] = j + 1
                if j < len(Lc) and Lc[j]: s["dc_m"] = float(Lc[j]); s["dc_cizim"] = True
            dc_toplam += s["dc_m"]
            s["dc_hat"] = ls
            self.dc_hat.append(ls)                               # açıklık + masa arası boşluk; masa altından geçmez
        self.dc_toplam = dc_toplam
        ac_toplam = 0.0
        for inv in self.inverterler:
            tm = self.tm_loc[inv["tr"] - 1].centroid
            ya = (inv["masa"]["loc"].bounds[3] + self.acik / 2 + 0.6) if inv.get("arka") else (inv["masa"]["loc"].bounds[1] - self.acik / 2 + 0.6)  # A.3: açıklık (DC'den ayrı hendek)
            if getattr(self, "ag", None): tq = nearest_points(self.ag["U"], tm)[0]; tmh = Point(tq.x, tq.y)
            else: tmh = self.halka.interpolate(self.halka.project(tm))
            # A.9: sıra açıklığından kanala iki yönden hangisi ADP'ye daha kısa götürüyorsa o (uzun dolanma yok)
            ady = []
            for tf in ("E", "W"):
                h_ = self._aga(inv["x"], ya, tf); a_ = self.ag_yol(h_, (tmh.x, tmh.y))
                ady.append((abs(h_[0] - inv["x"]) + abs(h_[1] - ya) + a_.length, h_, a_))
            _, h, arc = min(ady, key=lambda t: t[0])
            ls = LineString([(inv["x"], inv["y"]), (inv["x"], ya), h] + list(arc.coords) + [(tm.x, tm.y)])
            inv["ac_m"] = ls.length + 10.0
            inv["ac_hendek"] = [LineString([(inv["x"], ya), h]), arc]
            ck = self._cizim_ac(inv)                 # çizimdeki AC kablo (AeCAD AC kablo / AC oto) esastır
            if ck is not None:
                ls, pay = ck; inv["ac_m"] = ls.length + pay; inv["ac_hendek"] = [ls]; inv["ac_cizim"] = True
            ac_toplam += inv["ac_m"]; self.ac_hat.append(ls)
        self.ac_toplam = ac_toplam
        # OG: DM'den halka boyunca, halka konumuna göre sıralı zincir
        R = self.halka
        dm = self.dm_loc.centroid; d0 = R.project(dm)
        tms = sorted(range(len(self.tm_loc)), key=lambda i: (R.project(self.tm_loc[i].centroid) - d0) % R.length)
        # kısa taraftan başla: saat yönü mü tersi mi daha kısa zincir
        def zincir(sira):
            out, onceki, ad = [], dm, "DM"
            for i in sira:
                q = self.tm_loc[i].centroid
                a1 = R.interpolate(R.project(onceki)); a2 = R.interpolate(R.project(q))
                arc = self._halka_yol((a1.x, a1.y), (a2.x, a2.y))
                ls = LineString([(onceki.x, onceki.y)] + list(arc.coords) + [(q.x, q.y)])
                out.append({"den": ad, "ye": f"TM{i+1}", "m": ls.length + 20.0, "hat": ls}); onceki, ad = q, f"TM{i+1}"
            return out
        if getattr(self, "dm_ortak", False) and len(self.tm_loc) == 1:   # DM + TM aynı köşkte: köşk içi bağlantı
            self.og = [{"den": "DM", "ye": "TM1", "m": 10.0, "hat": LineString(), "kosk_ici": True}]
        elif getattr(self, "ag", None):   # iç yollu ağ: DM'den en yakın komşu sırası, güzergâh kanal ağı üzerinden
            U = self.ag["U"]; P_ = lambda g: (lambda q: (q.x, q.y))(nearest_points(U, g.centroid)[0])
            kalan = list(range(len(self.tm_loc))); sira, onceki = [], P_(self.dm_loc)
            while kalan:
                i = min(kalan, key=lambda i: self.ag_mesafe(onceki, P_(self.tm_loc[i]))); sira.append(i); kalan.remove(i); onceki = P_(self.tm_loc[i])
            out, onc, ad = [], self.dm_loc, "DM"
            for i in sira:
                q = self.tm_loc[i]; arc = self.ag_yol(P_(onc), P_(q))
                ls = LineString([(onc.centroid.x, onc.centroid.y)] + list(arc.coords) + [(q.centroid.x, q.centroid.y)])
                out.append({"den": ad, "ye": f"TM{i+1}", "m": ls.length + 20.0, "hat": ls}); onc, ad = q, f"TM{i+1}"
            self.og = out
        else:
            z1, z2 = zincir(tms), zincir(list(reversed(tms)))
            self.og = min(z1, z2, key=lambda z: sum(o["m"] for o in z))
        self.hendek_dc = unary_union(self.dc_hat) if self.dc_hat else LineString()
        self.hendek_ac = unary_union([g for i in self.inverterler for g in i["ac_hendek"]] + [o["hat"] for o in self.og])
        self.kanal_kademe()
        # ---- kablo geçişleri (EKAT md.58): AG kablonun iç yolu enine geçtiği yerler boru içinde; DC–AG hendek kesişimleri korumalı
        self.yol_gecis, self.kesisim = [], []
        for inv in self.inverterler:
            seg = inv["ac_hendek"][0]
            for r in self.ic_yollar:
                g = seg.intersection(r["yol"])
                if not g.is_empty and g.length > 0.5:
                    c = g.centroid; self.yol_gecis.append({"x": c.x, "y": c.y, "m": g.length + 2.0, "kablo": inv["ad"], "yol": r["no"]})
        k = self.hendek_dc.intersection(self.hendek_ac) if not self.hendek_dc.is_empty else None
        pts = [] if k is None or k.is_empty else ([k] if k.geom_type == "Point" else [g for g in getattr(k, "geoms", []) if g.geom_type == "Point"])
        for q in pts:
            if all(math.dist((q.x, q.y), (o["x"], o["y"])) > 1.0 for o in self.kesisim): self.kesisim.append({"x": q.x, "y": q.y})

    def _cizim_ac(self, inv):
        """elektrik.ac_hatlar = [{"pts": [[x,y],…], "pay": 10}] (gerçek koordinat): inverterden başlayan hat (≤ 6 m) o inverterin AC kablosu."""
        L = self.P["elektrik"].get("ac_hatlar") or []
        if not L: return None
        kul = self.__dict__.setdefault("_ac_kul", set())
        best = None
        for k, h in enumerate(L):
            if k in kul or len(h.get("pts") or []) < 2: continue
            p0 = self._loc(h["pts"][0]); d = math.dist((p0.x, p0.y), (inv["x"], inv["y"]))
            if d <= 6 and (best is None or d < best[0]): best = (d, k, h)
        if not best: return None
        kul.add(best[1]); h = best[2]
        return LineString([(q.x, q.y) for q in (self._loc(p) for p in h["pts"])]), float(h.get("pay") or 10)

    def kanal_kademe(self):
        """Ortak AG/OG kanalı (kullanıcı kuralı 19.10.2026, A.9): kablolar tek kanalda; kanal genişliği o parçadan geçen
        AC devre sayısıyla kademeli artar, kesit değiştiği yerde DETAY-n. Her parça için n (AC devre), og (OG var mı), b (m)."""
        hd = self.P["hendek"]; tb, ar, oe = hd.get("ac_kanal_taban_m", 0.60), hd.get("ac_devre_artis_m", 0.20), hd.get("og_ek_m", 0.10)
        ac_g = [unary_union(i["ac_hendek"]) for i in self.inverterler]
        og_g = [o["hat"] for o in self.og if not o["hat"].is_empty]
        U = self.hendek_ac; parcalar = [] if U.is_empty else (list(U.geoms) if hasattr(U, "geoms") else [U])
        def gen(n, og): return hd["genislik_m"] if n == 0 else round(tb + ar * (n - 1) + (oe if og and n >= 2 else 0.0), 2)
        kanal = []
        for ls in parcalar:
            if ls.geom_type != "LineString": continue
            c = list(ls.coords); cur = None
            for a, b in zip(c, c[1:]):
                if math.dist(a, b) < 1e-3: continue
                m = Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                n = sum(1 for g in ac_g if g.distance(m) < 0.05); og = any(g.distance(m) < 0.05 for g in og_g)
                if cur and cur["n"] == n and cur["og"] == og: cur["pts"].append(b)
                else:
                    cur = {"n": n, "og": og, "pts": [a, b]}; kanal.append(cur)
        tipler = sorted({(k["n"], k["og"]) for k in kanal})
        self.kanal_tip = []
        for j, (n, og) in enumerate(tipler):
            L = sum(LineString(k["pts"]).length for k in kanal if (k["n"], k["og"]) == (n, og))
            self.kanal_tip.append({"detay": j + 1, "n": n, "og": og, "b": gen(n, og), "m": L})
        no = {(t["n"], t["og"]): t for t in self.kanal_tip}
        self.kanal = [{"geom": LineString(k["pts"]), "n": k["n"], "og": k["og"], "b": no[(k["n"], k["og"])]["b"], "detay": no[(k["n"], k["og"])]["detay"]} for k in kanal]

    # ---------------------------------------------------------------- 6) topraklama
    def topraklama(self):
        t = self.P["topraklama"]
        goz = t["goz_max_m"]
        ser, baglanti = [], []
        minx, miny, maxx, maxy = self.alan_loc.bounds
        nh = max(1, int(goz // self.P["masa"]["pitch_m"]))
        for sg, lst in self.segs.items():
            if lst[0]["sira"] % nh == 0:
                x0 = min(q["loc"].bounds[0] for q in lst); x1 = max(q["loc"].bounds[2] for q in lst)
                yy = lst[0]["loc"].bounds[1] - 0.3          # sıra açıklığında, ön kolon hizasının dışında
                ser.append(LineString([(x0, yy), (x1, yy)]))
        dikeyler = []
        siralar = sorted(self.siralar)
        x = minx + goz / 2
        while x < maxx:                         # düşey şerit: sıraları yalnız masa arası boşluktan keser
            pts, xc = [], x
            for s_ in siralar:
                r = self.siralar[s_]
                if not (r["m"][0]["loc"].bounds[0] - 1 <= x <= r["m"][-1]["loc"].bounds[2] + 1):
                    if len(pts) >= 2: g_ = LineString(pts); dikeyler.append(g_); ser.append(g_)
                    pts = []; continue                  # sıra atlanırsa şerit kesilir (çapraz masa üstünden geçmez)
                xg = self.serbest_x(s_, x)
                yu, ya_ = r["y1"] + self.acik / 2, r["y0"] - self.acik / 2
                if pts: pts.append((xg, yu))
                else: pts.append((xg, yu))
                pts.append((xg, ya_))
            if len(pts) >= 2:
                g = LineString(pts); dikeyler.append(g); ser.append(g)
            x += goz
        dik_u = unary_union(dikeyler) if dikeyler else LineString()
        kopru = 0
        for sg, lst in self.segs.items():
            kesen = [ms for ms in lst if not dik_u.is_empty and ms["loc"].distance(dik_u) < 0.6]
            if t["mod"] == "sira_serit":
                for ms in lst: baglanti.append((ms["loc"].bounds[0] + 0.3, ms["loc"].bounds[1] + 0.3))
            else:
                if not kesen:
                    ms = lst[0]; p0 = (ms["loc"].bounds[0] - 0.3, ms["loc"].bounds[1] - 0.3)
                    if ser:
                        nr = min(ser, key=lambda g: g.distance(Point(p0))); q = nr.interpolate(nr.project(Point(p0)))
                        ser.append(LineString([p0, (q.x, q.y)]))
                    kesen = [ms]
                for ms in kesen: baglanti.append((ms["x"], ms["loc"].bounds[1] + 0.3))
                kopru += len(lst) - 1
        cit_loc = affinity.rotate(self.cit, -self.az, origin=self.merkez) if self.az else self.cit
        halkalar = [LineString(r.coords) for r in dis_halkalar(cit_loc.buffer(-1.0, join_style=2))]
        ser += halkalar
        halka = unary_union(halkalar) if len(halkalar) > 1 else halkalar[0]
        yol_ser = [k for r_ in self.ic_yollar for k in r_["kanal"]]     # A.7: iç yol kanalı boyunca şerit (sıra şeritlerini ve çevre halkasını bağlar)
        ser += yol_ser
        cubuk = []
        for tm in self.tm_loc + ([] if getattr(self, "dm_ortak", False) else [self.dm_loc]):
            r = tm.buffer(1.0, join_style=2).exterior
            ser.append(LineString(r.coords)); cubuk += list(r.coords)[:t["tm_cubuk"]]
            c = tm.centroid
            hedef = unary_union(yol_ser + halkalar) if yol_ser else halka
            q = nearest_points(hedef, c)[0]; p_ = nearest_points(r, q)[0]
            ser.append(LineString([(p_.x, p_.y), (q.x, q.y)]))
        d = 0.0
        for hl in halkalar:
            d = 0.0
            while d < hl.length: cubuk.append(tuple(hl.interpolate(d).coords[0])); d += t["cubuk_araligi_m"]
        cit_bag = []
        for cr in dis_halkalar(cit_loc):
            d = 0.0
            while d < cr.length: cit_bag.append(tuple(cr.interpolate(d).coords[0])); d += t["cit_baglanti_m"]
        self.toprak_serit = unary_union(ser)
        self.toprak_baglanti, self.toprak_kopru, self.toprak_cubuk, self.cit_bag = baglanti, kopru, cubuk, cit_bag

    def guvenlik(self):
        g = self.P["guvenlik"]; self.direkler = []
        for ring, ic in zip(dis_halkalar(self.cit), dis_halkalar(self.cit.buffer(-1.0, join_style=2)) or dis_halkalar(self.cit)):
            coords = list(ring.coords)[:-1]; n = len(coords); direk = []
            for i in range(n):
                a, b, c = coords[i - 1], coords[i], coords[(i + 1) % n]
                v1 = math.atan2(b[1] - a[1], b[0] - a[0]); v2 = math.atan2(c[1] - b[1], c[0] - b[0])
                if abs((v2 - v1 + math.pi) % (2 * math.pi) - math.pi) > math.radians(15): direk.append(b)
            d = 0.0
            while d < ring.length:
                p = ring.interpolate(d).coords[0]
                if all(math.dist(p, q) > g["direk_araligi_m"] * 0.5 for q in direk): direk.append(p)
                d += g["direk_araligi_m"]
            self.direkler += [tuple(ic.interpolate(ic.project(Point(p))).coords[0]) for p in direk]

    def cekme_ozet(self):
        kn = [q for q in (getattr(self, "cekme_cephe", None) or []) if q[2]]
        if not kn: return f"{self.cekme:g} m"
        ad = {"yol": "yol", "parsel": "parsel", "diger": "diğer"}; v = {}
        for _, d, t in kn: v[ad.get(t, t)] = d
        return " · ".join(f"{t} {d:g} m" for t, d in v.items()) + f" · diğer {self.P['parsel']['cekme_mesafesi_m']:g} m"

    def str_donus(self):
        """String masada tek sayıda sıra kaplıyorsa (ör. her sıra ayrı string) uçlar masanın iki ucunda → masa boyu dönüş kablosu.
        Çift sıra (ör. 2V13 tek string: üst sıra git, alt sıra dön) uçlar aynı (inverter) ucunda → dönüş yok, paneller kendi kablosuyla zincir."""
        m = self.P["masa"]; R, k = m["sira_sayisi"], self.str_masa
        return not (R % k == 0 and (R // k) % 2 == 0)

    def string_izi(self, ms):
        """Masa içinde her stringin modül sırası (yerel koordinat): inverter tarafındaki uçtan başlar, sıralar yılan gibi döner.
        Döner: [(ad, [(x,y)…], sıra_sayısı)] — ilk nokta 1. panel (+), son nokta son panel (−)."""
        m = self.P["masa"]; R, Pn = m["sira_sayisi"], m["sira_modul"]
        x0, y0, x1, y1 = ms["loc"].bounds; dx, dy = (x1 - x0) / Pn, (y1 - y0) / R
        sol = ms.get("taraf", "E") == "W"                       # inverter batıdaysa batı ucundan başla
        sira = []
        for r in range(R):
            yy = y1 - (r + 0.5) * dy
            xs = [x0 + (i + 0.5) * dx for i in range(Pn)]
            ileri = (r % 2 == 0) == sol
            sira += [(x, yy) for x in (xs if ileri else xs[::-1])]
        adlar = ms.get("str", []); k = max(1, len(adlar)); N = len(sira) // k
        return [(adlar[j], sira[j * N:(j + 1) * N], max(1, round(N / Pn))) for j in range(k)] if N else []

    def W(self, g):
        return affinity.rotate(g, self.az, origin=self.merkez) if self.az else g

    def Wp(self, x, y):
        if not self.az: return (x, y)
        p = affinity.rotate(Point(x, y), self.az, origin=self.merkez); return (p.x, p.y)

    # ---------------------------------------------------------------- kur
    def kur(self):
        pr = self.P["parsel"]
        kademeler = [pr["cekme_mesafesi_m"]] + [c for c in pr["cekme_kademeleri_m"] if c < pr["cekme_mesafesi_m"]]
        for c in kademeler:                                    # B: 5 m esas, sığmazsa 4/3/2
            self.saha(c); self.ic_yol_kur(); self.dizilim()
            if self.P["masa"].get("konumlar") or not pr["hedef_masa"] or len(self.masalar) >= pr["hedef_masa"]: break
        self.inverter_ata(); self.tm_yerlestir()
        self.dizilim(tm_alanlari=self.tm_engel())
        lim0 = self.P["elektrik"]["dc_tek_yon_max_m"]
        self._tr_yol = None
        for it in range(6):                      # TM yerleşimi masa dizilimini değiştirir: yakınsayana kadar
            self.inverter_ata()
            if getattr(self, "_tr_yol_son", None): self._tr_yol = dict(self._tr_yol_son)   # yol başına TR sayısı yalnız artar
            eski = [t.centroid.coords[0] for t in self.tm_loc]
            self.tm_yerlestir()
            yeni = [t.centroid.coords[0] for t in self.tm_loc]
            if len(eski) == len(yeni) and all(math.dist(a, b) < 0.5 for a, b in zip(eski, yeni)): break
            self.dizilim(tm_alanlari=self.tm_engel())
        else:
            self.inverter_ata()
        for _ in range(3):                       # TR sayısı ile TM sayısı her durumda eşit
            if self.n_tr == len(self.tm_loc): break
            self.tm_yerlestir(); self.dizilim(tm_alanlari=self.tm_engel()); self.inverter_ata()
        if self.n_tr != len(self.tm_loc): self.tm_yerlestir()
        self._boyutlandir()                      # DC/AC hedefi (1.25) → inverter gücü; TR AC/%90 → trafo kVA (üst standart)
        self.guzergah()
        self._ag_kesit_sec()                     # D/EKAT md.58: AG ΔU sınırı aşılırsa AG kesitini büyüt
        if self.max_kesilen: self.uyari.append(f"Hedef güç sınırı (parsel.max_masa = {pr['max_masa']}): {self.max_kesilen} masa yeri kullanılmadı; orta sıralar korundu.")
        self.topraklama(); self.guvenlik()
        self.kontroller(); self.metraj_hesapla()
        return self

    # ---------------------------------------------------------------- kontroller
    def kontroller(self):
        P, e, mod, m = self.P, self.P["elektrik"], self.P["modul"], self.P["masa"]
        K = self.kontrol
        def ekle(ad, ok, deger, kural):
            d = "VERİ YOK" if ok is None else ("⚠" if ok == "uyari" else ("✔" if ok else "✖"))
            K.append({"kontrol": ad, "durum": d, "deger": deger, "kural": kural})
        # E — parsel/koordinat
        ekle("Koordinat sistemi tanımlı", bool(P["parsel"]["koordinat_sistemi"]) or None, P["parsel"]["koordinat_sistemi"] or "boş",
             "E: ED50/UTM 6° ↔ ITRF/GK 3° karışırsa ~90 m hata")
        if P["parsel"]["eigm_alan_m2"]:
            sap = abs(self.parsel_sinir.area - P["parsel"]["eigm_alan_m2"]) / P["parsel"]["eigm_alan_m2"] * 100
            ekle("Parsel alanı EİGM ile uyumlu", sap <= 0.1, f"çizim {self.parsel_sinir.area:,.0f} / EİGM {P['parsel']['eigm_alan_m2']:,.0f} m² → %{sap:.3f}", "E: sapma ≤ %0,1")
        else:
            ekle("Parsel alanı EİGM ile uyumlu", None, f"çizim {self.parsel_sinir.area:,.0f} m², parsel.eigm_alan_m2 yok", "E: sapma ≤ %0,1")
        # B — yerleşim
        kn = [q for q in (getattr(self, "cekme_cephe", None) or []) if q[2]]
        if kn:
            ad = {"yol": "yol", "parsel": "komşu parsel", "diger": "diğer"}; oz = {}
            for sg, d, tip in kn: oz.setdefault((ad.get(tip, tip), d), 0); oz[(ad.get(tip, tip), d)] += sg.length
            ekle("Çitten çekme (cephe bazlı)", True, " · ".join(f"{t} {d:g} m ({L:,.0f} m cephe)" for (t, d), L in oz.items()) + f" · diğer kenarlar {P['parsel']['cekme_mesafesi_m']:g} m", "B: kullanıcı cephe tanımı")
        else:
            ek = self.cekme != P["parsel"]["cekme_mesafesi_m"]
            ekle("Çitten çekme mesafesi", "uyari" if ek else True, f"{self.cekme} m" + (" (kademeye düşüldü)" if ek else ""), "B: 5 m esas; sığmazsa 4/3/2")
        if P["parsel"]["hedef_masa"]:
            ekle("Hedef masa sayısı", len(self.masalar) >= P["parsel"]["hedef_masa"], f"{len(self.masalar)} / {P['parsel']['hedef_masa']}", "B")
        yb = self.cekme - P["parsel"]["cit_ic_ofset_m"]
        dar = [q for q in (getattr(self, "cekme_cephe", None) or []) if q[1] - P["parsel"]["cit_ic_ofset_m"] < P["yol"]["genislik_m"]]
        if dar:
            ekle("Servis yolu kenar bandına sığıyor", "uyari", f"{sum(q[0].length for q in dar):,.0f} m cephede band {min(q[1] for q in dar) - P['parsel']['cit_ic_ofset_m']:.1f} m < yol {P['yol']['genislik_m']} m — bu cephelerde kenar yolu yok, erişim iç yollardan", "A.6")
        else:
            ekle("Servis yolu kenar bandına sığıyor", yb >= P["yol"]["genislik_m"], f"band {yb:.1f} m / yol {P['yol']['genislik_m']} m", "A.6")
        if self.ic_yollar:
            ekle("İç işletme-bakım yolları (K-G, sıraları keser)", True, f"{len(self.ic_yollar)} yol × {P['yol']['ic_genislik_m']:g} m · blok yarı genişliği {self.K_ic} masa · DC sınırı {self.dc_lim_kaynak}", "A.7: aralık DC gerilim düşümüne göre")
        else:
            ekle("İç işletme-bakım yolu", True if not P["yol"].get("ic_yol", True) else "uyari", "kapalı (yol.ic_yol=false)" if not P["yol"].get("ic_yol", True) else "saha dar — kenar yol yeterli", "A.7")
        dn = getattr(self, "duzen_not", []); ntm = len(e.get("tm_tasi") or []); ninv = len(e.get("inv_tasi") or [])
        if dn or ntm or ninv:
            ekle("Kullanıcı düzenlemeleri uygulandı", "uyari", f"{ntm} TM taşıma · {ninv} inverter taşıma · " + ", ".join(dn), "elle düzenleme — esaslara uygunluk kontrollerle doğrulanır")
        ekle("Kablo yol geçişleri boru içinde", True, f"{len(self.yol_gecis)} AG yol geçişi (boru, üstü yüzeyden ≥ {P['hendek']['yol_gecis_boru_ust_m']:g} m) · {len(self.kesisim)} DC–AG kesişimi (tuğla/beton plaka)", "EKAT md.58-b/16")
        ekle("Sıra açıklığı / eksen / arazi kullanımı", "uyari", f"açıklık {self.acik:.2f} m · eksen {m['pitch_m']:.2f} m · kullanım %{self.masa_D / m['pitch_m'] * 100:.0f}",
             "B: açıklık mı eksen mi müellifle teyit")
        lat = P["proje"]["enlem"]
        if lat is not None:
            alt = 90 - abs(lat) - 23.44
            pmin = self.masa_D + self.masa_H / math.tan(math.radians(alt))
            ekle("21 Aralık güneş öğlesi gölgesizlik", m["pitch_m"] >= pmin, f"eksen {m['pitch_m']:.2f} / gerekli {pmin:.2f} m", "pitch ≥ D + H/tan(90−φ−23,44°)")
        else:
            ekle("Gölgelenme", None, "proje.enlem yok", "")
        ekle("Panel alt kenar ≥ 0,60 m", m["alt_kenar_m"] >= 0.60, f"{m['alt_kenar_m']:.2f} m", "şartname kar tablosu")
        # A — kablolama
        smax = max(self.stringler, key=lambda s: s["dc_tek_yon_m"])
        asan = sum(1 for s in self.stringler if s["dc_tek_yon_m"] > self.dc_lim)
        ekle(f"DC string tek yön ≤ {self.dc_lim:.0f} m", asan == 0, f"en uzun {smax['dc_tek_yon_m']:.1f} m ({smax['ad']}) · aşan {asan} · sınır: {self.dc_lim_kaynak}", "A.1")
        orta = sum(1 for i in self.inverterler if not i["yol_tarafi"])
        ekle("İnverter masa başında (ortada değil)", True, f"{len(self.inverterler) - orta} yol tarafı · {orta} iç masa başı", "A.4 / A.5")
        ekle("AG kablo sıra açıklığından, masa altından değil", True, "güzergâh: inverter → sıra açıklığı → kenar yol", "A.2 / A.3")
        # D — elektrik
        ekle("Şebeke gerilimi TM'den doğrulandı", None if not e["sebeke_gerilim_kv"] else True,
             f"{e['sebeke_gerilim_kv']} kV" if e["sebeke_gerilim_kv"] else "elektrik.sebeke_gerilim_kv yok", "D: etikete güvenme, kademe aralığıyla kontrol")
        if mod["voc_v"] and mod["voc_sicaklik_katsayi_pct"] is not None:
            voc = e["string_modul"] * mod["voc_v"] * (1 + mod["voc_sicaklik_katsayi_pct"] / 100 * (mod["tmin_c"] - 25))
            marj = (1500 - voc) / 1500 * 100
            ekle(f"String Voc ({mod['tmin_c']} °C) < 1500 V, marj ≥ %{e['voc_marj_min_pct']}",
                 False if voc >= 1500 else ("uyari" if marj < e["voc_marj_min_pct"] else True), f"{voc:.0f} V · marj %{marj:.1f}", "D: mutlak min sıcaklık")
        else:
            ekle("String Voc / marj", None, "modul.voc_v / katsayı yok", "")
        if mod["isc_a"] and e["mppt_sayisi"] and e["mppt_akim_a"]:
            mx = max(i["n_str"] for i in self.inverterler)
            per = math.ceil(mx / e["mppt_sayisi"])
            ekle("MPPT akımı (dizi × Isc ≤ MPPT anma)", per * mod["isc_a"] <= e["mppt_akim_a"],
                 f"{per} × {mod['isc_a']} = {per * mod['isc_a']:.1f} A / {e['mppt_akim_a']} A", "D")
        else:
            ekle("MPPT akımı", None, "modul.isc_a / elektrik.mppt_sayisi / mppt_akim_a yok", "D")
        if mod["vmp_v"] and mod["imp_a"]:
            du = 2 * smax["dc_tek_yon_m"] * mod["imp_a"] * e["rho_cu"] / e["dc_kesit_mm2"]
            pct = du / (e["string_modul"] * mod["vmp_v"]) * 100
            ekle("DC gerilim düşümü (en uzun)", pct <= e["dc_dusum_max_pct"], f"%{pct:.2f}", f"≤ %{e['dc_dusum_max_pct']}")
        else:
            ekle("DC gerilim düşümü", None, "modul.vmp_v / imp_a yok", "")
        ninv = [sum(1 for i in self.inverterler if i["tr"] == t + 1) for t in range(self.n_tr)]
        ekle("Trafo yük dengesi (inverter/TR)", True if max(ninv) - min(ninv) <= 1 else "uyari", " / ".join(f"TR{t+1}:{n}" for t, n in enumerate(ninv)), "D: eşit böl, farkı raporla")
        if e["inverter_ac_kw"]:
            rho = e["rho_cu"] if e["ac_iletken"] == "Cu" else e["rho_al"]
            def _acdu(i):   # inverter başına AC gerilim düşümü (kendi gücüyle)
                I = (i.get("ac_kw") or e["inverter_ac_kw"]) * 1000 / (math.sqrt(3) * e["ag_gerilim_v"] * e["cosphi"])
                return math.sqrt(3) * i["ac_m"] * I * rho * e["cosphi"] / (i.get("ag_n", 1) * i.get("ag_s", e["ac_kesit_mm2"])) / e["ag_gerilim_v"] * 100
            imax = max(self.inverterler, key=_acdu); pct = _acdu(imax)
            ekle("AC gerilim düşümü (en uzun)", pct <= e["ac_dusum_max_pct"], f"%{pct:.2f} ({imax['ad']}, {imax['ac_m']:.0f} m, {imax.get('ag_kablo', e['ac_kablo'])})", f"≤ %{e['ac_dusum_max_pct']}")
            for t, n in enumerate(ninv):
                ap = sum(i.get("ac_kw") or e["inverter_ac_kw"] for i in self.inverterler if i["tr"] == t + 1)
                ac = self.tr_ac(t)
                kva = self.tr_kva[t] if getattr(self, "tr_kva", None) else e["trafo_kva"]
                marj = (kva - ac) / ac * 100
                kw_ = e["inverter_ac_kw"]; ni_ = sum(1 for i in self.inverterler if i["tr"] == t + 1)
                ekle(f"TR{t+1} trafo marjı", marj >= e["trafo_marj_min_pct"], f"{ni_} × {kw_:g} kW = {ap:,.0f} kW kurulu · çıkış {ac:,.0f} kW (DC sınırlı) / {kva} kVA → %{marj:.1f}" + (" · inverterlerde aktif güç sınırlaması" if ap > kva * 0.9 else ""), f"≥ %{e['trafo_marj_min_pct']}")
        else:
            ekle("AC düşüm / trafo marjı", None, "elektrik.inverter_ac_kw yok", "")
        # ---- A.2: hiçbir kablo/şerit masa altından geçmez
        ic_masa = self.masa_birlesik.buffer(-0.05)
        def alt_m(geoms): return sum(g.intersection(ic_masa).length for g in geoms)
        dc_a = alt_m(self.dc_hat); ac_a = alt_m(self.ac_hat); og_a = alt_m([o["hat"] for o in self.og])
        tp_a = self.toprak_serit.intersection(ic_masa).length if hasattr(self, "toprak_serit") else 0.0
        ekle("Masa altından geçen kablo/şerit yok", (dc_a + ac_a + og_a + tp_a) < 0.01,
             f"DC {dc_a:.1f} m · AG {ac_a:.1f} m · OG {og_a:.1f} m · topraklama {tp_a:.1f} m", "A.2: kablolar yalnız masa aralarından")
        # ---- Not defteri: yönetmelik kontrolleri
        # OG gerilim düşümü (EKAT md.58: TM sekonderinden ≤ %7; ring tek taraflı besleme ≤ %10) — omik, κ_Al
        ukv = e["og_gerilim_kv"]; kap = e["kappa_al"]
        yuk = {o["ye"]: (sum((i.get("ac_kw") or e["inverter_ac_kw"]) for i in self.inverterler if f"TM{i['tr']}" == o["ye"])) if e["inverter_ac_kw"] else e["trafo_kva"] for o in self.og}
        kum, mx = 0.0, 0.0
        for j, o in enumerate(self.og):
            P_kw = sum(yuk[q["ye"]] for q in self.og[j:])
            Smm = e["og_kesit_dm_mm2"] if o["den"] == "DM" else e["og_kesit_mm2"]
            kum += 100 * o["m"] * P_kw * 1000 / (kap * Smm * (ukv * 1000) ** 2)
            mx = max(mx, kum)
        ekle("OG gerilim düşümü (zincir sonu)", mx <= e["og_dusum_max_pct"], f"%{mx:.3f} ({ukv} kV, κ={kap:g}, omik)", "EKAT md.58: ≤ %7")
        # Topraklama: şerit boyutu (Topraklamalar Yön. EK-A: galvaniz şerit ≥ 90 mm², ≥ 3 mm)
        import re as _re
        mm = _re.findall(r"(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)", t_ser := self.P["topraklama"]["serit"])
        if mm:
            a_, b_ = (float(v.replace(",", ".")) for v in mm[0]); kes = a_ * b_
            ekle("Topraklama şeridi kesit/kalınlık", kes >= 90 and min(a_, b_) >= 3, f"{a_:g}×{b_:g} = {kes:.0f} mm²", "Topraklamalar Yön. EK-A: ≥ 90 mm², ≥ 3 mm")
        tp = self.P["topraklama"]
        ekle("Topraklama çubuğu çapı ≥ 16 mm", tp["cubuk_cap_mm"] >= 16, f"Ø{tp['cubuk_cap_mm']} mm", "EK-A derin topraklayıcı")
        ekle("Şerit gömme derinliği 0,5–1,0 m", 0.5 <= tp["derinlik_m"] <= 1.0, f"{tp['derinlik_m']} m", "Topraklamalar Yön.; şartname ≥ 0,60 m")
        # Gözlü topraklayıcı direnci RE = ρ/2D + ρ/L, D = (A/π)^½
        A = self.alan_loc.area; Lt = self.toprak_serit.length
        if tp["toprak_ozdirenc_ohm_m"]:
            rho = tp["toprak_ozdirenc_ohm_m"]; D = math.sqrt(A / math.pi)
            RE = rho / (2 * D) + rho / Lt
            self.RE = RE
            ekle("Gözlü topraklayıcı direnci (hesap)", RE <= tp["direnc_hedef_ohm"], f"RE = {RE:.3f} Ω (ρ={rho} Ωm, A={A:,.0f} m², L={Lt:,.0f} m)", f"≤ {tp['direnc_hedef_ohm']} Ω (TM ≤ 1 Ω)")
            if tp["ik_toprak_a"]:
                UE = tp["ik_toprak_a"] * RE; lim = 1200 if tp["t_f_s"] <= 5 else 250
                ekle("Topraklama gerilimi UE = IE·RE", UE <= lim, f"{UE:.0f} V (IE={tp['ik_toprak_a']} A, tf={tp['t_f_s']} s)", f"zorlanma ≤ {lim} V")
                ekle("Dokunma/adım gerilimi", "uyari", "ölçümle doğrulanır (akım-gerilim yöntemi)", "tf=1 s → ≈100 V, 0,5 s → ≈220 V eğrisi")
            else:
                ekle("Topraklama gerilimi UE", None, "topraklama.ik_toprak_a yok", "")
        else:
            self.RE = None
            ekle("Gözlü topraklayıcı direnci (hesap)", None, "topraklama.toprak_ozdirenc_ohm_m yok (Wenner ölçümü)", "RE = ρ/2D + ρ/L")
        # EKAT — hendek, çit, yağ çukuru
        hd = self.P["hendek"]
        ekle("Kablo gömme derinliği ≥ 0,60 m", min(hd["dc_derinlik_m"], hd["ag_derinlik_m"], hd["og_derinlik_m"]) >= 0.6,
             f"DC {hd['dc_derinlik_m']} · AG {hd['ag_derinlik_m']} · OG {hd['og_derinlik_m']} m", "EKAT md.58-b/11 (sokak/alan ≥ 0,80 m)")
        ekle("Kum / koruyucu / uyarı şeridi", hd["kum_cm"] >= 10 and hd["koruyucu_cm"] >= 6, f"kum {hd['kum_cm']} cm · plaka {hd['koruyucu_cm']} cm · şerit +{hd['uyari_ust_cm']} cm", "EKAT md.58-b/13")
        if max(getattr(self, "tr_kva", None) or [e["trafo_kva"]]) >= e["harici_trafo_min_kva"]:
            ekle("Harici trafo sahası çit ≥ 1,8 m · A ≥ 2120 mm (36 kV)", True, "çit 2,0 m (şartname)", "EKAT md.36-c, Çizelge-3")
        if e["trafo_yag_l"]:
            ekle("Yağ toplama çukuru", True, f"yağ {e['trafo_yag_l']} L → " + ("ZORUNLU" if e["trafo_yag_l"] > 1500 else "eşik altı, yine de yapılır"), "EKAT md.37-b (> 1500 L)")
        else:
            ekle("Yağ toplama çukuru", None, "elektrik.trafo_yag_l yok", "EKAT md.37-b (> 1500 L)")
        ekle("Trafo koruma ↔ işletme topraklaması ayrımı", "uyari", f"≥ {tp['trafo_isletme_ayrim_m']} m veya yalıtılarak birleştirme — pafta notu", "Topraklamalar Yön.")
        pr = self.P["proje"]
        ekle("Müellif PUS / SMM bilgisi", bool(pr["pus_no"] and pr["smm_no"]) or None, f"PUS {pr['pus_no'] or '—'} · SMM {pr['smm_no'] or '—'}", "Proje Yön.: imzalayan PUS + SMM/BTB")
        ekle("Topraklama göz ≤ 40 m", self.P["topraklama"]["goz_max_m"] <= 40, f"{self.P['topraklama']['goz_max_m']} m", "IEC 60364-7-712")
        n1 = len(self.stringler); n2 = sum(i["n_str"] for i in self.inverterler); n3 = len(self.masalar) * self.str_masa
        ekle("String sayısı yerleşim = tek hat = masa×str", n1 == n2 == n3, f"{n1} / {n2} / {n3}", "paftalar arası eşleşme")

    # ---------------------------------------------------------------- metraj
    def metraj_hesapla(self):
        P, e, m = self.P, self.P["elektrik"], self.P["masa"]
        nm = len(self.masalar); pc = m["parca_carpani"]; guc = P["modul"]["guc_wp"]
        nmod = nm * self.masa_modul; cit_L = sum(r.length for r in dis_halkalar(self.cit))
        M = []
        def r(grup, kalem, mik, birim, kaynak, hakedis=""):
            M.append({"grup": grup, "kalem": kalem, "miktar": round(mik, 2) if isinstance(mik, float) else mik, "birim": birim, "kaynak": kaynak, "hakedis": hakedis})
        r("Genel", "DC kurulu güç", round(nmod * guc / 1000, 2) if guc else "VERİ YOK", "kWp", "01", "Mekanik/Elektrik Montaj (kWp)")
        if e["inverter_ac_kw"]: r("Genel", "AC kurulu güç", sum((i.get("ac_kw") or e["inverter_ac_kw"]) for i in self.inverterler), "kWe", "02")
        r("Mekanik", f"Masa {m['tip']}", nm, "adet", "01")
        r("Mekanik", "PV modül", nmod, "adet", "01", "PV / Panel Montajı")
        ETK = {"kolon": ("Kolon", "Kolon / Çakma Kolon"), "kiris": ("Kiriş", "Kiriş"), "asik": ("Aşık", "Aşık"), "ruzgarlik": ("Rüzgarlık", "Rüzgarlık"),
               "payanda": ("Payanda", "Payanda"), "capraz": ("Çapraz", ""), "orta_klemp": ("Orta klemp", ""), "kenar_klemp": ("Kenar klemp", ""), "m12_civata": ("M12 cıvata seti", "")}
        for k, (ad, hk) in ETK.items():
            if k in pc: r("Mekanik", ad, nm * pc[k], "adet", "01+statik", hk)
        r("Mekanik", "Aplikasyon noktası (kolon)", nm * pc.get("kolon", 0), "nokta", "01 (uygulama)", "Aplikasyon")
        r("Elektrik", "String", len(self.stringler), "adet", "01/02")
        _kw = e["inverter_ac_kw"]
        r("Elektrik", f"İnverter {e.get('inverter_model') or ''} {len(self.inverterler)} × {_kw:g} kW = {len(self.inverterler) * _kw:,.0f} kW".replace("  ", " ") if _kw else "İnverter", len(self.inverterler), "adet", "01/02", "İnverter ve Trafo Montajı")
        tk = getattr(self, "tr_kva", None) or [e["trafo_kva"]] * self.n_tr; ts = {}
        for v in tk: ts[v] = ts.get(v, 0) + 1
        nh = 0
        for v, n in sorted(ts.items(), reverse=True):
            harici = v >= e["harici_trafo_min_kva"]; nh += n if harici else 0
            r("Elektrik", f"Trafo {v} kVA ({'harici' if harici else 'köşk içi'})", n, "adet", "02", "İnverter ve Trafo Montajı")
        if nh:
            r("Elektrik", "Trafo yağ çukuru + çit (harici)", nh, "adet", "02")
        r("Elektrik", "Köşk (TM) + DM", f"{self.n_tr} + 1", "adet", "01/02", "Köşk İçi OG Hücre ve Pano")
        r("Elektrik", "OG hücre", self.n_tr * len(e["tm_hucreler"] or TM_HUCRE_VARS) + len(e["dm_hucreler"] or DM_HUCRE_VARS) + e["dm_yedek_fider"], "adet", "02", "Köşk İçi OG Hücre ve Pano")
        r("Elektrik", "AG pano DSYA çıkışı", len(self.inverterler), "adet", "02")
        fire = e["dc_fire_pct"]
        r("Elektrik", f"DC solar kablo {e['dc_kablo']} (+%{fire:g} fire)", self.dc_toplam * (1 + fire / 100), "m", "04", "1x6 Solar Kablo İşçiliği")
        _girisler(self)
        for inv in sorted(self.inverterler, key=lambda i: i["gno"]):          # keşif: her string tek tek (ADP DC kablo kesit ve metraj listesi)
            for s_ in inv["str_list"]:
                r("DC string", f"ADP-{inv['tr']} · INV-{inv['gno']:02d} · S{s_['giris']} (MPPT-{s_['mppt']}) · {e['dc_kablo']} {e['dc_kesit_mm2']:g} mm²", round(s_["dc_m"], 1), "m", "02/04")
        agk = {}
        for i in self.inverterler:
            ad = (e["ac_kablo"].split(" ", 1)[1] if " " in e["ac_kablo"] else "NA2XY")
            tek = e["ac_kablo"] if i.get("ag_n", 1) == 1 else f"3x{i['ag_s']}/{i['ag_s'] // 2} {ad}"
            agk[tek] = agk.get(tek, 0.0) + i["ac_m"] * i.get("ag_n", 1)
        for tek, m_ in agk.items():
            r("Elektrik", f"AG kablo {tek}", m_, "m", "04", "AG-OG Kablo Kanal ve Kablo")
        og_m = sum(o["m"] for o in self.og)
        r("Elektrik", f"OG güzergâh ({e['og_kablo']})", og_m, "m", "04")
        r("Elektrik", "OG tek damar kablo (×3)", og_m * 3, "m", "04", "AG-OG Kablo Kanal ve Kablo")
        r("Elektrik", "OG kablo başlığı", len(self.og) * 2 * 3, "adet", "02", "OG Başlık İşçiliği")
        r("Elektrik", "DC hendek (sıra geçişi, ortak hendek)", self.hendek_dc.length, "m", "04", "AG-OG Kablo Kanal")
        r("Elektrik", "AG/OG kanal (ortak hendek, güzergâh toplamı değil)", self.hendek_ac.length, "m", "04", "AG-OG Kablo Kanal")
        for t_ in getattr(self, "kanal_tip", []):
            r("Elektrik", f"  Kanal DETAY-{t_['detay']}: b={t_['b']:.2f} m · {t_['n']} AC devre" + (" + OG" if t_["og"] else ""), t_["m"], "m", "04/05", "AG-OG Kablo Kanal")
        t = P["topraklama"]
        r("Topraklama", t["serit"], self.toprak_serit.length, "m", "03", "Topraklama Sistemi")
        r("Topraklama", "Topraklama çubuğu", len(self.toprak_cubuk), "adet", "03", "Topraklama Sistemi")
        r("Topraklama", "Konstrüksiyon bağlantısı (DETAY-G)", len(self.toprak_baglanti), "adet", "03")
        if t["mod"] == "kopru": r("Topraklama", f"Masa arası köprü {t['kopru_kablo']} (DETAY-H)", self.toprak_kopru, "adet", "03")
        r("Topraklama", "Çit topraklama bağlantısı", len(self.cit_bag), "adet", "03")
        g = P["guvenlik"]
        r("Saha", "Tel çit (birleşik dış çevre)", cit_L, "m", "01")
        r("Saha", "Çit direği", math.ceil(cit_L / g["cit_direk_araligi_m"]), "adet", "01")
        r("Saha", "Uyarı levhası", math.ceil(cit_L / g["levha_araligi_m"]), "adet", "01", "Uyarı Levhaları")
        r("Saha", "Aydınlatma + CCTV direği", len(self.direkler), "adet", "01", "CCTV – Aydınlatma")
        r("Saha", "Kamera", len(self.direkler), "adet", "01", "CCTV – Aydınlatma")
        r("Saha", "CCTV switch panosu", math.ceil(len(self.direkler) / g["kamera_switch_basina"]), "adet", "01")
        r("Saha", "Kenar servis yolu (eksen)", self.halka.length, "m", "01", "İç Şantiye Yolları")
        if self.ic_yollar:
            iL = sum(g.length for r_ in self.ic_yollar for g in (getattr(r_["eksen"], "geoms", None) or [r_["eksen"]]) if g.geom_type == "LineString")
            r("Saha", f"İç işletme-bakım yolu {P['yol']['ic_genislik_m']:g} m (eksen)", iL, "m", "01", "İç Şantiye Yolları")
        if self.yol_gecis:
            r("Elektrik", "AG yol geçiş borusu (HDPE, EKAT md.58-b/16)", sum(g["m"] for g in self.yol_gecis), "m", "04", "AG-OG Kablo Kanal")
            r("Elektrik", "AG yol geçişi", len(self.yol_gecis), "adet", "04")
        if self.kesisim:
            r("Elektrik", "DC–AG kesişim koruması (dolu tuğla / beton plaka)", len(self.kesisim), "adet", "04", "AG-OG Kablo Kanal")
        # F: pafta ile fark varsa yüksek olan
        for kalem, v in (P.get("metraj_pafta") or {}).items():
            for row in M:
                if row["kalem"].lower().startswith(kalem.lower()) and isinstance(row["miktar"], (int, float)):
                    if v > row["miktar"]:
                        self.uyari.append(f"Metraj '{row['kalem']}': pafta {v:,} > yerleşim {row['miktar']:,} → pafta esas (F).")
                        row["miktar"] = v; row["kaynak"] += " (pafta)"
        self.metraj = M


# ----------------------------------------------------------------- PAFTALAR
def pafta_yerlesim(M, seviye):
    pf = Pafta("01", "GENEL YERLEŞİM PLANI")
    W = M.W
    geom_ciz(pf, "GES-SINIR", M.parsel_sinir)
    geom_ciz(pf, "GES-CEKME", W(M.ic_loc))
    geom_ciz(pf, "GES-CIT", M.cit)
    geom_ciz(pf, "GES-YOL", W(M.yol_loc))
    for ya in M.P["parsel"]["yasak_alanlar"]:
        pf.poli("GES-CEKME", ya["koordinat"], info=ya.get("ad", "Yasak alan"))
        c = Polygon(ya["koordinat"]).centroid; pf.yazi("GES-CEKME", c.x, c.y, 2, ya.get("ad", "YASAK ALAN"), hiz="C")
    for k in M.koridor_loc: geom_ciz(pf, "GES-YOL", W(k.intersection(M.ic_loc)))
    for s in M.P["santiye"]["alanlar"]:
        pf.poli("GES-SANTIYE", s["koordinat"]); c = Polygon(s["koordinat"]).centroid
        pf.yazi("GES-SANTIYE", c.x, c.y, 3, s.get("ad", "ŞANTİYE"), hiz="C")
    for ms in M.masalar:
        g = W(ms["loc"])
        pf.poli("GES-MASA", list(g.exterior.coords), info=f"Masa {ms['no']} | {ms.get('inv','')} | " + ", ".join(ms.get("str", [])),
                dolgu=ms.get("tr", 0))
    if seviye == "uygulama": string_ciz(M, pf)
    _gno(M); ia = math.radians(M.az or 0); ca, sa = math.cos(ia), math.sin(ia)
    for inv in M.inverterler:                  # AeCAD "İnverter ekle" simgesi: 1,20 × 0,80 m kutu + köşegen, üstte INV-n · kW
        x, y = M.Wp(inv["x"], inv["y"]); P = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
        kw = inv.get("ac_kw") or M.P["elektrik"]["inverter_ac_kw"]
        pf.poli("GES-INV", [P(-0.6, -0.4), P(0.6, -0.4), P(0.6, 0.4), P(-0.6, 0.4)], info=f"{inv['ad']} | {inv['n_str']} string | AC {inv['ac_m']:.0f} m")
        pf.cizgi("GES-INV", [P(-0.6, -0.4), P(0.6, 0.4)])
        pf.yazi("GES-INV", *P(0, 1.3), 1.0 if seviye == "uygulama" else 1.4, f"INV-{inv['gno']}" + (f" · {kw:g} kW" if kw else ""), math.degrees(ia), "C")
    ort = getattr(M, "dm_ortak", False)
    e_ = M.P["elektrik"]
    th = copy.deepcopy(e_.get("tm_hucreler") or TM_HUCRE_VARS); dh = copy.deepcopy(e_.get("dm_hucreler") or DM_HUCRE_VARS)
    for t, tm in enumerate(M.tm_loc):          # köşk: AeCAD Trafo ekle aracının bloğu (OG hücreleri, trafo, AG pano)
        c = W(tm).centroid; kosk_plan(pf, M, c.x, c.y, tm_kosk_tasarim(M, t, ort and t == 0))
    if not ort:
        c = W(M.dm_loc).centroid; kosk_plan(pf, M, c.x, c.y, kosk_tasarim("dm", 0, len(dh)))
    for p in M.direkler: pf.daire("GES-AYD-CCTV", p[0], p[1], 0.8, info="Aydınlatma+CCTV")
    if seviye == "uygulama":
        kn_ = 0
        for r_ in dis_halkalar(M.parsel_sinir):
            for (x, y) in list(r_.coords)[:-1]:
                kn_ += 1; pf.yazi("GES-OLCU", x, y, 1.5, f"K{kn_}")
    P = M.P
    pf.notlar = [f"Masa: {len(M.masalar)} × {P['masa']['tip']} · modül: {len(M.masalar) * M.masa_modul} · string: {len(M.stringler)} · inverter: {len(M.inverterler)} · TM: {M.n_tr}.",
                 f"Eksen (pitch) {P['masa']['pitch_m']} m · eğim {P['masa']['egim_derece']}° · alt kenar {P['masa']['alt_kenar_m']} m · GCR {M.masa_D / P['masa']['pitch_m']:.3f} · azimut {M.az}° · sıra açıklığı {M.acik:.2f} m.",
                 f"Koordinat sistemi: {P['parsel']['koordinat_sistemi'] or '—'} · çekme {M.cekme_ozet()} · çit parselin {P['parsel']['cit_ic_ofset_m']:g} m içinde.",
                 "Kablolar masa altından geçmez; DC masa başından iner, sıra açıklığında ve masa arası boşlukta yürür.",
                 f"Köşk gölgesi: bina h = {((P['elektrik'].get('kosk') or {}).get('H_mm') or KOSK_VARS['H_mm']) / 1000:.2f} m, 21 Aralık 12:00 ± {float(P['masa'].get('golge_saat') or 2):g} sa; TM/DM gölgesinde masa yok, TM yeri en az masa kaybına göre seçildi.",
                 "Detaylar ölçekli değil ise ölçü yazısı esastır; kesin kot ve ayak boyları halihazır haritaya göre uygulamada belirlenir."]
    try: detaylar_yerlesim(M, pf)
    except Exception as ex: M.uyari.append(f"Vaziyet planı detayları çizilemedi: {ex}")
    return pf


def pafta_topraklama(M):
    pf = Pafta("03", "TOPRAKLAMA PLANI")
    W = M.W
    geom_ciz(pf, "GES-SINIR", M.parsel_sinir); geom_ciz(pf, "GES-CIT", M.cit); geom_ciz(pf, "GES-YOL", W(M.yol_loc))
    for ms in M.masalar: geom_ciz(pf, "GES-MASA", W(ms["loc"]))
    for t, tm in enumerate(M.tm_loc):
        c = W(tm).centroid; kosk_plan(pf, M, c.x, c.y, tm_kosk_tasarim(M, t, getattr(M, "dm_ortak", False) and t == 0))
    if not getattr(M, "dm_ortak", False):
        c = W(M.dm_loc).centroid; kosk_plan(pf, M, c.x, c.y, kosk_tasarim("dm", 0, len(M.P["elektrik"].get("dm_hucreler") or DM_HUCRE_VARS)))
    geom_ciz(pf, "GES-TOPRAK-SERIT", W(M.toprak_serit))
    for p in M.toprak_cubuk: x, y = M.Wp(*p); pf.daire("GES-TOPRAK-CUBUK", x, y, 0.8, info="Topraklama çubuğu")
    for p in M.toprak_baglanti: x, y = M.Wp(*p); pf.daire("GES-TOPRAK-BAGLANTI", x, y, 0.35, info="DETAY-G konstrüksiyon bağlantısı")
    for p in M.cit_bag: x, y = M.Wp(*p); pf.daire("GES-TOPRAK-BAGLANTI", x, y, 0.6, info="Çit bağlantısı")
    t = M.P["topraklama"]; bb = pf.sinir()
    notlar = [f"Topraklayıcı: {t['serit']} (EK-A ≥ 90 mm², ≥ 3 mm), gömme {t['derinlik_m']} m, göz ≤ {t['goz_max_m']:g} m; çubuk Ø{t['cubuk_cap_mm']} mm.",
              f"Hedef direnç ≤ {t['direnc_hedef_ohm']:g} Ω" + (f"; hesap RE = {M.RE:.3f} Ω (ρ = {t['toprak_ozdirenc_ohm_m']} Ωm)." if M.RE else "; ρ Wenner ile ölçülüp RE = ρ/2D + ρ/L hesabı yapılacak."),
              f"Trafo koruma topraklaması ile AG işletme (nötr) topraklaması arası ≥ {t['trafo_isletme_ayrim_m']:g} m veya yalıtılarak birleştirilir.",
              "Konstrüksiyon, inverter, pano gövdeleri ve çit eşpotansiyel ağa bağlanır. Dokunma/adım gerilimi akım-gerilim yöntemiyle ölçülür.",
              "Topraklama tesisi yılda en az bir kez ölçülür ve raporlanır (yetkili elektrik mühendisi, kalibreli cihaz)."]
    pf.notlar = notlar
    return pf


def string_ciz(M, pf, h=0.35):
    """DC gösterimi (kullanıcı kuralı 19.10.2026): DC güzergâh çizilmez; her string masa içinde 1. panelden son panele tek çizgi,
    giriş (+) mavi üçgen ve çıkış (−) kırmızı üçgen, uçlarda `INV{i}.PV{s}.1` / `.N` kodu, ortada `sıra*modül`. Kod stringin hangi
    invertere gittiğini söyler; boy metrajda gerçek güzergâhla hesaplanır."""
    m = M.P["masa"]; Pn = m["sira_modul"]; tek_tr = getattr(M, "n_tr", 1) <= 1
    for ms in M.masalar:
        for ad, iz, rs in M.string_izi(ms):
            if len(iz) < 2: continue
            mt = re.match(r"TR(\d+)-ACB1-INV(\d+)-STR(\d+)", ad)
            kod = (f"INV{mt.group(2)}.PV{mt.group(3)}" if tek_tr else f"TR{mt.group(1)}.INV{mt.group(2)}.PV{mt.group(3)}") if mt else ad
            W_ = [M.Wp(x, y) for x, y in iz]
            pf.cizgi("GES-DC-KABLO", W_, info=f"{ad} · {len(iz)} modül")
            for (x, y), isim, kat in ((iz[0], f"{kod}.1", "GES-STRING-NO"), (iz[-1], f"{kod}.{len(iz)}", "GES-DC-KABLO")):
                tri = [M.Wp(x - h * 0.6, y - h * 0.5), M.Wp(x + h * 0.6, y - h * 0.5), M.Wp(x, y + h * 0.5), M.Wp(x - h * 0.6, y - h * 0.5)]
                pf.poli(kat, tri, info=isim)
                tx, ty = M.Wp(x - h * 0.6, y + h * 0.7); pf.yazi("GES-STRING-NO", tx, ty, h * 0.8, isim, rot=M.az)
            cx = sum(q[0] for q in iz) / len(iz); cy = sum(q[1] for q in iz) / len(iz); X, Y = M.Wp(cx, cy)
            pf.yazi("GES-STRING-NO", X, Y, h * 2.2, f"{rs}*{len(iz) // rs}", rot=M.az, hiz="C")


def pafta_kablo(M):
    pf = Pafta("04", "KABLO GÜZERGÂH PLANI")
    W = M.W
    geom_ciz(pf, "GES-SINIR", M.parsel_sinir); geom_ciz(pf, "GES-CIT", M.cit); geom_ciz(pf, "GES-YOL", W(M.yol_loc))
    for ms in M.masalar: geom_ciz(pf, "GES-MASA", W(ms["loc"]))
    string_ciz(M, pf)   # DC: yalnız string izi + giriş/çıkış kodu (güzergâh çizgisi yok, karmaşa yok)
    geom_ciz(pf, "GES-HENDEK-DC", W(M.hendek_dc), info="DC hendek (sıra geçişi)")
    for inv, ls in zip(M.inverterler, M.ac_hat): geom_ciz(pf, "GES-AC-KABLO", W(ls), info=f"{inv['ad']} → TM{inv['tr']} {inv['ac_m']:.0f} m")
    for o in M.og: geom_ciz(pf, "GES-OG-KABLO", W(o["hat"]), info=f"OG {o['den']}→{o['ye']} {o['m']:.0f} m")
    for inv in M.inverterler:
        x, y = M.Wp(inv["x"], inv["y"]); _a = math.radians(M.az or 0); P = lambda u, v: (x + u * math.cos(_a) - v * math.sin(_a), y + u * math.sin(_a) + v * math.cos(_a))
        pf.poli("GES-INV", [P(-0.6, -0.4), P(0.6, -0.4), P(0.6, 0.4), P(-0.6, 0.4)], info=inv["ad"]); pf.cizgi("GES-INV", [P(-0.6, -0.4), P(0.6, 0.4)])
    for t, tm in enumerate(M.tm_loc):
        c = W(tm).centroid; kosk_plan(pf, M, c.x, c.y, tm_kosk_tasarim(M, t, getattr(M, "dm_ortak", False) and t == 0))
    if not getattr(M, "dm_ortak", False):
        c = W(M.dm_loc).centroid; kosk_plan(pf, M, c.x, c.y, kosk_tasarim("dm", 0, len(M.P["elektrik"].get("dm_hucreler") or DM_HUCRE_VARS)))
    for o in M.og:
        if o["hat"].is_empty: continue
        c = W(o["hat"]).interpolate(0.5, normalized=True)
        pf.yazi("GES-OG-KABLO", c.x + 1, c.y, 2.0, f"{o['den']}-{o['ye']} {o['m']:.0f} m")
    for i, g in enumerate(M.yol_gecis):     # AG yol geçişi: boru içinde
        x, y = M.Wp(g["x"], g["y"]); pf.daire("GES-AC-KABLO", x, y, 1.6, info=f"YG{i+1} yol geçişi {g['m']:.0f} m boru")
        pf.yazi("GES-AC-KABLO", x + 2, y + 1, 1.4, f"YG{i+1}")
    for i, g in enumerate(M.kesisim):       # DC–AG kesişim: koruma
        x, y = M.Wp(g["x"], g["y"]); pf.daire("GES-DC-KABLO", x, y, 0.9, info=f"K{i+1} DC–AG kesişimi")
    for k in getattr(M, "kanal", []):   # kademeli ortak kanal: genişlik gerçek ölçüde; kesit değiştiği parçada DETAY-n
        g = k["geom"]
        geom_ciz(pf, "GES-HENDEK-AC", W(g.buffer(k["b"] / 2, cap_style=2, join_style=2)), info=f"Kanal DETAY-{k['detay']} b={k['b']:.2f} m · {k['n']} AC" + (" + OG" if k["og"] else ""))
        if g.length >= M.P["hendek"].get("detay_min_m", 15.0):
            c = W(g).interpolate(0.5, normalized=True)
            pf.poli("GES-HENDEK-AC", [(c.x - 1.0, c.y - 1.0), (c.x + 1.0, c.y - 1.0), (c.x + 1.0, c.y + 1.0), (c.x - 1.0, c.y + 1.0), (c.x - 1.0, c.y - 1.0)])
            pf.yazi("GES-HENDEK-AC", c.x + 1.4, c.y - 0.5, 1.0, f"DETAY-{k['detay']}")
    return pf


def pafta_kanal(M):
    """05 — Kablo kanal kesit detayları (EKAT md.58-b/11…16). Birim m, ölçekli (1/20)."""
    pf = Pafta("05", "KABLO KANAL KESİT DETAYLARI")
    h, e = M.P["hendek"], M.P["elektrik"]
    K, N = "GES-OLCU", "GES-NOT"
    tipler = [("DC SIRA GEÇİŞİ", h["dc_derinlik_m"], [("DC", 4)], "H1Z2Z2-K 1x6 — yalnız DC (AC aynı kanala girmez)"),
              ("AG KABLO", h["ag_derinlik_m"], [("AG", 3)], e["ac_kablo"]),
              ("AG + OG ORTAK", h["og_derinlik_m"], [("OG", 3), ("AG", 2)], f"{e['og_kablo']} + {e['ac_kablo']}")]
    x0 = 0.0
    for ad, d, katlar, kab in tipler:
        w = h["genislik_m"]; kum = h["kum_cm"] / 100; kor = h["koruyucu_cm"] / 100
        pf.cizgi(K, [(x0 - 0.3, 0), (x0 + w + 0.3, 0)])                         # zemin
        pf.cizgi(K, [(x0, 0), (x0, -d - kum), (x0 + w, -d - kum), (x0 + w, 0)])   # hendek
        yk = -d                                                                   # en alt kablo ekseni
        pf.cizgi("GES-NOT", [(x0, -d - kum + 0.002), (x0 + w, -d - kum + 0.002)])
        ust = yk
        for j, (tip, n) in enumerate(katlar):
            yy = yk + j * (0.05 + kor + 0.10)
            dx = w / (n + 1)
            for i in range(n):
                pf.daire("GES-AC-KABLO" if tip != "OG" else "GES-OG-KABLO", x0 + dx * (i + 1), yy, 0.02)
            if j < len(katlar) - 1:
                pf.poli(K, [(x0, yy + 0.05), (x0 + w, yy + 0.05), (x0 + w, yy + 0.05 + kor), (x0, yy + 0.05 + kor), (x0, yy + 0.05)])
                pf.yazi(N, x0 + w + 0.05, yy + 0.06, 0.025, f"AG–OG arası tuğla / {h['koruyucu_cm']} cm beton plaka")
            ust = yy
        ykum = ust + 0.02 + kum
        pf.cizgi(N, [(x0, ykum), (x0 + w, ykum)]); pf.yazi(N, x0 + w + 0.05, ykum - 0.06, 0.025, f"elenmiş kum {h['kum_cm']} cm (alt ve üst)")
        pf.poli(K, [(x0, ykum), (x0 + w, ykum), (x0 + w, ykum + kor), (x0, ykum + kor), (x0, ykum)])
        pf.yazi(N, x0 + w + 0.05, ykum + 0.005, 0.025, f"dolu tuğla / {h['koruyucu_cm']} cm beton plaka")
        yb = ykum + kor + h["uyari_ust_cm"] / 100
        if yb < -0.05:
            pf.cizgi("GES-OG-KABLO", [(x0 + 0.1, yb), (x0 + w - 0.1, yb)])
            pf.yazi(N, x0 + w + 0.05, yb - 0.01, 0.025, f"uyarı şeridi ≥10 cm, koruyucunun {h['uyari_ust_cm']} cm üstü")
        pf.cizgi(K, [(x0 - 0.15, 0), (x0 - 0.15, -d)]); pf.yazi(K, x0 - 0.45, -d / 2, 0.03, f"{d:.2f} m")
        pf.yazi(K, x0 + w / 2, -d - kum - 0.12, 0.03, f"b = {w:.2f} m", hiz="C")
        pf.yazi(N, x0, 0.15, 0.045, ad); pf.yazi(N, x0, 0.08, 0.025, kab)
        x0 += w + 1.6
    notlar = ["EKAT md.58-b/11: gömme derinliği alan dışında ≥ 0,60 m, sokak/alanlarda ≥ 0,80 m.",
              "EKAT md.58-b/13: altta ve üstte ~10 cm elenmiş kum; üstüne ve AG–OG arasına dolu tuğla veya ≥6 cm beton plaka; ~30 cm üstüne ≥10 cm uyarı şeridi.",
              f"EKAT md.58-b/14: enerji kabloları arası ≥ kablo çapı, en az {h['kablo_aralik_cm']} cm. md.58-b/15: telekom/fiber ile ≥ 30 cm.",
              f"EKAT md.58-b/16: yol/su kanalı geçişleri çelik/HDPE boru veya beton kanal içinde; boru üstü yol yüzeyinden ≥ {h['yol_gecis_boru_ust_m']:.1f} m aşağıda.",
              "Çizelge-6: doğalgaz/petrol boru hattına paralel ≥ 0,6 m, kesişmede ≥ 0,4 m. Şartname: DC kablo AC ile aynı kanala konmaz."]
    for i, t in enumerate(notlar): pf.yazi(N, 0, -1.75 - i * 0.09, 0.03, t)
    # kademeli ortak kanal kesitleri (04'teki DETAY-n): AC devre başına 3+1 tek damar demet, gruplar arası kablo aralığı, AC–OG 2 × aralık
    x0, Y = 0.0, -2.6; ka = h["kablo_aralik_cm"] / 100; d = h["ag_derinlik_m"]; kum = h["kum_cm"] / 100; kor = h["koruyucu_cm"] / 100
    for t in getattr(M, "kanal_tip", [])[:10]:
        w = t["b"]
        pf.cizgi(K, [(x0 - 0.2, Y), (x0 + w + 0.2, Y)])
        pf.cizgi(K, [(x0, Y), (x0, Y - d - kum), (x0 + w, Y - d - kum), (x0 + w, Y)])
        yk = Y - d; r = 0.018
        grup = [("AG", 4)] * t["n"] + ([("OG", 3)] if t["og"] else [])
        gen = sum(n * 2 * r for _, n in grup) + ka * max(0, len(grup) - 1) + (ka if t["og"] and t["n"] else 0)
        x = x0 + max(0.03, (w - gen) / 2)
        for j, (tip, n) in enumerate(grup):
            if tip == "OG" and j: x += ka
            for i in range(n): pf.daire("GES-OG-KABLO" if tip == "OG" else "GES-AC-KABLO", x + r + i * 2 * r, yk, r)
            x += n * 2 * r + ka
        ykum = yk + r + kum
        pf.cizgi(N, [(x0, ykum), (x0 + w, ykum)])
        pf.poli(K, [(x0, ykum), (x0 + w, ykum), (x0 + w, ykum + kor), (x0, ykum + kor), (x0, ykum)])
        yb = ykum + kor + h["uyari_ust_cm"] / 100
        if yb < Y - 0.05: pf.cizgi("GES-OG-KABLO", [(x0 + 0.05, yb), (x0 + w - 0.05, yb)])
        pf.yazi(K, x0 + w / 2, Y - d - kum - 0.1, 0.03, f"b = {w:.2f} m", hiz="C")
        pf.yazi(N, x0, Y + 0.14, 0.045, f"DETAY-{t['detay']}")
        pf.yazi(N, x0, Y + 0.07, 0.025, f"{t['n']} AC devre" + (" + OG" if t["og"] else "") + f" · {t['m']:.0f} m")
        x0 += w + 1.0
    if getattr(M, "kanal_tip", None):
        pf.yazi(N, 0, Y - d - 0.45, 0.03, "Kademeli ortak AG/OG kanal: genişlik geçen AC devre sayısıyla artar (b = taban + artış × (n − 1) + OG eki); 04 paftasında kesit değişen parçada DETAY-n.")
    return pf


# ----------------------------------------------------------------- TEK HAT (detaylı hücre çizimi)
# Birim mm, ölçeksiz. Semboller IEC 60617 / TS. Her OG hücresi gövdesiyle (gövde, bara, ekipman, etiket) çizilir.
TH_OG, TH_AG, TH_BARA, TH_HUC, TH_KOSK, TH_KUM, TH_TOP, TH_YZ = (
    "GES-TEKHAT-OG", "GES-TEKHAT", "GES-TH-BARA", "GES-TH-HUCRE", "GES-TH-KOSK", "GES-TH-KUMANDA", "GES-TH-TOPRAK", "GES-TH-YAZI")


def sar(t, n):
    """Metni n karakterlik satırlara böl (kelime bazında)."""
    out, s = [], ""
    for w in str(t).split():
        if s and len(s) + 1 + len(w) > n: out.append(s); s = w
        else: s = (s + " " + w).strip()
    if s: out.append(s)
    return out or [""]


class Ciz:
    """Yerel koordinatta çizer: (ox, oy) öteleme, k ölçek. etiket=False iken yazılar atlanır (küçük gösterim)."""
    def __init__(s, pf, ox=0.0, oy=0.0, k=1.0, etiket=True):
        s.pf, s.ox, s.oy, s.k, s.etiket = pf, ox, oy, k, etiket
    def P(s, x, y): return (s.ox + x * s.k, s.oy + y * s.k)
    def L(s, kat, pts): s.pf.cizgi(kat, [s.P(*p) for p in pts])
    def R(s, kat, x0, y0, x1, y1, dolgu=False):
        s.pf.poli(kat, [s.P(x0, y0), s.P(x1, y0), s.P(x1, y1), s.P(x0, y1), s.P(x0, y0)], None, dolgu)
    def PL(s, kat, pts, dolgu=False): s.pf.poli(kat, [s.P(*p) for p in pts], None, dolgu)
    def C(s, kat, x, y, r): s.pf.daire(kat, *s.P(x, y), r * s.k)
    def T(s, kat, x, y, h, t, hiz="L", rot=0, zorla=False):
        if s.etiket or zorla: s.pf.yazi(kat, *s.P(x, y), h * s.k, t, rot, hiz)
    def TL(s, kat, x, y, h, satirlar, ara=1.45):
        for i, t in enumerate(satirlar): s.T(kat, x, y - i * h * ara, h, t)
        return y - len(satirlar) * h * ara


# ---------- semboller (eksen x, üst y, aşağı doğru; dönüş = alt y)
def sy_toprak(C, x, y, kat=TH_TOP):
    C.L(kat, [(x, y), (x, y - 2.2)])
    for i, w in enumerate((2.4, 1.6, 0.8)): C.L(kat, [(x - w, y - 2.2 - i * 0.8), (x + w, y - 2.2 - i * 0.8)])
    return y - 4.0


def sy_ayirici(C, kat, x, y, yuk=False, kesici=False, ayir=True):
    """IEC: ayırıcı = sabit kontakta dik çubuk; yük ayırıcı = + daire; kesici = sabit kontakta ×. Açık bıçak."""
    C.L(kat, [(x, y), (x, y - 3.5)])
    if ayir: C.L(kat, [(x - 1.6, y - 3.5), (x + 1.6, y - 3.5)])
    if yuk: C.C(kat, x, y - 4.6, 1.1)
    if kesici:
        C.L(kat, [(x - 1.3, y - 2.2), (x + 1.3, y - 4.8)]); C.L(kat, [(x + 1.3, y - 2.2), (x - 1.3, y - 4.8)])
    C.L(kat, [(x, y - 11.5), (x - 4.6, y - 4.6)])
    C.L(kat, [(x, y - 11.5), (x, y - 14)])
    return y - 14


def sy_kesici(C, kat, x, y, cekmeceli=False):
    """Kesici: IEC kesici + gövde çerçevesi (kare) — paftada belirgin olsun diye."""
    C.L(kat, [(x, y), (x, y - 2)])
    C.R(kat, x - 4.2, y - 2, x + 4.2, y - 16)
    sy_ayirici(C, kat, x, y - 2, kesici=True, ayir=False)
    C.L(kat, [(x, y - 16), (x, y - 18)])
    if cekmeceli:
        for yy in (y - 2, y - 16):
            C.L(kat, [(x - 1.5, yy + 1.2), (x, yy), (x + 1.5, yy + 1.2)])
    return y - 18


def sy_at(C, kat, x, y, n=2):
    """Akım trafosu: hat üzerinde n çekirdek (daire)."""
    r = 2.1
    for i in range(n): C.C(kat, x, y - 2.5 - i * 3.0, r)
    yb = y - 2.5 - (n - 1) * 3.0 - 2.5
    C.L(kat, [(x, y), (x, yb)])
    return yb


def sy_gt(C, kat, x, y, n=2, yildiz_toprak=True):
    """Gerilim trafosu: iç içe daireler (n sargı), sargı yıldız noktası topraklı."""
    C.L(kat, [(x, y), (x, y - 1.5)])
    C.C(kat, x, y - 4.0, 2.5); C.C(kat, x, y - 7.6, 2.5)
    if n >= 3: C.C(kat, x + 3.0, y - 5.8, 2.5)
    if yildiz_toprak: sy_toprak(C, x, y - 10.1)
    return y - 14.1


def sy_sigorta(C, kat, x, y, L=8):
    C.R(kat, x - 1.3, y - 1.2, x + 1.3, y - L + 1.2)
    C.L(kat, [(x, y), (x, y - L)])
    return y - L


def sy_kablo_basligi(C, kat, x, y):
    C.PL(kat, [(x - 2.4, y), (x + 2.4, y), (x, y - 3.4), (x - 2.4, y)])
    return y - 3.4


def sy_kgg(C, kat, x, y, yon=-1):
    """Kapasitif gerilim göstergesi (KGG/VPIS): kondansatör + lamba, hattın solunda."""
    a = x + yon * 2.0; b = x + yon * 5.0
    C.L(kat, [(x, y), (a, y)])
    C.L(kat, [(a, y - 1.6), (a, y + 1.6)]); C.L(kat, [(a + yon * 0.9, y - 1.6), (a + yon * 0.9, y + 1.6)])
    C.L(kat, [(a + yon * 0.9, y), (b, y)])
    C.C(kat, b + yon * 1.3, y, 1.3)
    C.L(kat, [(b + yon * 0.4, y + 0.9), (b + yon * 2.2, y - 0.9)]); C.L(kat, [(b + yon * 0.4, y - 0.9), (b + yon * 2.2, y + 0.9)])


def sy_toprak_ayirici(C, kat, x, y, yon=1):
    """Toprak ayırıcısı: hattan yana kol, dikey ayırıcı bıçağı, toprak."""
    xe = x + yon * 7.5
    C.L(kat, [(x, y), (xe, y)]); C.C(kat, x, y, 0.5)
    sy_ayirici(C, kat, xe, y, ayir=True)
    sy_toprak(C, xe, y - 14)


def sy_parafudr(C, kat, x, y, yon=1):
    xe = x + yon * 7.5
    C.L(kat, [(x, y), (xe, y), (xe, y - 2)]); C.C(kat, x, y, 0.5)
    C.R(kat, xe - 1.4, y - 2, xe + 1.4, y - 8)
    C.L(kat, [(xe, y - 3), (xe, y - 6.6)]); C.PL(kat, [(xe - 0.8, y - 5.6), (xe + 0.8, y - 5.6), (xe, y - 7), (xe - 0.8, y - 5.6)], dolgu=True)
    C.L(kat, [(xe, y - 8), (xe, y - 9)])
    sy_toprak(C, xe, y - 9)


def sy_motor(C, x, y):
    C.C(TH_KUM, x, y, 2.1); C.T(TH_KUM, x, y, 2.0, "M", "C", zorla=True)


def sy_trafo(C, kat, x, y, r=9.0):
    """Güç trafosu: iki daire; üstte Δ (OG), altta Y (AG, nötr topraklı). Dönüş: alt y."""
    c1, c2 = y - r, y - r - 1.45 * r
    C.L(kat, [(x, y + 2), (x, y)])
    C.C(kat, x, c1, r); C.C(kat, x, c2, r)
    t = r * 0.38
    C.PL(kat, [(x - t, c1 - t * 0.6), (x + t, c1 - t * 0.6), (x, c1 + t * 0.9), (x - t, c1 - t * 0.6)])
    for a in (90, 210, 330):
        C.L(kat, [(x, c2), (x + t * math.cos(math.radians(a)), c2 + t * math.sin(math.radians(a)))])
    return c2 - r


def sy_dsya(C, kat, x, y):
    """Sigortalı yük ayırıcı (DSYA / NH): yük ayırıcı + sigorta seri."""
    yb = sy_ayirici(C, kat, x, y, yuk=True)
    return sy_sigorta(C, kat, x, yb, 8)


def sy_inverter(C, kat, x, y, w=13.0):
    C.R(kat, x - w / 2, y, x + w / 2, y - w)
    C.L(kat, [(x - w / 2, y - w), (x + w / 2, y)])
    C.T(kat, x - w / 2 + 1.0, y - 4.2, 2.6, "=", zorla=True); C.T(kat, x + w / 2 - 4.6, y - w + 1.0, 2.6, "~", zorla=True)
    return y - w


def sy_kutu(C, kat, x0, y0, w, h, satirlar, th=1.7):
    C.R(kat, x0, y0, x0 + w, y0 - h)
    C.TL(TH_YZ, x0 + 1.2, y0 - th - 1.0, th, satirlar)


def bara(C, kat, x0, x1, y, t=1.3):
    C.R(kat, x0, y + t / 2, x1, y - t / 2, dolgu=True)


# ---------- hücre spesifikasyonları
TM_HUCRE_VARS = [
    {"no": "H-01", "tip": "ya_giris", "ad": "MOTORLU YÜK AYIRICILI GİRİŞ HÜCRESİ", "kumanda": "Motor 24 V DC"},
    {"no": "H-02", "tip": "trafo_koruma", "ad": "KESİCİLİ TRAFO KORUMA HÜCRESİ",
     "kesici": "SF6 kesici 36 kV 630 A 16 kA", "at": "3 × 150/5-5 A · 15+15 VA · Kl 0,5 + 5P10", "role": ["50/51", "50N/51N"]},
    {"no": "H-03", "tip": "kesicili", "ad": "KESİCİLİ GİRİŞ-ÇIKIŞ HÜCRESİ",
     "kesici": "SF6 kesici 36 kV 630 A 16 kA", "at": "3 × 250/5-5 A · 15+15 VA · Kl 0,5 + 5P10", "role": ["50/51", "50N/51N"]},
]
DM_HUCRE_VARS = [
    {"no": "H-01", "tip": "giris_kesicili", "ad": "KESİCİLİ GİRİŞ (OTOPRODÜKTÖR) HÜCRESİ", "in_a": 1250, "ik_ka": 25,
     "kesici": "SF6 kesici 36 kV 1250 A 25 kA", "at": "3 × 600/5-5 A · 0,5Fs5 15 VA + 5P10 15 VA",
     "gt": "3 × 33/√3 / 0,1/√3 / 0,1/3 kV · Kl 0,5 + 3P · 15+15 VA",
     "role": ["24, 27, 27V, 32P, 32Q", "37, 46, 49, 50/51", "50N/51N, 59, 59N", "67/67N, 79, 81, 50BF"]},
    {"no": "H-02", "tip": "olcu", "ad": "AKIM-GERİLİM ÖLÇÜ HÜCRESİ", "in_a": 1250, "ik_ka": 25,
     "at": "3 × 600/5-5-5 A · 3 × 0,5Fs5 15 VA", "gt": "3 × 33/√3 / 0,1/√3 kV · Kl 0,5 · 15+15+15 VA",
     "sigorta": "36 kV 2 A", "sayac": ["Ana sayaç kWh (EKK)", "Yedek sayaç kWh"]},
    {"no": "H-03", "tip": "ic_ihtiyac", "ad": "İÇ İHTİYAÇ HÜCRESİ", "sigorta": "36 kV 2 A",
     "trafo": "33/√3 / 0,1/√3 / 0,22 kV · Kl 0,5 + 3P · 60 + 800 VA", "pano": "İç ihtiyaç panosu · akü-redresör 110 V DC"},
    {"no": "H-04", "tip": "kesicili", "ad": "KESİCİLİ ÇIKIŞ (FİDER) HÜCRESİ",
     "kesici": "SF6 kesici 36 kV 630 A 25 kA", "at": "3 × 350/5-5 A · 0,5Fs5 15 VA + 5P10 15 VA · Ith 16 kA", "role": ["50/51", "50N/51N"]},
]
HW, HH, HBAS = 64.0, 160.0, 16.0          # hücre genişlik, yükseklik, başlık bandı
BARA_DY = 24.0                            # hücre üstünden baraya


def hucre(C, x0, ytop, h, bara_txt, alt_etiket=None):
    """Bir OG hücresi: gövde + başlık + içerik. Hat bara'dan kablo çıkışına kesintisiz. Dönüş: (eksen x, kablo alt y)."""
    tip = h["tip"]
    C.R(TH_HUC, x0, ytop, x0 + HW, ytop - HH)
    C.L(TH_HUC, [(x0, ytop - HBAS), (x0 + HW, ytop - HBAS)])
    C.T(TH_YZ, x0 + 2, ytop - 5.2, 3.2, h["no"])
    C.TL(TH_YZ, x0 + 2, ytop - 9.4, 1.75, sar(h["ad"], 34))
    yb = ytop - BARA_DY
    x = x0 + 24.0                          # ekipman ekseni
    lx = x0 + 33.0                         # etiket sütunu
    O = TH_OG
    if tip == "olcu":
        xl, xr = x0 + 10.0, x0 + HW - 10.0
        C.L(O, [(x0, yb), (xl, yb), (xl, yb - 22)])
        sy_at(C, O, xl, yb - 22, 3)
        C.L(O, [(xl, yb - 31.5), (xl, yb - 44), (xr, yb - 44), (xr, yb), (x0 + HW, yb)])
        C.TL(TH_YZ, xl + 4, yb - 23, 1.55, ["AT (ölçü)"] + sar(h.get("at", ""), 26))
        gx = x0 + 32.0
        C.C(O, gx, yb - 44, 0.6)
        y = sy_ayirici(C, O, gx, yb - 44, ayir=True)
        C.L(O, [(gx, y), (gx, y - 3)])
        y = sy_sigorta(C, O, gx, y - 3, 9)
        C.T(TH_YZ, gx + 3, y + 4, 1.55, "Sigorta " + h.get("sigorta", ""))
        C.L(O, [(gx, y), (gx, y - 3)])
        y = sy_gt(C, O, gx, y - 3, 2)
        C.TL(TH_YZ, x0 + 3, y - 3, 1.55, ["GT " + l for l in sar(h.get("gt", ""), 36)[:1]] + sar(h.get("gt", ""), 36)[1:])
        yy = y - 13
        for i, s_ in enumerate(h.get("sayac", [])):
            sy_kutu(C, TH_KUM, x0 + 4 + i * 29, yy, 26, 11, sar(s_, 18), 1.5)
        C.L(TH_KUM, [(gx - 2.5, y + 8), (x0 + 17, y + 8), (x0 + 17, yy)]); C.L(TH_KUM, [(gx + 2.5, y + 8), (x0 + 46, y + 8), (x0 + 46, yy)])
        return x, None
    if tip == "ic_ihtiyac":
        C.L(O, [(x, yb), (x, yb - 4)]); C.C(O, x, yb, 0.6)
        y = sy_ayirici(C, O, x, yb - 4, yuk=True)
        C.T(TH_YZ, lx, y + 7, 1.6, "Yük ayırıcı")
        C.L(O, [(x, y), (x, y - 4)])
        y = sy_sigorta(C, O, x, y - 4, 10)
        C.T(TH_YZ, lx, y + 5, 1.6, "Sigorta " + h.get("sigorta", ""))
        C.L(O, [(x, y), (x, y - 12)])
        sy_toprak_ayirici(C, O, x, y - 5, -1)
        y = sy_gt(C, O, x, y - 12, 2, yildiz_toprak=False)
        C.TL(TH_YZ, lx, y + 12, 1.55, ["İç ihtiyaç trafosu"] + sar(h.get("trafo", ""), 20))
        C.L(TH_AG, [(x, y + 2), (x, y - 6)])
        sy_kutu(C, TH_AG, x0 + 6, y - 6, 52, 13, sar(h.get("pano", ""), 34), 1.5)
        return x, None

    def hat(y1, y2): C.L(O, [(x, y1), (x, y2)])
    C.C(O, x, yb, 0.6)
    hat(yb, yb - 4); y = yb - 4
    if tip == "ya_giris":
        y = sy_ayirici(C, O, x, y, yuk=True)
        sy_motor(C, x - 12, y + 7); C.L(TH_KUM, [(x - 9.9, y + 7), (x - 3.2, y + 7)])
        C.TL(TH_YZ, lx, y + 11, 1.6, ["Yük ayırıcı (motorlu)", f"{h.get('un_kv', 36)} kV {h.get('in_a', 630)} A {h.get('ik_ka', 16)} kA", h.get("kumanda", "")])
        hat(y, y - 12); y -= 12
        sy_toprak_ayirici(C, O, x, y, 1); C.T(TH_YZ, lx + 2, y - 9, 1.6, "Toprak ayırıcısı")
        hat(y, y - 24); y -= 24
    else:
        y = sy_ayirici(C, O, x, y, ayir=True)
        C.TL(TH_YZ, lx, y + 10, 1.6, ["Ayırıcı (3 konumlu)", f"{h.get('un_kv', 36)} kV {h.get('in_a', 630)} A"])
        hat(y, y - 4); y -= 4
        yk = y
        y = sy_kesici(C, O, x, y)
        C.TL(TH_YZ, lx, yk - 4, 1.6, sar(h.get("kesici", "Kesici"), 19))
        hat(y, y - 4); y -= 4
        y_at = y
        y = sy_at(C, O, x, y, 2)
        C.TL(TH_YZ, lx, y_at - 1, 1.55, sar(h.get("at", "AT"), 20))
        rl = h.get("role", [])
        if rl:
            bh = 3.5 + 2.2 * (len(rl) + 1)
            bw = 17.0 if max(len(r) for r in rl) < 12 else 19.5
            rx = x - 4.5 - bw
            sy_kutu(C, TH_KUM, rx, y_at + 1, bw, bh, ["RÖLE"] + rl, 1.4)
            C.L(TH_KUM, [(x - 2.1, y_at - 4), (rx + bw, y_at - 4)])                       # AT → röle
            C.L(TH_KUM, [(rx + bw / 2, y_at + 1), (rx + bw / 2, yk - 9), (x - 4.2, yk - 9)])  # röle → kesici açma
        hat(y, y - 7); y -= 7
        if tip == "giris_kesicili":
            gx = x0 + 8.0
            C.C(O, x, y, 0.5); C.L(O, [(x, y), (gx, y)])
            yg = sy_sigorta(C, O, gx, y, 8)
            C.L(O, [(gx, yg), (gx, yg - 2)])
            yg = sy_gt(C, O, gx, yg - 2, 3)
            C.TL(TH_YZ, x0 + 2, yg - 2, 1.4, sar("GT " + h.get("gt", ""), 15)[:6])
        sy_toprak_ayirici(C, O, x, y, 1); C.T(TH_YZ, lx + 2, y - 9, 1.6, "Toprak ay.")
        dy = 40 if tip == "giris_kesicili" else 22
        hat(y, y - dy); y -= dy
    sy_kgg(C, TH_KUM, x, y, -1); C.T(TH_YZ, x - 11, y - 4, 1.4, "KGG")
    if tip == "giris_kesicili":
        sy_parafudr(C, O, x, y, 1); C.T(TH_YZ, x + 10, y - 5, 1.5, "Parafudr")
    hat(y, y - 8); y -= 8
    y = sy_kablo_basligi(C, O, x, y)
    if tip == "giris_kesicili": C.T(TH_YZ, x0 + 2, y - 1, 1.5, "Kablo başlığı")
    else: C.T(TH_YZ, lx, y + 1, 1.6, "Kablo başlığı")
    yalt = ytop - HH
    hat(y, yalt)
    return x, yalt


def hucre_dizisi(C, x0, ytop, hucreler, bara_txt, kosk_txt):
    """Hücreleri yan yana dizer, ortak barayı ve köşk sınırını çizer. Dönüş: [(eksen x, alt y)]."""
    out = []
    for i, h in enumerate(hucreler):
        out.append(hucre(C, x0 + i * HW, ytop, h, bara_txt))
    yb = ytop - BARA_DY
    x1 = x0 + len(hucreler) * HW
    # bara: ölçü hücresi üstünde boşluk (seri geçiş hücre içinde)
    seg, xs = [], x0
    for i, h in enumerate(hucreler):
        if h["tip"] == "olcu":
            seg.append((xs, x0 + i * HW)); xs = x0 + (i + 1) * HW
    seg.append((xs, x1))
    for a, b in seg:
        if b > a: bara(C, TH_BARA, a + (1.5 if a == x0 else 0), b - (1.5 if b == x1 else 0), yb)
    C.T(TH_YZ, x0 + 2, yb + 1.6, 1.6, bara_txt)
    C.R(TH_KOSK, x0 - 6, ytop + 10, x1 + 6, ytop - HH - 6)
    C.T(TH_YZ, x0 - 5, ytop + 4, 2.6, kosk_txt)
    return out


def sembol_tablosu(C, x0, y0, w=150.0):
    """Elektriksel semboller ve anlamları (Proje Yön. — her paftada)."""
    items = [("kesici", "Kesici (SF6 / vakum)"), ("ya", "Yük ayırıcı"), ("ay", "Ayırıcı"), ("ta", "Toprak ayırıcısı"),
             ("at", "Akım trafosu (2 çekirdek)"), ("gt", "Gerilim trafosu"), ("sig", "Sigorta"), ("kb", "Kablo başlığı"),
             ("kgg", "Kapasitif gerilim göstergesi"), ("pf", "Parafudr"), ("top", "Topraklama"), ("m", "Motor kumandası"),
             ("tr", "Güç trafosu Dy11"), ("dsya", "Sigortalı yük ayırıcı (DSYA)"), ("inv", "İnverter (DC/AC)"),
             ("bara", "Bara"), ("kum", "Kumanda / ölçü bağlantısı"), ("kosk", "Köşk / pano sınırı")]
    sat = math.ceil(len(items) / 2); rh = 14.0
    h = sat * rh + 12
    C.R(TH_YZ, x0, y0, x0 + w, y0 - h)
    C.T(TH_YZ, x0 + 2, y0 - 6, 2.4, "ELEKTRİKSEL SEMBOLLER VE ANLAMLARI")
    C.L(TH_YZ, [(x0, y0 - 8.5), (x0 + w, y0 - 8.5)])
    for j, (k, ad) in enumerate(items):
        col, row = divmod(j, sat)
        sx = x0 + 9 + col * w / 2; sy = y0 - 10.5 - row * rh
        S = Ciz(C.pf, *C.P(sx, sy), C.k * 0.7)
        O = TH_OG
        if k == "kesici": sy_kesici(S, O, 0, 0)
        elif k == "ya": sy_ayirici(S, O, 0, 0, yuk=True)
        elif k == "ay": sy_ayirici(S, O, 0, 0)
        elif k == "ta": sy_ayirici(S, O, 0, 2); sy_toprak(S, 0, -12)
        elif k == "at": S.L(O, [(0, -2), (0, -15)]); S.C(O, 0, -6.5, 2.1); S.C(O, 0, -9.5, 2.1)
        elif k == "gt": sy_gt(S, O, 0, -1, 2, False)
        elif k == "sig": sy_sigorta(S, O, 0, -2, 12)
        elif k == "kb": S.L(O, [(0, -2), (0, -6)]); sy_kablo_basligi(S, O, 0, -6); S.L(O, [(0, -9.4), (0, -14)])
        elif k == "kgg": sy_kgg(S, TH_KUM, 4, -8, -1)
        elif k == "pf": S.R(O, -1.4, -3, 1.4, -10); S.L(O, [(0, -4), (0, -8.4)]); S.PL(O, [(-0.8, -7.4), (0.8, -7.4), (0, -8.8), (-0.8, -7.4)], True)
        elif k == "top": sy_toprak(S, 0, -4)
        elif k == "m": sy_motor(S, 0, -8)
        elif k == "tr": sy_trafo(S, O, 0, -1, 4.2)
        elif k == "dsya": sy_ayirici(S, O, 0, 3, yuk=True); S.R(O, -1.2, -11.5, 1.2, -16.5); S.L(O, [(0, -11), (0, -17)])
        elif k == "inv": sy_inverter(S, TH_AG, 0, -1, 12)
        elif k == "bara": bara(S, TH_BARA, -6, 6, -8, 1.6)
        elif k == "kum": S.L(TH_KUM, [(-6, -8), (6, -8)])
        elif k == "kosk": S.L(TH_KOSK, [(-6, -8), (6, -8)])
        C.T(TH_YZ, sx + 8, sy - 7, 1.9, ad)
    return y0 - h


def _inv_sigorta(e, kw=None):
    kw = kw or e.get("inverter_ac_kw")
    if not kw: return e.get("ag_inv_cikis") or "3 × DSYA (In inverter verisine göre)"
    I = kw * 1000 / (math.sqrt(3) * e["ag_gerilim_v"])
    In = next((a for a in [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630] if a >= 1.25 * I), 630)
    return e.get("ag_inv_cikis") or f"3 × {In} A DSYA {e['ag_gerilim_v']} V"


def pafta_tekhat_tm(M, t, kod, tek=False):
    """TM t (0 tabanlı): OG hücreleri + trafo + AG ana dağıtım panosu + inverter çıkışları."""
    e = M.P["elektrik"]
    pf = Pafta(kod, f"TM-{t+1} OG/AG TEK HAT ŞEMASI", olcekli=False)
    C = Ciz(pf)
    _girisler(M)
    invs = sorted([i for i in M.inverterler if i["tr"] == t + 1], key=lambda i: i["gno"])
    nstr = sum(i["n_str"] for i in invs)
    gelen = next((o for o in M.og if o["ye"] == f"TM{t+1}"), None)
    giden = next((o for o in M.og if o["den"] == f"TM{t+1}"), None)
    hucreler = copy.deepcopy(e.get("tm_hucreler") or TM_HUCRE_VARS)
    ob = e.get("og_bara", {})
    tek_kosk = bool(getattr(M, "dm_ortak", False) and t == 0)
    if tek_kosk:   # tek trafolu tesis: DM hücreleri (giriş, ölçü, iç ihtiyaç) TM köşkünde, aynı barada; TM'ye ayrı giriş hücresi yok
        dmh = [h for h in copy.deepcopy(e.get("dm_hucreler") or DM_HUCRE_VARS) if h["tip"] in ("giris_kesicili", "olcu", "ic_ihtiyac")]
        hucreler = dmh + [h for h in hucreler if h["tip"] == "trafo_koruma"]
        ob = e.get("dm_bara", ob)
    for h in hucreler:
        h.setdefault("un_kv", ob.get("un_kv", 36)); h.setdefault("in_a", ob.get("in_a", 630)); h.setdefault("ik_ka", ob.get("ik_ka", 16))
    YT = 470.0; X0 = 16.0
    bara_txt = f"OG BARA {ob.get('un_kv', 36)} kV · {ob.get('in_a', 630)} A · {ob.get('ik_ka', 16)} kA/1 s · {ob.get('malzeme', 'Cu')}"
    eks = hucre_dizisi(C, X0, YT, hucreler, bara_txt, f"TM-{t+1}" + (" + DM (tek köşk)" if tek_kosk else "") + "  OG HÜCRELERİ (IEC 62271-200)")
    yalt = YT - HH
    tr_x = None
    for h, (x, yb) in zip(hucreler, eks):
        if yb is None: continue
        if h["tip"] == "trafo_koruma":
            tr_x = X0 + len(hucreler) * HW + 46
            C.L(TH_OG, [(x, yb), (x, yb - 26), (tr_x, yb - 26), (tr_x, yb - 30)])
            C.TL(TH_YZ, x + 2, yb - 31, 1.6, ["→ TR-%d" % (t + 1), e.get("og_trafo_kablo", "3×(1×95/16 mm²) N2XSY · 10 m")])
            continue
        if h["tip"] == "giris_kesicili":
            C.L(TH_OG, [(x, yb), (x, yb - 9)])
            C.PL(TH_OG, [(x - 1.3, yb - 6.5), (x + 1.3, yb - 6.5), (x, yb - 3.5), (x - 1.3, yb - 6.5)], dolgu=True)
            C.TL(TH_YZ, x - 20, yb - 13, 1.65, [f"↑ ŞEBEKE / ENH {e.get('sebeke_gerilim_kv') or e.get('og_gerilim_kv', 33)} kV", e.get("dm_giris_kablo", "Bağlantı noktasına (TM/ENH) — bağlantı anlaşmasına göre")])
            continue
        if h["tip"] == "ic_ihtiyac":
            C.L(TH_OG, [(x, yb), (x, yb - 9)]); C.TL(TH_YZ, x - 20, yb - 13, 1.65, ["İç ihtiyaç trafosu / panosu"])
            continue
        if h["tip"] == "ya_giris": seg, ok = gelen, "←"
        else: seg, ok = giden, "→"
        C.L(TH_OG, [(x, yb), (x, yb - 9)])
        C.PL(TH_OG, [(x - 1.3, yb - 6.5), (x + 1.3, yb - 6.5), (x, yb - 9.5), (x - 1.3, yb - 6.5)], dolgu=True)
        if seg:
            ad = seg["den"] if ok == "←" else seg["ye"]
            kab = e["og_kablo_dm"] if seg["den"] == "DM" else e["og_kablo"]
            C.TL(TH_YZ, x - 20, yb - 13, 1.65, [f"{ok} {ad.replace('TM', 'TM-')}", kab, f"L = {seg['m']:.0f} m"])
        else:
            C.TL(TH_YZ, x - 20, yb - 13, 1.65, ["YEDEK / ring kapama", "(kablo bağlı değil)"])
    if tr_x is None: tr_x = X0 + len(hucreler) * HW + 46
    # trafo
    ty = yalt - 30
    yt_alt = sy_trafo(C, TH_OG, tr_x, ty, 10.0)
    c2 = ty - 10.0 - 14.5
    C.L(TH_TOP, [(tr_x + 10, c2), (tr_x + 17, c2), (tr_x + 17, c2 - 3)]); sy_toprak(C, tr_x + 17, c2 - 3)
    kva_t = M.tr_kva[t] if getattr(M, "tr_kva", None) else e["trafo_kva"]
    harici = kva_t >= e["harici_trafo_min_kva"]
    C.TL(TH_YZ, tr_x + 15, ty - 2, 1.9, [f"TR-{t+1}  {kva_t} kVA", e["trafo_gerilim"],
         f"%uk {e['trafo_uk_pct']}" if e.get("trafo_uk_pct") else "%uk: imalatçı verisi",
         "Yağlı, HARİCİ tip · yağ çukuru · çit h ≥ 1,8 m" if harici else "Köşk içi (dahili) tip"])
    C.T(TH_YZ, tr_x + 20, c2 - 6, 1.5, "Nötr işletme topraklaması")
    # AG pano
    agx0 = X0 - 6
    _sp = 24.0; _spi = (max(inv_kutu_w(i) for i in invs) + 10) if invs else _sp   # kullanıcı kuralı 19.10.2026: inverterler yan yana, her biri kendi TMŞ'sinin altında
    agx1 = max(agx0 + 6 + 2 * _sp + len(invs) * _spi + 16, tr_x + 80)
    ytp = yt_alt - 14
    C.L(TH_AG, [(tr_x, yt_alt), (tr_x, ytp)])
    C.TL(TH_YZ, tr_x + 3, yt_alt - 2, 1.6, [e.get("trafo_ag_kablo", "7×(3×1×300 mm²) N2XH · 10 m")])
    C.T(TH_YZ, agx0 + 2, ytp - 5, 2.4, f"GES PANOSU-{t+1} (ADP · TR{t+1}-ACB1)  {e['ag_gerilim_v']} V · In {e['ag_pano_in_a']} A · Icw {e['ag_pano_icw_ka']} kA · {e['ag_pano_form']} · {e['ag_pano_ip']} · IEC 61439-1/2 tip testli")
    y = sy_kesici(C, TH_AG, tr_x, ytp, cekmeceli=True)
    sy_motor(C, tr_x - 12, y + 9); C.L(TH_KUM, [(tr_x - 9.9, y + 9), (tr_x - 4.2, y + 9)])
    C.TL(TH_YZ, tr_x + 6, y + 15, 1.6, sar(e.get("ag_ana_kesici", f"ACB (TMŞ) motorlu çekmeceli 3 × {e['ag_pano_in_a']} A {e['ag_pano_icw_ka']} kA"), 30))
    ya = y
    y = sy_at(C, TH_AG, tr_x, y, 2)
    C.TL(TH_YZ, tr_x + 6, ya - 2, 1.55, sar(e.get("ag_at", f"AT 3 × {e['ag_pano_in_a']}/5 A · 15 VA · Kl 0,5"), 30))
    sy_kutu(C, TH_KUM, tr_x - 48, ytp - 2, 28, 10, ["Enerji analizörü", "A · V · kW · kWh"], 1.5)
    sy_kutu(C, TH_KUM, tr_x - 48, ytp - 14, 28, 10, ["Koruma rölesi", "50/51 · 50N/51N"], 1.5)
    sy_kutu(C, TH_KUM, tr_x - 80, ytp - 2, 28, 22, ["MÜHÜRLÜ BÖLÜM", "Çift yönlü sayaç", "(OSOS)", "AT ölçü devresi"], 1.5)
    C.L(TH_KUM, [(tr_x - 2.1, ya - 4), (tr_x - 17, ya - 4), (tr_x - 17, ytp - 7), (tr_x - 20, ytp - 7)])
    C.L(TH_KUM, [(tr_x - 17, ytp - 19), (tr_x - 20, ytp - 19)])
    yb = y - 4
    bara(C, TH_BARA, agx0 + 8, agx1 - 8, yb, 1.6)
    C.T(TH_YZ, agx0 + 10, yb + 1.8, 1.6, f"AG BARA {e.get('ag_bara', '3 × (120×10) mm Cu')} · {e['ag_gerilim_v']} V")
    # çıkışlar
    n_cik = len(invs) + 2
    sp = _sp
    cx0 = agx0 + sp / 2 + 6
    # iç ihtiyaç çıkışı
    x = cx0
    C.L(TH_AG, [(x, yb), (x, yb - 2)]); C.C(TH_AG, x, yb, 0.6)
    yy = sy_dsya(C, TH_AG, x, yb - 2)
    izo = e["ag_gerilim_v"] > 400            # kullanıcı kuralı 19.10.2026: izolasyon (0,8/0,4 kV) trafosu yalnız 800 V AG çıkışlı trafoda
    if izo: yy = sy_gt(C, TH_AG, x, yy - 1, 2, False)
    C.L(TH_AG, [(x, yy), (x, yy - 4)])
    ic_txt = e.get("ag_ic_ihtiyac") or ("İzolasyon trafosu 0,8/0,4 kV 20 kVA %uk 4,5 · 125 A gG · KAKR 4×40 A 300 mA · İç ihtiyaç: aydınlatma, priz, CCTV, OG kumanda, akü-redresör" if izo
                                        else "İç ihtiyaç panosu 400/230 V · KAKR 4×40 A 300 mA · aydınlatma, priz, CCTV, OG kumanda, akü-redresör")
    _sat = sar(ic_txt, max(10, int(sp / 1.15)))
    sy_kutu(C, TH_AG, x - sp / 2 + 1, yy - 4, sp - 2, len(_sat) * 2.05 + 3, _sat, 1.4)
    C.T(TH_YZ, x + 3, yb - 8, 1.4, "İç ihtiyaç")
    yic = yy - 4 - len(_sat) * 2.05 - 7
    # parafudr + ölçü
    x = cx0 + sp
    C.L(TH_AG, [(x, yb), (x, yb - 4)]); C.C(TH_AG, x, yb, 0.6)
    yy = sy_sigorta(C, TH_AG, x, yb - 4, 8)
    C.R(TH_AG, x - 1.4, yy - 1, x + 1.4, yy - 7); C.L(TH_AG, [(x, yy), (x, yy - 1)]); C.L(TH_AG, [(x, yy - 2), (x, yy - 5.6)])
    C.PL(TH_AG, [(x - 0.8, yy - 4.6), (x + 0.8, yy - 4.6), (x, yy - 6), (x - 0.8, yy - 4.6)], dolgu=True)
    C.L(TH_AG, [(x, yy - 7), (x, yy - 9)]); sy_toprak(C, x, yy - 9)
    C.TL(TH_YZ, x - sp / 2 + 1.5, yy - 16, 1.4, sar(e.get("ag_parafudr", "AC Parafudr T1+T2 · NH 3 × 160 A"), max(10, int(sp / 1.15))))
    # inverter çıkışları: TMŞ-nn (TUTGU GES onaylı tek hat) → kanal → inverter kutuları
    ybot = min(yb - 40, yy - 30, ytp - 70, yic)
    xs_list = []
    for j, inv in enumerate(invs):
        ikw = inv.get("ac_kw") or e["inverter_ac_kw"]
        x = cx0 + 2 * sp + j * _spi + _spi / 2; xs_list.append(x)
        C.L(TH_AG, [(x, yb), (x, yb - 2)]); C.C(TH_AG, x, yb, 0.6)
        yy2 = sy_kesici(C, TH_AG, x, yb - 2)
        C.L(TH_AG, [(x, yy2), (x, ybot)])
        C.TL(TH_YZ, x + 2.4, yb - 5, 1.35, [f"TMŞ-{inv['gno']:02d}", "3 kutuplu", f"{e['ag_gerilim_v']} V", f"{_inv_tms_a(e, ikw) or '—'} A {e.get('ag_cikis_ka', 36)} kA"], 1.35)
        C.T(TH_YZ, x + 1.8, ybot - 31, 1.45, f"INV-{inv['gno']:02d} {inv.get('ag_kablo', e['ac_kablo'])} {inv['ac_m']:.0f} m", rot=90)
    C.R(TH_KOSK, agx0, ytp, agx1, ybot)
    cxk = (xs_list[(len(invs) + 1) // 2 - 1] + xs_list[min((len(invs) + 1) // 2, len(invs) - 1)]) / 2 if len(invs) > 1 else (xs_list[0] if xs_list else cx0)
    yalt_inv = adp_dikey(C, M, invs, xs_list, ybot)
    # sağ üst: veri + sembol tablosu (tek paftada sembol tablosu ve notlar bir kez, DM bölümünde)
    dx = X0 + len(hucreler) * HW + 110
    if not tek: sembol_tablosu(C, dx + 300, YT + 6, 150)
    if e["inverter_ac_kw"]:
        kws = [i.get("ac_kw") or e["inverter_ac_kw"] for i in invs]
        ac_sum = sum(kws)
        grp = {}
        for v in kws: grp[v] = grp.get(v, 0) + 1
        inv_ozet = " + ".join(f"{n}×{p}" for p, n in sorted(grp.items(), reverse=True)) + " kW"
    else:
        ac_sum = None; inv_ozet = "—"
    ozt = tr_ozet_satir(M, t) + [("TRAFO", f"{kva_t} kVA" + (f" · yüklenme %{ac_sum / kva_t * 100:.0f}" if ac_sum else ""))]
    ya_ = tablo(C, dx, YT + 14, [("", 34, "L"), ("", 36, "L")], ozt, baslik=f"TR-{t+1} ÖZET", rh=4.0, th=1.6)
    pr_y = tablo(C, dx + 80, YT + 14, [("NO", 12, "C"), ("ADI", 62, "L"), ("KARAKTERİSTİKLER", 78, "L"), ("HEMEN", 12, "C"), ("YAKINDA", 12, "C"), ("İLERDE", 12, "C"), ("MEVCUT", 12, "C")],
                 [[a, b, c, d, "", "", ""] for a, b, c, d in primer_liste(M, t, hucreler)], baslik=f"{M.P['proje'].get('isin_adi') or 'GES'} TR-{t+1} PRİMER MALZEME LİSTESİ", rh=4.0, th=1.45)
    notlar = ["NOTLAR", "1. Hücre anma değerleri ve AT oranları kısa devre ve röle", "    koordinasyon hesabına göre kesinleşir (AYRI HAZIRLANIR).",
              "2. Röle açma süresi ≤ 0,5 s; dağıtım şirketi belirlemezse 0,3 s.", "3. OG hücre kumandası 24 V DC; akü-redresör iç ihtiyaçtan.",
              "4. Trafo koruma ve AG işletme topraklaması arası ≥ 20 m", "    veya yalıtılarak birleştirilir (Topraklama Yön.).",
              "5. AG pano tip testli (IEC 61439); kablo uzunlukları güzergâh + 10 m."]
    if not tek: C.TL(TH_YZ, dx, min(ya_, pr_y) - 8, 1.75, notlar, 1.5)
    else:
        bbt = pf.sinir()
        C.R(TH_KOSK, X0 - 12, YT + 26, bbt[2] + 6, min(yalt_inv, bbt[1]) - 6)
        C.T(TH_YZ, X0 - 10, YT + 20, 3.2, f"{M.P['proje'].get('isin_adi') or ''} TR-{t+1} · {kva_t} kVA · {len(invs)} inverter".strip())
    return pf


def pafta_tasi(dst, src, dx, dy):
    for t, k, d, i in src.p:
        if t in ("L", "P"): d = [(x + dx, y + dy) for x, y in d]
        elif t == "T": d = (d[0] + dx, d[1] + dy) + tuple(d[2:])
        elif t == "C": d = (d[0] + dx, d[1] + dy, d[2])
        dst.p.append((t, k, d, i))


def pafta_tekhat(M, kod="02"):
    """Tek hat TEK paftada (kullanıcı kuralı 19.10.2026): üstte DM + OG dağıtım, altında her TM'nin OG hücreleri + trafo +
    AG ana dağıtım panosu + tüm inverter çıkışları. Sembol tablosu ve notlar bir kez. Bloklar ızgarada, pafta A0'a
    sığmazsa uzatılmış kağıt."""
    if getattr(M, "dm_ortak", False):      # tek köşk: ayrı DM / OG dağıtım bölümü yok (DM hücreleri TM-1 bloğunda)
        pf = Pafta(kod, "TEK HAT ŞEMASI (TM + DM · AG PANO · İNVERTER · DC)", olcekli=False)
    else:
        pf = pafta_tekhat_dm(M, kod)
        pf.ad = "TEK HAT ŞEMASI (DM · OG DAĞITIM · TM · AG PANO)"
    tms = [pafta_tekhat_tm(M, t, kod, tek=True) for t in range(M.n_tr)]
    if not tms: return pf
    bb = pf.sinir(); tb = [q.sinir() for q in tms]
    W = max(b[2] - b[0] for b in tb) + 30; H = max(b[3] - b[1] for b in tb) + 30
    n = len(tms); en_iyi = None
    for nc in range(1, n + 1):
        nr = math.ceil(n / nc); w = max(bb[2] - bb[0], nc * W); h = (bb[3] - bb[1]) + 40 + nr * H
        f = abs(w / h - math.sqrt(2))
        if en_iyi is None or f < en_iyi[0]: en_iyi = (f, nc)
    nc = en_iyi[1]
    for j, (q, b) in enumerate(zip(tms, tb)):
        r, c = divmod(j, nc)
        pafta_tasi(pf, q, bb[0] + c * W - b[0], (bb[1] - 40 - r * H) - b[3])
    # tablolar (FV/evirici bilgileri, ADP DC kablo kesit-metraj listeleri) + köşk ve GES panosu görünüşleri
    b2 = pf.sinir()
    eks = [pafta_tablolar(M, kod), pafta_kosk(M, kod)]
    ebs = [q.sinir() for q in eks]
    ew = sum(b[2] - b[0] for b in ebs) + 40 * (len(ebs) - 1); eh = max(b[3] - b[1] for b in ebs)
    W0, H0 = b2[2] - b2[0], b2[3] - b2[1]
    alta = abs((max(W0, ew)) / (H0 + 40 + eh) - math.sqrt(2)) <= abs((W0 + 60 + max(b[2] - b[0] for b in ebs)) / max(H0, sum(b[3] - b[1] for b in ebs) + 40) - math.sqrt(2))
    if alta:
        x = b2[0]; ytop = b2[1] - 40
        for ek, eb in zip(eks, ebs):
            pafta_tasi(pf, ek, x - eb[0], ytop - eb[3]); x += eb[2] - eb[0] + 40
    else:
        x = b2[2] + 60; ytop = b2[3]
        for ek, eb in zip(eks, ebs):
            pafta_tasi(pf, ek, x - eb[0], ytop - eb[3]); ytop -= eb[3] - eb[1] + 40
    e = M.P["elektrik"]
    pf.notlar = ["İnverter maksimum DC giriş üzerinden yüklenmiştir; MPPT başına dizi × Isc ≤ MPPT anma akımı.",
                 "OG hücre anma değerleri ve AT oranları kısa devre ve röle koordinasyon hesabına göre kesinleşir.",
                 "Dağıtım şebekesinde enerji kesildiğinde evirici şebekeyi beslemez (ada çalışma koruması, LoM).",
                 "Röle açma süresi ≤ 0,5 s; dağıtım şirketi belirlemezse 0,3 s. OG kumanda 24 V DC akü-redresörden.",
                 "Trafo koruma ve AG işletme topraklaması arası ≥ 20 m veya yalıtılarak birleştirilir.",
                 f"AG çıkış kabloları {e['ac_kablo']}; boylar güzergâh + bağlantı payıdır. DC: {e['dc_kablo']} (string başı + ve −)."]
    if e.get("inverter_sinir_kw"):
        pf.notlar.insert(0, f"Eviriciler {e['inverter_sinir_kw']:g} kWe ile sınırlandırılacaktır; sistem AC gücü bağlantı anlaşmasına göre sınırlandırılır.")
    return pf


def pafta_tekhat_dm(M, kod):
    """DM hücreleri + OG dağıtım (DM → TM zinciri, her TM küçük hücre dizisiyle)."""
    e = M.P["elektrik"]
    pf = Pafta(kod, "DM VE OG DAĞITIM TEK HAT ŞEMASI", olcekli=False)
    C = Ciz(pf)
    hucreler = copy.deepcopy(e.get("dm_hucreler") or DM_HUCRE_VARS)
    db = e.get("dm_bara", {"un_kv": 36, "in_a": 1250, "ik_ka": 25, "malzeme": "Cu"})
    for h in hucreler:
        h.setdefault("un_kv", db.get("un_kv", 36)); h.setdefault("in_a", 630); h.setdefault("ik_ka", db.get("ik_ka", 25))
    fider = [h for h in hucreler if h["tip"] == "kesicili"]
    nyedek = e.get("dm_yedek_fider", 1)
    if fider:
        for k in range(nyedek):
            y_ = copy.deepcopy(fider[-1]); y_["no"] = f"H-{len(hucreler)+1:02d}"; y_["ad"] = "KESİCİLİ ÇIKIŞ (YEDEK FİDER) HÜCRESİ"; y_["yedek"] = True
            hucreler.append(y_)
    YT = 470.0; X0 = 16.0
    eks = hucre_dizisi(C, X0, YT, hucreler, f"DM BARA {db.get('un_kv', 36)} kV · {db.get('in_a', 1250)} A · {db.get('ik_ka', 25)} kA/1 s · {db.get('malzeme', 'Cu')}", "DAĞITIM MERKEZİ (DM) — OG HÜCRELERİ (IEC 62271-200)")
    yalt = YT - HH
    fx_list = []
    for h, (x, yb) in zip(hucreler, eks):
        if yb is None: continue
        C.L(TH_OG, [(x, yb), (x, yb - 9)])
        if h["tip"] == "giris_kesicili":
            C.PL(TH_OG, [(x - 1.3, yb - 6.5), (x + 1.3, yb - 6.5), (x, yb - 3.5), (x - 1.3, yb - 6.5)], dolgu=True)
            C.TL(TH_YZ, x - 20, yb - 13, 1.65, [f"↑ ŞEBEKE / ENH {e.get('sebeke_gerilim_kv') or e.get('og_gerilim_kv', 33)} kV", e.get("dm_giris_kablo", "Bağlantı noktasına (TM/ENH) — bağlantı anlaşmasına göre")])
        elif h.get("yedek"):
            C.TL(TH_YZ, x - 20, yb - 13, 1.65, ["YEDEK"])
        else:
            fx_list.append((x, yb))
    # OG dağıtım: DM fider → TM zinciri (her TM küçük ölçekli hücre dizisi + trafo)
    zincir = list(M.og)
    if not zincir or not fx_list:
        return pf
    fx, fyb = fx_list[0]
    k = 0.42
    bw = 3 * HW * k
    adim = bw + 24
    per_row = max(1, int((780 - 24) // adim))
    by0 = yalt - 52
    pos = {}
    for j, o in enumerate(zincir):
        r, c = divmod(j, per_row)
        bx = 24 + c * adim; byt = by0 - r * 135
        tn = int(o["ye"][2:])
        hs = copy.deepcopy(e.get("tm_hucreler") or TM_HUCRE_VARS)
        ek = hucre_dizisi(Ciz(pf, bx, byt, k, etiket=False), 0, 0, hs, "", "")
        invs = [i for i in M.inverterler if i["tr"] == tn]
        C.TL(TH_YZ, bx - 2, byt + 12, 2.2, [f"TM-{tn}  ·  TR-{tn} {(M.tr_kva[tn - 1] if getattr(M, 'tr_kva', None) else e['trafo_kva'])} kVA"])
        C.TL(TH_YZ, bx - 2, byt + 8.6, 1.5, [f"{len(invs)} INV · {sum(i['n_str'] for i in invs)} str · detay: aşağıda TM-{tn} bloğu"])
        P_ = lambda p: (bx + p[0] * k, byt + p[1] * k)
        g = {h["tip"]: P_(p) for p, h in zip(ek, hs) if p[1] is not None}
        if "trafo_koruma" in g:
            a2 = g["trafo_koruma"]
            C.L(TH_OG, [a2, (a2[0], a2[1] - 6)])
            sy_trafo(C, TH_OG, a2[0], a2[1] - 8, 6.0)
        pos[o["ye"]] = (g.get("ya_giris", (bx, byt - HH * k)), g.get("kesicili"), byt)
    for j, o in enumerate(zincir):
        gin, _, byt2 = pos[o["ye"]]
        kab = e["og_kablo_dm"] if o["den"] == "DM" else e["og_kablo"]
        yg = gin[1] - 10
        if o["den"] == "DM":
            a = (fx, fyb); yl = yalt - 26; xr = 8
            C.L(TH_OG, [a, (a[0], yl), (xr, yl), (xr, yg), (gin[0], yg), gin])
            C.TL(TH_YZ, xr + 3, yl - 3, 1.5, [f"DM → TM-{o['ye'][2:]}: {kab} · {o['m']:.0f} m"])
            continue
        a = pos[o["den"]][1]; byt1 = pos[o["den"]][2]
        if a is None: continue
        if abs(byt1 - byt2) < 1:
            C.L(TH_OG, [a, (a[0], yg), (gin[0], yg), gin])
            C.TL(TH_YZ, a[0] + 2, yg - 3, 1.45, [kab, f"{o['m']:.0f} m"])
        else:
            yl = a[1] - 38; xr = 10 + 1.5 * (j % 4)
            C.L(TH_OG, [a, (a[0], yl), (xr, yl), (xr, yg), (gin[0], yg), gin])
            C.TL(TH_YZ, a[0] + 2, yl - 3, 1.45, [f"{o['den'].replace('TM', 'TM-')} → {o['ye'].replace('TM', 'TM-')}: {kab} · {o['m']:.0f} m"])
    # sağ: sembol tablosu + notlar
    dx = X0 + len(hucreler) * HW + 20
    sembol_tablosu(C, max(dx, 640.0), YT + 6, 150)
    C.TL(TH_YZ, dx, YT - 130, 1.75, ["NOTLAR", "1. DM giriş ve ölçü hücresi bağlantı anlaşması / EDAŞ", "    şartlarına göre kesinleşir (EKK, sayaç tipi).",
         "2. Röle setleri koordinasyon hesabından (AYRI HAZIRLANIR).", "3. Kısa devre hesabı IEC 60909 (AYRI HAZIRLANIR).",
         f"4. OG kablo: DM çıkışı {e['og_kablo_dm']}, TM arası {e['og_kablo']}.", "5. Uzunluklar güzergâh + 20 m (başlık payı)."], 1.5)
    return pf


# ----------------------------------------------------------------- YAZICILAR
KENAR = (20, 10, 197, 12)    # sol (cilt payı 20 mm), üst, sağ (185 mm antet şeridi, onaylı form), alt — mm
PLAN_OLCEK = [500, 1000, 2000, 5000, 10000]   # Proje Yön.: YG/AG vaziyet 1/1000–1/2000, geniş alan 1/5000
DETAY_OLCEK = [10, 20, 50]


# ================================================================= ONAYLI PROJE DÜZENİ (TUTGU GES / Zorlu Tesis 1 GES, TEDAŞ onaylı)
# Kullanıcı kuralı 19.10.2026: tek hat, antet, DC kablo kesit-metraj listesi, köşk ve AG pano görünüşleri onay biriminin
# kabul ettiği bu örneklerdeki gibi çizilir; tüm projelerde aynı antet.

def _tr_sayi(v, d=2):
    s = f"{v:,.{d}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def _gno(M):
    """İnverterlere proje geneli sıra no (INVERTER-01…), TR ve TR içi sıraya göre."""
    for g, inv in enumerate(sorted(M.inverterler, key=lambda i: (i["tr"], i["no"]))): inv["gno"] = g + 1


def _girisler(M):
    """String → inverter girişi (S1…Sn) ve MPPT. Stringler MPPT'lere dengeli dağıtılır (D); boş girişler listede boş satırdır."""
    _gno(M); e = M.P["elektrik"]
    for inv in M.inverterler:
        ss = [s for s in M.stringler if s["inv"]["ad"] == inv["ad"]]
        n = len(ss)
        gir = max(n, int(e.get("inverter_giris") or e.get("string_inverter_max") or n or 1))
        mp = int(e.get("mppt_sayisi") or 0) or max(1, math.ceil(gir / 2))
        mp = min(mp, gir)
        per = math.ceil(gir / mp)
        inv["mppt"], inv["mppt_giris"], inv["giris"] = mp, per, mp * per
        for k, s in enumerate(ss):
            m_, slot = k % mp, k // mp
            s["mppt"] = m_ + 1; s["giris"] = m_ * per + slot + 1
        inv["str_list"] = sorted(ss, key=lambda s: s["giris"])


def _inv_tms_a(e, kw):
    if not kw: return None
    I = kw * 1000 / (math.sqrt(3) * e["ag_gerilim_v"])
    return next((a for a in [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800] if a >= 1.25 * I), 800)


def tablo(C, x0, y0, kolonlar, satirlar, baslik=None, rh=4.2, th=1.6, kat=None, kalin=None):
    """Basit tablo. kolonlar = [(başlık, genişlik, 'C'|'L')]. Dönüş: alt y."""
    kat = kat or TH_YZ
    W = sum(w for _, w, _ in kolonlar); y = y0
    if baslik:
        C.R(kat, x0, y, x0 + W, y - rh * 1.4); C.T(kat, x0 + W / 2, y - rh * 0.7, th * 1.2, baslik, hiz="C"); y -= rh * 1.4
    ust = y
    if any(ad for ad, _, _ in kolonlar):
        C.R(kat, x0, y, x0 + W, y - rh * 1.2); xx = x0
        for ad, w, hz in kolonlar:
            C.T(kat, xx + w / 2, y - rh * 0.6, th * 0.95, ad, hiz="C"); xx += w
        y -= rh * 1.2
    for r in satirlar:
        C.L(kat, [(x0, y - rh), (x0 + W, y - rh)]); xx = x0
        for (ad, w, hz), v in zip(kolonlar, r):
            if v not in (None, ""):
                if hz == "C": C.T(kat, xx + w / 2, y - rh / 2, th, str(v), hiz="C")
                else: C.T(kat, xx + 1.0, y - rh + rh * 0.25, th, str(v))
            xx += w
        y -= rh
    C.L(kat, [(x0, ust), (x0, y)]); C.L(kat, [(x0 + W, ust), (x0 + W, y)])
    xx = x0
    for ad, w, hz in kolonlar[:-1]:
        xx += w; C.L(kat, [(xx, ust), (xx, y)])
    return y


def sy_modul(C, kat, x, ytop, w=3.2, h=4.0):
    C.R(kat, x - w / 2, ytop, x + w / 2, ytop - h)
    C.L(kat, [(x - w / 2, ytop - 0.4), (x + w / 2 - 0.4, ytop - h / 2), (x - w / 2, ytop - h + 0.4)])


INV_GW = 5.0           # giriş hücresi genişliği
INV_H = 27.0           # inverter kutusu yüksekliği
STR_H = 36.0           # string gösterimi yüksekliği


def inv_kutu_w(inv): return max(98.0, inv["giris"] * INV_GW + 8)


def inv_kutu(C, M, inv, x0, y0, sag_cikis=True):
    """İnverter kutusu (TUTGU GES düzeni): başlık, ÇIKIŞ L1-L2-L3-PE, DC/AC taraf, MPPT-k, girişler, altında her string
    (modül sayısı, kablo no S#, DC kablo boyu). Dönüş: (çıkış bağlantı x, bara y, alt y)."""
    e, mod = M.P["elektrik"], M.P["modul"]
    K = TH_AG; W = inv_kutu_w(inv); H = INV_H
    C.R(K, x0, y0, x0 + W, y0 - H)
    ikw = inv.get("ac_kw") or e["inverter_ac_kw"]
    kwp = inv["n_str"] * e["string_modul"] * (mod["guc_wp"] or 0) / 1000
    sinir = e.get("inverter_sinir_kw")
    C.TL(TH_YZ, x0 + (1.5 if sag_cikis else 24), y0 - 3.0, 1.8, [f"INVERTER-{inv['gno']:02d}",
         f"{sinir:g} kWe Sınırlandırılacak" if sinir else (f"{ikw:g} kWe" if ikw else "— kWe"),
         (_tr_sayi(kwp) + " kWp") if kwp else "— kWp"], 1.3)
    tx = x0 + W - 20 if sag_cikis else x0 + 8
    C.T(TH_YZ, tx - 8.5 if sag_cikis else tx + 11.5, y0 - 4.0, 1.4, "ÇIKIŞ")
    yb = y0 + 2.0
    C.L(K, [(tx, yb), (tx + 9.6, yb)])
    for k, ad in enumerate(["L1", "L2", "L3", "PE"]):
        cx = tx + k * 3.2
        C.C(K, cx, y0 - 2.6, 0.8); C.L(K, [(cx, y0 - 1.8), (cx, yb)]); C.T(TH_YZ, cx, y0 - 5.2, 1.0, ad, hiz="C")
    ym = y0 - 13.0
    C.L(K, [(x0, ym), (x0 + W, ym)])
    C.L(K, [(x0, ym), (x0 + W, y0 - 7.0)])
    C.T(TH_YZ, x0 + 1.5, ym + 0.8, 1.25, "DC TARAF"); C.T(TH_YZ, x0 + W - 11.5, y0 - 10.8, 1.25, "AC TARAF")
    gx0 = x0 + 4; per = inv["mppt_giris"]
    y1, y2, y3 = ym - 1.5, ym - 6.5, ym - 11.5
    for m_ in range(inv["mppt"]):
        a = gx0 + m_ * per * INV_GW; b = a + per * INV_GW
        C.R(K, a, y1, b, y2); C.T(TH_YZ, (a + b) / 2, (y1 + y2) / 2, min(1.15, per * INV_GW / 6.2), f"MPPT-{m_+1}", hiz="C")
        for s in range(per):
            c0 = a + s * INV_GW
            C.R(K, c0, y2, c0 + INV_GW, y3); C.T(TH_YZ, c0 + INV_GW / 2, (y2 + y3) / 2, 1.0, f"S{s+1}", hiz="C")
    yk = y0 - H
    if y3 > yk: C.L(K, [(x0, yk), (x0 + W, yk)])
    for s in inv["str_list"]:
        xs = gx0 + (s["giris"] - 0.5) * INV_GW
        yy = yk
        C.L("GES-DC-KABLO", [(xs - 0.9, yy), (xs - 0.9, yy - 3)]); C.L("GES-DC-KABLO", [(xs + 0.9, yy), (xs + 0.9, yy - 3)])
        sy_modul(C, K, xs, yy - 3, 3.0, 4.0)
        C.L("GES-DC-KABLO", [(xs, yy - 7), (xs, yy - 9)])
        for q in range(4): C.C("GES-DC-KABLO", xs, yy - 11 - q * 2.6, 0.25)
        C.T(TH_YZ, xs + 1.9, yy - 15, 1.1, str(e["string_modul"]), hiz="C")
        C.L("GES-DC-KABLO", [(xs, yy - 21), (xs, yy - 23)])
        sy_modul(C, K, xs, yy - 23, 3.0, 4.0)
        C.L("GES-DC-KABLO", [(xs - 0.9, yy - 27), (xs - 0.9, yy - 28)])
        C.T(TH_YZ, xs + 1.7, yy - 35.5, 1.1, f"S{s['giris']} {s['dc_m']:.0f}m (tek {s['dc_tek_yon_m']:.0f})", rot=90)
    C.T(TH_YZ, x0 + 1.5, yk - STR_H + 0.5, 1.35, f"DC: {e['dc_kablo']} · dizi {e['string_modul']} modül · S#: kablo no · m = 2 × tek yön (+ ve −) [+ masa içi dönüş]")
    return tx + 4.8, yb, yk - STR_H - 2


def adp_dikey(C, M, invs, xs_list, yalt):
    """İnverter kutuları tek sırada yan yana; her TMŞ çıkışı kendi kutusuna düz iner (kağıt yana yayılır, iki sütun yok)."""
    alt = yalt; yt = yalt - 36
    for inv, x in zip(invs, xs_list):
        W = inv_kutu_w(inv); x0 = x - (W - 20 + 4.8)
        tx, yb, ya = inv_kutu(C, M, inv, x0, yt, True)
        C.L(TH_AG, [(x, yalt), (x, yb)])
        alt = min(alt, ya)
    return alt


def adp_cikislar(C, M, invs, xs_list, yalt, cx, e):
    """ADP çıkışlarından inverter kutularına kanal düzeni (TUTGU): sol sütun TMŞ-01… yukarıdan aşağı, sağ sütun sondan
    geriye; besleme hatları kesişmez. Dönüş: alt y."""
    n = len(invs)
    if not n: return yalt
    h = math.ceil(n / 2); h2 = n - h
    sp = (xs_list[1] - xs_list[0]) if n > 1 else 30.0
    d = min(1.6, max(0.6, (sp / 2 - 1.5) / max(h, 1)))
    Wb = max(inv_kutu_w(i) for i in invs)
    xL1 = cx - d * h - 10                 # sol kutuların sağ kenarı
    xR0 = cx + d * max(h2, 1) + 10        # sağ kutuların sol kenarı
    yA0 = yalt - 34
    Rp = INV_H + STR_H + 16
    yrow0 = yA0 - 3 * max(h, h2, 1) - 14
    alt = yrow0
    for j in range(h):                    # sol grup
        inv = invs[j]; x = xs_list[j]
        yA = yA0 - (h - 1 - j) * 3
        cL = cx - d * (h - j)
        yt = yrow0 - j * Rp
        x0 = xL1 - inv_kutu_w(inv)
        tx, yb, ya = inv_kutu(C, M, inv, x0, yt, True)
        C.L(TH_AG, [(x, yalt), (x, yA), (cL, yA), (cL, yt + 6), (tx, yt + 6), (tx, yb)])
        alt = min(alt, ya)
    for i in range(h2):                   # sağ grup: soldan sağa i; en sağdaki en üstte
        inv = invs[h + i]; x = xs_list[h + i]
        yA = yA0 - i * 3
        cR = cx + d * (i + 1)
        r = h2 - 1 - i
        yt = yrow0 - r * Rp
        tx, yb, ya = inv_kutu(C, M, inv, xR0, yt, False)
        C.L(TH_AG, [(x, yalt), (x, yA), (cR, yA), (cR, yt + 6), (tx, yt + 6), (tx, yb)])
        alt = min(alt, ya)
    return alt


def tr_ozet_satir(M, t):
    e, mod = M.P["elektrik"], M.P["modul"]
    invs = [i for i in M.inverterler if i["tr"] == t + 1]
    nstr = sum(i["n_str"] for i in invs); nmod = nstr * e["string_modul"]
    kws = [i.get("ac_kw") or e["inverter_ac_kw"] for i in invs]
    ac = sum(k for k in kws if k) if all(kws) else None
    dc = nmod * mod["guc_wp"] / 1000 if mod["guc_wp"] else None
    return [("TABLO KODU", f"GES PANOSU-{t+1}"), ("İNVERTER SAYISI", f"{len(invs)} Adet"), ("DİZİ SAYISI", f"{nstr} Adet"),
            ("MODÜL SAYISI", f"{nmod} Adet"), ("DC KURULU GÜÇ", (_tr_sayi(dc) + " kWp") if dc else "—"),
            ("İNVERTER GÜCÜ", f"{e['inverter_ac_kw']:g} kWe" if e["inverter_ac_kw"] else "—"),
            ("MODÜL GÜCÜ", f"{mod['guc_wp']:g} Wp" if mod["guc_wp"] else "—"), ("AC KURULU GÜÇ", (_tr_sayi(ac, 0) + " kWe") if ac else "—")]


def primer_liste(M, t, hucreler):
    """TR primer malzeme listesi (TEDAŞ formu: NO · ADI · KARAKTERİSTİKLER · MİKTAR hemen/yakında/ilerde/mevcut)."""
    e = M.P["elektrik"]
    invs = [i for i in M.inverterler if i["tr"] == t + 1]
    kva = M.tr_kva[t] if getattr(M, "tr_kva", None) else e["trafo_kva"]
    S = []
    for h in hucreler:
        kar = f"{h.get('un_kv', 36)} kV {h.get('in_a', 630)} A {h.get('ik_ka', 16)} kA"
        if h.get("at"): kar += " · AT " + h["at"].split("·")[0].strip()
        S.append([h["no"], h["ad"], kar, 1])
    n_og = sum(1 for o in M.og if o["den"] == f"TM{t+1}" or o["ye"] == f"TM{t+1}")
    S.append(["2B1", "BÜZÜŞMELİ DAHİLİ TİP KABLO BAŞLIĞI", e["og_kablo"], 3 * max(n_og, 1)])
    S.append(["2C1", "GEÇMELİ TİP KABLO BAŞLIĞI", e.get("og_trafo_kablo", e["og_kablo"]).split("·")[0].strip(), 3])
    S.append(["8AH", "DAĞITIM TRAFOSU", f"{kva} kVA {e['trafo_gerilim']}" + (f" %uk {e['trafo_uk_pct']}" if e.get("trafo_uk_pct") else ""), 1])
    S.append(["11A", "REDRESÖR AKÜ ŞARJ 24 V", e.get("aku_redresor", "24 V DC · akü kapasitesi kumanda yüküne göre"), 1])
    S.append(["ADP", f"GES PANOSU-{t+1} (AG ana dağıtım)", f"{e['ag_gerilim_v']} V {e['ag_pano_in_a']} A {e['ag_pano_icw_ka']} kA {e['ag_pano_form']} {e['ag_pano_ip']}", 1])
    kws = sorted({(i.get("ac_kw") or e["inverter_ac_kw"]) for i in invs if (i.get("ac_kw") or e["inverter_ac_kw"])})
    for kw in kws:
        nn = sum(1 for i in invs if (i.get("ac_kw") or e["inverter_ac_kw"]) == kw)
        S.append(["TMŞ", "TERMİK MANYETİK ŞALTER (çıkış)", f"3 kutuplu {e['ag_gerilim_v']} V {_inv_tms_a(e, kw)} A {e.get('ag_cikis_ka', 36)} kA", nn])
        S.append(["INV", "EVİRİCİ (İNVERTER)", f"{e.get('inverter_model') or ''} {kw:g} kWe".strip(), nn])
    if not kws:
        S.append(["INV", "EVİRİCİ (İNVERTER)", e.get("inverter_model") or "—", len(invs)])
    return S


def pafta_tablolar(M, kod="02"):
    """Tek hat paftasının tablo bölümü: FV modül ve evirici bilgileri, her ADP için DC KABLO KESİT VE METRAJ LİSTESİ
    (string string), TR primer malzeme listeleri, notlar."""
    e, mod = M.P["elektrik"], M.P["modul"]
    pf = Pafta(kod, "TABLOLAR", olcekli=False); C = Ciz(pf)
    x = 0.0; y0 = 0.0
    nmod = len(M.stringler) * e["string_modul"]
    fv = [("Pmpp", f"{mod['guc_wp']} W" if mod["guc_wp"] else "—"), ("Voc", f"{mod['voc_v']} V" if mod["voc_v"] else "—"),
          ("Vmp", f"{mod['vmp_v']} V" if mod["vmp_v"] else "—"), ("Isc", f"{mod['isc_a']} A" if mod["isc_a"] else "—"),
          ("Imp", f"{mod['imp_a']} A" if mod["imp_a"] else "—"),
          ("Voc sıcaklık katsayısı", f"{mod['voc_sicaklik_katsayi_pct']} %/°C" if mod.get("voc_sicaklik_katsayi_pct") is not None else "—"),
          ("Boyut", f"{mod['boy_mm']} × {mod['en_mm']} mm"), ("Toplam modül", f"{nmod} adet"), ("Dizi (string)", f"{e['string_modul']} modül")]
    yb = tablo(C, x, y0, [("PARAMETRE", 46, "L"), ("DEĞER", 34, "L")], fv, baslik="FV MODÜL BİLGİLERİ", rh=4.4, th=1.7)
    kws = [i.get("ac_kw") or e["inverter_ac_kw"] for i in M.inverterler]
    ev = [("Model", e.get("inverter_model") or "—"), ("Toplam evirici sayısı", f"{len(M.inverterler)} adet"),
          ("AC güç", f"{e['inverter_ac_kw']:g} kW" if e["inverter_ac_kw"] else "—"),
          ("Sınırlandırma", f"{e['inverter_sinir_kw']:g} kWe" if e.get("inverter_sinir_kw") else "—"),
          ("MPPT sayısı", str(e.get("mppt_sayisi") or "—")), ("Maks. MPPT giriş akımı", f"{e['mppt_akim_a']} A" if e.get("mppt_akim_a") else "—"),
          ("Toplam dizi sayısı", f"{len(M.stringler)} adet"), ("Toplam panel sayısı", f"{nmod} adet"),
          ("AC kurulu güç", (_tr_sayi(sum(kws), 0) + " kWe") if all(kws) and kws else "—")]
    yb = min(yb, tablo(C, x + 90, y0, [("PARAMETRE", 46, "L"), ("DEĞER", 40, "L")], ev, baslik="EVİRİCİ BİLGİLERİ", rh=4.4, th=1.7))
    if getattr(M, "dm_ortak", False): yb = min(yb, sembol_tablosu(C, x + 185, y0, 150))   # tek köşkte sembol tablosu tablolarla yan yana
    yb -= 12
    # DC kablo kesit ve metraj listeleri (Zorlu Tesis 1 GES formu): her ADP, her inverterin tüm girişleri (boş giriş boş satır)
    kol = [("İNVERTÖR NO", 17, "C"), ("KABLO NO", 11, "C"), ("L (m)", 11, "C"), ("S (mm²)", 10, "C")]
    KW = sum(w for _, w, _ in kol) + 3
    MAXS = 110
    xx = x; ytop = yb; maxalt = yb
    for t in range(M.n_tr):
        invs = sorted([i for i in M.inverterler if i["tr"] == t + 1], key=lambda i: i["gno"])
        sat = []; top_m = 0.0
        for inv in invs:
            bys = {s["giris"]: s for s in inv["str_list"]}
            for g in range(1, inv["giris"] + 1):
                s = bys.get(g)
                sat.append([f"INV-{inv['gno']:02d}", f"S{g}", f"{s['dc_m']:.0f}" if s else "", f"{e['dc_kesit_mm2']:g}" if s else ""])
                if s: top_m += s["dc_m"]
        sat.append(["TOPLAM", "", f"{top_m:.0f}", ""])
        parca = [sat[i:i + MAXS] for i in range(0, len(sat), MAXS)] or [[]]
        for k, p in enumerate(parca):
            bas = f"ADP-{t+1} DC KABLO KESİT VE METRAJ LİSTESİ" + (f" ({k+1}/{len(parca)})" if len(parca) > 1 else "")
            a = tablo(C, xx, ytop, kol, p, baslik=bas, rh=3.4, th=1.35)
            maxalt = min(maxalt, a); xx += KW
    C.T(TH_YZ, x, maxalt - 4, 1.5, f"L: string başına DC kablo boyu ({e['dc_kablo']}, + ve − toplamı, masa içi dönüş dahil; fire hariç). Keşifte %{e['dc_fire_pct']:g} fire eklenir.")
    return pf


# ---------------------------------------------------------------- köşk ve AG pano görünüşleri
KOSK_VARS = {"W_mm": 2500, "H_mm": 3510, "duvar_mm": 100, "aku_mm": 350, "trafo_oda_mm": None, "adp_derinlik_mm": 600}
HUCRE_GEN = {"ya_giris": 750, "trafo_koruma": 1000, "kesicili": 1000, "olcu": 1000, "giris_kesicili": 1000, "ic_ihtiyac": 750}


def pano_dolaplari(M, n_inv):
    e = M.P["elektrik"]
    d = [("GİRİŞ", 800, ["ACB / TMŞ", f"{e['ag_pano_in_a']} A"]), ("ÖLÇÜ", 600, ["Sayaç (mühürlü)", "AT · Parafudr", "Analizör"])]
    for k in range(math.ceil(n_inv / 5)):
        a, b = k * 5 + 1, min(n_inv, k * 5 + 5)
        d.append((f"ÇIKIŞ-{k+1}", 600, [f"TMŞ {a:02d}–{b:02d}"]))
    d.append(("İÇ İHT.", 400, ["İç ihtiyaç", "KAKR"]))
    return d


def kosk_olcu(M, t, hucreler, dm_hucre=None):
    """Köşk iç düzeni (mm): OG odası (akü-redresör + hücreler), trafo odası (köşk içi trafoda), GES panosu odası."""
    e = M.P["elektrik"]; ks = dict(KOSK_VARS); ks.update(e.get("kosk") or {})
    dw, Wk = ks["duvar_mm"], ks["W_mm"]
    if t is None:                                     # yalnız DM köşkü
        og = ks["aku_mm"] + 100 + sum(HUCRE_GEN.get(h["tip"], 1000) for h in dm_hucre or []) + 300
        return {"L": dw * 2 + og, "W": Wk, "dw": dw, "og": og, "tr": 0, "adp": 0, "kva": None, "harici": False, "pano_L": 0}
    kva = M.tr_kva[t] if getattr(M, "tr_kva", None) else e["trafo_kva"]
    harici = kva >= e["harici_trafo_min_kva"]
    n_inv = sum(1 for i in M.inverterler if i["tr"] == t + 1)
    hs = list(hucreler) + list(dm_hucre or [])
    og = ks["aku_mm"] + 100 + sum(HUCRE_GEN.get(h["tip"], 1000) for h in hs) + 300
    tr = 0 if harici else (ks["trafo_oda_mm"] or (2450 if kva <= 1600 else 3000))
    pano_L = sum(w for _, w, _ in pano_dolaplari(M, n_inv))
    adp = 900 if pano_L <= Wk - 2 * dw - 300 else pano_L + 600
    L = dw + og + dw + (tr + dw if tr else 0) + adp + dw
    return {"L": L, "W": Wk, "dw": dw, "og": og, "tr": tr, "adp": adp, "kva": kva, "harici": harici, "pano_L": pano_L}


def kosk_tasarim(tip, kva=0, hucre=None, en=2.5, boy=None, no=1, gerilim=""):
    """AeCAD "Trafo ekle" (tsKosk) ile birebir aynı köşk: duvar 0,12 m, OG hücre bölmesi (n × 0,5 + 0,6, ≥ 1,6 m),
    trafo bölmesi (≤ 630: 1,8 · ≤ 1250: 2,2 · üstü 2,6 m; ≥ 2500 kVA harici), AG pano bölmesi net 0,80 m (pano 0,70 m,
    ara duvara dayalı, kapı uç duvarda) / DM'de kumanda-SCADA 1,6 m. Dönüş: {L, W, bol, o:[(tür, veri)]} — merkez orijinli, m."""
    t = 0.12; W = float(en or 2.5); n = max(1, int(round(hucre or (5 if tip == "dm" else 3))))
    kva = float(kva or 0); harici = tip == "tm" and kva >= 2500
    wOG = max(1.6, n * 0.5 + 0.6); wAG = 1.6 if tip == "dm" else 1.4
    wTR = (1.8 if kva <= 630 else 2.2 if kva <= 1250 else 2.6) if (tip == "tm" and not harici) else 0
    bol = [["OG HÜCRE", wOG]] + ([["TRAFO", wTR]] if wTR else []) + [["KUMANDA / SCADA" if tip == "dm" else "AG PANO", wAG if tip == "dm" else 0.8]]
    Lmin = t * (len(bol) + 1) + sum(b[1] for b in bol)
    Lb = float(boy) if isinstance(boy, (int, float)) and boy > 0 else 0
    if Lb > Lmin:
        ix = [k for k, b in enumerate(bol) if b[0] != "TRAFO"]
        for k in ix: bol[k][1] += (Lb - Lmin) / len(ix)
    L = max(Lmin, Lb); x0, y0, y1 = -L / 2, -W / 2, W / 2
    o = []; R = lambda a, b, c, d, r=7: o.append(("R", (a, b, c, d), r)); T = lambda x, y, h, s, r=7: o.append(("T", (x, y, h, s), r))
    def kapi(xk, w, y):
        o.append(("L", ((xk, y), (xk, y + w)), 7)); o.append(("A", (xk, y, w, 0, math.pi / 2), 8))
    R(x0, y0, x0 + L, y1); R(x0 + t, y0 + t, x0 + L - t, y1 - t, 8)
    x = x0 + t; hT = max(0.1, W * 0.055); bolum = []
    for k, (ad, w) in enumerate(bol):
        if k: R(x - t, y0 + t, x, y1 - t)
        T(x + w / 2, y1 - t - hT * 1.2, hT * 0.6 if w < 1.2 else hT, "AG" if (w < 1.2 and ad == "AG PANO") else ad)
        bolum.append((ad, x, w))
        if ad == "OG HÜCRE":
            cw = (w - 0.3) / n
            for i in range(n):
                cx = x + 0.15 + i * cw
                R(cx + 0.02, y1 - t - 0.85 - hT * 2.4, cx + cw - 0.02, y1 - t - hT * 2.4, 1); T(cx + cw / 2, y1 - t - hT * 2.4 - 0.45, hT * 0.8, f"H-{i+1:02d}", 1)
            kapi(x + 0.2, 0.9, y0 + t)
        elif ad == "TRAFO":
            m = 0.25; R(x + m - 0.1, y0 + t + 0.2, x + w - m + 0.1, y1 - t - hT * 2.6, 8)
            R(x + m, y0 + t + 0.35, x + w - m, y1 - t - hT * 2.8, 30)
            o.append(("C", (x + w / 2 - 0.22, 0, 0.32), 30)); o.append(("C", (x + w / 2 + 0.22, 0, 0.32), 30))
            T(x + w / 2, y0 + t + 0.25 + hT, hT * 0.85, f"TR {kva:g} kVA", 30); T(x + w / 2, -0.5, hT * 0.7, "yağ çukuru", 8)
            kapi(x + 0.15, min(1.6, w - 0.3), y0 + t)
        elif tip == "tm" and k == len(bol) - 1:
            pd, px0, yA, yB = 0.7, x + 0.05, y0 + t + 0.25, y1 - t - 0.25
            R(px0, yA, px0 + pd, yB, 3); T(px0 + pd / 2, (yA + yB) / 2, hT * 0.8, "ADP", 3)
            xo = x + w + t; dw = min(0.9, W - 2 * t - 0.4); yk = -dw / 2
            o.append(("L", ((xo, yk), (xo + dw, yk)), 7)); o.append(("A", (xo, yk, dw, 0, math.pi / 2), 8))
        else:
            R(x + 0.15, y1 - t - hT * 2.4 - 0.6, x + w - 0.15, y1 - t - hT * 2.4, 3); T(x + w / 2, y1 - t - hT * 2.4 - 0.3, hT * 0.8, "SCADA / AKÜ" if tip == "dm" else "ADP", 3)
            kapi(x + 0.2, 0.9, y0 + t)
        x += w + t
    if harici:
        ex, tw, th = x0 + L + 1.2, 2.6, 2.2
        R(ex, -th / 2, ex + tw, th / 2, 30); o.append(("C", (ex + tw / 2 - 0.35, 0, 0.5), 30)); o.append(("C", (ex + tw / 2 + 0.35, 0, 0.5), 30))
        R(ex - 0.4, -th / 2 - 0.4, ex + tw + 0.4, th / 2 + 0.4, 8); R(ex - 1.0, -th / 2 - 1.0, ex + tw + 1.0, th / 2 + 1.0, 3)
        T(ex + tw / 2, th / 2 + 1.25, hT, f"TR {kva:g} kVA (harici) · yağ çukuru · çit", 30)
    T(0, y1 + hT * 2.2, hT * 1.6, "DM" if tip == "dm" else f"TM-{no} · {kva:g} kVA · {gerilim}".strip(" ·"), 30)
    T(0, y0 - hT * 2.2, hT, f"{L:.2f} × {W:.2f} m · {n} OG hücre", 8)
    return {"L": L, "W": W, "o": o, "bol": bolum, "t": t, "harici": harici, "kva": kva}


def kosk_cizimi(K, yaz, ciz, poli, daire):
    """kosk_tasarim çıktısını verilen dönüşümle çizer (yaz/ciz/poli/daire: yerel m → hedef)."""
    for tur, d, r in K["o"]:
        if tur == "R": a, b, c, e = d; poli([(a, b), (c, b), (c, e), (a, e), (a, b)])
        elif tur == "L": ciz(list(d))
        elif tur == "C": daire(*d)
        elif tur == "A":
            x, y, rr, a0, a1 = d; ciz([(x + rr * math.cos(a0 + (a1 - a0) * k / 8), y + rr * math.sin(a0 + (a1 - a0) * k / 8)) for k in range(9)])
        elif tur == "T": yaz(*d)


def tm_kosk_tasarim(M, t, dm_ile=False):
    e = M.P["elektrik"]
    kva = M.tr_kva[t] if getattr(M, "tr_kva", None) else e["trafo_kva"]
    n = len(e.get("tm_hucreler") or TM_HUCRE_VARS) + (len(e.get("dm_hucreler") or DM_HUCRE_VARS) if dm_ile else 0)
    ger = (e.get("trafo_gerilim") or "").split(" Dy")[0]
    return kosk_tasarim("tm", kva, n, (e.get("kosk") or {}).get("W_mm", 2500) / 1000, None, t + 1, ger)


def kosk_plan(pf, M, cx, cy, K, etiket=None):
    """Vaziyet planında köşk: AeCAD Trafo ekle aracının bloğu (kosk_tasarim), azimuta göre döndürülmüş, m."""
    a = math.radians(M.az or 0); ca, sa = math.cos(a), math.sin(a)
    P = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    kosk_cizimi(K, lambda x, y, h, s_: pf.yazi("GES-TM", *P(x, y), h, s_, math.degrees(a), "C"),
                lambda pts: pf.cizgi("GES-TM", [P(*q) for q in pts]), lambda pts: pf.poli("GES-TM", [P(*q) for q in pts]),
                lambda x, y, r: pf.daire("GES-TM", *P(x, y), r))


def kosk_ciz(C, M, t, x0, y0, dm_ile=False):
    """Köşk görünüşleri, 1/50 — ölçü ve iç düzen AeCAD "Trafo ekle" aracının bloğundan (kosk_tasarim): üst görünüş birebir
    blok; ön ve yan görünüş aynı bölme ve kapılardan. Yükseklik elektrik.kosk.H_mm (varsayılan 3510 mm)."""
    e = M.P["elektrik"]; K = tm_kosk_tasarim(M, t, dm_ile) if t is not None else kosk_tasarim("dm", 0, len(e.get("dm_hucreler") or DM_HUCRE_VARS))
    Hk = ((e.get("kosk") or {}).get("H_mm") or KOSK_VARS["H_mm"]) / 1000
    s = 20.0; L, W = K["L"], K["W"]; Y = TH_YZ
    ad = "DM" if t is None else f"TM-{t+1}" + (" + DM" if dm_ile else "")
    C.T(Y, x0, y0 + 6, 3.0, f"{ad} KÖŞK ({L * 1000:.0f} × {W * 1000:.0f} × {Hk * 1000:.0f} mm)  ·  1/50  ·  Trafo ekle aracı düzeni")
    cx, cy = x0 + L * s / 2 + 8, y0 - 10 - W * s / 2
    P = lambda u, v: (cx + u * s, cy + v * s)
    kosk_cizimi(K, lambda x, y, h, s_: C.T(Y, *P(x, y), max(1.2, h * s * 0.9), s_, hiz="C"), lambda pts: C.L(TH_HUC, [P(*q) for q in pts]),
                lambda pts: C.PL(TH_HUC, [P(*q) for q in pts]), lambda x, y, r: C.C(TH_HUC, *P(x, y), r * s))
    d_olcu(C, P(-L / 2, -W / 2 - 0.6), P(L / 2, -W / 2 - 0.6), -4, f"{L:.2f}")
    d_olcu(C, P(-L / 2 - 0.4, -W / 2), P(-L / 2 - 0.4, W / 2), 4, f"{W:.2f}")
    C.T(Y, cx, cy - W * s / 2 - 22, 2.0, "ÜST GÖRÜNÜŞ", hiz="C")
    # ön görünüş (kapı cephesi, −y)
    gy = cy - W * s / 2 - 34
    Q = lambda u, h: (cx + u * s, gy - (Hk - h) * s)
    C.R(TH_HUC, *Q(-L / 2, 0), *Q(L / 2, Hk - 0.03)); C.R(TH_HUC, *Q(-L / 2 - 0.05, Hk - 0.03), *Q(L / 2 + 0.05, Hk))
    d_zemin(C, Q(-L / 2 - 0.4, 0)[0], Q(L / 2 + 0.4, 0)[0], Q(0, 0)[1])
    for ad_, x, w in K["bol"]:
        if ad_ == "OG HÜCRE": a_, b_ = x + 0.2, x + 1.1; pj = False
        elif ad_ == "TRAFO": a_, b_ = x + 0.15, x + 0.15 + min(1.6, w - 0.3); pj = True
        elif t is None: a_, b_ = x + 0.2, x + 1.1; pj = False
        else: continue
        C.R(TH_HUC, *Q(a_, 0.1), *Q(b_, 2.2))
        if pj:
            for q in range(10): yy = 0.35 + q * 0.18; C.L(TH_HUC, [Q(a_ + 0.1, yy), Q(b_ - 0.1, yy)])
    d_olcu(C, Q(L / 2, 0), Q(L / 2, Hk), -5, f"{Hk:.2f}")
    C.T(Y, cx, gy - 10, 2.0, "ÖN GÖRÜNÜŞ", hiz="C")
    # yan görünüş (AG pano uç duvar kapısı)
    sx = cx + L * s / 2 + 22 + W * s / 2
    Z = lambda v, h: (sx + v * s, gy - (Hk - h) * s)
    C.R(TH_HUC, *Z(-W / 2, 0), *Z(W / 2, Hk - 0.03)); C.R(TH_HUC, *Z(-W / 2 - 0.05, Hk - 0.03), *Z(W / 2 + 0.05, Hk))
    d_zemin(C, Z(-W / 2 - 0.3, 0)[0], Z(W / 2 + 0.3, 0)[0], Z(0, 0)[1])
    if t is not None:
        dw = min(0.9, W - 2 * K["t"] - 0.4); C.R(TH_HUC, *Z(-dw / 2, 0.1), *Z(dw / 2, 2.2)); C.T(Y, *Z(0, 2.4), 1.4, "AG pano kapısı", hiz="C")
    C.T(Y, sx, gy - 10, 2.0, "YAN GÖRÜNÜŞ", hiz="C")
    return L * s + W * s + 50, 10 + W * s + 34 + Hk * s + 16


def pafta_kosk(M, kod="02"):
    """Her TM (ve ayrı DM) köşkü: üst / ön / yan görünüş, AeCAD Trafo ekle aracının düzeniyle."""
    pf = Pafta(kod, "KÖŞK", olcekli=False); C = Ciz(pf)
    y = 0.0; ort = getattr(M, "dm_ortak", False)
    for t in range(M.n_tr):
        w1, h1 = kosk_ciz(C, M, t, 0.0, y, ort and t == 0); y -= h1 + 20
    if not ort:
        w1, h1 = kosk_ciz(C, M, None, 0.0, y)
    return pf


# ---------------------------------------------------------------- vaziyet planı detayları (01) — çizim standardı:
# siyah konstrüksiyon, gri tarama, mimari ölçü çizgisi (uzatma çizgisi + 45° tik), numaralı detay başlığı, etiket okları.
DK, DT = "GES-DETAY", "GES-DETAY-TARAMA"


def d_baslik(C, x, y, no, ad, olc):
    C.C(DK, x + 4, y - 4, 4.0); C.T(DK, x + 4, y - 4, 3.2, str(no), hiz="C")
    C.T(DK, x + 10, y - 3.2, 3.0, ad); C.L(DK, [(x + 10, y - 4.6), (x + 10 + 2.05 * len(ad) + 4, y - 4.6)])
    C.T(DK, x + 10, y - 8.6, 2.0, f"ÖLÇEK 1/{olc}")


def d_olcu(C, p1, p2, off, txt, h=1.7):
    """Hizalı ölçü: uzatma çizgileri, ölçü çizgisi, 45° tikler, yazı çizgi üstünde."""
    (x1, y1), (x2, y2) = p1, p2
    L = math.hypot(x2 - x1, y2 - y1) or 1; ux, uy = (x2 - x1) / L, (y2 - y1) / L; nx, ny = -uy, ux
    a1 = (x1 + nx * off, y1 + ny * off); a2 = (x2 + nx * off, y2 + ny * off)
    sg = 1 if off >= 0 else -1
    C.L(DT, [(x1 + nx * sg * 0.8, y1 + ny * sg * 0.8), (a1[0] + nx * sg * 1.2, a1[1] + ny * sg * 1.2)])
    C.L(DT, [(x2 + nx * sg * 0.8, y2 + ny * sg * 0.8), (a2[0] + nx * sg * 1.2, a2[1] + ny * sg * 1.2)])
    C.L(DK, [(a1[0] - ux * 1.2, a1[1] - uy * 1.2), (a2[0] + ux * 1.2, a2[1] + uy * 1.2)])
    for q in (a1, a2):
        C.L(DK, [(q[0] - (ux + nx) * 0.9, q[1] - (uy + ny) * 0.9), (q[0] + (ux + nx) * 0.9, q[1] + (uy + ny) * 0.9)])
    ang = math.degrees(math.atan2(uy, ux))
    if ang > 90.1 or ang < -89.9: ang += 180
    m = ((a1[0] + a2[0]) / 2 + nx * sg * 1.6, (a1[1] + a2[1]) / 2 + ny * sg * 1.6)
    C.T(DK, m[0], m[1], h, txt, hiz="C", rot=ang)


def d_tara(C, x0, y0, x1, y1, ar=1.6, yon=1):
    """Dikdörtgen içi 45° tarama."""
    if x1 < x0: x0, x1 = x1, x0
    if y1 < y0: y0, y1 = y1, y0
    H = y1 - y0; k = x0 - H
    while k < x1:
        t0, t1 = max(0.0, x0 - k), min(H, x1 - k)
        if t1 > t0:
            if yon > 0: C.L(DT, [(k + t0, y0 + t0), (k + t1, y0 + t1)])
            else: C.L(DT, [(k + t0, y1 - t0), (k + t1, y1 - t1)])
        k += ar


def d_zemin(C, x0, x1, y, kalin=2.2):
    C.L(DK, [(x0, y), (x1, y)])
    x = x0
    while x < x1 - 1.2:
        C.L(DT, [(x, y - kalin), (x + kalin * 0.8, y)]); x += 2.0


def d_etiket(C, p, q, txt, h=1.6):
    """Ok uçlu etiket: p hedef, q yazı noktası."""
    C.L(DT, [p, q, (q[0] + (2.05 * h * len(txt) * 0.55 if q[0] >= p[0] else -2.05 * h * len(txt) * 0.55), q[1])])
    C.C(DK, p[0], p[1], 0.45)
    C.T(DK, q[0] + (0.6 if q[0] >= p[0] else -2.05 * h * len(txt) * 0.55), q[1] + 0.6, h, txt)


def detay_masa_kesit(C, M, x0, y0):
    """DETAY-1 masa yan kesit (K-G), 1/50: modüller, aşık, kiriş, ön/arka kolon, payanda, fore kazık, ölçüler."""
    m = M.P["masa"]; ol = 50; s = 1000 / ol
    a = math.radians(m["egim_derece"]); D = M.masa_D; hk = m["alt_kenar_m"]
    Lp = D / math.cos(a); H = hk + D * math.tan(a)
    kg = min(m.get("kolon_sira_araligi_m") or 2.5, 2.5)
    gf, gb = 1.10, 1.30
    ox, oy = x0 + 26, y0 - 18 - (H + 0.4) * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 1, "MASA YAN KESİT (K-G)", ol)
    d_zemin(C, ox - 12, ox + D * s + 22, oy)
    ca, sa = math.cos(a), math.sin(a)
    Q = lambda u, v: P(u * ca - v * sa, hk + u * sa + v * ca)          # u: eğim boyunca, v: yüzeye dik
    nr = m["sira_sayisi"]; mb = (Lp - 0.02 * (nr - 1)) / nr; tp = 0.035
    for r in range(nr):
        u0 = r * (mb + 0.02)
        C.PL(DK, [Q(u0, 0), Q(u0 + mb, 0), Q(u0 + mb, tp), Q(u0, tp), Q(u0, 0)])
        for f in (0.22, 0.78):                                            # aşıklar (C profil)
            u = u0 + f * mb
            C.PL(DK, [Q(u - 0.04, -0.005), Q(u + 0.04, -0.005), Q(u + 0.04, -0.105), Q(u - 0.04, -0.105), Q(u - 0.04, -0.005)])
    C.L(DK, [Q(0.05, -0.11), Q(Lp - 0.05, -0.11)]); C.L(DK, [Q(0.05, -0.23), Q(Lp - 0.05, -0.23)])   # kiriş
    xf = (D - kg) / 2; xb = xf + kg
    def u_at(x): return (x - (-0.23) * sa) / ca
    yf = hk + xf * math.tan(a) - 0.23 / ca; yb = hk + xb * math.tan(a) - 0.23 / ca
    for xx, yy, g in ((xf, yf, gf), (xb, yb, gb)):
        C.L(DK, [P(xx - 0.05, -g + 0.05), P(xx - 0.05, yy)]); C.L(DK, [P(xx + 0.05, -g + 0.05), P(xx + 0.05, yy)])
        C.R(DK, *P(xx - 0.1, -g), *P(xx + 0.1, 0)); d_tara(C, *P(xx - 0.1, -g), *P(xx + 0.1, 0), 1.2)
    C.L(DK, [P(xb - 0.05, yb * 0.42), P(xb - (xb - xf) * 0.55, hk + (xb - (xb - xf) * 0.55) * math.tan(a) - 0.23 / ca)])   # payanda
    # ölçüler
    d_olcu(C, P(0, 0), P(D, 0), -(gb * s + 7), f"{D:.2f}")
    d_olcu(C, P(xf, 0), P(xb, 0), -(gb * s + 2.5), f"{kg:.2f}")
    d_olcu(C, P(0, 0), P(0, hk), 8, f"{hk:.2f}")
    d_olcu(C, P(D, 0), P(D, H), -8, f"{H:.2f}")
    d_olcu(C, P(xf, 0), P(xf, -gf), 6, f"{gf:.2f}", 1.4)
    d_olcu(C, P(xb, 0), P(xb, -gb), -6, f"{gb:.2f}", 1.4)
    ax, ay = P(0, hk)
    for k in range(9):                                                    # eğim yayı
        t0, t1 = a * k / 9, a * (k + 1) / 9; R_ = 14
        C.L(DT, [(ax + R_ * math.cos(t0), ay + R_ * math.sin(t0)), (ax + R_ * math.cos(t1), ay + R_ * math.sin(t1))])
    C.L(DT, [(ax, ay), (ax + 17, ay)]); C.T(DK, ax + 16, ay + 2.2, 1.8, f"{m['egim_derece']}°")
    d_etiket(C, Q(Lp * 0.62, tp), (P(D * 0.62, H)[0] + 4, P(0, H + 0.35)[1]), f"PV modül {m['sira_sayisi']}×{M.P['modul']['boy_mm']}×{M.P['modul']['en_mm']}")
    d_etiket(C, Q(0.22 * mb, -0.06), (P(-0.1, 0)[0] - 6, P(0, hk + 0.55)[1]), "Aşık")
    d_etiket(C, Q(Lp * 0.33, -0.2), (P(D * 0.33, 0)[0] - 2, P(0, hk + 1.15)[1]), "Kiriş")
    d_etiket(C, P(xf, yf * 0.7), (P(xf, 0)[0] - 15, P(0, yf * 0.7)[1]), "Ön kolon")
    d_etiket(C, P(xb, yb * 0.75), (P(D, 0)[0] + 6, P(0, yb * 0.8)[1]), "Arka kolon")
    d_etiket(C, P(xb - (xb - xf) * 0.3, yb * 0.6), (P(D, 0)[0] + 6, P(0, yb * 0.45)[1]), "Payanda")
    d_etiket(C, P(xb, -gb * 0.6), (P(D, 0)[0] + 6, P(0, -gb * 0.6)[1]), "Fore kazık Ø200")
    C.T(DK, ox - 12, oy + 1.2, 1.6, "GÜNEY"); C.T(DK, ox + D * s + 10, oy + 1.2, 1.6, "KUZEY")
    return D * s + 70, 18 + (H + 0.4) * s + gb * s + 16


def detay_masa_on(C, M, x0, y0):
    """DETAY-2 masa ön görünüş (D-B): modüller, kolon aksları, ölçüler."""
    m = M.P["masa"]; L = M.masa_L
    ol = next((o for o in [50, 100, 200, 250, 500] if L * 1000 / o <= 170), 500); s = 1000 / ol
    nr, nm = m["sira_sayisi"], m["sira_modul"]
    up = m["uc_payi_mm"] / 1000; gap = m["modul_boslugu_mm"] / 1000; mw = (L - 2 * up - gap * (nm - 1)) / nm
    hh = M.masa_D / math.cos(math.radians(m["egim_derece"])) * math.sin(math.radians(90 - m["egim_derece"])) * 0.5 + 0.6
    yb = m["alt_kenar_m"] + 0.25
    ox, oy = x0 + 6, y0 - 18 - (yb + hh + 0.3) * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 2, "MASA ÖN GÖRÜNÜŞ (D-B)", ol)
    d_zemin(C, ox - 4, ox + L * s + 4, oy)
    n = m["aks_sayisi"]; ar = m["aks_araligi_m"]; x1 = (L - (n - 1) * ar) / 2
    for i in range(n):
        xx = x1 + i * ar; C.L(DK, [P(xx, 0), P(xx, yb)]); C.L(DT, [P(xx, -0.6), P(xx, -0.05)])
    C.L(DK, [P(0, yb), P(L, yb)])
    rh = hh / nr
    for r in range(nr):
        for k in range(nm):
            xa = up + k * (mw + gap)
            C.R(DK, *P(xa, yb + r * rh + 0.01), *P(xa + mw, yb + (r + 1) * rh - 0.01))
            C.L(DT, [P(xa + mw * 0.5, yb + r * rh + 0.01), P(xa + mw * 0.5, yb + (r + 1) * rh - 0.01)])
    d_olcu(C, P(0, yb + hh), P(L, yb + hh), 6, f"{L:.3f}")
    d_olcu(C, P(x1, 0), P(x1 + ar, 0), -5, f"{ar:.2f}")
    if n > 2: d_olcu(C, P(x1 + ar, 0), P(x1 + (n - 1) * ar, 0), -5, f"{n - 2}×{ar:.2f}={(n - 2) * ar:.2f}")
    C.T(DK, ox, oy - 12, 1.6, f"{nr} sıra × {nm} modül ({m['tip']}) · modül arası {m['modul_boslugu_mm']} mm · uç payı {m['uc_payi_mm']} mm · {n} aks")
    return L * s + 16, 18 + (yb + hh + 0.3) * s + 16


def detay_sira(C, M, x0, y0):
    """DETAY-3 sıra aralığı: eksen (pitch), açıklık, 21 Aralık öğle güneş ışını."""
    m = M.P["masa"]; a = math.radians(m["egim_derece"]); D = M.masa_D; hk = m["alt_kenar_m"]; H = hk + D * math.tan(a)
    pt = m["pitch_m"]; ac = M.acik
    ol = 100 if (2 * pt + D) * 10 <= 170 else 200; s = 1000 / ol
    ox, oy = x0 + 6, y0 - 18 - (H + 0.6) * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 3, "SIRA ARALIĞI VE GÖLGE", ol)
    d_zemin(C, ox - 4, ox + (2 * pt + D) * s + 4, oy)
    for k in range(3):
        xo = k * pt
        C.PL(DK, [P(xo, hk), P(xo + D, H), P(xo + D + 0.03, H - 0.06), P(xo + 0.03, hk - 0.06), P(xo, hk)])
        for f in (0.25, 0.8):
            C.L(DK, [P(xo + D * f, 0), P(xo + D * f, hk + D * f * math.tan(a) - 0.05)])
    fi = math.radians(M.P["proje"].get("enlem") or 39.0); alt = math.pi / 2 - fi - math.radians(23.44)
    if alt > 0.05:
        L_ = (H) / math.tan(alt)
        C.L(DT, [P(D, H), P(D + L_, 0)]); C.T(DK, *P(D + L_ * 0.55, H * 0.55), 1.5, f"21 Aralık öğle güneş açısı {math.degrees(alt):.1f}°")
    d_olcu(C, P(0, 0), P(pt, 0), -5, f"Eksen {pt:.2f}")
    d_olcu(C, P(D, H), P(pt, H), 4, f"Açıklık {ac:.2f}")
    return (2 * pt + D) * s + 16, 18 + (H + 0.6) * s + 14


def detay_inverter(C, M, x0, y0):
    """DETAY-4 inverter montajı (masa başı, çelik taşıyıcı), 1/25."""
    ol = 25; s = 1000 / ol
    ox, oy = x0 + 10, y0 - 18 - 2.0 * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 4, "İNVERTER MONTAJI (MASA BAŞI)", ol)
    d_zemin(C, ox - 6, ox + 1.6 * s + 6, oy)
    for xx in (0.1, 1.2):
        C.L(DK, [P(xx - 0.03, -0.6), P(xx - 0.03, 1.85)]); C.L(DK, [P(xx + 0.03, -0.6), P(xx + 0.03, 1.85)])
        C.R(DK, *P(xx - 0.15, -0.7), *P(xx + 0.15, 0)); d_tara(C, *P(xx - 0.15, -0.7), *P(xx + 0.15, 0), 1.4)
    C.R(DK, *P(0.0, 1.85), *P(1.3, 1.92)); C.L(DK, [P(-0.1, 1.95), P(1.4, 1.98)])       # gölgelik
    C.L(DK, [P(0.1, 1.55), P(1.2, 1.55)]); C.L(DK, [P(0.1, 0.75), P(1.2, 0.75)])          # yatay taşıyıcılar
    C.R(DK, *P(0.22, 0.8), *P(1.08, 1.5))
    for q in range(6): C.L(DT, [P(0.3 + q * 0.12, 1.42), P(0.3 + q * 0.12, 1.25)])
    C.T(DK, *P(0.42, 1.05), 1.6, "İNVERTER")
    C.L(DK, [P(0.4, 0.8), P(0.4, -0.75)]); C.L(DK, [P(0.46, 0.8), P(0.46, -0.75)])
    C.L(DK, [P(0.85, 0.8), P(0.85, -0.85)]); C.L(DK, [P(0.93, 0.8), P(0.93, -0.85)])
    C.R(DK, *P(0.25, -0.95), *P(1.05, -0.75)); d_tara(C, *P(0.25, -0.95), *P(1.05, -0.75), 1.2, -1)
    d_olcu(C, P(1.2, 0), P(1.2, 0.8), -6, "≥0.80")
    d_olcu(C, P(0.1, 0), P(0.1, 1.92), 7, "1.92")
    d_etiket(C, P(0.43, 0.2), (P(1.5, 0)[0] + 4, P(0, 0.35)[1]), "DC kablolar (spiral boru)")
    d_etiket(C, P(0.89, -0.3), (P(1.5, 0)[0] + 4, P(0, -0.25)[1]), "AC kablo (HDPE boru)")
    d_etiket(C, P(0.65, -0.85), (P(1.5, 0)[0] + 4, P(0, -0.85)[1]), "Kablo kanalı")
    d_etiket(C, P(0.6, 1.95), (P(1.5, 0)[0] + 4, P(0, 1.85)[1]), "Gölgelik, kilitli")
    d_etiket(C, P(1.2, -0.4), (P(1.5, 0)[0] + 4, P(0, -0.55)[1]), "Galvaniz taşıyıcı, beton temel")
    return 1.6 * s + 70, 18 + 2.0 * s + 1.0 * s + 12


def detay_cit(C, M, x0, y0):
    """DETAY-5 tel çit, 1/50: direk, panel tel, dikenli tel, beton temel."""
    g = M.P["guvenlik"]; ol = 50; s = 1000 / ol
    ar = g["cit_direk_araligi_m"]; h = 2.0
    ox, oy = x0 + 10, y0 - 18 - (h + 0.4) * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 5, "TEL ÇİT", ol)
    d_zemin(C, ox - 6, ox + 2 * ar * s + 6, oy)
    for k in range(3):
        xx = k * ar
        C.L(DK, [P(xx - 0.03, -0.55), P(xx - 0.03, h + 0.3)]); C.L(DK, [P(xx + 0.03, -0.55), P(xx + 0.03, h + 0.3)])
        C.R(DK, *P(xx - 0.15, -0.6), *P(xx + 0.15, 0)); d_tara(C, *P(xx - 0.15, -0.6), *P(xx + 0.15, 0), 1.4)
    C.R(DK, *P(0, 0.05), *P(2 * ar, h))
    d_tara(C, *P(0, 0.05), *P(2 * ar, h), 3.2, 1); d_tara(C, *P(0, 0.05), *P(2 * ar, h), 3.2, -1)   # örgü tel (baklava)
    for r in range(3):
        yy = h + 0.1 + r * 0.1; C.L(DK, [P(0, yy), P(2 * ar, yy)])
        for q in range(int(2 * ar / 0.3)): C.T(DT, *P(0.15 + q * 0.3, yy), 0.9, "×", hiz="C")
    d_olcu(C, P(0, 0), P(ar, 0), -(0.6 * s + 4), f"{ar:.2f}")
    d_olcu(C, P(2 * ar, 0), P(2 * ar, h), -6, f"{h:.2f}")
    d_olcu(C, P(0, 0), P(0, -0.6), 6, "0.60", 1.4)
    d_etiket(C, P(ar * 0.5, h * 0.5), (P(2 * ar, 0)[0] + 8, P(0, h * 0.6)[1]), "Panel örgü tel, galvaniz")
    d_etiket(C, P(ar * 1.5, h + 0.2), (P(2 * ar, 0)[0] + 8, P(0, h + 0.25)[1]), "3 sıra dikenli tel")
    d_etiket(C, P(ar, -0.3), (P(2 * ar, 0)[0] + 8, P(0, -0.3)[1]), "Beton temel 30×30×60")
    C.T(DK, ox, oy - 0.6 * s - 12, 1.6, f"Uyarı levhası her {g['levha_araligi_m']:g} m · çit parsel sınırının içinde · topraklama her {M.P['topraklama']['cit_baglanti_m']:g} m")
    return 2 * ar * s + 62, 18 + (h + 0.4) * s + 0.6 * s + 18


def detay_yol(C, M, x0, y0):
    """DETAY-6 servis yolu tipik kesiti, 1/50."""
    w = M.P["yol"]["genislik_m"]; ol = 50; s = 1000 / ol
    ox, oy = x0 + 14, y0 - 22 - 0.5 * s
    P = lambda x, y: (ox + x * s, oy + y * s)
    d_baslik(C, x0, y0, 6, "SERVİS YOLU TİPİK KESİTİ", ol)
    C.L(DK, [P(-0.8, -0.05), P(0, 0.2), P(w / 2, 0.24), P(w, 0.2), P(w + 0.8, -0.05)])
    C.L(DK, [P(0, 0), P(w, 0)]); C.L(DK, [P(0, -0.2), P(w, -0.2)])
    d_tara(C, *P(0, -0.2), *P(w, 0), 1.4, -1)
    for q in range(int(w / 0.12)):
        C.C(DT, *P(0.06 + q * 0.12, 0.1), 0.25)
    d_zemin(C, ox - 0.8 * s - 4, ox + (w + 0.8) * s + 4, oy - 0.2 * s, 1.6)
    d_olcu(C, P(0, 0.24), P(w, 0.24), 6, f"{w:.2f}")
    d_olcu(C, P(w, -0.2), P(w, 0.2), -6, "0.40", 1.4)
    C.T(DK, *P(w * 0.25, 0.32), 1.4, "%2"); C.T(DK, *P(w * 0.68, 0.32), 1.4, "%2")
    d_etiket(C, P(w * 0.8, 0.1), (P(w + 0.8, 0)[0] + 4, P(0, 0.3)[1]), "20 cm stabilize (sıkıştırılmış)")
    d_etiket(C, P(w * 0.85, -0.1), (P(w + 0.8, 0)[0] + 4, P(0, -0.15)[1]), "20 cm alt temel")
    return (w + 1.6) * s + 72, 22 + 0.5 * s + 0.5 * s + 14


def detaylar_yerlesim(M, pf):
    """01 paftasına detay şeridi. Ölçek pafta ölçeğine göre; detaylar kendi ölçeklerinde (kağıt mm)."""
    fns = [detay_masa_kesit, detay_masa_on, detay_sira, detay_inverter, detay_cit]   # servis yolu kesiti kaldırıldı (kullanıcı 19.10.2026)
    # önce boyutları (kağıt mm) ölç
    boy = []
    for f in fns:
        tmp = Pafta("x", "x", olcekli=False); w, h = f(Ciz(tmp), M, 0, 0); boy.append((w, h))
    bb0 = pf.sinir(); Ws, Hs = bb0[2] - bb0[0], bb0[3] - bb0[1]
    olc = None
    for _ in range(5):
        k = (olc or pafta_olcek(M, pf)[1] or 1000) / 1000.0
        Hmm = max(Hs / k, 240)
        cols, cur, hh = [], [], 0
        for (w, h), f in zip(boy, fns):
            if cur and hh + h > Hmm: cols.append(cur); cur, hh = [], 0
            cur.append((f, w, h)); hh += h + 6
        if cur: cols.append(cur)
        Wmm = sum(max(w for _, w, _ in c) + 10 for c in cols)
        test = Pafta("01", "x"); test.p = [("L", "x", [(bb0[0], min(bb0[1], bb0[3] - (Hmm + 8) * k)), (bb0[2] + 12 * k + Wmm * k, bb0[3] + 10 * k)], None)]
        yeni = pafta_olcek(M, test)[1] or 1000
        if yeni == olc: break
        olc = yeni
    k = olc / 1000.0
    x = bb0[2] + 12 * k
    Hmm = max(sum(h + 6 for _, _, h in c) for c in cols)
    pf.poli("GES-NOT", [(x - 4 * k, bb0[3] + 4 * k), (x + Wmm * k, bb0[3] + 4 * k), (x + Wmm * k, bb0[3] - (Hmm + 4) * k), (x - 4 * k, bb0[3] - (Hmm + 4) * k)])
    pf.yazi("GES-NOT", x, bb0[3] + 7 * k, 3.2 * k, "DETAYLAR")
    for c in cols:
        ym = bb0[3] - 2 * k
        for f, w, h in c:
            f(Ciz(pf, x, ym, k), M, 0, 0)
            ym -= (h + 6) * k
        x += (max(w for _, w, _ in c) + 10) * k
    return olc


# ---------------------------------------------------------------- antet (onaylı form) ve notlar
POB_BASLIK = {"lisanssiz": ["T.C.", "TÜRKİYE ELEKTRİK DAĞITIM A.Ş. GENEL MÜDÜRLÜĞÜ", "YATIRIMLAR İZLEME DAİRESİ BAŞKANLIĞI", "PROJE MÜDÜRLÜĞÜ"],
              "lisansli": ["T.C.", "ENERJİ VE TABİİ KAYNAKLAR BAKANLIĞI", "ENERJİ İŞLERİ GENEL MÜDÜRLÜĞÜ"],
              "iletim": ["T.C.", "TÜRKİYE ELEKTRİK İLETİM A.Ş. GENEL MÜDÜRLÜĞÜ"],
              "osb": ["ORGANİZE SANAYİ BÖLGESİ MÜDÜRLÜĞÜ"], "yurtdisi": ["ONAY MAKAMI"]}
GENEL_NOTLAR = [
    "Tesiste kullanılan tüm malzemeler TEDAŞ malzeme teknik şartnamelerine uygun seçilecektir.",
    "Kablolar TEDAŞ dağıtım şebekeleri enerji kabloları montaj (uygulama) usul ve esaslarına uygun döşenecektir.",
    "DC konnektörler MC4 (veya eşdeğeri) olacak, ilgili standartlara uyulacaktır.",
    "Otomatik sayaç okuma sistemi (OSOS) ilgili yönetmeliğe uygun tesis edilecektir.",
    "Köşk ve GES panolarına uyarı işaretleri ile tek hat şemaları asılacaktır.",
    "Alüminyum kablolar bakır baraya bimetal pabuçla bağlanacaktır.",
    "Devre kesiciler nominal akım üzerinden, selektivite sağlanarak ayarlanacaktır.",
    "TR binası, GES panosu, evirici ve modül alanları yetkisiz erişime karşı kapalı ve kilitli tutulacak, uyarı levhaları asılacaktır.",
    "Santral AC, DC ve data hatlarında AG parafudr ile yıldırım ve aşırı gerilime karşı korunacaktır.",
    "Tesis; Elektrik Piyasası Şebeke, Elektrik Üretim ve Depolama Tesisleri, Elektrik Kuvvetli Akım Tesisleri, Elektrik Tesisleri "
    "Topraklamalar, Lisanssız Elektrik Üretim ve Elektrik Tesisleri Proje yönetmelikleri ile bağlantı anlaşmasına uygun tesis edilecektir.",
]


def antet_geometri(M, pf, olc, H=None):
    """Onaylı antet (TEDAŞ onaylı GES projeleri formu), sağdaki 185 mm şerit; sağ-alt köşe orijin (x ≤ 0, y ≥ 0).
    Alttan: imza tablosu · güçler · il/ilçe/mahalle/ada/parsel · proje sahibi + adres + revizyon · proje sorumlusu firma ·
    pafta adı/no · işin adı/ölçek · POB onay alanı · notlar ve lejant (kalan yükseklik)."""
    P, e, pr = M.P, M.P["elektrik"], M.P["proje"]
    W = 185.0; g = []
    def R(x0, y0, x1, y1): g.append(("R", (x0, y0), (x1, y1)))
    def L(a, b): g.append(("L", a, b))
    def T(x, y, h, t, hz="L", b=False): g.append(("T", (x, y, h, hz, b), t))
    xs = lambda ws: [-W + sum(ws[:i]) for i in range(len(ws) + 1)]
    # 1) imza tablosu
    cw = [24, 32, 36, 30, 25, 38]; X = xs(cw)
    rows_h = [8, 9, 9, 10]          # boş/kontrol, proje sorumlusu, çizen, başlık (alttan)
    y = 0.0
    R(-W, 0, 0, sum(rows_h))
    ys = [0]
    for hh in rows_h: ys.append(ys[-1] + hh)
    for yy in ys[1:-1]: L((-W, yy), (X[5], yy))
    for xx in X[1:-1]: L((xx, 0), (xx, ys[-1]))
    L((X[5], ys[3]), (0, ys[3]))
    hdr = ["", "ADI SOYADI", "ÜNVANI", "ODA NO / BÜRO TESCİL NO", "SMM NO"]
    for i, t in enumerate(hdr):
        if t: T((X[i] + X[i + 1]) / 2, (ys[3] + ys[4]) / 2, 1.7 if i != 3 else 1.45, t, "C", True)
    T((X[5] + X[6]) / 2, ys[4] - 3.0, 1.8, "TARİH", "C", True)
    T((X[5] + X[6]) / 2, ys[3] + 2.4, 1.9, pr.get("tarih") or "", "C", True)
    kisi = [("KONTROL", pr.get("kontrol", ""), pr.get("kontrol_unvan", ""), pr.get("kontrol_oda", ""), pr.get("kontrol_smm", "")),
            ("PROJE\nSORUMLUSU", pr.get("muellif", ""), pr.get("muellif_unvan", ""), pr.get("oda_sicil", ""), pr.get("smm_no", "")),
            ("ÇİZEN", pr.get("cizen", ""), pr.get("cizen_unvan", ""), pr.get("cizen_oda", ""), pr.get("cizen_smm", ""))]
    for r, k in enumerate(kisi):
        yc = (ys[r] + ys[r + 1]) / 2
        if "\n" in k[0]:
            a, b = k[0].split("\n"); T((X[0] + X[1]) / 2, yc + 1.4, 1.7, a, "C", True); T((X[0] + X[1]) / 2, yc - 1.6, 1.7, b, "C", True)
        else: T((X[0] + X[1]) / 2, yc, 1.8, k[0] if (r or k[1]) else "", "C", True)
        for i in range(1, 5):
            v = str(k[i] or ("-" if r and i >= 3 else ""))
            T((X[i] + X[i + 1]) / 2, yc, 1.7 if len(v) < 22 else 1.35, v.upper() if i < 3 else v, "C", True)
    T((X[5] + X[6]) / 2, 6, 1.4, "İMZA / E-İMZA", "C")
    y = ys[-1]
    # 2) güçler
    nmod = len(M.masalar) * M.masa_modul; guc = P["modul"]["guc_wp"]
    kws = [i.get("ac_kw") or e["inverter_ac_kw"] for i in M.inverterler]
    grp = {}
    for v in kws: grp[v] = grp.get(v, 0) + 1
    ev = " + ".join(f"{n} Adet x {p:g}kWe" for p, n in sorted(grp.items(), key=lambda q: -(q[0] or 0)) if p) or f"{len(M.inverterler)} Adet"
    ac = sum(k for k in kws if k) if kws and all(kws) else None
    cw = [62, 65, 58]; X = xs(cw)
    R(-W, y, 0, y + 14); L((-W, y + 8), (0, y + 8))
    for xx in X[1:-1]: L((xx, y), (xx, y + 14))
    for i, t in enumerate(["MODÜL Gücü-Sayısı", "EVİRİCİ Gücü-Sayısı", "AC KURULU GÜCÜ"]): T((X[i] + X[i + 1]) / 2, y + 11, 1.7, t, "C", True)
    vals = [f"{nmod} x {guc:g} Wp" if guc else f"{nmod} adet", ev, (_tr_sayi(ac, 0) + " kW") if ac else "—"]
    for i, t in enumerate(vals): T((X[i] + X[i + 1]) / 2, y + 4, 2.0, t, "C", True)
    y += 14
    # 3) il / ilçe / mahalle / ada / parsel
    cw = [26, 32, 66, 30, 31]; X = xs(cw)
    R(-W, y, 0, y + 14); L((-W, y + 8), (0, y + 8))
    for xx in X[1:-1]: L((xx, y), (xx, y + 14))
    iiap = [s_.strip() for s_ in (pr.get("il_ilce_ada_parsel") or "").split("/")]
    ilv = [pr.get("il") or (iiap[0] if len(iiap) > 0 else ""), pr.get("ilce") or (iiap[1] if len(iiap) > 1 else ""),
           pr.get("mahalle") or "", pr.get("ada") or (iiap[2] if len(iiap) > 2 else ""), pr.get("parsel") or (iiap[3] if len(iiap) > 3 else "")]
    for i, t in enumerate(["İL", "İLÇE", "MAHALLE", "Ada", "Parsel"]): T((X[i] + X[i + 1]) / 2, y + 11, 1.7, t, "C", True)
    for i, t in enumerate(ilv): T((X[i] + X[i + 1]) / 2, y + 4, 1.9, str(t).upper() if i < 3 else str(t), "C", True)
    y += 14
    # 4) proje sahibi + adres + revizyon
    R(-W, y, 0, y + 15); L((-W, y + 7.5), (-49, y + 7.5)); L((-W + 44, y), (-W + 44, y + 15)); L((-49, y), (-49, y + 15))
    T(-W + 22, y + 3.6, 1.8, "ADRESİ", "C", True); T(-W + 22, y + 11.2, 1.8, "PROJE SAHİBİ", "C", True)
    sah = pr.get("proje_sahibi") or pr.get("yatirimci") or ""
    adr = pr.get("proje_sahibi_adres") or ""
    T(-W + 46, y + 10.2, 1.8 if len(sah) < 50 else 1.4, sah.upper(), "L", True); T(-W + 46, y + 2.6, 1.6 if len(adr) < 58 else 1.2, adr, "L", True)
    T(-24.5, y + 7.5, 7.0, str(pr.get("revizyon") or ""), "C")
    y += 15
    # 5) proje sorumlusu firma bloğu
    fr = pr.get("firma") or {}
    ad = fr.get("ad") or pr.get("muellif") or ""
    adres = fr.get("adres") or ""
    adres = adres if isinstance(adres, list) else [a.strip() for a in str(adres).split("\n") if a.strip()]
    satir = [s_ for s_ in adres + ([f"Tel: {fr['tel']}"] if fr.get("tel") else []) + ([fr["eposta"]] if fr.get("eposta") else [])]
    fh = 28.0
    R(-W, y, 0, y + fh)
    T(-W + 60, y + fh - 6, 3.0, ad.upper())
    for i, s_ in enumerate(satir[:5]): T(-W + 60, y + fh - 11 - i * 3.6, 2.1, s_)
    y += fh
    R(-W, y, 0, y + 7); T(-W / 2, y + 3.5, 2.2, "PROJE SORUMLUSU / SORUMLULARI", "C")
    y += 7
    # 6) pafta adı / no, işin adı / ölçek
    for lab, val, rlab, rval in [("PAFTA ADI", pf.ad, "PAFTA NO :", f"{pr.get('pafta_on_ek', 'E')}{pf.kod}"),
                                 ("İŞİN ADI", pr.get("isin_adi") or "", "ÖLÇEK NO :", f"1/{olc}" if olc else "-")]:
        R(-W, y, 0, y + 14); L((-W + 42, y), (-W + 42, y + 14)); L((-49, y), (-49, y + 14))
        T(-W + 21, y + 7, 2.6, lab, "C")
        T((-W + 42 - 49) / 2, y + 7, 2.8 if len(val) < 34 else (2.2 if len(val) < 46 else 1.7), val.upper() if lab == "İŞİN ADI" else val, "C")
        T(-24.5, y + 10.4, 2.2, rlab, "C"); T(-24.5, y + 4.2, 2.8, rval, "C")
        y += 14
    # 7) POB onay alanı
    pob = pr.get("pob_baslik") or POB_BASLIK.get(pr.get("tesis_tipi", "lisanssiz"), ["ONAY MAKAMI"])
    ph = 26.0; ah = 58.0
    R(-W, y, 0, y + ah + ph)
    R(-W + 2, y + ah, -2, y + ah + ph - 2)
    for i, s_ in enumerate(pob): T(-W / 2 + 6, y + ah + ph - 6 - i * (ph - 6) / max(len(pob), 1), 2.6 if i else 2.4, s_, "C")
    T(-W + 4, y + ah - 5, 1.6, f"ONAY / TASDİK ALANI ({POB.get(pr.get('tesis_tipi', 'lisanssiz'), '')})")
    T(-W + 4, y + 3, 1.5, "Proje sorumlusu e-imza"); T(-W / 2 + 4, y + 3, 1.5, "Çizen e-imza")
    y += ah + ph
    # 8) notlar + lejant (kalan alan)
    if H and H - y > 30:
        R(-W, y, 0, H)
        yy = H - 6
        kats = []
        if not pf.kod.startswith("02") and pf.olcekli:
            for t_, kat, d, info in pf.p:
                if kat not in kats and kat in KATMANLAR and kat not in ("GES-DETAY", "GES-DETAY-TARAMA", "GES-NOT", "GES-ANTET"): kats.append(kat)
        if kats:
            T(-W + 3, yy, 2.2, "LEJANT", "L", True); yy -= 4.5
            for i, kat in enumerate(kats[:24]):
                cx = -W + 4 + (i % 2) * 92; cy = yy - (i // 2) * 3.8
                g.append(("K", (cx, cy + 0.8), kat)); T(cx + 11, cy, 1.6, KATMANLAR[kat][1])
            yy -= ((min(len(kats), 24) + 1) // 2) * 3.8 + 3
        notlar = list(getattr(pf, "notlar", []) or []) + list(pr.get("notlar") or []) + GENEL_NOTLAR
        T(-W + 3, yy, 2.2, "NOTLAR", "L", True); yy -= 4.6
        for i, n_ in enumerate(notlar):
            parcalar = sar(f"NOT-{i+1}: {n_}", 112)
            if yy - 3.1 * len(parcalar) < y + 2:
                T(-W + 3, yy, 1.7, "… (diğer notlar proje raporunda)"); break
            for s_ in parcalar:
                T(-W + 3, yy, 1.7, s_); yy -= 3.1
            yy -= 0.9
    return g


def pafta_olcek(M, pf):
    """(pafta_mm, ölçek). 'oto': önce küçük ölçek payda, aynı ölçekte küçük kağıt (A1 → A0)."""
    p = M.P["proje"]["pafta"]
    adaylar = ["A1", "A0"] if p == "oto" else [p]
    if not pf.olcekli:
        bb = pf.sinir()
        for a in adaylar:
            pm = PAFTA_MM[a]
            if bb[2] - bb[0] + 10 <= pm[0] - KENAR[0] - KENAR[2] and bb[3] - bb[1] + 10 <= pm[1] - KENAR[1] - KENAR[3]: return pm, None
        pm = PAFTA_MM[adaylar[-1]]                      # sığmazsa uzatılmış kağıt (190 mm katlama katı)
        w = max(pm[0], math.ceil((bb[2] - bb[0] + 10 + KENAR[0] + KENAR[2]) / 190) * 190)
        h = max(pm[1], math.ceil((bb[3] - bb[1] + 10 + KENAR[1] + KENAR[3]) / 10) * 10)
        return (w, h), None
    bb = pf.sinir(); w = bb[2] - bb[0]; h = bb[3] - bb[1]
    liste = DETAY_OLCEK if pf.kod == "05" else PLAN_OLCEK
    for s_ in liste:
        for a in adaylar:
            pm = PAFTA_MM[a]
            if w * 1000 / s_ <= pm[0] - KENAR[0] - KENAR[2] and h * 1000 / s_ <= pm[1] - KENAR[1] - KENAR[3]: return pm, s_
    return PAFTA_MM[adaylar[-1]], liste[-1]


def olcek_sec(bb, pafta_mm, kenar=(20, 20, 20, 80)):
    w = bb[2] - bb[0]; h = bb[3] - bb[1]
    uw = pafta_mm[0] - kenar[0] - kenar[2]; uh = pafta_mm[1] - kenar[1] - kenar[3]
    for s in OLCEKLER:
        if w * 1000 / s <= uw and h * 1000 / s <= uh: return s
    return OLCEKLER[-1]


def antet_bilgi(M, pf, olcek):
    """Elektrik Tesisleri Proje Yönetmeliği: A4 başlık iki bölüm — alt: proje bilgileri, üst: kontrol ve onay."""
    P, e, pr = M.P, M.P["elektrik"], M.P["proje"]
    nmod = len(M.masalar) * M.masa_modul
    guc = P["modul"]["guc_wp"]
    mf = " · ".join(x for x in [pr["muellif"], pr["muellif_unvan"], f"PUS {pr['pus_no']}" if pr["pus_no"] else "",
                                 f"SMM {pr['smm_no']}" if pr["smm_no"] else "", f"Oda {pr['oda_sicil']}" if pr["oda_sicil"] else ""] if x)
    return [("İŞİN ADI", pr["isin_adi"]), ("PAFTA ADI", pf.ad), ("YATIRIMCI / PROJE SAHİBİ", pr["yatirimci"] or pr["proje_sahibi"]),
            ("YÜKLENİCİ / İMALATÇI", " / ".join(x for x in [pr["yuklenici"], pr["imalatci"]] if x)),
            ("İL/İLÇE/ADA/PARSEL", pr["il_ilce_ada_parsel"]), ("PROJE MÜELLİFİ", mf),
            ("KURULU GÜÇ", f"{guc or '—'} Wp × {nmod} = " + (f"{nmod * guc / 1000:,.2f} kWp" if guc else "— kWp") + (f" · AC {sum((i.get('ac_kw') or e['inverter_ac_kw']) for i in M.inverterler):,.0f} kW ({len(M.inverterler)} inv)".replace(",", ".") if e["inverter_ac_kw"] else "")),
            ("ÖLÇEK · PAFTA NO", f"{'1/' + str(olcek) if olcek else 'ÖLÇEKSİZ'}   ·   {pf.kod} / {getattr(pf, 'toplam', 4)}"),
            ("REV · TARİH · SEVİYE", f"{pr['revizyon']}  ·  {pr['tarih']}  ·  {pr['seviye'].upper()}"),
            ("ÇİZEN / KONTROL", f"{pr['cizen']} / {pr['kontrol']}")]


def kablo_cetveli(M, yol):
    """Kablo cetveli: her DC string, AG (inverter→TM), OG hattı ve AG yol geçişi; boy ve gerilim düşümü (A.1 / EKAT md.58)."""
    P, e, mod = M.P, M.P["elektrik"], M.P["modul"]
    rows = []
    for s_ in M.stringler:
        du = None
        if mod["vmp_v"] and mod["imp_a"]:
            du = 2 * s_["dc_tek_yon_m"] * mod["imp_a"] * e["rho_cu"] / e["dc_kesit_mm2"] / (e["string_modul"] * mod["vmp_v"]) * 100
        sinif = "" if du is None else ("< %1 uygun" if du < 1 else ("%1–2 SOR (A.1)" if du < 2 else "≥ %2 KABUL EDİLMEZ"))
        rows.append(["DC", s_["ad"], f"Masa {s_['masa']['no']}", s_["inv"]["ad"], round(s_["dc_tek_yon_m"], 1), round(s_["dc_m"], 1), e["dc_kablo"],
                     "" if du is None else round(du, 3), sinif])
    rho = e["rho_cu"] if e["ac_iletken"] == "Cu" else e["rho_al"]
    for inv in M.inverterler:
        ikw = inv.get("ac_kw") or e["inverter_ac_kw"]
        I = (ikw * 1000 / (math.sqrt(3) * e["ag_gerilim_v"] * e["cosphi"])) if ikw else None
        Se = inv.get("ag_n", 1) * inv.get("ag_s", e["ac_kesit_mm2"])
        du = math.sqrt(3) * inv["ac_m"] * I * rho * e["cosphi"] / Se / e["ag_gerilim_v"] * 100 if I else None
        rows.append(["AG", inv["ad"], inv["ad"], f"TM{inv['tr']}", round(inv["ac_m"], 1), round(inv["ac_m"] * inv.get("ag_n", 1), 1), inv.get("ag_kablo", e["ac_kablo"]),
                     "" if du is None else round(du, 3), "" if du is None else ("uygun" if du <= e["ac_dusum_max_pct"] else f"> %{e['ac_dusum_max_pct']:g}")])
    for o in M.og:
        rows.append(["OG", f"{o['den']}-{o['ye']}", o["den"], o["ye"], round(o["m"], 1), round(o["m"] * 3, 1), e["og_kablo"], "", "3 tek damar"])
    for i, g_ in enumerate(M.yol_gecis):
        rows.append(["YOL GEÇİŞİ", f"YG{i+1}", g_["kablo"], f"İç yol {g_['yol']}", round(g_["m"], 1), round(g_["m"], 1), "HDPE boru", "", f"boru üstü ≥ {P['hendek']['yol_gecis_boru_ust_m']:g} m"])
    with open(yol, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["tür", "kablo", "nereden", "nereye", "tek yön / güzergâh (m)", "toplam kablo (m)", "kablo tipi", "ΔU %", "değerlendirme"])
        w.writerows(rows)


def dxf_yaz(M, pf, yol):
    import ezdxf
    doc = ezdxf.new("R2013", setup=True)
    doc.units = ezdxf.units.M if pf.olcekli else ezdxf.units.MM
    for ad, (renk, acik) in KATMANLAR.items():
        l = doc.layers.add(ad, color=renk, linetype="DASHED" if ad in KESIKLI else "Continuous"); l.description = acik
    if not pf.olcekli: doc.header["$LTSCALE"] = 4.0
    msp = doc.modelspace()
    for t, kat, d, info in pf.p:
        if t == "L": msp.add_lwpolyline(d, dxfattribs={"layer": kat})
        elif t == "P":
            msp.add_lwpolyline(d, close=True, dxfattribs={"layer": kat})
            if info and info[1] is True:
                hc = msp.add_hatch(dxfattribs={"layer": kat}); hc.paths.add_polyline_path(d, is_closed=True)
        elif t == "C": msp.add_circle((d[0], d[1]), d[2], dxfattribs={"layer": kat})
        elif t == "T":
            x, y, h, s, rot, hz = d
            tx = msp.add_text(s, dxfattribs={"layer": kat, "height": h, "rotation": rot, "style": "OpenSans"})
            tx.set_placement((x, y), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER if hz == "C" else ezdxf.enums.TextEntityAlignment.LEFT)
    # pafta çerçevesi + antet (model uzayında, ölçekli). Yerleşim PDF ile aynı: çizim kullanım alanında ortalanır,
    # antet kağıdın sağ-alt köşesinde alt antet bandındadır (KENAR alt 100 mm) — çizimin üstüne binmez.
    bb = pf.sinir()
    pm, olc = pafta_olcek(M, pf)
    L_, T_, R_, B_ = KENAR
    if pf.olcekli:
        k = olc / 1000.0                     # kağıt mm -> model birimi (m)
        uw, uh = (pm[0] - L_ - R_) * k, (pm[1] - T_ - B_) * k
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        X0, Y0 = cx - uw / 2 - L_ * k, cy - uh / 2 - B_ * k
    else:
        k = 1.0                              # tek hat / detay: model birimi mm
        X0, Y0 = bb[0] - 5 - L_, bb[3] + 5 - (pm[1] - T_ - B_) - B_
    P_ = lambda x, y: (X0 + x * k, Y0 + y * k)
    msp.add_lwpolyline([P_(0, 0), P_(pm[0], 0), P_(pm[0], pm[1]), P_(0, pm[1])], close=True, dxfattribs={"layer": "GES-ANTET", "color": 8})   # kağıt kenarı
    msp.add_lwpolyline([P_(20, 10), P_(pm[0] - 10, 10), P_(pm[0] - 10, pm[1] - 10), P_(20, pm[1] - 10)], close=True, dxfattribs={"layer": "GES-ANTET"})   # çerçeve, sol 20 mm cilt payı
    x = pm[0] - 190
    while x > 20:                            # 190 mm katlama işaretleri
        msp.add_line(P_(x, 0), P_(x, 5), dxfattribs={"layer": "GES-ANTET"}); msp.add_line(P_(x, pm[1] - 5), P_(x, pm[1]), dxfattribs={"layer": "GES-ANTET"}); x -= 190
    ox, oy = pm[0] - 10, 10                  # antet sağ-alt köşesi (kağıt mm)
    for typ, a, b in antet_geometri(M, pf, olc, pm[1] - 20):     # kağıt mm, sağ-alt köşe orijinli
        if typ == "R":
            (xa, ya), (xb, yb) = a, b
            msp.add_lwpolyline([P_(ox + xa, oy + ya), P_(ox + xb, oy + ya), P_(ox + xb, oy + yb), P_(ox + xa, oy + yb)], close=True, dxfattribs={"layer": "GES-ANTET"})
        elif typ == "L":
            msp.add_line(P_(ox + a[0], oy + a[1]), P_(ox + b[0], oy + b[1]), dxfattribs={"layer": "GES-ANTET"})
        elif typ == "K":
            msp.add_line(P_(ox + a[0], oy + a[1]), P_(ox + a[0] + 9, oy + a[1]), dxfattribs={"layer": b})
        else:
            xx, yy, h = a[:3]; hz = a[3] if len(a) > 3 else "L"
            tx = msp.add_text(str(b), dxfattribs={"layer": "GES-ANTET", "height": h * k, "style": "OpenSans"})
            tx.set_placement(P_(ox + xx, oy + yy), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER if hz == "C" else ezdxf.enums.TextEntityAlignment.LEFT)
    doc.saveas(yol)
    return olc


def dwg_cevir(dxf_yol):
    """DWG: ODA File Converter (ücretsiz, güvenilir). LibreDWG yazıcısı deneysel — sadece GESCIZ_LIBREDWG=1 ile."""
    oda = shutil.which("ODAFileConverter") or next((p for p in [r"C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe",
            "/Applications/ODAFileConverter.app/Contents/MacOS/ODAFileConverter", "/usr/bin/ODAFileConverter"] if os.path.exists(p)), None)
    if oda:
        import tempfile
        src = tempfile.mkdtemp(); dst = tempfile.mkdtemp()
        shutil.copy(dxf_yol, src)
        try:
            subprocess.run([oda, src, dst, "ACAD2013", "DWG", "0", "1", "*.dxf"], capture_output=True, timeout=900)
            cand = os.path.join(dst, os.path.basename(dxf_yol)[:-4] + ".dwg")
            if os.path.exists(cand):
                out = dxf_yol[:-4] + ".dwg"; shutil.move(cand, out); return out
        except Exception:
            pass
    if os.environ.get("GESCIZ_LIBREDWG") != "1": return None
    exe = shutil.which("dxf2dwg")
    if not exe: return None
    out = dxf_yol[:-4] + ".dwg"
    try:
        subprocess.run([exe, "-y", "-o", out, dxf_yol], capture_output=True, timeout=600)
        return out if os.path.exists(out) and os.path.getsize(out) > 1000 else None
    except Exception:
        return None


TR_RENK = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]
KAT_RENK = {"GES-SINIR": "#222", "GES-CEKME": "#999", "GES-CIT": "#c00", "GES-YOL": "#888", "GES-MASA": "#2b6cb0",
            "GES-MASA-NO": "#2b6cb0", "GES-STRING-NO": "#0a7", "GES-INV": "#a0a", "GES-TM": "#d97706", "GES-DC-KABLO": "#16a34a",
            "GES-AC-KABLO": "#ca8a04", "GES-OG-KABLO": "#dc2626", "GES-HENDEK-DC": "#16a34a", "GES-HENDEK-AC": "#ca8a04",
            "GES-TOPRAK-SERIT": "#b45309", "GES-TOPRAK-CUBUK": "#7c2d12", "GES-TOPRAK-BAGLANTI": "#ea580c", "GES-AYD-CCTV": "#7c3aed",
            "GES-SANTIYE": "#666", "GES-TEKHAT": "#111", "GES-TEKHAT-OG": "#b91c1c", "GES-OLCU": "#666", "GES-NOT": "#111", "GES-DETAY": "#111", "GES-DETAY-TARAMA": "#888", "GES-ANTET": "#111",
            "GES-TH-BARA": "#b91c1c", "GES-TH-HUCRE": "#111", "GES-TH-KOSK": "#555", "GES-TH-KUMANDA": "#1d4ed8",
            "GES-TH-TOPRAK": "#15803d", "GES-TH-YAZI": "#111"}


def proje_dosyasi(M, paftalar):
    """Elektrik Tesisleri Proje Yönetmeliği — üretim tesisi proje klasörü içeriği ve bu aracın karşıladığı kısım."""
    pr = M.P["proje"]
    idari = ["Proje kapağı (Form-18)", "İçindekiler listesi", "Yetki yazısı / müellif PUS + SMM/BTB belgeleri",
             "Lisans veya çağrı mektubu (lisanssız)", "Sistem bağlantı görüşü ve bağlantı anlaşması", "ÇED kararı / muafiyet",
             "Tapu / kira / tahsis belgesi"]
    hesap = [("YG/AG kablo hesapları (akım taşıma, gerilim düşümü)", "kısmi — düşüm kontrolleri RAPOR/kontrol tablosunda"),
             ("Kısa devre hesabı (IEC 60909, TM/DM'den, 16–25 kA veya TEİAŞ verisi)", "AYRI HAZIRLANIR"),
             ("Röle koordinasyon / selektivite (eğriler, set değerleri)", "AYRI HAZIRLANIR"),
             ("Topraklama + paratoner hesabı (IEEE 80 / yönetmelik; RE, adım-dokunma)", "kısmi — RE hesabı (ρ verilirse)" if M.RE is None else f"kısmi — RE = {M.RE:.3f} Ω"),
             ("İç ihtiyaç trafo güç hesabı", "AYRI HAZIRLANIR"), ("Kompanzasyon hesabı (trafo anma gücüne göre)", "AYRI HAZIRLANIR"),
             ("DC iç ihtiyaç (akü/redresör) hesabı", "AYRI HAZIRLANIR"), ("Aydınlatma + acil aydınlatma (lüks) hesabı", "AYRI HAZIRLANIR"),
             ("String/Voc/MPPT ve DC tek yön (A.1) kontrolleri", "BU ARAÇ — kontrol tablosu")]
    paf = [f"{p.kod}  {p.ad}" for p in paftalar]
    eksik = ["YG metal-clad hücre görünüş/kesit", "Yükseltici ve iç ihtiyaç trafosu görünüş/kesit", "Yangın algılama ve söndürme planı",
             "Aydınlatma + acil aydınlatma tek hat", "Paratoner planı (koruma yarıçapı)", "TM/DM fider hücresi koordinasyon projesi"]
    return {"pob": POB.get(pr["tesis_tipi"], pr["tesis_tipi"]), "idari": idari, "hesap": hesap, "paftalar": paf, "eksik_paftalar": eksik,
            "sureler": "POB eksik bildirimi 15 iş günü · düzeltme 15 iş günü · onay ≤ 15 iş günü · onay geçerliliği 5 yıl · değişiklikte tadilat projesi"}


def antet_pdf(fx, plt, M, pf, olc, ox, oy, H):
    for typ, a, b in antet_geometri(M, pf, olc, H):
        if typ == "R":
            (xa, ya), (xb, yb) = a, b
            fx.add_patch(plt.Rectangle((ox + xa, oy + ya), xb - xa, yb - ya, fill=True, fc="white", lw=0.6))
        elif typ == "L":
            fx.plot([ox + a[0], ox + b[0]], [oy + a[1], oy + b[1]], color="#000", lw=0.35)
        elif typ == "K":
            fx.plot([ox + a[0], ox + a[0] + 9], [oy + a[1], oy + a[1]], color=KAT_RENK.get(b, "#000"), lw=1.6)
        else:
            xx, yy, h = a[:3]; hz = a[3] if len(a) > 3 else "L"; bold = a[4] if len(a) > 4 else False
            fx.text(ox + xx, oy + yy, str(b), fontsize=h * 2.75, weight="bold" if bold else "normal",
                    ha="center" if hz == "C" else "left", va="center" if hz == "C" else "baseline")


def pdf_yaz(M, paftalar, yol, metraj, kontrol):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages
    from matplotlib.patches import Polygon as MPoly, Circle
    plt.rcParams["font.family"] = "DejaVu Sans"
    inch = 25.4
    L_, T_, R_, B_ = KENAR
    with PdfPages(yol) as pdf:
        # proje kapağı (onaylı antet formu)
        pm = PAFTA_MM["A3"]; e, pr = M.P["elektrik"], M.P["proje"]
        fig = plt.figure(figsize=(pm[0] / inch, pm[1] / inch)); fx = fig.add_axes([0, 0, 1, 1]); fx.axis("off")
        fx.set_xlim(0, pm[0]); fx.set_ylim(0, pm[1])
        fx.add_patch(plt.Rectangle((20, 10), pm[0] - 30, pm[1] - 20, fill=False, lw=1.0))
        kp = Pafta("00", "PROJE KAPAĞI", olcekli=False); kp.notlar = []
        antet_pdf(fx, plt, M, kp, None, pm[0] - 10, 10, None)
        cx = 20 + (pm[0] - 30 - 185) / 2
        fx.text(cx, pm[1] - 40, "ELEKTRİK PROJESİ", fontsize=20, weight="bold", ha="center")
        fx.text(cx, pm[1] - 52, "GÜNEŞ ENERJİSİ SANTRALİ (GES)", fontsize=13, ha="center")
        fx.text(cx, pm[1] - 60, {"lisanssiz": "Lisanssız Elektrik Üretim Tesisi", "lisansli": "Lisanslı Elektrik Üretim Tesisi"}.get(pr["tesis_tipi"], pr["tesis_tipi"]), fontsize=10, ha="center")
        fx.text(cx, pm[1] - 78, (pr["isin_adi"] or "").upper(), fontsize=15, weight="bold", ha="center")
        nmod = len(M.masalar) * M.masa_modul; guc = M.P["modul"]["guc_wp"]
        kws = [i.get("ac_kw") or e["inverter_ac_kw"] for i in M.inverterler]
        bil = [("DC kurulu güç", (_tr_sayi(nmod * guc / 1000) + " kWp") if guc else "—"),
               ("AC kurulu güç", (_tr_sayi(sum(kws), 0) + " kWe") if kws and all(kws) else "—"),
               ("Modül", f"{nmod} adet × {guc:g} Wp" if guc else f"{nmod} adet"),
               ("Evirici", f"{len(M.inverterler)} adet" + (f" × {e['inverter_ac_kw']:g} kWe" if e["inverter_ac_kw"] else "") + (f" ({e['inverter_model']})" if e.get("inverter_model") else "")),
               ("Trafo", " + ".join(f"{v} kVA" for v in (getattr(M, 'tr_kva', None) or [e['trafo_kva']] * M.n_tr)) + f" · {e['trafo_gerilim']}"),
               ("Yer", " / ".join(x for x in [pr.get("il"), pr.get("ilce"), pr.get("mahalle"), (f"Ada {pr['ada']}" if pr.get("ada") else ""), (f"Parsel {pr['parsel']}" if pr.get("parsel") else "")] if x) or pr.get("il_ilce_ada_parsel") or "—"),
               ("Proje sahibi", pr.get("proje_sahibi") or pr.get("yatirimci") or "—")]
        y = pm[1] - 98
        for k_, v_ in bil:
            fx.text(cx - 70, y, k_, fontsize=9, weight="bold"); fx.text(cx - 25, y, v_, fontsize=9); y -= 6.5
        y -= 6; fx.text(cx - 70, y, "PROJE İÇERİĞİ", fontsize=10, weight="bold"); y -= 7
        for p_ in paftalar:
            fx.text(cx - 70, y, f"{pr.get('pafta_on_ek', 'E')}{p_.kod}", fontsize=9); fx.text(cx - 50, y, p_.ad, fontsize=9); y -= 5.6
        for t_ in ["Proje dosyası içindekiler", "Metraj ve kontrol"]:
            fx.text(cx - 50, y, t_, fontsize=9, color="#444"); y -= 5.6
        pdf.savefig(fig); plt.close(fig)
        for pf in paftalar:
            pm, olc = pafta_olcek(M, pf)
            fig = plt.figure(figsize=(pm[0] / inch, pm[1] / inch))
            bb = pf.sinir()
            alan = [L_ / pm[0], B_ / pm[1], (pm[0] - L_ - R_) / pm[0], (pm[1] - T_ - B_) / pm[1]]
            if pf.olcekli:
                k = olc / 1000.0
                uw, uh = (pm[0] - L_ - R_) * k, (pm[1] - T_ - B_) * k
                cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
                ax = fig.add_axes(alan)
                ax.set_xlim(cx - uw / 2, cx + uw / 2); ax.set_ylim(cy - uh / 2, cy + uh / 2)
                pt_per_m = 72 / inch * 1000 / olc
            else:
                ax = fig.add_axes(alan)
                w, h = pm[0] - L_ - R_, pm[1] - T_ - B_
                ax.set_xlim(0, w); ax.set_ylim(0, h) if False else ax.set_ylim(bb[3] - h + 5, bb[3] + 5)
                ax.set_xlim(bb[0] - 5, bb[0] - 5 + w)
                pt_per_m = 72 / inch
            ax.set_aspect("equal"); ax.axis("off")
            for t, kat, d, info in pf.p:
                c = KAT_RENK.get(kat, "#000")
                lw = KAT_LW.get(kat, 0.8 if "OG" in kat else 0.5)
                ls = (0, (5, 3)) if kat in KESIKLI else "-"
                if t == "L":
                    xs, ys = zip(*d); ax.plot(xs, ys, color=c, lw=lw, ls=ls, solid_capstyle="butt")
                elif t == "P":
                    dol = info[1] if info else 0
                    if dol is True: fc = c
                    else: fc = (TR_RENK[(dol - 1) % len(TR_RENK)] + "55") if (kat == "GES-MASA" and dol) else "none"
                    ax.add_patch(MPoly(d, closed=True, fill=fc != "none", fc=fc if fc != "none" else None, ec=c, lw=lw, ls=ls))
                elif t == "C":
                    ax.add_patch(Circle((d[0], d[1]), d[2], fill=kat in ("GES-TOPRAK-BAGLANTI",), fc=c, ec=c, lw=lw if kat.startswith(("GES-TEKHAT", "GES-TH")) else 0.4))
                elif t == "T":
                    x, y, h, s, rot, hz = d
                    fs = max(1.2, h * pt_per_m)
                    ax.text(x, y, s, fontsize=fs, rotation=rot, color=c, ha="center" if hz == "C" else "left", va="center" if hz == "C" else "bottom")
            # çerçeve + antet
            fx = fig.add_axes([0, 0, 1, 1], facecolor="none"); fx.set_xlim(0, pm[0]); fx.set_ylim(0, pm[1]); fx.axis("off")
            fx.add_patch(plt.Rectangle((20, 10), pm[0] - 30, pm[1] - 20, fill=False, lw=1.0))   # sol 20 mm cilt payı
            x = pm[0] - 190
            while x > 20:                                                                      # 190 mm katlama işaretleri
                fx.plot([x, x], [0, 5], color="#000", lw=0.4); fx.plot([x, x], [pm[1] - 5, pm[1]], color="#000", lw=0.4); x -= 190
            ox, oy = pm[0] - 10, 10
            antet_pdf(fx, plt, M, pf, olc, ox, oy, pm[1] - 20)
            pdf.savefig(fig); plt.close(fig)
        pm = PAFTA_MM["A1"]
        # proje dosyası / içindekiler sayfası
        pdos = proje_dosyasi(M, paftalar)
        fig = plt.figure(figsize=(pm[0] / inch, pm[1] / inch)); fx = fig.add_axes([0, 0, 1, 1]); fx.axis("off")
        fx.set_xlim(0, pm[0]); fx.set_ylim(0, pm[1])
        fx.text(25, pm[1] - 25, f"PROJE DOSYASI İÇİNDEKİLER — {M.P['proje']['isin_adi']}", fontsize=14, weight="bold")
        fx.text(25, pm[1] - 33, f"Proje onay birimi: {pdos['pob']}   ·   {pdos['sureler']}", fontsize=8)
        bl = [("A. İDARİ BELGELER", [(x, "") for x in pdos["idari"]]), ("B. HESAPLAR", pdos["hesap"]),
              ("C. PAFTALAR (bu araç)", [(x, "✔") for x in pdos["paftalar"]]), ("D. EK PAFTALAR (ayrı hazırlanır)", [(x, "—") for x in pdos["eksik_paftalar"]])]
        y = pm[1] - 48
        for bas, sat in bl:
            fx.text(25, y, bas, fontsize=10, weight="bold"); y -= 7
            for a, b in sat:
                fx.text(32, y, a, fontsize=8.5); fx.text(230, y, b, fontsize=8, color="#555"); y -= 5.6
            y -= 4
        pdf.savefig(fig); plt.close(fig)
        # metraj + kontrol sayfası
        fig = plt.figure(figsize=(pm[0] / inch, pm[1] / inch)); fx = fig.add_axes([0, 0, 1, 1]); fx.axis("off")
        fx.set_xlim(0, pm[0]); fx.set_ylim(0, pm[1])
        fx.text(20, pm[1] - 25, f"METRAJ VE KONTROL — {M.P['proje']['isin_adi']}  ({M.P['proje']['revizyon']})", fontsize=14, weight="bold")
        y = pm[1] - 40
        nds = sum(1 for r in metraj if r["grup"] == "DC string")
        for r in [r for r in metraj if r["grup"] != "DC string"] + ([{"grup": "DC string", "kalem": f"{nds} string tek tek: 02 tek hat paftası ADP DC kablo listeleri ve KESIF.csv", "miktar": "", "birim": "", "kaynak": "02", "hakedis": ""}] if nds else []):
            fx.text(20, y, r["grup"], fontsize=9); fx.text(55, y, r["kalem"], fontsize=9)
            fx.text(215, y, f"{r['miktar']:,}" if isinstance(r["miktar"], (int, float)) else str(r["miktar"]), fontsize=9, ha="right")
            fx.text(218, y, r["birim"], fontsize=9); fx.text(238, y, r["kaynak"], fontsize=8); fx.text(265, y, r["hakedis"], fontsize=8)
            y -= 6.2
        y = pm[1] - 40; x0 = pm[0] / 2 + 30
        for r in kontrol:
            fx.text(x0, y, r["durum"], fontsize=9, color="#16a34a" if r["durum"] == "✔" else ("#dc2626" if r["durum"] == "✖" else "#ca8a04"))
            fx.text(x0 + 20, y, r["kontrol"], fontsize=9); fx.text(x0 + 150, y, str(r["deger"]), fontsize=8.5)
            fx.text(x0 + 150, y - 3.4, str(r["kural"]), fontsize=7, color="#666")
            y -= 9
        for i, u in enumerate(M.uyari):
            fx.text(x0, y - 5 - i * 5.5, "⚠ " + u, fontsize=8.5, color="#b45309")
        pdf.savefig(fig); plt.close(fig)


def html_yaz(M, paftalar, yol, metraj, kontrol, dosyalar):
    P = M.P
    def svg(pf):
        bb = pf.sinir(); pad = (bb[2] - bb[0]) * 0.02 + 5
        vb = (bb[0] - pad, -(bb[3] + pad), bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad)
        sw = vb[2] / 1500
        gs = {}
        for t, kat, d, info in pf.p:
            c = KAT_RENK.get(kat, "#000")
            if t == "L":
                s = f'<polyline points="{" ".join(f"{x:.2f},{-y:.2f}" for x, y in d)}" fill="none"/>'
            elif t == "P":
                inf, dol = info if info else (None, 0)
                fill = f' fill="{c}"' if dol is True else (f' fill="{TR_RENK[(dol - 1) % len(TR_RENK)]}" fill-opacity=".35"' if (kat == "GES-MASA" and dol) else ' fill="none"')
                tt = f"<title>{_html.escape(inf)}</title>" if inf else ""
                s = f'<polygon points="{" ".join(f"{x:.2f},{-y:.2f}" for x, y in d)}"{fill}>{tt}</polygon>'
            elif t == "C":
                tt = f"<title>{_html.escape(info)}</title>" if info else ""
                fl = 'fill="none"' if kat.startswith(("GES-TEKHAT", "GES-TH")) else f'fill="{c}" fill-opacity=".6"'
                s = f'<circle cx="{d[0]:.2f}" cy="{-d[1]:.2f}" r="{d[2]:.2f}" {fl}>{tt}</circle>'
            else:
                x, y, h, tx, rot, hz = d
                s = (f'<text x="{x:.2f}" y="{-y:.2f}" font-size="{h:.2f}" text-anchor="{"middle" if hz == "C" else "start"}" '
                     f'transform="rotate({-rot:.1f} {x:.2f} {-y:.2f})" fill="{c}" stroke="none">{_html.escape(tx)}</text>')
            gs.setdefault(kat, []).append(s)
        if not pf.olcekli: sw = 0.18
        body = "".join(f'<g data-k="{k}" stroke="{KAT_RENK.get(k, "#000")}" stroke-width="{sw * (KAT_LW.get(k, 0.5) / 0.5 if not pf.olcekli else (2 if "OG" in k or k=="GES-CIT" else 1)):.3f}"'
                       f'{DASH_SVG if k in KESIKLI else ""}>{"".join(v)}</g>' for k, v in gs.items())
        return f'<svg viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" data-vb="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}">{body}</svg>', list(gs.keys())
    tabs, panes = [], []
    for i, pf in enumerate(paftalar):
        s, kats = svg(pf)
        tabs.append(f'<button class="tab{" on" if i == 0 else ""}" data-t="p{i}">{pf.kod} {pf.ad.title()}</button>')
        chk = "".join(f'<label><input type="checkbox" checked data-k="{k}"><i style="background:{KAT_RENK.get(k, "#000")}"></i>{KATMANLAR.get(k, ("", k))[1]}</label>' for k in kats)
        panes.append(f'<section id="p{i}" class="pane{" on" if i == 0 else ""}"><div class="lay">{chk}</div><div class="cv">{s}</div></section>')
    fm = lambda v: f"{v:,}" if isinstance(v, (int, float)) else str(v)
    mt = "".join(f"<tr><td>{r['grup']}</td><td>{_html.escape(r['kalem'])}</td><td class=n>{fm(r['miktar'])}</td><td>{r['birim']}</td><td>{r['kaynak']}</td><td>{_html.escape(r['hakedis'])}</td></tr>" for r in metraj)
    kt = "".join(f"<tr><td class='d{0 if r['durum']=='✔' else (1 if r['durum']=='✖' else 2)}'>{r['durum']}</td><td>{_html.escape(r['kontrol'])}</td><td>{_html.escape(str(r['deger']))}</td><td class=m>{_html.escape(str(r['kural']))}</td></tr>" for r in kontrol)
    uy = "".join(f"<li>{_html.escape(u)}</li>" for u in M.uyari)
    tabs.append('<button class="tab" data-t="pm">Metraj &amp; Kontrol</button>')
    panes.append(f'<section id="pm" class="pane"><div class="tbls"><div><h3>Metraj</h3><table><tr><th>Grup</th><th>Kalem</th><th>Miktar</th><th>Birim</th><th>Pafta</th><th>Hakediş kalemi</th></tr>{mt}</table></div>'
                 f'<div><h3>Kontroller</h3><table>{kt}</table><ul class=uy>{uy}</ul><h3>Dosyalar</h3><ul>{"".join(f"<li>{_html.escape(d)}</li>" for d in dosyalar)}</ul></div></div></section>')
    ozet = f"{len(M.masalar)} masa · {len(M.masalar) * M.masa_modul} modül · {len(M.stringler)} string · {len(M.inverterler)} inverter · {M.n_tr} TM"
    doc = f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_html.escape(P['proje']['kod'])} Proje Çizimi</title>
<style>
:root{{--bg:#f7f7f5;--fg:#1a1a1a;--mu:#666;--ln:#ddd;--cd:#fff;--ac:#b45309}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#161616;--fg:#eee;--mu:#aaa;--ln:#333;--cd:#1f1f1f}}}}
:root[data-theme="dark"]{{--bg:#161616;--fg:#eee;--mu:#aaa;--ln:#333;--cd:#1f1f1f}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:14px system-ui,sans-serif}}
header{{padding:12px 16px;border-bottom:1px solid var(--ln)}}h1{{font-size:17px;margin:0}}header p{{margin:4px 0 0;color:var(--mu);font-size:12.5px}}
nav{{display:flex;gap:4px;padding:8px 16px;overflow-x:auto;border-bottom:1px solid var(--ln)}}
.tab{{border:1px solid var(--ln);background:var(--cd);color:var(--fg);padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;font-size:13px}}
.tab.on{{border-color:var(--ac);color:var(--ac);font-weight:600}}
.pane{{display:none}}.pane.on{{display:block}}.lay{{display:flex;flex-wrap:wrap;gap:4px 12px;padding:8px 16px;font-size:12px}}
.lay label{{display:flex;align-items:center;gap:4px;cursor:pointer}}.lay i{{width:12px;height:3px;display:inline-block}}
.cv{{height:calc(100vh - 170px);min-height:360px;margin:0 16px 16px;border:1px solid var(--ln);background:#fff;overflow:hidden;touch-action:none;border-radius:6px}}
.cv svg{{width:100%;height:100%;cursor:grab}}
.tbls{{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 16px 16px}}@media(max-width:900px){{.tbls{{grid-template-columns:1fr}}}}
.tbls>div{{overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:12.5px;background:var(--cd)}}td,th{{border-bottom:1px solid var(--ln);padding:5px 7px;text-align:left;vertical-align:top}}
td.n{{text-align:right;font-variant-numeric:tabular-nums}}.d0{{color:#16a34a}}.d1{{color:#dc2626;font-weight:700}}.d2{{color:#ca8a04}}.m{{color:var(--mu);font-size:11px}}
.uy li{{color:#b45309}}h3{{font-size:14px}}
</style></head><body>
<header><h1>{_html.escape(P['proje']['isin_adi'] or P['proje']['kod'])} — Proje Çizimi {_html.escape(P['proje']['revizyon'])}</h1>
<p>{ozet} · seviye: {P['proje']['seviye']} · GES-ÇİZ v{SURUM} · fare tekeri: yakınlaştır, sürükle: kaydır, masa/inverter üstüne gel: bilgi</p></header>
<nav>{''.join(tabs)}</nav>{''.join(panes)}
<script>
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{{document.querySelectorAll('.tab,.pane').forEach(e=>e.classList.remove('on'));b.classList.add('on');document.getElementById(b.dataset.t).classList.add('on')}});
document.querySelectorAll('.lay input').forEach(c=>c.onchange=()=>{{const s=c.closest('section');s.querySelectorAll('g[data-k="'+c.dataset.k+'"]').forEach(g=>g.style.display=c.checked?'':'none')}});
document.querySelectorAll('.cv svg').forEach(svg=>{{let v=svg.dataset.vb.split(' ').map(Number),drag=null;
const set=()=>svg.setAttribute('viewBox',v.join(' '));
svg.addEventListener('wheel',e=>{{e.preventDefault();const r=svg.getBoundingClientRect(),f=e.deltaY>0?1.2:1/1.2;
const sx=v[0]+(e.clientX-r.left)/r.width*v[2],sy=v[1]+(e.clientY-r.top)/r.height*v[3];v=[sx-(sx-v[0])*f,sy-(sy-v[1])*f,v[2]*f,v[3]*f];set()}},{{passive:false}});
svg.addEventListener('pointerdown',e=>{{drag=[e.clientX,e.clientY];svg.setPointerCapture(e.pointerId)}});
svg.addEventListener('pointermove',e=>{{if(!drag)return;const r=svg.getBoundingClientRect();v[0]-=(e.clientX-drag[0])/r.width*v[2];v[1]-=(e.clientY-drag[1])/r.height*v[3];drag=[e.clientX,e.clientY];set()}});
svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('dblclick',()=>{{v=svg.dataset.vb.split(' ').map(Number);set()}});}});
</script></body></html>"""
    with open(yol, "w", encoding="utf-8") as f: f.write(doc)


def aplikasyon_csv(M, yol):
    """Uygulama seviyesi: kolon koordinatları (aks × ön/arka)."""
    m = M.P["masa"]
    n, a = m["aks_sayisi"], m["aks_araligi_m"]
    kons = (M.masa_L - (n - 1) * a) / 2
    with open(yol, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["nokta", "masa", "string", "aks", "kolon", "Y(D)", "X(K)"])
        for ms in M.masalar:
            x0, y0, x1, y1 = ms["loc"].bounds
            for i in range(n):
                x = x0 + kons + i * a
                ks = min(m.get("kolon_sira_araligi_m") or KG_AYAK_MAX, KG_AYAK_MAX, y1 - y0); yo = y0 + (y1 - y0 - ks) / 2
                for kn, yy in (("ON", yo), ("ARKA", yo + ks)):
                    X, Y = M.Wp(x, yy)
                    w.writerow([f"M{ms['no']}-A{i+1}-{kn}", ms["no"], "|".join(ms.get("str", [])), i + 1, kn, f"{X:.3f}", f"{Y:.3f}"])


# ----------------------------------------------------------------- ANA
def calistir(param_yol, cikti=None, seviye=None):
    with open(param_yol, encoding="utf-8") as f:
        P = birlestir(VARSAYILAN, json.load(f))
    if seviye: P["proje"]["seviye"] = seviye
    P["proje"]["tarih"] = P["proje"]["tarih"] or datetime.date.today().strftime("%d.%m.%Y")
    kod = P["proje"]["kod"]; rev = P["proje"]["revizyon"]
    cikti = cikti or os.path.join(os.path.dirname(os.path.abspath(param_yol)), f"{kod}_{rev}")
    os.makedirs(cikti, exist_ok=True)
    M = Model(P).kur()
    sv = P["proje"]["seviye"]
    th = [pafta_tekhat(M, "02")]
    paftalar = [pafta_yerlesim(M, sv)] + th + [pafta_topraklama(M), pafta_kablo(M), pafta_kanal(M)]
    toplam_pafta = len(paftalar)
    for pf in paftalar: pf.toplam = toplam_pafta
    dosyalar = []
    dwg_yok = False
    for pf in paftalar:
        ad = f"{kod}_{pf.kod}_{'TEK_HAT' if pf.kod.startswith('02') else ('KANAL_DETAY' if pf.kod == '05' else pf.ad.split()[0])}_{rev}".replace("Ğ", "G").replace("İ", "I").replace("Ş", "S").replace("Ü", "U").replace("Ö", "O").replace("Ç", "C")
        dxf = os.path.join(cikti, ad + ".dxf")
        dxf_yaz(M, pf, dxf); dosyalar.append(os.path.basename(dxf))
        dwg = dwg_cevir(dxf)
        if dwg: dosyalar.append(os.path.basename(dwg))
        else: dwg_yok = True
    if dwg_yok: M.uyari.append("DWG üretilmedi: ODA File Converter bulunamadı. DXF'ler AutoCAD'de doğrudan açılır → DWG olarak kaydet, ya da ODA kurulu bilgisayarda scripti çalıştır.")
    pdf = os.path.join(cikti, f"{kod}_PAFTALAR_{rev}.pdf")
    if sv == "uygulama":
        ap = os.path.join(cikti, f"{kod}_APLIKASYON_{rev}.csv"); aplikasyon_csv(M, ap); dosyalar.append(os.path.basename(ap))
    mc = os.path.join(cikti, f"{kod}_METRAJ_{rev}.csv")
    with open(mc, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["grup", "kalem", "miktar", "birim", "kaynak", "hakedis"], delimiter=";"); w.writeheader(); w.writerows(M.metraj)
    kc = os.path.join(cikti, f"{kod}_KABLO_CETVELI_{rev}.csv"); kablo_cetveli(M, kc)
    dosyalar += [os.path.basename(mc), os.path.basename(kc), os.path.basename(pdf), f"{kod}_PROJE_{rev}.html", f"{kod}_RAPOR_{rev}.json"]
    pdf_yaz(M, paftalar, pdf, M.metraj, M.kontrol)
    html_yaz(M, paftalar, os.path.join(cikti, f"{kod}_PROJE_{rev}.html"), M.metraj, M.kontrol, dosyalar)
    rapor = {"surum": SURUM, "proje": P["proje"], "ozet": {"masa": len(M.masalar), "modul": len(M.masalar) * M.masa_modul,
             "string": len(M.stringler), "inverter": len(M.inverterler), "tm": M.n_tr, "sira": M.sira_sayisi,
             "masa_L_m": round(M.masa_L, 3), "masa_D_m": round(M.masa_D, 3), "masa_H_m": round(M.masa_H, 3)},
             "tr": [{"tr": t + 1, "masa": len(g), "string": sum(i["n_str"] for i in M.inverterler if i["tr"] == t + 1),
                     "inverter": [f"INV{i['no']}:{i['n_str']}" for i in M.inverterler if i["tr"] == t + 1]} for t, g in enumerate(M.tr_gruplari)],
             "og": [{k: v for k, v in o.items() if k != "hat"} for o in M.og],
             "kontrol": M.kontrol, "uyari": M.uyari, "metraj": M.metraj, "dosyalar": dosyalar,
             "proje_dosyasi": proje_dosyasi(M, paftalar)}
    with open(os.path.join(cikti, f"{kod}_RAPOR_{rev}.json"), "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=1)
    return cikti, rapor


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="GES-ÇİZ parametrik GES proje çizimi")
    ap.add_argument("param"); ap.add_argument("--cikti"); ap.add_argument("--seviye", choices=["teklif", "uygulama"])
    a = ap.parse_args()
    d, r = calistir(a.param, a.cikti, a.seviye)
    print("ÇIKTI:", d)
    print(json.dumps(r["ozet"], ensure_ascii=False))
    for k in r["kontrol"]: print(f"  {k['durum']:9s} {k['kontrol']}: {k['deger']}")
    for u in r["uyari"]: print("  ⚠", u)
