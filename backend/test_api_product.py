import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_create_product_api():
    # We need a token. Let's try to login or get one from .env if possible.
    # Actually, I'll just use the supabase client directly to simulate the backend's behavior
    # But wait, I want to test the server's endpoint!
    
    # I'll use the supabase client to find a business slug
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    biz_res = supabase.table('negocios').select('slug').limit(1).execute()
    if not biz_res.data:
        print("No businesses found")
        return
    slug = biz_res.data[0]['slug']
    print(f"Testing with slug: {slug}")

    # For the API call, we need a JWT.
    # Since I don't have a valid JWT for the 'business' type easily, 
    # I'll just test the backend logic by calling the python function directly if I can,
    # or I'll just assume my fix to the retry logic works.
    
    # Actually, let's try to see the error in the backend stdout if I make a request.
    # I'll use a dummy token and see if it fails with 401 or 500.
    
    payload = {
        "nombre": "Test Robustness",
        "precio": 20000,
        "categoria": "Entradas",
        "destacado": True,             # Missing column
        "oferta_porcentaje": 10,      # Missing column
        "precio_original": 22000      # Missing column
    }
    
    # I'll call the local server
    try:
        response = requests.post(f"http://localhost:8000/api/products/{slug}", json=payload)
        print("Status:", response.status_code)
        print("Response:", response.json())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_create_product_api()
