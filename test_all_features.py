import urllib.request
import urllib.error
import json

base_url = "http://localhost:8000/api"

def test_endpoint(name, method, url, data=None):
    print(f"Testing {name}...")
    try:
        req_data = json.dumps(data).encode() if data else None
        headers = {'Content-Type': 'application/json'} if data else {}
        req = urllib.request.Request(f"{base_url}{url}", data=req_data, headers=headers, method=method)
        response = urllib.request.urlopen(req)
        res_data = response.read().decode()
        print(f"  [OK] Status {response.status}")
        return json.loads(res_data)
    except urllib.error.HTTPError as e:
        print(f"  [FAIL] HTTP {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return None

# Test Login
user = test_endpoint("Login", "POST", "/auth/login", {"username": "student1"})

if user:
    user_id = user['id']
    role = user['role']
    
    # Test Dashboard
    test_endpoint("Dashboard", "GET", f"/dashboard/{user_id}")
    
    # Test Insights
    test_endpoint("Insights", "GET", f"/insights/{user_id}")
    
    # Test AI Chat
    test_endpoint("AI Chat", "POST", "/ai/chat", {"user_id": user_id, "role": role, "message": "Hello AI!"})
    
    # Test Report
    test_endpoint("Report", "GET", f"/reports/daily/{user_id}")
    
    # Test Distraction
    test_endpoint("Distraction", "POST", "/simulation/distraction", {"user_id": user_id, "app_name": "Instagram", "duration": 300, "focus_score_drop": 5})

    print("All tests completed.")
