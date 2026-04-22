from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class LogbookType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"


class LogbookEntry(Base):
    __tablename__ = "logbook_entries"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("intern_batches.id"), nullable=False)

    entry_type = Column(Enum(LogbookType), default=LogbookType.DAILY, nullable=False)
    log_date = Column(Date, nullable=True)
    week_number = Column(Integer, nullable=True)
    week_label = Column(String, nullable=True)

    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    learned = Column(Text, nullable=True)
    difficulties = Column(Text, nullable=True)
    plan_next = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    intern = relationship("User", foreign_keys=[intern_id])
    batch = relationship("InternBatch", foreign_keys=[batch_id])