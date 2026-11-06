"""Ayarlar ortam değişkenlerinden okunur. Anahtarlar burada yazılmaz; sunucuda kasadan gelir."""
import os
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent


def _liste(ad, varsayilan):
    return [x.strip() for x in os.getenv(ad, varsayilan).split(",") if x.strip()]


def veri_dizin() -> Path:
    d = Path(os.getenv("SOSYAL_VERI", str(KOK / "veri")))
    d.mkdir(parents=True, exist_ok=True)
    return d


def kaynak_dizin() -> Path:
    d = Path(os.getenv("SOSYAL_KAYNAK", str(KOK / "kaynak")))
    d.mkdir(parents=True, exist_ok=True)
    return d


# Görev başına motor sırası: listedeki ilk hazır motor kullanılır, hata verirse sıradakine geçilir.
# Fikir aşamasında listedeki hazır motorların hepsi (en çok 3) aynı anda çalışır.
def roller():
    return {
        "arastirma": _liste("SOSYAL_ROL_ARASTIRMA", "gemini,deneme"),
        "fikir": _liste("SOSYAL_ROL_FIKIR", "gemini,groq,openrouter,ollama,deneme"),
        "yazar": _liste("SOSYAL_ROL_YAZAR", "claude,gemini,openai,groq,openrouter,ollama,deneme"),
        "elestirmen": _liste("SOSYAL_ROL_ELESTIRMEN", "groq,gemini,openrouter,mistral,ollama,deneme"),
        "damitici": _liste("SOSYAL_ROL_DAMITICI", "gemini,claude,groq,openrouter,ollama,deneme"),
    }


def arsiv_gun() -> int:
    """Kapanan sohbetin metni bu kadar gün arşivde bekler, sonra kalıcı silinir (0 = hemen sil)."""
    return int(os.getenv("SOSYAL_SOHBET_ARSIV_GUN", "7"))


def parola() -> str:
    return os.getenv("SOSYAL_PAROLA", "")
