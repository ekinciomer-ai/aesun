#!/usr/bin/env python3
"""Günlük araç keşfi: public-apis + awesome-selfhosted + GitHub araması → docs/portal/kesif/katalog.json
Yapay zekâ kullanmaz (token harcamaz). Yeni bulunanlar "Keşif bülteni" konusuna yorum olarak yazılır.
Ölçüt: MIT öncelikli, izin verici lisanslar (Apache/BSD/ISC/Unlicense) ayrıca işaretlenir; GPL/AGPL "dikkat";
arşivlenmiş, lisanssız, 6 aydır güncellenmeyen ve şüpheli tanımlı depolar alınmaz."""
import datetime as dt, glob, io, json, os, re, subprocess, sys, tarfile, time, urllib.request

KOK = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(KOK, '..', 'docs', 'portal', 'kesif', 'katalog.json')
DURUM = os.path.join(KOK, 'gorulen.json')
TOKEN = os.environ.get('GH_TOKEN', '')
BUGUN = dt.date.today()

GRUP = {
    'senaryo': 'Senaryo & metin', 'gorsel': 'Görsel & video üretim', 'ses': 'Seslendirme & ses',
    'edit': 'Kurgu & düzenleme', 'otomasyon': 'Otomasyon & bağlantı', 'hata': 'Hata izleme & uyarı',
    'guvenlik': 'Güvenlik', 'enerji': 'Enerji & saha (GES)', 'veri': 'Veri & yardımcı',
}
# GitHub konu (topic) aramaları
KONU = {
    'senaryo': ['prompt-engineering', 'content-generation', 'copywriting', 'screenwriting'],
    'gorsel': ['text-to-image', 'text-to-video', 'image-generation', 'video-generation', 'comfyui'],
    'ses': ['text-to-speech', 'voice-cloning', 'speech-recognition', 'music-generation'],
    'edit': ['video-editing', 'subtitles', 'background-removal', 'ffmpeg', 'image-processing'],
    'otomasyon': ['workflow-automation', 'mcp-server', 'social-media-automation', 'browser-automation', 'n8n'],
    'hata': ['error-monitoring', 'uptime-monitoring', 'observability', 'alerting', 'notifications'],
    'guvenlik': ['security-scanner', 'secret-scanning', 'vulnerability-scanner', 'intrusion-detection', 'prompt-injection'],
    'enerji': ['solar-energy', 'photovoltaic', 'energy-monitoring', 'drone-mapping', 'construction-management'],
}
PA = {  # public-apis kategori → grup
    'Text Analysis': 'senaryo', 'Dictionaries': 'senaryo', 'News': 'senaryo', 'Books': 'senaryo', 'Machine Learning': 'senaryo',
    'Photography': 'gorsel', 'Art & Design': 'gorsel', 'Video': 'gorsel', 'Music': 'ses',
    'Documents & Productivity': 'edit',
    'Social': 'otomasyon', 'Email': 'otomasyon', 'Calendar': 'otomasyon', 'Cloud Storage & File Sharing': 'otomasyon',
    'URL Shorteners': 'otomasyon', 'Phone': 'otomasyon', 'Development': 'otomasyon', 'Business': 'otomasyon',
    'Continuous Integration': 'hata', 'Data Validation': 'hata', 'Test Data': 'hata',
    'Security': 'guvenlik', 'Anti-Malware': 'guvenlik', 'Authentication & Authorization': 'guvenlik',
    'Weather': 'enerji', 'Environment': 'enerji', 'Geocoding': 'enerji', 'Science & Math': 'enerji',
    'Transportation': 'enerji', 'Tracking': 'enerji', 'Vehicle': 'enerji',
    'Open Data': 'veri', 'Government': 'veri', 'Currency Exchange': 'veri', 'Finance': 'veri',
}
SH = {  # awesome-selfhosted etiket → grup
    'Generative AI': 'senaryo', 'Generative Artificial Intelligence (GenAI)': 'senaryo',
    'Communication - Social Networks and Forums': 'otomasyon', 'Proxy': 'guvenlik', 'Video Surveillance': 'enerji',
    'Media Streaming - Multimedia Streaming': 'edit', 'Human Resources Management (HRM)': 'veri', 'Automation': 'otomasyon', 'Software Development - Low Code': 'otomasyon',
    'Communication - Email - Mailing Lists and Newsletters': 'otomasyon', 'Polls and Events': 'otomasyon',
    'Booking and Scheduling': 'otomasyon', 'Personal Dashboards': 'otomasyon',
    'Media Management': 'edit', 'Photo Galleries': 'edit', 'Media Streaming - Video Streaming': 'edit',
    'Monitoring & Status Pages': 'hata', 'Analytics': 'hata',
    'Password Managers': 'guvenlik', 'Federated Identity & Authentication': 'guvenlik', 'Identity Management': 'guvenlik',
    'VPN': 'guvenlik', 'Backup': 'guvenlik',
    'Internet of Things (IoT)': 'enerji', 'Maps and Global Positioning System (GPS)': 'enerji',
    'Inventory Management': 'enerji', 'Resource Planning': 'enerji', 'Time Tracking': 'enerji', 'Manufacturing': 'enerji',
    'Document Management': 'veri', 'Office Suites': 'veri', 'Knowledge Management Tools': 'veri',
}
# Açıklamaya göre daha doğru gruba taşı
ANAHTAR = [('ses', r'\b(speech|voice|tts|audio|music|sound)\b'), ('gorsel', r'\b(image|photo|video|art|draw|render)\b'),
           ('guvenlik', r'\b(security|malware|phishing|vulnerab|encrypt)\b')]
