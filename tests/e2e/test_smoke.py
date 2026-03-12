"""Smoke tests: visit all main routes and verify they render."""

from playwright.sync_api import sync_playwright

APP_URL = "http://app:3000"

# Routes that don't require authentication
PUBLIC_ROUTES = [
    ("/", "Login"),
]

# Routes behind auth — these will redirect to login, which is fine for a smoke test
PROTECTED_ROUTES = [
    "/dashboard",
    "/dashboard/calculator",
    "/dashboard/analytics",
    "/dashboard/panels",
    "/dashboard/logs",
    "/dashboard/tests",
    "/dashboard/admin",
]


def test_public_routes():
    """Verify public pages load without errors."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for route, label in PUBLIC_ROUTES:
            url = f"{APP_URL}{route}"
            print(f"Visiting {url} ...", end=" ")
            response = page.goto(url, wait_until="networkidle")
            assert response and response.ok, f"Expected 2xx for {url}, got {response.status if response else 'no response'}"
            print("OK")

        browser.close()
        print("\nPASSED: All public routes load successfully")


def test_protected_routes_redirect():
    """Verify protected pages respond (redirect to login is acceptable)."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for route in PROTECTED_ROUTES:
            url = f"{APP_URL}{route}"
            print(f"Visiting {url} ...", end=" ")
            response = page.goto(url, wait_until="networkidle")
            # Accept 200 (if somehow accessible) or redirect to login
            assert response, f"No response for {url}"
            assert response.ok, f"Expected 2xx for {url}, got {response.status}"
            print(f"OK (final URL: {page.url})")

        browser.close()
        print("\nPASSED: All protected routes respond correctly")


if __name__ == "__main__":
    test_public_routes()
    test_protected_routes_redirect()
