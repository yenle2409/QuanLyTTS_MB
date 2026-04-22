from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime


class WeeklyFeedback(Base):
    __tablename__ = "weekly_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)

    week_number = Column(Integer, nullable=False)        # Tuần thứ mấy (1, 2, 3...)
    week_label = Column(String, nullable=True)           # VD: "Tuần 1 (01/01 - 07/01)"
    content = Column(Text, nullable=False)               # Nội dung nhận xét
    strengths = Column(Text, nullable=True)              # Điểm mạnh
    improvements = Column(Text, nullable=True)           # Cần cải thiện
    rating = Column(Integer, nullable=True)              # Đánh giá 1-5 sao

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    intern = relationship("User", foreign_keys=[intern_id])
    mentor = relationship("User", foreign_keys=[mentor_id])
    batch = relationship("InternBatch", foreign_keys=[batch_id])