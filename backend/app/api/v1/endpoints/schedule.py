from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel

from app.db.base import get_db
from app.core.deps import get_current_user
from app.models.schedule import InternSchedule, ShiftType, ScheduleStatus
from app.models.user import User, UserRole
from app.models.intern_profile import InternProfile
from app.models.leave_request import LeaveRequest, LeaveStatus  # ← THÊM

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    work_date: date
    shift: ShiftType
    note: Optional[str] = None
    batch_id: int


class ScheduleUpdate(BaseModel):
    shift: Optional[ShiftType] = None
    note: Optional[str] = None


class ScheduleReview(BaseModel):
    status: ScheduleStatus
    mentor_note: Optional[str] = None


class ScheduleOut(BaseModel):
    id: int
    intern_id: int
    mentor_id: Optional[int]
    batch_id: int
    work_date: date
    shift: ShiftType
    status: ScheduleStatus
    note: Optional[str]
    mentor_note: Optional[str]
    intern_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Helper ───────────────────────────────────────────────────────────────────

def enrich(s: InternSchedule, db: Session) -> dict:
    intern = db.query(User).filter(User.id == s.intern_id).first()
    return {
        "id": s.id,
        "intern_id": s.intern_id,
        "mentor_id": s.mentor_id,
        "batch_id": s.batch_id,
        "work_date": s.work_date,
        "shift": s.shift,
        "status": s.status,
        "note": s.note,
        "mentor_note": s.mentor_note,
        "intern_name": intern.full_name if intern else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ─── Helper: lấy tập (intern_id, leave_date) đã được duyệt nghỉ ──────────────

def get_approved_leave_dates(db: Session, intern_ids: Optional[List[int]] = None,
                              week_start: Optional[date] = None,
                              week_end: Optional[date] = None) -> set:
    """
    Trả về set of (intern_id, leave_date) đã được HR duyệt nghỉ.
    Dùng để loại bỏ các ô lịch trùng ngày nghỉ đã duyệt.
    """
    q = db.query(LeaveRequest.intern_id, LeaveRequest.leave_date).filter(
        LeaveRequest.status == LeaveStatus.APPROVED
    )
    if intern_ids is not None:
        q = q.filter(LeaveRequest.intern_id.in_(intern_ids))
    if week_start and week_end:
        q = q.filter(
            LeaveRequest.leave_date >= week_start,
            LeaveRequest.leave_date <= week_end,
        )
    return {(row.intern_id, row.leave_date) for row in q.all()}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[dict])
def get_schedules(
    intern_id: Optional[int] = Query(None),
    batch_id:  Optional[int] = Query(None),
    week_start: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(InternSchedule)

    if current_user.role == UserRole.INTERN:
        q = q.filter(InternSchedule.intern_id == current_user.id)
    elif current_user.role == UserRole.MENTOR:
        profiles = db.query(InternProfile).filter(InternProfile.mentor_id == current_user.id).all()
        intern_ids = [p.user_id for p in profiles]
        q = q.filter(InternSchedule.intern_id.in_(intern_ids))
    # HR và ADMIN xem tất cả — không filter

    if intern_id:
        q = q.filter(InternSchedule.intern_id == intern_id)
    if batch_id:
        q = q.filter(InternSchedule.batch_id == batch_id)

    week_end = None
    if week_start:
        week_end = week_start + timedelta(days=6)
        q = q.filter(InternSchedule.work_date >= week_start, InternSchedule.work_date <= week_end)

    schedules = q.order_by(InternSchedule.work_date).all()

    # ── Lọc bỏ ngày đã được duyệt nghỉ ──────────────────────────────────────
    # Lấy danh sách intern_id thực tế trong kết quả để query leave tối ưu
    schedule_intern_ids = list({s.intern_id for s in schedules})
    approved_leaves = get_approved_leave_dates(
        db,
        intern_ids=schedule_intern_ids if schedule_intern_ids else None,
        week_start=week_start,
        week_end=week_end,
    )

    # Loại bỏ các schedule mà ngày đó TTS đã được duyệt nghỉ
    filtered = [
        s for s in schedules
        if (s.intern_id, s.work_date) not in approved_leaves
    ]

    return [enrich(s, db) for s in filtered]


@router.post("/", response_model=dict)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.INTERN:
        raise HTTPException(status_code=403, detail="Chỉ thực tập sinh mới được đăng ký lịch")

    existing = db.query(InternSchedule).filter(
        InternSchedule.intern_id == current_user.id,
        InternSchedule.work_date == data.work_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bạn đã đăng ký lịch cho ngày này")

    # Chặn đăng ký lịch vào ngày đã được duyệt nghỉ
    approved_leave = db.query(LeaveRequest).filter(
        LeaveRequest.intern_id == current_user.id,
        LeaveRequest.leave_date == data.work_date,
        LeaveRequest.status == LeaveStatus.APPROVED,
    ).first()
    if approved_leave:
        raise HTTPException(status_code=400, detail="Ngày này bạn đã được duyệt nghỉ, không thể đăng ký lịch")

    profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
    mentor_id = profile.mentor_id if profile else None

    schedule = InternSchedule(
        intern_id=current_user.id,
        mentor_id=mentor_id,
        batch_id=data.batch_id,
        work_date=data.work_date,
        shift=data.shift,
        note=data.note,
        status=ScheduleStatus.PENDING,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return enrich(schedule, db)


@router.put("/{schedule_id}", response_model=dict)
def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(InternSchedule).filter(InternSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch")
    if current_user.role == UserRole.INTERN and schedule.intern_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền")
    if schedule.status == ScheduleStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Lịch đã được duyệt, không thể sửa")

    if data.shift:
        schedule.shift = data.shift
    if data.note is not None:
        schedule.note = data.note
    db.commit()
    db.refresh(schedule)
    return enrich(schedule, db)


@router.put("/{schedule_id}/review", response_model=dict)
def review_schedule(
    schedule_id: int,
    data: ScheduleReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chỉ HR mới được duyệt/từ chối lịch thực tập"""
    if current_user.role != UserRole.HR:
        raise HTTPException(status_code=403, detail="Chỉ HR mới có quyền duyệt lịch")

    schedule = db.query(InternSchedule).filter(InternSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch")

    schedule.status = data.status
    if data.mentor_note is not None:
        schedule.mentor_note = data.mentor_note
    db.commit()
    db.refresh(schedule)
    return enrich(schedule, db)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(InternSchedule).filter(InternSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    if current_user.role == UserRole.INTERN and schedule.intern_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền")
    if schedule.status == ScheduleStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Lịch đã được duyệt, không thể xóa")
    db.delete(schedule)
    db.commit()
    return {"message": "Đã xóa"}