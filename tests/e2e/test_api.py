"""External API (/api/v1/pricing) tests."""

import sys
import json
import urllib.request
import urllib.error
from helpers import APP_URL

API_URL = f"{APP_URL}/api/v1/pricing"
API_KEY = "lce-api-key-2026-secret"


def _api_request(body, api_key=API_KEY):
    """Make a POST request to the pricing API."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode()) if e.read else {}


def test_api_valid_request():
    """Valid pricing request returns correct structure."""
    status, data = _api_request({
        "organization": "LabCorp East",
        "test_ids": ["T-001", "T-002"],
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert "total_price" in data, "Response should have total_price"
    assert "breakdown" in data, "Response should have breakdown"
    assert data["currency"] == "USD"
    assert data["breakdown"]["anchor_test"]["role"] == "anchor"
    assert len(data["breakdown"]["add_on_tests"]) == 1
    assert data["breakdown"]["add_on_tests"][0]["role"] == "add_on"


def test_api_pricing_math():
    """Verify API pricing math matches algorithm.

    T-001 (CBC): listPrice=45.00, reagentCost=4.50
    T-002 (BMP): listPrice=65.00, reagentCost=6.20
    Org: discountFactor=0.5, floorMultiplier=3.0, marginalOverhead=5.0,
         donationPerPanel=2.0, revenueSharePerPanel=3.0

    Anchor = T-002 (highest listPrice=65.00), price=65.00
    Add-on = T-001: discounted=45*0.5=22.50, floor=3*(4.5+5)=28.50 → 28.50
    Subtotal = 65.00 + 28.50 = 93.50
    Total = 93.50 + 2.00 + 3.00 = 98.50
    """
    status, data = _api_request({
        "organization": "LabCorp East",
        "test_ids": ["T-001", "T-002"],
    })
    assert status == 200

    anchor = data["breakdown"]["anchor_test"]
    assert anchor["test_id"] == "T-002", f"Anchor should be T-002, got {anchor['test_id']}"
    assert float(anchor["list_price"]) == 65.00

    addon = data["breakdown"]["add_on_tests"][0]
    assert addon["test_id"] == "T-001"
    assert abs(float(addon["applied_price"]) - 28.50) < 0.01, f"Add-on price should be 28.50, got {addon['applied_price']}"

    assert abs(float(data["breakdown"]["subtotal"]) - 93.50) < 0.01
    assert abs(float(data["breakdown"]["donation"]) - 2.00) < 0.01
    assert abs(float(data["breakdown"]["revenue_share"]) - 3.00) < 0.01
    assert abs(float(data["total_price"]) - 98.50) < 0.01


def test_api_single_test():
    """Single test should be anchor with no add-ons."""
    status, data = _api_request({
        "organization": "LCE",
        "test_ids": ["T-005"],
    })
    assert status == 200
    assert data["breakdown"]["anchor_test"]["test_id"] == "T-005"
    assert len(data["breakdown"]["add_on_tests"]) == 0
    # Total = listPrice(120) + donation(2) + revenue_share(3) = 125
    assert abs(float(data["total_price"]) - 125.00) < 0.01


def test_api_org_by_code():
    """Can reference org by code instead of name."""
    status, data = _api_request({
        "organization": "LCE",
        "test_ids": ["T-001"],
    })
    assert status == 200


def test_api_missing_auth():
    """Missing Authorization header returns 401."""
    data = json.dumps({"organization": "LCE", "test_ids": ["T-001"]}).encode()
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(req)
        assert False, "Should have returned 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401


def test_api_wrong_key():
    """Wrong API key returns 401."""
    status, _ = _api_request(
        {"organization": "LCE", "test_ids": ["T-001"]},
        api_key="wrong-key",
    )
    assert status == 401


def test_api_invalid_test_ids():
    """Non-existent test IDs return 404."""
    status, _ = _api_request({
        "organization": "LCE",
        "test_ids": ["NONEXISTENT-999"],
    })
    assert status == 404, f"Expected 404, got {status}"


def test_api_empty_test_ids():
    """Empty test_ids returns 400."""
    status, _ = _api_request({
        "organization": "LCE",
        "test_ids": [],
    })
    assert status == 400


if __name__ == "__main__":
    tests = [
        (test_api_valid_request, "api_valid_request"),
        (test_api_pricing_math, "api_pricing_math"),
        (test_api_single_test, "api_single_test"),
        (test_api_org_by_code, "api_org_by_code"),
        (test_api_missing_auth, "api_missing_auth"),
        (test_api_wrong_key, "api_wrong_key"),
        (test_api_invalid_test_ids, "api_invalid_test_ids"),
        (test_api_empty_test_ids, "api_empty_test_ids"),
    ]
    print("=== External API Tests ===")
    passed = 0
    failed_names = []
    for fn, name in tests:
        try:
            fn()
            print(f"  PASSED: {name}")
            passed += 1
        except Exception as e:
            print(f"  FAILED: {name}")
            print(f"    {e}")
            failed_names.append(name)
    print(f"\n{passed} passed, {len(failed_names)} failed")
    if failed_names:
        sys.exit(1)
