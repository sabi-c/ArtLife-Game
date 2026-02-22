const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => { 
        if (msg.type() === 'error' || msg.type() === 'warning') {
            if (!msg.text().includes('AudioContext')) {
                console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`); 
            }
        }
    });
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
    await page.goto('http://localhost:5173/');
    console.log("Waiting for boot animation (4s)...");
    await page.waitForTimeout(4000);
    console.log("Clicking Guest Access...");
    await page.click('text="GUEST ACCESS"');
    await page.waitForTimeout(1000);
    console.log("Clicking Submit New Application...");
    await page.click('text="SUBMIT NEW APPLICATION"');
    await page.waitForTimeout(3000);
    const scenes = await page.evaluate(() => {
        return window.phaserGame ? window.phaserGame.scene.getScenes(true).map(s => s.scene.key) : 'NO PHASER';
    });
    console.log("Active Phaser scenes:", scenes);
    await browser.close();
})();
