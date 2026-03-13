import subprocess

queries = """
USE emergency_ambulance_system;
ALTER TABLE hospital ADD COLUMN specialities TEXT;
ALTER TABLE hospital ADD COLUMN user_id INTEGER;
ALTER TABLE ambulances ADD COLUMN driver_name VARCHAR(100);
ALTER TABLE ambulances ADD COLUMN user_id INTEGER;
ALTER TABLE emergency_requests ADD COLUMN accident_description TEXT;
ALTER TABLE emergency_requests ADD COLUMN acknowledged BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE emergency_requests MODIFY COLUMN status VARCHAR(20);
"""

print("Running MySQL CLI updates...")
try:
    result = subprocess.run(
        ["mysql", "-u", "root", "-pAakash@191005", "-e", queries],
        capture_output=True,
        text=True,
        check=True
    )
    print("MySQL out:", result.stdout)
    print("MySQL err:", result.stderr)
    print("Done!")
except subprocess.CalledProcessError as e:
    print("MySQL command failed!")
    print("Exit code:", e.returncode)
    print("Stdout:", e.stdout)
    print("Stderr:", e.stderr)
except FileNotFoundError:
    print("mysql executable not found in PATH. Make sure MySQL is installed and added to environment variables.")
