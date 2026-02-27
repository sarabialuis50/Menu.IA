import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# Get current data for Don Jediondo
res = supabase.table('negocios').select('*').eq('nombre', 'Don Jediondo').execute()
if res.data:
    biz = res.data[0]
    print(f"Updating {biz['nombre']} (id: {biz['id']})")
    # Using some generic coordinates in Barranquilla
    new_data = {
        "lat": 11.006, 
        "lng": -74.808,
        "direccion": "Carrera 57 # 72-107, Barranquilla, Colombia"
    }
    update_res = supabase.table('negocios').update(new_data).eq('id', biz['id']).execute()
    print("SUCCESS: Business updated with coordinates.")
else:
    print("Business 'Don Jediondo' not found.")
