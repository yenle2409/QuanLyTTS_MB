from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.evaluation import Evaluation
from app.models.intern_profile import InternProfile
from app.schemas.evaluation import (
    EvaluationCreate, EvaluationResponse, EvaluationUpdate,
    EvaluationWithDetails, EvaluationApprove,
)
from app.core.deps import get_current_active_user, get_current_mentor

router = APIRouter()


def _build_detail(evaluation: Evaluation, db: Session) -> EvaluationWithDetails:
    mentor = db.query(User).filter(User.id == evaluation.mentor_id).first()
    intern = db.query(User).filter(User.id == evaluation.intern_id).first()
    approver = db.query(User).filter(User.id == evaluation.approved_by).first() if evaluation.approved_by else None
    return EvaluationWithDetails(
        **{
            **evaluation.__dict__,
            "mentor_name": mentor.full_name if mentor else "",
            "intern_name": intern.full_name if intern else "",
            "approver_name": approver.full_name if approver else None,
        }
    )


@router.get("/", response_model=List[EvaluationWithDetails])
def get_evaluations(
    skip: int = 0,
    limit: int = 100,
    intern_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Evaluation)

    if current_user.role == UserRole.MENTOR:
        query = query.filter(Evaluation.mentor_id == current_user.id)
    elif current_user.role == UserRole.INTERN:
        query = query.filter(Evaluation.intern_id == current_user.id)
    # HR and ADMIN see all

    if intern_id:
        query = query.filter(Evaluation.intern_id == intern_id)

    evaluations = query.offset(skip).limit(limit).all()
    return [_build_detail(e, db) for e in evaluations]


@router.get("/{evaluation_id}", response_model=EvaluationWithDetails)
def get_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    if current_user.role == UserRole.MENTOR and evaluation.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    elif current_user.role == UserRole.INTERN and evaluation.intern_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")

    return _build_detail(evaluation, db)


@router.post("/", response_model=EvaluationResponse)
def create_evaluation(
    evaluation_data: EvaluationCreate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    intern = db.query(User).filter(User.id == evaluation_data.intern_id).first()
    if not intern or intern.role != UserRole.INTERN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thực tập sinh không tồn tại")

    profile = db.query(InternProfile).filter(
        InternProfile.user_id == evaluation_data.intern_id,
        InternProfile.mentor_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không phụ trách thực tập sinh này")

    existing = db.query(Evaluation).filter(
        Evaluation.intern_id == evaluation_data.intern_id,
        Evaluation.mentor_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đánh giá cho thực tập sinh này đã tồn tại")

    db_evaluation = Evaluation(
        **evaluation_data.model_dump(),
        mentor_id=current_user.id,
        approval_status="pending",
    )
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation


@router.put("/{evaluation_id}", response_model=EvaluationResponse)
def update_evaluation(
    evaluation_id: int,
    evaluation_data: EvaluationUpdate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    if evaluation.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa")

    # Block edit if already approved
    if evaluation.approval_status == "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đánh giá đã được HR duyệt, không thể chỉnh sửa"
        )

    update_data = evaluation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(evaluation, field, value)
    # Reset to pending when mentor edits
    evaluation.approval_status = "pending"
    evaluation.approved_by = None
    evaluation.approved_at = None

    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.post("/{evaluation_id}/approve", response_model=EvaluationResponse)
def approve_evaluation(
    evaluation_id: int,
    approve_data: EvaluationApprove,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """HR/Admin duyệt hoặc từ chối đánh giá"""
    if current_user.role not in (UserRole.HR, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ HR hoặc Admin mới có quyền duyệt")

    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    if approve_data.approval_status not in ("approved", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trạng thái không hợp lệ")

    evaluation.approval_status = approve_data.approval_status
    evaluation.hr_note = approve_data.hr_note
    evaluation.approved_by = current_user.id
    evaluation.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.delete("/{evaluation_id}")
def delete_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đánh giá")

    if evaluation.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa")

    if evaluation.approval_status == "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đánh giá đã được HR duyệt, không thể xóa"
        )

    db.delete(evaluation)
    db.commit()
    return {"message": "Xóa đánh giá thành công"}