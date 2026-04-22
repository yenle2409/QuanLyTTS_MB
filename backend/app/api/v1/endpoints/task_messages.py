from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.task import Task
from app.models.task_message import TaskMessage
from app.schemas.task_message import TaskMessageCreate, TaskMessageResponse
from app.core.deps import get_current_active_user

router = APIRouter()


@router.get("/{task_id}/messages", response_model=List[TaskMessageResponse])
def get_task_messages(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tin nhắn của nhiệm vụ"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhiệm vụ")

    # Kiểm tra quyền: chỉ mentor và intern liên quan mới xem được
    if current_user.role == UserRole.INTERN and task.intern_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    elif current_user.role == UserRole.MENTOR and task.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")

    messages = (
        db.query(TaskMessage)
        .filter(TaskMessage.task_id == task_id)
        .order_by(TaskMessage.created_at.asc())
        .all()
    )

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append(TaskMessageResponse(
            id=msg.id,
            task_id=msg.task_id,
            sender_id=msg.sender_id,
            sender_name=sender.full_name if sender else "Unknown",
            sender_role=sender.role.value if sender else "unknown",
            content=msg.content,
            created_at=msg.created_at,
        ))

    return result


@router.post("/{task_id}/messages", response_model=TaskMessageResponse)
def send_task_message(
    task_id: int,
    message_data: TaskMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Gửi tin nhắn trong nhiệm vụ"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhiệm vụ")

    # Kiểm tra quyền
    if current_user.role == UserRole.INTERN and task.intern_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền gửi tin nhắn")
    elif current_user.role == UserRole.MENTOR and task.mentor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền gửi tin nhắn")

    db_message = TaskMessage(
        task_id=task_id,
        sender_id=current_user.id,
        content=message_data.content.strip(),
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    return TaskMessageResponse(
        id=db_message.id,
        task_id=db_message.task_id,
        sender_id=db_message.sender_id,
        sender_name=current_user.full_name,
        sender_role=current_user.role.value,
        content=db_message.content,
        created_at=db_message.created_at,
    )


@router.delete("/{task_id}/messages/{message_id}")
def delete_task_message(
    task_id: int,
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Xóa tin nhắn (chỉ người gửi mới xóa được)"""
    message = db.query(TaskMessage).filter(
        TaskMessage.id == message_id,
        TaskMessage.task_id == task_id
    ).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tin nhắn")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa tin nhắn này")

    db.delete(message)
    db.commit()

    return {"message": "Đã xóa tin nhắn"}