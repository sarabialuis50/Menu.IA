import os
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# Define models locally to test
class BusinessBase(BaseModel):
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    slogan: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    horarios: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None

class Business(BusinessBase):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str
    email: str
    created_at: datetime
    plan: str = "free"
    is_active: bool = True 

class BusinessPublic(BusinessBase):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str

def test_fetch_business():
    print("\n--- Testing Business Fetch ---")
    try:
        # Get first business
        res = supabase.table('negocios').select('*').limit(1).execute()
        if not res.data:
            print("No business found.")
            return

        doc = res.data[0]
        print(f"Fetched doc keys: {doc.keys()}")
        
        # Try to parse
        try:
            b = Business(**doc)
            print("Business model parsed successfully.")
            print(b.model_dump())
            
            bp = BusinessPublic(**b.model_dump())
            print("BusinessPublic model parsed successfully.")
        except Exception as e:
            print(f"Validation Error: {e}")
            
    except Exception as e:
        print(f"Supabase Error: {e}")

if __name__ == "__main__":
    test_fetch_business()
