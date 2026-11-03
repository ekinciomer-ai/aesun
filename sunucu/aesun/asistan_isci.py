#!/usr/bin/env python3
"""Merkez Sunucu (159.198.76.80) Antigravity Asistan & Canlı YouTube Komut İşçisi.

aesun-api kapsayıcısı (/veri/asistan/kuyruk) üzerinden gelen yönetici onaylı
istekleri root yetkisiyle (/opt/aesun/youtube OAuth anahtarlarını kullanarak) işler.
Hiçbir şifre, anahtar veya token çıktıya/dosyaya YAZILMAZ.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

TZ = timezone(timedelta(hours=3))
YT_DIR = Path("/opt/aesun/youtube")
KANALLAR = {
    "TR": ("UC77LyY3gqWmBNAKp2lbsGBg", "Antik Stüdyo"),
    "EN": ("UCFLJUlhUSgjcLbp9ad_t9PQ", "Ancient Studio"),
}


def veri_kok_bul() -> Path:
    env_p = os.environ.get("ASISTAN_VERI", "")
    if env_p and os.path.isdir(env_p):
        return Path(env_p)
    try:
        out = subprocess.check_output(
            ["docker", "inspect", "aesun-api", "--format",
             '{{range .Mounts}}{{if eq .Destination "/veri"}}{{.Source}}{{end}}{{end}}'],
            text=True, timeout=10
        ).strip()
        if out and os.path.isdir(out):
            return Path(out) / "asistan"
    except Exception:
        pass
    return Path("/var/lib/docker/volumes/aesun_aesun_veri/_data/asistan")


KOK = veri_kok_bul()
KUYRUK = KOK / "kuyruk"
DURUM_DOSYA = KOK / "durum.json"
MESAJ_DOSYA = KOK / "mesajlar.json"


def izin_ayarla(p: Path):
    try:
        os.chown(p, 1001, 1001)
    except Exception:
        pass


def klasor_hazirla():
    KOK.mkdir(parents=True, exist_ok=True)
    KUYRUK.mkdir(parents=True, exist_ok=True)
    izin_ayarla(KOK)
    izin_ayarla(KUYRUK)
    if not MESAJ_DOSYA.exists():
        mesaj_kaydet([
            {
                "id": "hosgeldin",
                "kim": "asistan",
                "zaman": datetime.now(TZ).isoformat(timespec="seconds"),
                "metin": (
                    "Merhaba Ömer! Merkez Sunucu (159.198.76.80) üzerinden doğrudan bağlısınız. "
                    "Buradan YouTube kanallarını (Antik Stüdyo TR & Ancient Studio EN) canlı yönetebilir, "
                    "videoların yayın saatini/başlığını değiştirebilir, yeni video yükleyebilir veya bana görev bırakabilirsiniz."
                ),
            }
        ])


def mesajlari_oku() -> list:
    try:
        if MESAJ_DOSYA.exists():
            return json.loads(MESAJ_DOSYA.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def mesaj_kaydet(liste: list):
    liste = liste[-100:]
    tmp = MESAJ_DOSYA.with_suffix(".tmp")
    tmp.write_text(json.dumps(liste, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, MESAJ_DOSYA)
    izin_ayarla(MESAJ_DOSYA)


def mesaj_ekle(kim: str, metin: str, ek: dict = None):
    m = mesajlari_oku()
    kayit = {
        "id": f"m_{int(time.time()*1000)}",
        "kim": kim,
        "zaman": datetime.now(TZ).isoformat(timespec="seconds"),
        "metin": metin,
    }
    if ek:
        kayit.update(ek)
    m.append(kayit)
    mesaj_kaydet(m)
    return kayit


def get_access_token(cid: str) -> str:
    ist = json.loads((YT_DIR / "istemci.json").read_text(encoding="utf-8"))
    kf = json.loads((YT_DIR / "kanallar" / f"{cid}.json").read_text(encoding="utf-8"))
    body = urllib.parse.urlencode({
        "client_id": ist["client_id"],
        "client_secret": ist["client_secret"],
        "refresh_token": kf["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.load(resp)["access_token"]


def yt_api(url: str, token: str, method: str = "GET", data: dict = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    raw = None
    if data is not None:
        raw = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=UTF-8"
    req = urllib.request.Request(url, data=raw, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def sunucu_ozet() -> dict:
    out = {"zaman": datetime.now(TZ).isoformat(timespec="seconds")}
    try:
        ps = subprocess.check_output(
            ["docker", "ps", "--format", "{{.Names}}:{{.Status}}"], text=True, timeout=8
        ).strip().splitlines()
        out["kapsayicilar"] = ps
    except Exception:
        out["kapsayicilar"] = []
    try:
        mem = subprocess.check_output(["free", "-m"], text=True, timeout=5).splitlines()
        for l in mem:
            if l.startswith("Mem:"):
                p = l.split()
                out["bellek"] = f"{p[6]} MB boş / {p[1]} MB"
    except Exception:
        out["bellek"] = "?"
    try:
        df = subprocess.check_output(["df", "-h", "/"], text=True, timeout=5).splitlines()[-1].split()
        out["disk"] = f"{df[2]} / {df[1]} ({df[4]})"
    except Exception:
        out["disk"] = "?"
    return out


def durum_guncelle(yedek_al: bool = False) -> dict:
    videolar = []
    kanal_ozet = {}
    yedek_veri = {"zaman": datetime.now(TZ).isoformat(timespec="seconds"), "kanallar": {}}

    for dil, (cid, kad) in KANALLAR.items():
        try:
            tok = get_access_token(cid)
            ch = yt_api(
                f"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id={cid}",
                tok
            ).get("items", [{}])[0]
            st_ch = ch.get("statistics", {})
            kanal_ozet[dil] = {
                "id": cid,
                "ad": kad,
                "abone": int(st_ch.get("subscriberCount", 0)),
                "izlenme": int(st_ch.get("viewCount", 0)),
                "video_sayisi": int(st_ch.get("videoCount", 0)),
            }
            uploads_pid = "UU" + cid[2:]
            u = f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={uploads_pid}&maxResults=50"
            vids = [it["contentDetails"]["videoId"] for it in yt_api(u, tok).get("items", [])]
            if vids:
                u2 = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id={','.join(vids[:50])}"
                items = yt_api(u2, tok).get("items", [])
                yedek_veri["kanallar"][cid] = items
                for v in items:
                    sn = v.get("snippet", {})
                    st = v.get("status", {})
                    stat = v.get("statistics", {})
                    cd = v.get("contentDetails", {})
                    gz = st.get("privacyStatus", "private")
                    pub_at = st.get("publishAt", "")
                    if gz == "public":
                        durum_etiket = "Yayında"
                        zaman_str = sn.get("publishedAt", "")
                    elif pub_at:
                        durum_etiket = "Planlı"
                        zaman_str = pub_at
                    else:
                        durum_etiket = "Özel"
                        zaman_str = sn.get("publishedAt", "")
                    tr_tarih, tr_saat = "", ""
                    if zaman_str:
                        try:
                            dt_obj = datetime.fromisoformat(zaman_str.replace("Z", "+00:00")).astimezone(TZ)
                            tr_tarih = dt_obj.strftime("%Y-%m-%d")
                            tr_saat = dt_obj.strftime("%H:%M")
                        except Exception:
                            pass
                    videolar.append({
                        "vid": v["id"],
                        "dil": dil,
                        "kanal": kad,
                        "baslik": sn.get("title", ""),
                        "aciklama": sn.get("description", ""),
                        "etiketler": sn.get("tags", []),
                        "categoryId": sn.get("categoryId", "27"),
                        "durum": durum_etiket,
                        "privacyStatus": gz,
                        "publishAt": pub_at,
                        "tarih": tr_tarih,
                        "saat": tr_saat,
                        "izlenme": int(stat.get("viewCount", 0)),
                        "begeni": int(stat.get("likeCount", 0)),
                        "yorum": int(stat.get("commentCount", 0)),
                        "sure": cd.get("duration", ""),
                        "link": f"https://youtube.com/shorts/{v['id']}",
                    })
        except Exception as e:
            kanal_ozet[dil] = {"id": cid, "ad": kad, "hata": str(e)[:160]}

    if yedek_al and yedek_veri["kanallar"]:
        yd = YT_DIR / "yedek"
        yd.mkdir(parents=True, exist_ok=True)
        yf = yd / f"durum_{datetime.now(TZ).strftime('%Y%m%d_%H%M%S')}.json"
        yf.write_text(json.dumps(yedek_veri, ensure_ascii=False, indent=1), encoding="utf-8")
        os.chmod(yf, 0o600)

    videolar.sort(key=lambda x: (0 if x["durum"] == "Planlı" else (1 if x["durum"] == "Özel" else 2),
                                 x.get("tarih", ""), x.get("saat", "")), reverse=False)
    durum = {
        "guncellendi": datetime.now(TZ).isoformat(timespec="seconds"),
        "sunucu": sunucu_ozet(),
        "kanallar": kanal_ozet,
        "videolar": videolar,
    }
    tmp = DURUM_DOSYA.with_suffix(".tmp")
    tmp.write_text(json.dumps(durum, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, DURUM_DOSYA)
    izin_ayarla(DURUM_DOSYA)
    return durum


def video_guncelle(istek: dict) -> str:
    vid = str(istek.get("vid", "")).strip()
    dil = str(istek.get("dil", "TR")).strip().upper()
    if not vid or dil not in KANALLAR:
        raise ValueError("Geçersiz video ID veya dil")
    cid, kad = KANALLAR[dil]
    # Önce yedek al
    durum_guncelle(yedek_al=True)
    tok = get_access_token(cid)
    mevcut = yt_api(
        f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id={vid}",
        tok
    ).get("items", [])
    if not mevcut:
        raise ValueError(f"Video bulunamadı: {vid}")
    v = mevcut[0]
    sn = v["snippet"]
    st = v["status"]

    yeni_baslik = istek.get("baslik")
    if yeni_baslik:
        sn["title"] = str(yeni_baslik).strip()[:100]
    if "aciklama" in istek and istek["aciklama"] is not None:
        sn["description"] = str(istek["aciklama"])
    if not sn.get("categoryId"):
        sn["categoryId"] = "27"

    plan_tarih = str(istek.get("tarih", "")).strip()
    plan_saat = str(istek.get("saat", "")).strip()
    gizlilik = str(istek.get("privacyStatus", "")).strip()

    yeni_status = {
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": True,
    }
    if plan_tarih and plan_saat:
        yeni_status["privacyStatus"] = "private"
        yeni_status["publishAt"] = f"{plan_tarih}T{plan_saat}:00+03:00"
    elif gizlilik in ("private", "public", "unlisted"):
        yeni_status["privacyStatus"] = gizlilik
    else:
        yeni_status["privacyStatus"] = st.get("privacyStatus", "private")
        if st.get("publishAt"):
            yeni_status["publishAt"] = st["publishAt"]

    yt_api(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
        tok,
        method="PUT",
        data={"id": vid, "snippet": {
            "title": sn["title"],
            "description": sn.get("description", ""),
            "tags": sn.get("tags", []),
            "categoryId": sn.get("categoryId", "27"),
            "defaultLanguage": "tr" if dil == "TR" else "en",
            "defaultAudioLanguage": "tr" if dil == "TR" else "en",
        }, "status": yeni_status}
    )
    durum_guncelle(yedek_al=False)
    ozet = f"{kad} ({dil}) · `{vid}` güncellendi: `{sn['title'][:55]}`"
    if yeni_status.get("publishAt"):
        ozet += f" → Planlı: {plan_tarih} {plan_saat} TSİ"
    else:
        ozet += f" → Durum: {yeni_status['privacyStatus']}"
    return ozet


def video_yukle(istek: dict) -> str:
    dil = str(istek.get("dil", "TR")).strip().upper()
    url = str(istek.get("url", "")).strip()
    baslik = str(istek.get("baslik", "")).strip()
    aciklama = str(istek.get("aciklama", "")).strip()
    tarih = str(istek.get("tarih", "")).strip()
    saat = str(istek.get("saat", "")).strip()
    if dil not in KANALLAR or not url or not baslik:
        raise ValueError("Kanal dili, video URL ve başlık zorunludur.")
    cid, kad = KANALLAR[dil]
    durum_guncelle(yedek_al=True)
    medya_dir = YT_DIR / "medya"
    medya_dir.mkdir(parents=True, exist_ok=True)
    yerel = medya_dir / f"panel_{int(time.time())}.mp4"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(yerel, "wb") as f:
        while True:
            b = r.read(262144)
            if not b:
                break
            f.write(b)
    boyut = yerel.stat().st_size
    if boyut < 50000:
        yerel.unlink(missing_ok=True)
        raise ValueError("İndirilen video dosyası çok küçük veya geçersiz.")
    tok = get_access_token(cid)
    lang_code = "tr" if dil == "TR" else "en"
    snippet = {
        "title": baslik[:100],
        "description": aciklama,
        "categoryId": "27",
        "defaultLanguage": lang_code,
        "defaultAudioLanguage": lang_code,
    }
    status_obj = {
        "privacyStatus": "private",
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": True,
    }
    if tarih and saat:
        status_obj["publishAt"] = f"{tarih}T{saat}:00+03:00"
    init_req = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        data=json.dumps({"snippet": snippet, "status": status_obj}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": str(boyut),
            "X-Upload-Content-Type": "video/mp4",
        },
        method="POST",
    )
    with urllib.request.urlopen(init_req, timeout=30) as resp:
        loc = resp.headers.get("Location")
    up_req = urllib.request.Request(
        loc,
        data=yerel.read_bytes(),
        headers={"Content-Type": "video/mp4", "Content-Length": str(boyut)},
        method="PUT",
    )
    with urllib.request.urlopen(up_req, timeout=300) as up_resp:
        sonuc = json.load(up_resp)
    yerel.unlink(missing_ok=True)
    vid = sonuc["id"]
    durum_guncelle(yedek_al=False)
    return f"{kad} ({dil}) kanalına yüklendi! Video ID: `{vid}` · https://youtube.com/shorts/{vid}"


def sohbet_yanitla(metin: str) -> str:
    m_low = metin.lower().strip()
    # 1. "planla <vid> YYYY-MM-DD HH:MM" komutu
    m_plan = re.search(r"planla\s+([A-Za-z0-9_-]{11})\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})", metin, re.I)
    if m_plan:
        vid, tarih, saat = m_plan.group(1), m_plan.group(2), m_plan.group(3)
        d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
        v = next((x for x in d.get("videolar", []) if x["vid"] == vid), None)
        dil = v["dil"] if v else "TR"
        sonuc = video_guncelle({"vid": vid, "dil": dil, "tarih": tarih, "saat": saat})
        return f"✅ {sonuc}"

    # 2. Kanal / video / plan sorgusu
    if any(k in m_low for k in ("plan", "video", "youtube", "kanal", "yenile", "liste", "durum", "sunucu")):
        d = durum_guncelle(yedek_al=("yedek" in m_low))
        vids = d.get("videolar", [])
        planli = [v for v in vids if v["durum"] == "Planlı"]
        ozel = [v for v in vids if v["durum"] == "Özel"]
        yayinda = [v for v in vids if v["durum"] == "Yayında"]
        satirlar = [
            f"📡 **Merkez Sunucu (159.198.76.80) Canlı Raporu ({d['guncellendi'][11:16]} TSİ):**",
            f"- **Sunucu:** Bellek {d['sunucu'].get('bellek', '?')} · Disk {d['sunucu'].get('disk', '?')}",
            f"- **YouTube Toplam:** {len(planli)} Planlı · {len(ozel)} Özel/Taslak · {len(yayinda)} Yayında",
            "",
            "**Yaklaşan Planlı Videolar:**",
        ]
        for v in sorted(planli, key=lambda x: (x.get("tarih", ""), x.get("saat", "")))[:12]:
            satirlar.append(f"- `{v['tarih']} {v['saat']}` [{v['dil']}] **{v['baslik'][:52]}** (`{v['vid']}`)")
        return "\n".join(satirlar)

    # 3. Genel talimat / mesaj kaydı
    return (
        f"📝 Mesajınız Merkez Sunucu (`159.198.76.80`) görev kutusuna kaydedildi:\n"
        f"> {metin}\n\n"
        f"Canlı YouTube işlemleri için sağdaki/aşağıdaki video listesinden **Saat Planla / Düzenle** butonlarını "
        f"veya `planla <video_id> YYYY-AA-GG SS:DD` komutunu da anında kullanabilirsiniz."
    )


def istek_isle(istek: dict) -> dict:
    tip = istek.get("tip", "durum")
    if tip == "durum" or tip == "yt_yenile":
        d = durum_guncelle(yedek_al=bool(istek.get("yedek")))
        if istek.get("yedek"):
            mesaj_ekle("asistan", "💾 Her iki YouTube kanalının güncel yedeği `/opt/aesun/youtube/yedek/` altına alındı ve liste yenilendi.")
        return {"tamam": True, "durum": d, "mesajlar": mesajlari_oku()}

    if tip == "yt_planla":
        ozet = video_guncelle(istek)
        mesaj_ekle("asistan", f"✅ {ozet}")
        return {"tamam": True, "bilgi": ozet, "durum": json.loads(DURUM_DOSYA.read_text(encoding="utf-8")), "mesajlar": mesajlari_oku()}

    if tip == "yt_yukle":
        ozet = video_yukle(istek)
        mesaj_ekle("asistan", f"🚀 {ozet}")
        return {"tamam": True, "bilgi": ozet, "durum": json.loads(DURUM_DOSYA.read_text(encoding="utf-8")), "mesajlar": mesajlari_oku()}

    if tip == "sohbet":
        metin = str(istek.get("metin", "")).strip()
        if not metin:
            raise ValueError("Mesaj boş olamaz.")
        mesaj_ekle("kullanici", metin)
        yanit = sohbet_yanitla(metin)
        mesaj_ekle("asistan", yanit)
        d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
        return {"tamam": True, "yanit": yanit, "durum": d, "mesajlar": mesajlari_oku()}

    raise ValueError(f"Bilinmeyen işlem tipi: {tip}")


def main():
    klasor_hazirla()
    son_otomatik = 0.0
    print(f"asistan_isci basladi: {KOK}", flush=True)
    while True:
        try:
            if time.time() - son_otomatik > 900 or not DURUM_DOSYA.exists():
                durum_guncelle(yedek_al=False)
                son_otomatik = time.time()
            for p in sorted(KUYRUK.glob("istek_*.json")):
                stem = p.stem.replace("istek_", "", 1)
                yanit_yol = KUYRUK / f"yanit_{stem}.json"
                try:
                    istek = json.loads(p.read_text(encoding="utf-8"))
                    sonuc = istek_isle(istek)
                except urllib.error.HTTPError as e:
                    err_body = e.read().decode("utf-8", errors="replace")[:200]
                    sonuc = {"tamam": False, "hata": f"YouTube API HTTP {e.code}: {err_body}"}
                except Exception as e:
                    sonuc = {"tamam": False, "hata": str(e)[:200]}
                finally:
                    p.unlink(missing_ok=True)
                tmp = yanit_yol.with_suffix(".tmp")
                tmp.write_text(json.dumps(sonuc, ensure_ascii=False), encoding="utf-8")
                os.replace(tmp, yanit_yol)
                izin_ayarla(yanit_yol)
            # Eski yanıt dosyalarını temizle (>120 sn)
            simdi = time.time()
            for y in KUYRUK.glob("yanit_*.json"):
                if simdi - y.stat().st_mtime > 120:
                    y.unlink(missing_ok=True)
        except Exception as e:
            print("dongu hatasi:", str(e)[:160], flush=True)
        time.sleep(0.4)


if __name__ == "__main__":
    main()
