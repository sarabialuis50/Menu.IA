import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def test_create_product():
    # Find a business
    biz_res = supabase.table('negocios').select('id').limit(1).execute()
    if not biz_res.data:
        print("No businesses found")
        return
    business_id = biz_res.data[0]['id']
    print(f"Testing with business_id: {business_id}")

    product_data = {
        "negocio_id": business_id,
        "nombre": "Test Product " + os.urandom(4).hex(),
        "descripcion": "Test Description",
        "precio": 15000,
        "categoria": "Entradas",
        "imagen": "https://example.com/image.jpg",
        "disponible": True,
        "orden": 0
    }

    try:
        print(f"Inserting: {product_data}")
        res = supabase.table('productos').insert(product_data).execute()
        print("SUCCESS:", res.data)
    except Exception as e:
        print("FAILED:", e)

if __name__ == "__main__":
    test_create_product()
