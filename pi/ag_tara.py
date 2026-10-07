#!/usr/bin/env python3
"""AEMonitoring · Saha ağı taraması (Pi, crontab ile 15 dakikada bir).

Neden: toplayıcı (altminer) cihazları sabit IP listesinden okur. Modem DHCP ile IP'yi değiştirirse
cihaz F2Pool'da çalışmaya devam eder ama toplayıcı ona ulaşamaz, uyutulamaz. Bu betik:
  1) Saha alt ağındaki (/24) tüm adresleri ping'ler, ARP tablosundan IP→MAC eşler.
  2) Açık adreslerde madenci API'sine (4028) bağlanıp worker adını ve modeli okur (şifresiz, salt okuma).
  3) Bilinen kimliklerle (seri no, MAC → worker) eşler; toplayıcının ulaşamadığı cihazın yeni IP'sini bulur.
  4) Toplayıcının IP ayarının nerede olduğunu (altminer servis klasöründe IP geçen satırlar) raporlar.
Sonuç: epias-ptf/n8n/ag_tarama.json ve n8n/cihaz_kimlik.json (worker → seri no, MAC, model, son IP).
Hiçbir cihaza komut göndermez, hiçbir ayarı değiştirmez.

Elle:  python3 ag_tara.py
"""
import concurrent.futures as CF, ipaddress, json, re, socket, subprocess, sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import TR, gh, log  # noqa: E402

GIZLI = re.compile(r"pass|sifre|şifre|token|secret|key|auth|pwd", re.I)


def komut(*a, t=10):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=t).stdout
    except Exception:
        return ""


def alt_ag():
    for s in komut("ip", "-4", "-o", "addr").splitlines():
        m = re.search(r"\d+:\s+(\S+)\s+inet\s+(\d+\.\d+\.\d+\.\d+)/(\d+)", s)
        if m and m.group(1) not in ("lo",) and not m.group(1).startswith(("tailscale", "docker")):
            return m.group(2), ipaddress.ip_network(m.group(2) + "/24", strict=False)
    try:                                   # 'ip' komutu yoksa: dışarı giden arayüzün adresi
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("1.1.1.1", 53)); a = s.getsockname()[0]
        return a, ipaddress.ip_network(a + "/24", strict=False)
    except Exception:
        return None, None


def ping(ip):
    return ip if komut("ping", "-c", "1", "-W", "1", ip, t=3).find(" 0% packet loss") >= 0 else None


def arp():
    m = {}
    for s in komut("ip", "neigh").splitlines():
        p = s.split()
        if "lladdr" in p:
            m[p[0]] = p[p.index("lladdr") + 1].upper()
    try:
        for s in Path("/proc/net/arp").read_text().splitlines()[1:]:
            p = s.split()
            if p[3] != "00:00:00:00:00:00":
                m.setdefault(p[0], p[3].upper())
    except Exception:
        pass
    return m


def api(ip, cmd):
    try:
        with socket.create_connection((ip, 4028), timeout=2) as s:
            s.settimeout(3)
            s.sendall(json.dumps({"command": cmd}).encode())
            b = b""
            while True:
                x = s.recv(65536)
                if not x:
                    break
                b += x
        return json.loads(b.replace(b"\x00", b"").decode(errors="ignore").replace("}{", "},{"))
    except Exception:
        return None


def port(ip, p):
    try:
        with socket.create_connection((ip, p), timeout=1.5):
            return True
    except Exception:
        return False


def incele(ip):
    o = {"ip": ip, "api": False, "web": port(ip, 80)}
    pl = api(ip, "pools")
    if pl:
        o["api"] = True
        us = [str(x.get("User", "")) for x in pl.get("POOLS", []) if x.get("User")]
        if us:
            o["worker"] = us[0].split(".")[-1]
            o["havuz_kullanici"] = us[0]
    st = api(ip, "stats") or {}
    for x in st.get("STATS", []) or []:
        if x.get("Type"):
            o["model"] = str(x["Type"]).replace("Antminer ", "")
            break
    return o


def altminer_ayar():
    """altminer servisinin klasöründe IP/aralık tanımı geçen satırlar (gizli bilgi içeren satırlar atlanır)."""
    sv = komut("systemctl", "cat", "altminer")
    klas = set()
    for s in sv.splitlines():
        if s.startswith(("WorkingDirectory=", "ExecStart=")):
            for p in re.findall(r"(/[^\s]+)", s):
                q = Path(p)
                klas.add(q if q.is_dir() else q.parent)
    satir = []
    for k in sorted(klas):
        if not k.exists() or str(k) in ("/usr/bin", "/bin"):
            continue
        for f in list(k.glob("*.py")) + list(k.glob("*.json")) + list(k.glob("*.env")) + list(k.glob("*.yaml")) + list(k.glob("*.yml")) + list(k.glob("*.txt")):
            try:
                if f.stat().st_size > 2_000_000:
                    continue
                for i, s in enumerate(f.read_text(errors="ignore").splitlines(), 1):
                    if re.search(r"192\.168\.|IP_|ip_list|IPS\b|range\(\s*1\d\d", s) and not GIZLI.search(s):
                        satir.append(f"{f}:{i}: {s.strip()[:160]}")
            except Exception:
                pass
    return {"servis_klasoru": [str(k) for k in sorted(klas)], "ip_satirlari": satir[:30]}


