import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table('negocios').select('*').limit(1).execute()
if res.data:
    print(",".join(res.data[0].keys()))
else:
    print("No data")
