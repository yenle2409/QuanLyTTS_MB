from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WeeklyFeedbackCreate(BaseModel):
    intern_id: int
    batch_id: int
    week_number: int
    week_label: Optional[str] = None
    content: str
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    rating: Optional[int] = None  # 1-5


class WeeklyFeedbackUpdate(BaseModel):
    week_label: Optional[str] = None
    content: Optional[str] = None
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    rating: Optional[int] = None


class WeeklyFeedbackResponse(BaseModel):
    id: int
    intern_id: int
    mentor_id: int
    batch_id: int
    week_number: int
    week_label: Optional[str]
    content: str
    strengths: Optional[str]
    improvements: Optional[str]
    rating: Optional[int]
    intern_name: str
    mentor_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WeeklyFeedbackStatusResponse(BaseModel):
    """Trạng thái feedback tuần hiện tại cho từng TTS"""
    intern_id: int
    intern_name: str
    batch_id: int
    batch_name: str
    current_week: int
    has_feedback_this_week: bool
    batch_status: str  # "open" | "closed"