import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def ortam(tmp_path, monkeypatch):
    for k in list(os.environ):
        if k.endswith("_API_KEY") or k == "OLLAMA_URL" or k.startswith("SOSYAL_"):
            monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("SOSYAL_VERI", str(tmp_path / "veri"))
    monkeypatch.setenv("SOSYAL_KAYNAK", str(Path(__file__).resolve().parent.parent / "kaynak"))
    monkeypatch.setenv("SOSYAL_DENEME", "1")
    from sosyal.uretim import Studyo
    return Studyo()


def test_tam_dongu_ogrenir_ve_sohbeti_siler(ortam):
    st = ortam
    oid = st.oturum_ac("youtube_shorts", "tr", "Tarihi Magazin", "Napolyon ve köpek Fortuné")
    d = st.uret(oid)
    assert d["son"] and d["denetim"] is not None
    asamalar = {m["asama"] for m in d["mesajlar"]}
    assert {"arastirma", "fikir", "taslak", "elestiri", "son"} <= asamalar
    st.geri_bildirim(oid, "Kancayı her zaman bir rakamla aç")
    st.onayla(oid, puan=4)
    s = st.kapat(oid)
    assert s["ogrenilen"] and s["silinen_mesaj"] > 0
    assert st.h.mesajlar(oid) == []                      # sohbet silindi
    assert st.h.sayilar()["arsiv_mesajlar"] == 1         # önce arşive alındı
    assert st.h.icerikler()[0]["puan"] == 4              # içerik kaydı kaldı
    # yeni sohbet öğrenileni ve kaynak dosyaları okur
    oid2 = st.oturum_ac("youtube_shorts", "tr", "Tarihi Magazin", "Kleopatra balık şakası")
    b = st.baglam(st.h.oturum(oid2))
    assert "rakamla" in b and "KAYNAK DOSYALARI" in b and "Napolyon ve köpek" in b
    assert (Path(os.environ["SOSYAL_VERI"]) / "HAFIZA.md").read_text().count("rakamla") >= 1


def test_kapali_sohbete_yazilmaz(ortam):
    from sosyal.uretim import UretimHatasi
    oid = ortam.oturum_ac("x", "tr", "", "deneme")
    ortam.kapat(oid)
    with pytest.raises(UretimHatasi):
        ortam.uret(oid)


def test_yetenek_tekrar_eklenmez(ortam):
    h = ortam.h
    a = h.yetenek_ekle("tercih", "Kanca rakamla açılır", "x")
    b = h.yetenek_ekle("tercih", "kanca rakamla açılır", "y")
    assert a == b and h.yetenekler()[0]["guven"] > 0.6


def test_denetim():
    from sosyal.denetim import denetle
    uzun = "## Metin\n" + "a" * 300 + "\n## Kaynaklar\n- x"
    assert not denetle(uzun, "x")["gecti"]
    d = denetle("## Başlık\nRonaldo TR\n## Metin\nkısa\n## Açıklama\nnot\n## Kaynaklar\n", "youtube_shorts")
    assert d["gecti"] and any("TR/EN/ES" in u for u in d["uyari"]) and any("yapay zekâ" in u for u in d["uyari"])


def test_kaynak_kurallari_hep_gelir(ortam):
    from sosyal import kaynaklar
    b = kaynaklar.baglam("alakasız bir konu")
    assert "Kalıcı kurallar" in b or "Kesin Kurallar" in b


def test_web(ortam, monkeypatch):
    monkeypatch.setenv("SOSYAL_PAROLA", "gizli")
    from sosyal.web import create_app
    c = create_app(ortam).test_client()
    assert c.get("/saglik").status_code == 200
    assert c.get("/api/durum").status_code == 401
    assert c.post("/api/giris", json={"parola": "yanlis"}).status_code == 401
    assert c.post("/api/giris", json={"parola": "gizli"}).status_code == 200
    oid = c.post("/api/oturum", json={"platform": "tiktok", "dil": "en", "konu": "Vikings"}).json["id"]
    assert c.post(f"/api/oturum/{oid}/uret", json={}).json["durum"] == "calisiyor"
    import time
    for _ in range(50):
        d = c.get(f"/api/oturum/{oid}").json
        if not d["is_durumu"]:
            break
        time.sleep(0.1)
    assert d["son"] and not d["is_durumu"]
    assert "YAZAR" in c.get(f"/api/oturum/{oid}/elle").json["paket"]
    assert c.post(f"/api/oturum/{oid}/kapat").status_code == 200
    assert c.get("/").status_code == 200


def test_gemini_yedek_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    from sosyal import motorlar
    g = motorlar.Gemini()
    denenen = []

    def sahte(model, *a):
        denenen.append(model)
        if model == g.model:
            raise motorlar.MotorHatasi("zaman aşımı")
        return "tamam"
    monkeypatch.setattr(g, "_yaz", sahte)
    assert g.yaz("s", "m") == "tamam" and denenen == [g.model, "gemini-flash-lite-latest"]


def test_adressiz_kaynak_uyarilir():
    from sosyal.denetim import denetle
    d = denetle("## Metin\nkısa metin\n## Kaynaklar\n- Biyografiler (Doğrulandı)", "facebook")
    assert any("adres yok" in u for u in d["uyari"])
    d = denetle("## Metin\nkısa metin\n## Kaynaklar\n- https://bbc.com/x", "facebook")
    assert not any("adres" in u for u in d["uyari"])
