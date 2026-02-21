/**
 * Quick production build runtime test.
 * Checks that the built app loads without class extension errors.
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://127.0.0.1:5175/?skipBoot=true', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const hasPhaser = await page.evaluate(() => {
        return typeof window.phaserGame !== 'undefined' && window.phaserGame !== null;
    });

    console.log('Phaser loaded:', hasPhaser);

    const classErrors = errors.filter(e => e.includes('Class extends'));
    if (classErrors.length > 0) {
        console.log('FAIL: Class extension errors found:');
        classErrors.forEach(e => console.log('  ', e));
        await browser.close();
        process.exit(1);
    }

    if (!hasPhaser) {
        console.log('FAIL: Phaser did not initialize');
        console.log('All errors:', errors);
        await browser.close();
        process.exit(1);
    }

    console.log('PASS: Production build loads correctly');
    if (errors.length > 0) {
        console.log('Non-fatal errors:', errors.length);
    }
    await browser.close();
    process.exit(0);
})();
