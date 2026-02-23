/**
 * Full diagnostic: tests boot → login → load → dashboard → haggle → WorldScene
 * Identifies exactly where the flow breaks.
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = [];
    const errors = [];
    page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
    page.on('pageerror', err => errors.push(err.message));

    console.log('=== FULL FLOW DIAGNOSTIC ===\n');

    // 1. Load page
    console.log('1. Loading page...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // 2. Check initial state
    const initial = await page.evaluate(function() {
        var terminal = document.getElementById('terminal');
        var root = document.getElementById('root');
        var container = document.getElementById('phaser-game-container');
        var canvas = document.querySelector('canvas');
        var pg = window.phaserGame;

        // Check what React rendered
        var rootHTML = root ? root.innerHTML.substring(0, 500) : 'N/A';
        var loginVisible = root ? root.querySelector('[class*="boot"]') || root.querySelector('[class*="login"]') || root.querySelector('[class*="terminal"]') : null;

        // Check BootScene
        var bootScene = null;
        if (pg) {
            var scenes = pg.scene.scenes;
            for (var i = 0; i < scenes.length; i++) {
                if (scenes[i].sys.settings.key === 'BootScene') {
                    bootScene = {
                        active: scenes[i].sys.isActive(),
                        status: scenes[i].sys.settings.status,
                    };
                    break;
                }
            }
        }

        return {
            terminal: terminal ? { display: terminal.style.display, childCount: terminal.childElementCount } : 'NOT FOUND',
            container: container ? { visibility: container.style.visibility } : 'NOT FOUND',
            canvas: canvas ? { exists: true, visibility: canvas.style.visibility } : 'NOT FOUND',
            phaserGame: pg ? 'EXISTS' : 'MISSING',
            bootScene: bootScene || 'NOT FOUND',
            startPhaserGame: typeof window.startPhaserGame,
            terminalUIInstance: typeof window.TerminalUIInstance,
            artLifeState: window._artLifeState ? 'EXISTS' : 'NULL',
            rootHasContent: root ? root.innerHTML.length > 0 : false,
            hasLoginUI: !!loginVisible,
        };
    });
    console.log('   Initial state:', JSON.stringify(initial, null, 2));

    // 3. Check TerminalLogin rendering
    console.log('\n2. Checking TerminalLogin UI...');
    const loginCheck = await page.evaluate(function() {
        var root = document.getElementById('root');
        if (!root) return { error: 'No root element' };

        // Look for any visible UI elements
        var allDivs = root.querySelectorAll('div');
        var visibleDivs = [];
        for (var i = 0; i < Math.min(allDivs.length, 20); i++) {
            var d = allDivs[i];
            var text = d.textContent ? d.textContent.trim().substring(0, 80) : '';
            if (text.length > 0 && d.offsetHeight > 0) {
                visibleDivs.push(text);
            }
        }

        // Look for buttons
        var buttons = root.querySelectorAll('button');
        var buttonTexts = [];
        for (var j = 0; j < buttons.length; j++) {
            buttonTexts.push(buttons[j].textContent.trim().substring(0, 50));
        }

        // Check for admin FAB
        var fab = root.querySelector('.admin-fab');

        return {
            totalDivs: allDivs.length,
            visibleTexts: visibleDivs.slice(0, 5),
            buttons: buttonTexts,
            hasFAB: !!fab,
        };
    });
    console.log('   Login UI:', JSON.stringify(loginCheck, null, 2));

    // 4. Check if GameState has save slots
    console.log('\n3. Checking save system...');
    const saveCheck = await page.evaluate(async function() {
        try {
            var mod = await import('/src/managers/GameState.js');
            var GameState = mod.GameState;
            var slots = [];
            for (var i = 0; i < 5; i++) {
                var key = 'artlife_save_' + i;
                var data = localStorage.getItem(key);
                slots.push({
                    slot: i,
                    exists: data !== null,
                    size: data ? data.length : 0,
                });
            }
            var lastSlot = localStorage.getItem('artlife_last_slot');
            var recentSlot = GameState.getMostRecentSlot ? GameState.getMostRecentSlot() : 'N/A';
            return {
                slots: slots,
                lastSlot: lastSlot,
                recentSlot: recentSlot,
                currentState: GameState.state ? { week: GameState.state.week, cash: GameState.state.cash } : null,
            };
        } catch(e) {
            return { error: e.message };
        }
    });
    console.log('   Save system:', JSON.stringify(saveCheck, null, 2));

    // 5. Test quickDemoInit
    console.log('\n4. Testing quickDemoInit...');
    const demoResult = await page.evaluate(async function() {
        try {
            var mod = await import('/src/managers/GameState.js');
            var GameState = mod.GameState;
            GameState.quickDemoInit();
            var state = GameState.state;
            if (!state) return { error: 'quickDemoInit produced null state' };
            return {
                success: true,
                week: state.week,
                cash: state.cash,
                reputation: state.reputation,
                stats: state.stats,
                marketState: state.marketState,
                hasCollection: Array.isArray(state.collection),
                hasNews: Array.isArray(state.news),
            };
        } catch(e) {
            return { error: e.message, stack: e.stack ? e.stack.substring(0, 200) : '' };
        }
    });
    console.log('   Demo init:', JSON.stringify(demoResult, null, 2));

    // 6. Test Admin Dashboard → Haggle Battle flow
    console.log('\n5. Testing Haggle Battle launch...');
    // Open admin
    var devBtn = await page.$('.admin-fab');
    if (devBtn) {
        await devBtn.click();
        await page.waitForTimeout(500);

        // Click SCENES tab
        var scenesTab = await page.$('button:has-text("SCENES")');
        if (scenesTab) {
            await scenesTab.click();
            await page.waitForTimeout(300);
        }

        // Click Haggle Battle
        var haggleBtn = await page.$('button:has-text("Haggle Battle")');
        if (haggleBtn) {
            await haggleBtn.click();
            console.log('   Haggle button clicked');
            await page.waitForTimeout(3000);

            var haggleState = await page.evaluate(function() {
                var pg = window.phaserGame;
                var scenes = pg ? pg.scene.scenes : [];
                var active = [];
                for (var i = 0; i < scenes.length; i++) {
                    if (scenes[i].sys.isActive()) active.push(scenes[i].sys.settings.key);
                }
                var hs = null;
                for (var j = 0; j < scenes.length; j++) {
                    if (scenes[j].sys.settings.key === 'HaggleScene') { hs = scenes[j]; break; }
                }
                var container = document.getElementById('phaser-game-container');
                var canvas = document.querySelector('canvas');
                return {
                    activeScenes: active,
                    haggleScene: hs ? { active: hs.sys.isActive() } : 'NOT FOUND',
                    container: container ? { vis: container.style.visibility } : null,
                    canvas: canvas ? { vis: canvas.style.visibility } : null,
                };
            });
            console.log('   Haggle state:', JSON.stringify(haggleState, null, 2));

            await page.screenshot({ path: 'tests/reports/screenshots/haggle_debug.png' });
            console.log('   Haggle screenshot saved.');
        } else {
            console.log('   Haggle button not found');
        }
    }

    // 7. Print all errors
    if (errors.length > 0) {
        console.log('\n=== PAGE ERRORS ===');
        errors.forEach(function(e) { console.log('  ', e); });
    }

    // Print relevant console logs
    var relevant = logs.filter(function(l) {
        return l.includes('Error') || l.includes('error') || l.includes('PAGE_ERROR') ||
            l.includes('failed') || l.includes('Failed') || l.includes('LAUNCH') ||
            l.includes('BootScene') || l.includes('quickDemo') || l.includes('GameState');
    });
    if (relevant.length > 0) {
        console.log('\n=== RELEVANT LOGS ===');
        relevant.forEach(function(l) { console.log('  ', l); });
    }

    await browser.close();
    console.log('\n=== DONE ===');
})().catch(function(e) { console.error('FATAL:', e); });
