#!/bin/bash
# mehmetali: Claude Code'un son saf-JS sürümü (2.1.112). Sunucu CPU'su SSE4.2 desteklemediği için yeni (Bun) sürümler çalışmıyor.
U=mehmetali; H=/home/$U
sudo -u $U -H bash -lc '
export PATH=$HOME/.local/node/bin:$HOME/.local/bin:$PATH
npm rm -g @anthropic-ai/claude-code >/dev/null 2>&1; rm -f $HOME/.local/bin/claude
npm i -g @anthropic-ai/claude-code@2.1.112 >/tmp/cc3.log 2>&1 || tail -4 /tmp/cc3.log; rm -f /tmp/cc3.log
mkdir -p $HOME/.claude
' 
# otomatik güncelleme kapalı (yeni sürüm bu işlemcide açılmaz)
L='export DISABLE_AUTOUPDATER=1'
for f in $H/.bashrc $H/.profile; do grep -q DISABLE_AUTOUPDATER $f || { echo "$L" >> $f; chown $U:$U $f; }; done
echo "NOT: sürüm: $(sudo -u $U -H bash -lc 'claude --version' 2>&1 | tail -1 | cut -c1-200)"
echo "NOT: konum: $(sudo -u $U -H bash -lc 'readlink -f $(command -v claude)' 2>&1)"
