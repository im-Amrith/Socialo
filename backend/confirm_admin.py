import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def confirm_user():
    email = "admin@unthinkable.com"
    # Find user
    users = supabase.auth.admin.list_users()
    admin_user = None
    for u in users:
        if u.email == email:
            admin_user = u
            break
            
    if admin_user:
        print(f"Found admin user with ID: {admin_user.id}")
        supabase.auth.admin.update_user_by_id(admin_user.id, {"email_confirm": True})
        print("Successfully confirmed email!")
    else:
        print("Admin user not found.")

if __name__ == "__main__":
    confirm_user()
