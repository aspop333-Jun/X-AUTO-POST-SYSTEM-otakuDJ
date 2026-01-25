from playwright.sync_api import sync_playwright, expect
import os
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Mock the API
    def handle_route(route):
        print("Intercepted /generate")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "comments": ["Test Comment"], "pattern": {"id": "P01", "name": "Test Pattern Verified"}, "base_scores": {}, "flags": []}'
        )

    page.route("http://localhost:8000/generate", handle_route)

    print("Navigating to app...")
    page.goto("http://localhost:3000", timeout=30000)

    # 1. Fill Event Info
    print("Filling Event Info...")
    textarea = page.get_by_placeholder("イベントHPからコピーしたテキストを貼り付け")
    textarea.fill("Test Event\n2026/01/01\nTest Venue\n#Test")
    page.get_by_role("button", name="テキストを解析").click()
    page.get_by_role("button", name="イベント情報を確定").click()

    # 2. Upload Image
    print("Uploading image...")
    expect(page.get_by_text("② 写真をドロップ")).to_be_visible()
    page.locator("input[type='file']").first.set_input_files("test_images/test.png")

    # 3. Enter Editor via Queue
    print("Waiting for Queue Item...")
    expect(page.get_by_text("名前未設定").first).to_be_visible(timeout=10000)

    print("Clicking Edit...")
    page.locator("button[title='Edit']").first.click(force=True)

    # 4. In Editor
    print("Waiting for Editor...")
    ai_btn = page.get_by_role("button", name="🐯 AI")
    expect(ai_btn).to_be_visible(timeout=10000)

    # 5. Generate
    # Note: It might auto-generate. We check for the toast.
    print("Waiting for Toast (Auto-gen or manual)...")
    toast = page.get_by_text("パターン: Test Pattern Verified").first
    expect(toast).to_be_visible(timeout=10000)

    print("Toast found! Taking screenshot...")
    page.screenshot(path="verification/kotaro_toast_verification.png")

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
