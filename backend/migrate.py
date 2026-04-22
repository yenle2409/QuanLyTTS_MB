from app.db.base import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE intern_profiles ADD COLUMN intern_status VARCHAR DEFAULT 'active' NOT NULL"))
        conn.commit()
        print('Done!')
    except Exception as e:
        print('Error:', e)