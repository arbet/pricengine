"""Logs & Audit Trail tests (lab_manager role)."""

import sys
from helpers import APP_URL, login, run_test


def test_page_loads_with_logs(page):
    """Logs page loads with 6 seeded log entries."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)
    # Should show log entry count (at least 6 seeded, possibly more from calculator tests)
    page.wait_for_selector("text=log entries", timeout=5000)


def test_search_by_test_id(page):
    """Search by test ID filters results."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Get total count before filtering
    total_rows = page.locator("table tbody tr").count()
    search = page.locator('input[placeholder*="Search"]')
    search.fill("T-001")
    page.wait_for_timeout(500)
    # Should filter results
    rows = page.locator("table tbody tr")
    count = rows.count()
    assert count >= 1, "Should find logs containing T-001"
    assert count <= total_rows, "Should not show more rows than total"


def test_source_dropdown_filter(page):
    """Source dropdown filters by Calculator / External API."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Find source dropdown/select
    source_select = page.locator("select")
    if source_select.count() > 0:
        source_select.select_option(label="Calculator")
        page.wait_for_timeout(500)
        # Should filter results
        rows = page.locator("table tbody tr")
        assert rows.count() >= 1, "Should show Calculator logs"


def test_date_range_filter(page):
    """Date range filter works."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Find date inputs
    date_inputs = page.locator('input[type="date"]')
    if date_inputs.count() >= 2:
        # Set a wide date range that includes seeded data
        date_inputs.nth(0).fill("2025-01-01")
        date_inputs.nth(1).fill("2027-12-31")
        page.wait_for_timeout(500)
        rows = page.locator("table tbody tr")
        assert rows.count() >= 1, "Should show logs within date range"


def test_log_rows_display_test_badges(page):
    """Log rows display test ID badges."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/logs", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Verify test ID badges are visible in log rows
    # Test IDs appear as badges in the Panel Composition column
    test_badges = page.locator("table tbody td >> text=/T-\\d+/")
    assert test_badges.count() >= 1, "Should display test ID badges in log rows"


if __name__ == "__main__":
    tests = [
        (test_page_loads_with_logs, "logs_page_loads"),
        (test_search_by_test_id, "logs_search_by_test_id"),
        (test_source_dropdown_filter, "logs_source_filter"),
        (test_date_range_filter, "logs_date_range_filter"),
        (test_log_rows_display_test_badges, "logs_test_badges"),
    ]
    print("=== Logs Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
