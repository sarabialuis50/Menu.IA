from supabase import create_client
import os
import uuid
import datetime
import json

SUPABASE_URL = "https://kgzbixgmunmbgzlegobb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnemJpeGdtdW5tYmd6bGVnb2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTAxMiwiZXhwIjoyMDg2MjQ1MDEyfQ.zweOUsel0LQ3ayoeH8DFgMFQBL1pAq0gGBjVk5IWoJA"
# Key is SERVICE_ROLE_KEY from .env

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_insert():
    try:
        # 1. Get business ID
        slug = "don-jediondo"
        response = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if not response.data:
            print("Negocio not found")
            return
        
        business_id = response.data[0]['id']
        print(f"Business ID: {business_id}")
        
        # 2. Try to insert order
        order_dict = {
            "id": str(uuid.uuid4()),
            "negocio_id": business_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "estado": "pendiente",
            "total": 35000,
            "mesa_numero": 10,
            "cliente_nombre": "Test Insert",
            "tipo": "mesa",
            "items": [
                {"producto_id": "p1", "nombre": "Bandeja Paisa", "cantidad": 1, "precio_unitario": 35000}
            ]
        }
        
        print(f"Attempting to insert: {json.dumps(order_dict, indent=2)}")
        
        res = supabase.table('pedidos').insert(order_dict).execute()
        print("Success:", res.data)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_insert()
