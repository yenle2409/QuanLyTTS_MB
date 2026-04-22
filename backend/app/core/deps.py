from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.base import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.intern_profile import InternProfile, InternStatus  # ← thêm dòng này
from typing import Optional, List

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    if user.status == UserStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa"
        )

    if user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(
            InternProfile.user_id == user.id
        ).first()
        if profile and profile.intern_status == InternStatus.QUIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa"
            )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user


def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền truy cập"
            )
        return current_user
    return role_checker


def get_current_admin(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> User:
    return current_user


def get_current_hr(
    current_user: User = Depends(require_role([UserRole.HR, UserRole.ADMIN]))
) -> User:
    return current_user


def get_current_mentor(
    current_user: User = Depends(require_role([UserRole.MENTOR, UserRole.ADMIN]))
) -> User:
    return current_user


def get_current_intern(
    current_user: User = Depends(require_role([UserRole.INTERN]))
) -> User:
    return current_user

def get_current_active_intern(
    current_user: User = Depends(get_current_intern),
    db: Session = Depends(get_db)
) -> User:
    profile = db.query(InternProfile).filter(
        InternProfile.user_id == current_user.id
    ).first()
    if profile and profile.intern_status.value == "completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã hoàn thành thực tập, không thể thực hiện thao tác này"
        )
    return current_user