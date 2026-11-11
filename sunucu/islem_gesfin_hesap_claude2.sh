#!/bin/bash
# Claude Code (npm/Node sürümü) yalnız mehmetali hesabına (~/.local). Yerel ikili SSE4.2 istediği için.
U=mehmetali; H=/home/$U
echo "NOT: cpu: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2) | sse4_2: $(grep -m1 -o -w sse4_2 /proc/cpuinfo || echo yok) | sse4_1: $(grep -m1 -o -w sse4_1 /proc/cpuinfo || echo yok)"
sudo -u $U -H bash -lc '
set -e
V=v22.11.0; D=$HOME/.local/node
if [ ! -x $D/bin/node ]; then mkdir -p $HOME/.local; curl -fsSL https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz -o /tmp/n.txz; mkdir -p $D; tar xJf /tmp/n.txz -C $D --strip-components=1; rm -f /tmp/n.txz; fi
export PATH=$D/bin:$HOME/.local/bin:$PATH
node -v
npm config set prefix $HOME/.local >/dev/null
npm i -g @anthropic-ai/claude-code >/tmp/cc_npm.log 2>&1 || { tail -5 /tmp/cc_npm.log; exit 1; }
' > /tmp/cc2.log 2>&1; echo "NOT: kurulum: $(tail -n 6 /tmp/cc2.log | tr '\n' ' ' | cut -c1-400)"; rm -f /tmp/cc2.log
L='export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"'
for f in $H/.bashrc $H/.profile; do grep -q '.local/node/bin' $f 2>/dev/null || { echo "$L" >> $f; chown $U:$U $f; }; done
echo "NOT: sürüm: $(sudo -u $U -H bash -lc 'claude --version' 2>&1 | tail -2 | tr '\n' ' ' | cut -c1-300)"
echo "NOT: konum: $(sudo -u $U -H bash -lc 'command -v claude; readlink -f $(command -v claude)' 2>&1 | tr '\n' ' ')"
