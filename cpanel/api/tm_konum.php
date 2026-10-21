<?php
// Trafo Merkezi (TM) Özel Konum (Koordinat) ve Yeni TM Ekleme Kalıcı Depo Servisi
// Kapasite sayfasında harita üzerinden konumu belirlenen TM'leri hem sunucu deposuna (~/ae_canli/tm_ozel_konumlar.json)
// hem de (yazılabilirse) kapasite/kapasite3.json içine kalıcı olarak yazar.
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-AE-Oturum');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$ev = dirname(__DIR__, 3);
$dizin = (is_dir($ev) && is_writable($ev)) ? $ev . '/ae_canli' : __DIR__ . '/_veri';
if (!is_dir($dizin)) { @mkdir($dizin, 0700, true); }
$DEPO_DOSYA = $dizin . '/tm_ozel_konumlar.json';
$KAPASITE_JSON = dirname(__DIR__) . '/kapasite/kapasite3.json';

function oku_depo(string $dosya): array {
  if (!is_file($dosya)) return ['konumlar' => [], 'eklenenler' => [], 'guncelleme' => 0];
  $j = @json_decode((string)@file_get_contents($dosya), true);
  if (!is_array($j)) return ['konumlar' => [], 'eklenenler' => [], 'guncelleme' => 0];
  if (!isset($j['konumlar']) || !is_array($j['konumlar'])) $j['konumlar'] = [];
  if (!isset($j['eklenenler']) || !is_array($j['eklenenler'])) $j['eklenenler'] = [];
  return $j;
}

