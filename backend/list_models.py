import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))

print("Listing models with generateContent support:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"Name: {m.name}, Display: {m.display_name}")
