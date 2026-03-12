"""Login page element verification tests."""

import sys
from helpers import APP_URL, run_test


def test_login_page_elements(page):
    """Verify login page loads with email and password fields."""
    page.goto(APP_URL, wait_until="networkidle")
    assert page.title(), "Page should have a title"

    email_input = page.locator('input[type="email"]')
    password_input = page.locator('input[type="password"]')

    assert email_input.count() > 0, "Login page should have an email input"
    assert password_input.count() > 0, "Login page should have a password input"

    # Verify Sign In button exists
    sign_in = page.locator('button:has-text("Sign In")')
    assert sign_in.count() > 0, "Login page should have a Sign In button"


if __name__ == "__main__":
    tests = [
        (test_login_page_elements, "login_page_elements"),
    ]
    print("=== Login Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
