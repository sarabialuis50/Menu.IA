
import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load env variables
load_dotenv()

account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
# Try default sandbox number
twilio_number = "whatsapp:+14155238886" 

print(f"SID: {account_sid}")
# Mask token
print(f"Token: {auth_token[:5]}..." if auth_token else "Token: None")
print(f"From (TEST): {twilio_number}")

client = Client(account_sid, auth_token)

to_number = "whatsapp:+573128833350"  # Target number from logs

print(f"Attempting to send message to {to_number}...")

try:
    message = client.messages.create(
        from_=twilio_number,
        body="Prueba de conexión Twilio - Menu.IA",
        to=to_number
    )
    print(f"Message sent successfully! SID: {message.sid}")
    print(f"Status: {message.status}")
except Exception as e:
    print(f"Error sending message: {e}")
