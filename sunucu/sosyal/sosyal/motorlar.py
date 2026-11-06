"""Yapay zekâ motorları. Hepsi aynı arayüzle çalışır: hazir() ve yaz(sistem, mesaj).

Ücretsiz/ucuz olanlar önce gelir (Gemini, Groq, OpenRouter ücretsiz modeller, Ollama).
Claude iki yolla bağlanır: API anahtarı varsa doğrudan, yoksa "elle" (paket kopyalanır, cevap yapıştırılır).
Anahtarlar yalnız ortam değişkeninden okunur; hata mesajlarında anahtar görünmez.
"""
import json
import os
import re
import threading
import urllib.error
import urllib.request

ZAMAN_ASIMI = int(os.getenv("SOSYAL_ZAMAN_ASIMI", "180"))
_GIZLI = re.compile(r"(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{16,}|gsk_[0-9A-Za-z]{16,}|key=[^&\s]+)")


class MotorHatasi(Exception):
    pass


_YEREL = threading.local()


def _kullanim(model, giris, cikis):
    """Son çağrının token sayıları (motorun bildirdiği). Aynı iş parçacığında son_kullanim() ile okunur."""
    _YEREL.k = {"model": model, "giris": int(giris or 0), "cikis": int(cikis or 0)}


def son_kullanim():
    k = getattr(_YEREL, "k", None)
    _YEREL.k = None
    return k


def _maskele(s) -> str:
    return _GIZLI.sub("***", str(s))[:300]


def _post(url, govde, basliklar):
    istek = urllib.request.Request(url, data=json.dumps(govde).encode(), method="POST",
                                   headers={"Content-Type": "application/json", **basliklar})
    try:
        with urllib.request.urlopen(istek, timeout=ZAMAN_ASIMI) as c:
            return json.loads(c.read().decode())
    except urllib.error.HTTPError as e:
        raise MotorHatasi(f"HTTP {e.code}: {_maskele(e.read().decode(errors='ignore'))}") from None
    except Exception as e:  # ağ, zaman aşımı, bozuk cevap
        raise MotorHatasi(_maskele(e)) from None


class Motor:
    ad = ""
    etiket = ""
    ucretsiz = True
    arama = False  # web'de arayıp kaynak gösterebiliyor mu

    def hazir(self) -> bool:
        return False

    def yaz(self, sistem: str, mesaj: str, sicaklik: float = 0.7, ara: bool = False) -> str:
        raise NotImplementedError

    def bilgi(self):
        return {"ad": self.ad, "etiket": self.etiket, "hazir": self.hazir(), "ucretsiz": self.ucretsiz,
                "model": getattr(self, "model", ""), "nasil": NASIL.get(self.ad, "")}


