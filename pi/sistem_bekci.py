"""AEMonitoring · Sistem bekçisi (dış gözlemci, saha Pi'sinde; cihaz_detay.py içinden 10 dk'da bir).

ns1 kendi bekçisiyle (sunucu/aesun/bekci.sh) kapsayıcıları onarır; bu modül sunucudan BAĞIMSIZ olarak dışarıdan bakar:
  - merkez API ve ns1 bekçisi yanıt veriyor mu, ns1 bekçisi sorun bildiriyor mu, son 24 saatte kaç onarım yaptı
  - işler zamanında çalışıyor mu (epias-ptf n8n/is_hatalari.json — ns1 tamamen çökse de GitHub'dan okunur)
      Bildirimler 15 dk (sınır 45 dk) · Veri arşivi 1 sa (150 dk) · Durum analizi 1 sa (150 dk)
  - bir iş sınırın iki katını aşarsa YEDEK YOL: aynı iş GitHub'da çalıştırılır (repository_dispatch, iş başına saatte en çok bir)
    → ns1 çökse de bildirimler (bu sorunun uyarısı dahil) ve arşiv aksamaz.
Çıktı: n8n/sistem_bekci.json (bildirim_isler "🖥️ Sistem" uyarısı ve panel bunu okur).
"""
import json, urllib.request
from datetime import datetime

from ortak import AESUN, REPO, TOK, TR, gh, log, zaman

DOSYA = "n8n/sistem_bekci.json"
YEREL = AESUN / "sistem_bekci.json"
API = "https://api.aksarayenerji.net/v1/"
ISLER = {  # iş adı: (sınır dk, yedek olay türü)
    "Bildirimler": (45, "yedek_bildirim"),
    "Veri arşivi": (150, "yedek_arsiv"),
    "Durum analizi": (150, "yedek_analiz"),
}
ARALIK_DK = 10


def _get(yol, sure=20):
    with urllib.request.urlopen(urllib.request.Request(API + yol, headers={"User-Agent": "aesun-pi-bekci"}), timeout=sure) as r:
        return json.loads(r.read())


def _yedek(tur):
    r = urllib.request.Request(REPO.replace("/contents/", "/dispatches"), data=json.dumps({"event_type": tur}).encode(),
                               headers={"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json",
                                        "User-Agent": "aesun-pi", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=30):
        pass


def calis(simdi=None):
    simdi = simdi or datetime.now(TR)
    try:
        st = json.loads(YEREL.read_text()) if YEREL.exists() else {}
    except Exception:
        st = {}
    if st.get("t") and (simdi - zaman(st["t"])).total_seconds() < ARALIK_DK * 60 - 30:
        return None
    sorun, bilgi = {}, {}

    # 1) ns1: API + ns1 bekçisi
    try:
        s = _get("saglik")
        bilgi["api"] = s.get("durum")
        if s.get("durum") != "ok":
            sorun["api"] = f"Merkez API sorunlu: eşitleme {s.get('esitleme_sn_once')} sn önce ({str(s.get('hata') or '')[:60]})"
    except Exception as e:
        sorun["api"] = f"Merkez sunucuya (ns1) ulaşılamıyor: {str(e)[:60]}"
    try:
        b = _get("bekci")
        bilgi["ns1_bekci"] = {k: b.get(k) for k in ("t", "durum", "onarim_24s", "son_onarim")}
        if (b.get("yas_sn") or 0) > 900:
            sorun["ns1_bekci"] = f"ns1 bekçisi {round(b['yas_sn'] / 60)} dk'dır çalışmıyor"
        elif b.get("durum") == "sorun":
            m = "; ".join(x for x in ((b.get("api") or {}).get("sorun"), (b.get("isler") or {}).get("sorun")) if x)
            if m:
                sorun["ns1_sorun"] = f"ns1 bekçisi sorun görüyor: {m[:120]}"
            if (b.get("veri") or {}).get("sorun"):
                sorun["veri"] = f"Eksik veri: {b['veri']['sorun'][:160]}"
            for g in ((b.get("tarama") or {}).get("geciken") or [])[:5]:      # öğrenen tarama: olağan düzenine göre geciken dosya
                sorun["gec:" + g["dosya"]] = f"{g['dosya']} {g['yas_dk']} dk'dır güncellenmedi (olağanı ~{g['olagan_dk']:.0f} dk)"
            for u in ((b.get("uclar") or {}).get("kalan") or [])[:5]:          # duman testi: yanıt vermeyen uç
                sorun["uc:" + u["ad"]] = f"{u['ad']} çalışmıyor — {u['neden']}"
        if (b.get("onarim_24s") or 0) >= 3:
            sorun["ns1_onarim"] = f"ns1 son 24 saatte {b['onarim_24s']} kez kendini onardı — kalıcı bir arıza olabilir"
    except Exception as e:
        if "api" not in sorun:
            sorun["ns1_bekci"] = f"ns1 bekçi durumu okunamadı: {str(e)[:60]}"

    # 2) işler (GitHub'daki kayıttan — ns1'den bağımsız)
    yedek_son = st.get("yedek", {})
    try:
        ih, _ = gh("n8n/is_hatalari.json")
        isler = (ih or {}).get("isler", {})
        for ad, (sinir, tur) in ISLER.items():
            son = (isler.get(ad) or {}).get("son")
            dk = round((simdi - zaman(son)).total_seconds() / 60) if son else None
            bilgi.setdefault("isler", {})[ad] = dk
            if dk is None or dk > sinir:
                sorun["is:" + ad] = f"{ad} {('hiç' if dk is None else str(dk) + ' dk')}'dır çalışmadı (olağan: {'15 dk' if ad == 'Bildirimler' else '1 saat'})"
            if dk is not None and dk > 2 * sinir:
                ys = yedek_son.get(tur)
                if not ys or (simdi - zaman(ys)).total_seconds() > 3600:
                    try:
                        _yedek(tur); yedek_son[tur] = simdi.isoformat(timespec="seconds")
                        log("SİSTEM BEKÇİSİ: yedek yol", ad, "→ GitHub")
                    except Exception as e:
                        sorun["yedek:" + ad] = f"{ad} için yedek yol (GitHub) başlatılamadı: {str(e)[:60]}"
    except Exception as e:
        sorun["is_kaydi"] = f"İş kaydı okunamadı: {str(e)[:60]}"

    durum = "sorun" if sorun else "iyi"
    v = {"t": simdi.isoformat(timespec="seconds"), "durum": durum, "sorunlar": sorun, "bilgi": bilgi, "yedek": yedek_son}
    degisti = (st.get("durum"), sorted(st.get("sorunlar", {}))) != (durum, sorted(sorun))
    if degisti or not st.get("yazildi") or (simdi - zaman(st["yazildi"])).total_seconds() > 1800:
        try:
            _, sha = gh(DOSYA)
            gh(DOSYA, v, sha, f"Sistem bekçisi: {durum}" + (f" ({len(sorun)})" if sorun else ""))
            v["yazildi"] = v["t"]
        except Exception as e:
            log("sistem bekçisi yazılamadı:", e)
    else:
        v["yazildi"] = st.get("yazildi")
    YEREL.write_text(json.dumps(v, ensure_ascii=False))
    if sorun:
        log("SİSTEM BEKÇİSİ:", " | ".join(sorun.values()))
    return v
