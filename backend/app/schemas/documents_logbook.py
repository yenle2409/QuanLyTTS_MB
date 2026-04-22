from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# ─── Training Document ────────────────────────────────────────────────────────

class TrainingDocumentCreate(BaseModel):
    batch_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    doc_type: str = "other"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


class TrainingDocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    doc_type: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


class TrainingDocumentResponse(BaseModel):
    id: int
    mentor_id: int
    mentor_name: str
    batch_id: Optional[int]
    batch_name: Optional[str]
    title: str
    description: Optional[str]
    doc_type: str
    file_url: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Logbook ──────────────────────────────────────────────────────────────────

class LogbookEntryCreate(BaseModel):
    batch_id: int
    entry_type: str = "daily"
    log_date: Optional[date] = None
    week_number: Optional[int] = None
    week_label: Optional[str] = None
    title: str
    content: str
    learned: Optional[str] = None
    difficulties: Optional[str] = None
    plan_next: Optional[str] = None


class LogbookEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    learned: Optional[str] = None
    difficulties: Optional[str] = None
    plan_next: Optional[str] = None
    week_label: Optional[str] = None


class LogbookEntryResponse(BaseModel):
    id: int
    intern_id: int
    intern_name: str
    batch_id: int
    entry_type: str
    log_date: Optional[date]
    week_number: Optional[int]
    week_label: Optional[str]
    title: str
    content: str
    learned: Optional[str]
    difficulties: Optional[str]
    plan_next: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True