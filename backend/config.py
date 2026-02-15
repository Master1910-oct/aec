class Config:
    SQLALCHEMY_DATABASE_URI = (
        "mysql+pymysql://root:Aakash%40191005@localhost:3306/emergency_ambulance_system"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "supersecretkey"
