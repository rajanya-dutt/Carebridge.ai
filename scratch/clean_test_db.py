import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from database.database import get_db_connection

def clean():
    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM documents")
        conn.execute("DELETE FROM medications")
        conn.execute("DELETE FROM timeline_events")
        conn.execute("DELETE FROM emergency_events")
        conn.execute("DELETE FROM patients")
    conn.close()
    print("Database cleaned completely for Alamgir Mandal run!")

if __name__ == "__main__":
    clean()
