import os
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
import uuid

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    negocio_id: str
    numero: int
    capacidad: int = 4
    ubicacion: Optional[str] = None
    estado: str = "libre"
    created_at: datetime = Field(default_factory=datetime.utcnow)

def test_create_table():
    print("\n--- Testing Table Creation ---")
    try:
        # Get a business
        res = supabase.table('negocios').select('id').limit(1).execute()
        if not res.data:
            print("No business found.")
            return
        
        business_id = res.data[0]['id']
        
        # Test creating a table with ubicacion
        table = Table(
            negocio_id=business_id,
            numero=9999,
            capacidad=4,
            ubicacion="Terraza Test"
        )
        
        # Convert datetime manually if needed, but pydantic json encoder handles it usually if using .model_dump(mode='json')
        # Here we use model_dump and custom serializer
        data = table.model_dump(mode='json')
        
        print(f"Imserting table: {data}")
        # Insert
        res = supabase.table('mesas').insert(data).execute()
        
        if res.data:
            print(f"Table created successfully! ID: {res.data[0]['id']}")
            # Cleanup
            supabase.table('mesas').delete().eq('id', res.data[0]['id']).execute()
            print("Cleanup successful.")
        else:
            print("Table not created (no data returned).")
            
    except Exception as e:
        print(f"Error creating table: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create_table()
