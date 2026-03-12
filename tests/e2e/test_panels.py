"""Panel Management tests (lab_manager role)."""

import sys
from helpers import APP_URL, login, run_test, unique_name


def test_page_loads_with_panels(page):
    """Panels page loads with 4 seeded panels."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)
    rows = page.locator("table tbody tr")
    assert rows.count() >= 4, f"Expected at least 4 panels, got {rows.count()}"


def test_search_filters_panels(page):
    """Search filters panels by name."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    search = page.locator('input[placeholder*="Search"]')
    search.fill("Basic")
    page.wait_for_timeout(500)
    rows = page.locator("table tbody tr")
    assert rows.count() >= 1, "Should find Basic Panel"
    assert rows.count() < 4, "Search should filter results"


def test_create_panel(page):
    """Create a panel with multiple tests selected."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    panel_name = unique_name("Panel")

    # Click toolbar Add Panel button
    page.locator('button:has-text("Add Panel")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    # First input is panel name
    modal.locator("input").first.fill(panel_name)

    # Select tests via checkboxes
    checkboxes = modal.locator('input[type="checkbox"]')
    if checkboxes.count() >= 2:
        checkboxes.nth(0).click()
        checkboxes.nth(1).click()

    # Submit via modal button
    modal.locator('button:has-text("Add Panel")').click()
    page.wait_for_selector(f"text={panel_name}", timeout=10000)


def test_edit_panel(page):
    """Edit an existing panel."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Click edit on first panel row
    first_row = page.locator("table tbody tr").first
    first_row.locator("button").first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    save_btn = modal.locator('button:has-text("Save")')
    if save_btn.count() > 0:
        save_btn.click()
        page.wait_for_timeout(1000)


def test_delete_panel(page):
    """Delete a panel."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    # Create a panel first
    panel_name = unique_name("DelP")
    page.locator('button:has-text("Add Panel")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    modal.locator("input").first.fill(panel_name)
    checkboxes = modal.locator('input[type="checkbox"]')
    if checkboxes.count() >= 1:
        checkboxes.nth(0).click()
    modal.locator('button:has-text("Add Panel")').click()
    page.wait_for_selector(f"text={panel_name}", timeout=10000)

    # Delete it — click the delete button (second button in row)
    row = page.locator(f"table tbody tr:has-text('{panel_name}')")
    row.locator("button").nth(1).click()
    page.wait_for_timeout(2000)


def test_filter_tests_in_modal(page):
    """Filter tests within the Add Panel modal."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/panels", wait_until="networkidle")
    page.wait_for_selector("table", timeout=10000)

    page.locator('button:has-text("Add Panel")').first.click()
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    filter_inputs = modal.locator("input")
    if filter_inputs.count() >= 2:
        filter_inputs.nth(1).fill("CBC")
        page.wait_for_timeout(500)
        checkboxes = modal.locator('input[type="checkbox"]')
        assert checkboxes.count() >= 1, "Should find CBC test"
        assert checkboxes.count() < 20, "Should filter down"

    page.keyboard.press("Escape")


if __name__ == "__main__":
    tests = [
        (test_page_loads_with_panels, "panels_page_loads"),
        (test_search_filters_panels, "panels_search_filters"),
        (test_create_panel, "panels_create"),
        (test_edit_panel, "panels_edit"),
        (test_delete_panel, "panels_delete"),
        (test_filter_tests_in_modal, "panels_filter_tests_in_modal"),
    ]
    print("=== Panel Management Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