SUPHELI = re.compile(r'crack|keygen|keylog|stealer|grabber|free api key|bypass (paywall|captcha)|account generator|spam|jailbreak|unlock premium', re.I)
MIT = {'MIT', 'MIT-0'}
IZINLI = {'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', '0BSD', 'Zlib', 'MPL-2.0'}

# Elle seçilmiş öneriler (denendi ya da kurulumu önerilir) — sayfanın başında gösterilir
ONERI = [
    ('hata', 'louislam/uptime-kuma', 'Sunucu, site ve portal çökünce telefona anında uyarı. Kalıcı izleme için ilk kurulacak araç.'),
    ('hata', 'caronc/apprise', 'Tek komutla 100+ kanala bildirim (Telegram, e-posta, WhatsApp köprüsü). Tüm uyarılar tek yerden.'),
    ('hata', 'glitchtip/glitchtip-backend', 'Uygulama hatalarını toplayıp gruplayan, Sentry uyumlu ama kendi sunucumuzda kalan sistem.'),
    ('guvenlik', 'gitleaks/gitleaks', 'Depolarda unutulmuş şifre/anahtar taraması. GitHub işlemlerine eklenebilir.'),
    ('guvenlik', 'crowdsecurity/crowdsec', 'Sunucuya saldıran IP’leri otomatik engeller.'),
    ('guvenlik', 'aquasecurity/trivy', 'Kapsayıcı ve paketlerdeki bilinen açıkları tarar; tampon bölgeye uygun.'),
    ('ses', 'SYSTRAN/faster-whisper', 'Sesten yazıya (altyazı). CutkodA motorunda kullanılıyor.'),
    ('ses', 'hexgrad/kokoro', 'Hafif, ekran kartı istemeyen seslendirme modeli.'),
    ('ses', 'resemble-ai/chatterbox', 'Ses klonlama ve duygulu seslendirme (MIT).'),
    ('gorsel', 'harry0703/MoneyPrinterTurbo', 'Konudan otomatik kısa video. Tampon bölgede deneniyor.'),
    ('edit', 'WyattBlue/auto-editor', 'Sessiz yerleri otomatik keser. Tampon bölgede geçti.'),
    ('edit', 'danielgatis/rembg', 'Görsel arka planı siler. Tampon bölgede geçti.'),
    ('edit', 'heygen-com/hyperframes', 'HTML ile video/animasyon. Kurulu.'),
    ('senaryo', 'f/prompts.chat', 'Görsel/video istem kütüphanesi. Skill olarak kullanılıyor.'),
    ('otomasyon', 'n8n-io/n8n', 'İş akışı otomasyonu. Kullanımda.'),
    ('enerji', 'pvlib/pvlib-python', 'GES üretim tahmini ve kayıp hesabı; teklif/izleme raporlarına girer.'),
    ('enerji', 'home-assistant/core', 'Sahadaki sensör/inverter verilerini tek panelde toplama.'),
]


