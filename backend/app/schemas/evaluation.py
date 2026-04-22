from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class EvaluationBase(BaseModel):
    criteria_scores:   Optional[Dict[str, float]] = None
    criteria_comments: Optional[Dict[str, str]]   = None  # ✅ THÊM
    final_comment:     Optional[str]               = None
    total_score:       Optional[float]             = None
    ranking:           Optional[str]               = None
    working_days:      Optional[int]               = None  # ✅ THÊM
    absent_days:       Optional[int]               = None  # ✅ THÊM


class EvaluationCreate(EvaluationBase):
    intern_id: int


class EvaluationUpdate(EvaluationBase):
    pass


class EvaluationApprove(BaseModel):
    approval_status: str  # "approved" | "rejected"
    hr_note: Optional[str] = None


class EvaluationResponse(EvaluationBase):
    id:              int
    intern_id:       int
    mentor_id:       int
    approval_status: str
    hr_note:         Optional[str]      = None
    approved_by:     Optional[int]      = None
    approved_at:     Optional[datetime] = None
    created_at:      datetime
    updated_at:      datetime

    class Config:
        from_attributes = True


class EvaluationWithDetails(EvaluationResponse):
    intern_name:   str
    mentor_name:   str
    approver_name: Optional[str] = None