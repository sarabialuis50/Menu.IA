import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
genai.configure(api_key=api_key)

try:
    print("Testing with gemini-2.0-flash...")
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Hola, dime 'OK' si funcionas.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