def al(url, ham=False, deneme=3):
    h = {'User-Agent': 'aesun-kesif', 'Accept': 'application/vnd.github+json'}
    if TOKEN and 'api.github.com' in url:
        h['Authorization'] = 'Bearer ' + TOKEN
    for i in range(deneme):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
                b = r.read()
                return b if ham else json.loads(b)
        except Exception as e:
            if i == deneme - 1:
                print('UYARI', url, e, file=sys.stderr)
                return None
            time.sleep(10 * (i + 1))


def lisans_sinif(l):
    if not l or l in ('NOASSERTION', 'Other'):
        return None
    if l in MIT:
        return 'mit'
    if l in IZINLI:
        return 'izinli'
    return 'dikkat'


def grup_duzelt(g, metin):
    for yg, desen in ANAHTAR:
        if re.search(desen, metin or '', re.I) and g in ('senaryo', 'veri', 'otomasyon'):
            return yg
    return g


def public_apis():
    b = al('https://raw.githubusercontent.com/public-apis/public-apis/master/README.md', ham=True)
    if not b:
        return []
    out, kat = [], None
    for s in b.decode('utf-8', 'ignore').splitlines():
        if s.startswith('### '):
            kat = s[4:].strip()
            continue
        m = re.match(r'^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|', s)
        if not m or kat not in PA:
            continue
        ad, url, acik, yetki, https, cors = m.groups()
        if https.strip().lower() != 'yes' or SUPHELI.search(acik):
            continue
        yetki = re.sub(r'`', '', yetki).strip()
        out.append({'k': 'api', 'g': grup_duzelt(PA[kat], acik), 'ad': ad, 'u': url, 'a': acik,
                    'y': 'Anahtarsız' if yetki.lower() == 'no' else yetki, 'kat': kat})
    return out


def selfhosted():
    b = al('https://codeload.github.com/awesome-selfhosted/awesome-selfhosted-data/tar.gz/refs/heads/master', ham=True)
    if not b:
        return []
    out, sinir = [], (BUGUN - dt.timedelta(days=365)).isoformat()
    try:
        import yaml
    except ImportError:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'pyyaml'], check=False)
        import yaml
    with tarfile.open(fileobj=io.BytesIO(b)) as t:
        for m in t.getmembers():
            if '/software/' not in m.name or not m.name.endswith('.yml'):
                continue
            d = yaml.safe_load(t.extractfile(m).read()) or {}
            g = next((SH[x] for x in d.get('tags', []) if x in SH), None)
            if not g or d.get('archived') or (d.get('stargazers_count') or 0) < 500 or str(d.get('updated_at') or '') < sinir:
                continue
            ls = d.get('licenses') or []
            sinif = 'mit' if any(x in MIT for x in ls) else 'izinli' if any(x in IZINLI for x in ls) else 'dikkat'
            if SUPHELI.search(d.get('description', '')):
                continue
            src = d.get('source_code_url') or d.get('website_url')
            out.append({'k': 'sunucu', 'g': grup_duzelt(g, d.get('description', '')), 'ad': d['name'], 'u': src,
                        'w': d.get('website_url'), 'a': d.get('description', ''), 'l': '/'.join(ls[:2]), 'ls': sinif,
                        'y': d.get('stargazers_count'), 'gun': str(d.get('updated_at') or '')})
    return out


def github():
    out, gor = [], set()
    alti_ay = (BUGUN - dt.timedelta(days=180)).isoformat()
    uc_ay = (BUGUN - dt.timedelta(days=90)).isoformat()
    for g, konular in KONU.items():
        for k in konular:
            for tur, q, n in (('populer', f'topic:{k} stars:>800 archived:false pushed:>{alti_ay}', 12),
                              ('yukselen', f'topic:{k} stars:>150 created:>{uc_ay} archived:false', 6)):
                r = al('https://api.github.com/search/repositories?sort=stars&order=desc&per_page=%d&q=%s'
                       % (n, urllib.parse.quote(q)))
                time.sleep(2.5)
                for x in (r or {}).get('items', []):
                    lic = (x.get('license') or {}).get('spdx_id')
                    sinif = lisans_sinif(lic)
                    if not sinif or x['full_name'] in gor or x.get('fork') or SUPHELI.search(x.get('description') or ''):
                        continue
                    gor.add(x['full_name'])
                    out.append({'k': 'github', 'g': g, 'ad': x['full_name'], 'u': x['html_url'],
                                'a': (x.get('description') or '')[:220], 'l': lic, 'ls': sinif, 'y': x['stargazers_count'],
                                'gun': x['pushed_at'][:10], 'ac': x['created_at'][:10], 'tur': tur, 'konu': k})
    return out


