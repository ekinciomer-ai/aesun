#!/usr/bin/env python3
"""ns1 güvenlik özeti — Denetçi "🛡️ Saldırı & Hatalı Giriş" sekmesi.

bekci.sh her turda çağırır (15 dk'da bir hesaplar). Yalnız OKUR; hiçbir ayarı değiştirmez.
Kaynaklar:
  SSH       journalctl -u ssh/sshd   → başarısız denemeler, denenen kullanıcı adları, başarılı girişler (IP'siz, yalnız sayı/yöntem)
  fail2ban  fail2ban-client + /var/log/fail2ban.log* → şu an engelli adresler, engel olayları
  API       docker logs aesun-api (uvicorn, --proxy-headers ile gerçek istemci IP) → 401/403 (yetkisiz), 404/400 (tarama)
Çıktı: /opt/aesun/guvenlik.json → aesun-api:/veri/epias-ptf/n8n/guvenlik_ns1.json (yetkili /v1/dosya ile okunur;
GitHub'a gönderilmez). Şifre/anahtar içermez; başarılı giriş yapan adresler yazılmaz.
"""
import collections, json, re, subprocess, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path

TR = timezone(timedelta(hours=3))
CIKTI = Path("/opt/aesun/guvenlik.json")
IP = r"((?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]{6,})"
SSH_HATA = re.compile(r"(Failed password|Failed publickey|Invalid user|authentication failure|Connection closed by authenticating user|"
                      r"Disconnected from invalid user|Connection closed by invalid user|maximum authentication attempts|Unable to negotiate|"
                      r"banner exchange|Bad protocol version|Did not receive identification)")
SSH_KUL = re.compile(r"(?:invalid user|Invalid user|for invalid user|for|authenticating user) (\S+) (?:from )?[0-9a-fA-F]{1,4}[.:]")
SSH_IP = re.compile(r"(?:from |by |with |user \S+ )" + IP + r"(?: port|\b)")
UVI = re.compile(r"^(\S+)\s+INFO:\s+" + r"([0-9a-fA-F.:]+):\d+ - \"(\w+) (\S+) [^\"]*\" (\d{3})")
TARAMA = re.compile(r"(\.php|\.env|wp-|/\.git|/admin|/cgi-bin|/vendor|/boaform|/actuator|/HNAP|/owa|/solr|/druid|/console|"
                    r"/shell|/phpmyadmin|/\.aws|/config|/server-status|/login|/xmlrpc|/autodiscover)", re.I)


def k(*a, timeout=120):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=timeout).stdout
    except Exception:
        return ""


def saat_anahtar(dt):
    return dt.astimezone(TR).strftime("%Y-%m-%d %H")


