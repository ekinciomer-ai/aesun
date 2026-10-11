"""AEMonitoring · Firmware (cihaz_detay.py içinden, 5 dk'da bir çağrılır).

1) Keşif (salt okuma): firmware dosyasını indirip MD5 doğrular; cihaz arayüzünün JS/HTML'inden yükseltme uç noktasını
   (…upgrade….cgi) ve dosya alanının adını çıkarır → n8n/firmware_kesif.json
2) Yükseltme (yalnız epias-ptf n8n/firmware_gorev.json "onay": true ise): "sira" listesindeki cihazlar TEK TEK.
   Her cihaz: bekliyor → yuklendi → (yeni sürüm okundu) uyandirildi → izleniyor (izle_dk) → bitti (uyutulur).
   Başarı ölçütü: sürüm değişti ve izlemede hash > 250 TH/s. Başarısızsa (ya da 30 dk yanıt yoksa) TÜM sıra durur.
   Otomatik tekrar yok. Koşullar: cihaz uykuda, model S21e Hyd, MD5 doğru, uç "upgrade" içeriyor ve
   clear/reset/factory içermiyor, en_erken geçmiş. İşlemdeki cihaza cihaz yönetimi dokunmaz (pilot_haric()).
   Durum ~/.aesun/firmware_pilot.json · rapor n8n/firmware_pilot.json
"""
import hashlib, json, re, uuid
from datetime import datetime, timedelta

from ortak import AESUN, TR, gh, log
import madenci as M

KESIF, GOREV, RAPOR = "n8n/firmware_kesif.json", "n8n/firmware_gorev.json", "n8n/firmware_pilot.json"
GECMIS = "n8n/firmware_gecmis.json"
KESIF_V = 5
FW = {"S21e Hyd": {"url": "https://raw.githubusercontent.com/ekinciomer-ai/aesun/firmware/S21eHyd_FR-1.42_251016.bmu",
                   "md5": "684efb616a07f67730a423c773a5881c", "ad": "S21eHyd_FR-1.42_251016.bmu"}}
FW_DIR = AESUN / "firmware"
PILOT = AESUN / "firmware_pilot.json"
BASARI_TH = 250


def indir(m):
    f = FW[m]
    FW_DIR.mkdir(parents=True, exist_ok=True)
    yol = FW_DIR / f["ad"]
    if not yol.exists() or hashlib.md5(yol.read_bytes()).hexdigest() != f["md5"]:
        r = M.requests.get(f["url"], timeout=300)
        r.raise_for_status()
        yol.write_bytes(r.content)
    md5 = hashlib.md5(yol.read_bytes()).hexdigest()
    return yol, yol.stat().st_size, md5, md5 == f["md5"]


def _get(ip, p):
    try:
        r = M.requests.get(f"http://{ip}{p}", auth=M.filo_auth(), timeout=15)
        return r.status_code, r.text
    except Exception as e:
        return -1, str(e)[:80]


def arayuz_kesif(ip):
    """Web arayüzünü salt GET ile tarar; yükseltme uç noktası ve dosya alanı adayları."""
    out = {"sayfalar": {}, "upgrade_cgi": [], "parca": [], "js_ipucu": [], "dizgiler": []}
    metin = {}
    kuyruk, gorulen = ["/", "/views/upgrade.html", "/html/upgrade.html", "/pages/upgrade.html", "/upgrade/index.html",
                      "/views/firmware.html", "/firmware.html", "/system.html", "/views/system.html"], set()
    while kuyruk and len(gorulen) < 40:
        p = kuyruk.pop(0)
        if p in gorulen:
            continue
        gorulen.add(p)
        k, t = _get(ip, p)
        out["sayfalar"][p] = [k, len(t)]
        if k != 200:
            continue
        metin[p] = t
        for i_ in re.findall(r'data-id=["\']([A-Za-z0-9_-]+)["\']', t):     # menü: loadInner(id) → "/<id>.html"
            c = "/" + i_ + ".html"
            if c not in gorulen and c not in kuyruk:
                kuyruk.insert(0, c)
        for s in re.findall(r'["\']([A-Za-z0-9_./-]+\.(?:js|html))["\']', t):
            if "min.js" in s or "jquery" in s or "vue" in s:
                continue
            s2 = s if s.startswith("/") else "/" + s.lstrip("./")
            for c in (s2, "/views" + s2, "/html" + s2, "/pages" + s2):
                if c not in gorulen and c not in kuyruk and len(kuyruk) < 60:
                    kuyruk.append(c)
    out["kaynak"] = {p: t for p, t in metin.items() if re.search(r"/(update|upgrade)[^/]*\.(js|html)$", p)}   # yükleme kodu (salt okuma, inceleme için)
    for p, t in metin.items():
        if p.endswith(".js"):
            for m in re.finditer(r"loadInner|\.load\(|\.html|upgrade|cgi-bin", t, re.I):
                if len(out["js_ipucu"]) < 60:
                    out["js_ipucu"].append([p, t[max(0, m.start() - 250): m.end() + 250]])
            out["dizgiler"] = sorted(set(out["dizgiler"]) | set(s_ for s_ in re.findall(r"[\"']([^\"'\s]{3,80})[\"']", t)
                                                                 if "/" in s_ or "." in s_ or "upgrade" in s_.lower()))[:400]
        for m in re.finditer(r"/?cgi-bin/[A-Za-z0-9_]*upgrade[A-Za-z0-9_]*\.cgi", t, re.I):
            c = "/" + m.group(0).lstrip("/")
            cevre = t[max(0, m.start() - 700): m.end() + 700]
            alanlar = re.findall(r'\.append\(\s*["\']([A-Za-z0-9_]+)["\']', cevre)
            out["upgrade_cgi"].append({"sayfa": p, "cgi": c, "alanlar": alanlar})
            out["parca"].append([p, cevre[:1400]])
        if p.endswith(".html"):
            for m in re.finditer(r"upgrade|keep|\.bmu|FormData", t, re.I):
                if len(out["parca"]) < 30:
                    out["parca"].append([p, t[max(0, m.start() - 200): m.end() + 200]])
    return out


