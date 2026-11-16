import sys, numpy as np, cv2, subprocess
W, H = 1080, 1216
def oku(p): return cv2.resize(cv2.imread(p), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
def fark_maske(a, b):
    d = cv2.GaussianBlur(np.abs(a - b).mean(2), (0, 0), 6)
    m = (d > 22).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 1500: keep[lab == i] = 1
    return cv2.dilate(keep, np.ones((25, 25), np.uint8))
def darbeler(m, rng):
    ys, xs = np.nonzero(m); out = []
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    # bölgeyi yatay şeritlerle tara: her şerit bir fırça darbesi (soldan sağa / sağdan sola)
    y = y0
    while y <= y1:
        kal = rng.integers(26, 44); sol = rng.random() < .5
        out.append((y, kal, x0 - 20, x1 + 20, sol)); y += int(kal * .7)
    rng.shuffle(out[1:-1]) if len(out) > 3 else None
    return out
def ciz(a, b, cikti, sure=2.4, fps=30, seed=1, bolge=None, temel=None):
    A, B = oku(a), oku(b); rng = np.random.default_rng(seed)
    M = fark_maske(A, B)
    if bolge:  # yalnız bu bölgedeki farkı boya (x0,y0,x1,y1 oran); B bölge dışında A kalır
        z = np.zeros_like(M); x0, y0, x1, y1 = bolge; z[int(y0*H):int(y1*H), int(x0*W):int(x1*W)] = 1; M = M * z
        B = A * (1 - M[..., None]) + B * M[..., None]
    D = darbeler(M, rng); N = int(sure * fps)
    acc = np.zeros((H, W), np.float32)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", cikti], stdin=subprocess.PIPE)
    per = max(1, (N - 8) / len(D))
    for f in range(N):
        k = f / per
        for i, (y, kal, xa, xb, sol) in enumerate(D):
            if i > k: break
            t = min(1, k - i)
            xs, xe = (xa, xa + (xb - xa) * t) if sol else (xb - (xb - xa) * t, xb)
            pts = np.array([[x, y + 6 * np.sin(x / 37 + i)] for x in np.linspace(xs, xe, 40)], np.int32)
            st = np.zeros((H, W), np.uint8); cv2.polylines(st, [pts], False, 255, int(kal), cv2.LINE_AA)
            acc = np.maximum(acc, st.astype(np.float32) / 255)
        # fırça kenarı: kıl dokusu (yatay gürültü) ile kenar pürüzü
        nz = cv2.GaussianBlur(rng.random((H, W)).astype(np.float32), (0, 0), 1.2)
        m = np.clip((acc * 1.4 - 0.25 + (nz - .5) * .5), 0, 1) * M
        if f >= N - 8: m = np.maximum(m, M * (f - (N - 8)) / 8.0) if bolge else np.maximum(m, (f - (N - 8)) / 8.0)   # son karelerde tümü B'ye otursun
        o = A * (1 - m[..., None]) + B * m[..., None]
        p.stdin.write(o.astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()
if __name__ == "__main__":
    b = [float(x) for x in sys.argv[5].split(",")] if len(sys.argv) > 5 else None
    ciz(sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), bolge=b)
