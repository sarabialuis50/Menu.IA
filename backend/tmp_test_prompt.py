from whatsapp_agent import PLATFORM_SYSTEM_PROMPT
from datetime import datetime

try:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    prompt = PLATFORM_SYSTEM_PROMPT.format(current_date=now)
    print("Prompt format SUCCESS")
    print(prompt[-100:])
except Exception as e:
    print(f"Prompt format FAILED: {e}")
