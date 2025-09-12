from ultralytics import YOLO
import torch

class ObjectDetector:
    def __init__(self, model_name="best.pt"):
        # pilih device otomatis
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[INFO] Loading YOLO model on {self.device.upper()}...")
        self.model = YOLO(model_name)

        # Daftar kelas COCO yang relevan (sesuai kebutuhan jembatan)
        # 0=person, 1=bicycle, 2=car, 3=motorcycle, 
        # 17=cat, 18=dog, 19=horse, 20=sheep, 21=cow,
        # 5=bus (opsional), 7=truck (opsional), 
        # 14=bird, 15=cat, 16=dog, 17=horse (kalau ada hewan lain)
        self.allowed_classes = [0, 1, 2, 3, 5, 7, 21, 20, 17, 18]

    def detect(self, frame):
        detections = []
        results = self.model.predict(
            frame, 
            imgsz=640, 
            conf=0.5,          # threshold confidence
            iou=0.45,          # threshold NMS
            classes=self.allowed_classes, 
            stream=True, 
            device=self.device,
            verbose=False
        )

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                label = r.names[cls]
                detections.append([x1, y1, x2, y2, conf, label])
        return detections
