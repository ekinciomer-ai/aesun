#!/bin/bash
# Salt okur teşhis: seslendirme imajı ve Microsoft/Google ses uçlarına erişim.
docker image inspect aesun-tts:1 >/dev/null 2>&1 && echo "NOT: imaj var" || echo "NOT: imaj yok"
[ -f /opt/aesun/tts/build.err ] && echo "NOT: build.err: $(tail -3 /opt/aesun/tts/build.err | tr '\n' ' ' | cut -c1-200)"
for u in https://speech.platform.bing.com https://translate.google.com https://pypi.org; do
  echo "NOT: $u → $(curl -s -o /dev/null -m 10 -w '%{http_code}' $u)"; done
docker ps --format '{{.Image}} {{.Status}}' | grep -i tts | sed 's/^/NOT: çalışan /'
if docker image inspect aesun-tts:1 >/dev/null 2>&1; then
  timeout 90 docker run --rm aesun-tts:1 python -c "
import asyncio, edge_tts
async def m():
    await asyncio.wait_for(edge_tts.Communicate('Merhaba, deneme.', 'tr-TR-AhmetNeural', rate='+10%', pitch='+5Hz').save('/tmp/a.mp3'), 40)
    import os; print('NOT: edge-tts tamam', os.path.getsize('/tmp/a.mp3'), 'bayt')
asyncio.run(m())" 2>&1 | tail -3 | sed 's/^\([^N]\)/NOT: hata \1/'
fi
exit 0
