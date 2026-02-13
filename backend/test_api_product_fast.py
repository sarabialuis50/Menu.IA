import requests

def test_create_product_api():
    slug = "don-jediondo"
    payload = {
        "nombre": "Test Robustness",
        "precio": 20000,
        "categoria": "Entradas",
        "destacado": True,
        "oferta_porcentaje": 10,
        "precio_original": 22000
    }
    
    try:
        response = requests.post(f"http://localhost:8000/api/products/{slug}", json=payload)
        print("Status:", response.status_code)
        print("Response:", response.json())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_create_product_api()
