from sqlalchemy import Column, Integer, String, Enum, DateTime, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HR = "hr"
    MENTOR = "mentor"
    INTERN = "intern"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    LOCKED = "locked"


class Department(str, enum.Enum):
    KHDN = "KHDN"
    KHCN = "KHCN"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    department = Column(Enum(Department), nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    intern_profile = relationship(
        "InternProfile",
        foreign_keys="InternProfile.user_id",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    created_tasks = relationship("Task", foreign_keys="Task.mentor_id", back_populates="mentor")
    assigned_tasks = relationship("Task", foreign_keys="Task.intern_id", back_populates="intern")
    mentored_interns = relationship(
        "InternProfile",
        foreign_keys="InternProfile.mentor_id",
        back_populates="mentor",
        passive_deletes=True
    )
    evaluations_given = relationship(
        "Evaluation",
        foreign_keys="Evaluation.mentor_id",
        back_populates="mentor",
        passive_deletes=True
    )
    evaluations_received = relationship(
        "Evaluation",
        foreign_keys="Evaluation.intern_id",
        back_populates="intern",
        passive_deletes=True
    )