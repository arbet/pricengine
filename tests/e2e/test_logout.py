"""Logout tests."""

import sys
from helpers import APP_URL, login, run_test


def _do_logout_test(page, role):
    """Sign Out clears session; visiting app after shows login page."""
    login(page, role)
    # Click Sign Out — NextAuth does POST signout then redirects
    # The redirect may fail in Docker networking, so we handle that
    page.click('button:has-text("Sign Out")')
    page.wait_for_timeout(3000)
    # Navigate back to app root — should show login page (session cleared)
    page.goto(APP_URL, wait_until="networkidle")
    page.wait_for_selector('input[type="email"]', timeout=10000)
    # Verify we're NOT redirected to dashboard (session is gone)
    assert "/dashboard" not in page.url, f"Should not be on dashboard after logout, got {page.url}"


def test_logout_lab_manager(page):
    _do_logout_test(page, "lab_manager")


def test_logout_super_admin(page):
    _do_logout_test(page, "super_admin")


def test_logout_lab_employee(page):
    _do_logout_test(page, "lab_employee")


if __name__ == "__main__":
    tests = [
        (test_logout_lab_manager, "logout_lab_manager"),
        (test_logout_super_admin, "logout_super_admin"),
        (test_logout_lab_employee, "logout_lab_employee"),
    ]
    print("=== Logout Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
