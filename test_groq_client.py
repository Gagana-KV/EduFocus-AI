import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv('backend/.env')
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

models = [
    "compound-beta",
    "compound-beta-mini",
    "gemma2-9b-it",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-guard-4-12b",
    "moonshotai/kimi-k2-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "qwen/qwen3.6-27b",
    "mixtral-8x7b-32768"
]

working_models = []

for m in models:
    try:
        completion = client.chat.completions.create(
            model=m,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=10
        )
        print(f"[OK] {m}")
        working_models.append(m)
    except Exception as e:
        print(f"[FAIL] {m} -> {e}")

print("Working models:", working_models)
