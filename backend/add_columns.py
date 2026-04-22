# backend/add_columns.py
from app.db.base import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Thêm 3 cột mới vào bảng evaluations
    # Dùng try/except để không bị lỗi nếu cột đã tồn tại
    for sql in [
        "ALTER TABLE evaluations ADD COLUMN criteria_comments JSON",
        "ALTER TABLE evaluations ADD COLUMN working_days INTEGER",
        "ALTER TABLE evaluations ADD COLUMN absent_days INTEGER",
    ]:
        try:
            conn.execute(text(sql))
            print(f"✅ OK: {sql}")
        except Exception as e:
            print(f"⚠️ Bỏ qua (có thể đã tồn tại): {e}")
    conn.commit()

print("Xong!")