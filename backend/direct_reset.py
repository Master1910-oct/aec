from sqlalchemy import create_all, create_engine, text
import datetime

DATABASE_URI = "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"

def reset_sql():
    print("Starting direct SQL reset...")
    engine = create_engine(DATABASE_URI)
    query = text("UPDATE ambulances SET status = 'AVAILABLE', last_updated = :now WHERE status = 'ON_CALL'")
    
    with engine.connect() as connection:
        result = connection.execute(query, {"now": datetime.datetime.utcnow()})
        connection.commit()
        print(f"SQL Reset Complete: {result.rowcount} ambulances updated.")

if __name__ == "__main__":
    reset_sql()
