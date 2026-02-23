/**
 * Test: WorldScene launch from Admin Dashboard (full game flow)
 */
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    const logs = [];

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') errors.push(text);
        if (text.includes('WorldScene') || text.includes('GridEngine') ||
            text.includes('DEBUG_LAUNCH') || text.includes('GameState not')) {
            logs.push('[' + msg.type() + '] ' + text);
        }
    });
    page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

    // Load with skipBoot to get into game quickly
    await page.goto('http://127.0.0.1:5173/?skipBoot=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check GameState
    const gsStatus = await page.evaluate(() => {
        const gs = window.phaserGame?.scene?.scenes?.[0];
        // Try via global
        const hasState = !!(window.GameState?.state || false);
        return { hasState, stateType: typeof window.GameState };
    });
    console.log('GameState status:', JSON.stringify(gsStatus));

    // Now try to launch WorldScene via the same path as Admin Dashboard
    console.log('\n=== Testing Admin Dashboard path ===');
    const result = await page.evaluate(() => {
        // Import GameState to check
        const mod = window.__artlife_modules;

        // Direct scene start (bypassing GameState check like the headless test above)
        const game = window.phaserGame;
        if (!game) return 'No game';

        // Stop active scenes
        game.scene.scenes.forEach(scene => {
            if (scene.sys.isActive() && scene.sys.settings.key !== 'BootScene') {
                game.scene.stop(scene.sys.settings.key);
            }
        });

        game.scene.start('WorldScene', {});
        return 'started';
    });
    console.log('Launch result:', result);

    await page.waitForTimeout(3000);

    // Check WorldScene is running and canvas is visible
    const finalStatus = await page.evaluate(() => {
        const ws = window.phaserGame?.scene?.getScene('WorldScene');
        const canvas = window.phaserGame?.canvas;
        const container = document.getElementById('phaser-game-container');
        return {
            sceneActive: ws?.sys?.isActive() || false,
            canvasVisible: canvas?.style?.visibility || 'unknown',
            containerVisible: container?.style?.visibility || 'unknown',
            canvasWidth: canvas?.width || 0,
            canvasHeight: canvas?.height || 0,
        };
    });

    console.log('\n=== Final Status ===');
    console.log(JSON.stringify(finalStatus, null, 2));
    console.log('\n=== Errors (' + errors.length + ') ===');
    errors.forEach(e => console.log('  ' + e.substring(0, 200)));
    console.log('\n=== Relevant Logs ===');
    logs.forEach(l => console.log('  ' + l));

    // Take a screenshot
    await page.screenshot({ path: 'tests/reports/screenshots/worldscene_test.png' });
    console.log('\nScreenshot saved to tests/reports/screenshots/worldscene_test.png');

    await browser.close();
    process.exit(errors.length > 0 ? 1 : 0);
})().catch(e => { console.error('Test failed:', e.message); process.exit(1); });
