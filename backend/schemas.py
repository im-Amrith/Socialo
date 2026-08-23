from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models import RoleEnum, PriorityEnum, StatusEnum, CategoryEnum

class UserBase(BaseModel):
    email: str
    name: str
    flat_number: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    auth_id: UUID
    role: RoleEnum = RoleEnum.RESIDENT

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    role: RoleEnum
    created_at: datetime

class ComplaintBase(BaseModel):
    title: str
    description: str
    category: CategoryEnum
    priority: PriorityEnum = PriorityEnum.MEDIUM
    flat_number: Optional[str] = None
    photo_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    complaint_id: UUID
    actor_id: UUID
    old_status: Optional[StatusEnum] = None
    new_status: StatusEnum
    note: Optional[str] = None
    timestamp: datetime
    actor: Optional[UserResponse] = None

class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    ticket_number: Optional[str] = None
    status: StatusEnum
    cv_verified: Optional[bool] = None
    cv_confidence: Optional[float] = None
    ai_suggested_category: Optional[CategoryEnum] = None
    ai_suggested_priority: Optional[PriorityEnum] = None
    assigned_tech_name: Optional[str] = None
    assigned_tech_role: Optional[str] = None
    resident_id: UUID
    resident: Optional[UserResponse] = None
    history: List[ComplaintHistoryResponse] = []
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

class NoticeBase(BaseModel):
    title: str
    content: str
    category: str = "General"
    is_important: bool = False

class NoticeCreate(NoticeBase):
    pass

class NoticeResponse(NoticeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    author_id: UUID
    created_at: datetime
    updated_at: datetime
