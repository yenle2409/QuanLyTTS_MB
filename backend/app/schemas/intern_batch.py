from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.intern_batch import BatchStatus


class InternBatchBase(BaseModel):
    batch_name: str
    start_date: date
    end_date: date
    description: Optional[str] = None


class InternBatchCreate(InternBatchBase):
    pass


class InternBatchUpdate(BaseModel):
    batch_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[BatchStatus] = None
    description: Optional[str] = None


class InternBatchResponse(InternBatchBase):
    id: int
    status: BatchStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