def bmu_parca(veri, miner_type, subtype):
    """Bitmain .bmu kapsayıcısından cihaza uyan alt imaj (arayüzün update.js'i ile birebir):
    başlık 9×uint32 LE (magic 0xabababab, …, ItemCount, ItemSize, DataOffset, Crc32); CRC32 = başlık (crc alanı sıfır) + geri kalan.
    Öğe: ad/çip/kontrol kartı/model uzunlukları (4 bayt), ad[64], çip[32], kart[32], model[32], DataOffset, DataSize.
    Eşleşme: MinerModel == miner_type ve CtrlBoardModel == subtype. Dönüş: (bayt, bilgi) ya da (None, neden)."""
    import struct, zlib
    if len(veri) < 36:
        return None, "dosya çok kısa"
    magic, _, _, adet, boy, _, crc, _, _ = struct.unpack("<9I", veri[:36])
    if magic != 0xABABABAB:
        return None, "kapsayıcı değil (magic)"
    bas = bytearray(veri[:36]); bas[24:28] = b"\0\0\0\0"
    if zlib.crc32(bytes(bas) + veri[36:]) != crc:
        return None, "kapsayıcı CRC tutmadı"
    for g in range(adet):
        it = veri[36 + g * boy: 36 + (g + 1) * boy]
        oku = lambda a, b, l: it[a:b][:l].decode("latin1")
        kart, model = oku(100, 132, it[2]), oku(132, 164, it[3])
        ofs, uz = struct.unpack("<2I", it[164:172])
        if (model == miner_type or miner_type == "Antminer BHB42XXX") and kart == subtype:
            if ofs + uz > len(veri):
                return None, "alt imaj dosya dışına taşıyor"
            return veri[ofs: ofs + uz], {"kart": kart, "model": model, "ofs": ofs, "boyut": uz}
    return None, f"eşleşen alt imaj yok (miner_type={miner_type}, subtype={subtype})"


def uc_sec(kesif):
    """((cgi, alan, diger_alanlar), "tamam") ya da (None, neden). Ayarı silen uç (clear/reset) seçilmez."""
    # Bitmain arayüzü (update.*.js): "ayarları koru" işaretliyken /cgi-bin/upgrade.cgi, değilse upgrade_clear.cgi;
    # dosya FormData'ya append("firmware", Blob) ile eklenir. Ayarı silen uç asla seçilmez.
    kaynak = " ".join(((kesif or {}).get("kaynak") or {}).values())
    if "/cgi-bin/upgrade.cgi" in kaynak and re.search(r'append\(\s*["\']firmware["\']', kaynak):
        return ("/cgi-bin/upgrade.cgi", "firmware", []), "tamam"
    aday = [u for u in (kesif or {}).get("upgrade_cgi") or [] if not re.search(r"clear|reset|factory", u["cgi"], re.I)]
    if not aday:
        return None, "yükseltme uç noktası bulunamadı"
    cgis = sorted({u["cgi"] for u in aday})
    if len(cgis) > 1:
        return None, "birden fazla aday uç: " + ", ".join(cgis)
    alan = sorted({a for u in aday for a in u["alanlar"]})
    dosya_alan = [a for a in alan if a.lower() in ("firmware", "datafile", "file", "upfile", "upgradefile")]
    if len(dosya_alan) != 1:
        return None, "dosya alanı belirsiz: " + ", ".join(alan)
    return (cgis[0], dosya_alan[0], [a for a in alan if a != dosya_alan[0]]), "tamam"


