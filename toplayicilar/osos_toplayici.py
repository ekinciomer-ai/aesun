#!/usr/bin/env python3
"""AEMonitoring · OSOS toplayıcı (Pi / Türkiye IP'si gerekir)

Her saat xx:10'da çalışır (cron). MEDAŞ GridBox OSOS yük profilinden 5 tesisatın
dün+bugün 15 dk verisini çeker, saatlik veriş/çekiş kWh'a toplar (× çarpan) ve
GitHub'daki epias-ptf/2026_osos_endeks.json dosyasına birleştirir (panel ve n8n buradan okur)
ve n8n'deki "AEMonitoring · OSOS veri alıcı" webhook'una da gönderir.

Ayar dosyası: ~/.aesun/osos.env  (chmod 600)
    OSOS_KULLANICI=...
    OSOS_SIFRE=...
    AESUN_ANAHTAR=...            # n8n "aesun Pi anahtarı" (X-Aesun-Anahtar)
    AESUN_WEBHOOK=https://xbay.app.n8n.cloud/webhook/aesun-osos
    GITHUB_TOKEN=...             # yalnız epias-ptf, Contents: Read and write (n8n'dekiyle aynı olabilir)

Zamanlayıcı: pi/aesun-osos.timer (her saat xx:10)
Elle:  python3 osos_toplayici.py --gun 3     (son 3 günü yeniden gönderir)
"""
import argparse
import base64
import json
import os
import platform
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

BASE = "https://osos.meramedas.com.tr"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
# tesisat, kısa ad, OSOS wiringId (None = sayfadan bulunur), çarpan, 2026_osos_endeks.json anahtarı
ABONE = [
    ("80010874", "AE", "29456", 1575, "aksaray_enerji"),
    ("11116344", "T1", "138134", 1890, "tekyildiz_1"),
    ("11116968", "T2", None, 1890, "tekyildiz_2"),
    ("11111411", "Anka", "71195", 6300, "anka_mineral"),
    ("11201655", "YD", "26904", 1260, "yilmaz_darilmaz"),
    ("11200108", "A3", "11657", 3150, "aksaray_3"),
]
GH_DOSYA = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/2026_osos_endeks.json"
KOLON = ["ProfileDateTime", "ActiveEndex", "ActiveEndexDiff", "ActiveEndexOut", "ActiveEndexOutDiff", "ActiveEnergy",
         "InstantActiveDemand", "InstantActiveDemandOut", "InstantReactiveDemand", "InstantReactiveDemandOut",
         "CosL1", "CosL2", "CosL3", "FrequenceL1", "FrequenceL2", "FrequenceL3", "Voltage", "VoltageL1", "VoltageL2",
         "VoltageL3", "ReactiveCapacitiveEndex", "ReactiveCapacitiveEndexOut", "ReactiveInductiveEndex",
         "ReactiveInductiveEndexOut", "TotalReactiveEndex", "TotalReactiveEndexOut", "ActiveT0IndexDifference",
         "ActiveT0IndexExportDifference", "ReactiveIndexQ2Difference", "ReactiveIndexQ3Difference", "Id", "Meter_Id",
         "Wiring_Id"]

KLASOR = Path.home() / ".aesun"
CEREZ = KLASOR / "osos_cerez.json"
KUYRUK = KLASOR / "osos_kuyruk.json"


class OturumHatasi(Exception):
    pass


def log(*a):
    print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def ayar_oku():
    env = {}
    f = KLASOR / "osos.env"
    if f.exists():
        for satir in f.read_text(encoding="utf-8").splitlines():
            satir = satir.strip()
            if satir and not satir.startswith("#") and "=" in satir:
                k, v = satir.split("=", 1)
                env[k.strip()] = v.strip()
    for k in ("OSOS_KULLANICI", "OSOS_SIFRE", "AESUN_ANAHTAR", "AESUN_WEBHOOK", "GITHUB_TOKEN"):
        env[k] = os.environ.get(k, env.get(k, ""))
    if not env["AESUN_WEBHOOK"]:
        env["AESUN_WEBHOOK"] = "https://xbay.app.n8n.cloud/webhook/aesun-osos"
    eksik = [k for k in ("OSOS_KULLANICI", "OSOS_SIFRE") if not env[k]]
    if not env["GITHUB_TOKEN"] and not env["AESUN_ANAHTAR"]:
        eksik.append("GITHUB_TOKEN veya AESUN_ANAHTAR")
    if eksik:
        sys.exit("Eksik ayar: " + ", ".join(eksik) + f" ({f})")
    return env


