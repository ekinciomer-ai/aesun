import os, cv2, numpy as np, time
G, C = os.environ["GIRDI"], os.environ["CIKTI"]
u = cv2.imread(f"{G}/uydu.jpg"); u = cv2.resize(u, (640, int(640 * u.shape[0] / u.shape[1])))
g = cv2.cvtColor(u, cv2.COLOR_BGR2GRAY)
kenar = cv2.cvtColor(cv2.Canny(cv2.GaussianBlur(g, (5, 5), 0), 60, 160), cv2.COLOR_GRAY2BGR)
# su yüzeyi (koyu mavi-yeşil) maskesi ve alan
hsv = cv2.cvtColor(u, cv2.COLOR_BGR2HSV)
m = cv2.inRange(hsv, (70, 30, 20), (130, 255, 160))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
su = u.copy(); su[m > 0] = (0.5 * su[m > 0] + 0.5 * np.array([255, 120, 0])).astype(np.uint8)
cv2.putText(su, f"su yuzeyi: %{100*m.mean()/255:.1f}", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
cv2.imwrite(f"{C}/opencv_uydu_kenar_su.jpg", np.hstack([u, kenar, su]))
a = cv2.imread(f"{G}/astronot.jpg"); a = cv2.resize(a, (480, int(480 * a.shape[0] / a.shape[1])))
cizgi = cv2.stylization(a, sigma_s=60, sigma_r=0.45)
kara, _ = cv2.pencilSketch(a, sigma_s=60, sigma_r=0.07, shade_factor=0.05)
cv2.imwrite(f"{C}/opencv_efekt.jpg", np.hstack([a, cizgi, cv2.cvtColor(kara, cv2.COLOR_GRAY2BGR)]))
print("tamam")
