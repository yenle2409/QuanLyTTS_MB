from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class InternStatus(str, enum.Enum):
    ACTIVE = "active"
    QUIT = "quit"
    COMPLETED = "completed"


class InternProfile(Base):
    __tablename__ = "intern_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    university = Column(String, nullable=True)
    gpa = Column(Float, nullable=True)
    cv_link = Column(String, nullable=True)
           # ← thêm mới
    intern_status = Column(
        Enum(InternStatus, values_callable=lambda x: [e.value for e in x]),
        default=InternStatus.ACTIVE,
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="intern_profile")
    batch = relationship("InternBatch", back_populates="intern_profiles")
    mentor = relationship("User", foreign_keys=[mentor_id], back_populates="mentored_interns")