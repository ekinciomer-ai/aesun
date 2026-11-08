#!/usr/bin/env python3
"""AEMonitoring · SmartLogger'a doğrudan erişim (saha ağı, Modbus TCP) — kompanzasyon için.

Pi (192.168.0.132) saha ağından Huawei SmartLogger'lara ulaşıyor (ağ keşfi 15 Eki: 192.168.1.10 ve 192.168.1.181,
Huawei Network Energy sertifikalı HTTPS). Modbus TCP (502) şu an KAPALI: SmartLogger web arayüzünden açılmalı
(Ayarlar › İletişim parametreleri › Modbus TCP › "Etkin (Sınırsız)" ya da istemci IP'si 192.168.0.132).

Yol seçimi (kompanzasyon.py): 1) doğrudan Modbus (kompanzasyon.json → yazici.modbus.dogrulandi) ·
2) uzaktan FusionSolar (yazici.fusionsolar.dogrulandi) · 3) yalnız öneri.

Bu dosya:
  yokla()      YALNIZ OKUMA. 443/502 açık mı, 502 açıksa aday kayıtları (reaktif ayar, cosφ, Q/S) okur. Sonuç durum dosyasına.
  q_yaz(...)   Reaktif güç ayarı yazar — YALNIZ kayıt haritası kompanzasyon.json'da doğrulanmış (modbus.dogrulandi) ve
               değer sınır içindeyse. Yazdıktan sonra geri okur; tutmazsa hata verir.
Kayıt adresleri Huawei "SmartLogger3000 MODBUS Interface Definitions" belgesinden aday olarak alınmıştır; sahadaki
sürümde okuma ile doğrulanmadan yazma açılmaz.
"""
import socket, struct, time

ADAY_KAYIT = {   # adres: (ad, tür, kazanç, birim) — doğrulanmadı
    40420: ("Aktif güç ayarı", "U32", 10, "kW"),
    40422: ("Reaktif güç ayarı", "I32", 10, "kVAr"),
    40424: ("Güç faktörü ayarı", "I16", 1000, ""),
    40426: ("Aktif güç yüzde sınırı", "U16", 10, "%"),
    40428: ("Q/S ayarı", "I16", 1000, ""),
}


def _acik(ip, port, sure=1.5):
    try:
        with socket.create_connection((ip, port), timeout=sure):
            return True
    except OSError:
        return False


class Modbus:
    def __init__(self, ip, birim=0, sure=4):
        self.s = socket.create_connection((ip, 502), timeout=sure)
        self.birim, self.tid = birim, 0

    def _istek(self, pdu):
        self.tid = (self.tid + 1) & 0xFFFF
        self.s.sendall(struct.pack(">HHHB", self.tid, 0, len(pdu) + 1, self.birim) + pdu)
        bas = self._al(7)
        _, _, uz, _ = struct.unpack(">HHHB", bas)
        g = self._al(uz - 1)
        if g[0] & 0x80:
            raise IOError(f"Modbus istisna {g[1]} (fonksiyon {g[0] & 0x7F})")
        return g

    def _al(self, n):
        b = b""
        while len(b) < n:
            p = self.s.recv(n - len(b))
            if not p:
                raise IOError("bağlantı kapandı")
            b += p
        return b

    def oku(self, adres, adet):
        g = self._istek(struct.pack(">BHH", 3, adres, adet))
        return list(struct.unpack(">" + "H" * adet, g[2:2 + 2 * adet]))

    def yaz(self, adres, kelimeler):
        self._istek(struct.pack(">BHHB", 16, adres, len(kelimeler), 2 * len(kelimeler)) + b"".join(struct.pack(">H", w & 0xFFFF) for w in kelimeler))

    def kapat(self):
        try:
            self.s.close()
        except Exception:
            pass


def _coz(k, tur, kaz):
    if tur == "U16":
        return k[0] / kaz
    if tur == "I16":
        return struct.unpack(">h", struct.pack(">H", k[0]))[0] / kaz
    v = (k[0] << 16) | k[1]
    if tur == "I32" and v & 0x80000000:
        v -= 1 << 32
    return v / kaz


