"""Test Management tests (lab_manager role)."""

import sys
from helpers import login, run_test, unique_name


def test_page_loads_with_tests(page):
    """Tests page loads and shows 20 tests."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)
    page.wait_for_selector("text=tests", timeout=5000)  # At least shows test count
    page.wait_for_selector("text=T-001", timeout=5000)


def test_search_filters(page):
    """Search filters by test ID or name."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)

    search = page.locator('input[placeholder*="Search"]')
    search.fill("T-001")
    page.wait_for_timeout(500)
    rows = page.locator("table tbody tr")
    assert rows.count() >= 1, "Should find at least one test"
    assert rows.count() < 20, "Should filter down from 20"

    search.fill("CBC")
    page.wait_for_timeout(500)
    page.wait_for_selector("text=CBC", timeout=5000)


def test_add_test(page):
    """Add a new test via modal."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)

    test_id = unique_name("T")[:10]
    test_name = unique_name("Test")

    # Click toolbar Add Test button (last button in toolbar area)
    page.locator('button:has-text("Add Test")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    # Fill form — inputs are: Test ID, Test Name, Reagent Cost, List Price, Category
    modal = page.locator("div.fixed.inset-0")
    inputs = modal.locator("input")
    inputs.nth(0).fill(test_id)
    inputs.nth(1).fill(test_name)
    inputs.nth(2).fill("5.00")
    inputs.nth(3).fill("25.00")

    # Click submit button inside the modal
    modal.locator('button:has-text("Add Test")').click()
    page.wait_for_selector(f"text={test_id}", timeout=10000)


def test_edit_test(page):
    """Edit an existing test."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)

    # Click edit button on first row (first svg button in the row)
    first_row = page.locator("table tbody tr").first
    first_row.locator("button").first.click()
    page.wait_for_selector("div.fixed.inset-0 >> text=Edit Test", timeout=5000)

    # Save without changes
    page.locator("div.fixed.inset-0").locator('button:has-text("Save Changes")').click()
    page.wait_for_timeout(1000)


def test_delete_test(page):
    """Delete a test."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)

    # First create a test to delete
    test_id = unique_name("D")[:10]
    test_name = unique_name("Del")

    page.locator('button:has-text("Add Test")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)
    modal = page.locator("div.fixed.inset-0")
    inputs = modal.locator("input")
    inputs.nth(0).fill(test_id)
    inputs.nth(1).fill(test_name)
    inputs.nth(3).fill("10.00")
    modal.locator('button:has-text("Add Test")').click()
    page.wait_for_selector(f"text={test_id}", timeout=10000)

    # Delete it — the delete button is the second button in each row, no confirmation
    row = page.locator(f"table tbody tr:has-text('{test_id}')")
    row.locator("button").nth(1).click()
    page.wait_for_timeout(2000)
    # Verify it's gone
    assert page.locator(f"text={test_id}").count() == 0, "Deleted test should be gone"


def test_validation_empty_submit(page):
    """Empty form submit shows validation errors."""
    login(page, "lab_manager")
    page.wait_for_selector("table", timeout=10000)

    page.locator('button:has-text("Add Test")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    # Click submit without filling
    modal = page.locator("div.fixed.inset-0")
    modal.locator('button:has-text("Add Test")').click()
    page.wait_for_timeout(500)
    # Should show validation errors
    page.wait_for_selector("text=required", timeout=5000)
    # Modal should still be open
    assert page.locator("div.fixed.inset-0").count() > 0


if __name__ == "__main__":
    tests = [
        (test_page_loads_with_tests, "tests_page_loads"),
        (test_search_filters, "tests_search_filters"),
        (test_add_test, "tests_add_test"),
        (test_edit_test, "tests_edit_test"),
        (test_delete_test, "tests_delete_test"),
        (test_validation_empty_submit, "tests_validation_errors"),
    ]
    print("=== Test Management Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
