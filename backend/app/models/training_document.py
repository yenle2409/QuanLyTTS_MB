from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class DocumentType(str, enum.Enum):
    PDF = "pdf"
    SLIDE = "slide"
    LINK = "link"
    OTHER = "other"


class TrainingDocument(Base):
    __tablename__ = "training_documents"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("intern_batches.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    doc_type = Column(Enum(DocumentType), default=DocumentType.OTHER, nullable=False)

    file_url = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mentor = relationship("User", foreign_keys=[mentor_id])
    batch = relationship("InternBatch", foreign_keys=[batch_id])