import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
address = "Carrera 57 # 72-107, Barranquilla" # Let's assume city if not given

def test_geocode(addr):
    geo_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={addr}&key={api_key}"
    print(f"Testing geocode for: {addr}")
    res = requests.get(geo_url).json()
    if res.get('results'):
        loc = res['results'][0]['geometry']['location']
        formatted = res['results'][0]['formatted_address']
        print(f"SUCCESS: {formatted} -> {loc}")
    else:
        print(f"FAILED: {res.get('status')}")
        print(json.dumps(res, indent=2))

test_geocode("Carrera 57 # 72-107")
test_geocode("Carrera 57 # 72-107, Barranquilla")
test_geocode("Medellín, Colombia")
