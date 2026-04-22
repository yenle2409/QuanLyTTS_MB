from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class TaskStatus(str, enum.Enum):
    NEW = "new"
    SUBMITTED = "submitted"
    REQUEST_CHANGE = "request_change"
    APPROVED = "approved"
    OVERDUE = "overdue"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    intern_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)
    deadline = Column(DateTime, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.NEW, nullable=False)
    file_attachment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    mentor = relationship("User", foreign_keys=[mentor_id], back_populates="created_tasks")
    intern = relationship("User", foreign_keys=[intern_id], back_populates="assigned_tasks")
    batch = relationship("InternBatch", back_populates="tasks")
    reports = relationship("TaskReport", back_populates="task", cascade="all, delete-orphan")
    messages = relationship("TaskMessage", back_populates="task", cascade="all, delete-orphan")