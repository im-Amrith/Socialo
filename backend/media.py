import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Use a mock client if credentials are placeholders, to prevent startup crashes
if SUPABASE_URL and not SUPABASE_URL.startswith("your_"):
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None

BUCKET_NAME = "complaint-photos"

def generate_signed_upload_url(file_extension: str):
    if not supabase:
        # Return a dummy url for testing without real credentials
        return {
            "signed_url": "http://localhost:8000/dummy-upload-url",
            "path": f"dummy_{uuid.uuid4()}{file_extension}"
        }
        
    file_name = f"{uuid.uuid4()}{file_extension}"
    
    # Create signed upload URL
    res = supabase.storage.from_(BUCKET_NAME).create_signed_upload_url(file_name)
    
    if hasattr(res, 'error') and res.error:
        raise Exception(res.error)
        
    return res
