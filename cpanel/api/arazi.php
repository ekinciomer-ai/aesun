<?php
// Seçili Trafo Merkezi (TM) çevresi için Sahibinden.com & emlak kaynakları uygun GES arazi ilan servisi
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('Access-Control-Allow-Origin: *');

$ev = dirname(__DIR__, 3);
$dizin = (is_dir($ev) && is_writable($ev)) ? $ev . '/ae_canli/arazi_cache' : __DIR__ . '/_veri/arazi_cache';
if (!is_dir($dizin)) { @mkdir($dizin, 0700, true); }

function tr_slug(string $s): string {
  $map = [
    'Ç'=>'c','ç'=>'c','Ğ'=>'g','ğ'=>'g','İ'=>'i','I'=>'i','ı'=>'i',
    'Ö'=>'o','ö'=>'o','Ş'=>'s','ş'=>'s','Ü'=>'u','ü'=>'u','â'=>'a','î'=>'i','û'=>'u'
  ];
  $s = strtr(trim($s), $map);
  $s = strtolower($s);
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim($s, '-');
}

function http_cek(string $url, int $timeout = 4): ?string {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_MAXREDIRS      => 3,
      CURLOPT_CONNECTTIMEOUT => 2,
      CURLOPT_TIMEOUT        => $timeout,
      CURLOPT_SSL_VERIFYPEER => false,
      CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      CURLOPT_HTTPHEADER     => ['Accept-Language: tr-TR,tr;q=0.9,en;q=0.7']
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 200 && $code < 300 && is_string($res) && strlen($res) > 50) {
      return $res;
    }
    return null;
  }
  $ctx = stream_context_create([
    'http' => [
      'timeout' => $timeout,
      'header'  => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nAccept-Language: tr-TR,tr;q=0.9\r\n"
    ],
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
  ]);
  $r = @file_get_contents($url, false, $ctx);
  return ($r !== false && strlen($r) > 50) ? $r : null;
}

$il   = trim((string)($_GET['il'] ?? 'AKSARAY'));
$ilce = trim((string)($_GET['ilce'] ?? ''));
$tm   = trim((string)($_GET['tm'] ?? ''));
$mwe  = max(0.0, (float)($_GET['mwe'] ?? 1.0));
$lat  = isset($_GET['lat']) && $_GET['lat'] !== '' ? (float)$_GET['lat'] : null;
$lon  = isset($_GET['lon']) && $_GET['lon'] !== '' ? (float)$_GET['lon'] : null;

$anahtar = md5(strtolower($il . '|' . $ilce . '|' . $tm . '|' . ($lat ? round($lat, 3) : '') . '|' . ($lon ? round($lon, 3) : '')));
$cache_dosya = $dizin . '/arazi_' . $anahtar . '.json';

if (is_file($cache_dosya) && (time() - filemtime($cache_dosya) < 1800)) {
  $cached = @json_decode(@file_get_contents($cache_dosya), true);
  if (is_array($cached)) {
    $cached['onbellek'] = true;
    echo json_encode($cached, JSON_UNESCAPED_UNICODE);
    exit;
  }
}

$mahalle = '';
$yol = '';
if ($lat !== null && $lon !== null && $lat > 35 && $lat < 43 && $lon > 25 && $lon < 45) {
  $nom_url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" . urlencode((string)$lat) . "&lon=" . urlencode((string)$lon) . "&accept-language=tr";
  $nom_raw = http_cek($nom_url, 3);
  if ($nom_raw) {
    $nom = @json_decode($nom_raw, true);
    if (is_array($nom) && !empty($nom['address'])) {
      $adr = $nom['address'];
      $bul_ilce = $adr['town'] ?? $adr['county'] ?? $adr['city_district'] ?? $adr['municipality'] ?? '';
      if ($bul_ilce && !$ilce) {
        $ilce = $bul_ilce;
      }
      $mahalle = $adr['village'] ?? $adr['suburb'] ?? $adr['neighbourhood'] ?? $adr['quarter'] ?? $adr['hamlet'] ?? '';
      $yol = $adr['road'] ?? '';
    }
  }
}

$il_slug = tr_slug($il);
$ilce_slug = ($ilce && strtolower($ilce) !== 'merkez') ? tr_slug($ilce) : '';
$konum_slug = $ilce_slug ? ($il_slug . '-' . $ilce_slug) : $il_slug;

