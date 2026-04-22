from pydantic import BaseModel
from datetime import datetime


class TaskMessageCreate(BaseModel):
    content: str


class TaskMessageResponse(BaseModel):
    id: int
    task_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True