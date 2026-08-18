import urllib.request
import json

def test_distraction():
    print("Testing Distraction API...")
    data = json.dumps({
        "user_id": 3,
        "app_name": "Instagram",
        "duration": 300,
        "focus_score_drop": 5
    }).encode('utf-8')
    req = urllib.request.Request("http://localhost:8000/api/simulation/distraction", data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as f:
            print(f.status, f.read().decode('utf-8'))
    except Exception as e:
        print(e)

def test_ai():
    print("Testing AI API...")
    data = json.dumps({
        "user_id": 1,
        "role": "parent",
        "message": "Hello!"
    }).encode('utf-8')
    req = urllib.request.Request("http://localhost:8000/api/ai/chat", data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as f:
            print(f.status, f.read().decode('utf-8'))
    except Exception as e:
        print(e)
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

if __name__ == "__main__":
    test_distraction()
    test_ai()