// Canlı ilan keşfi (Emlak / Arama indekslerinden uygun m2 satılık tarla/arsa ilanları)
$canli_ilanlar = [];
$emlak_url = "https://www.emlakjet.com/satilik-arsa/" . $konum_slug . "/";
$html = http_cek($emlak_url, 3);
if (!$html && $ilce_slug) {
  $html = http_cek("https://www.emlakjet.com/satilik-arsa/" . $il_slug . "/", 3);
}
if ($html) {
  if (preg_match_all('/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches)) {
    foreach ($matches[1] as $ld_str) {
      $ld = @json_decode(trim($ld_str), true);
      if (!is_array($ld)) continue;
      $items = [];
      if (($ld['@type'] ?? '') === 'ItemList' && !empty($ld['itemListElement'])) {
        $items = $ld['itemListElement'];
      }
      foreach ($items as $it) {
        $obj = $it['item'] ?? $it;
        $ad = trim((string)($obj['name'] ?? ''));
        $u  = trim((string)($obj['url'] ?? ''));
        if (!$ad || !$u) continue;
        if (strpos($u, 'http') !== 0) $u = 'https://www.emlakjet.com' . $u;
        $fiyat = '';
        if (!empty($obj['offers']['price'])) {
          $fiyat = number_format((float)$obj['offers']['price'], 0, ',', '.') . ' TL';
        }
        $m2 = 0;
        if (preg_match('/(\d[\d\.]*)\s*(m2|m²|metrekare|dönüm|dekar)/iu', $ad, $mm)) {
          $val = (int)str_replace('.', '', $mm[1]);
          $birim = mb_strtolower($mm[2], 'UTF-8');
          $m2 = ($birim === 'dönüm' || $birim === 'dekar') ? $val * 1000 : $val;
        }
        $canli_ilanlar[] = [
          'baslik' => $ad,
          'konum'  => $il . ($ilce ? ' / ' . $ilce : '') . ($mahalle ? ' (' . $mahalle . ')' : ''),
          'm2'     => $m2,
          'fiyat'  => $fiyat,
          'url'    => $u,
          'sahibinden_url' => 'https://www.sahibinden.com/satilik-arsa-tarla/' . $konum_slug . '?sorting=price_asc'
        ];
        if (count($canli_ilanlar) >= 6) break 2;
      }
    }
  }
}

$hedef_mwe = $mwe > 0 ? $mwe : 1.0;
$min_m2 = max(5000, (int)round(min($hedef_mwe, 5.0) * 15000));

$sonuc = [
  'durum'      => 'ok',
  'il'         => $il,
  'ilce'       => $ilce ?: 'Merkez',
  'mahalle'    => $mahalle,
  'yol'        => $yol,
  'tm'         => $tm,
  'konum_slug' => $konum_slug,
  'onerilen_m2'=> $min_m2,
  'sahibinden' => [
    'tarla'   => 'https://www.sahibinden.com/satilik-arsa-tarla/' . $konum_slug . '?sorting=price_asc',
    'arsa'    => 'https://www.sahibinden.com/satilik-arsa/' . $konum_slug . '?sorting=price_asc',
    'ges'     => 'https://www.sahibinden.com/satilik-arsa/' . $il_slug . '?query_text=' . rawurlencode(($ilce ? $ilce . ' ' : '') . 'ges'),
    'trafo'   => 'https://www.sahibinden.com/satilik-arsa/' . $il_slug . '?query_text=' . rawurlencode(($ilce ? $ilce . ' ' : '') . 'trafo'),
    'mahalle' => 'https://www.sahibinden.com/satilik-arsa/' . $il_slug . '?query_text=' . rawurlencode($mahalle ?: ($ilce ?: $il)),
    'sanayi'  => 'https://www.sahibinden.com/satilik-arsa-sanayi-imarli/' . $il_slug,
    'harita'  => 'https://www.sahibinden.com/haritada-emlak-arama'
  ],
  'canli_ilanlar' => $canli_ilanlar,
  'zaman'      => time()
];

@file_put_contents($cache_dosya, json_encode($sonuc, JSON_UNESCAPED_UNICODE), LOCK_EX);
echo json_encode($sonuc, JSON_UNESCAPED_UNICODE);
