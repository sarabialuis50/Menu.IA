import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
    print(f"API Key found: {api_key[:5] if api_key else 'None'}...")
    if not api_key:
        print("Error: GOOGLE_GEMINI_API_KEY not found")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    try:
        response = model.generate_content("Hello, this is a test. Reply with 'OK'")
        print(f"Gemini Response: {response.text}")
    except Exception as e:
        print(f"Gemini Error: {e}")

if __name__ == "__main__":
    test_gemini()
