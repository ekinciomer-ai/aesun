# Pumpkin — Karakter Kartı

Kendi tasarımımız olan, seri boyunca aynı kalan ana karakter. Bu dosya her yeni sahne ve videoda temel alınır.

## Kim
- **Ad:** Pumpkin
- **Tür:** El yapımı keçe ve yün bebek (stop-motion minyatür görünüm)
- **Yaş hissi:** genç kız, çocuksu ve sevimli
- **Kişilik:** meraklı, biraz saf, kolay şaşıran; aradığını bulmak için inatla dolaşır. Küçük şeylere sevinir.
- **Yaşadığı yer:** İstanbul; Balat'ın yokuşları, taş merdivenler, renkli ahşap evler, çay bahçeleri.

## Görünüş (asla değişmez)
- Uzun, düz, altın sarısı yün saç; ortadan ayrık, beline kadar
- Yuvarlak, açık ten rengi keçe yüz; yanaklar hafif pembe, ince çiller ve keçe dokusu
- Mavi düğme gözler (beyaz halkalı), küçük pembe burun, minik ağız
- Bez kollar ve bacaklar, görünür dikiş izleri
- Kahverengi deri bot

## Kıyafetler
| Ad | Tarif | Nerede |
|---|---|---|
| **Ana kıyafet** | Pas rengi, yatay çizgili örgü kazak + mavi keçe etek + kahverengi bot | Tüm bölümlerde varsayılan |
| **Pijama** | Siyah pijama, beyaz biyeli (marka ya da logo yok) | Uyanma sahneleri |
| **Çizgili ceket** | Siyah beyaz dikey çizgili keçe ceket; altında ana kıyafet | Çay bahçesi / nargile görseli |

Yeni kıyafet giyse bile saç, yüz, göz ve bot aynı kalır.

## Yüz ifadeleri
- **Şaşkın:** kaşlar kalkık, gözler açık, ağız küçük "o" şeklinde, baş hafif yana eğik
- **Meraklı:** yukarı ya da çevreye bakar, baş hafif eğik
- **Umutlu:** yukarı bakar, hafif gülümser
- **Mutlu:** geniş gülümseme, yanaklar daha pembe
- **Yorgun / vazgeçmiş:** omuzlar düşük, bakış aşağıda

## Dünya ve eşyalar
- Kırmızı puantiyeli küçük şemsiye (yağmurlu sahneler)
- Mekânlar: Balat taş merdivenleri, cumbalı renkli evler, sokak feneri, sardunyalı pencereler, Arnavut kaldırımı, çay bahçesi (çınar, fenerler, ince belli çay bardakları), adsız mahalle bakkalı
- Yan figürler: tekir kedi, martı, uzakta kubbe ve minare silueti
- Uyanma odası: pencerede balkabağı ve şakayık (ekmek sepeti ve çay **yok**)
- Gerçek marka, logo ya da tabela adı kullanılmaz; zincir marketler adsız ("MARKET")

## Görsel üretim (Topview)
- **Karakter kartı referansı:** fileId `c5dcd67de0d04521b1bbf3d1240960b9`. Her sahnede referans olarak verilir.
- **Model:** Nano Banana Pro, `image_edit`, 9:16, 2K (≈0,8 kredi)
- **İstem kalıbı:**
  > Use the felt doll girl from the reference image exactly (same face, long golden-blonde wool hair, blue eyes, rust striped sweater, blue felt skirt, brown boots). ONE of her, full body, [eylem] in [mekân]. [ifade]. Handmade stop-motion miniature felt and wool style, visible fabric texture and stitches, shallow depth of field, cinematic warm lighting. No text, no logo.
- Kıyafet değişecekse istemde açıkça yazılır ("she now wears ...").

## Video üretimi
- **Model:** Kling 3.0 Turbo, görselden video, 720p, 3–15 sn (≈0,8 kredi/sn)
- **İstem kalıbı:**
  > Stop-motion felt doll animation. [tek, basit hareket]. Keep her face, hair, sweater and skirt exactly the same. No text.
- Sahne başına tek hareket verilir. Yön önemliyse açıkça yazılır (ilk denemede merdivenden çıkmak yerine indi).

## Ses ve kurgu
- **Anlatım:** Pumpkin'in kendi ağzından, ElevenLabs'teki kendi sesimizle (klon değil, bize ait ses)
- **Müzik:** telifsiz (kodla üretilen ya da Topview Music); konuşma sırasında müzik otomatik kısılır, toplam ses seviyesi −16 LUFS
- **Kurgu:** Remotion `src/bakkal3b`; sahneler arası 0,35 sn geçiş, hafif yakınlaşma, alt bölgede altyazı
- **Etiket:** videoda "Temsili illüstrasyon (yapay zekâ)", platformda "sentetik içerik" işareti açık

## Kurallar
1. Saç, göz, yüz ve ana kıyafet bütün bölümlerde aynı kalır.
2. Konuşmalar görüntüyle çelişmez: söylenen şey sahnede görünür olmalı.
3. Her hareketin görünür bir sebebi olur (durduk yere düşmek yok).
4. Sert kesme yok, yumuşak geçiş var.
5. Başka bir üreticinin karakteri kopyalanmaz. @shoof14 videoları yalnızca tarz referansıdır, yayınlanmaz.
6. Gerçek kişi, marka ya da logo kullanılmaz.

## Dosyalar (bu klasörde)
- `pumpkin_karakter_karti.jpg`, `pumpkin_karakter_karti_tam.png`: karakter kartı
- `pumpkin_nargile.png`: çizgili ceketli, şaşkın, çay bahçesinde nargileli görsel
- `pumpkin_sahne_balat_merdiven.jpg`, `pumpkin_deneme_balat_merdiven.mp4`: ilk deneme
- `ana_kareler/`: Bakkal bölümünün sahne görselleri
- `pumpkin_1_bakkal_3b.mp4`: Bölüm 1, Bakkal (3B)

## Bölümler
| No | Ad | Özet |
|---|---|---|
| 1 | Bakkal | Pumpkin sabah uyanır; mahallede eski bir bakkal arar. Her yer aynı marketlerle dolu. Sonunda bulur ve küçük bir mutluluk yaşar. |
