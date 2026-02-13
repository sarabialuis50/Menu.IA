import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key exists: {bool(key)}")

try:
    supabase = create_client(url, key)
    response = supabase.table('negocios').select('*').limit(1).execute()
    print("Success connecting to Supabase!")
    print(f"Data: {response.data}")
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
