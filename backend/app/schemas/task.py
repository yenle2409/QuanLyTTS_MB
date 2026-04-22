from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime


class TaskCreate(TaskBase):
    intern_id: int
    batch_id: int
    file_attachment: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    file_attachment: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    mentor_id: int
    intern_id: int
    batch_id: int
    status: TaskStatus
    file_attachment: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskWithDetails(TaskResponse):
    mentor_name: str
    intern_name: str
    batch_name: str
