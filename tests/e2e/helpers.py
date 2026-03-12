"""Shared utilities for E2E tests."""

import os
import time
import traceback
from playwright.sync_api import sync_playwright, Page

APP_URL = "http://app:3000"
SCREENSHOT_DIR = "/tmp/screenshots"

USERS = {
    "super_admin": {
        "email": "admin@pricengine.com",
        "password": "admin123",
        "role": "super_admin",
        "redirect": "/dashboard/admin",
    },
    "lab_manager": {
        "email": "sarah@labcorp.com",
        "password": "manager123",
        "role": "lab_manager",
        "redirect": "/dashboard/tests",
    },
    "lab_employee": {
        "email": "staff@labcorp.com",
        "password": "staff123",
        "role": "lab_employee",
        "redirect": "/dashboard/calculator",
    },
}


def login(page: Page, user_key: str) -> None:
    """Log in as the given user and wait for dashboard redirect."""
    user = USERS[user_key]
    page.goto(APP_URL, wait_until="networkidle")
    page.fill('input[type="email"]', user["email"])
    page.fill('input[type="password"]', user["password"])
    page.click('button:has-text("Sign In")')
    page.wait_for_url(f"**{user['redirect']}", timeout=15000)
    page.wait_for_load_state("networkidle")


def run_test(fn, test_name: str) -> bool:
    """Launch a browser, run a test function, screenshot on failure."""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            fn(page)
            print(f"  PASSED: {test_name}")
            browser.close()
            return True
        except Exception as e:
            screenshot_path = f"{SCREENSHOT_DIR}/{test_name}.png"
            try:
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"  Screenshot saved: {screenshot_path}")
            except Exception:
                pass
            print(f"  FAILED: {test_name}")
            print(f"    {e}")
            traceback.print_exc()
            browser.close()
            return False


def unique_name(prefix: str) -> str:
    """Generate a unique name using timestamp to avoid collisions."""
    return f"{prefix}-{int(time.time() * 1000)}"
