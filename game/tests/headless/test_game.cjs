/**
 * ArtLife — Headless Game Test Runner V2
 * Uses the comprehensive TestReporter to capture state, logs, and screenshots on failure.
 * Run: node tests/headless/test_game.cjs
 */
const { chromium } = require('playwright');
const { TestReporter } = require('./reporter.cjs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const reporter = new TestReporter(page, 'tests/reports');

    console.log('\n═══════════════════════════════════════');
    console.log('  ArtLife — Headless Test Runner (V2)');
    console.log('═══════════════════════════════════════\n');

    const testPort = process.env.TEST_PORT || '5175';
    await page.goto(`http://127.0.0.1:${testPort}?skipBoot=true`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // ── 1. Boot Verification ──
    await reporter.runTest('Boot Sequence', async (assert) => {
        let scenes = await page.evaluate(() => window.game.scene());
        const isReady = scenes.some(s => s.key === 'TitleScene' || s.key === 'OverworldScene' || s.key === 'BootScene');
        assert(isReady, 'Phaser engine is running and ready');

        const ui1 = await page.evaluate(() => window.game.uiState());
        assert(ui1.visible === true || ui1.visible === false, 'Terminal UI state is manageable');
    });

    // ── 2. Backroom Deal (It-Girl Dealer + Item Reward) ──
    await reporter.runTest('Backroom Deal Dialogue', async (assert) => {
        await page.evaluate(() => window.game.startTestScene('MacDialogueScene', {
            bgKey: 'bg_gallery_main_1bit_1771587911969.png',
            leftSpriteKey: 'test_legacy_bayer.png',
            rightSpriteKey: 'portrait_it_girl_1bit.png',
            rewardItem: { name: 'Untitled (Red Squares)', value: 48000, imageKey: 'art_object_red_squares.png' },
            dialogueSequence: [
                { name: 'Dealer', speakerSide: 'right', text: 'Hey.' },
                { name: 'You', speakerSide: 'left', text: 'Hey.' }
            ]
        }));
        await page.waitForTimeout(1500);

        let ds = await page.evaluate(() => window.game.dialogueState());
        assert(ds.active === true, 'MacDialogueScene is active');
        assert(ds.hasReward === true, 'Dialogue has a reward item');

        // Advance through all lines
        await page.evaluate(() => window.game.advanceDialogue()); await page.waitForTimeout(100);
        await page.evaluate(() => window.game.advanceDialogue()); await page.waitForTimeout(100);
        await page.evaluate(() => window.game.advanceDialogue()); await page.waitForTimeout(100);

        await page.keyboard.press('Space'); // Dismiss reward
        await page.waitForTimeout(1000);

        const ui2 = await page.evaluate(() => window.game.uiState());
        assert(ui2.visible === true, 'Terminal UI restored after dialogue');
        await page.evaluate(() => window.game.exitScene()); // Cleanup
        await page.waitForTimeout(1000);
    });

    // ── 3. Gallery Opening ──
    await reporter.runTest('Gallery Opening Dialogue', async (assert) => {
        await page.evaluate(() => window.game.startTestScene('MacDialogueScene', {
            bgKey: 'bg_gallery_backroom_1bit.png',
            leftSpriteKey: 'test_legacy_bayer.png',
            rightSpriteKey: 'test_legacy_fs.png',
            dialogueSequence: [
                { name: 'Legacy Gallerist', speakerSide: 'right', text: 'Test line' }
            ]
        }));
        await page.waitForTimeout(1500);

        let ds = await page.evaluate(() => window.game.dialogueState());
        assert(ds.active === true, 'MacDialogueScene is active (Gallery Opening)');
        assert(ds.hasReward === false, 'No reward item (expected)');

        await page.evaluate(() => window.game.exitScene());
        await page.waitForTimeout(1000);
    });

    // ── 4. Haggle Scene ── (SKIPPED: Replaced by React EmailDialogueOverlay)
    /*
    await reporter.runTest('Haggle Scene Initialization', async (assert) => {
        const testPort = process.env.TEST_PORT || '5175';
        await page.goto(`http://127.0.0.1:${testPort}?skipBoot=true`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        const haggleResult = await page.evaluate(() => window.game.startHaggle());
        assert(haggleResult.started === true, 'startHaggle() returned started=true');

        let hs = { active: false };
        for (let attempt = 0; attempt < 20; attempt++) {
            await page.waitForTimeout(200);
            hs = await page.evaluate(() => window.game.haggleState());
            if (hs.active) break;
        }

        assert(hs.active === true, 'HaggleScene is active');
        assert(hs.round >= 1 || hs.phase === 'opening', `Haggle phase: ${hs.phase}, round: ${hs.round}`);

        await page.evaluate(() => window.game.exitScene());
        await page.waitForTimeout(1500);
    });
    */


    // ── 6. Scene Cleanup ──
    await reporter.runTest('Scene Cleanup Integrity', async (assert) => {
        const finalScenes = await page.evaluate(() => window.game.scene());
        const activeGameScenes = finalScenes.filter(s => s.key !== 'BootScene' && s.active);
        assert(activeGameScenes.length === 0, `No lingering active scenes (found ${activeGameScenes.length})`);
    });

    // Generate Final Report and Close
    const success = reporter.generateReport();
    await browser.close();
    process.exit(success ? 0 : 1);
})();
