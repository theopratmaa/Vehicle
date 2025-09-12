from flask import Flask, render_template, jsonify, request
import psycopg2
from datetime import datetime, timedelta
import pytz
import json

app = Flask(__name__)

class DatabaseConnector:
    def __init__(self):
        self.connection = psycopg2.connect(
            dbname="vehicle_db",
            user="postgres",
            password="123",
            host="localhost",
            port="5432"
        )
        self.cursor = self.connection.cursor()
        # Set timezone untuk koneksi
        self.cursor.execute("SET timezone TO 'Asia/Jakarta'")

    def get_tracking_data(self, date_filter=None, class_filter=None, limit=None):
        query = "SELECT track_id, created_at AT TIME ZONE 'Asia/Jakarta' as local_time, class FROM tracking_data WHERE 1=1"
        params = []

        if date_filter:
            # Gunakan sintaks PostgreSQL untuk filter tanggal dengan timezone lokal
            query += " AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = %s"
            params.append(date_filter)
        
        if class_filter:
            query += " AND class = %s"
            params.append(class_filter)

        query += " ORDER BY created_at DESC"
        
        if limit:
            query += " LIMIT %s"
            params.append(int(limit))

        self.cursor.execute(query, params)
        return self.cursor.fetchall()

    def get_statistics(self):
        # Total detections
        self.cursor.execute("SELECT COUNT(*) FROM tracking_data")
        total = self.cursor.fetchone()[0]

        # Cars count
        self.cursor.execute("SELECT COUNT(*) FROM tracking_data WHERE class = 'car'")
        cars = self.cursor.fetchone()[0]

        # Motorcycles count
        self.cursor.execute("SELECT COUNT(*) FROM tracking_data WHERE class = 'motorcycle'")
        motorcycles = self.cursor.fetchone()[0]

        # Today's data for hourly average (menggunakan timezone lokal)
        today = datetime.now().date()
        self.cursor.execute(
            "SELECT COUNT(*) FROM tracking_data WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = %s", 
            (today,)
        )
        today_count = self.cursor.fetchone()[0]
        
        return {
            'total': total,
            'cars': cars,
            'motorcycles': motorcycles,
            'avg_per_hour': round(today_count / 24) if today_count > 0 else 0
        }

    def get_hourly_data(self):
        """Ambil data per jam untuk analisis peak hour dengan timezone lokal"""
        self.cursor.execute("""
            SELECT 
                EXTRACT(hour FROM created_at AT TIME ZONE 'Asia/Jakarta') as hour,
                COUNT(*) as count
            FROM tracking_data 
            WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = CURRENT_DATE
            GROUP BY hour
            ORDER BY hour
        """)
        return self.cursor.fetchall()

db = DatabaseConnector()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    try:
        date_filter = request.args.get('date')
        class_filter = request.args.get('class')
        limit = request.args.get('limit')

        data = db.get_tracking_data(date_filter, class_filter, limit)
        
        formatted_data = []
        for row in data:
            formatted_data.append({
                'track_id': row[0],
                'created_at': row[1].isoformat(),
                'class': row[2]
            })

        return jsonify(formatted_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/statistics')
def get_statistics():
    try:
        stats = db.get_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hourly-data')
def get_hourly_data():
    try:
        hourly_data = db.get_hourly_data()
        return jsonify([{'hour': int(row[0]), 'count': row[1]} for row in hourly_data])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)