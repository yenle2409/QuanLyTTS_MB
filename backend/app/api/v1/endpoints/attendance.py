from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone, time
from pydantic import BaseModel

from app.db.base import get_db
from app.core.deps import get_current_user
from app.models.attendance import Attendance, AttendanceStatus
from app.models.schedule import InternSchedule, ScheduleStatus
from app.models.user import User, UserRole
from app.models.intern_profile import InternProfile
from app.models.intern_batch import InternBatch

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    id: int
    intern_id: int
    schedule_id: Optional[int]
    batch_id: int
    date: date
    status: AttendanceStatus
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    note: Optional[str]
    intern_name: Optional[str] = None
    shift: Optional[str] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AttendanceMarkAbsent(BaseModel):
    note: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

# ✅ Giờ kết thúc từng ca (giờ địa phương VN)
SHIFT_END_TIMES = {
    'ca1':  time(12, 0),   # Ca sáng kết thúc 12:00
    'ca2':  time(17, 0),   # Ca chiều kết thúc 17:00
    'full': time(17, 0),   # Cả ngày kết thúc 17:00
}


def is_shift_ended(shift: str) -> bool:
    """Kiểm tra ca làm việc đã kết thúc chưa dựa theo giờ hiện tại (VN +7)"""
    end_time = SHIFT_END_TIMES.get(shift)
    if not end_time:
        return False
    # Lấy giờ hiện tại theo múi giờ VN (UTC+7)
    now_vn = datetime.now(timezone.utc).astimezone(
        __import__('zoneinfo', fromlist=['ZoneInfo']).ZoneInfo('Asia/Ho_Chi_Minh')
    )
    return now_vn.time() >= end_time


def resolve_display_status(
    attendance: Optional[Attendance],
    shift: str,
) -> str:
    """
    Tính trạng thái hiển thị:
    - Có attendance → dùng status thật
    - Chưa có attendance + ca chưa kết thúc → 'not_checked_in'
    - Chưa có attendance + ca đã kết thúc   → 'absent' (hiển thị, chưa ghi DB)
    """
    if attendance:
        return attendance.status.value if hasattr(attendance.status, 'value') else str(attendance.status)
    if is_shift_ended(shift):
        return 'absent'
    return 'not_checked_in'


def enrich(a: Attendance, db: Session) -> dict:
    intern = db.query(User).filter(User.id == a.intern_id).first()
    schedule = db.query(InternSchedule).filter(InternSchedule.id == a.schedule_id).first() if a.schedule_id else None
    return {
        "id": a.id,
        "intern_id": a.intern_id,
        "schedule_id": a.schedule_id,
        "batch_id": a.batch_id,
        "date": a.date,
        "status": a.status,
        "check_in_time": a.check_in_time,
        "check_out_time": a.check_out_time,
        "note": a.note,
        "intern_name": intern.full_name if intern else None,
        "shift": schedule.shift if schedule else None,
        "created_at": a.created_at,
    }


def is_intern_eligible(db: Session, intern_id: int, batch_id: int) -> bool:
    """Chỉ cho phép TTS đang active VÀ đợt còn mở"""
    profile = db.query(InternProfile).filter(
        InternProfile.user_id == intern_id
    ).first()
    if not profile or profile.intern_status != 'active':
        return False

    batch = db.query(InternBatch).filter(
        InternBatch.id == batch_id
    ).first()
    if not batch or batch.status != 'open':
        return False

    return True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/today", response_model=List[dict])
