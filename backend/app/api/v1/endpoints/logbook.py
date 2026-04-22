from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.logbook_entry import LogbookEntry
from app.schemas.documents_logbook import LogbookEntryCreate, LogbookEntryUpdate, LogbookEntryResponse
from app.core.deps import get_current_active_user, get_current_intern

router = APIRouter()


def _resp(e: LogbookEntry, db: Session) -> LogbookEntryResponse:
    from app.models.user import User as U
    intern = db.query(U).filter(U.id == e.intern_id).first()
    return LogbookEntryResponse(
        id=e.id, intern_id=e.intern_id,
        intern_name=intern.full_name if intern else "",
        batch_id=e.batch_id, entry_type=e.entry_type,
        log_date=e.log_date, week_number=e.week_number, week_label=e.week_label,
        title=e.title, content=e.content, learned=e.learned,
        difficulties=e.difficulties, plan_next=e.plan_next,
        created_at=e.created_at, updated_at=e.updated_at,
    )


@router.get("/", response_model=List[LogbookEntryResponse])
def list_logbook(
    intern_id: Optional[int] = None,
    entry_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(LogbookEntry)
    # TTS chỉ xem của mình; Mentor xem TTS phụ trách
    if current_user.role == UserRole.INTERN:
        query = query.filter(LogbookEntry.intern_id == current_user.id)
    elif intern_id:
        query = query.filter(LogbookEntry.intern_id == intern_id)

    if entry_type:
        query = query.filter(LogbookEntry.entry_type == entry_type)

    entries = query.order_by(LogbookEntry.log_date.desc(), LogbookEntry.week_number.desc()).all()
    return [_resp(e, db) for e in entries]


@router.post("/", response_model=LogbookEntryResponse)
def create_logbook(
    data: LogbookEntryCreate,
    current_user: User = Depends(get_current_intern),
    db: Session = Depends(get_db),
):
    entry = LogbookEntry(**data.model_dump(), intern_id=current_user.id)
    db.add(entry); db.commit(); db.refresh(entry)
    return _resp(entry, db)


@router.put("/{entry_id}", response_model=LogbookEntryResponse)
def update_logbook(
    entry_id: int, data: LogbookEntryUpdate,
    current_user: User = Depends(get_current_intern),
    db: Session = Depends(get_db),
):
    entry = db.query(LogbookEntry).filter(LogbookEntry.id == entry_id).first()
    if not entry: raise HTTPException(status_code=404, detail="Không tìm thấy")
    if entry.intern_id != current_user.id: raise HTTPException(status_code=403, detail="Không có quyền")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
    db.commit(); db.refresh(entry)
    return _resp(entry, db)


@router.delete("/{entry_id}")
def delete_logbook(
    entry_id: int,
    current_user: User = Depends(get_current_intern),
    db: Session = Depends(get_db),
):
    entry = db.query(LogbookEntry).filter(LogbookEntry.id == entry_id).first()
    if not entry: raise HTTPException(status_code=404, detail="Không tìm thấy")
    if entry.intern_id != current_user.id: raise HTTPException(status_code=403, detail="Không có quyền")
    db.delete(entry); db.commit()
    return {"message": "Đã xóa"}