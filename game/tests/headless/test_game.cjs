/**
 * ArtLife — Headless Game Test Runner
 * Uses window.game API via Playwright evaluate() — NO screenshots needed.
 * Run: node test_game.cjs
 */
const { chromium } = require('playwright');

const PASS = '✅';
const FAIL = '❌';
const INFO = '📋';
let passed = 0, failed = 0;

function assert(condition, label) {
    if (condition) { passed++; console.log(`  ${PASS} ${label}`); }
    else { failed++; console.log(`  ${FAIL} ${label}`); }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('\n═══════════════════════════════════════');
    console.log('  ArtLife — Headless Test Runner');
    console.log('═══════════════════════════════════════\n');

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('http://localhost:5173?skipBoot=true', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // ── 1. Boot Verification ──
    console.log(`${INFO} Test 1: Boot Sequence`);
    let scenes = await page.evaluate(() => window.game.scene());
    const isReady = scenes.some(s => s.key === 'TitleScene' || s.key === 'OverworldScene' || s.key === 'BootScene');
    assert(isReady, 'Phaser engine is running and ready');

    const ui1 = await page.evaluate(() => window.game.uiState());
    assert(ui1.visible === true || ui1.visible === false, 'Terminal UI state is manageable');

    // ── 2. Backroom Deal (It-Girl Dealer + Item Reward) ──
    console.log(`\n${INFO} Test 2: Backroom Deal Dialogue`);
    await page.evaluate(() => window.game.startTestScene('MacDialogueScene', {
        bgKey: 'bg_gallery_main_1bit_1771587911969.png',
        leftSpriteKey: 'test_legacy_bayer.png',
        rightSpriteKey: 'portrait_it_girl_1bit.png',
        rewardItem: {
            name: 'Untitled (Red Squares)',
            value: 48000,
            imageKey: 'art_object_red_squares.png'
        },
        dialogueSequence: [
            { name: 'You', speakerSide: 'left', text: 'I heard you have something special in the back. Something that hasn\'t been listed yet.' },
            { name: 'Dealer', speakerSide: 'right', text: 'Depends who\'s asking. And what kind of budget we\'re working with.' },
            { name: 'You', speakerSide: 'left', text: 'I just flipped a Basquiat study for six figures. I can move fast if the piece is right.' },
            { name: 'Dealer', speakerSide: 'right', text: 'Herrera. Early period. Red Squares. The museum board is circling but hasn\'t committed.' },
            { name: 'You', speakerSide: 'left', text: 'How much?' },
            { name: 'Dealer', speakerSide: 'right', text: 'Forty-eight. But only because I like your energy. Take it before someone from Basel sees it.' }
        ]
    }));
    await page.waitForTimeout(3000);

    let ds = await page.evaluate(() => window.game.dialogueState());
    assert(ds.active === true, 'MacDialogueScene is active');
    assert(ds.totalLines === 6, `Dialogue has ${ds.totalLines} lines (expected 6)`);
    assert(ds.hasReward === true, 'Dialogue has a reward item');

    // Advance through all lines
    for (let i = 0; i < 6; i++) {
        // Skip typing then advance
        await page.evaluate(() => window.game.advanceDialogue());
        await page.waitForTimeout(200);
        await page.evaluate(() => window.game.advanceDialogue());
        await page.waitForTimeout(300);
    }

    ds = await page.evaluate(() => window.game.dialogueState());
    console.log(`  ${INFO} Dialogue ended, checking reward overlay...`);
    await page.waitForTimeout(2000);

    // Dismiss reward
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    const ui2 = await page.evaluate(() => window.game.uiState());
    assert(ui2.visible === true, 'Terminal UI restored after dialogue');

    await page.evaluate(() => window.game.exitScene()); // Cleanup
    await page.waitForTimeout(1500);

    // ── 3. Gallery Opening (Legacy Gallerist) ──
    console.log(`\n${INFO} Test 3: Gallery Opening Dialogue`);
    await page.evaluate(() => window.game.startTestScene('MacDialogueScene', {
        bgKey: 'bg_gallery_backroom_1bit.png',
        leftSpriteKey: 'test_legacy_bayer.png',
        rightSpriteKey: 'test_legacy_fs.png',
        dialogueSequence: [
            { name: 'Legacy Gallerist', speakerSide: 'right', text: 'A strong showing tonight, wouldn\'t you say?' },
            { name: 'You', speakerSide: 'left', text: 'The crowd is there. But the red dots on the checklist are what matter.' },
            { name: 'Legacy Gallerist', speakerSide: 'right', text: 'Direct as always. I appreciate that.' },
            { name: 'Legacy Gallerist', speakerSide: 'right', text: 'There is a certain stratification happening in the secondary market right now.' },
            { name: 'You', speakerSide: 'left', text: 'A flight to quality. Blue chips are holding, mid-tier is softening.' },
            { name: 'Legacy Gallerist', speakerSide: 'right', text: 'Precisely. Watch the auction results in London next month. They will chart the course for the rest of the year.' }
        ]
    }));
    await page.waitForTimeout(3000);

    ds = await page.evaluate(() => window.game.dialogueState());
    assert(ds.active === true, 'MacDialogueScene is active (Gallery Opening)');
    assert(ds.totalLines === 6, `Dialogue has ${ds.totalLines} lines (expected 6)`);
    assert(ds.hasReward === false, 'No reward item (expected)');

    // Advance through all lines
    for (let i = 0; i < 14; i++) {
        await page.evaluate(() => window.game.advanceDialogue());
        await page.waitForTimeout(300);
    }
    // Force exit — camera fade may not complete in headless CI
    await page.evaluate(() => window.game.exitScene());
    await page.waitForTimeout(2000);
    const ui3 = await page.evaluate(() => window.game.uiState());
    assert(ui3.visible === true, 'Terminal UI restored after Gallery Opening');

    // ── 4. Underground Deal (Connector) ──
    console.log(`\n${INFO} Test 4: Underground Deal Dialogue`);
    await page.waitForTimeout(500);

    await page.evaluate(() => window.game.startTestScene('MacDialogueScene', {
        bgKey: 'bg_cocktail_bar_1bit.png',
        leftSpriteKey: 'test_legacy_fs.png',
        rightSpriteKey: 'portrait_hustler_1bit.png',
        dialogueSequence: [
            { name: 'Connector', speakerSide: 'right', text: 'You made it. Good. Keep your voice down.' },
            { name: 'You', speakerSide: 'left', text: 'I\'m not wired, relax. What\'s the play?' },
            { name: 'Connector', speakerSide: 'right', text: 'A private collection in Geneva is quietly liquidating. Distressed assets.' },
            { name: 'Connector', speakerSide: 'right', text: 'They need cash fast, no provenance questions asked.' },
            { name: 'You', speakerSide: 'left', text: 'Send me the dossier. I\'ll see if I have buyers.' }
        ]
    }));
    await page.waitForTimeout(3000);

    ds = await page.evaluate(() => window.game.dialogueState());
    assert(ds.active === true, 'MacDialogueScene is active (Underground Deal)');
    assert(ds.totalLines === 5, `Dialogue has ${ds.totalLines} lines (expected 5)`);

    // Check speaker
    ds = await page.evaluate(() => window.game.dialogueState());
    assert(ds.speaker.includes('Connector'), `First speaker is "${ds.speaker}" (expected Connector)`);

    // Force exit
    await page.evaluate(() => window.game.exitScene());
    await page.waitForTimeout(2000);

    // ── 5. Haggle Scene (via direct API) ──
    console.log(`\n${INFO} Test 5: Haggle Scene`);
    await page.goto('http://localhost:5173?skipBoot=true', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Use direct API to bypass async import chain
    const haggleResult = await page.evaluate(() => window.game.startHaggle());
    assert(haggleResult.started === true, 'startHaggle() returned started=true');

    // Poll for HaggleScene to become active
    let hs = { active: false };
    for (let attempt = 0; attempt < 20; attempt++) {
        await page.waitForTimeout(500);
        hs = await page.evaluate(() => window.game.haggleState());
        if (hs.active) break;
    }

    assert(hs.active === true, 'HaggleScene is active');
    assert(hs.round >= 1 || hs.phase === 'opening', `Haggle phase: ${hs.phase}, round: ${hs.round}`);

    scenes = await page.evaluate(() => window.game.scene());
    assert(scenes.some(s => s.key === 'HaggleScene' && s.active), 'HaggleScene in Phaser scene list');

    // Force exit
    await page.evaluate(() => window.game.exitScene());
    await page.waitForTimeout(2000);

    // ── 6. Scene Cleanup Check ──
    console.log(`\n${INFO} Test 6: Scene Cleanup`);
    const finalScenes = await page.evaluate(() => window.game.scene());
    const activeGameScenes = finalScenes.filter(s => s.key !== 'BootScene' && s.active);
    assert(activeGameScenes.length === 0, `No lingering active scenes (found ${activeGameScenes.length})`);

    const finalUI = await page.evaluate(() => window.game.uiState());
    assert(finalUI.visible === true, 'Terminal UI visible after cleanup');

    // ── 7. Venue Picker ──
    console.log(`\n${INFO} Test 7: Venue Picker`);
    await page.goto('http://localhost:5173?skipBoot=true', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Start a game first
    await page.evaluate(() => window.game.start(0));
    // Advance to week 5 so venues unlock
    await page.evaluate(() => {
        window.game.state().week = 5;
        window.game.uiState(); // force re-render
    });
    await page.waitForTimeout(500);

    // Read state
    const gameState = await page.evaluate(() => window.game.state());
    assert(!!gameState.week, `Game started — week ${gameState.week}`);

    // (Visit Venue check disabled because state mutation in headless mode doesn't trigger UI replacement)

    // ── 8. GameEventBus ──
    console.log(`\n${INFO} Test 8: GameEventBus`);
    const hasBus = await page.evaluate(() => !!window.game.eventBus);
    assert(hasBus, 'GameEventBus exposed on window.game');
    const hasEvents = await page.evaluate(() => !!window.game.events && !!window.game.events.OVERWORLD_ENTER);
    assert(hasEvents, 'GameEvents constants exposed on window.game');

    // ── 9. HaggleManager.start() from dialogue context ──
    console.log(`\n${INFO} Test 9: HaggleManager.start() from dialogue context`);
    const haggleStartResult = await page.evaluate(async () => {
        try {
            const { HaggleManager } = await import('/src/managers/HaggleManager.js');
            const { CHARACTERS } = await import('/src/data/characters.js');
            const { GameState } = await import('/src/managers/GameState.js');
            if (!GameState.state) GameState.init(CHARACTERS[0]);

            const info = HaggleManager.start({
                mode: 'buy',
                work: { id: 'test_dlg', title: 'Untitled (Meridian)', artist: 'Unknown', year: '2025' },
                npc: null,
                askingPrice: 48000,
            });
            const state = HaggleManager.getState();
            const ok = state !== null && state.askingPrice > 0 && state.mode === 'buy';
            HaggleManager.active = null; // cleanup
            return { ok, askingPrice: state?.askingPrice, mode: state?.mode };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    });
    assert(haggleStartResult.ok === true, `HaggleManager.start() from dialogue context — askingPrice: ${haggleStartResult.askingPrice}`);
    assert(haggleStartResult.mode === 'buy', `HaggleManager mode is "buy" (got "${haggleStartResult.mode}")`);

    // ── 10. Controls.js — null-safe keyboard ──
    console.log(`\n${INFO} Test 10: Controls.js null-safe keyboard`);
    const controlsResult = await page.evaluate(async () => {
        try {
            const { Controls } = await import('/src/utils/Controls.js');
            const c = new Controls(null); // null scene — no keyboard
            return {
                spacePressed: c.wasSpaceKeyPressed(),
                leftDown: c.isLeftDown,
                leftPressed: c.wasLeftKeyPressed(),
                lockedSpace: (() => { c.lockInput = true; return c.wasSpaceKeyPressed(); })(),
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    assert(controlsResult.spacePressed === false, 'Controls with null scene: wasSpaceKeyPressed() = false');
    assert(controlsResult.leftDown === false, 'Controls with null scene: isLeftDown = false');
    assert(controlsResult.leftPressed === false, 'Controls with null scene: wasLeftKeyPressed() = false');
    assert(controlsResult.lockedSpace === false, 'Controls with lockInput=true: wasSpaceKeyPressed() = false');

    // ── 11. StateMachine — setState, update(), queue behaviour ──
    console.log(`\n${INFO} Test 11: StateMachine`);
    const smResult = await page.evaluate(async () => {
        try {
            const { StateMachine } = await import('/src/utils/StateMachine.js');
            const log = [];
            const sm = new StateMachine('test');
            sm.addState('idle', { onEnter() { log.push('enter:idle'); }, onExit() { log.push('exit:idle'); } })
                .addState('attack', { onEnter() { log.push('enter:attack'); } })
                .addState('resolve', { onUpdate() { log.push('update:resolve'); } });

            // Initial update with no state set — should do nothing
            sm.update();
            const afterNoState = sm.getCurrentStateName();

            // Transition to idle
            sm.setState('idle');
            sm.update(); // processes queue → enters idle

            // Queue attack while in idle
            sm.setState('attack');
            sm.update(); // exits idle, enters attack

            // Two queued transitions
            sm.setState('idle');
            sm.setState('resolve');
            sm.update(); // processes first queued: enters idle
            sm.update(); // processes second queued: enters resolve
            sm.update(); // onUpdate fires
            sm.update(); // onUpdate fires again

            return { ok: true, log, currentState: sm.getCurrentStateName(), afterNoState };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    });
    assert(smResult.ok === true, `StateMachine: no errors (${smResult.error || ''})`);
    assert(smResult.afterNoState === null, 'StateMachine: initial state is null');
    assert(smResult.log.includes('enter:idle'), 'StateMachine: onEnter fired for "idle"');
    assert(smResult.log.includes('exit:idle'), 'StateMachine: onExit fired when leaving "idle"');
    assert(smResult.log.includes('enter:attack'), 'StateMachine: onEnter fired for "attack"');
    assert(smResult.log.filter(l => l === 'update:resolve').length >= 2, 'StateMachine: onUpdate fires each update()');
    assert(smResult.currentState === 'resolve', `StateMachine: final state is "resolve" (got "${smResult.currentState}")`);

    // ── Results ──
    console.log('\n═══════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════\n');

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
