"""Run all E2E test suites."""

import subprocess
import sys
import os

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

SUITES = [
    "test_smoke.py",
    "test_login.py",
    "test_auth.py",
    "test_admin.py",
    "test_tests.py",
    "test_panels.py",
    "test_calculator.py",
    "test_logs.py",
    "test_analytics.py",
    "test_logout.py",
    "test_user_management.py",
    "test_bulk_upload.py",
    "test_api.py",
    "test_pricing_math.py",
]

failed = []
for suite in SUITES:
    result = subprocess.run(
        [sys.executable, os.path.join(TEST_DIR, suite)],
        cwd=TEST_DIR,
    )
    if result.returncode != 0:
        failed.append(suite)

print("\n" + "=" * 40)
if failed:
    print(f"FAILED suites: {', '.join(failed)}")
    sys.exit(1)
else:
    print(f"ALL {len(SUITES)} SUITES PASSED")
