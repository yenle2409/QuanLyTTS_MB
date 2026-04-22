from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, Enum as SAEnum, DateTime
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class LeaveStatus(str, enum.Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id          = Column(Integer, primary_key=True, index=True)
    intern_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("intern_schedules.id"), nullable=True)
    batch_id    = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)
    leave_date  = Column(Date, nullable=False)
    reason      = Column(Text, nullable=False)
    status      = Column(SAEnum(LeaveStatus), default=LeaveStatus.PENDING, nullable=False)
    hr_note     = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())