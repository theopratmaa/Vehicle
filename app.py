from flask import Flask, render_template, jsonify, request
import psycopg2
from psycopg2 import pool
from datetime import datetime, timedelta
import pytz
import json

app = Flask(__name__)

class DatabaseConnector:
    def __init__(self):
        # Gunakan connection pool untuk menghindari connection timeout
        self.connection_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,  # min dan max connections
            dbname="mydb",
            user="postgres",
            password="123",
            host="localhost",
            port="5432"
        )

    def get_connection(self):
        return self.connection_pool.getconn()

    def return_connection(self, conn):
        self.connection_pool.putconn(conn)

    def get_tracking_data(self, date_filter=None, class_filter=None, limit=None):
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SET timezone TO 'Asia/Jakarta'")
            
            query = "SELECT track_id, created_at AT TIME ZONE 'Asia/Jakarta' as local_time, class FROM tracking_data WHERE 1=1"
            params = []

            if date_filter:
                query += " AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = %s"
                params.append(date_filter)
            
            if class_filter:
                query += " AND class = %s"
                params.append(class_filter)

            query += " ORDER BY created_at DESC"
            
            if limit:
                query += " LIMIT %s"
                params.append(int(limit))

            cursor.execute(query, params)
            result = cursor.fetchall()
            cursor.close()
            return result
            
        except Exception as e:
            print(f"Database error in get_tracking_data: {e}")
            raise e
        finally:
            if conn:
                self.return_connection(conn)

    def get_statistics(self):
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SET timezone TO 'Asia/Jakarta'")
            
            # Total detections
            cursor.execute("SELECT COUNT(*) FROM tracking_data")
            total = cursor.fetchone()[0]

            # Cars count
            cursor.execute("SELECT COUNT(*) FROM tracking_data WHERE class = 'car'")
            cars = cursor.fetchone()[0]

            # Motorcycles count
            cursor.execute("SELECT COUNT(*) FROM tracking_data WHERE class = 'motorcycle'")
            motorcycles = cursor.fetchone()[0]

            # Today's data for hourly average
            today = datetime.now().date()
            cursor.execute(
                "SELECT COUNT(*) FROM tracking_data WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = %s", 
                (today,)
            )
            today_count = cursor.fetchone()[0]
            
            cursor.close()
            return {
                'total': total,
                'cars': cars,
                'motorcycles': motorcycles,
                'avg_per_hour': round(today_count / 24) if today_count > 0 else 0
            }
            
        except Exception as e:
            print(f"Database error in get_statistics: {e}")
            raise e
        finally:
            if conn:
                self.return_connection(conn)

    def get_hourly_data(self):
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SET timezone TO 'Asia/Jakarta'")
            
            cursor.execute("""
                SELECT 
                    EXTRACT(hour FROM created_at AT TIME ZONE 'Asia/Jakarta') as hour,
                    COUNT(*) as count
                FROM tracking_data 
                WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = CURRENT_DATE
                GROUP BY hour
                ORDER BY hour
            """)
            result = cursor.fetchall()
            cursor.close()
            return result
            
        except Exception as e:
            print(f"Database error in get_hourly_data: {e}")
            raise e
        finally:
            if conn:
                self.return_connection(conn)

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

        print(f"API /data called with filters: date={date_filter}, class={class_filter}, limit={limit}")
        
        data = db.get_tracking_data(date_filter, class_filter, limit)
        
        formatted_data = []
        for row in data:
            formatted_data.append({
                'track_id': row[0],
                'created_at': row[1].isoformat() if row[1] else None,
                'class': row[2]
            })

        print(f"Returning {len(formatted_data)} records")
        return jsonify(formatted_data)
    
    except Exception as e:
        print(f"Error in /api/data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/statistics')
def get_statistics():
    try:
        print("API /statistics called")
        stats = db.get_statistics()
        print(f"Statistics: {stats}")
        return jsonify(stats)
    except Exception as e:
        print(f"Error in /api/statistics: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/hourly-data')
def get_hourly_data():
    try:
        print("API /hourly-data called")
        hourly_data = db.get_hourly_data()
        result = [{'hour': int(row[0]), 'count': row[1]} for row in hourly_data]
        print(f"Hourly data: {result}")
        return jsonify(result)
    except Exception as e:
        print(f"Error in /api/hourly-data: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)