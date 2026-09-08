import os, sys
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from database.database import get_db_connection

conn = get_db_connection()
with conn:
    conn.execute("UPDATE patients SET id = 'PAT_38642_24' WHERE id = '38642/24'")
    conn.execute("UPDATE documents SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
    conn.execute("UPDATE medications SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
    conn.execute("UPDATE timeline_events SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
    conn.execute("UPDATE lab_results SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
    conn.execute("UPDATE symptoms SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
    conn.execute("UPDATE emergency_events SET patient_id = 'PAT_38642_24' WHERE patient_id = '38642/24'")
conn.close()
print("Updated legacy patient ID successfully.")
