from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, desc, asc, case, and_, delete
import uuid
import models, schemas
from datetime import datetime, timedelta, timezone

async def get_user_by_auth_id(db: AsyncSession, auth_id: uuid.UUID):
    result = await db.execute(select(models.User).filter(models.User.auth_id == auth_id))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    db_user = models.User(
        auth_id=user.auth_id,
        email=user.email,
        name=user.name,
        flat_number=user.flat_number,
        phone=user.phone,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_complaints(db: AsyncSession, user: models.User):
    from sqlalchemy.orm import joinedload
    query = (select(models.Complaint)
             .options(
                 joinedload(models.Complaint.resident),
                 joinedload(models.Complaint.history).joinedload(models.ComplaintHistory.actor)
             ))
    
    if user.role == models.RoleEnum.RESIDENT:
        query = query.filter(models.Complaint.resident_id == user.id)
        
    config_result = await db.execute(select(models.SocietyConfig).limit(1))
    config = config_result.scalars().first()
    threshold = config.overdue_threshold_days if config else 3
    
    now = datetime.now(timezone.utc)
    
    query = query.order_by(
        case((and_(models.Complaint.status != models.StatusEnum.RESOLVED, 
                   models.Complaint.due_date < now), 1), else_=2),
        case((models.Complaint.priority == models.PriorityEnum.HIGH, 1), 
             (models.Complaint.priority == models.PriorityEnum.MEDIUM, 2), else_=3),
        desc(models.Complaint.created_at)
    )
    
    result = await db.execute(query)
    return result.scalars().unique().all()

async def create_complaint(db: AsyncSession, complaint: schemas.ComplaintCreate, resident_id: uuid.UUID):
    import random
    ticket_number = f"#T-{random.randint(1000, 9999)}"
    
    # Calculate default SLA
    priority = complaint.priority if complaint.priority else models.PriorityEnum.LOW
    days = 1 if priority == models.PriorityEnum.HIGH else 2 if priority == models.PriorityEnum.MEDIUM else 3
    due_date = datetime.now(timezone.utc) + timedelta(days=days)
    
    db_complaint = models.Complaint(
        **complaint.model_dump(),
        resident_id=resident_id,
        ticket_number=ticket_number,
        due_date=due_date
    )
    db.add(db_complaint)
    await db.flush()
    complaint_id = db_complaint.id
    await db.commit()
    return await get_complaint(db, complaint_id)

async def assign_technician(db: AsyncSession, complaint_id: uuid.UUID, tech_name: str, tech_role: str, admin_id: uuid.UUID):
    complaint = await get_complaint(db, complaint_id)
    if not complaint:
        return None
    complaint.assigned_tech_name = tech_name
    complaint.assigned_tech_role = tech_role
    
    # Track assignment in history
    history = models.ComplaintHistory(
        complaint_id=complaint_id,
        actor_id=admin_id,
        old_status=complaint.status,
        new_status=complaint.status,
        note=f"Assigned to {tech_name} ({tech_role})"
    )
    db.add(history)
    
    await db.commit()
    return await get_complaint(db, complaint_id)

async def get_complaint(db: AsyncSession, complaint_id: uuid.UUID):
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(models.Complaint)
        .options(
            joinedload(models.Complaint.resident),
            joinedload(models.Complaint.history).joinedload(models.ComplaintHistory.actor)
        )
        .filter(models.Complaint.id == complaint_id)
        .execution_options(populate_existing=True)
    )
    return result.scalars().unique().first()

async def get_all_resident_emails(db: AsyncSession):
    result = await db.execute(
        select(models.User.email).filter(models.User.role == models.RoleEnum.RESIDENT)
    )
    return result.scalars().all()

async def update_complaint_status(db: AsyncSession, complaint_id: uuid.UUID, new_status: models.StatusEnum, actor_id: uuid.UUID, note: str = None):
    # Using the session implicitly starts a transaction
    complaint = await get_complaint(db, complaint_id)
    if not complaint:
        return None
        
    old_status = complaint.status
    complaint.status = new_status
    if new_status == models.StatusEnum.RESOLVED:
        complaint.resolved_at = datetime.now(timezone.utc)
        
    history = models.ComplaintHistory(
        complaint_id=complaint_id,
        actor_id=actor_id,
        old_status=old_status,
        new_status=new_status,
        note=note
    )
    db.add(history)
    
    await db.commit()
    return await get_complaint(db, complaint_id)

async def update_complaint_priority(db: AsyncSession, complaint_id: uuid.UUID, new_priority: models.PriorityEnum, actor_id: uuid.UUID):
    complaint = await get_complaint(db, complaint_id)
    if not complaint:
        return None
        
    old_priority = complaint.priority
    complaint.priority = new_priority
    
    # Optionally recalculate due_date based on new priority if it was recently created or we want strict rules
    days = 1 if new_priority == models.PriorityEnum.HIGH else 2 if new_priority == models.PriorityEnum.MEDIUM else 3
    complaint.due_date = complaint.created_at + timedelta(days=days) if complaint.created_at else datetime.now(timezone.utc) + timedelta(days=days)
        
    history = models.ComplaintHistory(
        complaint_id=complaint_id,
        actor_id=actor_id,
        old_status=complaint.status,
        new_status=complaint.status,
        old_priority=old_priority,
        new_priority=new_priority,
        note=f"Priority changed to {new_priority.value}"
    )
    db.add(history)
    
    await db.commit()
    return await get_complaint(db, complaint_id)

async def update_complaint_due_date(db: AsyncSession, complaint_id: uuid.UUID, due_date: datetime, actor_id: uuid.UUID):
    complaint = await get_complaint(db, complaint_id)
    if not complaint:
        return None
        
    complaint.due_date = due_date
        
    history = models.ComplaintHistory(
        complaint_id=complaint_id,
        actor_id=actor_id,
        old_status=complaint.status,
        new_status=complaint.status,
        note=f"SLA Due Date updated manually"
    )
    db.add(history)
    
    await db.commit()
    return await get_complaint(db, complaint_id)

async def delete_complaint(db: AsyncSession, complaint_id: uuid.UUID):
    complaint = await db.get(models.Complaint, complaint_id)
    if complaint:
        # Delete history first to avoid FK constraint issues if CASCADE is missing
        await db.execute(delete(models.ComplaintHistory).where(models.ComplaintHistory.complaint_id == complaint_id))
        await db.delete(complaint)
        await db.commit()
        return True
    return False

async def get_notices(db: AsyncSession):
    query = select(models.Notice).order_by(
        desc(models.Notice.is_important),
        desc(models.Notice.created_at)
    )
    result = await db.execute(query)
    return result.scalars().all()

async def create_notice(db: AsyncSession, notice: schemas.NoticeCreate, author_id: uuid.UUID):
    db_notice = models.Notice(**notice.model_dump(), author_id=author_id)
    db.add(db_notice)
    await db.commit()
    await db.refresh(db_notice)
    return db_notice

async def delete_notice(db: AsyncSession, notice_id: uuid.UUID):
    notice = await db.get(models.Notice, notice_id)
    if notice:
        await db.delete(notice)
        await db.commit()
        return True
    return False

async def get_all_residents(db: AsyncSession):
    result = await db.execute(select(models.User).filter(models.User.role == models.RoleEnum.RESIDENT))
    return result.scalars().all()
