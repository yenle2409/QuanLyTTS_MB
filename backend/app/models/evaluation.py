from sqlalchemy import Column, Integer, Float, Text, ForeignKey, DateTime, JSON, String
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    criteria_scores   = Column(JSON, nullable=True)   # { attitude: 7, discipline: 7, ... }
    criteria_comments = Column(JSON, nullable=True)   # ✅ THÊM { attitude: "...", discipline: "...", ... }
    final_comment     = Column(Text, nullable=True)
    total_score       = Column(Float, nullable=True)
    ranking           = Column(String, nullable=True)

    # ✅ THÊM: Thống kê chuyên cần
    working_days = Column(Integer, nullable=True)   # Số ngày đi làm (có check-in)
    absent_days  = Column(Integer, nullable=True)   # Số ngày vắng mặt

    # Approval flow
    approval_status = Column(String, default="pending", nullable=False)
    hr_note         = Column(Text, nullable=True)
    approved_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at     = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    intern   = relationship("User", foreign_keys=[intern_id], back_populates="evaluations_received")
    mentor   = relationship("User", foreign_keys=[mentor_id], back_populates="evaluations_given")
    approver = relationship("User", foreign_keys=[approved_by])