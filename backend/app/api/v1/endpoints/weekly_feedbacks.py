from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.weekly_feedback import WeeklyFeedback
from app.models.intern_batch import InternBatch, BatchStatus
from app.models.intern_profile import InternProfile
from app.schemas.weekly_feedback import (
    WeeklyFeedbackCreate, WeeklyFeedbackUpdate,
    WeeklyFeedbackResponse, WeeklyFeedbackStatusResponse,
)
from app.core.deps import get_current_active_user, get_current_mentor

router = APIRouter()


def _build_response(fb: WeeklyFeedback, db: Session) -> WeeklyFeedbackResponse:
    intern = db.query(User).filter(User.id == fb.intern_id).first()
    mentor = db.query(User).filter(User.id == fb.mentor_id).first()
    return WeeklyFeedbackResponse(
        id=fb.id,
        intern_id=fb.intern_id,
        mentor_id=fb.mentor_id,
        batch_id=fb.batch_id,
        week_number=fb.week_number,
        week_label=fb.week_label,
        content=fb.content,
        strengths=fb.strengths,
        improvements=fb.improvements,
        rating=fb.rating,
        intern_name=intern.full_name if intern else "",
        mentor_name=mentor.full_name if mentor else "",
        created_at=fb.created_at,
        updated_at=fb.updated_at,
    )


def _get_current_week_number(batch: InternBatch) -> Optional[int]:
    """Tính tuần hiện tại trong đợt thực tập (tuần 1, 2, 3...)"""
    today = date.today()
    start = batch.start_date
    if today < start:
        return None
    diff = (today - start).days
    return diff // 7 + 1


@router.get("/status", response_model=List[WeeklyFeedbackStatusResponse])
def get_feedback_status(
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    """
    Trả về trạng thái feedback tuần hiện tại cho từng TTS mà mentor phụ trách.
    Dùng để hiển thị thông báo nhắc nhở vào Chủ nhật hoặc khi chưa feedback tuần này.
    """
    # Lấy tất cả TTS mà mentor này phụ trách (qua batch)
    profiles = (
        db.query(InternProfile)
        .join(InternBatch, InternBatch.id == InternProfile.batch_id)
        .filter(InternBatch.status == BatchStatus.OPEN)
        .all()
    )

    # Lọc theo mentor: chỉ lấy TTS trong batch mà mentor quản lý
    # (nếu hệ thống có trường mentor_id trên profile thì lọc ở đây)
    result = []
    for profile in profiles:
        batch = db.query(InternBatch).filter(InternBatch.id == profile.batch_id).first()
        if not batch:
            continue

        current_week = _get_current_week_number(batch)
        if current_week is None:
            continue

        has_feedback_this_week = db.query(WeeklyFeedback).filter(
            WeeklyFeedback.intern_id == profile.user_id,
            WeeklyFeedback.mentor_id == current_user.id,
            WeeklyFeedback.batch_id == batch.id,
            WeeklyFeedback.week_number == current_week,
        ).first() is not None

        intern_user = db.query(User).filter(User.id == profile.user_id).first()
        result.append(WeeklyFeedbackStatusResponse(
            intern_id=profile.user_id,
            intern_name=intern_user.full_name if intern_user else "",
            batch_id=batch.id,
            batch_name=batch.batch_name,
            current_week=current_week,
            has_feedback_this_week=has_feedback_this_week,
            batch_status=batch.status,
        ))

    return result


@router.get("/", response_model=List[WeeklyFeedbackResponse])
def get_feedbacks(
    intern_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách feedback — Mentor thấy TTS mình phụ trách, Intern thấy của mình"""
    query = db.query(WeeklyFeedback)

    if current_user.role == UserRole.INTERN:
        query = query.filter(WeeklyFeedback.intern_id == current_user.id)
    elif current_user.role == UserRole.MENTOR:
        query = query.filter(WeeklyFeedback.mentor_id == current_user.id)

    if intern_id:
        query = query.filter(WeeklyFeedback.intern_id == intern_id)
    if batch_id:
        query = query.filter(WeeklyFeedback.batch_id == batch_id)

    feedbacks = query.order_by(WeeklyFeedback.intern_id, WeeklyFeedback.week_number).all()
    return [_build_response(fb, db) for fb in feedbacks]


@router.post("/", response_model=WeeklyFeedbackResponse)
def create_feedback(
    data: WeeklyFeedbackCreate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    """Tạo feedback tuần mới (Mentor only) — chỉ khi đợt đang OPEN"""
    # Kiểm tra đợt có đang mở không
    batch = db.query(InternBatch).filter(InternBatch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt thực tập")
    if batch.status != BatchStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đợt thực tập đã đóng. Không thể thêm feedback mới.",
        )

    # Kiểm tra không tạo trùng tuần
    existing = db.query(WeeklyFeedback).filter(
        WeeklyFeedback.intern_id == data.intern_id,
        WeeklyFeedback.mentor_id == current_user.id,
        WeeklyFeedback.week_number == data.week_number,
        WeeklyFeedback.batch_id == data.batch_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Đã có feedback cho tuần {data.week_number} của TTS này",
        )

    fb = WeeklyFeedback(**data.model_dump(), mentor_id=current_user.id)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return _build_response(fb, db)


@router.put("/{feedback_id}", response_model=WeeklyFeedbackResponse)
def update_feedback(
    feedback_id: int,
    data: WeeklyFeedbackUpdate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    """Cập nhật feedback (chỉ Mentor tạo mới được sửa)"""
    fb = db.query(WeeklyFeedback).filter(WeeklyFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy feedback")
    if fb.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền sửa")

    # Kiểm tra đợt vẫn đang mở mới cho sửa
    batch = db.query(InternBatch).filter(InternBatch.id == fb.batch_id).first()
    if batch and batch.status != BatchStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đợt thực tập đã đóng. Không thể chỉnh sửa feedback.",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(fb, field, value)
    db.commit()
    db.refresh(fb)
    return _build_response(fb, db)


@router.delete("/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    """Xóa feedback"""
    fb = db.query(WeeklyFeedback).filter(WeeklyFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy feedback")
    if fb.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa")

    db.delete(fb)
    db.commit()
    return {"message": "Đã xóa feedback"}