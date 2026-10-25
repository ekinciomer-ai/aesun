#!/usr/bin/env python3
"""ns1 güvenlik özeti — Denetçi "🛡️ Saldırı & Hatalı Giriş" sekmesi.

bekci.sh her turda çağırır (15 dk'da bir hesaplar). Yalnız OKUR; hiçbir ayarı değiştirmez.
Kaynaklar:
  SSH       journalctl -u ssh/sshd   → başarısız denemeler, denenen kullanıcı adları, başarılı girişler (IP'siz, yalnız sayı/yöntem)
  fail2ban  fail2ban-client + /var/log/fail2ban.log* → şu an engelli adresler, engel olayları
  API       aesun-api:/veri/erisim/red.log → 401/403 (yetkisiz), zafiyet yolu (tarama), 429 (hız); /sso = fatura girişi
  Giriş     aesun-api:/veri/erisim/giris.jsonl → portal/saha başarılı-hatalı girişleri, cPanel köprüsü (veri.php/canli.php) redleri
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
    basari = collections.Counter(); basari_kaynak = set(); basari_parola_son = None; ssh_olay = []
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
        ssh_olay.append((z, m.group(1), s))
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

    # ---------- API (aesun-api erişim günlüğü: /veri/erisim/red.log) ----------
    api_kod = collections.Counter(); api_ip = collections.Counter(); api_yol = collections.Counter(); api_saat = collections.Counter()
    api_ip_tur = collections.defaultdict(collections.Counter); sso_red = 0
    akis = []
    red = k("docker", "exec", "aesun-api", "sh", "-c", "cat /veri/erisim/red.log.1 /veri/erisim/red.log 2>/dev/null", timeout=60)
    RED = re.compile(r"^(\S+) RED ip=(\S+) kod=(\d+) tur=(\S+) yontem=(\S+) yol=(\S*)")
    for s_ in red.splitlines():
        m = RED.match(s_)
        if not m:
            continue
        try:
            z = datetime.strptime(m.group(1), "%Y-%m-%dT%H:%M:%S%z")
        except Exception:
            continue
        if z < s24:
            continue
        ip, kod, tur, yol = m.group(2), int(m.group(3)), m.group(4), m.group(6)
        kaynak = "fatura-sso" if yol.startswith("/sso") else "api"
        if kaynak == "fatura-sso":
            sso_red += 1
        api_kod[tur] += 1; api_ip[ip] += 1; api_ip_tur[ip][tur] += 1; api_yol[(yol[:60], kod)] += 1
        api_saat[saat_anahtar(z)] += 1
        akis.append({"t": z.astimezone(TR).isoformat(timespec="seconds"), "kaynak": kaynak, "sonuc": tur, "ip": ip, "ayrinti": f"{m.group(5)} {yol} → {kod}"})
    api_toplam = None

    # ---------- Portal / saha / cPanel köprüsü giriş olayları (/veri/erisim/giris.jsonl) ----------
    gj = k("docker", "exec", "aesun-api", "sh", "-c", "cat /veri/erisim/giris.jsonl.1 /veri/erisim/giris.jsonl 2>/dev/null", timeout=60)
    giris = {"basarili": 0, "hatali": 0, "kullanici": collections.Counter(), "hatali_kul": collections.Counter(), "ip_hatali": collections.Counter()}
    cpanel = {"red": 0, "dogrulanmadi": 0, "ip": collections.Counter(), "yol": collections.Counter()}
    portal_saat = collections.Counter(); son_basarili = []
    for s_ in gj.splitlines():
        try:
            o = json.loads(s_); z = datetime.fromisoformat(o["t"])
        except Exception:
            continue
        if z < s24:
            continue
        t_ = z.astimezone(TR).isoformat(timespec="seconds")
        if o.get("kaynak") == "cpanel":
            cpanel["red"] += 1; cpanel["ip"][o.get("ip", "?")] += 1; cpanel["yol"][o.get("yol", "")] += 1
            if not o.get("dogrulandi"):
                cpanel["dogrulanmadi"] += 1
            api_ip[o.get("ip", "?")] += 1; api_ip_tur[o.get("ip", "?")]["cpanel-red"] += 1
            akis.append({"t": t_, "kaynak": "cpanel", "sonuc": "yetkisiz", "ip": o.get("ip"), "ayrinti": f"{o.get('yol')} → {o.get('kod')} · {o.get('not', '')}" + ("" if o.get("dogrulandi") else " (doğrulanmamış bildirim)")})
            continue
        portal_saat[saat_anahtar(z)] += 1
        if o.get("sonuc") == "basarili":
            giris["basarili"] += 1; giris["kullanici"][o.get("kul", "")] += 1
            son_basarili.append({"t": t_, "kul": o.get("kul"), "not": o.get("not"), "ua": o.get("ua", "")[:60]})
            akis.append({"t": t_, "kaynak": o.get("kaynak", "portal"), "sonuc": "basarili", "ip": "", "ayrinti": f"{o.get('kul')} giriş yaptı {o.get('not') or ''}".strip()})
        elif o.get("sonuc") == "hatali":
            giris["hatali"] += 1; giris["hatali_kul"][o.get("kul", "")] += 1; giris["ip_hatali"][o.get("ip", "?")] += 1
            api_ip[o.get("ip", "?")] += 1; api_ip_tur[o.get("ip", "?")]["portal-hatalı"] += 1
            akis.append({"t": t_, "kaynak": o.get("kaynak", "portal"), "sonuc": "hatali", "ip": o.get("ip"), "ayrinti": f"kullanıcı '{o.get('kul')}' · {o.get('not') or ''}"})

    for z, tur, s_ in ssh_olay[-200:]:
        mi = SSH_IP.search(s_); mk = SSH_KUL.search(s_)
        akis.append({"t": z.astimezone(TR).isoformat(timespec="seconds"), "kaynak": "ssh", "sonuc": "hatali", "ip": mi.group(1) if mi else "",
                     "ayrinti": tur + (f" · kullanıcı '{mk.group(1)[:32]}'" if mk else "")})
    for o in olay:
        if o["t"] >= s24.astimezone(TR).isoformat(timespec="minutes") and o["olay"] in ("Ban", "Unban"):
            akis.append({"t": o["t"] + ":00", "kaynak": "fail2ban", "sonuc": "engel" if o["olay"] == "Ban" else "kaldirildi", "ip": o["ip"], "ayrinti": o["kural"]})
    akis.sort(key=lambda x: x["t"], reverse=True)

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
    cok = [f"{a['ip']} ({a['sayi']})" for a in [{"ip": i, "sayi": n} for i, n in giris["ip_hatali"].items()] if a["sayi"] >= 10]
    if cok:
        uyari.append("Portalda 24 saatte ≥10 hatalı şifre denemesi: " + ", ".join(cok[:5]))
    if any(x["basarili_giris"] and x["ssh"] for x in saldirgan):
        uyari.append("Başarısız deneme yapan bir adresten başarılı giriş de var — kendi IP'niz değilse inceleyin.")

    sonuc = {
        "guncellendi": simdi.isoformat(timespec="seconds"),
        "uyarilar": uyari,
        "ozet": {
            "ssh_basarisiz_24s": sum(ssh_saat.values()), "ssh_farkli_ip_24s": len(ssh_ip),
            "ssh_basarili_24s": sum(basari.values()), "ssh_basarili_yontem": dict(basari), "ssh_basarili_kaynak_sayisi": len(basari_kaynak),
            "engelli_su_an": len(engelli), "engel_toplam": sum(v["toplam"] for v in f2b["kurallar"].values()),
            "api_red_24s": sum(api_kod.values()), "api_tur": dict(api_kod), "api_farkli_ip_24s": len(api_ip), "sso_red_24s": sso_red,
            "portal_basarili_24s": giris["basarili"], "portal_hatali_24s": giris["hatali"], "cpanel_red_24s": cpanel["red"],
            "toplam_olay_24s": len(akis),
        },
        "fail2ban": f2b,
        "ssh_turler": dict(ssh_tur.most_common()),
        "kullanici_adlari": [{"ad": a, "sayi": n} for a, n in ssh_kul.most_common(25)],
        "saldirganlar": saldirgan,
        "api_yollar": [{"yol": y, "kod": c, "sayi": n} for (y, c), n in api_yol.most_common(25)],
        "saatlik": [{"saat": s, "ssh": ssh_saat.get(s, 0), "api": api_saat.get(s, 0), "portal": portal_saat.get(s, 0)} for s in saatler],
        "gunluk": [{"gun": g, "ssh": ssh_gun.get(g, 0), "engel": ban_gun.get(g, 0)} for g in gunler],
        "olaylar": olay,
        "akis": akis[:400],
        "kaynak_sayilari": dict(collections.Counter(x["kaynak"] for x in akis)),
        "portal": {"basarili": giris["basarili"], "hatali": giris["hatali"],
                   "kullanicilar": [{"kul": a, "sayi": n} for a, n in giris["kullanici"].most_common(20)],
                   "hatali_kullanici": [{"kul": a, "sayi": n} for a, n in giris["hatali_kul"].most_common(20)],
                   "hatali_ip": [{"ip": a, "sayi": n} for a, n in giris["ip_hatali"].most_common(20)],
                   "son_basarili": son_basarili[-15:][::-1]},
        "cpanel": {"red": cpanel["red"], "dogrulanmadi": cpanel["dogrulanmadi"], "yollar": [{"yol": a, "sayi": n} for a, n in cpanel["yol"].most_common(10)]},
        "not": "Portal şifresi tarayıcıda çözülür; yanlış portal şifreleri sunucuya ulaşmaz, burada görünmez.",
    }
    t = CIKTI.with_suffix(".tmp")
    t.write_text(json.dumps(sonuc, ensure_ascii=False))
    t.replace(CIKTI)
    k("docker", "cp", str(CIKTI), "aesun-api:/veri/epias-ptf/n8n/guvenlik_ns1.json")
    print(f"güvenlik: ssh {sonuc['ozet']['ssh_basarisiz_24s']} deneme/{len(ssh_ip)} ip · engelli {len(engelli)} · api red {sum(api_kod.values())}")


if __name__ == "__main__":
    main()
