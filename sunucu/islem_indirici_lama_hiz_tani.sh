#!/bin/bash
# Teşhis: LaMa ONNX tek çağrı süresi (512/256, 1 ve 4 iş parçacığı)
KOK=/opt/tampon/indirici
grep -o -m1 'avx2\|avx\b\|sse4_2' /proc/cpuinfo | sort -u | tr '\n' ' ' | sed 's/^/NOT: işlemci özellikleri: /'; echo
grep -m1 'model name' /proc/cpuinfo | sed 's/^/NOT: /'
$KOK/venv/bin/python - <<'PY'
import onnxruntime as ort, numpy as np, time
for th in (1, 4):
    so = ort.SessionOptions(); so.intra_op_num_threads = th
    s = ort.InferenceSession("/opt/tampon/indirici/model/lama_fp32.onnx", so, providers=["CPUExecutionProvider"])
    g = [i.name for i in s.get_inputs()]; sh = [i.shape for i in s.get_inputs()]
    x = np.random.rand(1,3,512,512).astype(np.float32); m = np.zeros((1,1,512,512),np.float32); m[...,200:260,100:400]=1
    s.run(None,{g[0]:x,g[1]:m}); t=time.time()
    for _ in range(2): s.run(None,{g[0]:x,g[1]:m})
    print(f"NOT: 512px {th} thread: {(time.time()-t)/2:.2f} sn/çağrı · girişler {sh}")
PY
