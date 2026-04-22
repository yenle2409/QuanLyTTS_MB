from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime


class TaskReport(Base):
    __tablename__ = "task_reports"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    content = Column(Text, nullable=False)
    file_submission = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    mentor_comment = Column(Text, nullable=True)
    commented_at = Column(DateTime, nullable=True)

    # Relationships
    task = relationship("Task", back_populates="reports")
