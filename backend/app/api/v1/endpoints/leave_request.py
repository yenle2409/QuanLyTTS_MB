from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from app.db.base import get_db
from app.core.deps import get_current_user
from app.models.leave_request import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.models.intern_profile import InternProfile

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    leave_date:  date
    reason:      str
    batch_id:    int
    schedule_id: Optional[int] = None   # ID lịch đã đăng ký (nếu có)


class LeaveRequestReview(BaseModel):
    status:  LeaveStatus
    hr_note: Optional[str] = None


# ─── Helper ───────────────────────────────────────────────────────────────────

def enrich(r: LeaveRequest, db: Session) -> dict:
    intern = db.query(User).filter(User.id == r.intern_id).first()
    return {
        "id":           r.id,
        "intern_id":    r.intern_id,
        "intern_name":  intern.full_name if intern else None,
        "schedule_id":  r.schedule_id,
        "batch_id":     r.batch_id,
        "leave_date":   r.leave_date,
        "reason":       r.reason,
        "status":       r.status,
        "hr_note":      r.hr_note,
        "created_at":   r.created_at.isoformat() if r.created_at else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[dict])
def get_leave_requests(
    intern_id:  Optional[int] = Query(None),
    batch_id:   Optional[int] = Query(None),
    status:     Optional[LeaveStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeaveRequest)

    if current_user.role == UserRole.INTERN:
        # Intern chỉ thấy đơn của mình
        q = q.filter(LeaveRequest.intern_id == current_user.id)
    elif current_user.role == UserRole.MENTOR:
        # Mentor thấy intern của mình
        profiles = db.query(InternProfile).filter(InternProfile.mentor_id == current_user.id).all()
        intern_ids = [p.user_id for p in profiles]
        q = q.filter(LeaveRequest.intern_id.in_(intern_ids))
    # HR / Admin thấy tất cả

    if intern_id:
        q = q.filter(LeaveRequest.intern_id == intern_id)
    if batch_id:
        q = q.filter(LeaveRequest.batch_id == batch_id)
    if status:
        q = q.filter(LeaveRequest.status == status)

    results = q.order_by(LeaveRequest.leave_date.desc()).all()
    return [enrich(r, db) for r in results]


@router.post("/", response_model=dict)
def create_leave_request(
    data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.INTERN:
        raise HTTPException(status_code=403, detail="Chỉ thực tập sinh mới được gửi đơn nghỉ")

    # Không cho gửi 2 đơn cho cùng 1 ngày
    existing = db.query(LeaveRequest).filter(
        LeaveRequest.intern_id  == current_user.id,
        LeaveRequest.leave_date == data.leave_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bạn đã gửi đơn nghỉ cho ngày này")

    leave = LeaveRequest(
        intern_id=current_user.id,
        schedule_id=data.schedule_id,
        batch_id=data.batch_id,
        leave_date=data.leave_date,
        reason=data.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return enrich(leave, db)


@router.put("/{leave_id}/review", response_model=dict)
def review_leave_request(
    leave_id: int,
    data: LeaveRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR / Admin duyệt hoặc từ chối đơn nghỉ"""
    if current_user.role not in (UserRole.HR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Chỉ HR / Admin mới có quyền duyệt đơn nghỉ")

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn nghỉ")

    leave.status  = data.status
    if data.hr_note is not None:
        leave.hr_note = data.hr_note
    db.commit()
    db.refresh(leave)
    return enrich(leave, db)


@router.delete("/{leave_id}")
def delete_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    if current_user.role == UserRole.INTERN and leave.intern_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền")
    if leave.status == LeaveStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Đơn đã được duyệt, không thể xóa")
    db.delete(leave)
    db.commit()
    return {"message": "Đã xóa"}