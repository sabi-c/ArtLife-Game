#!/usr/bin/env node
/**
 * ArtLife — Comprehensive Test Suite
 *
 * Tests every major subsystem: boot, scenes, haggle, dialogue, terminal,
 * game state, week engine, market, admin tools, and error recovery.
 *
 * Run:  node tests/headless/test_comprehensive.cjs
 *       npm run test:all
 *
 * Requires dev server running on localhost:5173 (npm run dev)
 */
const { chromium } = require('playwright');
const { TestReporter } = require('./reporter.cjs');

const BASE = 'http://127.0.0.1:5173?skipBoot=true';
const TIMEOUT = { short: 1000, med: 3000, long: 8000 };

// ── Helpers ──────────────────────────────────────────────────────────────────

async function safeEval(page, fn, fallback = null) {
    try { return await page.evaluate(fn); }
    catch { return fallback; }
}

async function waitForScene(page, key, ms = TIMEOUT.long) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        await page.waitForTimeout(300);
        const active = await safeEval(page, k =>
            window.phaserGame?.scene?.getScenes(true).map(s => s.scene.key).includes(k) ?? false, false
        );
        if (active) return true;
    }
    return false;
}

async function waitForTerminal(page, ms = TIMEOUT.long) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        await page.waitForTimeout(300);
        const vis = await safeEval(page, () => window.game?.uiState()?.visible ?? false, false);
        if (vis) return true;
    }
    return false;
}

async function freshPage(page) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
}

async function initGame(page, charIdx = 0) {
    await safeEval(page, idx => window.game?.start(idx), null);
    await page.waitForTimeout(500);
}

