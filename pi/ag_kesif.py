#!/usr/bin/env python3
"""Ağ keşfi (YALNIZ OKUMA): seralardaki veri toplayıcı (SmartLogger), inverter, sayaç/analizör gibi cihazları arar.

Pi'nin bulunduğu alt ağ ve anten/köprü arkasında olabilecek yaygın alt ağlarda şu kapıları dener:
  502 Modbus TCP · 6607 Huawei (SUN2000/SmartLogger) · 80/443 web · 8080 · 161 yok (UDP)
Açık bulunan adreslerin web başlığı ve MAC üreticisi (ARP) yazılır. Hiçbir cihaza yazma/komut gönderilmez.
Çıktı: epias-ptf/n8n/ag_kesif.json. cihaz_yonetimi.py sürüm işareti yoksa bir kez çalıştırır; elle: python3 ~/aesun/pi/ag_kesif.py
"""
import ipaddress, json, re, socket, ssl, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import TR, gh, log  # noqa: E402

SURUM = 2
KAPILAR = [502, 6607, 80, 443, 8080, 8443, 16100, 2404, 1502, 503]
ADAY_AGLAR = ["192.168.0.0/24", "192.168.1.0/24", "192.168.2.0/24", "192.168.8.0/24", "192.168.10.0/24",
              "192.168.100.0/24", "192.168.200.0/24", "192.168.88.0/24", "10.0.0.0/24", "10.10.10.0/24", "172.16.0.0/24"]
# yaygın üretici MAC önekleri (ilk 3 bayt)
UREtici = {"00:E0:FC": "Huawei", "20:F3:A3": "Huawei", "48:46:FB": "Huawei", "AC:E2:15": "Huawei", "E0:24:7F": "Huawei",
           "28:41:C6": "Huawei", "B4:15:13": "Huawei", "70:7B:E8": "Huawei", "00:25:9E": "Huawei", "F4:4C:7F": "Huawei",
           "30:16:9D": "Huawei/router", "B0:7E:11": "Sungrow?", "00:0E:C6": "Janitza?", "00:50:C2": "IEEE (endüstriyel)",
           "00:80:A3": "Lantronix (RS485-Eth)", "D8:B0:4C": "Mikrotik?", "48:8F:5A": "MikroTik", "64:D1:54": "MikroTik",
           "4C:5E:0C": "MikroTik", "74:4D:28": "MikroTik", "18:E8:29": "Ubiquiti", "24:5A:4C": "Ubiquiti", "78:8A:20": "Ubiquiti",
           "F0:9F:C2": "Ubiquiti", "FC:EC:DA": "Ubiquiti", "60:22:32": "Ubiquiti", "74:83:C2": "Ubiquiti", "E0:63:DA": "Ubiquiti",
           "C4:6E:1F": "TP-Link", "50:C7:BF": "TP-Link", "98:DA:C4": "TP-Link", "F4:F2:6D": "TP-Link", "84:16:F9": "TP-Link"}


def acik(ip, p, t=0.35):
    try:
        with socket.create_connection((str(ip), p), timeout=t):
            return True
    except OSError:
        return False


def baslik(ip, p):
    url = ("https" if p in (443, 8443) else "http") + f"://{ip}:{p}/"
    try:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=3, context=ctx) as r:
            g = r.read(20000).decode("utf-8", "ignore")
            m = re.search(r"<title[^>]*>(.*?)</title>", g, re.S | re.I)
            return ((m.group(1).strip() if m else "") or r.headers.get("Server") or "")[:80]
    except Exception as e:
        return "hata: " + str(e)[:50]


def tanit(ip):
    """443'te sertifika konusu/yayıncısı ve sayfa içeriğinden üretici ipucu (SmartLogger vb.)."""
    out = {}
    try:
        der = ssl.get_server_certificate((ip, 443), timeout=4)
        r = subprocess.run(["openssl", "x509", "-noout", "-subject", "-issuer"], input=der, capture_output=True, text=True, timeout=5)
        out["sertifika"] = " | ".join(x.strip() for x in r.stdout.splitlines())[:200]
    except Exception as e:
        out["sertifika"] = "hata: " + str(e)[:60]
    for yol in ("/", "/index.html", "/action/GetLoginInfo"):
        try:
            ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(urllib.request.Request(f"https://{ip}{yol}", headers={"User-Agent": "Mozilla/5.0"}), timeout=4, context=ctx) as r:
                g = r.read(30000).decode("utf-8", "ignore").lower()
            ip_ = [k for k in ("smartlogger", "huawei", "sun2000", "fusionsolar", "netcol", "hikvision", "dahua", "mikrotik", "ubnt", "ubiquiti", "zte", "tp-link", "sungrow", "janitza") if k in g]
            if ip_:
                out["ipucu"] = ip_; break
        except Exception:
            continue
    return out


