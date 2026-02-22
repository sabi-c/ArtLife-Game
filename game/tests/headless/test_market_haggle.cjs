const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}?skipBoot=true`;

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Wait for terminal dashboard to load
        await page.waitForSelector('.pd-options', { timeout: 5000 });
        console.log('Terminal dashboard loaded.');

        // Need cash to ensure we can afford "Art Market" items to see them?
        // Wait! We can cheat cash via evaluating window.game
        await page.evaluate(() => {
            if (window._artLifeState) {
                window._artLifeState.cash = 1000000;
                window._artLifeState.access = 100;
                const { GameState } = require('./src/managers/GameState.js');
                if (window.TerminalUIInstance) window.TerminalUIInstance.render();
            }
        });

        // 1. Click "Browse Global Market"
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.pd-option-btn'));
            const marketBtn = btns.find(b => b.textContent.includes('Browse Global Market'));
            if (marketBtn) marketBtn.click();
        });
        await page.waitForTimeout(500);

        // 2. Click the first art piece "Inspect"
        let inspectBtnText = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.pd-option-btn'));
            const inspectBtn = btns.find(b => b.textContent.includes('Inspect'));
            if (inspectBtn) {
                inspectBtn.click();
                return inspectBtn.textContent;
            }
            return null;
        });
        console.log(`Clicked: ${inspectBtnText}`);
        await page.waitForTimeout(500);

        // 3. Click Haggle
        let haggleHit = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.pd-option-btn'));
            const haggleBtn = btns.find(b => b.textContent.includes('Haggle'));
            if (haggleBtn) {
                haggleBtn.click();
                return true;
            }
            return false;
        });

        if (!haggleHit) {
            console.error('Could not find Haggle button!');
            const text = await page.evaluate(() => document.body.innerText);
            console.log("Current page text:", text.substring(0, 500));
            throw new Error('Haggle button missing');
        }

        console.log('Clicked Haggle button.');
        await page.waitForTimeout(1000);

        // Verify HaggleScene is active
        const isHaggleActive = await page.evaluate(() => {
            return window.phaserGame.scene.scenes.some(s => s.sys.settings.key === 'HaggleScene' && s.sys.isActive());
        });

        if (isHaggleActive) {
            console.log('✅ HaggleScene successfully launched from Market!');
            await page.screenshot({ path: 'reports/market_haggle_success.png' });
        } else {
            console.error('❌ HaggleScene did not launch!');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
