from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.intern_profile import InternProfile, InternStatus
from app.models.intern_batch import InternBatch, BatchStatus
from app.schemas.intern_profile import InternProfileCreate, InternProfileResponse, InternProfileUpdate, InternProfileWithUser
from app.core.deps import get_current_hr, get_current_mentor, get_current_active_user
import openpyxl
from io import BytesIO
from app.core.security import get_password_hash
from app.models.user import Department
from app.models.task import Task

router = APIRouter()


# ─── Helper ───────────────────────────────────────────────────────────────────

def sync_intern_account_status(user: User, profile: InternProfile, db: Session):
    batch = db.query(InternBatch).filter(InternBatch.id == profile.batch_id).first()
    should_lock = (
        profile.intern_status in (InternStatus.QUIT, InternStatus.COMPLETED)
        or (batch is not None and batch.status == BatchStatus.CLOSED)
    )
    new_status = UserStatus.LOCKED if should_lock else UserStatus.ACTIVE
    if user.status != new_status:
        user.status = new_status


def _parse_gender(raw):
    if not raw:
        return None
    try:
        from app.models.user import Gender
        val = str(raw).strip().lower()
        mapping = {
            'nam': 'male', 'nữ': 'female', 'nu': 'female',
            'khác': 'other', 'khac': 'other',
            'male': 'male', 'female': 'female', 'other': 'other',
        }
        return Gender(mapping.get(val, val))
    except (ValueError, KeyError):
        return None


def _parse_department(raw, row_idx: int, errors: list):
    if not raw:
        return None, False
    dep = str(raw).strip().upper()
    if dep in Department.__members__:
        return Department[dep], False
    errors.append(f"Dòng {row_idx}: Phòng ban không hợp lệ ({raw})")
    return None, True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create-with-account", response_model=InternProfileResponse)
