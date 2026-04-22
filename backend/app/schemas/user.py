from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from app.models.user import UserRole, UserStatus, Department, Gender


class UserBase(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None
    department: Optional[Department] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None


class UserCreate(UserBase):
    password: str
    batch_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[Department] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    status: Optional[UserStatus] = None


class UserChangePassword(BaseModel):
    old_password: str
    new_password: str


class UserResetPassword(BaseModel):
    new_password: str


class UserResponse(UserBase):
    id: int
    avatar: Optional[str]
    status: UserStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None