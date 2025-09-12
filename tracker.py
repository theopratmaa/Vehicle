from deep_sort_realtime.deepsort_tracker import DeepSort

class ObjectTracker:
    def __init__(self):
        self.tracker = DeepSort(max_age=30)

    def track(self, detections, frame):
        """
        Input: detections [ [x1, y1, x2, y2, conf, cls], ... ]
        Output: list of tracks {
            id, class, bbox=[x1,y1,x2,y2], confidence
        }
        """
        det_for_tracker = []
        for det in detections:
            x1, y1, x2, y2, conf, cls = det
            w = x2 - x1
            h = y2 - y1
            det_for_tracker.append(([x1, y1, w, h], conf, cls))

        tracks = self.tracker.update_tracks(det_for_tracker, frame=frame)

        output = []
        for t in tracks:
            if not t.is_confirmed():
                continue

            track_id = t.track_id
            ltrb = t.to_ltrb()  # numpy array xyxy
            cls = t.get_det_class()

            # Ambil confidence langsung dari tracker
            conf = getattr(t, "det_conf", None)

            output.append({
            "id": track_id,
            "class": cls,
            "bbox": ltrb.tolist(),
        })
        return output
