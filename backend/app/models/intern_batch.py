from sqlalchemy import Column, Integer, String, Date, Enum, Text, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class BatchStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class InternBatch(Base):
    __tablename__ = "intern_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String, unique=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.OPEN, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    intern_profiles = relationship("InternProfile", back_populates="batch")
    tasks = relationship("Task", back_populates="batch")
