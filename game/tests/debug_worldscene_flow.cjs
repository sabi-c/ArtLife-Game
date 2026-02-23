/**
 * Debug test: Full UI flow - Admin Dashboard → WorldScene
 * Simulates the actual user clicks
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
    page.on('pageerror', err => logs.push('PAGE_ERROR: ' + err.message));

    console.log('1. Loading page...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click the DEV FAB button to open Admin Dashboard
    console.log('2. Opening Admin Dashboard...');
    const devBtn = await page.$('.admin-fab');
    if (devBtn) {
        await devBtn.click();
        await page.waitForTimeout(500);
        console.log('   Admin Dashboard opened');
    } else {
        console.log('   ERROR: DEV button not found');
        await browser.close();
        return;
    }

    // Click "INIT DEMO STATE" if visible
    console.log('3. Initializing demo state...');
    const initBtn = await page.$('button:has-text("INIT DEMO STATE")');
    if (initBtn) {
        await initBtn.click();
        await page.waitForTimeout(500);
        console.log('   Demo state initialized');
    } else {
        console.log('   Demo state button not found (state may already exist)');
    }

    // Click SCENES tab
    console.log('4. Clicking SCENES tab...');
    const scenesTab = await page.$('button:has-text("SCENES")');
    if (scenesTab) {
        await scenesTab.click();
        await page.waitForTimeout(300);
        console.log('   SCENES tab active');
    } else {
        console.log('   ERROR: SCENES tab not found');
    }

    // Click WorldScene button
    console.log('5. Clicking WorldScene button...');
    const wsBtn = await page.$('button:has-text("Pokemon Walk")');
    if (wsBtn) {
        await wsBtn.click();
        console.log('   WorldScene button clicked');
    } else {
        console.log('   ERROR: WorldScene button not found');
        // List all visible buttons for debugging
        const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim().substring(0, 50)));
        console.log('   Available buttons:', buttons);
    }

    // Wait for scene to load
    console.log('6. Waiting 5s for scene...');
    await page.waitForTimeout(5000);

    // Check final state
    const state = await page.evaluate(function() {
        var pg = window.phaserGame;
        var scenes = pg ? pg.scene.scenes : [];
        var ws = null;
        for (var i = 0; i < scenes.length; i++) {
            if (scenes[i].sys.settings.key === 'WorldScene') { ws = scenes[i]; break; }
        }
        var container = document.getElementById('phaser-game-container');
        var canvas = document.querySelector('canvas');
        var terminal = document.getElementById('terminal');
        var activeNames = [];
        for (var j = 0; j < scenes.length; j++) {
            if (scenes[j].sys.isActive()) activeNames.push(scenes[j].sys.settings.key);
        }
        return {
            activeScenes: activeNames,
            worldScene: ws ? {
                active: ws.sys.isActive(),
                hasMap: !!ws.map,
                hasPlayer: !!ws.playerSprite,
                sceneReady: ws._sceneReady,
                createFailed: ws._createFailed,
            } : 'NOT FOUND',
            container: container ? { vis: container.style.visibility, bg: container.style.background } : null,
            canvas: canvas ? { vis: canvas.style.visibility } : null,
            terminal: terminal ? { display: terminal.style.display } : null,
        };
    });

    console.log('\n=== Final State ===');
    console.log(JSON.stringify(state, null, 2));

    var relevant = logs.filter(function(l) {
        return l.includes('WorldScene') || l.includes('DEBUG_LAUNCH') || l.includes('PAGE_ERROR') ||
            l.includes('Error') || l.includes('error') || l.includes('route') || l.includes('PHASER');
    });
    if (relevant.length > 0) {
        console.log('\n=== Relevant logs ===');
        relevant.forEach(function(l) { console.log('  ', l); });
    }

    await page.screenshot({ path: 'tests/reports/screenshots/worldscene_flow.png' });
    console.log('\nScreenshot saved.');

    var ws = state.worldScene;
    if (ws && ws !== 'NOT FOUND' && ws.active && ws.hasMap) {
        var ok = state.container && state.container.vis === 'visible' && state.canvas && state.canvas.vis === 'visible';
        console.log(ok ? '\n✅ PASS - WorldScene visible' : '\n❌ FAIL - Scene works but CANVAS HIDDEN');
    } else {
        console.log('\n❌ FAIL - WorldScene not active');
    }

    await browser.close();
})().catch(function(e) { console.error('FATAL:', e); });
