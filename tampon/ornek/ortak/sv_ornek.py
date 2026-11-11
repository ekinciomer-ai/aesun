import os, cv2, time, supervision as sv
from ultralytics import YOLO
G, C = os.environ["GIRDI"], os.environ["CIKTI"]
m = YOLO("yolo11n.pt")
for ad in ("otobus.jpg", "uydu.jpg", "kare.jpg"):
    img = cv2.imread(f"{G}/{ad}"); t0 = time.time()
    r = m(img, verbose=False)[0]; d = sv.Detections.from_ultralytics(r)
    et = [f"{m.names[c]} {p:.2f}" for c, p in zip(d.class_id, d.confidence)]
    o = sv.BoxAnnotator(thickness=3).annotate(img.copy(), d)
    o = sv.LabelAnnotator(text_scale=0.7).annotate(o, d, labels=et)
    cv2.imwrite(f"{C}/supervision_{ad}", o)
    print(ad, len(d), "nesne", f"{time.time()-t0:.2f} sn", et[:8])
