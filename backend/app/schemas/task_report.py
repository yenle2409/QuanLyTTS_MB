from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskReportBase(BaseModel):
    content: str
    file_submission: Optional[str] = None


class TaskReportCreate(TaskReportBase):
    task_id: int


class TaskReportUpdate(BaseModel):
    content: Optional[str] = None
    file_submission: Optional[str] = None


class TaskReportMentorComment(BaseModel):
    mentor_comment: str


class TaskReportResponse(TaskReportBase):
    id: int
    task_id: int
    submitted_at: datetime
    mentor_comment: Optional[str]
    commented_at: Optional[datetime]

    class Config:
        from_attributes = True