def yokla(ipler, birimler=(0, 3, 1)):
    """YALNIZ OKUMA. Her SmartLogger için: 443/502 açık mı, sertifika seri no, 502 açıksa aday kayıt değerleri."""
    out = {}
    for ip in ipler:
        r = out[ip] = {"https": _acik(ip, 443), "modbus": _acik(ip, 502), "t": time.strftime("%Y-%m-%dT%H:%M:%S")}
        if not r["modbus"]:
            continue
        for b in birimler:
            try:
                m = Modbus(ip, b)
                try:
                    deg = {}
                    for adr, (ad, tur, kaz, br) in ADAY_KAYIT.items():
                        try:
                            deg[str(adr)] = {"ad": ad, "deger": _coz(m.oku(adr, 2 if tur.endswith("32") else 1), tur, kaz), "birim": br}
                        except Exception as e:
                            deg[str(adr)] = {"ad": ad, "hata": str(e)[:80]}
                    r["birim"], r["kayit"] = b, deg
                    if any("deger" in v for v in deg.values()):
                        break
                finally:
                    m.kapat()
            except Exception as e:
                r.setdefault("hata", []).append(f"birim {b}: {str(e)[:80]}")
    return out


# Kimlik: yazmadan önce doğru SmartLogger'la konuştuğumuzu doğrula (16 Eki Sera-1: IP çakışması — aynı adrese bir
# Ruijie telsiz köprü de cevap verdi). Toplam enerji (40560, kWh) santrale özgü ve yalnız artar.
KIMLIK = {"Sera-1": (2_400_000, 3_500_000), "Sera-2": (1_300_000, 2_300_000)}   # toplam kWh aralığı (2026–2027)


def kimlik(ip, beklenen=None):
    """Toplam enerji ve aktif güç okur; beklenen tesis verilmişse aralığa uymazsa ValueError."""
    m = Modbus(ip, 0)
    try:
        e = _coz(m.oku(40560, 2), "U32", 10)
        p = _coz(m.oku(40525, 2), "I32", 1000)
    finally:
        m.kapat()
    if beklenen:
        lo, hi = KIMLIK[beklenen]
        if not lo <= e <= hi:
            raise ValueError(f"{ip} {beklenen} değil gibi: toplam {e:,.0f} kWh (beklenen {lo:,}–{hi:,})")
    return {"toplam_kwh": e, "p_kw": p}


def q_yaz(ip, kvar, harita, q_sinir):
    """Reaktif güç ayarını yazar ve geri okur. harita: kompanzasyon.json → yazici.modbus (dogrulandi, birim, q_kayit,
    q_tur, q_kazanc). Doğrulanmamışsa ya da değer sınır dışındaysa yazmaz."""
    if not (harita or {}).get("dogrulandi") or not harita.get("q_kayit"):
        raise PermissionError("Modbus kayıt haritası doğrulanmadı")
    if abs(kvar) > q_sinir:
        raise ValueError(f"{kvar} kVAr sınır dışında (±{q_sinir})")
    if harita.get("tesis"):
        kimlik(ip, harita["tesis"])           # yanlış cihaza yazma: önce kimlik
    adr, tur, kaz = int(harita["q_kayit"]), harita.get("q_tur", "I32"), float(harita.get("q_kazanc", 10))
    ham = int(round(kvar * kaz))
    k = [(ham >> 16) & 0xFFFF, ham & 0xFFFF] if tur.endswith("32") else [ham & 0xFFFF]
    m = Modbus(ip, int(harita.get("birim", 0)))
    try:
        m.yaz(adr, k)
        time.sleep(1)
        geri = _coz(m.oku(adr, len(k)), tur, kaz)
    finally:
        m.kapat()
    if abs(geri - kvar) > 1 / kaz + 1e-6:
        raise IOError(f"geri okuma tutmadı: yazılan {kvar}, okunan {geri}")
    return geri
