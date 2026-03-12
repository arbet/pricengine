"""Admin Panel tests (super_admin role)."""

import sys
from helpers import APP_URL, login, run_test, unique_name


def test_admin_page_loads(page):
    """Admin page loads with summary cards."""
    login(page, "super_admin")
    page.wait_for_selector("text=Organizations", timeout=10000)
    page.wait_for_selector("text=Total Users", timeout=5000)
    page.wait_for_selector("text=Total Tests", timeout=5000)


def test_expand_org_accordion(page):
    """Expanding an org accordion shows user table."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)
    page.wait_for_selector("text=sarah@labcorp.com", timeout=5000)


def test_create_organization(page):
    """Create a new organization via modal."""
    login(page, "super_admin")
    page.wait_for_load_state("networkidle")
    name = unique_name("TestOrg")
    code = name[-6:]  # Keep short for 10-char limit

    page.click('button:has-text("Add Organization")')
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)

    # Modal inputs: 1=Org Name, 2=Code, 3=Phone, 4=Contact Email, 5=Address
    modal = page.locator("div.fixed.inset-0")
    inputs = modal.locator("input")
    inputs.nth(0).fill(name)
    inputs.nth(1).fill(code)
    page.click('button:has-text("Create Organization")')
    page.wait_for_selector(f"text={name}", timeout=10000)


def test_edit_organization(page):
    """Edit an existing organization via the edit button in expanded view."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    # Expand the org
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    # Click the edit org button (pencil icon with title="Edit organization")
    page.click('button[title="Edit organization"]')
    page.wait_for_selector("div.fixed.inset-0 >> text=Edit Organization", timeout=5000)

    # Modal should have pre-filled data, just save
    page.click('button:has-text("Save Changes")')
    page.wait_for_timeout(1000)


def test_create_user_in_org(page):
    """Create a user within an organization."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    # Click "Add User" button
    page.click('button:has-text("Add User")')
    page.wait_for_timeout(500)

    user_name = unique_name("Usr")
    user_email = f"test{int(__import__('time').time())}@test.com"

    # Fill inline form: Full Name, Email, Role (select), Password
    # The inline form has placeholders we can target
    page.fill('input[placeholder="Dr. Jane Smith"]', user_name)
    page.fill('input[placeholder="jane@example.com"]', user_email)
    page.fill('input[placeholder="Min. 6 characters"]', "password123")

    # Click the "Add User" submit button (the last one in the inline form)
    add_btns = page.locator('button:has-text("Add User")')
    add_btns.last.click()
    page.wait_for_selector(f"text={user_email}", timeout=10000)


def test_delete_organization(page):
    """Delete an organization with confirmation modal."""
    login(page, "super_admin")
    page.wait_for_load_state("networkidle")

    # Create an org to delete
    name = unique_name("DelOrg")
    code = name[-6:]

    page.click('button:has-text("Add Organization")')
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)
    modal = page.locator("div.fixed.inset-0")
    inputs = modal.locator("input")
    inputs.nth(0).fill(name)
    inputs.nth(1).fill(code)
    page.click('button:has-text("Create Organization")')
    page.wait_for_selector(f"text={name}", timeout=10000)

    # Expand the org
    page.click(f"text={name}")
    page.wait_for_timeout(500)

    # Click "Delete Organization" button
    page.click('button:has-text("Delete Organization")')
    page.wait_for_selector("div.fixed.inset-0 >> text=Delete Organization", timeout=5000)

    # Confirm deletion (the "Delete" button in the confirmation modal)
    modal_btns = page.locator("div.fixed.inset-0 button:has-text('Delete')")
    modal_btns.last.click()
    page.wait_for_timeout(2000)


def test_validation_errors(page):
    """Empty form submit shows validation errors."""
    login(page, "super_admin")
    page.wait_for_load_state("networkidle")

    page.click('button:has-text("Add Organization")')
    page.wait_for_selector("div.fixed.inset-0", timeout=5000)
    page.click('button:has-text("Create Organization")')
    page.wait_for_timeout(500)
    # Should show validation error messages
    page.wait_for_selector("text=required", timeout=5000)
    # Modal should still be open
    assert page.locator("div.fixed.inset-0").count() > 0


if __name__ == "__main__":
    tests = [
        (test_admin_page_loads, "admin_page_loads"),
        (test_expand_org_accordion, "expand_org_accordion"),
        (test_create_organization, "create_organization"),
        (test_edit_organization, "edit_organization"),
        (test_create_user_in_org, "create_user_in_org"),
        (test_delete_organization, "delete_organization"),
        (test_validation_errors, "admin_validation_errors"),
    ]
    print("=== Admin Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
