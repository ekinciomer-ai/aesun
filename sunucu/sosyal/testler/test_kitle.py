import os
import sys
from datetime import date
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK))


@pytest.fixture
def st(tmp_path, monkeypatch):
    for k in list(os.environ):
        if k.endswith("_API_KEY") or k.startswith("SOSYAL_"):
            monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("SOSYAL_VERI", str(tmp_path / "veri"))
    monkeypatch.setenv("SOSYAL_KAYNAK", str(KOK / "kaynak"))
    from sosyal.uretim import Studyo
    return Studyo()


def test_her_dil_kendi_kitlesini_tam_okur(st):
    for dil, var, yok in (("tr", "## TR", ["## EN", "## ES"]), ("en", "## EN", ["## TR", "## ES"]),
                          ("es", "## ES", ["## TR", "## EN"])):
        oid = st.oturum_ac("youtube_shorts", dil, "Tarihi Magazin", "rastgele bir konu")
        b = st.baglam(st.h.oturum(oid))
        assert "HEDEF KİTLE" in b and var in b and "## Ortak kurallar" in b and "ÖZEL GÜNLER" in b
        assert all(y not in b for y in yok)
        for baslik in ("Siyaset", "Gündem", "Spor", "İzleme alışkanlıkları", "Kültür", "Etkileşim", "Özel günler", "Medya"):
            assert baslik in b, (dil, baslik)
        assert "Müzik" in b and "Fotoğraf" in b and "Video" in b and "Ses" in b


def test_takvim():
    from sosyal import takvim
    assert takvim.paskalya(2026) == date(2026, 4, 5)
    en = takvim.metin("en", date(2026, 11, 6))
    assert "26.11.2026" in en and "Thanksgiving" in en and "Black Friday" in en
    tr = takvim.metin("tr", date(2026, 11, 6))
    assert "YAYIN YAPILMAZ" in tr and "Öğretmenler" in tr
    assert "Día de Muertos" in takvim.metin("es", date(2026, 10, 20))


def test_denetim_kitle_ve_medya():
    from sosyal.denetim import denetle
    eksik = denetle("## Başlık\nX #shorts\n## Metin\nkısa metin\n## Kaynaklar\n- https://a.b", "youtube_shorts")
    u = " ".join(eksik["uyari"])
    assert "Hedef kitle" in u and "Ses ve müzik" in u and "Görsel ve video" in u
    lis = denetle("## Metin\nmetin\n## Ses ve müzik\nEpik bir şarkı\n## Kaynaklar\n- https://a.b", "tiktok")
    assert any("lisansı" in x for x in lis["uyari"])
    s = denetle("## Metin\nSeçim öncesi CHP ve iktidar\n## Kaynaklar\n- https://a.b", "x")
    assert any("Siyasi" in x for x in s["uyari"])
    y = denetle("## Metin\nmetin\n## Yayın saati önerisi\n10 Kasım 20:00\n## Kaynaklar\n- https://a.b", "youtube_shorts", "tr")
    assert not y["gecti"] and "yayın yapılmayan" in y["engel"][0]
    assert denetle("## Metin\nmetin\n## Yayın saati önerisi\n10 Kasım 20:00", "youtube_shorts", "en")["gecti"]


def test_dile_ozgu_ders_yalniz_kendi_diline(st):
    st.h.yetenek_ekle("tercih", "[EN] Efsane çürütme kancası tutuyor", "EN kitlesinde 'everything you know is wrong'")
    st.h.yetenek_ekle("tercih", "Kanca rakamla açılır", "her dil")
    tr = st.oturum_ac("youtube_shorts", "tr", "", "konu")
    en = st.oturum_ac("youtube_shorts", "en", "", "konu")
    btr, ben = st.baglam(st.h.oturum(tr)), st.baglam(st.h.oturum(en))
    assert "Efsane çürütme" not in btr and "Efsane çürütme" in ben and "rakamla" in btr and "rakamla" in ben