def get_today_attendance(
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR/Mentor xem điểm danh hôm nay — tự động hiển thị vắng khi quá giờ ca"""
    if current_user.role not in [UserRole.HR, UserRole.ADMIN, UserRole.MENTOR]:
        raise HTTPException(status_code=403, detail="Không có quyền")

    today = date.today()

    q = db.query(InternSchedule).filter(
        InternSchedule.work_date == today,
        InternSchedule.status == ScheduleStatus.APPROVED,
    )
    if batch_id:
        q = q.filter(InternSchedule.batch_id == batch_id)

    if current_user.role == UserRole.MENTOR:
        mentor_intern_ids = [
            p.user_id for p in db.query(InternProfile)
            .filter(InternProfile.mentor_id == current_user.id)
            .all()
        ]
        q = q.filter(InternSchedule.intern_id.in_(mentor_intern_ids))

    schedules = q.all()

    result = []
    for s in schedules:
        if not is_intern_eligible(db, s.intern_id, s.batch_id):
            continue

        intern = db.query(User).filter(User.id == s.intern_id).first()
        attendance = db.query(Attendance).filter(
            Attendance.intern_id == s.intern_id,
            Attendance.date == today,
        ).first()

        # ✅ Dùng resolve_display_status để tự động hiển thị vắng khi quá giờ
        display_status = resolve_display_status(attendance, s.shift)

        result.append({
            "intern_id":      s.intern_id,
            "intern_name":    intern.full_name if intern else None,
            "schedule_id":    s.id,
            "batch_id":       s.batch_id,
            "shift":          s.shift,
            "date":           today,
            "attendance_id":  attendance.id if attendance else None,
            "status":         display_status,
            "check_in_time":  attendance.check_in_time if attendance else None,
            "check_out_time": attendance.check_out_time if attendance else None,
            "note":           attendance.note if attendance else None,
            # ✅ Thêm flag để frontend biết đây là vắng "ảo" (chưa ghi DB)
            "is_auto_absent": display_status == 'absent' and attendance is None,
        })

    # Sắp xếp: vắng lên đầu, rồi chưa check-in, rồi đang làm, đã về
    status_order = {'absent': 0, 'not_checked_in': 1, 'present': 2, 'checked_out': 3}
    return sorted(result, key=lambda x: (
        status_order.get(x["status"], 9),
        str(x["intern_name"])
    ))


@router.get("/", response_model=List[dict])
def get_attendance(
    intern_id: Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    target_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy lịch sử điểm danh — HR xem tất cả, TTS xem của mình"""
    q = db.query(Attendance)

    if current_user.role == UserRole.INTERN:
        q = q.filter(Attendance.intern_id == current_user.id)
    elif current_user.role not in [UserRole.HR, UserRole.ADMIN, UserRole.MENTOR]:
        raise HTTPException(status_code=403, detail="Không có quyền")

    if intern_id and current_user.role != UserRole.INTERN:
        q = q.filter(Attendance.intern_id == intern_id)
    if batch_id:
        q = q.filter(Attendance.batch_id == batch_id)
    if target_date:
        q = q.filter(Attendance.date == target_date)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)

    attendances = q.order_by(Attendance.date.desc()).all()
    return [enrich(a, db) for a in attendances]


@router.get("/me/today", response_model=dict)
def get_my_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """TTS xem trạng thái điểm danh hôm nay — tự hiển thị vắng khi quá giờ ca"""
    if current_user.role != UserRole.INTERN:
        raise HTTPException(status_code=403, detail="Chỉ dành cho thực tập sinh")

    today = date.today()

    profile = db.query(InternProfile).filter(
        InternProfile.user_id == current_user.id
    ).first()

    batch = db.query(InternBatch).filter(
        InternBatch.id == profile.batch_id
    ).first() if profile else None

    schedule = db.query(InternSchedule).filter(
        InternSchedule.intern_id == current_user.id,
        InternSchedule.work_date == today,
        InternSchedule.status == ScheduleStatus.APPROVED,
    ).first()

    attendance = db.query(Attendance).filter(
        Attendance.intern_id == current_user.id,
        Attendance.date == today,
    ).first()

    # ✅ Tính display_status cho TTS
    display_status = None
    is_auto_absent = False
    if schedule:
        display_status = resolve_display_status(attendance, schedule.shift)
        is_auto_absent = display_status == 'absent' and attendance is None

    return {
        "is_active":    profile.intern_status == 'active' if profile else False,
        "batch_open":   batch.status == 'open' if batch else False,
        "has_schedule": schedule is not None,
        "schedule": {
            "id":        schedule.id,
            "shift":     schedule.shift,
            "work_date": schedule.work_date,
        } if schedule else None,
        "attendance":     enrich(attendance, db) if attendance else None,
        # ✅ Thêm 2 field mới cho frontend
        "display_status": display_status,   # trạng thái hiển thị (có thể là 'absent' dù chưa ghi DB)
        "is_auto_absent": is_auto_absent,   # True = vắng tự động, chưa ghi DB
    }


