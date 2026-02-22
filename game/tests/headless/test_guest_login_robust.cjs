const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            if (!msg.text().includes('AudioContext')) {
                const text = `[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`;
                console.log(text);
                logs.push(text);
            }
        }
    });

    page.on('pageerror', err => {
        const text = `[PAGE ERROR] ${err.message}`;
        console.log(text);
        logs.push(text);
    });

    await page.goto('http://localhost:5173/');
    console.log("Waiting for boot animation (4s)...");
    await page.waitForTimeout(4000);

    console.log("Clicking Guest Access...");
    await page.click('text="GUEST ACCESS"');
    await page.waitForTimeout(1000);

    console.log("Clicking Submit New Application...");
    await page.click('text="SUBMIT NEW APPLICATION"');
    await page.waitForTimeout(4000);

    const sceneKeys = await page.evaluate(() => {
        if (!window.phaserGame) return 'NO_PHASER';
        return Object.keys(window.phaserGame.scene.keys);
    });
    console.log("Registered Phaser scenes:", sceneKeys);

    const activeScenes = await page.evaluate(() => {
        if (!window.phaserGame) return 'NO_PHASER';
        return window.phaserGame.scene.getScenes(true).map(s => s.sys.settings.key);
    });
    console.log("Active Phaser scenes:", activeScenes);

    await browser.close();
})();