# ---------------------------------------------------------------- yükseltme
def pilot_oku():
    try:
        return json.loads(PILOT.read_text()) if PILOT.exists() else {}
    except Exception:
        return {}


def pilot_yaz(p):
    PILOT.parent.mkdir(parents=True, exist_ok=True)
    PILOT.write_text(json.dumps(p, ensure_ascii=False, indent=1))


def pilot_haric(simdi=None):
    """Cihaz yönetiminin şu an dokunmayacağı cihaz (suffix) ya da None."""
    p = pilot_oku()
    c = p.get("cihaz") or {}
    if p.get("durdu") or not c or c.get("asama") in (None, "bekliyor", "bitti"):
        return None
    return c.get("suffix")


def _komut(eylem, hedef, neden):
    kom, sha = gh("antminer_commands.json")
    kom = kom or {"commands": []}
    cmd = {"id": str(uuid.uuid4())[:8], "action": eylem, "targets": [hedef], "delay_sec": 0, "sort_by": None,
           "issued_at": datetime.now().isoformat(), "issued_by": "firmware yükseltme"}
    kom["commands"] = (kom.get("commands") or [])[-49:] + [cmd]
    kom["updated_at"] = cmd["issued_at"]
    gh("antminer_commands.json", kom, sha, f"firmware {eylem} .{hedef}: {neden}")
    return cmd["id"]


def _rapor(p, simdi):
    _, sha = gh(RAPOR)
    gh(RAPOR, {**p, "guncellendi": simdi.isoformat(timespec="seconds")}, sha,
       f"Firmware .{(p.get('cihaz') or {}).get('suffix')} {(p.get('cihaz') or {}).get('asama')}")


