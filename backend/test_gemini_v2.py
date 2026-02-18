import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
genai.configure(api_key=api_key)

models_to_try = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-pro'
]

for model_name in models_to_try:
    try:
        print(f"Testing model: {model_name}")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Responde: OK")
        print(f"Success with {model_name}: {response.text}")
        break
    except Exception as e:
        print(f"Failed {model_name}: {e}")
