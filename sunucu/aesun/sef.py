#!/usr/bin/env python3
"""AEMonitoring · ŞEF (ns1, bekçiden sonra 5 dk'da bir).

Bekçiler sorunu BULUR; şef sorunu ÇÖZER. Her turda bekçilerin bulgularını (ns1 bekçisi, öğrenen tarama, Pi sistem bekçisi)
ve dışarıdan görünen gerçeği (GitHub'daki son durum) birlikte okur, bilinen bir çözüm yolu varsa uygular, sonucu doğrular,
çözemediğini açıkça yazar. Çıktı: /opt/aesun/sef_durum.json ve depoda n8n/sef.json (panel + denetçi okur).

Çözüm yolları (her biri bekleme süreli; aynı eylem kısa sürede tekrarlanmaz):
  itme       ns1 iş deposunda yarıda kalmış rebase ya da GitHub'a gidemeyen (10 dk'dan eski) iş çıktısı → rebase temizle,
             çakışmada iş çıktısını koru, yeniden gönder; gönderilemeyen commit kalmadığını doğrula
  is_tetik   bir iş GitHub'da olağan aralığının 2 katından uzun süredir görünmüyor ama zamanlayıcı canlı → işi hemen çalıştır
  isler      zamanlayıcının nabzı 5 dk'dan eski → kapsayıcıyı yeniden başlat (bekçinin onarımıyla aynı 30 dk sınırı)
  api        merkez API eşitlemesi 5 dk'dan eski → API kapsayıcısını yeniden başlat
Çözemediği (Pi tarafı, dış servis, n8n): "acik" listesine yazılır; denetçi e-postası ve panel bunları gösterir.
"""
import json, os, subprocess, time
from datetime import datetime, timedelta, timezone

D = "/opt/aesun"; TR = timezone(timedelta(hours=3))
DURUM = D + "/sef_durum.json"; LOG = D + "/sef.log"
REPO = "/veri/epias-ptf"
ISLER = {"Bildirimler": 15, "Veri arşivi": 60, "Durum analizi": 60, "İzleme özeti": 30}   # olağan aralık (dk)
BEKLE = {"itme": 600, "is_tetik": 1800, "isler": 1800, "api": 1800, "etkin": 1200}
AD_GH = ("gh_yeniden", "gh_kapat")                         # aynı eylem en erken (sn)


def sh(*a, t=180, girdi=None):
    try:
        r = subprocess.run(list(a), capture_output=True, text=True, timeout=t, input=girdi)
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:
        return 99, "", str(e)


def dx(*a, t=180, girdi=None):
    return sh("docker", "exec", "-i", "aesun-isler", *a, t=t, girdi=girdi)


def git(*a, t=180):
    return dx("env", "GIT_SSH_COMMAND=ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no", "git", "-C", REPO, *a, t=t)


def oku(p, v):
    try:
        return json.load(open(p))
    except Exception:
        return v


def zaman(s):
    try:
        z = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return z if z.tzinfo else z.replace(tzinfo=TR)
    except Exception:
        return None


