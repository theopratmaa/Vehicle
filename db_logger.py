import psycopg2
from datetime import datetime
import json

class DBLogger:
    def __init__(self):
        self.connection = psycopg2.connect(
            dbname="mydb",
            user="theo",
            password="theo123",
            host="localhost",x
            port="5432"
        )
        self.cursor = self.connection.cursor()

    def log(self, detection):
        ts = datetime.now()
        query = """
            INSERT INTO tracking_data (track_id, created_at, class)
            VALUES (%s, %s, %s)
        """
        self.cursor.execute(query, (
            detection.get("id"),
            ts,
            detection.get("class"),
        ))
        self.connection.commit()
