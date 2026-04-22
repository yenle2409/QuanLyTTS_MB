from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.models.task_report import TaskReport
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate, TaskWithDetails
from app.schemas.task_report import TaskReportCreate, TaskReportResponse, TaskReportMentorComment
from app.core.deps import get_current_active_user, get_current_mentor
from datetime import datetime

router = APIRouter()


# ─── Helper: tính thời gian quá hạn ──────────────────────────
def get_overdue_info(deadline: datetime) -> dict:
    """
    Trả về thông tin quá hạn:
    - is_overdue: bool
    - overdue_seconds: số giây quá hạn (0 nếu chưa quá)
    - overdue_label: chuỗi mô tả VD "2 ngày 3 giờ 15 phút"
    """
    now = datetime.utcnow()
    if deadline >= now:
        return {"is_overdue": False, "overdue_seconds": 0, "overdue_label": ""}

    delta = now - deadline
    total_seconds = int(delta.total_seconds())
    days = delta.days
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60

    parts = []
    if days > 0:
        parts.append(f"{days} ngày")
    if hours > 0:
        parts.append(f"{hours} giờ")
    if minutes > 0 or (days == 0 and hours == 0):
        parts.append(f"{minutes} phút")

    return {
        "is_overdue": True,
        "overdue_seconds": total_seconds,
        "overdue_label": " ".join(parts),
    }


# ─── Task endpoints ───────────────────────────────────────────
@router.get("/", response_model=List[TaskWithDetails])
def get_tasks(
    skip: int = 0,
    limit: int = 100,
    status_filter: TaskStatus = None,
    batch_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task)

    if current_user.role == UserRole.INTERN:
        query = query.filter(Task.intern_id == current_user.id)
    elif current_user.role == UserRole.MENTOR:
        query = query.filter(Task.mentor_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if batch_id:
        query = query.filter(Task.batch_id == batch_id)

    tasks = query.offset(skip).limit(limit).all()

    result = []
    for task in tasks:
        mentor = db.query(User).filter(User.id == task.mentor_id).first()
        intern = db.query(User).filter(User.id == task.intern_id).first()
        from app.models.intern_batch import InternBatch
        batch = db.query(InternBatch).filter(InternBatch.id == task.batch_id).first()

        task_dict = TaskWithDetails(
            **{
                **task.__dict__,
                "mentor_name": mentor.full_name if mentor else "",
                "intern_name": intern.full_name if intern else "",
                "batch_name":  batch.batch_name if batch else "",
            }
        )
        result.append(task_dict)

    return result


@router.post("/", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    db_task = Task(**task_data.model_dump(), mentor_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    if current_user.role == UserRole.INTERN and task.intern_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    elif current_user.role == UserRole.MENTOR and task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
    if task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
    if task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

    db.delete(task)
    db.commit()
    return {"message": "Xóa nhiệm vụ thành công"}


# ─── Task Report endpoints ────────────────────────────────────
@router.post("/{task_id}/reports", response_model=TaskReportResponse)
def submit_report(
    task_id: int,
    report_data: TaskReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    if current_user.role == UserRole.INTERN and task.intern_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền nộp báo cáo")

    # ── KHÔNG chặn nộp khi quá hạn ──
    # Chỉ kiểm tra trạng thái hợp lệ (new hoặc request_change)
    if task.status not in (TaskStatus.NEW, TaskStatus.REQUEST_CHANGE, TaskStatus.OVERDUE):
        raise HTTPException(
            status_code=400,
            detail="Nhiệm vụ không ở trạng thái có thể nộp"
        )

    # Tính thông tin quá hạn
    overdue_info = get_overdue_info(task.deadline)

    # Nếu quá hạn, gắn thông báo vào đầu content để Mentor thấy
    report_dict = report_data.model_dump()
    if overdue_info["is_overdue"]:
        overdue_notice = f"⚠️ [NỘP TRỄ {overdue_info['overdue_label']}]\n\n"
        report_dict["content"] = overdue_notice + report_dict.get("content", "")

    db_report = TaskReport(**report_dict)
    db.add(db_report)

    # Cập nhật trạng thái task sang submitted
    task.status = TaskStatus.SUBMITTED
    db.commit()
    db.refresh(db_report)

    return db_report


@router.get("/{task_id}/reports", response_model=List[TaskReportResponse])
def get_task_reports(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    reports = db.query(TaskReport).filter(TaskReport.task_id == task_id).all()
    return reports


@router.post("/{task_id}/reports/{report_id}/comment")
def add_mentor_comment(
    task_id: int,
    report_id: int,
    comment_data: TaskReportMentorComment,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền nhận xét")

    report = db.query(TaskReport).filter(TaskReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    report.mentor_comment = comment_data.mentor_comment
    report.commented_at = datetime.utcnow()
    db.commit()

    return {"message": "Nhận xét thành công"}


@router.post("/{task_id}/approve")
def approve_task(
    task_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền duyệt")

    task.status = TaskStatus.APPROVED
    db.commit()
    return {"message": "Duyệt nhiệm vụ thành công"}


@router.post("/{task_id}/request-change")
def request_change(
    task_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.mentor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền yêu cầu sửa")

    task.status = TaskStatus.REQUEST_CHANGE
    db.commit()
    return {"message": "Yêu cầu sửa lại thành công"}