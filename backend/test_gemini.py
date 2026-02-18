import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
print(f"Testing with key: {api_key[:10]}...")

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hola, di 'test' si funcionas.")
    print(f"Response: {response.text}")
except Exception as e:
    import traceback
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    traceback.print_exc()
