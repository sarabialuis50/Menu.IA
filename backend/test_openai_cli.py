import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_openai():
    api_key = os.environ.get("OPENAI_API_KEY")
    print(f"API Key found: {api_key[:5] if api_key else 'None'}...")
    if not api_key:
        print("Error: OPENAI_API_KEY not found")
        return

    client = OpenAI(api_key=api_key)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello, reply with OK"}]
        )
        print(f"OpenAI Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"OpenAI Error: {e}")

if __name__ == "__main__":
    test_openai()