def create_intern_with_account(
    data: dict,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    from app.models.user import Department, Gender
    from datetime import datetime

    if db.query(User).filter(User.username == data.get("username")).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    if db.query(User).filter(User.email == data.get("email")).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    department = None
    if data.get("department"):
        dep = str(data["department"]).strip().upper()
        if dep in Department.__members__:
            department = Department[dep]

    gender = _parse_gender(data.get("gender"))

    date_of_birth = None
    if data.get("date_of_birth"):
        try:
            date_of_birth = datetime.strptime(str(data["date_of_birth"]), "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    new_user = User(
        username=data["username"],
        password=get_password_hash(data.get("password", "intern123")),
        full_name=data["full_name"],
        email=data["email"],
        role=UserRole.INTERN,
        phone=data.get("phone") or None,
        department=department,
        gender=gender,
        date_of_birth=date_of_birth,
        address=data.get("address") or None,
        status=UserStatus.ACTIVE
    )
    db.add(new_user)
    db.flush()

    batch_id = data.get("batch_id")
    if not batch_id:
        raise HTTPException(status_code=400, detail="batch_id là bắt buộc")

    mentor_id = data.get("mentor_id")
    new_profile = InternProfile(
        user_id=new_user.id,
        batch_id=int(batch_id),
        mentor_id=int(mentor_id) if mentor_id else None,
        university=data.get("university") or None,
        gpa=float(data["gpa"]) if data.get("gpa") else None,
        cv_link=data.get("cv_link") or None,
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile


@router.get("/", response_model=List[InternProfileWithUser])
def get_intern_profiles(
    skip: int = 0,
    limit: int = 100,
    batch_id: int = None,
    mentor_id: int = None,
    department: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(InternProfile)

    if current_user.role == UserRole.MENTOR:
        # ✅ FIX: Bỏ filter intern_status == ACTIVE
        # Mentor cần thấy TTS của mình kể cả khi đợt đã kết thúc (completed)
        # để có thể xem hồ sơ và đánh giá cuối kỳ
        query = query.filter(
            InternProfile.mentor_id == current_user.id
        )
    elif mentor_id:
        query = query.filter(InternProfile.mentor_id == mentor_id)

    if batch_id:
        query = query.filter(InternProfile.batch_id == batch_id)

    profiles = query.offset(skip).limit(limit).all()

    result = []
    for profile in profiles:
        user   = db.query(User).filter(User.id == profile.user_id).first()
        batch  = db.query(InternBatch).filter(InternBatch.id == profile.batch_id).first()
        mentor = db.query(User).filter(User.id == profile.mentor_id).first() if profile.mentor_id else None

        dept_value = None
        if user and user.department:
            dept_value = user.department.value if hasattr(user.department, 'value') else str(user.department)

        if department and dept_value != department:
            continue

        profile_dict = InternProfileWithUser(
            **{
                **profile.__dict__,
                "user_full_name": user.full_name if user else "",
                "user_email":     user.email     if user else "",
                "user_phone":     user.phone     if user else None,
                "batch_name":     batch.batch_name if batch else "",
                "mentor_name":    mentor.full_name  if mentor else None,
                "intern_status":  profile.intern_status,
                "department":     dept_value,
            }
        )
        result.append(profile_dict)

    return result


@router.get("/mentors", response_model=List[dict])
def get_mentors_for_assignment(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    mentors = db.query(User).filter(
        User.role == UserRole.MENTOR,
        User.status == UserStatus.ACTIVE
    ).all()
    return [
        {
            "id": m.id,
            "full_name": m.full_name,
            "email": m.email,
            "department": m.department.value if m.department and hasattr(m.department, 'value') else (str(m.department) if m.department else None),
        }
        for m in mentors
    ]


@router.post("/", response_model=InternProfileResponse)
def create_intern_profile(
    profile_data: InternProfileCreate,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == profile_data.user_id).first()
    if not user or user.role != UserRole.INTERN:
        raise HTTPException(status_code=400, detail="Người dùng không tồn tại hoặc không phải thực tập sinh")

    if db.query(InternProfile).filter(InternProfile.user_id == profile_data.user_id).first():
        raise HTTPException(status_code=400, detail="Hồ sơ thực tập sinh đã tồn tại")

    db_profile = InternProfile(**profile_data.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


@router.put("/{profile_id}", response_model=InternProfileResponse)
def update_intern_profile(
    profile_id: int,
    profile_data: InternProfileUpdate,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = db.query(InternProfile).filter(InternProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ thực tập sinh")

    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    if "intern_status" in update_data:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            sync_intern_account_status(user, profile, db)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}/detail")
def get_intern_detail(
    profile_id: int,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = db.query(InternProfile).filter(InternProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")

    user   = db.query(User).filter(User.id == profile.user_id).first()
    batch  = db.query(InternBatch).filter(InternBatch.id == profile.batch_id).first()
    mentor = db.query(User).filter(User.id == profile.mentor_id).first() if profile.mentor_id else None
    tasks  = db.query(Task).filter(Task.intern_id == profile.user_id).all()

    dept_value = None
    if user and user.department:
        dept_value = user.department.value if hasattr(user.department, 'value') else str(user.department)

    return {
        "id":            profile.id,
        "user_id":       profile.user_id,
        "full_name":     user.full_name     if user else "",
        "email":         user.email         if user else "",
        "phone":         user.phone         if user else None,
        "gender":        user.gender        if user else None,
        "date_of_birth": user.date_of_birth if user else None,
        "address":       user.address       if user else None,
        "department":    dept_value,
        "university":    profile.university,
        "gpa":           profile.gpa,
        "cv_link":       profile.cv_link,
        "intern_status": profile.intern_status,
        "batch_id":      profile.batch_id,
        "batch_name":    batch.batch_name   if batch else "",
        "mentor_id":     profile.mentor_id,
        "mentor_name":   mentor.full_name   if mentor else None,
        "created_at":    profile.created_at,
        "tasks": [
            {"id": t.id, "title": t.title, "status": t.status, "deadline": t.deadline}
            for t in tasks
        ]
    }


@router.patch("/bulk-status")
def bulk_update_status(
    data: dict,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile_ids = data.get("profile_ids", [])
    new_status  = data.get("intern_status")

    if not profile_ids or not new_status:
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu")

    try:
        status_enum = InternStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ: {[e.value for e in InternStatus]}")

    profiles = db.query(InternProfile).filter(InternProfile.id.in_(profile_ids)).all()
    for profile in profiles:
        profile.intern_status = status_enum
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            sync_intern_account_status(user, profile, db)

    db.commit()
    return {"message": f"Đã cập nhật {len(profiles)} hồ sơ"}


@router.post("/import-excel")
async def import_interns_from_excel(
    file: UploadFile = File(...),
    batch_id: int = None,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx hoặc .xls)")

    content  = await file.read()
    workbook = openpyxl.load_workbook(BytesIO(content))
    sheet    = workbook.active

    imported_count = 0
    skipped_count  = 0
    errors: list[str] = []

    for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):
            continue

        try:
            cells       = list(row) + [None] * 9
            full_name   = str(cells[0]).strip() if cells[0] else None
            email       = str(cells[1]).strip() if cells[1] else None
            phone       = str(cells[2]).strip() if cells[2] else None
            gender_raw  = cells[3]
            address     = str(cells[4]).strip() if cells[4] else None
            university  = str(cells[5]).strip() if cells[5] else None
            gpa_raw     = cells[6]
            dept_raw    = cells[7]
            cv_link     = str(cells[8]).strip() if cells[8] else None

            if not full_name or not email:
                errors.append(f"Dòng {idx}: Thiếu Họ tên hoặc Email (bắt buộc)")
                skipped_count += 1
                continue

            if db.query(User).filter(User.email == email).first():
                errors.append(f"Dòng {idx}: Email {email} đã tồn tại — bỏ qua")
                skipped_count += 1
                continue

            gender = _parse_gender(gender_raw)

            department, has_dept_error = _parse_department(dept_raw, idx, errors)
            if has_dept_error:
                skipped_count += 1
                continue

            gpa = None
            if gpa_raw is not None and str(gpa_raw).strip() != '':
                try:
                    gpa = float(gpa_raw)
                    if not (0 <= gpa <= 4):
                        errors.append(f"Dòng {idx}: GPA phải từ 0-4 ({gpa_raw}) — bỏ qua GPA")
                        gpa = None
                except (ValueError, TypeError):
                    errors.append(f"Dòng {idx}: GPA không hợp lệ ({gpa_raw}) — bỏ qua GPA")

            username_base = email.split('@')[0]
            username      = username_base
            suffix        = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{username_base}{suffix}"
                suffix  += 1

            new_user = User(
                username=username,
                password=get_password_hash("intern123"),
                full_name=full_name,
                email=email,
                role=UserRole.INTERN,
                phone=phone or None,
                gender=gender,
                address=address or None,
                department=department,
                status=UserStatus.ACTIVE,
            )
            db.add(new_user)
            db.flush()

            if batch_id:
                new_profile = InternProfile(
                    user_id=new_user.id,
                    batch_id=batch_id,
                    university=university or None,
                    gpa=gpa,
                    cv_link=cv_link or None,
                )
                db.add(new_profile)

            imported_count += 1

        except Exception as e:
            errors.append(f"Dòng {idx}: Lỗi không xác định — {str(e)}")
            skipped_count += 1
            db.rollback()
            continue

    db.commit()

    msg_parts = [f"Import thành công {imported_count} thực tập sinh"]
    if skipped_count:
        msg_parts.append(f"bỏ qua {skipped_count} dòng lỗi")

    return {
        "message":        " — ".join(msg_parts),
        "imported_count": imported_count,
        "skipped_count":  skipped_count,
        "errors":         errors if errors else None,
    }