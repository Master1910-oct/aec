import os
import shutil

backend_files = [
    "check_amb_coords.py", "db_check.py", "db_check_direct.py",
    "direct_reset.py", "get_admin_token.py", "manual_mysql_migration.py",
    "print_token.py", "reset_sql.py", "test_admin_stats.py",
    "test_amb_api.py", "test_amb_file.py", "test_ambulance_api.py",
    "test_db.py", "test_endpoint_file.py", "test_stats.py",
    "test_stats_direct.py", "test_stats_endpoint.py", "trigger_sla.py",
    "update_amb_data.py"
]

backend_dir = r"f:\aes\aec\backend"
root_dir = r"f:\aes\aec"

count = 0
for f in backend_files:
    path = os.path.join(backend_dir, f)
    if os.path.exists(path):
        os.remove(path)
        count += 1

socket_html = os.path.join(root_dir, "socket_test.html")
if os.path.exists(socket_html):
    os.remove(socket_html)
    count += 1

tmp_dir = os.path.join(root_dir, "tmp")
if os.path.exists(tmp_dir):
    shutil.rmtree(tmp_dir)
    count += 1

print(f"Successfully deleted {count} unnecessary files/folders.")
