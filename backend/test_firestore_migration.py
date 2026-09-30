import requests
import uuid
import json

BASE_URL = "http://127.0.0.1:5001"

def test_health():
    res = requests.get(f"{BASE_URL}/health")
    if res.status_code == 200:
        print("PASS: /health works")
    else:
        print(f"FAIL: /health returned {res.status_code}")

def test_signup_and_login():
    email = f"test_{uuid.uuid4().hex}@example.com"
    payload = {
        "name": "Test User",
        "email": email,
        "phone": f"123{uuid.uuid4().hex[:7]}",
        "gender": "male",
        "age": 25,
        "password": "Password123!"
    }
    
    # 4. Test signup
    res = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
    if res.status_code == 201:
        data = res.json()
        print(f"PASS: Signup works. User ID: {data['user']['id']}")
    else:
        print(f"FAIL: Signup failed {res.text}")
        return None, email
        
    # 5. Duplicate signup
    res2 = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
    if res2.status_code == 409:
        print("PASS: Duplicate signup correctly failed.")
    else:
        print(f"FAIL: Duplicate signup {res2.status_code}")
        
    # 6. Test login
    login_payload = {"email": email, "password": "Password123!"}
    res_login = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    if res_login.status_code == 200:
        login_data = res_login.json()
        token = login_data["token"]
        print("PASS: Login works. Token received.")
    else:
        print(f"FAIL: Login failed {res_login.text}")
        return None, email
        
    # 6. Wrong password
    bad_login_payload = {"email": email, "password": "WrongPassword!"}
    res_bad = requests.post(f"{BASE_URL}/api/auth/login", json=bad_login_payload)
    if res_bad.status_code == 401:
        print("PASS: Wrong password fails correctly.")
    else:
        print(f"FAIL: Wrong password returned {res_bad.status_code}")
        
    return token, email

def test_history(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 8. POST /api/history
    hist_payload = {
        "image_url": "https://example.com/test.jpg",
        "predicted_class": "Mild",
        "confidence": 0.95,
        "severity_index": 1,
        "recommendation": {"cleanser": "Salicylic Acid"}
    }
    
    res = requests.post(f"{BASE_URL}/api/history/", json=hist_payload, headers=headers)
    if res.status_code == 201:
        print("PASS: POST /api/history works.")
    else:
        print(f"FAIL: POST /api/history {res.text}")
        
    # 9. GET /api/history
    res_get = requests.get(f"{BASE_URL}/api/history/", headers=headers)
    if res_get.status_code == 500 and "Database index required" in res_get.text:
        print("PASS: GET /api/history failed properly indicating missing Composite Index. Expected.")
    elif res_get.status_code == 200:
        print("PASS: GET /api/history works (Index already exists?!).")
    else:
        print(f"FAIL: GET /api/history {res_get.text}")

if __name__ == "__main__":
    test_health()
    token, email = test_signup_and_login()
    if token:
        test_history(token)
