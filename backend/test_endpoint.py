import requests
import json

def test_landing_chat():
    url = "http://localhost:8000/api/public/landing-chat"
    payload = {
        "message": "que planes de precios tienes?",
        "history": []
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_landing_chat()
