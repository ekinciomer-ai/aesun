#!/usr/bin/env python3
"""Kompanzasyon — SmartLogger reaktif güç YAZMA denemesi (elle, adım adım; Ctrl+C her an güvenle geri alır).

Kullanım (Pi'de):  python3 ~/aesun/pi/kompanzasyon_deneme.py --ip 192.168.1.10 --tesis Sera-2 --fark 3 --sure 10

Adımlar:
  1. Ölç     Şu anki aktif güç, reaktif güç, cosφ (3 okuma ortalaması) = TABAN.
  2. Hazırla Reaktif ayar kaydına (40422) TABAN değeri yazılır → mod değişince inverterler aynı noktada kalsın.
  3. Mod     SmartLogger web › Ayarlar › Güç Parametreleri › Reaktif Güç Kontrolü › "Uzaktan iletişim programlama" › Gönder
             (betik bekler; Enter'a basınca ölçer: Q tabanda kalmalı).
  4. Dene    TABAN + fark yazılır, --sure dakika boyunca 30 sn'de bir ölçülür (Q yeni değere gitmeli).
  5. Geri al TABAN yazılır, Q'nun döndüğü doğrulanır. Sonuç: ~/.aesun/kompanzasyon_deneme.json (+ epias-ptf/n8n/).
Güvenlik (16 Eki Sera-1 kopmasından sonra sıkılaştırıldı): her yazmadan önce KİMLİK (toplam enerji tesis aralığında mı) ·
mod değişikliğinden sonra 5 dk izleme · geri alma bağlantı koparsa 10 dk boyunca 10 sn'de bir yeniden denenir · |fark| ≤ 5 kVAr · aktif güç %40'tan fazla düşerse ya da Q beklenenden 10 kVAr'dan fazla saparsa deneme durur ve geri alır ·
hata/Ctrl+C olursa da TABAN geri yazılır. Mod değişikliğini yalnız kullanıcı yapar; betik modu değiştirmez.
"""
import argparse, json, sys, time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import smartlogger as SL

Q_AYAR = 40422            # reaktif güç ayarı (I32, kazanç 10, kVAr) — aday; bu deneme doğrular


def olc(ip, n=3, ara=2):
    p = q = pf = 0.0
    for i in range(n):
        m = SL.Modbus(ip, 0)
        try:
            p += SL._coz(m.oku(40525, 2), "I32", 1000)
            q += SL._coz(m.oku(40544, 2), "I32", 1000)
            pf += SL._coz(m.oku(40532, 1), "I16", 1000)
        finally:
            m.kapat()
        if i < n - 1:
            time.sleep(ara)
    return round(p / n, 2), round(q / n, 2), round(pf / n, 3)


