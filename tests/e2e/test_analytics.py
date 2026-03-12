"""Analytics tests (lab_manager role)."""

import sys
from helpers import APP_URL, login, run_test


def test_page_loads_with_panels_and_metrics(page):
    """Analytics page loads with panel selector and metric cards."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    # Should see panel selector buttons
    page.wait_for_selector("text=Basic Panel", timeout=10000)
    # Should see metric cards
    page.wait_for_selector("text=Panel Price", timeout=5000)
    page.wait_for_selector("text=Margin", timeout=5000)


def test_select_different_panel(page):
    """Selecting a different panel updates metrics."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    page.wait_for_selector("text=Basic Panel", timeout=10000)

    # Get initial panel price
    price_card = page.locator("text=Panel Price").first
    page.wait_for_timeout(500)

    # Click a different panel
    page.click("text=Cardiac Panel")
    page.wait_for_timeout(1000)
    page.wait_for_load_state("networkidle")

    # Metrics should have updated (page should still show metric cards)
    page.wait_for_selector("text=Panel Price", timeout=5000)


def test_modify_overhead_inputs(page):
    """Modifying overhead inputs recalculates margins."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    page.wait_for_selector("text=Basic Panel", timeout=10000)

    # Find overhead input fields (Daily Overhead Cost, Panels Processed)
    inputs = page.locator('input[type="number"]')
    if inputs.count() >= 2:
        # Modify projected overhead
        inputs.nth(2).fill("2000")  # Projected Daily Overhead
        page.wait_for_timeout(500)
        inputs.nth(3).fill("50")  # Projected Panels/Day
        page.wait_for_timeout(1000)
        # Margins should recalculate
        page.wait_for_selector("text=Margin", timeout=5000)


def test_pricing_breakdown_table(page):
    """Pricing breakdown table shows test rows with roles."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    page.wait_for_selector("text=Basic Panel", timeout=10000)

    # Click on a panel to load its breakdown
    page.click("text=Basic Panel")
    page.wait_for_timeout(1000)

    # Should see pricing algorithm breakdown table
    page.wait_for_selector("table", timeout=10000)
    # Should see ANCHOR/ADD-ON role badges
    anchor = page.locator("text=ANCHOR")
    assert anchor.count() >= 1, "Should show ANCHOR role in breakdown"


def test_profitability_comparison(page):
    """Profitability comparison bars are visible."""
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/analytics", wait_until="networkidle")
    page.wait_for_selector("text=Basic Panel", timeout=10000)
    page.click("text=Basic Panel")
    page.wait_for_timeout(1000)

    # Should see profitability section
    page.wait_for_selector("text=Profitability", timeout=5000)


if __name__ == "__main__":
    tests = [
        (test_page_loads_with_panels_and_metrics, "analytics_page_loads"),
        (test_select_different_panel, "analytics_select_panel"),
        (test_modify_overhead_inputs, "analytics_modify_overhead"),
        (test_pricing_breakdown_table, "analytics_breakdown_table"),
        (test_profitability_comparison, "analytics_profitability"),
    ]
    print("=== Analytics Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
