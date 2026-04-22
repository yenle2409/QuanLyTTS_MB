from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User
from app.models.intern_batch import InternBatch, BatchStatus
from app.models.intern_profile import InternProfile
from app.schemas.intern_batch import InternBatchCreate, InternBatchResponse, InternBatchUpdate
from app.core.deps import get_current_hr, get_current_mentor

router = APIRouter()


@router.get("/", response_model=List[InternBatchResponse])
def get_batches(
    skip: int = 0,
    limit: int = 100,
    status_filter: BatchStatus = None,
    db: Session = Depends(get_db)
):
    # Tự động đóng đợt hết hạn + chuyển TTS sang completed
    expired_batches = (
        db.query(InternBatch)
        .filter(
            InternBatch.status == BatchStatus.OPEN,
            InternBatch.end_date < date.today()
        )
        .all()
    )
    for batch in expired_batches:
        batch.status = BatchStatus.CLOSED
        db.query(InternProfile).filter(
            InternProfile.batch_id == batch.id,
            InternProfile.intern_status == 'active'
        ).update({"intern_status": "completed"})

    if expired_batches:
        db.commit()

    query = db.query(InternBatch)
    if status_filter:
        query = query.filter(InternBatch.status == status_filter)
    batches = query.offset(skip).limit(limit).all()
    return batches


# ⚠️ Route này phải đặt TRƯỚC /{batch_id} để tránh bị match nhầm
@router.get("/mentor/my-batches", response_model=List[InternBatchResponse])
def get_mentor_batches(
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
):
    """Chỉ trả về các đợt có TTS được assign cho mentor hiện tại"""
    batch_ids = (
        db.query(InternProfile.batch_id)
        .filter(InternProfile.mentor_id == current_user.id)
        .distinct()
        .all()
    )

    batch_id_list = [b[0] for b in batch_ids]

    if not batch_id_list:
        return []

    batches = (
        db.query(InternBatch)
        .filter(InternBatch.id.in_(batch_id_list))
        .all()
    )

    return batches


@router.post("/", response_model=InternBatchResponse)
def create_batch(
    batch_data: InternBatchCreate,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    if db.query(InternBatch).filter(InternBatch.batch_name == batch_data.batch_name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đợt thực tập đã tồn tại"
        )

    db_batch = InternBatch(**batch_data.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


@router.get("/{batch_id}", response_model=InternBatchResponse)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    batch = db.query(InternBatch).filter(InternBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt thực tập"
        )
    return batch


@router.put("/{batch_id}", response_model=InternBatchResponse)
def update_batch(
    batch_id: int,
    batch_data: InternBatchUpdate,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    batch = db.query(InternBatch).filter(InternBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt thực tập"
        )

    update_data = batch_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)

    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}")
def delete_batch(
    batch_id: int,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    batch = db.query(InternBatch).filter(InternBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt thực tập"
        )

    # Chỉ cho xóa khi đợt đã đóng
    if batch.status != BatchStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể xóa đợt thực tập đã đóng"
        )

    # Chỉ cho xóa khi không còn TTS nào
    intern_count = db.query(InternProfile).filter(InternProfile.batch_id == batch_id).count()
    if intern_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa: đợt này còn {intern_count} thực tập sinh"
        )

    db.delete(batch)
    db.commit()
    return {"message": "Xóa đợt thực tập thành công"}