function yaz_depo(string $dosya, array $veri): bool {
  $veri['guncelleme'] = time();
  $tmp = $dosya . '.tmp.' . bin2hex(random_bytes(4));
  $ok = @file_put_contents($tmp, json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
  if ($ok === false) return false;
  @rename($tmp, $dosya);
  return true;
}

// kapasite3.json dosyasını da yerinde günceller (sunucuda statik JSON okuyan tüm istemciler için anında kalıcı olur)
function kapasite_json_guncelle(string $kapDosya, array $depo): bool {
  if (!is_file($kapDosya) || !is_writable($kapDosya)) return false;
  $raw = @file_get_contents($kapDosya);
  if (!$raw) return false;
  $d = @json_decode($raw, true);
  if (!is_array($d) || !isset($d['rows']) || !is_array($d['rows'])) return false;

  $konumlar = $depo['konumlar'] ?? [];
  $degisti = false;

  foreach ($d['rows'] as &$r) {
    if (!is_array($r) || count($r) < 9) continue;
    $anahtar = mb_strtoupper(trim((string)$r[0]), 'UTF-8') . '|' . mb_strtoupper(trim((string)$r[1]), 'UTF-8');
    if (isset($konumlar[$anahtar])) {
      $k = $konumlar[$anahtar];
      $yLat = round((float)$k['lat'], 6);
      $yLon = round((float)$k['lon'], 6);
      if ($r[7] !== $yLat || $r[8] !== $yLon) {
        $r[7] = $yLat;
        $r[8] = $yLon;
        $degisti = true;
      }
    }
  }
  unset($r);

  // Yeni eklenen özel TM baraları varsa ve rows içinde yoksa ekle
  $mevcutAnahtarlar = [];
  foreach ($d['rows'] as $r) {
    if (is_array($r) && count($r) >= 4) {
      $k = mb_strtoupper(trim((string)$r[0]), 'UTF-8') . '|' . mb_strtoupper(trim((string)$r[1]), 'UTF-8') . '|' . mb_strtoupper(trim((string)$r[2]), 'UTF-8') . '|' . mb_strtoupper(trim((string)$r[3]), 'UTF-8');
      $mevcutAnahtarlar[$k] = true;
    }
  }
  foreach (($depo['eklenenler'] ?? []) as $ek) {
    $il = mb_strtoupper(trim((string)($ek['il'] ?? '')), 'UTF-8');
    $tm = mb_strtoupper(trim((string)($ek['tm'] ?? '')), 'UTF-8');
    $bara = trim((string)($ek['bara'] ?? 'Tek')) ?: 'Tek';
    $edas = trim((string)($ek['edas'] ?? ''));
    if (!$il || !$tm) continue;
    $k = $il . '|' . $tm . '|' . mb_strtoupper($bara, 'UTF-8') . '|' . mb_strtoupper($edas, 'UTF-8');
    if (!isset($mevcutAnahtarlar[$k])) {
      $d['rows'][] = [
        $il,
        $tm,
        $bara,
        $edas,
        round((float)($ek['m0203'] ?? $ek['mwe'] ?? 0), 2),
        round((float)($ek['m1607'] ?? $ek['mwe'] ?? 0), 2),
        round((float)($ek['m0110'] ?? $ek['mwe'] ?? 0), 2),
        isset($ek['lat']) ? round((float)$ek['lat'], 6) : null,
        isset($ek['lon']) ? round((float)$ek['lon'], 6) : null
      ];
      $mevcutAnahtarlar[$k] = true;
      $degisti = true;
    }
  }

  if ($degisti) {
    $d['tm_sayi'] = count($d['rows']);
    $tmp = $kapDosya . '.tmp.' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_UNICODE), LOCK_EX) !== false) {
      @rename($tmp, $kapDosya);
      return true;
    }
  }
  return false;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $girdi = @json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($girdi)) {
    http_response_code(400);
    echo json_encode(['durum' => 'hata', 'mesaj' => 'Geçersiz JSON verisi'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $islem = (string)($girdi['islem'] ?? 'kaydet');
  $depo = oku_depo($DEPO_DOSYA);

  if ($islem === 'sil') {
    $il = mb_strtoupper(trim((string)($girdi['il'] ?? '')), 'UTF-8');
    $tm = mb_strtoupper(trim((string)($girdi['tm'] ?? '')), 'UTF-8');
    $anahtar = $il . '|' . $tm;
    unset($depo['konumlar'][$anahtar]);
    $depo['eklenenler'] = array_values(array_filter($depo['eklenenler'], function($x) use ($il, $tm) {
      return !(mb_strtoupper(trim((string)($x['il'] ?? '')), 'UTF-8') === $il && mb_strtoupper(trim((string)($x['tm'] ?? '')), 'UTF-8') === $tm);
    }));
    yaz_depo($DEPO_DOSYA, $depo);
    echo json_encode(['durum' => 'ok', 'depo' => $depo], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $il = mb_strtoupper(trim((string)($girdi['il'] ?? '')), 'UTF-8');
  $tm = mb_strtoupper(trim((string)($girdi['tm'] ?? '')), 'UTF-8');
  $lat = isset($girdi['lat']) && is_numeric($girdi['lat']) ? round((float)$girdi['lat'], 6) : null;
  $lon = isset($girdi['lon']) && is_numeric($girdi['lon']) ? round((float)$girdi['lon'], 6) : null;

  if (!$il || !$tm || $lat === null || $lon === null || $lat < 34 || $lat > 43.5 || $lon < 25 || $lon > 45.5) {
    http_response_code(400);
    echo json_encode(['durum' => 'hata', 'mesaj' => 'Geçerli Türkiye il, TM adı ve koordinat (Enlem 35-43, Boylam 25-45) giriniz.'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $anahtar = $il . '|' . $tm;
  $depo['konumlar'][$anahtar] = [
    'il'    => $il,
    'tm'    => $tm,
    'lat'   => $lat,
    'lon'   => $lon,
    'not'   => trim((string)($girdi['not'] ?? '')),
    'zaman' => date('Y-m-d H:i:s')
  ];

  if (!empty($girdi['yeni_tm'])) {
    $bara = trim((string)($girdi['bara'] ?? 'Tek')) ?: 'Tek';
    $edas = trim((string)($girdi['edas'] ?? ''));
    $mwe  = isset($girdi['mwe']) && is_numeric($girdi['mwe']) ? round((float)$girdi['mwe'], 2) : 0.0;
    // Varsa güncelle, yoksa ekle
    $bulundu = false;
    foreach ($depo['eklenenler'] as &$ek) {
      if (mb_strtoupper(trim((string)($ek['il'] ?? '')), 'UTF-8') === $il && mb_strtoupper(trim((string)($ek['tm'] ?? '')), 'UTF-8') === $tm) {
        $ek['lat'] = $lat;
        $ek['lon'] = $lon;
        $ek['bara'] = $bara;
        if ($edas) $ek['edas'] = $edas;
        $ek['mwe'] = $mwe;
        $ek['m0110'] = $mwe;
        $bulundu = true;
        break;
      }
    }
    unset($ek);
    if (!$bulundu) {
      $depo['eklenenler'][] = [
        'il'    => $il,
        'tm'    => $tm,
        'bara'  => $bara,
        'edas'  => $edas,
        'm0203' => $mwe,
        'm1607' => $mwe,
        'm0110' => $mwe,
        'mwe'   => $mwe,
        'lat'   => $lat,
        'lon'   => $lon,
        'zaman' => date('Y-m-d H:i:s')
      ];
    }
  }

  $yazildi = yaz_depo($DEPO_DOSYA, $depo);
  $kapGuncellendi = kapasite_json_guncelle($KAPASITE_JSON, $depo);

  echo json_encode([
    'durum' => 'ok',
    'yazildi' => $yazildi,
    'kapasite_json_guncellendi' => $kapGuncellendi,
    'kayit' => $depo['konumlar'][$anahtar],
    'depo' => $depo
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

$depo = oku_depo($DEPO_DOSYA);
echo json_encode([
  'durum' => 'ok',
  'konumlar' => $depo['konumlar'],
  'eklenenler' => $depo['eklenenler'],
  'guncelleme' => $depo['guncelleme']
], JSON_UNESCAPED_UNICODE);
