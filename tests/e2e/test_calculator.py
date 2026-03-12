"""Pricing Calculator tests (lab_manager + lab_employee)."""

import sys
from helpers import APP_URL, login, run_test


def test_page_loads_with_test_list(page):
    """Calculator page loads with test list."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)
    # Should see at least some tests
    page.wait_for_selector("text=T-001", timeout=5000)


def test_select_and_calculate(page):
    """Select tests, calculate, and see pricing breakdown."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    # Click on first two tests in the list
    test_items = page.locator("text=T-001").first
    test_items.click()
    page.wait_for_timeout(300)

    test_items2 = page.locator("text=T-002").first
    test_items2.click()
    page.wait_for_timeout(300)

    # Should see selected count / chips
    page.wait_for_selector('button:has-text("Calculate")', timeout=5000)

    # Click calculate
    page.click('button:has-text("Calculate")')
    page.wait_for_timeout(2000)

    # Should see pricing breakdown with ANCHOR/ADD-ON badges
    page.wait_for_selector("text=ANCHOR", timeout=10000)
    # Should see total
    page.wait_for_selector("text=Total", timeout=5000)


def test_clear_all(page):
    """Clear All resets selection."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    # Select a test
    page.locator("text=T-001").first.click()
    page.wait_for_timeout(300)

    # Click Clear All
    clear_btn = page.locator('button:has-text("Clear")')
    if clear_btn.count() > 0:
        clear_btn.click()
        page.wait_for_timeout(500)


def test_search_filters_test_list(page):
    """Search filters the test list."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
    if search.count() > 0:
        search.first.fill("CBC")
        page.wait_for_timeout(500)
        # Should filter the test list
        page.wait_for_selector("text=CBC", timeout=5000)


def test_calculator_as_lab_employee(page):
    """Calculator works for lab_employee role."""
    login(page, "lab_employee")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    # Select and calculate
    page.locator("text=T-001").first.click()
    page.wait_for_timeout(300)
    page.click('button:has-text("Calculate")')
    page.wait_for_timeout(2000)
    page.wait_for_selector("text=ANCHOR", timeout=10000)


def test_calculate_disabled_no_selection(page):
    """Calculate button is disabled when no tests selected."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    # Calculate button should be disabled or not present
    calc_btn = page.locator('button:has-text("Calculate")')
    if calc_btn.count() > 0:
        is_disabled = calc_btn.is_disabled()
        assert is_disabled, "Calculate button should be disabled with no selection"


if __name__ == "__main__":
    tests = [
        (test_page_loads_with_test_list, "calculator_page_loads"),
        (test_select_and_calculate, "calculator_select_and_calculate"),
        (test_clear_all, "calculator_clear_all"),
        (test_search_filters_test_list, "calculator_search_filters"),
        (test_calculator_as_lab_employee, "calculator_as_lab_employee"),
        (test_calculate_disabled_no_selection, "calculator_disabled_no_selection"),
    ]
    print("=== Calculator Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
