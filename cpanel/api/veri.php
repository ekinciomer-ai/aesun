<?php
/* Aksaray Enerji — izleme verisi servisi (cPanel köprüsü)
 * Asıl depo artık ns1'de (https://api.aksarayenerji.net/v1/veri). Bu dosya geçiş süresince:
 *  - Toplayıcı yazımlarını (X-AE-Anahtar) hem yerel kopyaya hem ns1'e iletir.
 *  - Toplayıcı okumalarını ns1'den yapar; ns1'e ulaşılamazsa yerel kopyadan.
 *  - Portal oturumuyla (X-AE-Oturum) okumaları yerel kopyadan yapar (eski davranış).
 * Dosyalar web kökünün DIŞINDA: ~/ae_veri/depo/. Anahtar özetleri: ~/ae_veri/anahtarlar.json (yalnız SHA-256). */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

define('VK', getenv('AE_VERI') ?: dirname(__DIR__, 3) . '/ae_veri');
const MERKEZ = 'https://api.aksarayenerji.net/v1/veri';
const PARA_DOSYA = '#(^|/)(fatura/|maden_maliyet|arsiv_f2pool_gelir|arsiv_btc_fiyat)#';

// Reddedilen erişimi ns1 erişim günlüğüne bildirir (Denetçi "Erişim Güvenliği"). Anahtar/şifre gönderilmez; en çok 2 sn.
function erisimBildir(int $k, string $m): void {
  if (!function_exists('curl_init')) return;
  $h = curl_init('https://api.aksarayenerji.net/v1/olay/giris');
  curl_setopt_array($h, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 2, CURLOPT_CONNECTTIMEOUT => 2,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'User-Agent: aesun-cpanel-kopru'],
    CURLOPT_POSTFIELDS => json_encode(['kaynak' => 'cpanel', 'sonuc' => 'yetkisiz', 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'kod' => $k,
      'yol' => basename($_SERVER['SCRIPT_NAME'] ?? '') . '?' . substr((string)($_GET['a'] ?? ''), 0, 20), 'not' => mb_substr($m, 0, 60)], JSON_UNESCAPED_UNICODE)]);
  @curl_exec($h); curl_close($h);
}
function hata(int $k, string $m): never { http_response_code($k); echo json_encode(['hata' => $m], JSON_UNESCAPED_UNICODE); if ($k === 401 || $k === 403) { if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); erisimBildir($k, $m); } exit; }
function jo(string $p, $v = null) { if (!is_file($p)) return $v; $j = json_decode((string)file_get_contents($p), true); return $j ?? $v; }
function yolUygun($y): string {
  if (!is_string($y) || strlen($y) > 200 || !preg_match('#^[A-Za-z0-9_][A-Za-z0-9_./-]*\.json$#', $y) || str_contains($y, '..') || str_contains($y, '//') || str_starts_with($y, 'portal/')) hata(400, 'Geçersiz yol');
  return $y;
}
function oturum(): array {
  $tk = $_SERVER['HTTP_X_AE_OTURUM'] ?? '';
  if (!preg_match('/^[0-9a-f]{64}$/', $tk)) hata(401, 'Oturum gerekli');
  $o = jo(VK . '/portal/oturum/' . hash('sha256', $tk) . '.json');
  if (!$o || ($o['son'] ?? 0) < time()) hata(401, 'Oturum süresi doldu');
  $e = jo(VK . '/portal/erisim.json', [])[$o['id']] ?? null;
  if (!$e || !hash_equals($e['h'], $o['h'])) hata(401, 'Oturum geçersiz');
  return $e;
}
const DEMO_DOSYA = 'n8n/demo_durum.json';
function izlemeYetkisi(array $e, string $yol): void {
  if (!empty($e['yon'])) return;
  $y = $e['y'] ?? null;
  if ($yol === DEMO_DOSYA && $y !== null && array_intersect(['mining-demo', 'monitoring'], $y['moduller'] ?? [])) return;
  if ($y !== null && !in_array('monitoring', $y['moduller'] ?? [], true)) hata(403, 'İzleme yetkiniz yok');
  if (preg_match(PARA_DOSYA, $yol) && !($y !== null && in_array('parasal', $y['monitoring'] ?? [], true))) hata(403, 'Parasal veri yetkiniz yok');
}
function toplayici(): ?string {
  $an = $_SERVER['HTTP_X_AE_ANAHTAR'] ?? '';
  if ($an === '') return null;
  if (strlen($an) < 32) hata(401, 'Anahtar geçersiz');
  foreach (jo(VK . '/anahtarlar.json', []) as $ad => $h) if (hash_equals((string)$h, hash('sha256', $an))) return (string)$ad;
  usleep(500000); hata(401, 'Anahtar geçersiz');
}
// ns1'e ilet: [kod, gövde, başlıklar] ya da ağ hatasında null
function merkez(string $a, string $yol, ?string $govde, int $sn): ?array {
  if (!function_exists('curl_init')) return null;
  $h = curl_init(MERKEZ . '?' . http_build_query(['a' => $a, 'yol' => $yol]));
  $bas = ['X-AE-Anahtar: ' . ($_SERVER['HTTP_X_AE_ANAHTAR'] ?? ''), 'User-Agent: aesun-cpanel-kopru'];
  $ab = [];
  curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $sn, CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_HEADERFUNCTION => function ($c, $s) use (&$ab) { if (stripos($s, 'X-AE-Guncel:') === 0) $ab[] = trim($s); return strlen($s); }]);
  if ($govde !== null) { curl_setopt($h, CURLOPT_POST, true); curl_setopt($h, CURLOPT_POSTFIELDS, $govde); $bas[] = 'Content-Type: application/json'; }
  curl_setopt($h, CURLOPT_HTTPHEADER, $bas);
  $g = curl_exec($h); $k = (int)curl_getinfo($h, CURLINFO_HTTP_CODE); curl_close($h);
  return ($g === false || $k === 0) ? null : [$k, $g, $ab];
}

