import os
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

USER = os.getenv("DB_USERNAME")
PASS = quote_plus(os.getenv("DB_PASSWORD", ""))
HOST = os.getenv("DB_HOST")
PORT = os.getenv("DB_PORT")
NAME = os.getenv("DB_NAME")

URI = f"mysql+pymysql://{USER}:{PASS}@{HOST}:{PORT}/{NAME}"
print(f"Connecting to: {HOST}:{PORT}/{NAME}...")

try:
    engine = create_engine(URI, connect_args={"connect_timeout": 5})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1"))
        print(f"Success: {res.fetchone()}")
except Exception as e:
    print(f"FAILED: {e}")
