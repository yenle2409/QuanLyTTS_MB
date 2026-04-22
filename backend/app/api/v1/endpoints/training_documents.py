from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, uuid
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.training_document import TrainingDocument
from app.models.intern_batch import InternBatch
from app.schemas.documents_logbook import (
    TrainingDocumentCreate, TrainingDocumentUpdate, TrainingDocumentResponse
)
from app.core.deps import get_current_active_user, get_current_mentor

router = APIRouter()

UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.xls', '.xlsx', '.doc', '.docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def _resp(doc: TrainingDocument, db: Session) -> TrainingDocumentResponse:
    from app.models.user import User as U
    mentor = db.query(U).filter(U.id == doc.mentor_id).first()
    batch = db.query(InternBatch).filter(InternBatch.id == doc.batch_id).first() if doc.batch_id else None
    return TrainingDocumentResponse(
        id=doc.id, mentor_id=doc.mentor_id,
        mentor_name=mentor.full_name if mentor else "",
        batch_id=doc.batch_id,
        batch_name=batch.batch_name if batch else None,
        title=doc.title, description=doc.description,
        doc_type=doc.doc_type, file_url=doc.file_url,
        file_name=doc.file_name, file_size=doc.file_size,
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


@router.get("/", response_model=List[TrainingDocumentResponse])
def list_documents(
    batch_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(TrainingDocument)
    if current_user.role == UserRole.MENTOR:
        query = query.filter(TrainingDocument.mentor_id == current_user.id)
    elif current_user.role == UserRole.INTERN:
        from app.models.intern_profile import InternProfile
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        ibid = profile.batch_id if profile else None
        if ibid:
            query = query.filter(
                (TrainingDocument.batch_id == None) | (TrainingDocument.batch_id == ibid)
            )
        else:
            query = query.filter(TrainingDocument.batch_id == None)
    if batch_id:
        query = query.filter(TrainingDocument.batch_id == batch_id)
    docs = query.order_by(TrainingDocument.created_at.desc()).all()
    return [_resp(d, db) for d in docs]


@router.post("/", response_model=TrainingDocumentResponse)
def create_document_link(
    data: TrainingDocumentCreate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    """Mentor tạo tài liệu dạng link URL"""
    doc = TrainingDocument(**data.model_dump(), mentor_id=current_user.id)
    db.add(doc); db.commit(); db.refresh(doc)
    return _resp(doc, db)


@router.post("/upload", response_model=TrainingDocumentResponse)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    doc_type: str = Form("other"),
    batch_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),  # ← cho phép cả intern upload
    db: Session = Depends(get_db),
):
    """
    Upload file tài liệu.
    - Mentor: upload tài liệu training cho intern
    - Intern: upload file báo cáo nhiệm vụ
    """
    # Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file không hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Đọc file để kiểm tra kích thước
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File quá lớn. Kích thước tối đa là 10MB."
        )

    # Lưu file
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buf:
        buf.write(file_bytes)

    file_size = len(file_bytes)
    file_url = f"/api/v1/documents/files/{unique_name}"

    # mentor_id: nếu intern upload thì dùng id intern luôn (để track)
    doc = TrainingDocument(
        mentor_id=current_user.id,
        batch_id=batch_id,
        title=title,
        description=description,
        doc_type=doc_type,
        file_url=file_url,
        file_name=filename,
        file_size=file_size,
    )
    db.add(doc); db.commit(); db.refresh(doc)
    return _resp(doc, db)


@router.get("/files/{filename}")
def serve_file(filename: str):
    """Serve file để download"""
    # Bảo mật: chỉ cho phép tên file đơn giản, không cho path traversal
    if '/' in filename or '\\' in filename or '..' in filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ")
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File không tồn tại")
    return FileResponse(path)


@router.put("/{doc_id}", response_model=TrainingDocumentResponse)
def update_document(
    doc_id: int, data: TrainingDocumentUpdate,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail="Không tìm thấy")
    if doc.mentor_id != current_user.id: raise HTTPException(status_code=403, detail="Không có quyền")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    db.commit(); db.refresh(doc)
    return _resp(doc, db)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db),
):
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail="Không tìm thấy")
    if doc.mentor_id != current_user.id: raise HTTPException(status_code=403, detail="Không có quyền")
    if doc.file_name and doc.file_url and "/files/" in (doc.file_url or ""):
        fname = doc.file_url.split("/files/")[-1]
        fp = os.path.join(UPLOAD_DIR, fname)
        if os.path.exists(fp): os.remove(fp)
    db.delete(doc); db.commit()
    return {"message": "Đã xóa"}