def main():
    simdi = datetime.now(TR)
    benim, ag = alt_ag()
    if not ag:
        log("alt ağ bulunamadı"); return
    hedef = [str(h) for h in ag.hosts() if str(h) != benim]
    with CF.ThreadPoolExecutor(64) as ex:
        acik = [ip for ip in ex.map(ping, hedef) if ip]
    mac = arp()
    with CF.ThreadPoolExecutor(32) as ex:
        bilgi = list(ex.map(incele, acik))
    for o in bilgi:
        o["mac"] = mac.get(o["ip"])

    kimlik, ksha = gh("n8n/cihaz_kimlik.json")
    kimlik = kimlik or {}
    mad, _ = gh("antminer_panel.json")
    taranan = {d.get("ip"): d for d in (mad or {}).get("devices") or []}
    # toplayıcının bugünkü gördüğü kimlikleri kayda geçir
    for d in taranan.values():
        w = str(d.get("actual_worker") or "").split(".")[-1]
        if w and d.get("serial"):
            k = kimlik.setdefault(w, {})
            k.update(serial=d["serial"], mac=(d.get("mac") or "").upper() or k.get("mac"), model=d.get("model"),
                     son_ip=d["ip"], son_gorulme=(mad or {}).get("timestamp", "")[:19])
    mac2w = {v.get("mac"): w for w, v in kimlik.items() if v.get("mac")}
    madenci, aday = [], []
    for o in bilgi:
        w = o.get("worker") or mac2w.get(o.get("mac"))
        if not (o["api"] or w):
            if o["web"] and o["ip"] not in taranan:   # web arayüzü olan, tanınmayan adres: madenci olabilir
                aday.append({"ip": o["ip"], "mac": o.get("mac")})
            continue
        o["worker"] = w
        t = taranan.get(o["ip"])
        o["toplayici_goruyor"] = bool(t and (t.get("online") or t.get("sleeping")))
        o["toplayici_listesinde"] = bool(t)
        if w:
            k = kimlik.setdefault(w, {})
            k.update(son_ip=o["ip"], ag_gorulme=simdi.isoformat(timespec="seconds"))
            if o.get("mac"):
                k["mac"] = o["mac"]
            if o.get("model") and not k.get("model"):
                k["model"] = o["model"]
        madenci.append(o)
    gorulen = {str(d.get("actual_worker") or "").split(".")[-1] for d in taranan.values() if d.get("online") or d.get("sleeping")}
    eksik = []
    for w, k in sorted(kimlik.items()):
        if w in gorulen:
            continue
        bul = next((o for o in madenci if o.get("worker") == w), None)
        eksik.append({"worker": w, "serial": k.get("serial"), "mac": k.get("mac"), "model": k.get("model"),
                      "eski_ip": k.get("son_ip") if not bul else None, "yeni_ip": bul["ip"] if bul else None,
                      "durum": ("agda_var_liste_disi" if bul and not bul["toplayici_listesinde"] else
                                "agda_var_yanitsiz" if bul else "agda_yok")})
    yanitsiz = [ip for ip, d in taranan.items() if not (d.get("online") or d.get("sleeping"))]
    veri = {"zaman": simdi.isoformat(timespec="seconds"), "alt_ag": str(ag), "pi_ip": benim,
            "acik_adres": len(acik), "madenci_sayisi": len(madenci),
            "madenciler": sorted(madenci, key=lambda o: tuple(int(x) for x in o["ip"].split("."))),
            "toplayici_yanitsiz_ip": sorted(yanitsiz, key=lambda s: int(s.split(".")[-1])),
            "eksik": eksik, "web_adaylari": aday, "altminer": altminer_ayar()}
    eski, sha = gh("n8n/ag_tarama.json")
    gh("n8n/ag_tarama.json", veri, sha, "Pi ağ taraması " + simdi.strftime("%H:%M"))
    gh("n8n/cihaz_kimlik.json", kimlik, ksha, "Cihaz kimlikleri " + simdi.strftime("%H:%M"))
    log(f"ağ {ag}: {len(acik)} açık adres, {len(madenci)} madenci; eksik: " +
        (", ".join(f"{e['worker']}→{e['yeni_ip'] or 'yok'}" for e in eksik) or "yok"))


if __name__ == "__main__":
    main()
