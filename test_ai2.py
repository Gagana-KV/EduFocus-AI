import urllib.request, urllib.error, json
req = urllib.request.Request('http://localhost:8000/api/ai/chat', data=json.dumps({'user_id': 3, 'role': 'student', 'message': 'Hello'}).encode(), headers={'Content-Type': 'application/json'})
try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
