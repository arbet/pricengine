"""Smoke tests: visit all main routes and verify they render."""

import sys
from helpers import APP_URL, run_test

PUBLIC_ROUTES = [
    ("/", "Login"),
]

PROTECTED_ROUTES = [
    "/dashboard",
    "/dashboard/calculator",
    "/dashboard/analytics",
    "/dashboard/panels",
    "/dashboard/logs",
    "/dashboard/tests",
    "/dashboard/admin",
]


def test_public_routes(page):
    """Verify public pages load without errors."""
    for route, label in PUBLIC_ROUTES:
        url = f"{APP_URL}{route}"
        response = page.goto(url, wait_until="networkidle")
        assert response and response.ok, f"Expected 2xx for {url}, got {response.status if response else 'no response'}"


def test_protected_routes_redirect(page):
    """Verify protected pages respond (redirect to login is acceptable)."""
    for route in PROTECTED_ROUTES:
        url = f"{APP_URL}{route}"
        response = page.goto(url, wait_until="networkidle")
        assert response, f"No response for {url}"
        assert response.ok, f"Expected 2xx for {url}, got {response.status}"


if __name__ == "__main__":
    tests = [
        (test_public_routes, "public_routes"),
        (test_protected_routes_redirect, "protected_routes_redirect"),
    ]
    print("=== Smoke Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