def yaz(ip, kvar, kazanc, tesis):
    SL.kimlik(ip, tesis)                      # yanlış cihaz (IP çakışması) ise yazmadan hata
    ham = int(round(kvar * kazanc))
    m = SL.Modbus(ip, 0)
    try:
        m.yaz(Q_AYAR, [(ham >> 16) & 0xFFFF, ham & 0xFFFF])
        time.sleep(1)
        return SL._coz(m.oku(Q_AYAR, 2), "I32", kazanc)
    finally:
        m.kapat()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ip", required=True)
    ap.add_argument("--tesis", required=True, choices=sorted(SL.KIMLIK))
    ap.add_argument("--fark", type=float, default=3.0, help="tabana eklenecek kVAr (en çok ±5)")
    ap.add_argument("--sure", type=float, default=10.0, help="deneme süresi (dk)")
    ap.add_argument("--kazanc", type=float, default=10.0)
    x = ap.parse_args()
    if abs(x.fark) > 5:
        sys.exit("fark en çok ±5 kVAr")
    kayit = {"ip": x.ip, "basla": datetime.now().isoformat(timespec="seconds"), "olcum": [], "sonuc": None}
    def k(ad, **v):
        v.update({"t": datetime.now().strftime("%H:%M:%S"), "adim": ad}); kayit["olcum"].append(v)
        print(f"[{v['t']}] {ad}: " + ", ".join(f"{a}={b}" for a, b in v.items() if a not in ("t", "adim")), flush=True)
    taban = None
    try:
        kim = SL.kimlik(x.ip, x.tesis)
        k("0 kimlik", tesis=x.tesis, toplam_kwh=kim["toplam_kwh"])
        p0, q0, pf0 = olc(x.ip)
        taban = q0
        k("1 ölç (taban)", p_kw=p0, q_kvar=q0, cosphi=pf0)
        if p0 < 20:
            sys.exit("Üretim çok düşük (< 20 kW): deneme gündüz, üretim varken yapılmalı.")
        try:
            geri = yaz(x.ip, taban, x.kazanc, x.tesis)
            k("2 hazırla", yazilan=taban, geri_okunan=geri)
        except Exception as e:
            k("2 hazırla", hata=str(e)[:120], not_="mod 'Çıkış yok' iken yazma kabul edilmeyebilir; mod değişince yeniden yazılacak")
        input("\n3) Şimdi SmartLogger web › Ayarlar › Güç Parametreleri › Reaktif Güç Kontrolü › 'Uzaktan iletişim programlama' seçip Gönder'e basın, sonra burada Enter... ")
        geri = yaz(x.ip, taban, x.kazanc, x.tesis)
        k("3 mod sonrası taban yazıldı", yazilan=taban, geri_okunan=geri)
        for _ in range(20):                    # 5 dk: mod değişikliği sonrası cihaz/ağ kararlı mı
            time.sleep(15)
            p, q, pf = olc(x.ip, 2, 1)
            k("3 izle", p_kw=p, q_kvar=q, cosphi=pf, hedef=taban)
        hedef = round(taban + x.fark, 1)
        input(f"\n4) Deneme: Q {taban:+.1f} → {hedef:+.1f} kVAr, {x.sure:g} dk. Başlatmak için Enter (vazgeçmek için Ctrl+C)... ")
        geri = yaz(x.ip, hedef, x.kazanc, x.tesis)
        k("4 deneme yazıldı", yazilan=hedef, geri_okunan=geri)
        t_bit, tepki = time.time() + x.sure * 60, None
        t0 = time.time()
        while time.time() < t_bit:
            time.sleep(30)
            p, q, pf = olc(x.ip, 2, 1)
            k("4 izle", p_kw=p, q_kvar=q, cosphi=pf, hedef=hedef)
            if tepki is None and abs(q - hedef) <= max(1.0, abs(x.fark) * 0.4):
                tepki = round(time.time() - t0)
            if p < p0 * 0.6:
                raise RuntimeError(f"aktif güç düştü ({p} < %60 × {p0}) — durduruluyor")
            if abs(q - hedef) > 10 and time.time() - t0 > 120:
                raise RuntimeError(f"Q hedeften çok uzak ({q} vs {hedef}) — durduruluyor")
        kayit["sonuc"] = {"tepki_sn": tepki, "isaret_dogru": tepki is not None}
    except KeyboardInterrupt:
        print("\nKullanıcı durdurdu.")
        kayit["sonuc"] = kayit["sonuc"] or {"durduruldu": True}
    except SystemExit:
        raise
    except Exception as e:
        print("HATA:", e)
        kayit["sonuc"] = {"hata": str(e)[:200]}
    finally:
        if taban is not None:
            son = time.time() + 600                     # bağlantı koparsa 10 dk boyunca yeniden dene
            while True:
                try:
                    geri = yaz(x.ip, taban, x.kazanc, x.tesis)
                    k("5 geri al", yazilan=taban, geri_okunan=geri)
                    time.sleep(60)
                    p, q, pf = olc(x.ip)
                    k("5 kontrol", p_kw=p, q_kvar=q, cosphi=pf, hedef=taban)
                    break
                except KeyboardInterrupt:
                    k("5 geri al", hata="kullanıcı geri almayı durdurdu — SmartLogger modu 'Çıkış yok' yapılmalı")
                    break
                except Exception as e:
                    k("5 geri al", hata=str(e)[:150])
                    if time.time() > son:
                        print("!! Geri alma 10 dk içinde yazılamadı: SmartLogger web › Reaktif Güç Kontrolü › 'Çıkış yok' yapın.")
                        break
                    time.sleep(10)
        kayit["bitis"] = datetime.now().isoformat(timespec="seconds")
        yol = Path.home() / ".aesun" / "kompanzasyon_deneme.json"
        yol.parent.mkdir(parents=True, exist_ok=True)
        yol.write_text(json.dumps(kayit, ensure_ascii=False, indent=1))
        try:
            from ortak import gh
            _, sha = gh("n8n/kompanzasyon_deneme.json")
            gh("n8n/kompanzasyon_deneme.json", kayit, sha, "kompanzasyon yazma denemesi")
            print("Sonuç yüklendi: epias-ptf/n8n/kompanzasyon_deneme.json")
        except Exception as e:
            print("Sonuç yerelde:", yol, "(yükleme hatası:", e, ")")
        print("\nNOT: SmartLogger modu 'Uzaktan iletişim programlama'da kaldıysa inverterler yazılan TABAN değerinde çalışır.\n"
              "Eski davranışa dönmek için modu tekrar 'Çıkış yok' yapın.")


if __name__ == "__main__":
    main()
