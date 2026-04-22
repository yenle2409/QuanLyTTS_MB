"""
Script dọn dẹp InternProfile "ma" — chạy 1 lần trong thư mục backend/
    python cleanup_orphan_profiles.py
"""
import sys
import os

# Thêm backend vào path để import được app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
# Import tất cả models để SQLAlchemy resolve được các relationship
from app.models.user import User
from app.models.intern_profile import InternProfile
from app.models.task import Task
from app.models.task_message import TaskMessage
from app.models.evaluation import Evaluation
from app.models.leave_request import LeaveRequest
from app.models.logbook_entry import LogbookEntry
from app.models.schedule import InternSchedule
from app.models.training_document import TrainingDocument
from app.models.weekly_feedback import WeeklyFeedback
from app.models.intern_batch import InternBatch

db = SessionLocal()

try:
    # Tìm tất cả InternProfile không còn user tương ứng
    orphans = (
        db.query(InternProfile)
        .outerjoin(User, User.id == InternProfile.user_id)
        .filter(User.id == None)
        .all()
    )

    if not orphans:
        print("✅ Không có InternProfile 'ma' nào. DB đã sạch.")
    else:
        print(f"🗑️  Tìm thấy {len(orphans)} InternProfile 'ma':")
        for p in orphans:
            print(f"   - InternProfile id={p.id}, user_id={p.user_id}, batch_id={p.batch_id}")

        confirm = input("\nXóa tất cả? (yes/no): ").strip().lower()
        if confirm == "yes":
            for p in orphans:
                db.delete(p)
            db.commit()
            print(f"✅ Đã xóa {len(orphans)} bản ghi.")
        else:
            print("❌ Hủy. Không xóa gì cả.")

except Exception as e:
    db.rollback()
    print(f"❌ Lỗi: {e}")
    raise
finally:
    db.close()