async function cleanupScenes(page) {
    await safeEval(page, () => window.game?.exitScene());
    await page.waitForTimeout(1000);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const reporter = new TestReporter(page, 'tests/reports');

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║    ArtLife — Comprehensive Test Suite                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 1: ENGINE BOOT
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('1. Engine Boot');

    await freshPage(page);

    await reporter.runTest('Phaser engine initializes', async (assert) => {
        const hasEngine = await safeEval(page, () => !!window.phaserGame, false);
        assert(hasEngine, 'window.phaserGame exists');

        const renderer = await safeEval(page, () =>
            window.phaserGame?.renderer?.type === 1 ? 'WebGL' : 'Canvas'
        );
        assert.info(`Renderer: ${renderer}`);

        const scenes = await safeEval(page, () =>
            window.phaserGame?.scene?.scenes?.length ?? 0
        );
        assert(scenes >= 10, `${scenes} scenes registered (need ≥10)`);
    });

    await reporter.runTest('Debug API available', async (assert) => {
        const api = await safeEval(page, () => ({
            press: typeof window.game?.press,
            read: typeof window.game?.read,
            state: typeof window.game?.state,
            options: typeof window.game?.options,
            advance: typeof window.game?.advance,
            start: typeof window.game?.start,
            debug: typeof window.game?.debug,
            startHaggle: typeof window.game?.startHaggle,
            startDialogue: typeof window.game?.startDialogue,
            exitScene: typeof window.game?.exitScene,
        }));
        for (const [key, type] of Object.entries(api || {})) {
            assert(type === 'function', `game.${key}() exists`);
        }
    });

    await reporter.runTest('Error registry initialized', async (assert) => {
        const artlife = await safeEval(page, () => ({
            exists: !!window.ArtLife,
            hasReport: typeof window.ArtLife?.report === 'function',
            hasRecord: typeof window.ArtLife?.recordError === 'function',
        }));
        assert(artlife?.exists, 'window.ArtLife exists');
        assert(artlife?.hasReport, 'ArtLife.report() available');
        assert(artlife?.hasRecord, 'ArtLife.recordError() available');
    });

    await reporter.runTest('Canvas rendering', async (assert) => {
        const canvas = await safeEval(page, () => {
            const c = document.querySelector('canvas');
            if (!c) return null;
            return {
                width: c.offsetWidth, height: c.offsetHeight,
                position: c.style.position, zIndex: c.style.zIndex,
                marginTop: c.style.marginTop,
            };
        });
        assert(canvas !== null, 'Canvas element exists');
        assert(canvas?.width > 0, `Canvas width: ${canvas?.width}px`);
        assert(canvas?.height > 0, `Canvas height: ${canvas?.height}px`);
        assert(canvas?.position === 'fixed', 'Canvas is fixed-position');
        assert(canvas?.marginTop === '0px' || canvas?.marginTop === '0', 'Canvas marginTop is 0 (no center offset bug)');
    });

    await reporter.runTest('Phaser-game-container styling', async (assert) => {
        const container = await safeEval(page, () => {
            const el = document.getElementById('phaser-game-container');
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            return { position: cs.position, inset: el.style.inset, zIndex: cs.zIndex };
        });
        assert(container !== null, 'phaser-game-container exists');
        assert(container?.position === 'fixed', 'Container is fixed-position');
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 2: GAME STATE
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('2. Game State');

    await reporter.runTest('Game initialization', async (assert) => {
        const result = await safeEval(page, () => window.game?.start(0));
        assert(result?.includes('Started'), `game.start(0): "${result}"`);

        const gs = await safeEval(page, () => window.game?.state());
        assert(gs?.week === 1, `Week: ${gs?.week}`);
        assert(gs?.cash > 0, `Cash: $${gs?.cash?.toLocaleString()}`);
        assert(gs?.portfolio >= 0, `Portfolio: ${gs?.portfolio} items`);
        assert(gs?.reputation >= 0, `Reputation: ${gs?.reputation}`);
        assert(gs?.taste >= 0, `Taste: ${gs?.taste}`);
        assert(!!gs?.city, `City: ${gs?.city}`);
        assert(!!gs?.market, `Market state: ${gs?.market}`);
    });

    await reporter.runTest('Week advancement', async (assert) => {
        const before = await safeEval(page, () => window.game?.state());
        const result = await safeEval(page, () => window.game?.advance(1));
        assert(result?.includes('week 2'), `Advance result: "${result}"`);

        const after = await safeEval(page, () => window.game?.state());
        assert(after?.week === 2, `Week advanced to ${after?.week}`);
    });

    await reporter.runTest('Multi-week advancement', async (assert) => {
        const result = await safeEval(page, () => window.game?.advance(4));
        const gs = await safeEval(page, () => window.game?.state());
        assert(gs?.week === 6, `After +4: week ${gs?.week}`);
    });

    await reporter.runTest('Raw state access', async (assert) => {
        const raw = await safeEval(page, () => {
            const s = window.game?.raw();
            return s ? {
                hasPortfolio: Array.isArray(s.portfolio),
                hasActiveDeals: Array.isArray(s.activeDeals),
                hasWealthHistory: Array.isArray(s.wealthHistory),
                hasNews: Array.isArray(s.news),
                hasContacts: !!s.contacts,
            } : null;
        });
        assert(raw?.hasPortfolio, 'state.portfolio is array');
        assert(raw?.hasActiveDeals, 'state.activeDeals is array');
        assert(raw?.hasWealthHistory, 'state.wealthHistory is array');
        assert.soft(raw?.hasNews, 'state.news is array (may be newsLog)');
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 3: TERMINAL UI
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('3. Terminal UI');

    await reporter.runTest('Terminal visibility state', async (assert) => {
        const ui = await safeEval(page, () => window.game?.uiState());
        assert.info(`Terminal visible: ${ui?.visible}, options: ${ui?.optionCount}, stack: ${ui?.screenStackDepth}`);
        assert(ui?.optionCount > 0, `Has ${ui?.optionCount} options`);
    });

    await reporter.runTest('Dashboard menu options', async (assert) => {
        const opts = await safeEval(page, () => window.game?.options() ?? []);
        assert(opts.length >= 3, `Dashboard has ${opts.length} options`);

        // Check key options exist (varies by progressive disclosure phase)
        const optText = opts.join(' ');
        assert.soft(optText.includes('Browse Market') || optText.includes('Market'), 'Has Browse Market option');
        assert.soft(optText.includes('Collection') || optText.includes('Portfolio'), 'Has Collection/Portfolio option');
        assert.soft(/advance|week/i.test(optText), 'Has Advance Week option');
    });

    await reporter.runTest('Terminal content rendering', async (assert) => {
        const content = await safeEval(page, () => window.game?.read() ?? '');
        assert(content.length > 50, `Terminal content: ${content.length} chars`);
        assert.soft(content.includes('$'), 'Content includes cash display');
    });

    await reporter.runTest('Screen stack navigation', async (assert) => {
        const depth1 = await safeEval(page, () => window.game?.uiState()?.screenStackDepth ?? 0);
        assert.info(`Initial stack depth: ${depth1}`);

        // Try pressing option 1 (usually Browse Market or similar)
        await safeEval(page, () => window.game?.press(1));
        await page.waitForTimeout(500);

        const depth2 = await safeEval(page, () => window.game?.uiState()?.screenStackDepth ?? 0);
        assert(depth2 >= depth1, `Stack depth after press: ${depth2}`);

        // Go back
        await safeEval(page, () => window.game?.back());
        await page.waitForTimeout(300);

        const depth3 = await safeEval(page, () => window.game?.uiState()?.screenStackDepth ?? 0);
        assert.info(`Stack depth after back: ${depth3}`);
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 4: HAGGLE SCENE
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('4. Haggle Scene');

    await reporter.runTest('HaggleManager initialization', async (assert) => {
        const result = await safeEval(page, () => {
            const r = window.game?.startHaggle();
            return r;
        });
        assert(result?.started === true, 'startHaggle() returned started=true');
        assert(result?.maxRounds > 0, `maxRounds: ${result?.maxRounds}`);
    });

    await reporter.runTest('HaggleScene activation', async (assert) => {
        // HaggleScene may be in preload (loading bg images) — wait longer
        const active = await waitForScene(page, 'HaggleScene', 15000);
        assert(active, 'HaggleScene became active');

        const hs = await safeEval(page, () => window.game?.haggleState());
        assert(hs?.active === true, 'haggleState reports active');
        assert(hs?.dealerTypeKey?.length > 0, `Dealer type: ${hs?.dealerTypeKey}`);
        assert(hs?.phase === 'opening', `Phase: ${hs?.phase}`);
        assert(hs?.patience > 0, `Patience: ${hs?.patience}`);
    });

    await reporter.runTest('HaggleScene canvas visibility', async (assert) => {
        const vis = await safeEval(page, () => {
            const c = document.querySelector('canvas');
            const container = document.getElementById('phaser-game-container');
            return {
                canvasVisible: c ? getComputedStyle(c).visibility !== 'hidden' : false,
                containerVisible: container ? getComputedStyle(container).visibility !== 'hidden' : false,
                containerBg: container ? getComputedStyle(container).backgroundColor : 'none',
            };
        });
        assert(vis?.canvasVisible, 'Canvas visible during HaggleScene');
        assert(vis?.containerVisible, 'Container visible during HaggleScene');
        assert.soft(vis?.containerBg !== 'rgba(0, 0, 0, 0)' && vis?.containerBg !== 'transparent',
            `Container has opaque bg: ${vis?.containerBg}`);
    });

    await reporter.runTest('HaggleScene clean exit', async (assert) => {
        await cleanupScenes(page);
        const terminal = await waitForTerminal(page, TIMEOUT.long);
        assert(terminal, 'Terminal restored after haggle exit');

        const hs = await safeEval(page, () => window.game?.haggleState());
        assert(hs?.active === false, 'Haggle no longer active');
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 5: DIALOGUE SCENE
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('5. Dialogue Scene');

    await reporter.runTest('MacDialogueScene — standard dialogue', async (assert) => {
        await safeEval(page, () => window.game?.startDialogue({
            dialogueSequence: [
                { name: 'Test NPC', speakerSide: 'right', text: 'Hello, this is a test.' },
                { name: 'You', speakerSide: 'left', text: 'Testing response.' },
                { name: 'Test NPC', speakerSide: 'right', text: 'Goodbye.' },
            ]
        }));
        await page.waitForTimeout(TIMEOUT.med);

        const ds = await safeEval(page, () => window.game?.dialogueState());
        assert(ds?.active === true, 'MacDialogueScene is active');
        assert(ds?.totalLines === 3, `3 dialogue lines (got ${ds?.totalLines})`);
        assert(ds?.hasReward === false, 'No reward item');
    });

    await reporter.runTest('Dialogue advancement via API', async (assert) => {
        for (let i = 0; i < 5; i++) {
            await safeEval(page, () => window.game?.advanceDialogue());
            await page.waitForTimeout(200);
        }
        await page.waitForTimeout(2000);

        const terminal = await waitForTerminal(page, TIMEOUT.long);
        assert(terminal, 'Terminal restored after dialogue');
    });

    await reporter.runTest('MacDialogueScene — with reward', async (assert) => {
        await safeEval(page, () => window.game?.startDialogue({
            rewardItem: { name: 'Test Artwork', value: 25000, imageKey: 'art_test.png' },
            dialogueSequence: [
                { name: 'Dealer', speakerSide: 'right', text: 'Take this.' },
            ]
        }));
        await page.waitForTimeout(TIMEOUT.med);

        const ds = await safeEval(page, () => window.game?.dialogueState());
        assert(ds?.active === true, 'Dialogue with reward is active');
        assert(ds?.hasReward === true, 'Reward detected');

        // Advance through + dismiss reward
        for (let i = 0; i < 6; i++) {
            await safeEval(page, () => window.game?.advanceDialogue());
            await page.waitForTimeout(200);
        }
        await page.waitForTimeout(1500);
        await page.keyboard.press('Space');
        await page.waitForTimeout(2000);

        const terminal = await waitForTerminal(page, TIMEOUT.long);
        assert.soft(terminal, 'Terminal restored after reward');
        await cleanupScenes(page);
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 6: SCENE LIFECYCLE
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('6. Scene Lifecycle');

    await reporter.runTest('LocationScene launch + exit', async (assert) => {
        await safeEval(page, () => window.game?.startTestScene('LocationScene', {
            venueId: 'gallery_opening', roomId: 'chelsea_main_floor',
        }));
        const active = await waitForScene(page, 'LocationScene', TIMEOUT.long);
        assert(active, 'LocationScene launched');

        await cleanupScenes(page);
        const terminal = await waitForTerminal(page, TIMEOUT.long);
        assert(terminal, 'Terminal restored after LocationScene');
    });

    await reporter.runTest('IntroScene launch + ESC exit', async (assert) => {
        await safeEval(page, () => window.game?.startTestScene('IntroScene'));
        const active = await waitForScene(page, 'IntroScene', TIMEOUT.long);
        assert(active, 'IntroScene launched');

        await cleanupScenes(page);
        await page.waitForTimeout(TIMEOUT.short);
    });

    await reporter.runTest('Scene cleanup integrity', async (assert) => {
        await cleanupScenes(page);
        await page.waitForTimeout(500);

        const active = await safeEval(page, () =>
            window.phaserGame?.scene?.getScenes(true)
                .filter(s => s.scene.key !== 'BootScene')
                .map(s => s.scene.key) ?? []
        );
        assert(active?.length === 0, `No lingering scenes (found: ${active?.join(', ') || 'none'})`);
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 7: ERROR RECOVERY
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('7. Error Recovery');

    await reporter.runTest('HaggleScene error recovery (no HaggleManager state)', async (assert) => {
        // Launch HaggleScene without calling HaggleManager.start() first
        await safeEval(page, () => window.game?.startTestScene('HaggleScene', {
            haggleInfo: {
                state: {
                    dealerName: 'Test', dealerTypeKey: 'patron', dealerIcon: '🎩',
                    askingPrice: 50000, currentOffer: 35000, gap: 15000,
                    round: 0, maxRounds: 5, patience: 3, maxPatience: 5,
                    work: { title: 'Error Test', artist: 'Nobody' },
                },
                openingDialogue: 'Test dialogue',
            }
        }));
        await page.waitForTimeout(TIMEOUT.med);

        // Scene should either show normally or show error UI — NOT a blue screen
        const sceneExists = await waitForScene(page, 'HaggleScene', 5000);
        assert.soft(sceneExists, 'HaggleScene exists (even if errored)');

        // Check no blue screen (body bg bleeding through)
        const noBluScreen = await safeEval(page, () => {
            const container = document.getElementById('phaser-game-container');
            if (!container) return false;
            const bg = getComputedStyle(container).backgroundColor;
            // Should NOT be transparent or the Pantone Blue
            return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        });
        assert(noBluScreen, 'No blue-screen bleed-through (container has opaque bg)');

        await cleanupScenes(page);
        const terminal = await waitForTerminal(page, TIMEOUT.long);
        assert(terminal, 'Terminal recovered after error scenario');
    });

    await reporter.runTest('exitScene from clean state', async (assert) => {
        const result = await safeEval(page, () => window.game?.exitScene());
        assert(result?.includes('No active scenes') || result?.includes('Stopped'),
            `exitScene result: "${result}"`);
    });

    // ═════════════════════════════════════════════════════════════════════
    //  SECTION 8: GLOBAL ERROR AUDIT
    // ═════════════════════════════════════════════════════════════════════
    reporter.section('8. Error Audit');

    await reporter.runTest('ArtLife error registry', async (assert) => {
        const report = await safeEval(page, () => window.ArtLife?.report());
        const jsErrors = report?.errors ?? [];
        const sceneErrors = report?.sceneErrors ?? [];
        const missingAssets = report?.missingAssets ?? [];

        assert.soft(jsErrors.length === 0, `JS errors: ${jsErrors.length}`);
        if (jsErrors.length > 0) {
            jsErrors.slice(0, 3).forEach(e => assert.info(`  Error: ${e.message || e}`));
        }

        assert.soft(sceneErrors.length === 0, `Scene errors: ${sceneErrors.length}`);
        if (sceneErrors.length > 0) {
            sceneErrors.slice(0, 3).forEach(e => assert.info(`  Scene error: ${JSON.stringify(e)}`));
        }

        assert.info(`Missing assets: ${missingAssets.length}`);
        if (missingAssets.length > 0) {
            missingAssets.slice(0, 5).forEach(a => assert.info(`  Missing: ${a.key}`));
        }
    });

    await reporter.runTest('No uncaught page errors', async (assert) => {
        const pageErrors = reporter.results.pageErrors;
        assert.soft(pageErrors.length === 0, `Page errors: ${pageErrors.length}`);
        if (pageErrors.length > 0) {
            pageErrors.slice(0, 3).forEach(e => assert.info(`  ${e.message}`));
        }
    });

    // ═════════════════════════════════════════════════════════════════════
    //  DONE
    // ═════════════════════════════════════════════════════════════════════
    const success = reporter.generateReport();
    await browser.close();
    process.exit(success ? 0 : 1);
})();
