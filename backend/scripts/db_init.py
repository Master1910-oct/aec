"""
db_init.py  ─  Drop all tables, recreate schema, insert base seed data.
All 191 hospitals from hospitals.csv are seeded with user_id=None.
Run seed scripts after this:
    python scripts/seed_hospital_users.py
    python scripts/seed_ambulance_users.py

Run from the backend directory:
    venv\\Scripts\\python.exe scripts\\db_init.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from flask import Flask
from werkzeug.security import generate_password_hash
from config import Config
from database.db import db
from sqlalchemy import text

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# ── Import real models ──────────────────────────────────────
from models.user import User
from models.hospital import Hospital
from models.ambulance import Ambulance
from models.availability import Availability
from models.emergency import EmergencyRequest

with app.app_context():
    print("⬇  Dropping all tables ...")
    with db.engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in ["emergency_requests", "availability", "ambulances", "hospital", "users", "alembic_version"]:
            conn.execute(text(f"DROP TABLE IF EXISTS `{table}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        conn.commit()

    print("⬆  Creating tables from models ...")
    db.create_all()
    print("✅ Schema created.\n")

    # ── Seed admin user ─────────────────────────────────────
    admin = User(name="System Admin", email="admin@aes.com", role="admin")
    admin.password_hash = generate_password_hash("admin123")
    db.session.add(admin)
    db.session.flush()
    print("✅ Admin user created: admin@aes.com / admin123")

    # ── Seed 191 Hospitals (user_id=None, seed script fills) ─
    hospitals_data = [        ('City General Hospital', 'Chennai', 13.0827, 80.2707, 'trauma,cardiac,neurological,orthopaedic,paediatric', '9876543210', 100),
        ('Apollo Emergency Care', 'Bangalore', 12.9716, 77.5946, 'respiratory,cardiac,ent,dermatology,other', '9123456780', 100),
        ('Rajiv Gandhi Government General Hospital', 'Park Town, Chennai', 13.0829, 80.2785, 'trauma,cardiac,neurological,respiratory,urology,paediatric', '9876500001', 500),
        ('Stanley Medical College Hospital', 'Old Jail Road, Chennai', 13.1073, 80.2893, 'trauma,cardiac,orthopaedic,paediatric,other', '9876500002', 400),
        ('Kilpauk Medical College Hospital', 'Kilpauk, Chennai', 13.0836, 80.2376, 'neurological,cardiac,respiratory,psychiatry,other', '9876500003', 300),
        ('Coimbatore Medical College Hospital', 'R.S. Puram, Coimbatore', 11.007, 76.9629, 'trauma,cardiac,orthopaedic,respiratory,other', '9876500004', 350),
        ('PSG Hospitals', 'Avinashi Road, Coimbatore', 11.0238, 77.0014, 'cardiac,neurological,respiratory,oncology,paediatric', '9876500005', 250),
        ('Government Rajaji Hospital', 'Madurai', 9.9302, 78.1198, 'trauma,cardiac,neurological,paediatric,urology', '9876500006', 400),
        ('Meenakshi Mission Hospital', 'Lake Area, Madurai', 9.9195, 78.1284, 'cardiac,respiratory,maternity,dermatology,other', '9876500007', 200),
        ('Mahatma Gandhi Memorial Government Hospital', 'Trichy', 10.805, 78.6856, 'trauma,neurological,orthopaedic,urology,other', '9876500008', 300),
        ('Salem Government Hospital', 'Saradha College Road, Salem', 11.6643, 78.146, 'trauma,cardiac,respiratory,orthopaedic,other', '9876500009', 250),
        ('Christian Medical College', 'Ida Scudder Road, Vellore', 12.9236, 79.1348, 'trauma,cardiac,neurological,respiratory,oncology,maternity,paediatric,orthopaedic,ophthalmology,ent,urology,psychiatry,dermatology', '9876500010', 600),
        ('A A Hospital', 'Denkani Kottai Road Mathigiri, Hosur', 12.6973, 77.7771, 'trauma,other', '9800000000', 100),
        ('A C Hospital', 'No-8, 3Rd Main Road, United India Nagar, Ayanavaram, Chennai-600023, Chennai', 13.0588, 80.268, 'trauma,other', '9800000000', 100),
        ('A.C. Hospital', '201,2Nd Agraharam, Salem', 11.6418, 78.143, 'trauma,other', '9800000000', 100),
        ('A.G. Eye Care Hospitals (U Nit Of Dr. A.G. Eye Hospitals Private Limited', 'No. 106, R.K. Mutt Road. Mylapore, Chennai, Tamilnadu, Chennai', 13.0435, 80.2894, 'ophthalmology,other', '9800000000', 100),
        ('A.G. Hospital', '34, Kpn Colony 3Rd Street, Tirupur, Coimbatore', 10.9879, 76.9614, 'trauma,other', '9800000000', 100),
        ('A.G. Padmavati\'S Hospital Ltd.', 'R.S. No.127/A, Villianur Main Road, Arumparthapuram, Puducherry, Pondicherry', 11.971, 79.7625, 'trauma,other', '9800000000', 100),
        ('A.N.N Hospital', '81-85,Annai Therasa Street,Valasaravakkam, Chennai', 13.0433, 80.2417, 'trauma,other', '9800000000', 100),
        ('A.R.Hospital Pvt Ltd', '609, K.K.Nagar, Madurai-625020, Madurai', 9.8801, 78.0838, 'cardiac,trauma,other', '9800000000', 100),
        ('A.V. Hospitals', '# 172, Solaiappan Street, Tondirepet (North Chennai) Near Maharani Theatre, Chennai', 13.0894, 80.2705, 'trauma,other', '9800000000', 100),
        ('A.V.M. Hospital A.V.M.M. Associates (P) Ltd', '# 135, Palayamkottai Roadtuticorin, Tuticorin', 8.8062, 78.1623, 'cardiac,trauma,other', '9800000000', 100),
        ('Aakash Hospital', '# 393/1, T.H. Road, (Annexe) 393/1, Tiruvottiyur.Tiruvallur, Chennai', 13.0957, 80.2318, 'trauma,other', '9800000000', 100),
        ('Aarthi Hospital', '60,Santhaipettai Street, Tirunelveli', 8.7595, 77.7948, 'trauma,other', '9800000000', 100),
        ('Aarthy Eye Hospital', '#16, Sengunthapuram Main Road, Karur., Karur', 11.0049, 78.0954, 'ophthalmology,other', '9800000000', 100),
        ('Abdul Khadir Hospital', 'Parakkai Road,Elankadai,Kottar, Nagercoil', 8.178, 77.4365, 'trauma,other', '9800000000', 100),
        ('Abhijay Hospital (P) Ltd.', 'No.22/2, E.S.I Hospital Road,Peravallur,, Chennai', 13.0763, 80.2788, 'trauma,other', '9800000000', 100),
        ('Abinand Hospital', '237-F/7, Pollachi Main Road,Sundarapuram, Coimbatore, Coimbatore', 10.9963, 76.9071, 'trauma,other', '9800000000', 100),
        ('Abiraami Hospital', '24-Alc,Campus,Manjakuppam, Cuddalore', 11.7, 79.8051, 'trauma,other', '9800000000', 100),
        ('Acchutha Eye Care', '#H-3, Evn Road, Permar Nagar, Near Surampatti Nall Road, Erode-638009, Erode', 11.3484, 77.6676, 'ophthalmology,other', '9800000000', 100),
        ('Adithya Speciality Hospital', '277, G.S.T Main Road, Near Harveypatty Bus Stop, Thirunagar, Madurai - 625006, Madurai', 9.9359, 78.1379, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Aditya Hospital', 'No.7, Barnbay Road, Kilpauk, Chennai-600010, Chennai', 13.0527, 80.2469, 'trauma,other', '9800000000', 100),
        ('Adyar P.M. Hospital', '# 58, L.B. Road, Adyar, Chennai-600020Chennai, Chennai', 13.1144, 80.2712, 'trauma,other', '9800000000', 100),
        ('Agash Nursing Home', '#234, G.S.T. Road, Chromepet, Chennai', 13.1283, 80.277, 'maternity,paediatric,other', '9800000000', 100),
        ('Ak Hospital', '360 Poonamallee High Road,Junction Of Ph Rd &, Chennai', 13.0779, 80.2543, 'trauma,other', '9800000000', 100),
        ('Akilesh Orthopaedics Hospitals', '95-97, Sasthiri Road, Rammagar., Coimbatore', 11.0122, 76.9128, 'orthopaedic,trauma,other', '9800000000', 100),
        ('Alva Hospital Pvt Ltd', '74/A2, Meenkarai Road,Pollachi Coimbatore, Pollachi', 10.6673, 77.0194, 'cardiac,trauma,other', '9800000000', 100),
        ('Amaravathi Hospital', '#74, Ramanujam Nagar, Kovai Road, Karur, Tamilnadu., Karur', 10.9377, 78.0708, 'trauma,other', '9800000000', 100),
        ('Amma Hospital', '# 1, Sowrastra Nagar7Th Street, Chennai, Chennai', 13.1299, 80.2538, 'trauma,other', '9800000000', 100),
        ('Amma Hospital', 'Bangalore Road, Hosur Town, Krishnagiri', 12.5658, 78.1968, 'trauma,other', '9800000000', 100),
        ('Ammayi Eye Hospital', 'New # 80, 7Th Avenue, Ashoknagar, Chennai-600083, Chennai', 13.1054, 80.2959, 'ophthalmology,other', '9800000000', 100),
        ('Amrit Medicare Pvt Ltd', 'No.310,Mint Street,Near Sowcarpet, Chennai-600079, Chennai', 13.0358, 80.272, 'cardiac,trauma,other', '9800000000', 100),
        ('Amudha Poly Clinic And Hospital', '101,Athani Road,Sathyamangalam,Erode, Erode', 11.3663, 77.6685, 'trauma,other', '9800000000', 100),
        ('Anand Hospital', '201, Kamaraj Salai,Manali,Chennaimanali, Chennai', 13.0802, 80.3043, 'trauma,other', '9800000000', 100),
        ('Anand Hospitals', '#97/54,Jg Nagar,2Nd Street,60 Feet Road,, Tiruppur', 11.0669, 77.364, 'trauma,other', '9800000000', 100),
        ('Anbu Hospital', 'No.150/1,Kamarajar Salai,, Madurai', 9.8761, 78.1682, 'trauma,other', '9800000000', 100),
        ('Anbu Hospital', '# 4,5, Lakshmivilas Street, Kumbakonam, Tanjore', 10.7379, 79.1862, 'trauma,other', '9800000000', 100),
        ('Andhra Mahila Sabha', 'No.11 & 12, Dr.Durgabaideshmukh Road, R.A.Puram,, Chennai', 13.0838, 80.2287, 'trauma,other', '9800000000', 100),
        ('Anjakha Hospital', '#23,Medavakkam Main Road,Madipakkam, Kanchipuram', 12.8046, 79.7299, 'trauma,other', '9800000000', 100),
        ('Annai Ent And Head & Neck Care Centre', '#12D,Palaniappa Street,Perundurai Road, Erode', 11.3419, 77.7469, 'ent,other', '9800000000', 100),
        ('Annai Hospital', '5-82/1, Kurumbanai Road, Karungal, Kanyakumari, Tamilnadu, Kanyakumari', 8.1258, 77.5529, 'trauma,other', '9800000000', 100),
        ('Annai Velankanni Nursing Home', 'Post Box No.107, Murugan Kurichi, Palayamkottai., Tirunelveli', 8.758, 77.757, 'maternity,paediatric,other', '9800000000', 100),
        ('Annamalai Hospital', '# 27, Govindan Raod, West Mambalam, Near Srinivasa Theatre, Chennai', 13.0376, 80.2374, 'trauma,other', '9800000000', 100),
        ('Annammal Hospital', 'Kuzhithurai, Kuzhithurai', 8.3515, 77.1396, 'trauma,other', '9800000000', 100),
        ('Anu Hospital', '#69,Trichy Road,Very Near To Railway Station, Tanjore', 10.7693, 79.144, 'trauma,other', '9800000000', 100),
        ('Aparna Hospital', '450-D,Palaghat Main Road,Kuniamuthu, Coimbatore', 11.041, 76.9774, 'trauma,other', '9800000000', 100),
        ('Apollo First Med Hospitals', 'No 154, Poonamallee High Road, Near Neyveli House, Kilpauk, Chennai - 6000No 154, Poonamallee High Road, Near Neyveli House, Kilpauk, Chennai - 6000, Chennai', 13.0506, 80.275, 'trauma,other', '9800000000', 100),
        ('Apollo Hospital ( T.H.Road-Chennai)', '#645, T.H.Road, Tondiarpet, Chennai', 13.0748, 80.2426, 'trauma,other', '9800000000', 100),
        ('Apollo Hospitals (Greams Road-Chennai)', '#21, Greams Lane,Greams Road, Chennai-600006, Chennai', 13.0919, 80.2671, 'trauma,other', '9800000000', 100),
        ('Apollo Hospitals Karaikudi', 'Madurai Main Road, Managiri Village Karaikodi, Tamilnadu-630307, Near, Chettinad Public School, Karaikudi', 10.0704, 78.7746, 'trauma,other', '9800000000', 100),
        ('Apollo Speciality Hospital (Chennai)', 'No 320 5Th Floor, Padma Complex, Anna Salai, Near Lr Swami Building, Nandanam, Chennai, Tamil Nadu, Chennai', 13.1061, 80.2352, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Apollo Speciality Hospital (Madurai)', '20,Lake View, Kk Nagar,, Madurai', 9.922, 78.1577, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Appasamy Medicare Centre Pvt Ltd', '23-25, Friends Avenue, Arumbakkam, Chennaiarumbakkam, Chennai', 13.116, 80.3059, 'ent,other', '9800000000', 100),
        ('Appusami Hospital', '# 8Z/A, Gandhi Road,Salem-636007., Salem', 11.6419, 78.143, 'trauma,other', '9800000000', 100),
        ('Arasan Eye Hospital', '#26, Annamalai Layout,Opp To Road Theatre, Erode', 11.3782, 77.7005, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital (Salem)', '64, Sankagiri Main Road, Nethimedu, Salem, Tamilnadu-636002, Opposite To Kaliamman Temple, Salem', 11.6281, 78.1606, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital - Coimbatore', 'Avanashi Road, Coimbatore-641014Teelametu, Coimbatore', 11.0345, 76.9309, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital - Pondicherry', 'Cuddalore Main Road,Abishekapakkam Post,Thavalakuppam, Pondicherry-605007Thavalakuppam, Pondicherry', 11.9902, 79.8265, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital - Theni', '371,Periakulam Road,Allinagaram, Theni', 9.9775, 77.5079, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital - Tirunelveli', '# 1. S.N. High Road, Tirunelveli', 8.7086, 77.8054, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital- Madhurai', '1- Anna Nagar, Madurai-625020Madhurai, Madurai', 9.9057, 78.1362, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Eye Hospital-Tirupur', 'Dharapuram Main Road, K. Chettipalayam, Tirupur, Tamilnadu, Tirupur', 11.0823, 77.3182, 'ophthalmology,other', '9800000000', 100),
        ('Aravind Sai Eye Hospital', '# 1, Ganesan Street,Pammal Main Road Krishna Nagar, Chennai', 13.0752, 80.2597, 'ophthalmology,other', '9800000000', 100),
        ('Ark Nursing Home', '29-A, 4Th Cross,Co Operative Colony Near Employment Officeco-Ops Colony, Krishnagiri', 12.5035, 78.243, 'maternity,paediatric,other', '9800000000', 100),
        ('Arokya Hospital', '#32, Pillayar Koil Street, Chennai', 13.0923, 80.3132, 'trauma,other', '9800000000', 100),
        ('Arthur Astrvatham Hospital', 'No.42-A,Kuruvikaran Salai,, Madurai', 9.9347, 78.1527, 'trauma,other', '9800000000', 100),
        ('Arul Hospital', '#6A,T.V.K.Nagar,Puthur, Trichy', 10.826, 78.7098, 'trauma,other', '9800000000', 100),
        ('Arul Mission Hospital', '7A1 & 2,North Main Road,Vallioor, Tirunelveli', 8.7497, 77.7263, 'trauma,paediatric,other', '9800000000', 100),
        ('Arun Hospital', '#186,Munichalai Road,, Madurai', 9.8884, 78.0803, 'trauma,other', '9800000000', 100),
        ('Arun Hospital (Pollachi)', '49/84, New Scheme Roadpollachi Coimbatore, Pollachi', 10.6802, 76.9684, 'trauma,other', '9800000000', 100),
        ('Arun Hospital (Theni)', '51, Uthamapalayam Road,Bus Stand Bodinayakanur, Theni', 10.001, 77.4319, 'trauma,other', '9800000000', 100),
        ('Arunn Surgery', 'Dr.Nanjappa Road,, Coimbatore', 10.9737, 76.9262, 'trauma,other', '9800000000', 100),
        ('Arunpriya Nursing Home', '3&4, Pattamangalam Street,Nagapattinam, Nagapattanam', 10.7476, 79.8654, 'maternity,paediatric,other', '9800000000', 100),
        ('Arvinth Hospital', '# 17, Rangar Sannathi Street,Namakkal- 637001, Namakkal', 11.2412, 78.1708, 'trauma,other', '9800000000', 100),
        ('Ashok Hosptial', '#10-A, 1St Cross, Old Banfalore Road, Hosur,, Hosur', 12.7024, 77.8182, 'trauma,other', '9800000000', 100),
        ('Ashveny Clinic', '1/6, Periyakaruppan Road,Sivakasi-626189, Sivakasi', 9.4198, 77.8462, 'trauma,other', '9800000000', 100),
        ('Ashwin Hospital', '#212/545,Skc Road,Surampatti Nall Road,, Erode', 11.3523, 77.7314, 'trauma,other', '9800000000', 100),
        ('Ashwin Hospitals', '#1, Alamu Nagar Road,Coimbatore-641012., Coimbatore', 11.0565, 76.9774, 'trauma,other', '9800000000', 100),
        ('Assured Best Care Hospital', '#1, Annamalai Nagar Main Road Thillai Nagarannamalai Nagar, Trichy', 10.836, 78.6843, 'trauma,other', '9800000000', 100),
        ('Aswene Soundra Hospital & Research Centre', '# 24,Kasturi Rangan Road,Teynampet, Chennai', 13.0514, 80.2339, 'oncology,neurological,cardiac,other', '9800000000', 100),
        ('Athipathi Hospital And Research Center', 'Plot No 1,100 Ft Rd,Tanni Nagar,Velachary, Chennai', 13.0854, 80.2749, 'oncology,neurological,cardiac,other', '9800000000', 100),
        ('Atlas Hospitals', '34/1-First Cross, V.N. Nagar, Near Chathiram Bus Stand, Tiruchirapalli-620002, Tiruchirapalli', 10.7686, 78.6881, 'trauma,other', '9800000000', 100),
        ('Avm Medical Ent Research Fundation', '3, P.S.S. Road,Mylapore, Chennai', 13.0585, 80.2958, 'oncology,neurological,cardiac,other', '9800000000', 100),
        ('Avss Hospitals', '# 32A, Kuruvikkaran Salai, Madurai-625009, Madurai', 9.8957, 78.0706, 'trauma,other', '9800000000', 100),
        ('Aysha Hospital', '91A Millers Road, Kilpauk, Chennai', 13.0494, 80.2246, 'trauma,other', '9800000000', 100),
        ('B M Hospitals', '36, 5Th Main Road,Thillai Ganga Nagarcheenai, Chennai', 13.0351, 80.2746, 'trauma,other', '9800000000', 100),
        ('B.B Hospital', 'No.52,Dayalu Nagar,Kolathur,Near Villirakham Railway Station,, Chennai', 13.0789, 80.2604, 'trauma,other', '9800000000', 100),
        ('B.G Hospital', '1/143-B,Tuticorin Road,Veerapandianpatnam, Tiruchendur, Tiruchendur', 8.5333, 78.1026, 'trauma,other', '9800000000', 100),
        ('B.M.Orthopaedic Hospital', 'No.3/157, Mth Road, Ambattur,Chennai - 53, Chennai', 13.0365, 80.3061, 'orthopaedic,trauma,other', '9800000000', 100),
        ('B.M.Silver Jubilee Multi Speciality Hospital', '41, Dharga Road, Pallavaram, Kancheepuram, Chennai-600043, Kanchipuram', 12.8342, 79.6453, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('B.P.Jain Hospital', 'Plot No.6,Gokulam Colony,Anna Salai,Pammal,Kanchipuram, Kanchipuram', 12.8, 79.6854, 'trauma,other', '9800000000', 100),
        ('B.R. Hospital', '10&12, Alamaram Street, Tiruttani., Thiruvallur', 13.1388, 79.9381, 'trauma,other', '9800000000', 100),
        ('B.S. Hospital', '# 16, 3Rd Main Road,Chitlapakkam,, Chennai', 13.0847, 80.2481, 'trauma,other', '9800000000', 100),
        ('B.S.S. Hospital', 'New No 200, Old # 179/1, R.K. Mutt Road, Mandaveli,, Chennai', 13.1087, 80.2983, 'trauma,other', '9800000000', 100),
        ('Babus Maternity Hosptial', '# 7, Doraisamy Reddy Street, Tabaram, Chennai', 13.1159, 80.2289, 'maternity,paediatric,other', '9800000000', 100),
        ('Bagdi Nursing Home', '3Rd Floor, #10, Solaiappan Streett.Nagar, Chennai', 13.0879, 80.3106, 'maternity,paediatric,other', '9800000000', 100),
        ('Balagangadhara Varma Nursing Home & Research Center', 'No 17, First Main Road,Narayanapuram, Chennai', 13.0898, 80.2494, 'oncology,neurological,cardiac,other', '9800000000', 100),
        ('Balaji Hospital', 'No.14,Varadanar Street,Vedachalanagar,Chengalpattuvedachala Nagar, Chengalpattu', 12.6421, 80.0, 'trauma,other', '9800000000', 100),
        ('Balaji Surya Hospital', '#129,Pollachi Road,Dharapuram, Erode', 11.3119, 77.7184, 'trauma,other', '9800000000', 100),
        ('Balakrishna Eye Hospital & Eye Research Centre', '11, Sastri First Cross Street, Chennai, Tamilnadu, Chennai', 13.0405, 80.2234, 'oncology,neurological,cardiac,other', '9800000000', 100),
        ('Bappu Clinic & Nursing Home', '#46, Kalaingar Main Road,Srinivasa Nagar, Perungalatur,, Chennai', 13.1292, 80.2512, 'maternity,paediatric,other', '9800000000', 100),
        ('Be Well Hospitals Pvt Ltd', 'No. 15, Lawspet, Green Garden, Ecr, Pondicherry, Shenbaga Motors (Maruthi Show Room), Pondicherry', 11.8991, 79.7632, 'cardiac,trauma,other', '9800000000', 100),
        ('Bejan Singh Eye Hospital Pvt Ltd', 'No.2/1,313C,M.S.Road,Vettoornimadam,Nagercoil,, Kanyakumari', 8.0567, 77.503, 'ophthalmology,other', '9800000000', 100),
        ('Bethel Hospital (P) Ltd', '# 223, Dr. Rajendra Prasad Road., Coimbatore', 11.0585, 76.914, 'trauma,other', '9800000000', 100),
        ('Bgm Hospital', '1/249,New Nathan Road,Iyyer Bungalow, Madurai', 9.8872, 78.1502, 'trauma,other', '9800000000', 100),
        ('Bhagwan Mahaveer Eye Hospital', '# 142, M.S. Koil Street, Royapuram., Chennai', 13.1061, 80.2601, 'ophthalmology,other', '9800000000', 100),
        ('Bharani Paventhan Multi Speciality Hospital', '74, Sampath Nagar Erode Tamilnadu, Erode', 11.3393, 77.7638, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Bharath Hospital', '# 72, I St Main Road,Nanganallur, Chennai', 13.0342, 80.2547, 'trauma,other', '9800000000', 100),
        ('Bharathi Hospital', '# 592/2,Sri Renga Palayam,Rajapalayam, Virudhunagar', 9.5884, 77.961, 'trauma,other', '9800000000', 100),
        ('Billroth Hospital Limited', '#43, Lakshmi Takis Rd,Shenay Nagarshenoy Nagar, Chennai, Chennai', 13.0673, 80.2818, 'trauma,other', '9800000000', 100),
        ('Billroth Hospitals - Ra Puram', '#52, 2Nd Main Road, Raja Annamalai Puram,Raja Annamalai Puram, Chennai', 13.1057, 80.2862, 'trauma,other', '9800000000', 100),
        ('Brs Hospital Pvt.Ltd', 'No.28. Cathedral Garden Roadcathedral Gardens Road, Chennai', 13.072, 80.2534, 'cardiac,trauma,other', '9800000000', 100),
        ('C.K. Hospital', '# 41, Balasubbarayalu Streeterode, Erode', 11.3149, 77.6857, 'trauma,other', '9800000000', 100),
        ('C.S.I. Kalyani General Hospital', '15, Dr Radhakrishnan Salai, Mylapore, Chennai-600004, Next To City Centre, Chennai', 13.1365, 80.2776, 'trauma', '9800000000', 100),
        ('C.S.I. Rainy Multi-Speciality Hospital', '#45, G.A. Road Chennai, Chennai', 13.1199, 80.2781, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('C.S.M Nursing Home', '# 18, Rukmani Street,West Mambalam, Chennai', 13.1097, 80.2818, 'maternity,paediatric,other', '9800000000', 100),
        ('Cauvery Trust Hospital', 'No.36,Ponnankinaru Street,Villivakkam,, Chennai', 13.0656, 80.2806, 'trauma,other', '9800000000', 100),
        ('Chandra Hospital', '# 10, Pillayarpalayam Road, Madurai', 9.8931, 78.1386, 'trauma,other', '9800000000', 100),
        ('Chennai Eye Care Hospital', '#6,12Th Cross Street,Dhandeeswaran Nagar,Velachery, Chennai', 13.0918, 80.2678, 'ophthalmology,other', '9800000000', 100),
        ('Chennai Krishna Hospital', 'No.297, Gst Road, Near Mit Flyover, Chromepet, Chennai, Tamilnadu, Chennai', 13.0607, 80.2719, 'trauma,other', '9800000000', 100),
        ('Chettinad Super Speciality Hospital (Cssh)-(A Unit Of Rajah Muthiah Charitable And Educational Trust)', 'I.T. Highway,Kelambakkam, Chennai', 13.0654, 80.2673, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Child Jesus Hospital', 'P Box No 17, Cantonment, Tiruchirappalli, Trichy-620001Near To All India Radio Station, Trichy', 10.8137, 78.712, 'paediatric,other', '9800000000', 100),
        ('Chitra Kalyana Raman Nursing Home', '56,A/1,Rajaji Road, Salem', 11.7091, 78.1581, 'maternity,paediatric,other', '9800000000', 100),
        ('Chitras Ent Laser Surgery Super Speciality Hospital', '30C, Cathedral Garden Lane,Nungambakkam., Chennai', 13.0609, 80.2257, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Christian Hospital', 'Vaigai Dam Road, Periyakulam,Perivakulam- 625 601, Madurai', 9.8893, 78.1141, 'trauma,other', '9800000000', 100),
        ('Christudas Orthopaedic Speciality Hospital', '#9.Duraiswamy Ngr. I.A.F. Road, Tamilnadu Chennai 59, Chennai', 13.0728, 80.261, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('City Hospital', '#87,Rkv Road,Near Chennai Silks, Erode', 11.3395, 77.72, 'trauma,other', '9800000000', 100),
        ('City Hospital', '106, G/8A, Palai Main Road (W)Millerpuram Corner,, Tuticorin', 8.7627, 78.1376, 'trauma,other', '9800000000', 100),
        ('City Hospital Pavalam Trauma Centre', '4/361 Gandhiji Nagar Trichy Road, Dindigul', 10.3431, 77.9347, 'ent,other', '9800000000', 100),
        ('Clinic Nallam', '86,Eswaran Koil Street, Pondicherry', 11.9248, 79.7916, 'trauma,other', '9800000000', 100),
        ('Coimbatore Bone And Joint Foundation Pvt Ltd', '#1091-Mettupalayam Road,North Coimbatore Bus Stop,R.S.Puram, Coimbatore', 10.9759, 76.91, 'orthopaedic,trauma,other', '9800000000', 100),
        ('Coimbatore Kidney Centre', '738-B, Puliakulam Road, Coimbatore, Tamilnadu, Coimbatore', 11.0132, 76.9635, 'ent,other', '9800000000', 100),
        ('Crescent Hospitals', '37/1,Sivaganga Road,Opp To Aavin Milk Project, Madurai', 9.8786, 78.1553, 'ent,other', '9800000000', 100),
        ('Csi Hospital', 'No.21.Hospital Roadkanchipuram, Kanchipuram', 12.7989, 79.7086, 'trauma,other', '9800000000', 100),
        ('Csr Nursing Home', '# 272, 7Th Street Extension,Gandhipuram, Coimbatore-641012, Coimbatore', 11.0363, 76.9997, 'maternity,paediatric,other', '9800000000', 100),
        ('D.S.K. Hospital', '# 19, Kadirnagar, Kangeyam Road, Tirupur., Coimbatore', 10.9838, 76.9558, 'trauma,other', '9800000000', 100),
        ('Darshan Surgical Centre Llp', 'Block T-80, New No-24 5Th Main Road, Chennai', 13.1301, 80.2568, 'ent,other', '9800000000', 100),
        ('Deepa Kannan Hospital', '# 33,Muthunagar,Karur, Karur', 10.938, 78.0612, 'trauma,other', '9800000000', 100),
        ('Deepam Eye Hospital', '#72,Medavakkam,Tank Road,Kilpauk, Chennai', 13.047, 80.3026, 'ophthalmology,other', '9800000000', 100),
        ('Deepam Hospital', '#327, Muthurangam Road,Tambaram(West),Kanchipuram,West Tambaram, Chennai', 13.0609, 80.2974, 'trauma,other', '9800000000', 100),
        ('Deepam Hospital', '687, Trichy Road., Coimbatore', 10.995, 76.9825, 'trauma,other', '9800000000', 100),
        ('Deepam Hospital', '#128,Ayya Gounder Street,Opp Police Station, Valapady', 11.6263, 78.0964, 'trauma,other', '9800000000', 100),
        ('Deepam Hospital Ltd', '30, Ayyasamy Street,, Chennai', 13.1148, 80.2338, 'trauma,other', '9800000000', 100),
        ('Deepam Hospital Ltd', '107-A, Gst Road, Chennai, Chennai', 13.1148, 80.2338, 'trauma,other', '9800000000', 100),
        ('Deepika Eye Care Hospital', '1564/4D,Chengalpet Road, Kanchipuram', 12.8296, 79.7184, 'ophthalmology,other', '9800000000', 100),
        ('Deepthi Hospital', '31-A,Mohanur Road, Namakkal', 11.2639, 78.1455, 'trauma,other', '9800000000', 100),
        ('Devadoss Multispeciality Hospital', '#75/1,Alagarkovil Main Roadsurveyor Colony,, Madurai', 9.9382, 78.1602, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
        ('Devaki Cancer Institute', '#26,Theni Main Road,Arasaradi,Near Bypass Road, Madurai', 9.8962, 78.15, 'neurological,orthopaedic,cardiac,other', '9800000000', 100),
        ('Devaki Hospital', 'No.6/1,Kamban Mani Mandapam Road,Karaikudi,, Sivagangai', 9.847, 78.4668, 'trauma,other', '9800000000', 100),
        ('Devi Priya Hospital', '12/54, A2G, T.B. Road,Usilampattiusilampatti, Madurai-625532., Madurai', 9.9101, 78.0805, 'trauma,other', '9800000000', 100),
        ('Dharan Hospital', '14,Seela Naicken Patti By Pass. On A National Highway Salem, Salem', 11.6224, 78.183, 'trauma,other', '9800000000', 100),
        ('Dhiviya Nursing Home', '306, Chennimalai Road, Kangayam, Erode', 11.3701, 77.7121, 'maternity,paediatric,other', '9800000000', 100),
        ('Dinesh Nursing Home', 'No.6-1-33,West Street,Viswanathapuram, Madurai-625014, Madurai', 9.8923, 78.1411, 'maternity,paediatric,other', '9800000000', 100),
        ('Doctor Rex\'S Hospital', '# 37, Millers Road, Kilpauk, Chennai', 13.0724, 80.2936, 'trauma,other', '9800000000', 100),
        ('Dr Agarwal\'S Eye Hospital Ltd', '19, Cathedral Road, Chennai', 13.0732, 80.2913, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwal\'S Eye Hospital Ltd (Nanganallur)', 'Ophthalmology Dept Margreet Sydney Hospital No 13, 2Nd Street Nanganallur Chennai-600061, Nanganallur', 12.9632, 80.2172, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd', '#107, A Block 3Rd Avenue Anna Nagar Near, Chennai', 13.123, 80.2726, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd', '#33,7Th Avenue,Ashok Nagar, Chennai', 13.123, 80.2726, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd', 'No-6, Duraisamy Street Tdk Towers Tambaram, Chennai', 13.123, 80.2726, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd', '#32-B,Indiragandhi Road Opp Taluk Office, Kanchipuram', 12.8588, 79.6966, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Dharmapuri)', '136 1St Floor,Nethaji Bye Pass Road, Dharmapuri', 12.079, 78.1314, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Gopalapuram)', 'Retina Foudation No 31 1St Street Gopalapuram, Chennai', 13.0863, 80.2562, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Kumbakonam)', '2/381, Indiranagar,Kumbakonam, Kumbakonam', 10.9314, 79.4333, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Periyar Nagar)', 'B-63, Siva Elango Salai 70Feet Road, Periyar Nagar, Chennai', 13.0582, 80.2455, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Salem)', '#114/7,Gandhi Road,Salem, Salem', 11.6895, 78.1421, 'ophthalmology,other', '9800000000', 100),
        ('Dr Agarwals Eye Hospital Ltd (Villupuram)', '#19, Trichy Trunk Road,Near To Villupuram Signal, Villupuram', 11.9057, 79.5231, 'ophthalmology,other', '9800000000', 100),
        ('Dr Kamakshi National Hospital', 'No 12 Jaffer Serang Streetsecond Line Beach Chennai, Chennai', 13.1052, 80.2447, 'trauma,other', '9800000000', 100),
        ('Dr Lankesh Eye Hospital Pvt Ltd', 'No-2 41St Street. 6Th Avenue. Ashok Nagarashok Nagar, Ashok Nagar', 13.0017, 80.27, 'ophthalmology,other', '9800000000', 100),
        ('Dr Manoharan Hospital', 'No.1210,Thadagam Road,Near To Aavin Milk Company,R.S. Puram,, Coimbatore', 10.9672, 76.9469, 'trauma,other', '9800000000', 100),
        ('Dr. A. Ansari Hospital', '# 20, Naganathar Sannadhi, Nagapattinam, Tamilnadu, Nagapattanam', 10.7252, 79.8535, 'trauma,other', '9800000000', 100),
        ('Dr. A. Govindarajan Eye Hospitals', 'No: 6, Officer\'S Colony, Puthur Tiruchirapalli-620017Trichy, Trichy', 10.7642, 78.6968, 'ophthalmology,other', '9800000000', 100),
        ('Dr. Arvind Vision Care', '#61, Reddy Palayam Road, Mogappair West, Chennai, Tamilnadu, Chennai', 13.1094, 80.2753, 'ophthalmology,other', '9800000000', 100),
        ('Dr. G.C. Hospital', '#30, North Pradakshanam Road, Karur, Tamilnadu., Karur', 10.9618, 78.0517, 'trauma,other', '9800000000', 100),
        ('Dr. Grace George Hospital', '# 34, Udayavar Koil Street,Thirumizhisai, Poonamalee., Chennai', 13.1015, 80.2813, 'trauma,other', '9800000000', 100),
        ('Dr. Jacquline Divyananda (Divya Hospital)', '# 20, Medavakkam Main Road, Madipakkam, Chennai', 13.1172, 80.2289, 'trauma,other', '9800000000', 100),
        ('Dr. Jeyasekharan Medical Trust', '#1159, K.P. Road, Nagerkoil., Nagercoil', 8.1408, 77.4508, 'trauma', '9800000000', 100),
        ('Dr. K.M. Nallaswamy Hospital', '#93, Power House Road,Erode, Erode', 11.2942, 77.73, 'trauma,other', '9800000000', 100),
        ('Dr. Kumaraswami Health Centre ( A Unit Of Indian Medical Centre)', 'N.H. Road # 47, 1/4C,1/4D,1/4E Perumalpuramperumalpuram, Kanyakumari., Kanyakumari', 8.1168, 77.5596, 'ent,other', '9800000000', 100),
        ('Dr. Loganathan Orthopaedic Hospital', '606/A, Mettur Main Road, Bhavani,, Erode', 11.3506, 77.7577, 'orthopaedic,trauma,other', '9800000000', 100),
        ('Dr. Mehta\'S Multispeciality Hospital Pvt Ltd.', '2 (E), Mc. Nicholas Road, Chennai, Opposite To Chetpet Police Station., Chennai', 13.0898, 80.278, 'trauma,cardiac,respiratory,neurological,orthopaedic,other', '9800000000', 100),
    ]

    for name, address, lat, lng, specialities, contact, beds in hospitals_data:
        h = Hospital(
            name=name,
            address=address,
            latitude=lat,
            longitude=lng,
            specialities=specialities,
            contact_number=contact,
            user_id=None,
        )
        db.session.add(h)
        db.session.flush()
        db.session.add(Availability(hospital_id=h.hospital_id, available_beds=beds))

    print(f"✅ {len(hospitals_data)} hospitals inserted.")

    # ── Seed Ambulances (user_id=None, seed script fills) ───
    ambulances_data = [
        ("TN01-AMB-001", "Ravi Kumar",     13.0900, 80.2750, "AVAILABLE"),
        ("KA01-AMB-001", "Suresh Nair",    13.1511, 80.1061, "ON_CALL"),
        ("TN01-AMB-002", "Karthik Raja",   13.0650, 80.2101, "AVAILABLE"),
        ("TN01-AMB-003", "Murugan S",      13.1200, 80.2950, "AVAILABLE"),
        ("TN01-AMB-004", "Dinesh Kumar",   13.0500, 80.2500, "AVAILABLE"),
        ("TN01-AMB-005", "Ramesh Babu",    12.9900, 80.1700, "AVAILABLE"),
        ("TN02-AMB-001", "Arun Prakash",   11.0168, 76.9558, "AVAILABLE"),
        ("TN02-AMB-002", "Senthil Kumar",  11.0300, 77.0100, "AVAILABLE"),
        ("TN03-AMB-001", "Vijay Anand",     9.9252, 78.1198, "AVAILABLE"),
        ("TN03-AMB-002", "Selvam R",        9.9100, 78.1050, "AVAILABLE"),
        ("TN04-AMB-001", "Balamurugan K",  11.6643, 78.1460, "AVAILABLE"),
        ("TN05-AMB-001", "Pandian S",      10.7905, 78.7047, "AVAILABLE"),
        ("TN05-AMB-002", "Suresh M",       10.8100, 78.6900, "AVAILABLE"),
        ("TN06-AMB-001", "Ganesh P",       12.9165, 79.1325, "AVAILABLE"),
        ("TN07-AMB-001", "Manikandan R",    8.7139, 77.7567, "AVAILABLE"),
        ("TN08-AMB-001", "Prakash V",      11.3410, 77.7172, "AVAILABLE"),
        ("TN09-AMB-001", "Muthukumar A",   11.1085, 77.3411, "AVAILABLE"),
    ]

    for vehicle_number, driver_name, lat, lng, status in ambulances_data:
        a = Ambulance(
            vehicle_number=vehicle_number,
            driver_name=driver_name,
            latitude=lat,
            longitude=lng,
            status=status,
            user_id=None,
        )
        db.session.add(a)

    db.session.commit()
    print(f"✅ {len(ambulances_data)} ambulances inserted.")

    print("\n" + "─" * 55)
    print("  Next steps:")
    print("  1. python scripts/seed_hospital_users.py")
    print("  2. python scripts/seed_ambulance_users.py")
    print("  3. Save the generated CSVs — passwords shown once!")
    print("─" * 55)