
from sqlalchemy import create_engine, text

DATABASE_URI = "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"
engine = create_engine(DATABASE_URI)

def run_migration():
    queries = [
        "ALTER TABLE ambulances ADD COLUMN last_latitude FLOAT NULL;",
        "ALTER TABLE ambulances ADD COLUMN last_longitude FLOAT NULL;",
        "ALTER TABLE ambulances ADD COLUMN last_location_updated_at DATETIME NULL;",
        "ALTER TABLE hospital ADD COLUMN max_capacity INTEGER NOT NULL DEFAULT 100;"
    ]
    
    with engine.connect() as conn:
        for query in queries:
            try:
                conn.execute(text(query))
                print(f"Executed: {query}")
            except Exception as e:
                print(f"Error executing {query}: {e}")
        conn.commit()

if __name__ == "__main__":
    run_migration()
