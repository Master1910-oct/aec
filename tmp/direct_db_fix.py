import pymysql

# Connection details from config.py
host = 'localhost'
user = 'root'
password = 'Aakash@191005'
db_name = 'emergency_ambulance_system'

try:
    print(f"Connecting to {db_name}...")
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=db_name,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with connection.cursor() as cursor:
        print("Checking columns in 'ambulances'...")
        cursor.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'emergency_ambulance_system'
            AND TABLE_NAME = 'ambulances'
            AND COLUMN_NAME IN ('last_latitude','last_longitude','last_location_updated_at')
        """)
        found_amb = [row['COLUMN_NAME'] for row in cursor.fetchall()]
        print(f"Found in ambulances: {found_amb}")
        
        if len(found_amb) < 3:
            print("Adding columns to 'ambulances'...")
            cursor.execute("""
                ALTER TABLE ambulances
                ADD COLUMN IF NOT EXISTS last_latitude FLOAT NULL,
                ADD COLUMN IF NOT EXISTS last_longitude FLOAT NULL,
                ADD COLUMN IF NOT EXISTS last_location_updated_at DATETIME NULL
            """)
            print("ALTER TABLE ambulances OK.")
        
        print("\nChecking columns in 'hospital'...")
        cursor.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'emergency_ambulance_system'
            AND TABLE_NAME = 'hospital'
            AND COLUMN_NAME = 'max_capacity'
        """)
        found_hosp = [row['COLUMN_NAME'] for row in cursor.fetchall()]
        print(f"Found in hospital: {found_hosp}")
        
        if len(found_hosp) < 1:
            print("Adding column 'max_capacity' to 'hospital'...")
            cursor.execute("""
                ALTER TABLE hospital
                ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 100
            """)
            print("ALTER TABLE hospital OK.")
            
        connection.commit()
        print("\nDatabase update completed successfully.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'connection' in locals():
        connection.close()
