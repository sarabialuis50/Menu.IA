import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

print("\n--- Listing All Tables ---")
try:
    # Use RPC to get table names if available, or just query common ones
    # A trick to get table names in Supabase without management API is:
    res = supabase.rpc('get_tables').execute()
    print(res.data)
except Exception:
    print("RPC get_tables failed. Trying alternative...")
    try:
        # Common tables
        common_tables = ['negocios', 'pedidos', 'clientes', 'empleados', 'mesas', 'menu_items', 'categories', 'agent_conversations', 'agent_messages', 'conversations', 'messages']
        for t in common_tables:
            try:
                 supabase.table(t).select('count', count='exact').limit(0).execute()
                 print(f"Table exists: {t}")
            except:
                 pass
    except Exception as e:
        print(f"Error: {e}")
