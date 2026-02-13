from fastapi.testclient import TestClient
from server import app
import json

client = TestClient(app)

print("\nTesting /api/auth/login (401 expected)...")
try:
    response = client.post("/api/auth/login", json={"email": "wrong@test.com", "password": "wrong"})
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")
