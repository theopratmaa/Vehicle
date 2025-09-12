import psycopg2
from datetime import datetime
import json
import pytz

class DBLogger:
    def __init__(self):
        self.connection = psycopg2.connect(
            dbname="vehicle_db",
            user="postgres",
            password="123",
            host="localhost",
            port="5432"
        )
        self.cursor = self.connection.cursor()

    def log(self, detection):
        # Gunakan waktu lokal Indonesia (UTC+7)
        jakarta_tz = pytz.timezone('Asia/Jakarta')
        ts = datetime.now(jakarta_tz)

        # Map label Indonesia ke label Inggris
        label_map = {
            "mobil": "car",
            "motor": "motorcycle", 
            "sepeda motor": "motorcycle",
            "orang": "person",
            "sepeda": "bicycle",
            "bus": "bus",
            "truk": "truck",
            # Jika sudah dalam bahasa Inggris, tetap sama
            "car": "car",
            "motorcycle": "motorcycle",
            "person": "person",
            "bicycle": "bicycle",
            "truck": "truck"
        }

        raw_class = detection.get("class", "").lower().strip()
        normalized_class = label_map.get(raw_class, "car")  # default ke "car" jika tidak dikenali

        query = """
            INSERT INTO tracking_data (track_id, created_at, class)
            VALUES (%s, %s, %s)
        """
        self.cursor.execute(query, (
            detection.get("id"),
            ts,
            normalized_class,
        ))
        self.connection.commit()
