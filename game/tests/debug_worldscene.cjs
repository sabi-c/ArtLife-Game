const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const logs = [];
    const errors = [];

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' || text.includes('WorldScene') || text.includes('GridEngine') || text.includes('DEBUG_LAUNCH') || text.includes('Error')) {
            logs.push('[' + msg.type() + '] ' + text);
        }
    });
    page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

    console.log('Loading page...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check game state before launch
    const before = await page.evaluate(() => {
        if (!window.phaserGame) return { error: 'No phaserGame on window' };
        const scenes = window.phaserGame.scene.scenes;
        const ws = scenes.find(s => s.sys.settings.key === 'WorldScene');
        return {
            sceneKeys: Object.keys(window.phaserGame.scene.keys),
            activeScenes: scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key),
            gridEngineOnWS: ws ? !!ws.gridEngine : 'scene not found',
            canvasExists: !!window.phaserGame.canvas,
        };
    });
    console.log('Before launch:', JSON.stringify(before, null, 2));

    // Launch WorldScene
    console.log('Launching WorldScene...');
    await page.evaluate(() => {
        // Import GameEventBus
        const evBus = document.querySelector('#root');
        // Try direct approach
        if (window.phaserGame) {
            // Stop all active scenes
            window.phaserGame.scene.scenes.forEach(scene => {
                if (scene.sys.isActive() && scene.sys.settings.key !== 'BootScene') {
                    window.phaserGame.scene.stop(scene.sys.settings.key);
                }
            });
            // Start WorldScene directly
            window.phaserGame.scene.start('WorldScene', {});
        }
    });

    await page.waitForTimeout(4000);

    // Check after launch
    const after = await page.evaluate(() => {
        const scenes = window.phaserGame.scene.scenes;
        const ws = scenes.find(s => s.sys.settings.key === 'WorldScene');
        return {
            activeScenes: scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key),
            worldSceneActive: ws ? ws.sys.isActive() : false,
            gridEngineOnWS: ws ? !!ws.gridEngine : false,
            hasMap: ws ? !!ws.map : false,
            hasPlayerSprite: ws ? !!ws.playerSprite : false,
            createFailed: ws ? ws._createFailed : 'unknown',
            sceneReady: ws ? ws._sceneReady : 'unknown',
            readyEmitted: ws ? ws._readyEmitted : 'unknown',
        };
    });
    console.log('After launch:', JSON.stringify(after, null, 2));
    console.log('\nConsole logs:');
    logs.forEach(l => console.log('  ', l));
    console.log('\nPage errors:');
    errors.forEach(e => console.log('  ', e));

    await page.screenshot({ path: 'tests/reports/screenshots/worldscene_debug.png' });
    console.log('\nScreenshot saved to tests/reports/screenshots/worldscene_debug.png');

    await browser.close();
})().catch(e => console.error('FATAL:', e));