class OpenAIUyumlu(Motor):
    """Groq, OpenRouter, Ollama, Mistral, DeepSeek, OpenAI: hepsi aynı sohbet biçimini kullanır."""

    def __init__(self, ad, etiket, url, anahtar_env, model_env, model, ucretsiz=True, anahtarsiz=False):
        self.ad, self.etiket, self._url, self._anahtar_env = ad, etiket, url, anahtar_env
        self.model = os.getenv(model_env, model)
        self.ucretsiz, self._anahtarsiz = ucretsiz, anahtarsiz

    @property
    def url(self):
        if self.ad == "ollama":
            return os.getenv("OLLAMA_URL", "").rstrip("/") + "/v1/chat/completions"
        return self._url

    def hazir(self):
        if self.ad == "ollama":
            return bool(os.getenv("OLLAMA_URL"))
        return bool(os.getenv(self._anahtar_env))

    def yaz(self, sistem, mesaj, sicaklik=0.7, ara=False):
        b = {}
        if os.getenv(self._anahtar_env):
            b["Authorization"] = "Bearer " + os.getenv(self._anahtar_env)
        cevap = _post(self.url, {"model": self.model, "temperature": sicaklik,
                                 "messages": [{"role": "system", "content": sistem},
                                              {"role": "user", "content": mesaj}]}, b)
        u = cevap.get("usage") or {}
        _kullanim(self.model, u.get("prompt_tokens"), u.get("completion_tokens"))
        try:
            return cevap["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError):
            raise MotorHatasi("beklenmeyen cevap: " + _maskele(cevap)) from None


class Gemini(Motor):
    ad, etiket, arama = "gemini", "Google Gemini", True

    def __init__(self):
        self.model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
        # Ana model yetişmezse sırayla denenir (aynı ücretsiz anahtar).
        self.yedekler = [x.strip() for x in os.getenv("GEMINI_YEDEK", "gemini-flash-lite-latest").split(",") if x.strip()]

    def hazir(self):
        return bool(os.getenv("GEMINI_API_KEY"))

    def yaz(self, sistem, mesaj, sicaklik=0.7, ara=False):
        hata = None
        for model in dict.fromkeys([self.model, *self.yedekler]):
            try:
                return self._yaz(model, sistem, mesaj, sicaklik, ara)
            except MotorHatasi as e:
                hata = e
        raise hata

    def _yaz(self, model, sistem, mesaj, sicaklik, ara):
        govde = {"systemInstruction": {"parts": [{"text": sistem}]},
                 "contents": [{"role": "user", "parts": [{"text": mesaj}]}],
                 "generationConfig": {"temperature": sicaklik}}
        if ara:
            govde["tools"] = [{"google_search": {}}]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        cevap = _post(url, govde, {"x-goog-api-key": os.getenv("GEMINI_API_KEY", "")})
        u = cevap.get("usageMetadata") or {}
        _kullanim(model, u.get("promptTokenCount"),
                  (u.get("candidatesTokenCount") or 0) + (u.get("thoughtsTokenCount") or 0))
        try:
            aday = cevap["candidates"][0]
            metin = "".join(p.get("text", "") for p in aday["content"]["parts"]).strip()
        except (KeyError, IndexError, TypeError):
            raise MotorHatasi("beklenmeyen cevap: " + _maskele(cevap)) from None
        # Aramayla bulunan kaynak adresleri metnin sonuna eklenir.
        kaynak = [c.get("web", {}) for c in aday.get("groundingMetadata", {}).get("groundingChunks", [])]
        kaynak = [f"- {k.get('title', '')}: {k.get('uri', '')}" for k in kaynak if k.get("uri")]
        if kaynak:
            metin += "\n\nARAMA KAYNAKLARI:\n" + "\n".join(dict.fromkeys(kaynak))
        return metin


class Claude(Motor):
    """Anthropic API. Anahtar yoksa hazır sayılmaz; o zaman Claude "elle" yolla kullanılır."""
    ad, etiket, ucretsiz = "claude", "Claude (Anthropic)", False

    def __init__(self):
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")

    def hazir(self):
        return bool(os.getenv("ANTHROPIC_API_KEY"))

    def yaz(self, sistem, mesaj, sicaklik=0.7, ara=False):
        cevap = _post("https://api.anthropic.com/v1/messages",
                      {"model": self.model, "max_tokens": 4000, "temperature": sicaklik, "system": sistem,
                       "messages": [{"role": "user", "content": mesaj}]},
                      {"x-api-key": os.getenv("ANTHROPIC_API_KEY", ""), "anthropic-version": "2023-06-01"})
        u = cevap.get("usage") or {}
        _kullanim(self.model, u.get("input_tokens"), u.get("output_tokens"))
        try:
            return "".join(p.get("text", "") for p in cevap["content"] if p.get("type") == "text").strip()
        except (KeyError, TypeError):
            raise MotorHatasi("beklenmeyen cevap: " + _maskele(cevap)) from None


class Deneme(Motor):
    """Anahtarsız deneme motoru: internete çıkmaz, sistemi uçtan uca sınamak için örnek cevap üretir."""
    ad, etiket = "deneme", "Deneme motoru (çevrimdışı)"

    def hazir(self):
        return os.getenv("SOSYAL_DENEME", "1") == "1"

    def yaz(self, sistem, mesaj, sicaklik=0.7, ara=False):
        if sistem.startswith("GÖREV: DAMITMA"):
            geri = re.findall(r"GERİ BİLDİRİM: (.+)", mesaj)
            yet = [{"tur": "tercih", "ad": "Kullanıcı isteği: " + g[:60], "aciklama": g, "platform": "hepsi"}
                   for g in geri]
            return json.dumps({"ozet": "Deneme oturumu özeti.", "yetenekler": yet}, ensure_ascii=False)
        if sistem.startswith("GÖREV: ELEŞTİRMEN"):
            return "- Kanca ilk 3 saniyede daha net olabilir.\n- Rakamlar kaynakla tekrar kontrol edilmeli."
        if sistem.startswith("GÖREV: FİKİR"):
            return "1. Az bilinen açı: deneme fikri A\n2. Şaşırtıcı rakamla açılış: deneme fikri B"
        if sistem.startswith("GÖREV: GÖRSEL ARAMA"):
            return '["Napoleon portrait painting", "Josephine de Beauharnais", "Malmaison castle"]'
        if sistem.startswith("GÖREV: ARAŞTIRMA"):
            return "- Deneme bilgisi (kaynak gerekli)."
        k = re.search(r"KONU: (.+)", mesaj)
        konu = k.group(1)[:80] if k else "Deneme konusu"
        return (f"## Başlık\n{konu} #shorts\n\n## İlk kare\n{konu.upper()}\n\n## Metin\n"
                "Deneme metni. Bu metin deneme motorundan geldi.\n\n## Sahneler\n1. Açılış sahnesi\n\n"
                "## Hedef kitle uyumu\nDeneme: Türkiye, Öğretmenler Günü bağı.\n\n## Görsel ve video\nWikimedia (CC0).\n\n"
                "## Ses ve müzik\nPiper fahrettin; müzik CC0 kamu malı kayıt.\n\n"
                "## Açıklama\nDeneme açıklaması. Temsili illüstrasyon (yapay zekâ).\n\n## Etiketler\n#tarih #shorts\n\n"
                "## Kaynaklar\n- (doğrulanacak)")


# Hazır olmayan motor için ekranda gösterilen kısa yol tarifi (anahtarlar portal → Kasa'ya girilir).
NASIL = {
    "gemini": "aistudio.google.com → Get API key. Kasa: gemini_api_key",
    "groq": "console.groq.com → API Keys → Create API Key. Kasa: groq_api_key",
    "openrouter": "Ücretsiz: openrouter.ai → Keys → Create Key. Kasa: openrouter_api_key",
    "mistral": "Ücretsiz API planı kalktı (yalnız ücretli); önerilmiyor. Kasa: mistral_api_key",
    "deepseek": "Ücretli (kullandıkça öde): platform.deepseek.com. Kasa: deepseek_api_key",
    "ollama": "Kendi sunucumuzda model çalıştırır; işe yarar model 5 GB+ boş bellek ister, şu an önerilmiyor",
    "openai": "Ücretli: platform.openai.com. Kasa: openai_api_key",
    "claude": "Ücretli API; API kredisi alınmıyor. Claude'u Üret sekmesindeki 'Claude paketini kopyala' ile kullanın",
    "deneme": "Yalnız sınama için; gerçek kullanımda kapalı",
}


def hepsi():
    m = [
        Gemini(),
        OpenAIUyumlu("groq", "Groq (Llama)", "https://api.groq.com/openai/v1/chat/completions",
                     "GROQ_API_KEY", "GROQ_MODEL", "llama-3.3-70b-versatile"),
        OpenAIUyumlu("openrouter", "OpenRouter (ücretsiz modeller)", "https://openrouter.ai/api/v1/chat/completions",
                     "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        OpenAIUyumlu("mistral", "Mistral", "https://api.mistral.ai/v1/chat/completions",
                     "MISTRAL_API_KEY", "MISTRAL_MODEL", "mistral-small-latest", ucretsiz=False),
        OpenAIUyumlu("deepseek", "DeepSeek", "https://api.deepseek.com/chat/completions",
                     "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "deepseek-chat", ucretsiz=False),
        OpenAIUyumlu("ollama", "Ollama (kendi sunucumuz)", "", "OLLAMA_API_KEY", "OLLAMA_MODEL", "qwen2.5:7b"),
        OpenAIUyumlu("openai", "OpenAI (ChatGPT)", "https://api.openai.com/v1/chat/completions",
                     "OPENAI_API_KEY", "OPENAI_MODEL", "gpt-4o-mini", ucretsiz=False),
        Claude(),
        Deneme(),
    ]
    return {x.ad: x for x in m}
