from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.intern_profile import InternProfile, InternStatus
from app.models.intern_batch import InternBatch, BatchStatus
from app.models.evaluation import Evaluation
from app.models.task import Task
from app.models.leave_request import LeaveRequest
from app.models.logbook_entry import LogbookEntry
from app.models.schedule import InternSchedule
from app.models.task_message import TaskMessage
from app.models.training_document import TrainingDocument
from app.models.weekly_feedback import WeeklyFeedback
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserResetPassword
from app.core.deps import get_current_admin, get_current_active_user
from app.core.security import get_password_hash
from app.core.deps import get_current_active_user, get_current_admin, get_current_hr

router = APIRouter()


# ─── Helper: đồng bộ trạng thái tài khoản TTS ───────────────
def sync_intern_account_status(user: User, profile: InternProfile, batch, db: Session):
    """
    Khóa tài khoản nếu TTS quit/completed hoặc đợt đã đóng.
    Mở lại nếu không còn điều kiện trên.
    """
    should_lock = (
        profile.intern_status in (InternStatus.QUIT, InternStatus.COMPLETED)
        or (batch is not None and batch.status == BatchStatus.CLOSED)
    )
    new_status = UserStatus.LOCKED if should_lock else UserStatus.ACTIVE
    if user.status != new_status:
        user.status = new_status


@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    role: UserRole = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.offset(skip).limit(limit).all()
    return users


@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    db_user = User(
        username=user_data.username,
        password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        email=user_data.email,
        role=user_data.role,
        phone=user_data.phone,
        department=user_data.department,
        status=UserStatus.ACTIVE
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if user_data.role == UserRole.INTERN and user_data.batch_id:
        intern_profile = InternProfile(user_id=db_user.id, batch_id=user_data.batch_id)
        db.add(intern_profile)
        db.commit()

    return db_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    password_data: UserResetPassword,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Reset mật khẩu thành công"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của chính mình")

    task_ids = db.query(Task.id).filter(
        (Task.intern_id == user_id) | (Task.mentor_id == user_id)
    ).all()
    task_ids = [t[0] for t in task_ids]
    if task_ids:
        db.query(TaskMessage).filter(TaskMessage.task_id.in_(task_ids)).delete(synchronize_session=False)

    db.query(Task).filter((Task.intern_id == user_id) | (Task.mentor_id == user_id)).delete(synchronize_session=False)
    db.query(Evaluation).filter((Evaluation.intern_id == user_id) | (Evaluation.mentor_id == user_id)).delete(synchronize_session=False)
    db.query(WeeklyFeedback).filter((WeeklyFeedback.intern_id == user_id) | (WeeklyFeedback.mentor_id == user_id)).delete(synchronize_session=False)
    db.query(LeaveRequest).filter(LeaveRequest.intern_id == user_id).delete(synchronize_session=False)
    db.query(LogbookEntry).filter(LogbookEntry.intern_id == user_id).delete(synchronize_session=False)
    db.query(InternSchedule).filter((InternSchedule.intern_id == user_id) | (InternSchedule.mentor_id == user_id)).delete(synchronize_session=False)
    db.query(TrainingDocument).filter(TrainingDocument.mentor_id == user_id).delete(synchronize_session=False)
    db.query(InternProfile).filter(InternProfile.mentor_id == user_id).update({"mentor_id": None}, synchronize_session=False)
    db.query(InternProfile).filter(InternProfile.user_id == user_id).delete(synchronize_session=False)
    db.flush()
    db.delete(user)
    db.commit()
    return {"message": "Xóa người dùng thành công"}


@router.put("/{user_id}/profile")
def update_user_profile(
    user_id: int,
    data: dict,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    # Cập nhật thông tin cơ bản
    allowed = ["full_name", "phone", "gender", "date_of_birth", "address"]
    for field in allowed:
        if field in data:
            setattr(user, field, data[field] or None)

    # Cập nhật department
    if "department" in data:
        from app.models.user import Department
        dep = data["department"]
        if dep:
            dep_upper = str(dep).strip().upper()
            user.department = Department[dep_upper] if dep_upper in Department.__members__ else None
        else:
            user.department = None

    # Cập nhật intern_profile
    profile = db.query(InternProfile).filter(InternProfile.user_id == user_id).first()
    if profile:
        if "university" in data:
            profile.university = data["university"] or None
        if "gpa" in data:
            profile.gpa = float(data["gpa"]) if data["gpa"] else None
        if "cv_link" in data:
            profile.cv_link = data["cv_link"] or None
        if "intern_status" in data:
            profile.intern_status = InternStatus(data["intern_status"])

        # ── Tự động khóa/mở tài khoản sau khi cập nhật ──
        batch = db.query(InternBatch).filter(InternBatch.id == profile.batch_id).first()
        sync_intern_account_status(user, profile, batch, db)

    db.commit()
    return {"message": "Cập nhật thành công"}