$a = $_GET['a'] ?? 'oku';
if ($a === 'oku') {
  $yol = yolUygun($_GET['yol'] ?? '');
  if (toplayici()) {
    $m = merkez('oku', $yol, null, 15);
    if ($m && $m[0] < 500) { foreach ($m[2] as $b) header($b); header('X-AE-Kaynak: ns1'); http_response_code($m[0]); echo $m[1]; exit; }
  } else {
    izlemeYetkisi(oturum(), $yol);
  }
  $p = VK . '/depo/' . $yol;
  if (!is_file($p)) hata(404, 'Yok: ' . $yol);
  $mt = filemtime($p); header('X-AE-Guncel: ' . gmdate('c', $mt)); header('X-AE-Kaynak: cpanel');
  readfile($p); exit;
}
if ($a === 'yaz') {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') hata(405, 'POST');
  $kim = toplayici(); if (!$kim) hata(401, 'Anahtar gerekli');
  $yol = yolUygun($_GET['yol'] ?? '');
  $g = file_get_contents('php://input', false, null, 0, 20 * 1024 * 1024 + 1);
  if ($g === false || strlen($g) > 20 * 1024 * 1024) hata(413, 'Çok büyük');
  if (json_decode($g) === null && trim($g) !== 'null') hata(400, 'JSON değil');
  $p = VK . '/depo/' . $yol; if (!is_dir(dirname($p))) mkdir(dirname($p), 0700, true);
  $t = $p . '.tmp' . bin2hex(random_bytes(4)); file_put_contents($t, $g, LOCK_EX); chmod($t, 0600); rename($t, $p);
  $m = merkez('yaz', $yol, $g, 20);
  @file_put_contents(VK . '/depo_yazim.log', gmdate('c') . "\t$kim\t$yol\t" . strlen($g) . "\tns1:" . ($m ? $m[0] : 'yok') . "\n", FILE_APPEND | LOCK_EX);
  echo json_encode(['tamam' => true, 'ns1' => $m ? $m[0] : null]); exit;
}
hata(404, 'Bilinmeyen işlem');