def oturum_ac():
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    if CEREZ.exists():
        try:
            s.cookies.update(json.loads(CEREZ.read_text()))
        except Exception:
            pass
    return s


def cerez_kaydet(s):
    KLASOR.mkdir(parents=True, exist_ok=True)
    CEREZ.write_text(json.dumps(requests.utils.dict_from_cookiejar(s.cookies)))
    try:
        os.chmod(CEREZ, 0o600)
    except OSError:
        pass


def _formu_bul(html):
    """Şifre alanı içeren formu bulur: (action, gizli alanlar, kullanıcı alanı adı, şifre alanı adı)."""
    for fm in re.finditer(r"<form\b([^>]*)>(.*?)</form>", html, re.S | re.I):
        govde_ = fm.group(2)
        if not re.search(r'type=["\']?password', govde_, re.I):
            continue
        act = (re.search(r'action=["\']([^"\']*)', fm.group(1), re.I) or [None, ""])[1]
        gizli, kullanici, sifre = [], None, None
        for inp in re.finditer(r"<input\b[^>]*>", govde_, re.I):
            t = inp.group(0)
            ad = (re.search(r'name=["\']([^"\']+)', t, re.I) or [None, None])[1]
            tip = ((re.search(r'type=["\']?([a-z]+)', t, re.I) or [None, "text"])[1]).lower()
            if not ad:
                continue
            if tip == "password":
                sifre = ad
            elif tip in ("text", "email") and not kullanici:
                kullanici = ad
            elif tip in ("hidden", "checkbox"):
                val = (re.search(r'value=["\']([^"\']*)', t, re.I) or [None, ""])[1]
                if tip == "checkbox":
                    val = "true"
                gizli.append((ad, val))
        return act, gizli, kullanici, sifre
    return None


def giris(s, env, tani=False):
    s.cookies.clear()
    r = s.get(BASE + "/", timeout=90)
    f = _formu_bul(r.text)
    if not f:
        raise OturumHatasi(f"giriş formu bulunamadı (HTTP {r.status_code}, adres {r.url})")
    act, gizli, k_alan, s_alan = f
    if tani:
        log("Giriş sayfası:", r.url, "| form:", act or "(aynı adres)", "| kullanıcı alanı:", k_alan, "| şifre alanı:", s_alan,
            "| diğer alanlar:", ", ".join(a for a, _ in gizli))
    if not k_alan or not s_alan:
        raise OturumHatasi(f"formda kullanıcı/şifre alanı yok ({k_alan}, {s_alan})")
    hedef = requests.compat.urljoin(r.url, act) if act else r.url
    veri = gizli + [(k_alan, env["OSOS_KULLANICI"]), (s_alan, env["OSOS_SIFRE"])]
    r2 = s.post(hedef, data=veri, timeout=90, headers={"Referer": r.url, "Origin": BASE})
    k = s.get(BASE + "/WiringDashboard/Index", timeout=90, allow_redirects=False)
    basarili = k.status_code == 200 and not _formu_bul(k.text)
    if tani:
        mesaj = re.sub(r"<[^>]+>", " ", " ".join(re.findall(r'(?:validation-summary|alert|error)[^>]*>(.*?)</', r2.text, re.S | re.I)))
        log("Giriş yanıtı: HTTP", r2.status_code, "adres", r2.url, "| kontrol HTTP", k.status_code, "| başarılı:", basarili,
            "| site mesajı:", re.sub(r"\s+", " ", mesaj).strip()[:200] or "-")
    if not basarili:
        raise OturumHatasi(f"giriş başarısız (login HTTP {r2.status_code}, kontrol HTTP {k.status_code})")
    cerez_kaydet(s)
    log("OSOS girişi yapıldı")


def wiring_bul(s, tesisat):
    """Tesisat listesinden wiringId bulur (yük profili ve pano sayfalarındaki seçim kutuları)."""
    gorulen = 0
    for yol in ("/LoadProfile/Index", "/WiringDashboard/Index"):
        r = s.get(BASE + yol, timeout=90, allow_redirects=False)
        if r.status_code in (301, 302) or (r.status_code == 200 and _formu_bul(r.text)):
            raise OturumHatasi(f"{yol} giriş sayfasına yönlendi")
        for m in re.finditer(r'<option[^>]*value="(\d+)"[^>]*>([^<]*)</option>', r.text):
            gorulen += 1
            if tesisat in m.group(2):
                return m.group(1)
        m = re.search(r'"(?:id|Id|wiringId|WiringId)"\s*:\s*(\d+)[^{}]{0,200}?' + tesisat, r.text)
        if m:
            return m.group(1)
    raise RuntimeError(f"{tesisat} wiringId bulunamadı ({gorulen} seçenek tarandı); osos.env'e WID_{tesisat}=... eklenebilir")