def pilot_adim(sonuc, simdi, kesif):
    gorev, _ = gh(GOREV)
    if not gorev or not gorev.get("onay"):
        return
    p = pilot_oku()
    if p.get("gorev_id") != gorev.get("id"):
        p = {"gorev_id": gorev.get("id"), "tamam": [], "olaylar": []}
    if p.get("durdu"):
        return
    now = simdi.isoformat(timespec="seconds")

    def olay(m):
        p["olaylar"] = (p.get("olaylar") or [])[-150:] + [[now, m]]
        log("firmware:", m)

    c = p.get("cihaz")
    if not c or c.get("asama") == "bitti":
        kalan = [int(s) for s in gorev.get("sira") or [] if int(s) not in p["tamam"]]
        if not kalan:
            if not p.get("bitti_bildirildi"):
                p["bitti_bildirildi"] = True; olay("sıradaki tüm cihazlar tamamlandı"); pilot_yaz(p); _rapor(p, simdi)
            return
        c = p["cihaz"] = {"suffix": kalan[0], "ip": f"192.168.0.{kalan[0]}", "asama": "bekliyor"}
    suf, ip = c["suffix"], c["ip"]
    o = next((x for x in sonuc if x.get("ip") == ip), None)

    if c["asama"] == "bekliyor":
        if simdi < datetime.fromisoformat(gorev.get("en_erken", "2000-01-01T00:00:00+03:00")):
            return
        if not o:
            return
        if not o.get("uyku") and not gorev.get("calisirken_izin"):
            c["bekleme"] = "cihaz uykuda değil"; pilot_yaz(p); return
        sec, neden = uc_sec((kesif or {}).get("arayuz"))
        md5_ok = (kesif or {}).get("md5_dogru")
        if not sec:
            if c.get("bekleme") != neden:
                c["bekleme"] = neden; olay(f".{suf} bekliyor: {neden} (cihaza dokunulmadı)"); pilot_yaz(p); _rapor(p, simdi)
            return
        k_, si = M.cgi(ip, "get_system_info.cgi", timeout=10)          # uykuda da yanıt verir
        tip = (si or {}).get("minertype") if k_ == 200 and isinstance(si, dict) else None
        if not md5_ok or "S21e Hyd" not in str(tip or ""):
            p["durdu"] = True; olay(f"DURDU .{suf}: md5={md5_ok}, model={tip}"); pilot_yaz(p); _rapor(p, simdi); return
        cgi, alan, _ = sec
        yol, _, _, ok = indir("S21e Hyd")
        if not ok:
            p["durdu"] = True; olay("DURDU: dosya MD5 tutmadı"); pilot_yaz(p); _rapor(p, simdi); return
        k3, mt = M.cgi(ip, "miner_type.cgi", timeout=10)
        mt = mt if k3 == 200 and isinstance(mt, dict) else {}
        veri, bilgi = bmu_parca(yol.read_bytes(), mt.get("miner_type"), mt.get("subtype"))
        if veri is None:
            p["durdu"] = True; olay(f"DURDU .{suf}: {bilgi} — yükleme yapılmadı"); pilot_yaz(p); _rapor(p, simdi); return
        c["miner_type"], c["parca"] = mt, bilgi
        eski = (si or {}).get("system_filesystem_version") or (si or {}).get("firmware_version")
        if not eski:
            if c.get("bekleme") != "sürüm okunamadı":
                c["bekleme"] = "sürüm okunamadı"; olay(f".{suf} bekliyor: mevcut sürüm okunamadı"); pilot_yaz(p)
            return
        c.update(asama="yukleniyor", eski_fw=eski, uc=cgi, alan=alan, t_yukleme=now, sistem_once=si)
        olay(f".{suf} yükleme başlıyor: {cgi} alan={alan}")
        pilot_yaz(p); _rapor(p, simdi)
        try:
            r = M.requests.post(f"http://{ip}{cgi}", auth=M.filo_auth(),
                                files={alan: ("blob", veri, "application/octet-stream")}, timeout=600)
            c["yukleme_yanit"] = [r.status_code, r.text[:300]]
            olay(f".{suf} yükleme yanıtı {r.status_code}: {r.text[:120]!r}")
            try:
                stats = (r.json() or {}).get("stats")
            except Exception:
                stats = None
            if r.status_code == 200 and stats not in (None, "success"):
                p["durdu"] = True; olay(f"DURDU .{suf}: cihaz yüklemeyi kabul etmedi (stats={stats}), eski sürümde kalır")
                pilot_yaz(p); _rapor(p, simdi); return
            if r.status_code in (401, 403, 404, 405):
                p["durdu"] = True; olay(f"DURDU .{suf}: yükleme reddedildi ({r.status_code}), cihaz eski sürümde kalır")
                pilot_yaz(p); _rapor(p, simdi); return
        except Exception as e:
            c["yukleme_yanit"] = [-1, str(e)[:200]]
            olay(f".{suf} yükleme isteği kesildi (cihaz yeniden başlıyor olabilir): {e}")
        c["asama"] = "yuklendi"
        pilot_yaz(p); _rapor(p, simdi)
        return

    if c["asama"] in ("yukleniyor", "yuklendi"):
        t0 = datetime.fromisoformat(c["t_yukleme"])
        if simdi - t0 < timedelta(minutes=3):
            return
        k, si2 = M.cgi(ip, "get_system_info.cgi", timeout=10)
        fw = ((si2 or {}).get("system_filesystem_version") or (si2 or {}).get("firmware_version")) if k == 200 and isinstance(si2, dict) else None
        if fw:
            c["sistem_sonra"] = si2
        if fw and fw == c.get("eski_fw"):
            if simdi - t0 > timedelta(minutes=15):
                p["durdu"] = True
                olay(f"DURDU .{suf}: 15 dk sonra hâlâ eski sürüm {fw} — yükleme uygulanmadı, cihaz eski sürümle çalışır")
                c["asama"] = "bitti"; p["tamam"].append(suf)
            pilot_yaz(p); _rapor(p, simdi)
            return
        if fw:
            c.update(yeni_fw=fw, t_acilis=now)
            olay(f".{suf} yanıt veriyor, sürüm {fw} (önce {c.get('eski_fw')})")
            cid = _komut("wake", suf, "yükseltme sonrası izleme")
            c.update(asama="uyandirildi", t_uyandir=now, wake_id=cid)
            olay(f".{suf} uyandırıldı, {gorev.get('izle_dk', 20)} dk izlenecek")
        elif simdi - t0 > timedelta(minutes=30):
            p["durdu"] = True
            olay(f"DURDU .{suf}: yüklemeden 30 dk sonra yanıt yok — sahada kontrol gerekebilir")
        pilot_yaz(p); _rapor(p, simdi)
        return

    if c["asama"] in ("uyandirildi", "izleniyor"):
        s = o or {}
        c.setdefault("olcumler", []).append({"t": now, "uyku": s.get("uyku"), "hash_th": s.get("hash_th"), "fw": s.get("fw"),
                                             "watt": (s.get("diger") or {}).get("watt"), "jt": (s.get("diger") or {}).get("jt"),
                                             "kart_hiz": [k_.get("hiz") for k_ in s.get("kart") or []],
                                             "t_pcb": [k_.get("t_pcb") for k_ in s.get("kart") or []], "diger": s.get("diger")})
        if c["asama"] == "uyandirildi" and (s.get("hash_th") or 0) > 1:
            c.update(asama="izleniyor", t_hash=now); olay(f".{suf} hash başladı: {s.get('hash_th')} TH/s")
        sure_doldu = bool(c.get("t_hash")) and simdi - datetime.fromisoformat(c["t_hash"]) >= timedelta(minutes=int(gorev.get("izle_dk", 20)))
        zaman_asimi = simdi - datetime.fromisoformat(c["t_uyandir"]) > timedelta(minutes=60)
        if sure_doldu or zaman_asimi:
            en_hash = max([x.get("hash_th") or 0 for x in c["olcumler"]] or [0])
            watt = next((x["watt"] for x in reversed(c["olcumler"]) if x.get("watt")), None)
            basarili = c.get("yeni_fw") and c.get("yeni_fw") != c.get("eski_fw") and en_hash > BASARI_TH
            c.update(en_hash=en_hash, watt=watt, basarili=bool(basarili))
            if gorev.get("bitince_uyut", True):
                _komut("sleep", suf, "izleme bitti")
            c["asama"] = "bitti"
            p["tamam"].append(suf)
            try:                                                   # kalıcı geçmiş: panel cihaz kartı buradan okur
                fg, fsha = gh(GECMIS)
                fg = fg or {}
                fg.setdefault(str(suf), []).append({"t": c.get("t_acilis") or now, "eski": c.get("eski_fw"), "yeni": c.get("yeni_fw"),
                                                    "basarili": bool(basarili), "en_hash": en_hash, "watt": watt})
                gh(GECMIS, fg, fsha, f"Firmware geçmişi .{suf}")
            except Exception as e:
                log("firmware geçmişi yazılamadı:", e)
            p.setdefault("sonuclar", []).append({k_: c.get(k_) for k_ in ("suffix", "eski_fw", "yeni_fw", "en_hash", "watt", "basarili")})
            olay(f".{suf} bitti: sürüm {c.get('eski_fw')}→{c.get('yeni_fw')}, en yüksek hash {en_hash}, watt {watt}"
                 + ("" if basarili else " — BAŞARISIZ, sıra durduruldu"))
            if not basarili:
                p["durdu"] = True
        pilot_yaz(p); _rapor(p, simdi)


