const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '../reports/live_view');
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

(async () => {
    console.log('\n═══════════════════════════════════════');
    console.log('  ArtLife — Live View Snapshotter');
    console.log('  Taking screenshots every 3 seconds...');
    console.log('═══════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const testPort = process.env.TEST_PORT || '5175';

    try {
        await page.goto(`http://127.0.0.1:${testPort}?skipBoot=true`, { waitUntil: 'networkidle' });
        console.log('Connected to dev server.');

        // Wait for phaser to boot up
        await page.waitForTimeout(3000);

        // Jump straight to overworld for testing
        await page.evaluate(() => {
            if (window.GameEventBus && window.GameEvents) {
                window.GameEventBus.emit(window.GameEvents.DEBUG_LAUNCH_SCENE, 'NewWorldScene');
            }
        });

        console.log('Launched NewWorldScene. Starting snapshot loop...');

        let counter = 1;
        while (true) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filepath = path.join(REPORT_DIR, `snapshot_${String(counter).padStart(3, '0')}_${timestamp}.png`);

            await page.screenshot({ path: filepath });
            console.log(`[+] Captured: ${filepath}`);

            counter++;
            await page.waitForTimeout(3000); // Wait 3 seconds
        }
    } catch (err) {
        console.error('Live view error:', err);
    } finally {
        await browser.close();
    }
})();
