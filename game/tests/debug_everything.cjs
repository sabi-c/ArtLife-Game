/**
 * COMPREHENSIVE DIAGNOSTIC — Tests every user-facing flow.
 * Captures screenshots at each step so we can see exactly what the user sees.
 */
const { chromium } = require('playwright');
const path = require('path');

const SHOTS = path.join(__dirname, 'reports', 'screenshots');

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });
    console.log(`    📸 ${name}.png`);
}

async function sleep(page, ms) {
    await page.waitForTimeout(ms);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14 size
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    console.log('══════════════════════════════════════════');
    console.log('  ARTLIFE — FULL DIAGNOSTIC REPORT');
    console.log('══════════════════════════════════════════\n');

    // ═══════════════════════════════════════════
    // PHASE 1: Initial Load
    // ═══════════════════════════════════════════
    console.log('PHASE 1: INITIAL LOAD');
    console.log('─────────────────────');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(page, 3000);
    await screenshot(page, '01_initial_load');

    const phase1 = await page.evaluate(function() {
        return {
            hasPhaserGame: !!window.phaserGame,
            hasTerminalUI: !!window.TerminalUIInstance,
            hasStartPhaserGame: typeof window.startPhaserGame === 'function',
            artLifeState: window._artLifeState ? 'EXISTS' : 'NULL',
            rootChildCount: document.getElementById('root') ? document.getElementById('root').childElementCount : 0,
            terminalDisplay: document.getElementById('terminal') ? document.getElementById('terminal').style.display : 'N/A',
            visibleButtons: Array.from(document.querySelectorAll('button')).filter(function(b) { return b.offsetHeight > 0; }).map(function(b) { return b.textContent.trim().substring(0, 30); }),
            bodyText: document.body.innerText.substring(0, 300),
        };
    });
    console.log('  Phaser:', phase1.hasPhaserGame, '| TerminalUI:', phase1.hasTerminalUI);
    console.log('  startPhaserGame:', phase1.hasStartPhaserGame, '| State:', phase1.artLifeState);
    console.log('  Visible buttons:', phase1.visibleButtons);
    console.log('  Body text preview:', phase1.bodyText.substring(0, 100));

    // ═══════════════════════════════════════════
    // PHASE 2: Wait for boot animation, then check login screen
    // ═══════════════════════════════════════════
    console.log('\nPHASE 2: BOOT → LOGIN SCREEN');
    console.log('─────────────────────────────');
    // Click to skip boot animation
    await page.click('body');
    await sleep(page, 1000);
    await screenshot(page, '02_after_boot_click');

    const phase2 = await page.evaluate(function() {
        var buttons = Array.from(document.querySelectorAll('button')).filter(function(b) { return b.offsetHeight > 0; });
        return {
            visibleButtons: buttons.map(function(b) { return b.textContent.trim().substring(0, 40); }),
            bodyText: document.body.innerText.substring(0, 500),
        };
    });
    console.log('  Visible buttons:', phase2.visibleButtons);
    console.log('  Screen text:', phase2.bodyText.substring(0, 200));

    // ═══════════════════════════════════════════
    // PHASE 3: Navigate to Guest → Primary Menu
    // ═══════════════════════════════════════════
    console.log('\nPHASE 3: GUEST ACCESS → PRIMARY MENU');
    console.log('──────────────────────────────────────');

    // Look for Guest option and click it
    var guestBtn = await page.$('div:has-text("GUEST ACCESS")');
    if (!guestBtn) {
        // Try clicking by keyboard
        await page.keyboard.press('ArrowDown');
        await sleep(page, 200);
        await page.keyboard.press('ArrowDown');
        await sleep(page, 200);
        await page.keyboard.press('Enter');
        await sleep(page, 500);
    } else {
        await guestBtn.click();
        await sleep(page, 500);
    }
    await screenshot(page, '03_after_guest');

    const phase3 = await page.evaluate(function() {
        var buttons = Array.from(document.querySelectorAll('button')).filter(function(b) { return b.offsetHeight > 0; });
        return {
            visibleButtons: buttons.map(function(b) { return b.textContent.trim().substring(0, 40); }),
            bodyText: document.body.innerText.substring(0, 500),
        };
    });
    console.log('  Visible buttons:', phase3.visibleButtons);
    console.log('  Screen text:', phase3.bodyText.substring(0, 200));

    // ═══════════════════════════════════════════
    // PHASE 4: Start New Game
    // ═══════════════════════════════════════════
    console.log('\nPHASE 4: START NEW GAME');
    console.log('───────────────────────');
    // Press Enter on "NEW GAME" (should be first option)
    await page.keyboard.press('Enter');
    await sleep(page, 3000);
    await screenshot(page, '04_new_game_auth');

    const phase4 = await page.evaluate(function() {
        var pg = window.phaserGame;
        var active = [];
        if (pg) {
            pg.scene.scenes.forEach(function(s) {
                if (s.sys.isActive()) active.push(s.sys.settings.key);
            });
        }
        return {
            activeScenes: active,
            artLifeState: window._artLifeState ? { week: window._artLifeState.week, cash: window._artLifeState.cash } : 'NULL',
            containerVis: document.getElementById('phaser-game-container') ? document.getElementById('phaser-game-container').style.visibility : 'N/A',
            canvasVis: document.querySelector('canvas') ? document.querySelector('canvas').style.visibility : 'N/A',
            bodyText: document.body.innerText.substring(0, 200),
        };
    });
    console.log('  Active scenes:', phase4.activeScenes);
    console.log('  State:', JSON.stringify(phase4.artLifeState));
    console.log('  Container vis:', phase4.containerVis, '| Canvas vis:', phase4.canvasVis);

    // ═══════════════════════════════════════════
    // PHASE 5: Admin Dashboard → WorldScene
    // ═══════════════════════════════════════════
    console.log('\nPHASE 5: ADMIN → WORLDSCENE');
    console.log('────────────────────────────');

    // Open Admin Dashboard
    var fab = await page.$('.admin-fab');
    if (fab) {
        await fab.click();
        await sleep(page, 500);

        // Init demo state
        var initBtn = await page.$('button:has-text("INIT DEMO STATE")');
        if (initBtn) {
            await initBtn.click();
            await sleep(page, 500);
            console.log('  Demo state initialized');
        }

        // Go to SCENES tab
        var scenesTab = await page.$('button:has-text("SCENES")');
        if (scenesTab) {
            await scenesTab.click();
            await sleep(page, 300);
        }

        await screenshot(page, '05_admin_scenes');

        // Click WorldScene
        var wsBtn = await page.$('button:has-text("Pokemon Walk")');
        if (wsBtn) {
            await wsBtn.click();
            console.log('  WorldScene button clicked');
            await sleep(page, 4000);
        } else {
            console.log('  ❌ WorldScene button NOT FOUND');
        }
    } else {
        console.log('  ❌ Admin FAB not found');
    }

    await screenshot(page, '06_worldscene');

    const phase5 = await page.evaluate(function() {
        var pg = window.phaserGame;
        var active = [];
        if (pg) {
            pg.scene.scenes.forEach(function(s) {
                if (s.sys.isActive()) active.push(s.sys.settings.key);
            });
        }
        var ws = null;
        if (pg) {
            for (var i = 0; i < pg.scene.scenes.length; i++) {
                if (pg.scene.scenes[i].sys.settings.key === 'WorldScene') {
                    var s = pg.scene.scenes[i];
                    ws = { active: s.sys.isActive(), hasMap: !!s.map, hasPlayer: !!s.playerSprite, ready: s._sceneReady, failed: s._createFailed };
                    break;
                }
            }
        }
        return {
            activeScenes: active,
            worldScene: ws || 'NOT FOUND',
            containerVis: document.getElementById('phaser-game-container') ? document.getElementById('phaser-game-container').style.visibility : 'N/A',
            canvasVis: document.querySelector('canvas') ? document.querySelector('canvas').style.visibility : 'N/A',
            terminalDisplay: document.getElementById('terminal') ? document.getElementById('terminal').style.display : 'N/A',
        };
    });
    console.log('  Active scenes:', phase5.activeScenes);
    console.log('  WorldScene:', JSON.stringify(phase5.worldScene));
    console.log('  Container:', phase5.containerVis, '| Canvas:', phase5.canvasVis, '| Terminal:', phase5.terminalDisplay);

    // ═══════════════════════════════════════════
    // PHASE 6: Go back, try Haggle
    // ═══════════════════════════════════════════
    console.log('\nPHASE 6: HAGGLE BATTLE');
    console.log('──────────────────────');

    // Press ESC to exit WorldScene
    await page.keyboard.press('Escape');
    await sleep(page, 1000);

    // Open admin again
    fab = await page.$('.admin-fab');
    if (fab) {
        await fab.click();
        await sleep(page, 500);
        var scenesTab2 = await page.$('button:has-text("SCENES")');
        if (scenesTab2) await scenesTab2.click();
        await sleep(page, 300);

        var haggleBtn = await page.$('button:has-text("Haggle Battle")');
        if (haggleBtn) {
            await haggleBtn.click();
            console.log('  Haggle button clicked');
            await sleep(page, 3000);
        }
    }

    await screenshot(page, '07_haggle');

    const phase6 = await page.evaluate(function() {
        var pg = window.phaserGame;
        var active = [];
        if (pg) {
            pg.scene.scenes.forEach(function(s) {
                if (s.sys.isActive()) active.push(s.sys.settings.key);
            });
        }
        return {
            activeScenes: active,
            containerVis: document.getElementById('phaser-game-container') ? document.getElementById('phaser-game-container').style.visibility : 'N/A',
            canvasVis: document.querySelector('canvas') ? document.querySelector('canvas').style.visibility : 'N/A',
        };
    });
    console.log('  Active scenes:', phase6.activeScenes);
    console.log('  Container:', phase6.containerVis, '| Canvas:', phase6.canvasVis);

    // ═══════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('══════════════════════════════════════════');

    if (consoleErrors.length > 0) {
        console.log('\n  CONSOLE ERRORS (' + consoleErrors.length + '):');
        consoleErrors.slice(0, 10).forEach(function(e) { console.log('    ❌ ' + e.substring(0, 120)); });
    } else {
        console.log('\n  ✅ No console errors');
    }

    if (pageErrors.length > 0) {
        console.log('\n  PAGE ERRORS (' + pageErrors.length + '):');
        pageErrors.forEach(function(e) { console.log('    ❌ ' + e.substring(0, 120)); });
    } else {
        console.log('\n  ✅ No page errors');
    }

    console.log('\n  VERDICTS:');
    console.log('    Boot flow:    ' + (phase2.visibleButtons.length > 1 ? '✅' : '❌'));
    console.log('    WorldScene:   ' + (phase5.worldScene && phase5.worldScene.active ? '✅ active' : '❌ NOT active'));
    console.log('    Canvas vis:   ' + (phase5.canvasVis === 'visible' ? '✅' : '❌ ' + phase5.canvasVis));
    console.log('    Haggle:       ' + (phase6.activeScenes.includes('HaggleScene') ? '✅' : '❌ NOT active'));

    await browser.close();
    console.log('\n  Screenshots saved to tests/reports/screenshots/');
    console.log('══════════════════════════════════════════');
})().catch(function(e) { console.error('FATAL:', e); });
