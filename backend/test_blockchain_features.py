import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=== 1. Testing Blockchain Status ===")
status_res = client.get("/api/blockchain/status")
print("Status:", status_res.status_code, status_res.json())

print("\n=== 2. Testing Report History & Retroactive Anchoring ===")
history_res = client.get("/api/reports/history/3")
reports = history_res.json()
print("History status:", history_res.status_code, "Reports count:", len(reports))

if reports:
    first_report = reports[0]
    report_id = first_report["id"]
    print(f"Target Report ID: {report_id}, Type: {first_report.get('report_type')}")
    print(f"Recorded Hash: {first_report.get('report_hash')}")
    print(f"Blockchain Tx: {first_report.get('blockchain_tx_id')}")

    print("\n=== 3. Testing Verification of Authentic Report ===")
    v1 = client.post(f"/api/blockchain/verify-report/{report_id}")
    print("Verify Untampered:", v1.status_code, v1.json())
    assert v1.json()["verified"] == True
    assert v1.json()["status"] == "VERIFIED"

    print("\n=== 4. Testing Tamper Simulation ===")
    tamper_res = client.post(f"/api/blockchain/simulate-tamper/{report_id}")
    print("Tamper response:", tamper_res.status_code, tamper_res.json())

    print("\n=== 5. Testing Verification of Tampered Report ===")
    v2 = client.post(f"/api/blockchain/verify-report/{report_id}")
    print("Verify Tampered:", v2.status_code, v2.json())
    assert v2.json()["verified"] == False
    assert v2.json()["status"] == "TAMPERED"

    print("\n=== 6. Testing Restoration of Report ===")
    restore_res = client.post(f"/api/blockchain/restore-report/{report_id}")
    print("Restore response:", restore_res.status_code, restore_res.json())

    print("\n=== 7. Re-verifying Restored Report ===")
    v3 = client.post(f"/api/blockchain/verify-report/{report_id}")
    print("Verify Restored:", v3.status_code, v3.json())
    assert v3.json()["verified"] == True
    assert v3.json()["status"] == "VERIFIED"

    print("\n>>> ALL BLOCKCHAIN VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
else:
    print("No reports found to test.")
