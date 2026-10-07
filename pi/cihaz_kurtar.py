#!/usr/bin/env python3
"""Fabrika ayarına dönmüş (ya da ayar dosyası bozulmuş) bir Antminer'ı filoya geri katar.

  ~/SAHA/antminer/venv/bin/python ~/aesun/pi/cihaz_kurtar.py 192.168.0.101 008 [--sifirla]

Adımlar:
  --sifirla verilirse önce reset_conf.cgi (fabrika ayarı) ve 90 sn bekleme.
  1) Havuz ayarı sağlam bir cihazdan (varsayılan .102) kopyalanır, worker adı mehmetas.<no> yapılır, mod normal.
  2) Cihaza fabrika şifresiyle bağlanılır (şifre ekrandan sorulur, görünmez, hiçbir yere yazılmaz).
  3) Ayar yazılır; cihazın web şifresi filonun şifresine (toplayıcının kullandığı) çevrilir.
Şifreler kodda yoktur: filo şifresi toplayıcının kendi ayarından okunur.
"""
import getpass, json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path.home() / "SAHA/antminer"))
import requests                                   # noqa: E402
from requests.auth import HTTPDigestAuth          # noqa: E402
import antminer_panel as A                        # noqa: E402


def filo_auth():
    """Toplayıcının kullandığı kimlik bilgisini, http_query'nin requests'e verdiği auth nesnesinden yakalar."""
    yak, eski = {}, requests.get
    def sahte(url, **k):
        yak["a"] = k.get("auth"); raise RuntimeError("yakalandi")
    requests.get = sahte
    try:
        A.http_query("127.0.0.1", "x")
    except Exception:
        pass
    finally:
        requests.get = eski
    return yak.get("a")


def istek(ip, uc, auth, govde=None):
    url = f"http://{ip}/cgi-bin/{uc}"
    r = requests.post(url, auth=auth, json=govde, timeout=30) if govde is not None else requests.get(url, auth=auth, timeout=30)
    return r.status_code, r.text[:200]


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    ip, no = sys.argv[1], sys.argv[2].zfill(3)
    sablon_ip = "192.168.0.102"
    fa = filo_auth()
    if not fa:
        sys.exit("Toplayıcının kimlik bilgisi okunamadı.")
    if "--sifirla" in sys.argv:
        print("fabrika ayarı:", A.http_query(ip, "reset_conf.cgi", method="POST", body={}, timeout=30))
        print("90 sn bekleniyor..."); time.sleep(90)
    s = A.http_query(sablon_ip, "get_miner_conf.cgi", timeout=30)
    if not isinstance(s, dict) or not s.get("pools"):
        sys.exit(f"Şablon cihazdan ({sablon_ip}) ayar okunamadı: {s}")
    c = {k: v for k, v in s.items() if v is not None}
    c["pools"] = [dict(p, user="mehmetas." + no) for p in c["pools"]]
    c["bitmain-work-mode"] = "0"
    # önce filo şifresiyle dene (reset gerekmemiş olabilir), olmazsa fabrika şifresi
    kod, _ = istek(ip, "get_miner_conf.cgi", fa)
    if kod == 401:
        fab = getpass.getpass(f"{ip} fabrika web şifresi (kullanıcı adı {fa.username}; cihaz etiketinde/kılavuzda yazar): ")
        auth = HTTPDigestAuth(fa.username, fab)
        kod, _ = istek(ip, "get_miner_conf.cgi", auth)
        if kod == 401:
            sys.exit("Fabrika şifresi kabul edilmedi.")
    else:
        auth, fab = fa, None
    print("ayar yaz:", istek(ip, "set_miner_conf.cgi", auth, c))
    if fab is not None:
        print("şifre filoya eşitlendi:", istek(ip, "passwd.cgi", auth, {"curPwd": fab, "newPwd": fa.password, "confirmPwd": fa.password})[0])
    time.sleep(15)
    k2, t2 = istek(ip, "get_miner_conf.cgi", fa)
    try:
        print("kontrol:", k2, [p.get("user") for p in json.loads(t2 if k2 != 200 else requests.get(f"http://{ip}/cgi-bin/get_miner_conf.cgi", auth=fa, timeout=30).text).get("pools", [])])
    except Exception:
        print("kontrol:", k2, t2)


if __name__ == "__main__":
    main()
