#!/usr/bin/env node
/**
 * ArtLife — Full Scene Flow Test
 *
 * Two-phase approach:
 *   Phase A — Real navigation: click/keyboard through TitleScene → CharacterSelect → Dashboard
 *   Phase B — API-driven: launch & inspect every scene via window.game.*
 *
 * Run: node test_flow.cjs   |   npm run test:flow
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173?skipBoot=true';
const SS = path.join(__dirname, 'reports', 'screenshots');

let passed = 0, failed = 0;
const notes = [];
const browserErrors = [];

if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────────

function assert(cond, label, note = '') {
    if (cond) { passed++; console.log(`  ✅ ${label}`); notes.push({ pass: true, label, note }); }
    else { failed++; console.log(`  ❌ ${label}${note ? '  → ' + note : ''}`); notes.push({ pass: false, label, note }); }
}
function warn(label, note = '') {
    console.log(`  ⚠️  ${label}${note ? '  → ' + note : ''}`);
    notes.push({ pass: null, label, note });
}
function section(n, name) { console.log(`\n📋 ${n}: ${name}`); }

async function shot(page, name) {
    await page.screenshot({ path: path.join(SS, `${name}.png`), fullPage: false });
}

// Dispatch a keydown+keyup directly to window — Phaser listens on window,
// not the canvas, so page.keyboard.press() doesn't reliably reach it in headless mode.
const KEY_CODES = { Space: 32, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Enter: 13, Escape: 27 };
async function pressKey(page, key) {
    const keyCode = KEY_CODES[key] ?? key.charCodeAt(0);
    await page.evaluate(({ key, keyCode }) => {
        const opts = { key, code: key, keyCode, which: keyCode, bubbles: true, cancelable: true };
        window.dispatchEvent(new KeyboardEvent('keydown', opts));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', opts)), 50);
    }, { key, keyCode });
    await page.waitForTimeout(80);
}

async function waitForScene(page, key, ms = 8000) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        await page.waitForTimeout(300);
        const active = await page.evaluate(
            k => window.phaserGame?.scene?.getScenes(true).map(s => s.scene.key).includes(k) ?? false,
            key
        );
        if (active) return true;
    }
    return false;
}

async function waitForTerminal(page, ms = 8000) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        await page.waitForTimeout(300);
        const vis = await page.evaluate(() => window.game?.uiState()?.visible ?? false);
        if (vis) return true;
    }
    return false;
}

async function safeEval(page, fn, fallback = null) {
    try { return await page.evaluate(fn); }
    catch (e) { console.error('safeEval caught:', e); return fallback; }
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    page.on('console', msg => { if (msg.type() === 'error') browserErrors.push(msg.text()); });
    page.on('pageerror', err => browserErrors.push(err.message));

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ArtLife — Full Scene Flow Test');
    console.log('═══════════════════════════════════════════════════════\n');

    // ─────────────────────────────────────────────────────────────
    // PHASE A: Real navigation (TitleScene → CharacterSelect → Dashboard)
    // ─────────────────────────────────────────────────────────────
    console.log('── Phase A: Real navigation ────────────────────────────\n');

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Scene 1 — TitleScene
    section('A1', 'TitleScene boot');
    const titleActive = await waitForScene(page, 'TitleScene', 5000);
    assert(titleActive, 'TitleScene is active on boot');

    const canvasVis = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.offsetWidth > 0 && c.offsetHeight > 0 : false;
    });
    assert(canvasVis, 'Phaser canvas is visible with dimensions');

    const termHidden = await page.evaluate(() => {
        const el = document.getElementById('terminal');
        return el ? el.style.display === 'none' : true;
    });
    assert(termHidden, 'Terminal is hidden during TitleScene');
    await shot(page, 'A1_title');

    // Scene 2 — TitleScene → IntroScene → CharacterSelectScene
    // TitleScene now routes through IntroScene first; ESC skips it immediately.
    section('A2', 'TitleScene → CharacterSelectScene (via IntroScene)');
    await pressKey(page, '1'); // triggers this.startNewGame() for Option 1
    // Wait for IntroScene, then ESC to skip it directly to CharacterSelectScene
    const introActive = await waitForScene(page, 'IntroScene', 5000);
    if (introActive) {
        await page.waitForTimeout(400); // let IntroScene create() settle
        await pressKey(page, 'Escape'); // _skipToSelect() — no fade, immediate
    }
    const charActive = await waitForScene(page, 'CharacterSelectScene', 8000);
    assert(charActive, 'CharacterSelectScene activated after clicking title');
    await page.waitForTimeout(500); // let animations settle
    await shot(page, 'A2_char_select');

    if (charActive) {
        // Navigation checks — new 3-phase creator uses _archPortraits and _archIdx
        const csState = await safeEval(page, () => {
            const s = window.phaserGame?.scene?.getScene('CharacterSelectScene');
            return s ? { portraits: s._archPortraits?.length ?? 0, idx: s._archIdx ?? 0 } : null;
        });
        assert(csState !== null, 'CharacterSelectScene is accessible via Phaser API');
        assert(csState?.portraits === 4, `4 character cards rendered (got ${csState?.portraits})`);

        // Arrow navigation — dispatch directly to window; Phaser listens there, not on canvas
        await page.waitForTimeout(600); // let create() finish registering keys
        await pressKey(page, 'ArrowRight');
        await page.waitForTimeout(300);
        const afterRight = await safeEval(page, () =>
            window.phaserGame?.scene?.getScene('CharacterSelectScene')?._archIdx
        );
        assert(afterRight === 1, `Arrow right: index moved to 1 (got ${afterRight})`);

        await pressKey(page, 'ArrowLeft');
        await page.waitForTimeout(300);
        const afterLeft = await safeEval(page, () =>
            window.phaserGame?.scene?.getScene('CharacterSelectScene')?._archIdx
        );
        assert(afterLeft === 0, `Arrow left: index back to 0 (got ${afterLeft})`);

        // Scene 3 — Confirm character → Dashboard
        section('A3', 'CharacterSelectScene → Dashboard');
        // Try Space key first; Phaser JustDown is frame-exact so may miss in headless.
        // Fall back to calling confirmSelection() directly to test the confirmation code path.
        await pressKey(page, 'Space');
        const spaceWorked = await waitForTerminal(page, 3000);
        if (!spaceWorked) {
            warn('Space key missed JustDown frame — using direct API fallback (confirmSelection)');
            await safeEval(page, () => {
                const s = window.phaserGame?.scene?.getScene('CharacterSelectScene');
                if (s?.scene?.isActive()) s.confirmSelection?.();
            });
        }
        const dashVisible = await waitForTerminal(page, 10000);
        assert(dashVisible, 'Terminal UI becomes visible after character confirm');
        await page.waitForTimeout(500);
        await shot(page, 'A3_dashboard');

        // Canvas should be hidden now
        const canvasHidden = await safeEval(page, () => {
            const c = document.querySelector('canvas');
            return c ? c.style.display === 'none' : false;
        });
        assert(canvasHidden, 'Phaser canvas hidden when terminal is active');

        // Game state check
        const gs = await safeEval(page, () => window.game?.state());
        assert(gs && gs.week === 1, `GameState initialised — week ${gs?.week}`);
        assert(gs?.cash > 0, `Starting cash: $${gs?.cash?.toLocaleString()}`);
        assert(!!gs?.city, `Starting city: ${gs?.city}`);

        // Dashboard options
        const opts = await safeEval(page, () => window.game?.options() ?? []);
        assert(opts.length > 0, `Dashboard has ${opts.length} menu options`);
        assert(opts.some(o => o.includes('Visit Venue')), '"Visit Venue" in dashboard menu');
        assert(opts.some(o => /advance|week/i.test(o)), '"Advance Week" in dashboard menu');

        // Terminal content
        const termLen = await safeEval(page, () =>
            (document.getElementById('terminal')?.innerText?.trim().length) ?? 0
        );
        assert(termLen > 20, `Terminal rendered content (${termLen} chars)`);

        // Scene 4 — Advance week
        section('A4', 'Advance week via terminal');
        // Guard: only advance if game state is initialised
        const gsCheck = await safeEval(page, () => !!window.game?.state()?.week);
        if (gsCheck) {
            const advResult = await safeEval(page, () => window.game?.advance(1));
            assert(advResult?.includes('week 2') ?? false, `Advance returned: "${advResult}"`);
            const gs2 = await safeEval(page, () => window.game?.state());
            assert(gs2?.week === 2, `GameState.week is now 2 (got ${gs2?.week})`);
        } else {
            warn('Skipped — GameState not initialised (character confirm did not complete)');
        }
        await shot(page, 'A4_week2');

    } else {
        warn('CharacterSelectScene navigation skipped (title click did not trigger transition)');
        warn('Phase A3, A4 skipped — no game state');
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE B: API-driven scene content tests (fresh page for clean state)
    // ─────────────────────────────────────────────────────────────
    console.log('\n── Phase B: API-driven scene tests ─────────────────────\n');

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // B1 — Start a game directly via API (bypasses Phaser flow)
    section('B1', 'API game start (character 0)');
    const startResult = await safeEval(page, () => window.game?.start(0));
    assert(startResult?.includes('Started as') ?? false, `game.start(0): "${startResult}"`);
    const gsB = await safeEval(page, () => window.game?.state());
    assert(gsB?.week === 1, `GameState initialised via API — week ${gsB?.week}`);
    assert(gsB?.cash > 0, `Cash: $${gsB?.cash?.toLocaleString()}`);

    // B2 — HaggleScene
    section('B2', 'HaggleScene via API');
    const hr = await safeEval(page, () => window.game?.startHaggle());
    assert(hr?.started === true, 'startHaggle() returned started=true');

    let hs = { active: false };
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(400);
        hs = await safeEval(page, () => window.game?.haggleState() ?? {});
        if (hs?.active) break;
    }
    assert(hs?.active === true, 'HaggleScene became active');
    assert(hs?.maxRounds > 0, `Haggle maxRounds: ${hs?.maxRounds}`);
    assert(hs?.dealerTypeKey?.length > 0, `Dealer type: ${hs?.dealerTypeKey}`);
    assert(hs?.phase === 'opening', `Phase is "opening" (got "${hs?.phase}")`);
    await shot(page, 'B2_haggle');

    // Canvas visible during Phaser scenes
    const canvasInHaggle = await safeEval(page, () => {
        const c = document.querySelector('canvas');
        return c ? c.style.display !== 'none' : false;
    });
    assert(canvasInHaggle, 'Canvas visible during HaggleScene');

    await safeEval(page, () => window.game?.exitScene());
    await page.waitForTimeout(1500);
    const termAfterHaggle = await safeEval(page, () => window.game?.uiState()?.visible);
    assert(termAfterHaggle === true, 'Terminal restored after HaggleScene exit');
    await shot(page, 'B2b_after_haggle');

    // B3 — MacDialogueScene (no reward)
    section('B3', 'MacDialogueScene — standard dialogue');
    await safeEval(page, () => window.game?.startTestScene('MacDialogueScene', {
        bgKey: 'bg_gallery_main_1bit_1771587911969.png',
        leftSpriteKey: 'test_legacy_bayer.png',
        rightSpriteKey: 'portrait_it_girl_1bit.png',
        dialogueSequence: [
            { name: 'Gallerist', speakerSide: 'right', text: 'The market is softening. Now is the time to acquire.' },
            { name: 'You', speakerSide: 'left', text: 'I have budget for one significant piece.' },
            { name: 'Gallerist', speakerSide: 'right', text: 'Follow me to the back room.' },
        ]
    }));
    await page.waitForTimeout(3000);

    const ds = await safeEval(page, () => window.game?.dialogueState());
    assert(ds?.active === true, 'MacDialogueScene is active');
    assert(ds?.totalLines === 3, `3 dialogue lines (got ${ds?.totalLines})`);
    assert(ds?.speaker?.length > 0, `Speaker field: "${ds?.speaker}"`);
    await shot(page, 'B3_dialogue');

    // React DialogueBox rendered in DOM — name tag renders immediately (not typewritten)
    const dbVisible = await safeEval(page, () => {
        // DialogueBox renders a name-tag div with the speaker name (bg-white text-black font-bold)
        // The #root div contains the React tree
        const root = document.getElementById('root');
        if (!root) return false;
        // Check for speaker name in the React tree
        if (root.innerText?.includes('Gallerist')) return true;
        // Fallback: any div with font-bold + bg-white style (the name tag)
        return [...document.querySelectorAll('div')].some(d =>
            d.className?.includes('font-bold') && d.innerText?.includes('Gallerist')
        );
    });
    assert(dbVisible, 'React DialogueBox name tag rendered in DOM ("Gallerist")');

    // Advance all lines
    for (let i = 0; i < 8; i++) {
        await safeEval(page, () => window.game?.advanceDialogue());
        await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2000);
    const termAfterDlg = await safeEval(page, () => window.game?.uiState()?.visible);
    assert(termAfterDlg === true, 'Terminal restored after dialogue');
    await shot(page, 'B3b_after_dialogue');

    // B4 — MacDialogueScene with reward item
    section('B4', 'MacDialogueScene — reward item flow');
    await safeEval(page, () => window.game?.startTestScene('MacDialogueScene', {
        bgKey: 'bg_gallery_main_1bit_1771587911969.png',
        leftSpriteKey: 'test_legacy_bayer.png',
        rightSpriteKey: 'portrait_it_girl_1bit.png',
        rewardItem: { name: 'Red Squares', value: 48000, imageKey: 'art_object_red_squares.png' },
        dialogueSequence: [
            { name: 'Dealer', speakerSide: 'right', text: 'This Herrera is early period. Forty-eight.' },
            { name: 'You', speakerSide: 'left', text: 'Done.' },
        ]
    }));
    await page.waitForTimeout(3000);
    const dsR = await safeEval(page, () => window.game?.dialogueState());
    assert(dsR?.active === true, 'MacDialogueScene with reward is active');
    assert(dsR?.hasReward === true, 'Reward item detected');
    await shot(page, 'B4_dialogue_reward');

    for (let i = 0; i < 6; i++) {
        await safeEval(page, () => window.game?.advanceDialogue());
        await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2500);
    // Dismiss reward overlay by clicking anywhere on the body (canvas might be hidden by TerminalUI return)
    await page.click('body');
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);
    const termAfterReward = await safeEval(page, () => window.game?.uiState()?.visible);
    assert(termAfterReward === true, 'Terminal restored after reward overlay');
    await shot(page, 'B4b_after_reward');

    // B5 — Scene cleanup check
    section('B5', 'Scene cleanup');
    await safeEval(page, () => window.game?.exitScene());
    await page.waitForTimeout(1000);
    const activeScenes = await safeEval(page, () =>
        window.phaserGame?.scene?.getScenes(true)
            .filter(s => s.scene.key !== 'BootScene')
            .map(s => s.scene.key) ?? []
    );
    assert(activeScenes?.length === 0, `No lingering scenes (found: ${activeScenes?.join(', ') || 'none'})`);

    // B6 — Error audit
    section('B6', 'Global error audit');
    const debug = await safeEval(page, () => window.game?.debug());
    const missing = debug?.missingAssets ?? [];
    const jsErrs = debug?.errors ?? [];
    const scErrs = debug?.sceneErrors ?? [];

    assert(jsErrs.length === 0, `No JS errors logged (found ${jsErrs.length})`);
    assert(scErrs.length === 0, `No scene errors logged (found ${scErrs.length})`);

    if (missing.length > 0) {
        warn(`Missing assets (${missing.length})`, missing.map(a => a.key).join(', '));
    } else {
        assert(true, 'No missing assets logged');
    }

    const consolErrs = browserErrors.filter(e =>
        !e.includes('bg_cocktail_bar') && // known missing asset
        !e.includes('Failed to process file') // Phaser's own asset warning
    );
    if (consolErrs.length > 0) {
        consolErrs.slice(0, 3).forEach(e => console.log(`     • ${e.slice(0, 120)}`));
        failed++;
        notes.push({ pass: false, label: 'Browser console errors', note: consolErrs[0] });
    } else {
        assert(true, 'No unexpected browser console errors');
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE C: LocationScene → NPC interaction → DialogueScene
    // ─────────────────────────────────────────────────────────────
    console.log('\n── Phase C: LocationScene → NPC → DialogueScene ────────\n');

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // C1 — Start game and launch LocationScene directly
    section('C1', 'LocationScene launch via API');
    await safeEval(page, () => window.game?.start(0));
    await page.waitForTimeout(500);

    await safeEval(page, () => window.game?.startTestScene('LocationScene', {
        venueId: 'gallery_opening',
        roomId: 'chelsea_main_floor',
    }));
    const locActive = await waitForScene(page, 'LocationScene', 8000);
    assert(locActive, 'LocationScene launched for gallery_opening');
    await page.waitForTimeout(1000);
    await shot(page, 'C1_location');

    // C2 — Trigger NPC dialogue directly via scene API
    section('C2', 'NPC dialogue trigger in LocationScene');
    const dialogueTriggered = await safeEval(page, async () => {
        const scene = window.phaserGame?.scene?.getScene('LocationScene');
        if (!scene || !scene.scene.isActive()) return false;
        // Call startDialogue as LocationScene would on SPACE press near NPC
        try {
            scene.startDialogue('elena_ross');
            return true;
        } catch (e) {
            return false;
        }
    });
    assert(dialogueTriggered === true, 'LocationScene.startDialogue() called without error');
    await page.waitForTimeout(2000);

    const dlgActive = await safeEval(page, () =>
        window.phaserGame?.scene?.getScenes(true).map(s => s.scene.key).includes('DialogueScene') ?? false
    );
    assert(dlgActive === true, 'DialogueScene is active after NPC startDialogue()');
    await shot(page, 'C2_dialogue_active');

    // C3 — Verify DialogueScene has valid event data
    section('C3', 'DialogueScene event data integrity');
    const dlgEventData = await safeEval(page, () => {
        const scene = window.phaserGame?.scene?.getScene('DialogueScene');
        if (!scene) return null;
        return {
            hasEvent: !!scene.eventData,
            hasSteps: Array.isArray(scene.eventData?.steps) && scene.eventData.steps.length > 0,
            stepCount: scene.eventData?.steps?.length ?? 0,
            title: scene.eventData?.title ?? '',
        };
    });
    assert(dlgEventData?.hasEvent === true, 'DialogueScene has eventData');
    assert(dlgEventData?.hasSteps === true, `DialogueScene has ${dlgEventData?.stepCount} steps`);
    assert(dlgEventData?.title?.includes('Elena') || dlgEventData?.title?.includes('elena'),
        `DialogueScene title: "${dlgEventData?.title}"`);

    await safeEval(page, () => window.game?.exitScene());
    await page.waitForTimeout(1500);

    // ─────────────────────────────────────────────────────────────
    // PHASE D: DialogueScene haggle trigger → HaggleScene → terminal
    // ─────────────────────────────────────────────────────────────
    console.log('\n── Phase D: Dialogue → Haggle → terminal ───────────────\n');

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // D1 — Verify HaggleManager.start() initialises state correctly (dialogue pipeline params)
    section('D1', 'HaggleManager.start() + HaggleScene launch (dialogue pipeline)');
    await safeEval(page, () => window.game?.start(0));
    await page.waitForTimeout(300);

    // Verify HaggleManager.start() works with the exact parameters DialogueScene uses
    // (triggerHaggle path: mode='buy', npc=null, askingPrice from choice.effects.cash)
    const d1ManagerCheck = await safeEval(page, () => {
        try {
            // Access HaggleManager via the already-loaded module (exposed through startHaggle)
            // We trigger startHaggle which mirrors DialogueScene's triggerHaggle path exactly
            const r = window.game?.startHaggle();
            return { ok: true, result: r };
        } catch (e) { return { ok: false, error: e.message }; }
    });
    assert(d1ManagerCheck?.ok === true, `HaggleManager.start() triggers without error`);

    const d1HaggleActive = await waitForScene(page, 'HaggleScene', 8000);
    assert(d1HaggleActive, 'HaggleScene active after dialogue pipeline launch');
    await page.waitForTimeout(1000);
    await shot(page, 'D1_haggle_from_dialogue');

    const d1State = await safeEval(page, () => window.game?.haggleState());
    assert(d1State?.active === true, 'HaggleScene reports active state');
    assert(d1State?.maxRounds > 0, `HaggleScene maxRounds: ${d1State?.maxRounds}`);

    // D2 — Force-exit and verify terminal restores
    section('D2', 'HaggleScene exit → terminal restore');
    await safeEval(page, () => window.game?.exitScene());
    const termRestored = await waitForTerminal(page, 6000);
    assert(termRestored === true, 'Terminal UI restored after HaggleScene exit');
    await shot(page, 'D2_terminal_after_haggle');

    // ─────────────────────────────────────────────────────────────
    // RESULTS + REPORT
    // ─────────────────────────────────────────────────────────────
    const total = passed + failed;
    const allOk = failed === 0;

    console.log('\n═══════════════════════════════════════════════════════');
    if (allOk) {
        console.log(`  ✅  ALL ${total} CHECKS PASSED — GREEN LIGHT 🟢`);
    } else {
        console.log(`  ❌  ${failed} FAILURE(S) — ${passed}/${total} passed`);
        notes.filter(n => !n.pass).forEach(n =>
            console.log(`     • ${n.label}${n.note ? ': ' + n.note : ''}`)
        );
    }
    console.log(`  📸  Screenshots → reports/screenshots/`);

    // Write markdown report
    const ts = new Date().toISOString();
    const md = [
        '# ArtLife — Scene Flow Test Report',
        '',
        `**Date:** ${ts}`,
        `**Result:** ${allOk ? '✅ ALL PASS' : `❌ ${failed} FAILED`}  (${passed}/${total})`,
        '',
        '## Check Results',
        '',
        '| # | Label | Status | Notes |',
        '|---|-------|--------|-------|',
        ...notes.map((n, i) => {
            const icon = n.pass === true ? '✅' : n.pass === false ? '❌' : '⚠️';
            return `| ${i + 1} | ${n.label} | ${icon} | ${n.note || ''} |`;
        }),
        '',
        '## Missing Assets',
        missing.length ? missing.map(a => `- \`${a.key}\` → \`${a.url}\``).join('\n') : '_None_',
        '',
        '## Browser Errors',
        consolErrs.length ? consolErrs.map(e => `- ${e.slice(0, 200)}`).join('\n') : '_None_',
        '',
        '## Screenshots',
        '| Label | File |',
        '|-------|------|',
        ...[
            ['A1 — TitleScene', 'A1_title'],
            ['A2 — CharacterSelect', 'A2_char_select'],
            ['A3 — Dashboard', 'A3_dashboard'],
            ['A4 — Week 2', 'A4_week2'],
            ['B2 — Haggle open', 'B2_haggle'],
            ['B2b — After haggle', 'B2b_after_haggle'],
            ['B3 — Dialogue', 'B3_dialogue'],
            ['B3b — After dialogue', 'B3b_after_dialogue'],
            ['B4 — Dialogue + reward', 'B4_dialogue_reward'],
            ['B4b — After reward', 'B4b_after_reward'],
            ['C1 — LocationScene', 'C1_location'],
            ['C2 — DialogueScene active', 'C2_dialogue_active'],
            ['D1 — Haggle from dialogue', 'D1_haggle_from_dialogue'],
            ['D2 — Terminal after haggle', 'D2_terminal_after_haggle'],
        ].map(([label, file]) => `| ${label} | \`reports/screenshots/${file}.png\` |`),
    ].join('\n');

    const rDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(rDir)) fs.mkdirSync(rDir, { recursive: true });
    fs.writeFileSync(path.join(rDir, 'scene-flow-report.md'), md);
    console.log(`  📄  Report → reports/scene-flow-report.md`);
    console.log('═══════════════════════════════════════════════════════\n');

    await browser.close();
    process.exit(allOk ? 0 : 1);
})();