def arp():
    out = {}
    try:
        for s in Path("/proc/net/arp").read_text().splitlines()[1:]:
            a = s.split()
            if len(a) >= 4 and a[3] != "00:00:00:00:00:00":
                out[a[0]] = a[3].upper()
    except Exception:
        pass
    return out


def main():
    bas = time.time()
    sonuc = {"surum": SURUM, "zaman": None, "yerel": {}, "aglar": {}, "cihazlar": []}
    try:
        sonuc["yerel"]["ip"] = subprocess.run(["hostname", "-I"], capture_output=True, text=True).stdout.split()
        sonuc["yerel"]["yol"] = subprocess.run(["ip", "route"], capture_output=True, text=True).stdout.strip().splitlines()[:8]
        sonuc["yerel"]["iz"] = subprocess.run(["traceroute", "-n", "-m", "4", "-w", "1", "1.1.1.1"], capture_output=True, text=True, timeout=25).stdout.strip().splitlines()[1:5]
    except Exception as e:
        sonuc["yerel"]["hata"] = str(e)[:100]
    try:
        with urllib.request.urlopen("https://api.ipify.org", timeout=8) as r:
            sonuc["yerel"]["dis_ip"] = r.read().decode().strip()
    except Exception as e:
        sonuc["yerel"]["dis_ip"] = "hata: " + str(e)[:40]
    hedef = []
    for ag in ADAY_AGLAR:
        n = ipaddress.ip_network(ag)
        # önce ağ geçidi adaylarına bak: hiç yanıt yoksa ağı atla (hızlı)
        gw = [n.network_address + 1, n.network_address + 254, n.network_address + 10]
        canli = any(acik(g, p, 0.5) for g in gw for p in (80, 443, 502, 22, 53))
        yerelde = any(ipaddress.ip_address(x) in n for x in sonuc["yerel"].get("ip", []) if ":" not in x)
        sonuc["aglar"][ag] = "yerel" if yerelde else ("yanıt var" if canli else "yanıt yok")
        if yerelde or canli:
            hedef += [(h, p) for h in n.hosts() for p in KAPILAR]
    with ThreadPoolExecutor(max_workers=96) as ex:
        bulunan = [hp for hp, ok in zip(hedef, ex.map(lambda hp: acik(*hp), hedef)) if ok]
    cihaz = {}
    for h, p in bulunan:
        cihaz.setdefault(str(h), []).append(p)
    A = arp()
    madenci = set()
    try:
        m, _ = gh("n8n/ag_tarama.json")
        madenci = {x.get("ip") for x in (m or {}).get("madenciler", [])}
    except Exception:
        pass
    for ip, ps in sorted(cihaz.items(), key=lambda x: ipaddress.ip_address(x[0])):
        if ip in madenci and 502 not in ps and 6607 not in ps:
            continue                                    # bilinen madenciler (yalnız web) listeyi kalabalıklaştırmasın
        mac = A.get(ip, "")
        d = {"ip": ip, "kapilar": ps, "mac": mac, "uretici": UREtici.get(mac[:8], "")}
        for p in (443, 80, 8080, 8443):
            if p in ps:
                d["web"] = baslik(ip, p); break
        if 443 in ps and not d.get("web", "").strip(" -"):
            d.update(tanit(ip))
        if 502 in ps or 6607 in ps:
            d["not"] = "Modbus TCP açık" + (" (Huawei 6607)" if 6607 in ps else "")
        sonuc["cihazlar"].append(d)
    sonuc["zaman"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    sonuc["sure_sn"] = round(time.time() - bas, 1)
    _, sha = gh("n8n/ag_kesif.json")
    gh("n8n/ag_kesif.json", sonuc, sha, "Ağ keşfi (yalnız okuma)")
    log("ağ keşfi:", len(sonuc["cihazlar"]), "cihaz,", sonuc["aglar"])
    return sonuc


if __name__ == "__main__":
    main()
