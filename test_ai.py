import urllib.request
import json

data = json.dumps({"user_id": 1, "role": "Student", "message": "Hello, can you help me?"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/ai/chat", data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as f:
        print("Status:", f.status)
        print("Response:", f.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Error Response:", e.read().decode('utf-8'))
