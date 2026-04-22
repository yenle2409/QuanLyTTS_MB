"""
Reset toàn bộ dữ liệu, chỉ giữ lại tài khoản admin.
Chạy trong thư mục backend/:
    python reset_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.models.user import User, UserRole
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
    print("⚠️  Sắp xóa TOÀN BỘ dữ liệu (giữ lại admin).")
    confirm = input("Gõ 'yes' để xác nhận: ").strip().lower()
    if confirm != "yes":
        print("❌ Hủy.")
        exit()

    print("🗑️  Đang xóa...")

    db.query(TaskMessage).delete()
    db.query(WeeklyFeedback).delete()
    db.query(Evaluation).delete()
    db.query(LeaveRequest).delete()
    db.query(LogbookEntry).delete()
    db.query(InternSchedule).delete()
    db.query(TrainingDocument).delete()
    db.query(Task).delete()
    db.query(InternProfile).delete()
    db.query(InternBatch).delete()

    # Xóa tất cả user NGOẠI TRỪ admin
    db.query(User).filter(User.role != UserRole.ADMIN).delete(synchronize_session=False)

    db.commit()
    print("✅ Xong! Đã xóa sạch dữ liệu, giữ lại tài khoản admin.")

    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    print(f"\nTài khoản admin còn lại ({len(admins)}):")
    for a in admins:
        print(f"  - {a.username} ({a.email})")

except Exception as e:
    db.rollback()
    print(f"❌ Lỗi: {e}")
    raise
finally:
    db.close()