def main():
    simdi = datetime.now(TR); ts = time.time()
    st = oku(DURUM, {}); son = st.get("son_eylem") or {}
    eylemler, acik, gozlem = [], [], {}

    def yap(ad, sorun, fn):
        if ts - son.get(ad, 0) < BEKLE[ad] and not os.path.exists(D + "/.sef_gh_simdi"):
            gozlem[ad] = f"bekleniyor ({round((ts - son.get(ad, 0)) / 60)} dk önce denendi)"; return None
        son[ad] = ts
        sonuc, ok = fn()
        eylemler.append({"t": simdi.isoformat(timespec="seconds"), "sorun": sorun, "eylem": ad, "sonuc": sonuc, "ok": ok})
        open(LOG, "a").write(f"{simdi.isoformat(timespec='seconds')}|{ad}|{'ok' if ok else 'olmadı'}|{sorun}|{sonuc}\n")
        return ok

    # ---- 1) iş deposu GitHub'a yazabiliyor mu?
    git("fetch", "--depth", "50", "-q", "origin", "main", t=120)
    _, rb, _ = dx("sh", "-c", f"ls -d {REPO}/.git/rebase-merge {REPO}/.git/rebase-apply 2>/dev/null")
    _, ileri, _ = git("rev-list", "--count", "origin/main..HEAD")
    _, geri, _ = git("rev-list", "--count", "HEAD..origin/main")
    _, en_eski, _ = git("log", "origin/main..HEAD", "--reverse", "--format=%ct", "-1")
    ileri = int(ileri or 0); geri = int(geri or 0); yas = (ts - int(en_eski)) / 60 if en_eski.isdigit() else 0
    gozlem["itme"] = {"rebase_yarida": bool(rb), "gonderilmemis": ileri, "geride": geri, "en_eski_dk": round(yas)}
    if rb or (ileri and yas > 10) or geri > 15 or ileri > 50:
        def itme():
            dx("rm", "-rf", f"{REPO}/.git/rebase-merge", f"{REPO}/.git/rebase-apply", f"{REPO}/.git/MERGE_HEAD", f"{REPO}/.git/index.lock")
            git("fetch", "--depth", "50", "-q", "origin", "main")
            git("checkout", "-B", "main", "origin/main")
            git("reset", "--hard", "origin/main")
            git("clean", "-fd")
            git("stash", "clear")
            _, kalan, _ = git("rev-list", "--count", "origin/main..HEAD")
            _, kalan_geri, _ = git("rev-list", "--count", "HEAD..origin/main")
            ok = int(kalan or 0) <= 2 and int(kalan_geri or 0) <= 5
            return (f"depo main dalına sıfırlandı (ileri:{ileri}->{kalan}, geri:{geri}->{kalan_geri})" if ok else f"sıfırlanamadı (ileri:{kalan}, geri:{kalan_geri})"), ok
        if yap("itme", ("yarıda kalmış rebase · " if rb else "") + f"sığ klon koptu (ileri:{ileri}, geri:{geri})", itme) is False:
            acik.append({"sorun": "ns1 iş çıktıları GitHub'a gönderilemiyor", "neden": "itme denemesi başarısız"})

    # ---- 2) zamanlayıcı canlı mı?
    dj = {}
    k, o, _ = dx("cat", "/veri/durum.json")
    try: dj = json.loads(o)
    except Exception: pass
    nab = zaman(dj.get("nabiz")); nab_dk = (simdi - nab).total_seconds() / 60 if nab else 999
    gozlem["isler"] = {"nabiz_dk": round(nab_dk, 1), "etkin": dj.get("etkin")}
    if nab_dk > 5:
        def isler_yeniden():
            k, _, e = sh("docker", "restart", "-t", "20", "aesun-isler", t=120)
            return ("kapsayıcı yeniden başlatıldı" if not k else "başlatılamadı: " + e[-120:]), not k
        yap("isler", f"zamanlayıcı nabzı {round(nab_dk)} dk eski", isler_yeniden)

    # ---- 2b) işler kapalı mı? (ETKIN=0 — ör. sır paketi etkin=0 ile yenilendi). Bakım işareti (/opt/aesun/BAKIM) yoksa şef açar.
    if dj and dj.get("etkin") is False:
        if os.path.exists(D + "/BAKIM"):
            acik.append({"sorun": "ns1 işleri kapalı (bakım modu)", "neden": "/opt/aesun/BAKIM var — bilinçli kapatma"})
        else:
            def ac():
                k, o, e = dx("python", "sef_github.py", "ac", t=240)
                try: a = json.loads(o.strip().splitlines()[-1]).get("ac") or {}
                except Exception: a = {}
                return ("sır paketi etkin=1 ile yeniden üretildi; işler 2–3 dk içinde başlar" if a.get("ok") else f"açılamadı ({a.get('kod') or (e or o)[-100:]})"), bool(a.get("ok"))
            if yap("etkin", "ns1 işleri kapalı (ETKIN=0) — hiçbir iş çalışmıyor", ac) is None and not any(e["eylem"] == "etkin" for e in eylemler):
                pass
    # ---- 3) işler GitHub'da görünüyor mu? (dışarıdan gerçek)
    k, o, _ = git("show", "origin/main:n8n/is_hatalari.json")
    ih = {}
    try: ih = json.loads(o).get("isler") or {}
    except Exception: pass
    geciken = []
    for ad, ara in ISLER.items():
        z = zaman((ih.get(ad) or {}).get("son")); dk = (simdi - z).total_seconds() / 60 if z else 9999
        if dk > 2 * ara + 5: geciken.append((ad, round(dk)))
    # bekçilerin "geciken dosya" ve "eksik veri" bulgularını üreten işe çevir (ns1 işleri); Pi dosyaları Pi şefinin işi
    URETICI = (("n8n/bildirim_", "Bildirimler"), ("n8n/maden_maliyet", "Bildirimler"), ("n8n/analiz/", "Durum analizi"),
               ("n8n/aesun_son", "İzleme özeti"), ("n8n/izleme_durum", "İzleme özeti"), ("arsiv_", "Veri arşivi"), ("n8n/is_hatalari", None))
    tar = oku(D + "/tarama_durum.json", {})
    ek = set()
    for g in tar.get("geciken") or []:
        for on, ad in URETICI:
            if g["dosya"].startswith(on) and ad: ek.add(ad)
    vs = str(((oku(D + "/bekci_durum.json", {}).get("veri") or {}).get("sorun")) or "")
    if "maliyet" in vs: ek.add("Bildirimler")
    if "F2Pool" in vs or "arşiv" in vs: ek.add("Veri arşivi")
    for ad in sorted(ek):
        if ad not in [a for a, _ in geciken]: geciken.append((ad, 0))
    gozlem["isler_github"] = {ad: dk for ad, dk in geciken}
    gozlem["uretici_tetik"] = sorted(ek)
    if geciken and nab_dk <= 5 and dj.get("etkin"):
        def tetik():
            for ad, _ in geciken:
                dx("sh", "-c", "mkdir -p /veri/tetik && touch \"/veri/tetik/$1\"", "-", ad.replace(" ", "_"))
            return "hemen çalıştırıldı: " + ", ".join(a for a, _ in geciken), True
        yap("is_tetik", "GitHub'da gecikmiş iş: " + ", ".join(f"{a} {d} dk" for a, d in geciken), tetik)

    # ---- 4) merkez API eşitlemesi
    bk = oku(D + "/bekci_durum.json", {})
    es = (bk.get("api") or {}).get("esitleme_sn") or 0
    gozlem["api_esitleme_sn"] = es
    if es > 300:
        def api_yeniden():
            k, _, e = sh("docker", "restart", "-t", "20", "aesun-api", t=120)
            return ("API yeniden başlatıldı" if not k else "başlatılamadı: " + e[-120:]), not k
        yap("api", f"API eşitlemesi {round(es / 60)} dk eski", api_yeniden)

    # ---- 4b) başarısız GitHub işleri (hata bekçisinin bulgusu): geçmişte kalanı kapat, güvenliyi yeniden çalıştır (30 dk'da bir)
    gh = st.get("github") or {}
    if ts - gh.get("_t", 0) > 1800 or os.path.exists(D + "/.sef_gh_simdi"):
        k, o, e = dx("python", "sef_github.py", t=240)
        try:
            g = json.loads(o.strip().splitlines()[-1])
        except Exception:
            g = {"hata": (e or o)[-160:]}
        g["_t"] = ts; gh = g
        for x in g.get("yeniden") or []:
            eylemler.append({"t": simdi.isoformat(timespec="seconds"), "sorun": f"GitHub işi başarısız: {x['ad']} ({x['depo']})", "eylem": "gh_yeniden",
                             "sonuc": "yeniden çalıştırıldı" if x.get("ok") else f"yeniden çalıştırılamadı (HTTP {x.get('kod')})", "ok": bool(x.get("ok"))})
        if g.get("kapanan"):
            eylemler.append({"t": simdi.isoformat(timespec="seconds"), "sorun": "eski GitHub hataları: " + ", ".join(sorted({x['ad'] for x in g['kapanan']})),
                             "eylem": "gh_kapat", "sonuc": f"{len(g['kapanan'])} hata sonraki başarılı çalışmayla kapatıldı", "ok": True}) if any(x["id"] not in {y["id"] for y in (st.get("github") or {}).get("kapanan") or []} for x in g["kapanan"]) else None
    gozlem["github"] = {k2: len(v) if isinstance(v, list) else v for k2, v in gh.items() if not k2.startswith("_")}
    if gh.get("anahtar", "").startswith("geçersiz"):
        acik.append({"sorun": "ns1'deki GitHub anahtarı (PAT_TOKEN) geçersiz", "neden": "şef başarısız işleri yeniden çalıştıramaz; GitHub'da yeni anahtar oluşturup epias-ptf sırlarında PAT_TOKEN'ı güncelleyin, sonra 'Sunucuya sır' işini çalıştırın"})
    for x in gh.get("acik") or []:
        acik.append({"sorun": f"GitHub işi başarısız: {x.get('ad')} ({x.get('depo')})", "neden": x.get("neden", "") + " — elle bakılmalı"})
    st["github"] = gh

    # müdahale başarılıysa öğrenen taramayı hemen yenile: bekçiler eski bulguyu göstermeye devam etmesin
    if any(e["ok"] for e in eylemler):
        sh("timeout", "600", "python3", D + "/bekci_tarama.py", t=650)
        sh("bash", "-c", f"echo $(date +%s) > {D}/.tarama_son")
    # ---- 4c) Pi şefi (Pi'de, nabız ile 10 dk'da bir): takılan toplayıcıyı durdurur, kod güncellemesini onarır, diski temizler
    k, o, _ = git("show", "origin/main:n8n/sef_pi.json")
    try: sp = json.loads(o)
    except Exception: sp = {}
    gozlem["pi_sef"] = {"t": sp.get("t"), "durum": sp.get("durum"), "eylem": len(sp.get("eylemler") or [])}
    for e in sp.get("eylemler") or []:
        if not any(x.get("t") == e.get("t") and x.get("eylem") == e.get("eylem") for x in (st.get("gecmis") or [])):
            eylemler.append({**e, "eylem": "pi_" + e.get("eylem", "")})
    for a in sp.get("acik") or []:
        acik.append({"sorun": "Pi: " + a.get("sorun", ""), "neden": a.get("neden", "")})
    # ---- 5) şefin çözemediği: Pi bekçisinin bulguları (Pi tarafı) + ns1 bekçisinin onarım sayısı
    k, o, _ = git("show", "origin/main:n8n/sistem_bekci.json")
    try: sb = json.loads(o)
    except Exception: sb = {}
    sbz = zaman(sb.get("t")); sb_dk = (simdi - sbz).total_seconds() / 60 if sbz else 999
    if sb_dk > 40:
        acik.append({"sorun": f"Pi sistem bekçisi {round(sb_dk)} dk'dır sessiz", "neden": "Pi/ağ/elektrik — sahada kontrol gerekir"})
    yakin = any(ts - son.get(x, 0) < 2400 for x in BEKLE)          # son 40 dk içinde şef müdahale etti mi
    for anahtar, mesaj in (sb.get("sorunlar") or {}).items():
        ns1 = anahtar.startswith(("is:", "gec:", "ns1", "api", "veri"))
        if ns1:
            if yakin or not (geciken or ileri):
                continue   # şef üzerinde çalışıyor ya da dışarıdan bakınca düzelmiş (Pi bekçisi bir sonraki turda temizler)
            acik.append({"sorun": mesaj, "neden": "ns1 — " + ("işler kapalı (ETKIN=0)" if dj.get("etkin") is False else "şef müdahale etti, 40 dk'da düzelmedi")})
        else:
            acik.append({"sorun": mesaj, "neden": "Pi tarafı ya da dış servis — şefin çözüm yolu yok"})
    if (bk.get("onarim_24s") or 0) >= 3:
        acik.append({"sorun": f"ns1 son 24 saatte {bk['onarim_24s']} kez kendini onardı", "neden": "kalıcı arıza olabilir"})

    gecmis = (st.get("gecmis") or []) + eylemler
    cikti = {"t": simdi.isoformat(timespec="seconds"), "durum": "mudahale" if eylemler else ("acik" if acik else "sakin"),
             "eylemler": eylemler, "acik": acik[:12], "gozlem": gozlem, "gecmis": gecmis[-40:],
             "kapanan_hatalar": [x["id"] for x in (gh.get("kapanan") or [])] + [x["id"] for x in (gh.get("yeniden") or []) if x.get("ok")],
             "aciklama": "Şef: bekçilerin bulduğu sorunları çözer (rebase/gönderim, gecikmiş işi tetikleme, kapsayıcı yeniden başlatma); çözemediğini 'acik' olarak bildirir."}
    st.update({"son_eylem": son, "gecmis": gecmis[-40:]})
    open(DURUM + ".tmp", "w").write(json.dumps({**cikti, "son_eylem": son, "_son_ozet": st.get("_son_ozet"), "_son_yazim": st.get("_son_yazim", 0), "github": gh}, ensure_ascii=False)); os.replace(DURUM + ".tmp", DURUM)

    # depoya yaz (değişince ya da saatte bir) — panel ve denetçi n8n/sef.json'u okur
    ozet = json.dumps({k: cikti[k] for k in ("durum", "eylemler", "acik")}, ensure_ascii=False, sort_keys=True)
    if ozet != st.get("_son_ozet") or ts - st.get("_son_yazim", 0) > 3600:
        for _ in range(3):
            dx("rm", "-rf", f"{REPO}/.git/rebase-merge", f"{REPO}/.git/rebase-apply", f"{REPO}/.git/MERGE_HEAD", f"{REPO}/.git/index.lock")
            git("fetch", "--depth", "50", "-q", "origin", "main")
            git("checkout", "-B", "main", "origin/main")
            dx("sh", "-c", f"cat > {REPO}/n8n/sef.json", girdi=json.dumps(cikti, ensure_ascii=False, indent=1))
            git("add", "n8n/sef.json")
            if not git("diff", "--cached", "--quiet")[0]:
                break
            git("commit", "-qm", "Şef: " + ("; ".join(e["eylem"] + (" ✓" if e["ok"] else " ✗") for e in eylemler) or cikti["durum"]))
            if not git("push", "-q", "origin", "HEAD:main")[0]:
                break
            time.sleep(3)
        st2 = oku(DURUM, {}); st2.update({"_son_ozet": ozet, "_son_yazim": ts, "gecmis": gecmis[-40:], "github": gh})
        open(DURUM + ".tmp", "w").write(json.dumps(st2, ensure_ascii=False)); os.replace(DURUM + ".tmp", DURUM)
    try: os.remove(D + "/.sef_gh_simdi")
    except OSError: pass
    print(cikti["durum"], len(eylemler), "eylem,", len(acik), "açık")


if __name__ == "__main__":
    main()
