import os
import json
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path
from models import Business, BusinessPublic

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

slug = "don-jediondo"
print(f"Testing instantiation for {slug}...")

res = supabase.table('negocios').select('*').eq('slug', slug).execute()
if not res.data:
    print("No data found")
else:
    doc = res.data[0]
    print(f"DB Doc Keys: {list(doc.keys())}")
    
    try:
        print("\nTrying to instantiate Business...")
        b = Business(**doc)
        print("Success! Business ID:", b.id)
        
        print("\nTrying to instantiate BusinessPublic from dump...")
        bp = BusinessPublic(**b.model_dump())
        print("Success! Public Name:", bp.nombre)
        
        print("\nTrying to instantiate BusinessPublic directly from doc...")
        bp2 = BusinessPublic(**doc)
        print("Success! Public Direct ID:", bp2.id)
    except Exception as e:
        print("\nFAILED!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        if hasattr(e, 'errors'):
            print("Validation errors:", json.dumps(e.errors(), indent=2))
