import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
genai.configure(api_key=api_key)

print("Listing ALL models:")
try:
    models = genai.list_models()
    for m in models:
        print(f"Model: {m.name} - Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error: {e}")
