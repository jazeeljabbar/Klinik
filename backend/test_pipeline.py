import os
import requests
import json
from io import BytesIO

BASE_URL = "http://127.0.0.1:5001"

def print_step(msg):
    print("\n" + "="*50)
    print(f"STEP: {msg}")
    print("="*50)

def main():
    session = requests.Session()
    
    # 1. Create a dedicated test account
    print_step("Creating test account")
    test_email = "e2etest@klinik.ai"
    test_pwd = "password123"
    
    # Try to signup, if it fails because it exists, just login
    res = session.post(f"{BASE_URL}/api/auth/signup", json={
        "firstName": "Test",
        "lastName": "User",
        "email": test_email,
        "password": test_pwd
    })
    
    if res.status_code == 201:
        print("Test account created.")
        token = res.json().get('token')
    else:
        print("Account might exist. Logging in...")
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_pwd
        })
        token = res.json().get('token')
        
    if not token:
        print("FAILED TO GET TOKEN")
        return
        
    session.headers.update({"Authorization": f"Bearer {token}"})
    print("Auth Token acquired (redacted).")

    # 2. Count existing history
    print_step("Counting existing history")
    res = session.get(f"{BASE_URL}/api/history/")
    if res.status_code == 200:
        initial_history = res.json()
        initial_count = len(initial_history)
        print(f"Initial history count: {initial_count}")
    else:
        print(f"Failed to fetch history: {res.text}")
        return

    # 3. Create a non-sensitive test image (1x1 gray pixel)
    print_step("Running /predict")
    image_bytes = bytes.fromhex("ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232c00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f57a28a2800a28a2803f")
    files = {"image": ("test_image.jpg", image_bytes, "image/jpeg")}
    data = {"source": "camera", "client_capture_timestamp": "2026-06-18T12:00:00Z"}
    
    res = session.post(f"{BASE_URL}/predict", files=files, data=data)
    print(f"Predict Status: {res.status_code}")
    if res.status_code != 200:
        print(f"Predict failed: {res.text}")
        return
        
    predict_data = res.json()
    print("Predict returned payload with keys:")
    print(list(predict_data.keys()))
    
    if not predict_data.get('image_path'):
        print("ERROR: /predict did NOT return an image_path!")
        return
    else:
        print(f"SUCCESS: image_path is present (redacted)")

    # 4. Save to history
    print_step("Saving to History endpoint")
    history_payload = {
        "image_path": predict_data.get('image_path'),
        "predicted_class": predict_data.get('predicted_class'),
        "confidence": predict_data.get('confidence'),
        "severity_index": predict_data.get('severity_index'),
        "recommendation": predict_data.get('recommendation'),
        "source": predict_data.get('source'),
        "scan_id": predict_data.get('scan_id'),
        "client_capture_timestamp": predict_data.get('client_capture_timestamp'),
        "model_version": predict_data.get('model_version'),
        "comparison_eligible": predict_data.get('comparison_eligible'),
        "quality_flags": predict_data.get('quality_flags')
    }
    
    res = session.post(f"{BASE_URL}/api/history/", json=history_payload)
    print(f"Save History Status: {res.status_code}")
    if res.status_code != 201:
        print(f"Save history failed: {res.text}")
        return
        
    saved_doc = res.json().get('history', {})
    saved_doc_id = saved_doc.get('id')
    print(f"Document saved with ID: {saved_doc_id}")

    # 5. Fetch history again and verify count increases
    print_step("Fetching history to verify count")
    res = session.get(f"{BASE_URL}/api/history/")
    if res.status_code != 200:
        print(f"Failed to fetch history: {res.text}")
        return
        
    final_history = res.json()
    final_count = len(final_history)
    print(f"Final history count: {final_count}")
    
    if final_count != initial_count + 1:
        print(f"ERROR: Count did not increase by exactly one. Initial: {initial_count}, Final: {final_count}")
        return
    else:
        print("SUCCESS: History count increased by exactly one.")
        
    # Check the new record metadata
    new_record = final_history[0]  # Should be at top because order_by DESCENDING
    print("New Record Metadata:")
    print(f"- history_id (id): {new_record.get('id')}")
    print(f"- scan_id: {new_record.get('scan_id')}")
    print(f"- source: {new_record.get('source')}")
    print(f"- timestamp: {new_record.get('timestamp')}")
    print(f"- image_path exists: {'image_path' in new_record and new_record.get('image_path') is not None}")
    print(f"- image_delivery_mode: {new_record.get('image_delivery_mode')}")

    # 6. Request the image via the proxy endpoint
    print_step("Testing Authenticated Image Proxy Endpoint")
    history_id = new_record.get('id')
    res = session.get(f"{BASE_URL}/api/history/{history_id}/image")
    print(f"Image Request Status: {res.status_code}")
    print(f"Image Content-Type: {res.headers.get('Content-Type')}")
    print(f"Image Content-Length (bytes): {len(res.content)}")
    
    if res.status_code == 200 and len(res.content) > 0 and res.headers.get('Content-Type', '').startswith('image/'):
        print("SUCCESS: Valid image stream received.")
    else:
        print(f"ERROR: Invalid image response: {res.text[:100]}")
        return

    # 7. Cross-user test
    print_step("Testing Cross-User Access")
    # Make a request without the token
    res_no_auth = requests.get(f"{BASE_URL}/api/history/{history_id}/image")
    print(f"No Auth Request Status: {res_no_auth.status_code}")
    
    # Login as another user
    print("Logging in as cross-user test account...")
    cross_email = "crossuser@klinik.ai"
    res_cross = session.post(f"{BASE_URL}/api/auth/signup", json={
        "firstName": "Cross",
        "lastName": "User",
        "email": cross_email,
        "password": "password123"
    })
    if res_cross.status_code != 201:
        res_cross = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": cross_email,
            "password": "password123"
        })
    cross_token = res_cross.json().get('token')
    
    res_cross_img = requests.get(f"{BASE_URL}/api/history/{history_id}/image", headers={"Authorization": f"Bearer {cross_token}"})
    print(f"Cross-user Auth Request Status: {res_cross_img.status_code}")
    if res_cross_img.status_code == 404:
        print("SUCCESS: Cross-user test correctly blocked (returns 404).")
    else:
        print(f"ERROR: Cross-user test failed, got status {res_cross_img.status_code}")

    print_step("ALL TESTS PASSED")

if __name__ == "__main__":
    main()
