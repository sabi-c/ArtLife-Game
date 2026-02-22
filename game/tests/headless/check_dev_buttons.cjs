const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('Navigating to game...');
    await page.goto('http://localhost:5173/?skipBoot=true', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Give React and Phaser time to render

    // 1. Open Admin Dashboard
    console.log('Opening Admin Dashboard (~)...');
    await page.keyboard.press('`');
    await page.waitForTimeout(1000);

    // 2. Screenshot UI Tab
    await page.screenshot({ path: 'reports/admin_ui_tab.png' });
    console.log('Saved screenshot to reports/admin_ui_tab.png');

    // 3. Switch to Phaser Tab
    console.log('Clicking PHASER SCENES tab...');
    await page.click('text=PHASER SCENES');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'reports/admin_phaser_tab.png' });
    console.log('Saved screenshot to reports/admin_phaser_tab.png');

    // 4. Click Haggle Battle
    console.log('Launching Haggle Battle from Dev Tools...');
    await page.click('text=[ Launch: Haggle Battle (Shark) ]');
    await page.waitForTimeout(4000); // Wait for animations to settle

    // Check if canvas is visible
    await page.screenshot({ path: 'reports/dev_haggle_battle.png' });
    console.log('Saved screenshot to reports/dev_haggle_battle.png');

    await browser.close();
})();
