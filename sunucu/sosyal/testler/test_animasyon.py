import os
import sys
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


def test_format_listesi():
    from sosyal import kaynaklar
    l = kaynaklar.animasyon_formatlari()
    for ad in ("Kâğıt Masal", "Kâğıt Arayış", "Bu Neden Var?", "Gerçek Olay", "Sen Karar Ver", "Nesnenin Hayatı",
               "Harita Yolculuğu", "Eskiden / Şimdi", "Sayaç Yarışı", "POV Tarih"):
        assert ad in l, ad


def test_secilen_format_tam_girer_digerleri_girmez(st):
    oid = st.oturum_ac("youtube_shorts", "tr", "Animasyon · Bu Neden Var?", "Çay bardağı neden ince belli?")
    o = st.h.oturum(oid)
    b = st.baglam(o)
    assert "ANİMASYON FORMATI" in b and "Bu Neden Var?" in b and "#0f3b3d" in b and "Format seçimi" in b
    assert "Wascemal" not in b.split("ANİMASYON FORMATI")[1].split("KULLANICININ KAYNAK")[0]  # başka format girmez
    assert "Sahne planı" in st._cikti(o)


def test_animasyon_olmayan_icerige_girmez(st):
    o = st.h.oturum(st.oturum_ac("youtube_shorts", "tr", "Tarihi Magazin", "Napolyon"))
    assert "ANİMASYON FORMATI" not in st.baglam(o) and "Sahne planı" not in st._cikti(o)
    o2 = st.h.oturum(st.oturum_ac("youtube_shorts", "tr", "", "bir animasyon yap: bakkal"))
    assert "Format seçimi" in st.baglam(o2)
