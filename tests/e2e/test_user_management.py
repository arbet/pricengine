"""Edit User and Remove User tests (super_admin role)."""

import sys
from helpers import login, run_test, unique_name


def _create_test_user(page):
    """Helper: create a temporary user in LabCorp East and return their email."""
    page.click('button:has-text("Add User")')
    page.wait_for_timeout(500)
    user_name = unique_name("Edt")
    user_email = f"edt{int(__import__('time').time())}@test.com"
    page.fill('input[placeholder="Dr. Jane Smith"]', user_name)
    page.fill('input[placeholder="jane@example.com"]', user_email)
    page.fill('input[placeholder="Min. 6 characters"]', "password123")
    add_btns = page.locator('button:has-text("Add User")')
    add_btns.last.click()
    page.wait_for_selector(f"text={user_email}", timeout=10000)
    return user_email


def test_edit_user(page):
    """Edit a user's role via modal (on a freshly created user)."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    user_email = _create_test_user(page)

    # Click edit on the new user's row
    row = page.locator(f"tr:has-text('{user_email}')")
    row.locator('button[title="Edit user"]').click()
    page.wait_for_selector("div.fixed.inset-0 >> text=Edit User", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    modal.locator("select").select_option(label="Lab Manager")
    modal.locator('button:has-text("Save Changes")').click()
    page.wait_for_timeout(2000)
    assert page.locator("div.fixed.inset-0").count() == 0, "Modal should close after save"


def test_edit_user_password(page):
    """Edit a user's password via modal (on a freshly created user)."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    user_email = _create_test_user(page)

    row = page.locator(f"tr:has-text('{user_email}')")
    row.locator('button[title="Edit user"]').click()
    page.wait_for_selector("div.fixed.inset-0 >> text=Edit User", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    password_inputs = modal.locator('input[type="password"]')
    password_inputs.nth(0).fill("newpass123")
    password_inputs.nth(1).fill("newpass123")
    modal.locator('button:has-text("Save Changes")').click()
    page.wait_for_timeout(2000)
    assert page.locator("div.fixed.inset-0").count() == 0, "Modal should close after save"


def test_edit_user_password_mismatch(page):
    """Password mismatch shows error."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    user_email = _create_test_user(page)

    row = page.locator(f"tr:has-text('{user_email}')")
    row.locator('button[title="Edit user"]').click()
    page.wait_for_selector("div.fixed.inset-0 >> text=Edit User", timeout=5000)

    modal = page.locator("div.fixed.inset-0")
    password_inputs = modal.locator('input[type="password"]')
    password_inputs.nth(0).fill("newpass123")
    password_inputs.nth(1).fill("different456")
    modal.locator('button:has-text("Save Changes")').click()
    page.wait_for_timeout(500)
    page.wait_for_selector("text=do not match", timeout=5000)
    assert page.locator("div.fixed.inset-0").count() > 0


def test_remove_user(page):
    """Remove a user with confirmation modal."""
    login(page, "super_admin")
    page.wait_for_selector("text=LabCorp East", timeout=10000)

    # First create a user to remove
    page.click("text=LabCorp East")
    page.wait_for_selector("table", timeout=5000)

    page.click('button:has-text("Add User")')
    page.wait_for_timeout(500)

    user_name = unique_name("Rmv")
    user_email = f"rmv{int(__import__('time').time())}@test.com"

    page.fill('input[placeholder="Dr. Jane Smith"]', user_name)
    page.fill('input[placeholder="jane@example.com"]', user_email)
    page.fill('input[placeholder="Min. 6 characters"]', "password123")

    add_btns = page.locator('button:has-text("Add User")')
    add_btns.last.click()
    page.wait_for_selector(f"text={user_email}", timeout=10000)

    # Now remove the user — click the trash icon (title="Remove user") on their row
    row = page.locator(f"tr:has-text('{user_email}')")
    row.locator('button[title="Remove user"]').click()

    # Confirmation modal should appear
    page.wait_for_selector("div.fixed.inset-0 >> text=Remove User", timeout=5000)
    page.wait_for_selector(f"text={user_name}", timeout=3000)

    # Confirm removal
    page.locator("div.fixed.inset-0").locator('button:has-text("Remove")').click()
    page.wait_for_timeout(2000)

    # User should be gone
    assert page.locator(f"text={user_email}").count() == 0, "Removed user should not appear"


if __name__ == "__main__":
    tests = [
        (test_edit_user, "edit_user"),
        (test_edit_user_password, "edit_user_password"),
        (test_edit_user_password_mismatch, "edit_user_password_mismatch"),
        (test_remove_user, "remove_user"),
    ]
    print("=== User Management Tests ===")
    results = [run_test(fn, name) for fn, name in tests]
    failed = results.count(False)
    print(f"\n{results.count(True)} passed, {failed} failed")
    if failed:
        sys.exit(1)