def main():
    simdi = datetime.now(TR)
    if CIKTI.exists() and time.time() - CIKTI.stat().st_mtime < 840 and "--zorla" not in sys.argv:
        return
    s24 = simdi - timedelta(hours=24)

    # ---------- SSH ----------
    j = k("journalctl", "-u", "ssh", "-u", "sshd", "--since", "-7 days", "-o", "short-iso", "--no-pager", timeout=180)
    ssh_ip = collections.Counter(); ssh_ip_son = {}; ssh_kul = collections.Counter(); ssh_tur = collections.Counter()
    ssh_saat = collections.Counter(); ssh_gun = collections.Counter()
    basari = collections.Counter(); basari_kaynak = set(); basari_parola_son = None
    for s in j.splitlines():
        try:
            z = datetime.fromisoformat(s.split()[0])
        except Exception:
            continue
        if "Accepted" in s:
            if z >= s24:
                yon = "anahtar" if "publickey" in s else ("parola" if "password" in s else "diğer")
                basari[yon] += 1
                m = SSH_IP.search(s)
                if m:
                    basari_kaynak.add(m.group(1))
                if yon == "parola":
                    basari_parola_son = z.astimezone(TR).isoformat(timespec="minutes")
            continue
        m = SSH_HATA.search(s)
        if not m:
            continue
        ssh_gun[z.astimezone(TR).strftime("%Y-%m-%d")] += 1
        if z < s24:
            continue
        ssh_saat[saat_anahtar(z)] += 1
        ssh_tur[m.group(1)] += 1
        mi = SSH_IP.search(s)
        if mi:
            ssh_ip[mi.group(1)] += 1
            ssh_ip_son[mi.group(1)] = z.astimezone(TR).isoformat(timespec="minutes")
        mk = SSH_KUL.search(s)
        if mk:
            ssh_kul[mk.group(1)[:32]] += 1

    # ---------- fail2ban ----------
    f2b = {"etkin": k("systemctl", "is-active", "fail2ban").strip(), "kurallar": {}}
    engelli = {}
    jl = re.search(r"Jail list:\s*(.*)", k("fail2ban-client", "status"))
    for jail in [x.strip() for x in (jl.group(1).split(",") if jl else []) if x.strip()]:
        st = k("fail2ban-client", "status", jail)
        g = lambda ad: (re.search(ad + r":\s*(\d+)", st) or [None, 0])[1]
        lst = (re.search(r"Banned IP list:\s*(.*)", st) or [None, ""])[1].split()
        f2b["kurallar"][jail] = {"su_an": int(g("Currently banned")), "toplam": int(g("Total banned")), "basarisiz_su_an": int(g("Currently failed"))}
        for ip in lst:
            engelli.setdefault(ip, []).append(jail)
    olay = []
    ban_gun = collections.Counter()
    for f in sorted(Path("/var/log").glob("fail2ban.log*")):
        if f.suffix == ".gz":
            continue
        for s in f.read_text(errors="ignore").splitlines():
            m = re.search(r"^(\S+ \S+?),\d+ .*\[(\S+)\] (Ban|Unban|Restore Ban) " + IP, s)
            if not m:
                continue
            try:
                z = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S").astimezone()  # fail2ban sunucunun yerel saatinde yazar
            except Exception:
                continue
            if m.group(3) == "Ban":
                ban_gun[z.astimezone(TR).strftime("%Y-%m-%d")] += 1
            olay.append({"t": z.astimezone(TR).isoformat(timespec="minutes"), "kural": m.group(2), "olay": m.group(3), "ip": m.group(4)})
    olay = sorted(olay, key=lambda x: x["t"])[-60:][::-1]

    # ---------- API (uvicorn) ----------
    api_kod = collections.Counter(); api_ip = collections.Counter(); api_yol = collections.Counter(); api_saat = collections.Counter()
    api_ip_tur = collections.defaultdict(collections.Counter); api_toplam = 0
    lg = k("docker", "logs", "--since", "24h", "--timestamps", "aesun-api", timeout=120)
    lg += k("bash", "-c", "docker logs --since 24h --timestamps aesun-api 2>&1 >/dev/null", timeout=120)   # uvicorn stderr'e yazar
    gor = set()
    for s in lg.splitlines():
        m = UVI.search(s)
        if not m or s in gor:
            continue
        gor.add(s)
        api_toplam += 1
        kod = int(m.group(5))
        if kod < 400:
            continue
        ip, yol = m.group(2), m.group(4).split("?")[0]
        tur = "yetkisiz" if kod in (401, 403) else ("tarama" if (kod in (400, 404, 405) and TARAMA.search(yol)) else ("hatalı istek" if kod < 500 else "sunucu hatası"))
        api_kod[tur] += 1; api_ip[ip] += 1; api_ip_tur[ip][tur] += 1
        api_yol[(yol[:60], kod)] += 1
        try:
            api_saat[saat_anahtar(datetime.fromisoformat(m.group(1)[:26] + "+00:00"))] += 1
        except Exception:
            pass

    # ---------- birleştir ----------
    saatler = [(simdi - timedelta(hours=i)).strftime("%Y-%m-%d %H") for i in range(23, -1, -1)]
    gunler = [(simdi - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    tum_ip = collections.Counter(ssh_ip) + collections.Counter(api_ip)
    saldirgan = []
    for ip, n in tum_ip.most_common(40):
        saldirgan.append({"ip": ip, "toplam": n, "ssh": ssh_ip.get(ip, 0), "api": api_ip.get(ip, 0),
                          "api_tur": dict(api_ip_tur.get(ip, {})), "son": ssh_ip_son.get(ip),
                          "engel": engelli.get(ip, []), "basarili_giris": ip in basari_kaynak})
    uyari = []
    if basari.get("parola"):
        uyari.append(f"Son 24 saatte {basari['parola']} PAROLAYLA başarılı SSH girişi (son: {basari_parola_son}) — sizin değilse acil inceleyin.")
    if f2b["etkin"] != "active":
        uyari.append("fail2ban çalışmıyor — SSH kaba kuvvet koruması kapalı.")
    acik_ip = [x["ip"] for x in saldirgan if x["ssh"] >= 20 and not x["engel"]]
    if acik_ip:
        uyari.append(f"{len(acik_ip)} adres 24 saatte ≥20 SSH denemesi yaptı ama engelli değil: {', '.join(acik_ip[:5])}")
    if any(x["basarili_giris"] and x["ssh"] for x in saldirgan):
        uyari.append("Başarısız deneme yapan bir adresten başarılı giriş de var — kendi IP'niz değilse inceleyin.")

    sonuc = {
        "guncellendi": simdi.isoformat(timespec="seconds"),
        "uyarilar": uyari,
        "ozet": {
            "ssh_basarisiz_24s": sum(ssh_saat.values()), "ssh_farkli_ip_24s": len(ssh_ip),
            "ssh_basarili_24s": sum(basari.values()), "ssh_basarili_yontem": dict(basari), "ssh_basarili_kaynak_sayisi": len(basari_kaynak),
            "engelli_su_an": len(engelli), "engel_toplam": sum(v["toplam"] for v in f2b["kurallar"].values()),
            "api_istek_24s": api_toplam, "api_red_24s": sum(api_kod.values()), "api_tur": dict(api_kod), "api_farkli_ip_24s": len(api_ip),
        },
        "fail2ban": f2b,
        "ssh_turler": dict(ssh_tur.most_common()),
        "kullanici_adlari": [{"ad": a, "sayi": n} for a, n in ssh_kul.most_common(25)],
        "saldirganlar": saldirgan,
        "api_yollar": [{"yol": y, "kod": c, "sayi": n} for (y, c), n in api_yol.most_common(25)],
        "saatlik": [{"saat": s, "ssh": ssh_saat.get(s, 0), "api": api_saat.get(s, 0)} for s in saatler],
        "gunluk": [{"gun": g, "ssh": ssh_gun.get(g, 0), "engel": ban_gun.get(g, 0)} for g in gunler],
        "olaylar": olay,
        "not": "Portal şifresi tarayıcıda çözülür; yanlış portal şifreleri sunucuya ulaşmaz, burada görünmez.",
    }
    t = CIKTI.with_suffix(".tmp")
    t.write_text(json.dumps(sonuc, ensure_ascii=False))
    t.replace(CIKTI)
    k("docker", "cp", str(CIKTI), "aesun-api:/veri/epias-ptf/n8n/guvenlik_ns1.json")
    print(f"güvenlik: ssh {sonuc['ozet']['ssh_basarisiz_24s']} deneme/{len(ssh_ip)} ip · engelli {len(engelli)} · api red {sum(api_kod.values())}")


if __name__ == "__main__":
    main()
