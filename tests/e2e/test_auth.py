"""Authentication & Role-Based Access tests."""

import sys
from helpers import APP_URL, USERS, login, run_test


def test_login_super_admin(page):
    """super_admin logs in and lands on /dashboard/admin."""
    login(page, "super_admin")
    assert "/dashboard/admin" in page.url


def test_login_lab_manager(page):
    """lab_manager logs in and lands on /dashboard/tests."""
    login(page, "lab_manager")
    assert "/dashboard/tests" in page.url


def test_login_lab_employee(page):
    """lab_employee logs in and lands on /dashboard/calculator."""
    login(page, "lab_employee")
    assert "/dashboard/calculator" in page.url


def test_login_invalid_credentials(page):
    """Invalid credentials show an error message."""
    page.goto(APP_URL, wait_until="networkidle")
    page.fill('input[type="email"]', "wrong@example.com")
    page.fill('input[type="password"]', "wrongpassword")
    page.click('button:has-text("Sign In")')
    # Wait for error message to appear
    page.wait_for_selector("text=Invalid", timeout=10000)


def test_unauthenticated_redirect(page):
    """Unauthenticated access to protected route redirects to /."""
    page.goto(f"{APP_URL}/dashboard/admin", wait_until="networkidle")
    # Should redirect back to login
    assert page.url.rstrip("/") == APP_URL or page.url == f"{APP_URL}/"


def test_super_admin_blocked_from_tests(page):
    """super_admin cannot access /dashboard/tests — page renders empty."""
    login(page, "super_admin")
    page.goto(f"{APP_URL}/dashboard/tests", wait_until="networkidle")
    # Page returns null for unauthorized role — no table should be visible
    assert page.locator("table").count() == 0, "super_admin should not see tests table"


def test_lab_employee_blocked_from_admin(page):
    """lab_employee cannot access /dashboard/admin — page renders empty."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/admin", wait_until="networkidle")
    # Page returns null for non-super_admin — no org cards should be visible
    assert page.locator("text=Organizations").count() == 0 or page.locator("table").count() == 0, \
        "lab_employee should not see admin content"


def test_lab_employee_no_tests_nav_link(page):
    """lab_employee sidebar does not show Test Management link."""
    login(page, "lab_employee")
    # The sidebar should not show Test Management for lab_employee
    nav_link = page.locator('a[href="/dashboard/tests"]')
    assert nav_link.count() == 0, "lab_employee should not see Test Management nav link"


if __name__ == "__main__":
    tests = [
        (test_login_super_admin, "login_super_admin"),
        (test_login_lab_manager, "login_lab_manager"),
        (test_login_lab_employee, "login_lab_employee"),
        (test_login_invalid_credentials, "login_invalid_credentials"),
        (test_unauthenticated_redirect, "unauthenticated_redirect"),
        (test_super_admin_blocked_from_tests, "super_admin_blocked_from_tests"),
        (test_lab_employee_blocked_from_admin, "lab_employee_blocked_from_admin"),
        (test_lab_employee_no_tests_nav_link, "lab_employee_no_tests_nav_link"),
    ]
    print("=== Auth Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
