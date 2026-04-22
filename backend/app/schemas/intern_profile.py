from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class InternStatus(str, Enum):
    active = "active"
    quit = "quit"
    completed = "completed"


class InternProfileBase(BaseModel):
    university: Optional[str] = None
    gpa: Optional[float] = None
    cv_link: Optional[str] = None
    department: Optional[str] = None          # ← thêm mới


class InternProfileCreate(InternProfileBase):
    user_id: int
    batch_id: int
    mentor_id: Optional[int] = None


class InternProfileUpdate(BaseModel):
    batch_id: Optional[int] = None
    mentor_id: Optional[int] = None
    university: Optional[str] = None
    gpa: Optional[float] = None
    cv_link: Optional[str] = None
    department: Optional[str] = None          # ← thêm mới
    intern_status: Optional[InternStatus] = None


class InternProfileResponse(InternProfileBase):
    id: int
    user_id: int
    batch_id: int
    mentor_id: Optional[int]
            # ← thêm mới
    intern_status: InternStatus = InternStatus.active
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InternProfileWithUser(InternProfileResponse):
    user_full_name: str
    user_email: str
    user_phone: Optional[str]
    batch_name: str
    mentor_name: Optional[str]
    department: Optional[str] = None          # ← thêm mới (expose ra response list)