def govde(wid, aralik):
    p = [("draw", "1")]
    for i, ad in enumerate(KOLON):
        c = f"columns[{i}]"
        ara = ad in ("ProfileDateTime", "Meter_Id", "Wiring_Id")
        deger = aralik if ad == "ProfileDateTime" else (wid if ad == "Wiring_Id" else "")
        p += [(c + "[data]", ad[0].lower() + ad[1:]), (c + "[name]", ad), (c + "[searchable]", "true" if ara else "false"),
              (c + "[orderable]", "true"), (c + "[search][value]", deger), (c + "[search][regex]", "false")]
    p += [("order[0][column]", "0"), ("order[0][dir]", "asc"), ("start", "0"), ("length", "2000"),
          ("search[value]", ""), ("search[regex]", "false"), ("myKey", "myValue")]
    return p


def sayi(v):
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(".", "").replace(",", "."))
    except ValueError:
        return None


def yuk_profili(s, wid, aralik):
    r = s.post(BASE + "/LoadProfile/ModelDatas", data=govde(wid, aralik), timeout=180, allow_redirects=False,
               headers={"X-Requested-With": "XMLHttpRequest", "Referer": BASE + "/LoadProfile/Index", "Origin": BASE,
                        "Accept": "application/json, text/javascript, */*; q=0.01"})
    if 300 <= r.status_code < 400:
        raise OturumHatasi(f"yönlendirme {r.status_code}")
    try:
        j = r.json()
    except ValueError:
        if r.status_code == 200 or r.status_code >= 500:
            raise OturumHatasi(f"JSON yerine sayfa döndü (HTTP {r.status_code})")
        raise RuntimeError(f"HTTP {r.status_code}")
    if not isinstance(j.get("data"), list):
        raise RuntimeError("beklenmeyen yanıt")
    return j["data"]


def topla(tesisat, kod, carpan, data, simdi, wid=None):
    saat = {}
    for x in data:
        if str(x.get("wiring_Id")) not in (tesisat, str(wid)):
            raise RuntimeError(f"tesisat eşleşmedi: beklenen {tesisat}, gelen {x.get('wiring_Id')}")
        dt = str(x.get("profileDateTime") or "")
        if len(dt) < 13:
            continue
        k = (dt[:10], int(dt[11:13]))
        ce = sayi(x.get("activeT0IndexDifference"))
        if ce is None:
            ce = sayi(x.get("activeEndexDiff")) or 0
        ve = sayi(x.get("activeT0IndexExportDifference"))
        if ve is None:
            ve = sayi(x.get("activeEndexOutDiff")) or 0
        a = saat.setdefault(k, [0.0, 0.0, 0])
        a[0] += ce
        a[1] += ve
        a[2] += 1
    return [{"tesisat": tesisat, "kod": kod, "tarih": t, "saat": h,
             "veris_kwh": round(v * carpan, 2), "cekis_kwh": round(c * carpan, 2), "aralik": n, "guncellendi": simdi}
            for (t, h), (c, v, n) in sorted(saat.items())]


def github_yaz(env, satirlar):
    """Tamamlanmış saatleri 2026_osos_endeks.json'a birleştirir. Diğer günlere/abonelere dokunmaz."""
    if not env["GITHUB_TOKEN"] or not satirlar:
        return
    h = {"Authorization": "Bearer " + env["GITHUB_TOKEN"], "Accept": "application/vnd.github+json"}
    anahtar = {a[0]: a for a in ABONE}
    for deneme in range(3):
        r = requests.get(GH_DOSYA, headers=h, timeout=60)
        r.raise_for_status()
        meta = r.json()
        icerik = meta.get("content")
        if not icerik:  # 1 MB üstü dosyalarda içerik ayrı gelir
            icerik = requests.get(GH_DOSYA, headers={**h, "Accept": "application/vnd.github.raw+json"}, timeout=120).text
            data = json.loads(icerik)
        else:
            data = json.loads(base64.b64decode(icerik).decode("utf-8"))
        degisen = 0
        for x in satirlar:
            if x["aralik"] < 4:  # saat tamamlanmadı
                continue
            tes, kod, _, carpan, key = anahtar[x["tesisat"]]
            ab = data.setdefault(key, {"tesisat_no": tes, "carpan": float(carpan), "veri": {}})
            gun = ab.setdefault("veri", {}).setdefault(x["tarih"], {})
            yeni = {"cekis": x["cekis_kwh"], "veris": x["veris_kwh"]}
            s_ = f'{x["saat"]:02d}'
            if gun.get(s_) != yeni:
                gun[s_] = yeni
                degisen += 1
            ab["gun_sayisi"] = len(ab["veri"])
            ab["son_guncelleme"] = x["guncellendi"]
        if not degisen:
            log("GitHub: yeni saat yok")
            return
        govde_ = {"message": f"OSOS Pi {datetime.now():%Y-%m-%d %H:%M} ({degisen} saat)",
                  "content": base64.b64encode(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()).decode(),
                  "sha": meta["sha"]}
        w = requests.put(GH_DOSYA, headers=h, json=govde_, timeout=120)
        if w.status_code in (409, 422) and deneme < 2:  # arada başka yazım olduysa yeniden oku
            time.sleep(3)
            continue
        w.raise_for_status()
        log(f"GitHub: {degisen} saat yazıldı")
        return


