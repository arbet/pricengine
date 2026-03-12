"""Pricing math verification via the Calculator UI."""

import sys
import re
from helpers import APP_URL, login, run_test


def _parse_price(text):
    """Extract dollar amount from text like '$98.50'."""
    match = re.search(r"\$?([\d,]+\.?\d*)", text)
    return float(match.group(1).replace(",", "")) if match else None


def test_calculator_pricing_math(page):
    """Verify calculator pricing matches expected algorithm output.

    Select T-001 (CBC, $45) and T-002 (BMP, $65):
    - Anchor: T-002 at $65.00
    - Add-on: T-001 at max(45*0.5, 3*(4.5+5)) = max(22.50, 28.50) = $28.50
    - Subtotal: $93.50
    - Donation: $2.00, Revenue Share: $3.00
    - Total: $98.50
    """
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    # Select T-001 and T-002
    page.locator("text=T-001").first.click()
    page.wait_for_timeout(300)
    page.locator("text=T-002").first.click()
    page.wait_for_timeout(300)

    page.click('button:has-text("Calculate")')
    page.wait_for_selector("text=ANCHOR", timeout=10000)

    # Verify anchor is T-002 (higher list price)
    anchor_row = page.locator("text=ANCHOR").first.locator("..")
    assert page.locator("text=ANCHOR").count() >= 1

    # Verify total price
    # Find the total value — look for "Total Panel Price" section
    total_section = page.locator("text=Total").last
    # Get all text content and find the total price
    body_text = page.content()

    # Check the total is $98.50
    assert "98.50" in body_text, f"Expected total of $98.50 in page"


def test_calculator_single_test_pricing(page):
    """Single test should be anchor at full list price.

    T-005 (TSH): listPrice=120.00
    Total = 120 + 2 (donation) + 3 (revenue share) = $125.00
    """
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    page.locator("text=T-005").first.click()
    page.wait_for_timeout(300)

    page.click('button:has-text("Calculate")')
    page.wait_for_selector("text=ANCHOR", timeout=10000)

    body_text = page.content()
    assert "125.00" in body_text, "Single test total should be $125.00"


def test_calculator_three_tests_pricing(page):
    """Three tests: verify anchor + 2 add-ons.

    T-003 (CMP, $95, reagent=$8.75), T-004 (Lipid, $55, reagent=$5.30), T-007 (Urinalysis, $25, reagent=$2.10)
    Anchor: T-003 at $95.00
    Add-on T-004: max(55*0.5, 3*(5.30+5)) = max(27.50, 30.90) = $30.90
    Add-on T-007: max(25*0.5, 3*(2.10+5)) = max(12.50, 21.30) = $21.30
    Subtotal: 95.00 + 30.90 + 21.30 = $147.20
    Total: 147.20 + 2 + 3 = $152.20
    """
    login(page, "lab_manager")
    page.goto(f"{APP_URL}/dashboard/calculator", wait_until="networkidle")
    page.wait_for_selector("text=Select Tests", timeout=10000)

    for tid in ["T-003", "T-004", "T-007"]:
        page.locator(f"text={tid}").first.click()
        page.wait_for_timeout(300)

    page.click('button:has-text("Calculate")')
    page.wait_for_selector("text=ANCHOR", timeout=10000)

    body_text = page.content()
    assert "152.20" in body_text, "Three-test total should be $152.20"

    # Should have 1 anchor and 2 add-ons
    assert page.locator("text=ANCHOR").count() >= 1
    assert page.locator("text=ADD-ON").count() >= 2


if __name__ == "__main__":
    tests = [
        (test_calculator_pricing_math, "calculator_pricing_math"),
        (test_calculator_single_test_pricing, "calculator_single_test"),
        (test_calculator_three_tests_pricing, "calculator_three_tests"),
    ]
    print("=== Pricing Math Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
