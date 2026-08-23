import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from database import SessionLocal
from sqlalchemy.future import select
from sqlalchemy import text
import models

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def setup():
    email = "admin@unthinkable.com"
    password = "u"
    name = "System Admin"
    
    print(f"Creating admin user in Supabase auth: {email}")
    
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        user_id = None
        if response.user:
            user_id = response.user.id
            print(f"User created in auth with ID: {user_id}")
        else:
            print("User might already exist. Trying to log in...")
            login_resp = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            if login_resp.user:
                user_id = login_resp.user.id
                print(f"Logged in. User ID: {user_id}")
            else:
                print("Failed to log in.")
                return
                
        async with SessionLocal() as db:
            print("Running schema migrations...")
            await db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ticket_number VARCHAR UNIQUE;"))
            await db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS flat_number VARCHAR;"))
            await db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_tech_name VARCHAR;"))
            await db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_tech_role VARCHAR;"))
            
            result = await db.execute(select(models.User).filter(models.User.email == email))
            db_user = result.scalars().first()
            
            if db_user:
                print("User exists in DB. Upgrading role to ADMIN.")
                db_user.role = models.RoleEnum.ADMIN
                db_user.name = name
            else:
                print("User does not exist in DB. Creating with ADMIN role.")
                db_user = models.User(
                    auth_id=user_id,
                    email=email,
                    name=name,
                    role=models.RoleEnum.ADMIN
                )
                db.add(db_user)
                
            await db.commit()
            print("Successfully finished setup.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(setup())
