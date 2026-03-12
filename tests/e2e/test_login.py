"""Smoke test: verify the login page loads and has expected elements."""

from playwright.sync_api import sync_playwright

APP_URL = "http://app:3000"


def test_login_page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Navigate to the login page (root route)
        page.goto(APP_URL, wait_until="networkidle")

        # Verify the page loaded with login form elements
        assert page.title(), "Page should have a title"

        # Check for email and password inputs
        email_input = page.locator('input[type="email"], input[name="email"]')
        password_input = page.locator('input[type="password"], input[name="password"]')

        assert email_input.count() > 0, "Login page should have an email input"
        assert password_input.count() > 0, "Login page should have a password input"

        # Take a screenshot for visual verification
        page.screenshot(path="/tmp/login.png", full_page=True)
        print("Screenshot saved to /tmp/login.png")

        browser.close()
        print("PASSED: Login page loads with email and password fields")


if __name__ == "__main__":
    test_login_page()
