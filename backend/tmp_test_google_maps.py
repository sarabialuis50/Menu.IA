import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
print(f"API KEY: {api_key[:10]}..." if api_key else "API KEY NOT FOUND")
address = "Carrera 57 # 72-107, Barranquilla"

def test_geocode(addr):
    geo_url = "https://maps.googleapis.com/maps/api/geocode/json"
    print(f"Testing geocode for: {addr}")
    res = requests.get(geo_url, params={"address": addr, "key": api_key}).json()
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
