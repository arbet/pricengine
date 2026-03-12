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
    page.wait_for_selector("text=Invalid", timeout=10000)


def test_unauthenticated_redirect(page):
    """Unauthenticated access to protected route redirects to /."""
    page.goto(f"{APP_URL}/dashboard/admin", wait_until="networkidle")
    assert page.url.rstrip("/") == APP_URL or page.url == f"{APP_URL}/"


def test_super_admin_blocked_from_tests(page):
    """super_admin is redirected away from /dashboard/tests."""
    login(page, "super_admin")
    page.goto(f"{APP_URL}/dashboard/tests", wait_until="networkidle")
    # Should redirect to /dashboard → /dashboard/admin
    assert "/dashboard/tests" not in page.url, \
        f"super_admin should be redirected away from /dashboard/tests, got {page.url}"


def test_lab_employee_blocked_from_admin(page):
    """lab_employee is redirected away from /dashboard/admin."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/admin", wait_until="networkidle")
    assert "/dashboard/admin" not in page.url, \
        f"lab_employee should be redirected away from /dashboard/admin, got {page.url}"


def test_lab_employee_blocked_from_tests(page):
    """lab_employee is redirected away from /dashboard/tests."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/tests", wait_until="networkidle")
    assert "/dashboard/tests" not in page.url, \
        f"lab_employee should be redirected away from /dashboard/tests, got {page.url}"


def test_lab_employee_blocked_from_panels(page):
    """lab_employee is redirected away from /dashboard/panels."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    assert "/dashboard/panels" not in page.url, \
        f"lab_employee should be redirected away from /dashboard/panels, got {page.url}"


def test_lab_employee_blocked_from_logs(page):
    """lab_employee is redirected away from /dashboard/logs."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    assert "/dashboard/logs" not in page.url, \
        f"lab_employee should be redirected away from /dashboard/logs, got {page.url}"


def test_lab_employee_blocked_from_analytics(page):
    """lab_employee is redirected away from /dashboard/analytics."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    assert "/dashboard/analytics" not in page.url, \
        f"lab_employee should be redirected away from /dashboard/analytics, got {page.url}"


def test_lab_employee_no_tests_nav_link(page):
    """lab_employee sidebar does not show Test Management link."""
    login(page, "lab_employee")
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
        (test_lab_employee_blocked_from_tests, "lab_employee_blocked_from_tests"),
        (test_lab_employee_blocked_from_panels, "lab_employee_blocked_from_panels"),
        (test_lab_employee_blocked_from_logs, "lab_employee_blocked_from_logs"),
        (test_lab_employee_blocked_from_analytics, "lab_employee_blocked_from_analytics"),
        (test_lab_employee_no_tests_nav_link, "lab_employee_no_tests_nav_link"),
    ]
    print("=== Auth Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
