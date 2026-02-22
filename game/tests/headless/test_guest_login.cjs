const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    await page.goto('http://localhost:5173/');
    console.log("Waiting for boot...");
    await page.waitForTimeout(2000);

    // Click Guest Access
    await page.click('text="GUEST ACCESS"');
    console.log("Clicked Guest Access");
    await page.waitForTimeout(500);

    // Click Submit New Application
    await page.click('text="SUBMIT NEW APPLICATION"');
    console.log("Clicked Submit New Application");
    await page.waitForTimeout(3000);

    // Check what scenes are active
    const scenes = await page.evaluate(() => {
        return window.phaserGame?.scene?.getScenes(true).map(s => s.scene.key) || [];
    });
    console.log("Active Phaser scenes:", scenes);

    await browser.close();
})();