def gonder(env, yuk):
    if not env["AESUN_ANAHTAR"]:
        return
    kuyruk = []
    if KUYRUK.exists():
        try:
            kuyruk = json.loads(KUYRUK.read_text())
        except Exception:
            kuyruk = []
    kuyruk.append(yuk)
    kalan = []
    for p in kuyruk[-48:]:
        try:
            r = requests.post(env["AESUN_WEBHOOK"], json=p, timeout=60,
                              headers={"X-Aesun-Anahtar": env["AESUN_ANAHTAR"]})
            r.raise_for_status()
            log("n8n'e gönderildi:", r.text[:200])
        except Exception as e:
            log("n8n'e gönderilemedi, kuyrukta:", e)
            kalan.append(p)
    KLASOR.mkdir(parents=True, exist_ok=True)
    KUYRUK.write_text(json.dumps(kalan))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gun", type=int, default=1, help="kaç gün geriye (varsayılan 1 = dün+bugün)")
    ap.add_argument("--tani", action="store_true", help="yalnız girişi dener ve form alanlarını yazar (şifre yazılmaz)")
    args = ap.parse_args()
    env = ayar_oku()
    bugun = datetime.now()
    aralik = (bugun - timedelta(days=args.gun)).strftime("%d.%m.%Y") + " - " + bugun.strftime("%d.%m.%Y")
    simdi = datetime.now().astimezone().isoformat(timespec="seconds")
    s = oturum_ac()
    satirlar, hatalar, girildi = [], [], False
    if args.tani or not CEREZ.exists():
        try:
            giris(s, env, tani=args.tani)
            girildi = True
        except Exception as e:
            log("GIRIS:", e)
            if args.tani:
                return
            gonder(env, {"kaynak": "osos", "cihaz": platform.node(), "ts": simdi, "durum": "hata", "hata_mesaji": f"GIRIS: {e}"[:300], "satirlar": []})
            return
    for tesisat, kod, wid, carpan, _ in ABONE:
        for deneme in range(2):
            try:
                if not wid:
                    wid = env.get("WID_" + tesisat) or os.environ.get("WID_" + tesisat) or wiring_bul(s, tesisat)
                    log(f"{kod} wiringId: {wid}")
                satirlar += topla(tesisat, kod, carpan, yuk_profili(s, wid, aralik), simdi, wid)
                break
            except OturumHatasi as e:
                if girildi or deneme:
                    hatalar.append(f"GIRIS: {kod}: {e}")
                    break
                log("Oturum düşmüş:", e)
                try:
                    giris(s, env)
                    girildi = True
                except Exception as g:
                    hatalar.append(f"GIRIS: {g}")
                    break
            except Exception as e:
                hatalar.append(f"{kod}: {e}")
                break
        if hatalar and hatalar[-1].startswith("GIRIS"):
            break
        time.sleep(1)
    cerez_kaydet(s)
    log(f"{len(satirlar)} saatlik satır, {len(hatalar)} hata", "; ".join(hatalar))
    try:
        github_yaz(env, satirlar)
    except Exception as e:
        log("GitHub'a yazılamadı:", e)
        hatalar.append(f"GITHUB: {e}")
    gonder(env, {"kaynak": "osos", "cihaz": platform.node(), "ts": simdi, "aralik": aralik,
                 "durum": "hata" if hatalar else "ok", "hata_mesaji": "; ".join(hatalar)[:300],
                 "giris_yapildi": girildi, "satirlar": satirlar})


if __name__ == "__main__":
    main()
