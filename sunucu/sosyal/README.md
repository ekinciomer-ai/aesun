# Sosyal Stüdyo

Birden çok yapay zekânın birlikte çalıştığı sosyal medya içerik üretim programı. Her sohbetten öğrendiklerini
kalıcı hafızaya yazar, sohbetin kendisini siler. Yeni sohbet hafızayı ve kaynak MD dosyalarını okuyarak başlar.

## Nasıl çalışır

1. **Yeni sohbet**: platform (YouTube Shorts, TikTok, Instagram, X, LinkedIn…), dil (TR/EN/ES), format ve konu seçilir.
2. **Bağlam kurulur**: `kaynak/` klasöründeki MD dosyaları (kurallar her zaman, diğer bölümler konuya göre),
   hafızadaki yasaklar, tercihler, ilgili yetenekler ve son içerikler (tekrar olmasın diye).
3. **Ekip çalışır**:
   - Araştırma: Gemini web'de arar, kaynak adresleriyle bilgi çıkarır.
   - Fikir: hazır motorların hepsi (en çok 3) aynı anda açı ve kanca önerir.
   - Yazar: en güçlü açıyı seçip tam paketi yazar (başlık, ilk kare, metin, sahneler ve görsel istemleri,
     açıklama, etiketler, kaynaklar, yayın saati, doğrulanacaklar).
   - Eleştirmen: mümkünse başka bir motor, kurallara göre denetler. Yazar düzeltir.
   - Denetim: platform sınırları, YZ notu, kaynak, telif riski. Engel varsa içerik onaylanmaz.
4. **Düzelt**: "kancayı rakamla aç" gibi istekler yazılır, yazar yeniden yazar.
5. **Onayla**: içerik puanıyla birlikte kalıcı kayda geçer.
6. **Sohbeti bitir ve öğren**: bir motor sohbeti okuyup kalıcı dersleri çıkarır
   (yetenek / tercih / yasak). Aynı ders tekrar gelirse yeni kayıt açılmaz, güveni artar.
   Sohbet metni silinir: önce 7 gün arşivde bekler, sonra kendiliğinden kalıcı silinir
   (`SOSYAL_SOHBET_ARSIV_GUN`, 0 = hemen sil).

7. **Tampon araçları** (İçerikler sekmesi): onaylanan içerik "Seslendir" ya da "Video taslağı" ile kuyruğa
   gider. Sunucudaki işçi (`arac/isci.py`, dakikada bir) GitHub'dan alınıp tampon bölgede yalıtılmış duran
   araçları çalıştırır:
   - Ses: Piper `tr_TR-fahrettin` (CC0, Türkçe) ya da Chatterbox Multilingual (MIT, TR/EN/ES)
   - Video taslağı: yapay zekâ görsel arama terimlerini çıkarır → Wikimedia Commons serbest lisanslı görseller
     (`commons_gorsel.py`) → MoneyPrinterTurbo (Edge ses, altyazı, yakınlaşma, 9:16) → kalite kapısı.
     Kapıdan geçmeyen video saklanmaz ve gösterilmez; görsel kaynakları `kaynaklar.json`'da durur.
   Program kapsayıcısı araçlara doğrudan erişmez, yalnız kuyruğa iş yazar ve sonucu okur.

8. **Animasyon formatları**: Format kutusunda "Animasyon · …" seçilince kütüphanedeki format
   (`kaynak/animasyon_formatlari.md`) bağlama girer ve yazar animasyon üretim paketini (ses satırları, sahne planı,
   karakterler) yazar. Kodla çizim ve işleme Claude Code ile yapılır (`animasyon/`, örnekler `icerik/animasyon_formatlari/`).

Hafızanın okunur hali `veri/HAFIZA.md` dosyasına ve `/api/hafiza.md` adresine yazılır. Başka bir yapay zekâ
(ör. Claude sohbeti) yeni işe bunu okuyarak başlayabilir.

## Yapay zekâ motorları

| Motor | Anahtar (kasada) | Not |
|---|---|---|
| Google Gemini | `gemini_api_key` | Ücretsiz katman, web araması yapar |
| Groq (Llama) | `groq_api_key` | Ücretsiz katman, hızlı |
| OpenRouter | `openrouter_api_key` | Ücretsiz modeller |
| Mistral | `mistral_api_key` | Ücretsiz katman |
| Ollama | `OLLAMA_URL` | Kendi sunucumuzda, anahtarsız |
| DeepSeek, OpenAI | `deepseek_api_key`, `openai_api_key` | Ücretli, istenirse |
| Claude | `anthropic_api_key` | API kredisi alınmadığı için varsayılan yol **elle**: paket kopyalanır, Claude'un cevabı geri yapıştırılır |
| Deneme | — | İnternete çıkmaz; yalnız sınama için (`SOSYAL_DENEME=1`) |

Hangi görevi hangi motorun yapacağı `SOSYAL_ROL_*` ayarlarıyla değişir (`sosyal.env.ornek`).
Bir motor hata verirse sıradaki denenir.

## Kurulum (sunucu)

GitHub Actions → "Sunucu işlemi (ns1)" → işlem: `sosyal_kur`. Betik önce yedek alır, kasadaki anahtarları
`/opt/sosyal/anahtar.env`'e yazar, kapsayıcıyı kurar, sağlık kontrolü yapar; başarısızsa geri alır.
Adres: **https://sosyal.cutkoda.com** (eski sosyal.aksarayenerji.net buraya yönlenir) (parola kasada `sosyal_parola`; giriş 30 gün hatırlanır,
15 dakikada 5 yanlış denemede bekletir). Yayın `islem_sosyal_yayin` ile yapıldı: ck-caddy ek dosyası
`/opt/cutkoda/caddy-ek/sosyal.caddy`. Parola kasada yoksa program dışarıya hiç açılmaz.

## Yerelde deneme

```
pip install flask pytest
python -m pytest -q testler
SOSYAL_DENEME=1 python calistir.py        # http://127.0.0.1:5090
python -m sosyal.cli uret --platform youtube_shorts --format "Tarihi Magazin" --konu "..." --kapat
```

## Dosyalar

- `sosyal/motorlar.py`: yapay zekâ bağlantıları
- `sosyal/uretim.py`: ekip akışı ve öğrenme (damıtma)
- `sosyal/hafiza.py`: kalıcı hafıza (SQLite: yetenekler, içerikler, günlük, arşiv)
- `sosyal/kaynaklar.py`: MD dosyalarını bölümlere ayırıp seçer
- `sosyal/denetim.py`: yayın öncesi denetim
- `sosyal/web.py`, `sosyal/templates/index.html`: arayüz
- `kaynak/`: kullanıcının MD dosyaları
