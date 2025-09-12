import cv2
from detector import ObjectDetector
from tracker import ObjectTracker
from db_logger import DBLogger

# Pakai URL CCTV stream
VIDEO_SOURCE = "https://pelindung.bandung.go.id:3443/video/DAHUA/DepanTop.m3u8" 

detector = ObjectDetector()
tracker = ObjectTracker()
logger = DBLogger()

cap = cv2.VideoCapture(VIDEO_SOURCE, cv2.CAP_FFMPEG)

if not cap.isOpened():
    print("[ERROR] Tidak bisa membuka stream:", VIDEO_SOURCE)
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("[WARNING] Gagal baca frame, stream mungkin putus")
        break

    # 1. Deteksi objek
    detections = detector.detect(frame)

    # 2. Tracking objek
    tracks = tracker.track(detections, frame)

    # 3. Logging
    for tr in tracks:
        logger.log(tr)

    # 4. Visualisasi
    for tr in tracks:
        x1, y1, x2, y2 = map(int, tr["bbox"])
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{tr['class']} ID:{tr['id']}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (0, 255, 0), 2)

    cv2.imshow("Bridge Monitoring", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
