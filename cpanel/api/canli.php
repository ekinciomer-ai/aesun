<?php
// Anlık izleme deposu — Pi (pi/canli.py) ~10 sn'de bir POST eder, monitoring sayfası GET ile okur.
// Kimlik: X-AE-Canli başlığındaki anahtarın SHA-256 özeti, GitHub'daki epias-ptf/n8n/canli_anahtar.json
// ile karşılaştırılır. Bu dosyada sır yoktur.
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

$ev = dirname(__DIR__, 3);
$dizin = (is_dir($ev) && is_writable($ev)) ? $ev . '/ae_canli' : __DIR__ . '/_veri';
if (!is_dir($dizin)) { @mkdir($dizin, 0700, true); }
if (strpos($dizin, '/_veri') !== false && !file_exists($dizin . '/.htaccess')) {
  @file_put_contents($dizin . '/.htaccess', "Require all denied\n");
}
$SON = $dizin . '/son.json';
$SERI = $dizin . '/seri.json';
$OZET = $dizin . '/ozet.json';
$TETIK = $dizin . '/tetik.json';
$OZET_URLLER = ['https://api.aksarayenerji.net/v1/acik/n8n/canli_anahtar.json', 'https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/n8n/canli_anahtar.json'];
$SAKLA = 6 * 3600;

function cevap($kod, $v) { http_response_code($kod); echo json_encode($v, JSON_UNESCAPED_UNICODE); exit; }

function uzak_ozet($url) {
  $c = @file_get_contents($url . '?t=' . time(), false, stream_context_create(['http' => ['timeout' => 6]]));
  if ($c === false && function_exists('curl_init')) {
    $h = curl_init($url . '?t=' . time());
    curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6]);
    $c = curl_exec($h); curl_close($h);
  }
  $j = $c ? json_decode($c, true) : null;
  return (is_array($j) && !empty($j['sha256'])) ? strtolower($j['sha256']) : null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $a = isset($_SERVER['HTTP_X_AE_CANLI']) ? trim($_SERVER['HTTP_X_AE_CANLI']) : '';
  if (strlen($a) < 32) cevap(401, ['hata' => 'anahtar yok']);
  $oz = hash('sha256', $a);
  $kayit = @json_decode(@file_get_contents($OZET), true) ?: [];
  if (empty($kayit['sha256']) || !hash_equals($kayit['sha256'], $oz)) {
    // özet yok ya da farklı: GitHub'dan en çok 2 dakikada bir tazele
    if (empty($kayit['t']) || time() - $kayit['t'] > 120) {
      $u = null; foreach ($OZET_URLLER as $ou) { $u = uzak_ozet($ou); if ($u) break; }
      $kayit = ['sha256' => $u, 't' => time()];
      @file_put_contents($OZET, json_encode($kayit), LOCK_EX);
    }
    if (empty($kayit['sha256']) || !hash_equals($kayit['sha256'], $oz)) cevap(403, ['hata' => 'anahtar geçersiz']);
  }
  $v = json_decode(file_get_contents('php://input'), true);
  if (!is_array($v) || !isset($v['t'], $v['top'], $v['c']) || !is_array($v['c'])) cevap(400, ['hata' => 'biçim']);
  $t = (int)$v['t'];
  if (abs($t - time()) > 600) $t = time();
  $son = ['t' => $t, 'top' => (float)$v['top'], 'n' => (int)($v['n'] ?? 0), 'c' => $v['c']];
  if (!empty($v['kod']) && is_string($v['kod'])) $son['pi_kod'] = substr(preg_replace('/[^0-9a-f]/', '', strtolower($v['kod'])), 0, 12);
  file_put_contents($SON, json_encode($son), LOCK_EX);
  $f = fopen($SERI, 'c+');
  if ($f && flock($f, LOCK_EX)) {
    $s = json_decode(stream_get_contents($f), true) ?: [];
    $s = array_values(array_filter($s, function ($p) use ($t, $SAKLA) { return $p[0] > $t - $SAKLA && $p[0] < $t; }));
    $s[] = [$t, round((float)$v['top'], 1), (int)($v['n'] ?? 0)];
    ftruncate($f, 0); rewind($f); fwrite($f, json_encode($s)); fflush($f); flock($f, LOCK_UN);
  }
  if ($f) fclose($f);
  $tetik = @json_decode(@file_get_contents($TETIK), true) ?: [];
  cevap(200, ['durum' => 'ok', 'kod' => $tetik['kod'] ?? null, 'komut_t' => $tetik['komut_t'] ?? null]);
}

// GET: hedef_kod veya komut_tetik bildirimi (CI / yönetim hızlı tetikleme)
if (!empty($_GET['hedef_kod']) && preg_match('/^[0-9a-f]{7,40}$/i', $_GET['hedef_kod'])) {
  $tetik = @json_decode(@file_get_contents($TETIK), true) ?: [];
  $tetik['kod'] = substr(strtolower($_GET['hedef_kod']), 0, 12);
  $tetik['t'] = time();
  @file_put_contents($TETIK, json_encode($tetik), LOCK_EX);
}
if (!empty($_GET['komut_tetik'])) {
  $tetik = @json_decode(@file_get_contents($TETIK), true) ?: [];
  $tetik['komut_t'] = time();
  @file_put_contents($TETIK, json_encode($tetik), LOCK_EX);
}

// GET: son okuma + seri (?s=epoch → yalnız sonrası)
$son = @json_decode(@file_get_contents($SON), true);
$s = @json_decode(@file_get_contents($SERI), true) ?: [];
$tetik = @json_decode(@file_get_contents($TETIK), true) ?: [];
$den = isset($_GET['s']) ? (int)$_GET['s'] : 0;
if ($den) $s = array_values(array_filter($s, function ($p) use ($den) { return $p[0] > $den; }));
cevap(200, ['durum' => $son ? 'ok' : 'bos', 'simdi' => time(), 'hedef_kod' => $tetik['kod'] ?? null, 'son' => $son, 'seri' => $s]);
