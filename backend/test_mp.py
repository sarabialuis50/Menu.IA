import os
import mercadopago
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

token = os.environ.get("MERCADOPAGO_ACCESS_TOKEN")
print(f"Token: {token[:15]}...")

sdk = mercadopago.SDK(token)

preference_data = {
    "items": [
        {
            "title": "Test Pack",
            "quantity": 1,
            "unit_price": 1000,
            "currency_id": "COP"
        }
    ],
    "back_urls": {
        "success": "http://localhost:3000/success",
        "failure": "http://localhost:3000/failure",
        "pending": "http://localhost:3000/pending"
    },
    "auto_return": "approved"
}

try:
    print("Creating preference...")
    preference_response = sdk.preference().create(preference_data)
    status = preference_response.get('status')
    response = preference_response.get('response')
    print(f"Status: {status}")
    if response:
        print(f"Has init_point: {'init_point' in response}")
        if 'init_point' in response:
            print(f"Init Point: {response['init_point']}")
        else:
            print(f"Full Response: {response}")
    else:
        print("No response data")
except Exception as e:
    print(f"Error: {e}")
