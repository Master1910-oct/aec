from sqlalchemy import create_engine, text
import os

DB_URI = "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"
engine = create_engine(DB_URI)

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT * FROM ambulances"))
        rows = result.fetchall()
        print(f"Ambulance Count: {len(rows)}")
        for row in rows:
            print(row)
except Exception as e:
    print(f"Error: {e}")

os._exit(0)
