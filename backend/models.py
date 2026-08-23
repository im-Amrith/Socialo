from sqlalchemy import Column, String, Enum, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from database import Base

class RoleEnum(enum.Enum):
    RESIDENT = "RESIDENT"
    ADMIN = "ADMIN"

class PriorityEnum(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class StatusEnum(enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class CategoryEnum(enum.Enum):
    PLUMBING = "PLUMBING"
    ELECTRICAL = "ELECTRICAL"
    ELEVATOR = "ELEVATOR"
    SECURITY = "SECURITY"
    CLEANING = "CLEANING"
    GARDENING = "GARDENING"
    OTHER = "OTHER"

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    flat_number = Column(String)
    phone = Column(String)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.RESIDENT)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    complaints = relationship("Complaint", back_populates="resident")

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(Enum(CategoryEnum), nullable=False)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.OPEN)
    priority = Column(Enum(PriorityEnum), nullable=False, default=PriorityEnum.MEDIUM)
    due_date = Column(DateTime(timezone=True))
    flat_number = Column(String)
    photo_url = Column(String)
    cv_verified = Column(Boolean, default=False)
    cv_confidence = Column(Numeric(4, 3))
    ai_suggested_category = Column(Enum(CategoryEnum))
    ai_suggested_priority = Column(Enum(PriorityEnum))
    assigned_tech_name = Column(String)
    assigned_tech_role = Column(String)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True))

    resident = relationship("User", back_populates="complaints")
    history = relationship("ComplaintHistory", back_populates="complaint")

class ComplaintHistory(Base):
    __tablename__ = "complaint_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    old_status = Column(Enum(StatusEnum))
    new_status = Column(Enum(StatusEnum), nullable=False)
    old_priority = Column(Enum(PriorityEnum))
    new_priority = Column(Enum(PriorityEnum))
    note = Column(String)
    timestamp = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="history")
    actor = relationship("User")

class Notice(Base):
    __tablename__ = "notices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    category = Column(String, nullable=False, default="General")
    is_important = Column(Boolean, nullable=False, default=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    
    author = relationship("User")

class SocietyConfig(Base):
    __tablename__ = "society_config"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    overdue_threshold_days = Column(Numeric, nullable=False, default=3)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
