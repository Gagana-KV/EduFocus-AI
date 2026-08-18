import urllib.request
import json
import os

base_url = "http://localhost:8000/api"

models = ["llama-3.1-8b-instant", "llama3-8b-8192", "gemma2-9b-it", "mixtral-8x7b-32768", "llama-3.2-11b-vision-preview", "llama-3.2-3b-preview"]

def test_chat():
    for m in models:
        # We need to change the model in main.py, restart server and test. 
        # Wait, that's too slow. Let's just modify the API endpoint to accept the model as a parameter for testing.
        pass

# Actually I don't need this script if I can just modify main.py temporarily to accept model from request
