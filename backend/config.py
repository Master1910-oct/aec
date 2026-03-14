import os
class Config:
    SQLALCHEMY_DATABASE_URI = (
        "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_fallback_secret")
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True
    }
    JWT_SECRET_KEY = "aes-emergency-system-secret-key-2026"
