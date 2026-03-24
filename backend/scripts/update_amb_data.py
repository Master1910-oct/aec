import os
from sqlalchemy import create_engine, text

DB_URI = "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"
engine = create_engine(DB_URI)

sql_updates = [
    "UPDATE ambulances SET latitude = 13.0900, longitude = 80.2750, last_updated = NOW() WHERE ambulance_id = 1;",
    "UPDATE ambulances SET latitude = 12.9800, longitude = 77.6000, last_updated = NOW() WHERE ambulance_id = 2;"
]

try:
    with engine.begin() as connection:
        for sql in sql_updates:
            print(f"Executing: {sql}")
            connection.execute(text(sql))
        
        print("\nVerifying updates...")
        result = connection.execute(text("SELECT ambulance_id, vehicle_number, latitude, longitude, status FROM ambulances;"))
        for row in result:
            print(row)

except Exception as e:
    print(f"Error during DB update: {e}")

os._exit(0)