def oneriler():
    out = []
    for g, ad, not_ in ONERI:
        x = al('https://api.github.com/repos/' + ad) or {}
        time.sleep(0.5)
        lic = (x.get('license') or {}).get('spdx_id')
        out.append({'k': 'oneri', 'g': g, 'ad': ad, 'u': 'https://github.com/' + ad, 'a': not_,
                    'l': lic, 'ls': lisans_sinif(lic) or 'dikkat', 'y': x.get('stargazers_count'), 'gun': (x.get('pushed_at') or '')[:10]})
    return out


def bulten(yeniler):
    if not yeniler or not TOKEN:
        return
    repo = os.environ.get('GITHUB_REPOSITORY', '')
    ara = al('https://api.github.com/repos/%s/issues?state=open&labels=kesif&per_page=1' % repo) or []
    if ara:
        no = ara[0]['number']
    else:
        r = subprocess.run(['gh', 'issue', 'create', '-R', repo, '-t', 'Keşif bülteni', '-l', 'kesif',
                            '-b', 'Günlük GitHub taramasında bulunan yeni araçlar buraya yazılır. Kurulmadan önce tampon bölgede denenir.'],
                           capture_output=True, text=True)
        if r.returncode:
            subprocess.run(['gh', 'label', 'create', 'kesif', '-R', repo, '-c', 'D7262E'], capture_output=True)
            r = subprocess.run(['gh', 'issue', 'create', '-R', repo, '-t', 'Keşif bülteni', '-l', 'kesif', '-b', 'Günlük keşif.'],
                               capture_output=True, text=True)
        no = r.stdout.strip().rsplit('/', 1)[-1]
    sat = ['**%s · %d yeni araç**' % (BUGUN.strftime('%d.%m.%Y'), len(yeniler)), '']
    for x in sorted(yeniler, key=lambda x: -(x.get('y') or 0))[:25]:
        rozet = {'mit': '🟢 MIT', 'izinli': '🔵 ' + str(x.get('l')), 'dikkat': '🟠 ' + str(x.get('l'))}.get(x.get('ls'), '')
        sat.append('- [%s](%s) · %s · ⭐ %s · %s — %s' % (x['ad'], x['u'], GRUP[x['g']], x.get('y') or '-', rozet, (x.get('a') or '')[:140]))
    subprocess.run(['gh', 'issue', 'comment', str(no), '-R', repo, '-b', '\n'.join(sat)], check=False)


def main():
    import urllib.parse  # noqa
    globals()['urllib'].parse = urllib.parse
    durum = json.load(open(DURUM)) if os.path.exists(DURUM) else {}
    ilk = not durum
    hepsi = oneriler() + github() + selfhosted() + public_apis()
    yeniler = []
    for x in hepsi:
        anahtar = x['k'] + ':' + x['ad']
        if anahtar not in durum:
            durum[anahtar] = BUGUN.isoformat()
            if not ilk and x['k'] in ('github', 'sunucu'):
                yeniler.append(x)
        x['ilk'] = durum[anahtar]
    os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
    json.dump({'tarih': dt.datetime.utcnow().strftime('%Y-%m-%d %H:%M'), 'gruplar': GRUP, 'kayit': hepsi,
               'kaynak': {'api': 'public-apis/public-apis', 'sunucu': 'awesome-selfhosted/awesome-selfhosted-data', 'github': 'GitHub arama'}},
              open(CIKTI, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(durum, open(DURUM, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    bulten(yeniler)
    say = {}
    for x in hepsi:
        say[x['k']] = say.get(x['k'], 0) + 1
    print('kayıt', len(hepsi), say, 'yeni', len(yeniler))


if __name__ == '__main__':
    main()
