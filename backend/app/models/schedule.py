from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class ShiftType(str, enum.Enum):
    CA1 = "ca1"   # Sáng: 8:00 - 12:00
    CA2 = "ca2"   # Chiều: 13:00 - 17:00
    FULL = "full" # Cả ngày: 8:00 - 17:00


class ScheduleStatus(str, enum.Enum):
    PENDING  = "pending"   # Chờ mentor xác nhận
    APPROVED = "approved"  # Đã duyệt
    REJECTED = "rejected"  # Từ chối


class InternSchedule(Base):
    __tablename__ = "intern_schedules"

    id         = Column(Integer, primary_key=True, index=True)
    intern_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    mentor_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    batch_id   = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)

    work_date  = Column(Date, nullable=False)          # Ngày làm việc cụ thể
    shift      = Column(Enum(ShiftType), nullable=False, default=ShiftType.FULL)
    status     = Column(Enum(ScheduleStatus), nullable=False, default=ScheduleStatus.PENDING)

    note       = Column(Text, nullable=True)           # Ghi chú của intern
    mentor_note= Column(Text, nullable=True)           # Phản hồi của mentor

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    intern = relationship("User", foreign_keys=[intern_id])
    mentor = relationship("User", foreign_keys=[mentor_id])