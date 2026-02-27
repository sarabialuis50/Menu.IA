import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

tables = ['agent_conversations', 'agent_messages', 'clientes', 'negocios']

for table in tables:
    print(f"\n--- Checking table: {table} ---")
    try:
        res = supabase.table(table).select('*').limit(1).execute()
        print(f"Success! Found {len(res.data)} rows (sampled).")
        if res.data:
            print(f"Columns: {list(res.data[0].keys())}")
    except Exception as e:
        print(f"Error: {e}")