def calis(sonuc, simdi):
    eski, sha = gh(KESIF)
    if not (eski and eski.get("v") == KESIF_V and eski.get("gun") == simdi.strftime("%Y-%m-%d") and eski.get("md5_dogru")):
        # arayüz filo genelinde aynı; gece cihazlar uykuda (model/tip okunamaz) → ayarı okunabilen herhangi bir cihaz
        s21 = [o for o in sonuc if "S21e Hyd" in str(o.get("tip") or o.get("model"))] or [o for o in sonuc if o.get("ayar_kod") == 200]
        if s21:
            o = s21[0]
            v = {"v": KESIF_V, "gun": simdi.strftime("%Y-%m-%d"), "zaman": simdi.isoformat(timespec="seconds"), "ip": o["ip"], "fw_su_an": o.get("fw")}
            try:
                yol, v["boyut"], v["md5"], v["md5_dogru"] = indir("S21e Hyd")
                v["dosya"] = str(yol)
            except Exception as e:
                v["indirme_hata"] = str(e)[:200]
            try:
                v["arayuz"] = arayuz_kesif(o["ip"])
                sec, neden = uc_sec(v["arayuz"])
                v["secim"] = {"uc": sec[0], "alan": sec[1], "diger_alan": sec[2]} if sec else None
                v["secim_neden"] = neden
            except Exception as e:
                v["arayuz_hata"] = str(e)[:200]
            gh(KESIF, v, sha, "Firmware keşfi " + simdi.strftime("%H:%M"))
            log("firmware keşfi:", v.get("md5_dogru"), v.get("secim_neden"))
            eski = v
    try:
        pilot_adim(sonuc, simdi, eski)
    except Exception as e:
        log("firmware hatası:", e)
