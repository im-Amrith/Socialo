import os
import uuid
from typing import List
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
from pydantic import BaseModel

import models, schemas, crud, media, email_utils
from database import get_db, engine

load_dotenv()

app = FastAPI(title="Society Maintenance Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: AsyncSession = Depends(get_db)
):
    import jwt 
    try:
        payload = jwt.decode(credentials.credentials, options={"verify_signature": False})
        auth_id_str = payload.get("sub")
        if not auth_id_str:
            raise HTTPException(status_code=401, detail="Invalid auth token")
        auth_id = uuid.UUID(auth_id_str)
        user = await crud.get_user_by_auth_id(db, auth_id)
        if not user:
            email = payload.get("email", "unknown@example.com")
            # For google auth, full_name is often in user_metadata
            name = payload.get("user_metadata", {}).get("full_name") or email.split("@")[0]
            new_user = schemas.UserCreate(
                auth_id=auth_id,
                email=email,
                name=name
            )
            user = await crud.create_user(db, new_user)
        return user
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")

async def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

from sqlalchemy import text
@app.on_event("startup")
async def startup_event():
    from database import engine
    import models
    import sqlalchemy
    if engine:
        async with engine.begin() as conn:
            await conn.execute(sqlalchemy.text('CREATE EXTENSION IF NOT EXISTS vector'))
            await conn.execute(sqlalchemy.text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            await conn.run_sync(models.Base.metadata.create_all)

@app.get("/")
def read_root():
    return {"message": "Society Maintenance Tracker API is running"}

@app.post("/api/auth/register", response_model=schemas.UserResponse)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await crud.get_user_by_auth_id(db, user.auth_id)
    if db_user:
        raise HTTPException(status_code=400, detail="User already registered")
    return await crud.create_user(db, user)

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/complaints", response_model=List[schemas.ComplaintResponse])
async def list_complaints(
    current_user: models.User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    return await crud.get_complaints(db, current_user)

@app.post("/api/complaints", response_model=schemas.ComplaintResponse)
async def create_complaint(
    complaint: schemas.ComplaintCreate, 
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await crud.create_complaint(db, complaint, current_user.id)

@app.get("/api/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
async def get_complaint(
    complaint_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != models.RoleEnum.ADMIN and complaint.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")
    return complaint

@app.patch("/api/complaints/{complaint_id}/status", response_model=schemas.ComplaintResponse)
async def update_complaint_status(
    complaint_id: uuid.UUID,
    new_status: models.StatusEnum,
    background_tasks: BackgroundTasks,
    note: str = None,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.update_complaint_status(db, complaint_id, new_status, current_admin.id, note)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Get user to send email
    # complaint.resident should be loaded by get_complaint
    if complaint.resident:
        background_tasks.add_task(
            email_utils.send_status_update_email, 
            complaint.resident.email, 
            complaint.title, 
            new_status.value, 
            note
        )
    return complaint

@app.patch("/api/complaints/{complaint_id}/priority", response_model=schemas.ComplaintResponse)
async def update_complaint_priority(
    complaint_id: uuid.UUID,
    new_priority: models.PriorityEnum,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.update_complaint_priority(db, complaint_id, new_priority, current_admin.id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@app.patch("/api/complaints/{complaint_id}/due_date", response_model=schemas.ComplaintResponse)
async def update_complaint_due_date(
    complaint_id: uuid.UUID,
    due_date: datetime,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.update_complaint_due_date(db, complaint_id, due_date, current_admin.id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

class AssignRequest(BaseModel):
    tech_name: str
    tech_role: str

@app.put("/api/complaints/{complaint_id}/assign", response_model=schemas.ComplaintResponse)
async def assign_complaint(
    complaint_id: uuid.UUID,
    req: AssignRequest,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.assign_technician(db, complaint_id, req.tech_name, req.tech_role, current_admin.id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@app.delete("/api/complaints/{complaint_id}")
async def delete_complaint(
    complaint_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    complaint = await crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Only admin or the resident who created it can delete
    if current_user.role != models.RoleEnum.ADMIN and complaint.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this complaint")
        
    deleted = await crud.delete_complaint(db, complaint_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete complaint")
    return {"message": "Complaint deleted successfully"}

@app.get("/api/notices", response_model=List[schemas.NoticeResponse])
async def list_notices(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await crud.get_notices(db)

@app.post("/api/notices", response_model=schemas.NoticeResponse)
async def create_notice(
    notice: schemas.NoticeCreate,
    background_tasks: BackgroundTasks,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    db_notice = await crud.create_notice(db, notice, current_admin.id)
    # The requirement specifies ALL residents get an email whenever a notice is posted
    all_emails = await crud.get_all_resident_emails(db)
    if all_emails:
        background_tasks.add_task(
            email_utils.send_notice_email, 
            all_emails, 
            notice.title, 
            notice.content, 
            notice.category, 
            notice.is_important
        )
    return db_notice

@app.delete("/api/notices/{notice_id}")
async def delete_notice(
    notice_id: uuid.UUID,
    current_admin: models.User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    deleted = await crud.delete_notice(db, notice_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete notice")
    return {"message": "Notice deleted successfully"}

@app.post("/api/upload/sign")
async def sign_upload(
    file_extension: str, 
    current_user: models.User = Depends(get_current_user)
):
    try:
        if not file_extension.startswith("."):
            file_extension = f".{file_extension}"
        result = media.generate_signed_upload_url(file_extension)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AI Endpoints ---

from pydantic import BaseModel

class TriageRequest(BaseModel):
    title: str
    description: str

@app.post("/api/ai/triage")
async def ai_triage(
    req: TriageRequest,
    current_user: models.User = Depends(get_current_user)
):
    from ai_utils import triage_complaint
    return triage_complaint(req.title, req.description)

class VerifyRequest(BaseModel):
    image_url: str
    description: str

@app.post("/api/ai/verify")
async def ai_verify(
    req: VerifyRequest,
    current_admin: models.User = Depends(get_current_admin)
):
    from ai_utils import verify_image_relevance
    return verify_image_relevance(req.image_url, req.description)
