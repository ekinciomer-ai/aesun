import json
import os
import sys
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK))
sys.path.insert(0, str(KOK / "arac"))


@pytest.fixture
def st(tmp_path, monkeypatch):
    for k in list(os.environ):
        if k.endswith("_API_KEY") or k.startswith("SOSYAL_"):
            monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("SOSYAL_VERI", str(tmp_path / "veri"))
    monkeypatch.setenv("SOSYAL_KUYRUK", str(tmp_path / "kuyruk"))
    monkeypatch.setenv("SOSYAL_KAYNAK", str(KOK / "kaynak"))
    from sosyal.uretim import Studyo
    s = Studyo()
    oid = s.oturum_ac("youtube_shorts", "tr", "Tarihi Magazin", "Napolyon köpek")
    s.uret(oid, arastir=False)
    s.onayla(oid)
    return s


def test_seslendirme_metni():
    from sosyal.arac import seslendirme_metni
    m = seslendirme_metni("## Başlık\nX\n## Metin\n[dramatic] **Yıl** 1796. (2 sn) Napolyon evlendi.\n## Sahneler\n1. y")
    assert m == "Yıl 1796. Napolyon evlendi."


def test_is_kuyruga_girer_ve_isci_isler(st, tmp_path, monkeypatch):
    iid = st.h.icerikler()[0]["id"]
    j = st.arac_isi(iid, "video")
    assert j["terimler"] and "Napoleon" in j["terimler"][0]
    st.arac_isi(iid, "ses", "piper")
    from sosyal import arac
    assert [x["durum"] for x in arac.isler()] == ["bekliyor", "bekliyor"]

    import isci
    monkeypatch.setattr(isci, "KUYRUK", tmp_path / "kuyruk")
    monkeypatch.setattr(isci, "araclar", lambda: {"zaman": "2026-11-06T20:00:00", "piper": True})

    def sahte_ses(j, k):
        (k / "ses.mp3").write_bytes(b"ID3")
        return {"dosyalar": ["ses.mp3"], "kalite": {"gecti": True, "engel": [], "uyari": []}}

    def sahte_video(j, k):
        raise RuntimeError("görsel bulunamadı")
    monkeypatch.setattr(isci, "ses_uret", sahte_ses)
    monkeypatch.setattr(isci, "video_uret", sahte_video)
    isci.bir_tur()
    l = {x["tur"]: x for x in arac.isler()}
    assert l["ses"]["durum"] == "bitti" and l["ses"]["dosyalar"] == ["ses.mp3"]
    assert l["video"]["durum"] == "hata" and "görsel" in l["video"]["mesaj"]
    assert arac.dosya_yolu(l["ses"]["id"], "ses.mp3")
    assert arac.dosya_yolu(l["ses"]["id"], "../hafiza.db") is None
    assert arac.araclar_durumu()["piper"] is True


def test_bozuk_is_reddedilir(tmp_path, monkeypatch):
    import isci
    monkeypatch.setattr(isci, "KUYRUK", tmp_path)
    monkeypatch.setattr(isci, "araclar", lambda: {})
    (tmp_path / "bekleyen").mkdir()
    (tmp_path / "bekleyen" / "x.json").write_text(json.dumps({"id": "../kotu", "tur": "ses", "dil": "tr"}))
    isci.bir_tur()
    assert (tmp_path / "bekleyen" / "x.bozuk").exists() and not list((tmp_path / "cikti").iterdir())


def test_web_arac(st):
    from sosyal.web import create_app
    c = create_app(st).test_client()
    iid = st.h.icerikler()[0]["id"]
    assert c.post(f"/api/icerik/{iid}/arac", json={"tur": "ses", "ses": "piper"}).status_code == 200
    assert c.post(f"/api/icerik/{iid}/arac", json={"tur": "kotu"}).status_code == 400
    assert c.get("/api/isler").json["isler"][0]["durum"] == "bekliyor"
    assert c.get("/api/is/20260101000000_abcdef/ses.mp3").status_code == 404


def test_tekrar_engeli_iptal_ve_ayri_siralar(st, tmp_path, monkeypatch):
    from sosyal import arac
    from sosyal.uretim import UretimHatasi
    iid = st.h.icerikler()[0]["id"]
    v = st.arac_isi(iid, "video")
    with pytest.raises(UretimHatasi):
        st.arac_isi(iid, "video")          # aynı iş ikinci kez girmez
    sj = st.arac_isi(iid, "ses", "piper")  # farklı tür girer
    import isci
    monkeypatch.setattr(isci, "KUYRUK", tmp_path / "kuyruk")
    monkeypatch.setattr(isci, "araclar", lambda: {})
    calisan = []
    monkeypatch.setattr(isci, "ses_uret", lambda j, k: calisan.append("ses") or {"dosyalar": []})
    monkeypatch.setattr(isci, "video_uret", lambda j, k: calisan.append("video") or {"dosyalar": []})
    isci.bir_tur("ses")                    # ses sırası videoyu beklemez, ona dokunmaz
    assert calisan == ["ses"]
    assert {x["id"]: x["durum"] for x in arac.isler()}[v["id"]] == "bekliyor"
    assert arac.iptal(v["id"]) and not arac.iptal(v["id"])
    assert (tmp_path / "kuyruk" / "iptal" / f"{v['id']}.json").exists()   # silinmedi, arşivde
    assert not arac.iptal(sj["id"])        # başlamış iş iptal edilemez
