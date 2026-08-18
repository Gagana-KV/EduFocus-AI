import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('GROQ_API_KEY')

models_to_test = [
    "llama3-70b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
    "llama3-groq-70b-8192-tool-use-preview",
    "llama3-groq-8b-8192-tool-use-preview"
]

def test_model(model_name):
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "model": model_name,
        "messages": [{"role": "user", "content": "Hello"}]
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        response = urllib.request.urlopen(req)
        print(f"{model_name}: OK")
    except Exception as e:
        print(f"{model_name}: FAILED - {e}")

for m in models_to_test:
    test_model(m)
