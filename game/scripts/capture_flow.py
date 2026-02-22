from playwright.sync_api import sync_playwright
import time
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    
    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: logs.append(f"[ERROR] {err}"))
    
    print("Navigating to http://localhost:5173/...")
    page.goto("http://localhost:5173/")
    time.sleep(3)
    
    print("Taking screenshot of boot...")
    page.screenshot(path="screenshot_1_boot.png")
    
    print("Clicking [3] GUEST ACCESS...")
    page.evaluate('''() => {
        const els = Array.from(document.querySelectorAll('div'));
        const el = els.find(d => d.innerText && d.innerText.includes('GUEST ACCESS'));
        if (el) el.click();
    }''')
    time.sleep(2)
    
    print("Clicking [1] SUBMIT NEW APPLICATION...")
    page.evaluate('''() => {
        const els = Array.from(document.querySelectorAll('div'));
        const el = els.find(d => d.innerText && d.innerText.includes('SUBMIT NEW APPLICATION'));
        if (el) el.click();
    }''')
    time.sleep(3)
    
    print("Taking screenshot of TitleScene...")
    page.screenshot(path="screenshot_2_title.png")
    
    print("Pressing '1' key...")
    # Key '1' triggers TitleScene's [1] option
    page.keyboard.press("1")
    time.sleep(2)
    
    print("Taking screenshot of IntroScene...")
    page.screenshot(path="screenshot_3_intro.png")
    
    print("Pressing Escape...")
    page.keyboard.press("Escape")
    time.sleep(3)
    
    print("Taking screenshot of expected CharacterSelectScene...")
    page.screenshot(path="screenshot_4_character_select.png")
    
    print("Console logs:")
    for log in logs:
        if "AudioContext" not in log:
            print(log)
            
    browser.close()
