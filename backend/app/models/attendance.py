from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, Enum, Text, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT   = "present"    # Đã check-in (đang đi làm)
    CHECKED_OUT = "checked_out"  # Đã check-out (hoàn thành ngày)
    ABSENT    = "absent"     # Vắng (cuối ngày chưa check-in)
    LEAVE     = "leave"      # Nghỉ có phép (đã duyệt đơn nghỉ)


class Attendance(Base):
    __tablename__ = "attendances"

    id            = Column(Integer, primary_key=True, index=True)
    intern_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_id   = Column(Integer, ForeignKey("intern_schedules.id"), nullable=True)
    batch_id      = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)

    date          = Column(Date, nullable=False)
    status        = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)

    check_in_time  = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    note           = Column(Text, nullable=True)   # Ghi chú (lý do vắng nếu HR đánh dấu thủ công)

    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    intern   = relationship("User", foreign_keys=[intern_id])
    schedule = relationship("InternSchedule", foreign_keys=[schedule_id])