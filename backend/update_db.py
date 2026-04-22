import sqlite3

conn = sqlite3.connect("internship_management.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE evaluations ADD COLUMN approval_status TEXT DEFAULT 'pending'")
except:
    pass

try:
    cursor.execute("ALTER TABLE evaluations ADD COLUMN hr_note TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE evaluations ADD COLUMN approved_by INTEGER")
except:
    pass

try:
    cursor.execute("ALTER TABLE evaluations ADD COLUMN approved_at DATETIME")
except:
    pass

conn.commit()
conn.close()

print("Database updated successfully")