@router.post("/check-in", response_model=dict)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """TTS check-in — chỉ khi active + đợt còn mở"""
    if current_user.role != UserRole.INTERN:
        raise HTTPException(status_code=403, detail="Chỉ thực tập sinh mới được check-in")

    today = date.today()
    now = datetime.now(timezone.utc)

    profile = db.query(InternProfile).filter(
        InternProfile.user_id == current_user.id
    ).first()
    if not profile or profile.intern_status != 'active':
        raise HTTPException(status_code=400, detail="Bạn không còn trong trạng thái thực tập")

    batch = db.query(InternBatch).filter(
        InternBatch.id == profile.batch_id
    ).first()
    if not batch or batch.status != 'open':
        raise HTTPException(status_code=400, detail="Đợt thực tập của bạn đã đóng")

    existing = db.query(Attendance).filter(
        Attendance.intern_id == current_user.id,
        Attendance.date == today,
    ).first()
    if existing:
        if existing.status == AttendanceStatus.PRESENT:
            raise HTTPException(status_code=400, detail="Bạn đã check-in hôm nay rồi")
        if existing.status == AttendanceStatus.CHECKED_OUT:
            raise HTTPException(status_code=400, detail="Bạn đã check-out hôm nay rồi")

    schedule = db.query(InternSchedule).filter(
        InternSchedule.intern_id == current_user.id,
        InternSchedule.work_date == today,
        InternSchedule.status == ScheduleStatus.APPROVED,
    ).first()
    if not schedule:
        raise HTTPException(status_code=400, detail="Hôm nay bạn không có lịch thực tập đã được duyệt")

    # ✅ Không cho check-in nếu ca đã kết thúc
    if is_shift_ended(schedule.shift):
        raise HTTPException(status_code=400, detail="Ca làm việc của bạn đã kết thúc, không thể check-in")

    attendance = Attendance(
        intern_id=current_user.id,
        schedule_id=schedule.id,
        batch_id=schedule.batch_id,
        date=today,
        status=AttendanceStatus.PRESENT,
        check_in_time=now,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return enrich(attendance, db)


@router.post("/check-out", response_model=dict)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """TTS check-out — chỉ khi active + đợt còn mở"""
    if current_user.role != UserRole.INTERN:
        raise HTTPException(status_code=403, detail="Chỉ thực tập sinh mới được check-out")

    today = date.today()
    now = datetime.now(timezone.utc)

    profile = db.query(InternProfile).filter(
        InternProfile.user_id == current_user.id
    ).first()
    if not profile or profile.intern_status != 'active':
        raise HTTPException(status_code=400, detail="Bạn không còn trong trạng thái thực tập")

    batch = db.query(InternBatch).filter(
        InternBatch.id == profile.batch_id
    ).first()
    if not batch or batch.status != 'open':
        raise HTTPException(status_code=400, detail="Đợt thực tập của bạn đã đóng")

    attendance = db.query(Attendance).filter(
        Attendance.intern_id == current_user.id,
        Attendance.date == today,
    ).first()
    if not attendance:
        raise HTTPException(status_code=400, detail="Bạn chưa check-in hôm nay")
    if attendance.status == AttendanceStatus.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Bạn đã check-out rồi")
    if attendance.status == AttendanceStatus.ABSENT:
        raise HTTPException(status_code=400, detail="Bạn đã bị đánh dấu vắng")

    attendance.status = AttendanceStatus.CHECKED_OUT
    attendance.check_out_time = now
    db.commit()
    db.refresh(attendance)
    return enrich(attendance, db)


@router.post("/mark-absent", response_model=dict)
def mark_absent_manual(
    intern_id: int,
    data: AttendanceMarkAbsent,
    target_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR đánh dấu vắng thủ công"""
    if current_user.role not in [UserRole.HR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Không có quyền")

    today = target_date or date.today()

    schedule = db.query(InternSchedule).filter(
        InternSchedule.intern_id == intern_id,
        InternSchedule.work_date == today,
    ).first()

    attendance = db.query(Attendance).filter(
        Attendance.intern_id == intern_id,
        Attendance.date == today,
    ).first()

    if attendance:
        attendance.status = AttendanceStatus.ABSENT
        attendance.note = data.note
    else:
        attendance = Attendance(
            intern_id=intern_id,
            schedule_id=schedule.id if schedule else None,
            batch_id=schedule.batch_id if schedule else 0,
            date=today,
            status=AttendanceStatus.ABSENT,
            note=data.note,
        )
        db.add(attendance)

    db.commit()
    db.refresh(attendance)
    return enrich(attendance, db)


@router.post("/auto-mark-absent")
def auto_mark_absent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ghi ABSENT vào DB cho tất cả TTS chưa check-in và ca đã kết thúc"""
    if current_user.role not in [UserRole.HR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Không có quyền")

    today = date.today()

    schedules = db.query(InternSchedule).filter(
        InternSchedule.work_date == today,
        InternSchedule.status == ScheduleStatus.APPROVED,
    ).all()

    marked = 0
    for s in schedules:
        if not is_intern_eligible(db, s.intern_id, s.batch_id):
            continue

        # ✅ Chỉ ghi vắng vào DB khi ca đã kết thúc
        if not is_shift_ended(s.shift):
            continue

        existing = db.query(Attendance).filter(
            Attendance.intern_id == s.intern_id,
            Attendance.date == today,
        ).first()
        if not existing:
            db.add(Attendance(
                intern_id=s.intern_id,
                schedule_id=s.id,
                batch_id=s.batch_id,
                date=today,
                status=AttendanceStatus.ABSENT,
                note="Tự động đánh dấu vắng cuối ngày",
            ))
            marked += 1

    db.commit()
    return {"message": f"Đã ghi vắng {marked} TTS vào hệ thống"}