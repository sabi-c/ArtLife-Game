#!/usr/bin/env node
/**
 * walkthrough.cjs — Full manual-style walkthrough with screenshots.
 *
 * Does what a real player would do, on desktop AND mobile. Screenshots every step.
 * Clicks, taps, waits for animations, checks the actual visual state.
 *
 * Output: tests/headless/reports/screenshots/walkthrough/{device}/NN_step.png
 *
 * Run: TEST_PORT=5175 node tests/headless/walkthrough.cjs
 */

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_PORT = process.env.TEST_PORT || '5175';
const BASE = `http://localhost:${TEST_PORT}/`;

const SS_ROOT = path.join(__dirname, 'reports', 'screenshots', 'walkthrough');
if (fs.existsSync(SS_ROOT)) fs.rmSync(SS_ROOT, { recursive: true, force: true });

const REPORT = { devices: [] };

async function shot(page, dir, stepIdx, name) {
    const file = path.join(SS_ROOT, dir, `${String(stepIdx).padStart(2, '0')}_${name}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: false });
    return file;
}

async function getSceneState(page) {
    return await page.evaluate(() => {
        const g = window.phaserGame;
        if (!g) return { phaser: false };
        const active = g.scene.scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key);
        return { phaser: true, active };
    });
}

async function pressKey(page, key, code) {
    await page.evaluate((args) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: args.key, code: args.code, keyCode: args.keyCode, bubbles: true }));
    }, { key, code, keyCode: code === 'Enter' ? 13 : code === 'Escape' ? 27 : 0 });
}

async function tap(page, selector) {
    const elem = await page.$(selector);
    if (!elem) return false;
    const box = await elem.boundingBox();
    if (!box) return false;
    await page.touchscreen?.tap?.(box.x + box.width / 2, box.y + box.height / 2)
        .catch(async () => { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); });
    return true;
}

async function tapAt(page, x, y) {
    try { await page.touchscreen?.tap?.(x, y); }
    catch { await page.mouse.click(x, y); }
}

async function clearStorage(page) {
    await page.evaluate(() => {
        try { localStorage.clear(); sessionStorage.clear(); } catch {}
    });
}

async function walkthrough({ name, viewport, hasTouch, isMobile }) {
    console.log(`\n=== ${name} ===`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport,
        hasTouch,
        isMobile,
        serviceWorkers: 'block',
        deviceScaleFactor: isMobile ? 2 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    const logged = [];
    page.on('console', m => {
        const t = m.text();
        if (m.type() === 'error' && !t.includes('Asset failed') && !t.includes('Failed to process file') && !t.includes('doc_frame_') && !t.includes('Failed to load resource') && !t.includes('favicon')) {
            errors.push(t.slice(0, 200));
        }
        logged.push(`[${m.type()}] ${t.slice(0, 120)}`);
    });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    const findings = [];
    const slug = name.toLowerCase().replace(/\W+/g, '_');
    let step = 0;
    const record = (msg, level = 'info') => { console.log(`  ${level === 'fail' ? '❌' : '✓'} ${msg}`); findings.push({ level, msg }); };

    // ── Step 1: Load page, clear save state, reload to force fresh entry ──
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await clearStorage(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await shot(page, slug, ++step, 'page_loaded');

    // Wait for Phaser
    let state = { phaser: false };
    for (let i = 0; i < 30; i++) {
        state = await getSceneState(page);
        if (state.phaser && state.active?.length) break;
        await page.waitForTimeout(300);
    }
    if (state.phaser) record(`Phaser up, active: ${state.active?.join(',') || 'none'}`);
    else { record('Phaser did NOT initialize', 'fail'); }

    // ── Step 2: TitleScene visible ──
    const titleActive = state.active?.includes('TitleScene');
    if (titleActive) record('TitleScene active');
    else record('TitleScene NOT active', 'fail');
    await page.waitForTimeout(800);
    await shot(page, slug, ++step, 'title_scene');

    // Capture the visible text on TitleScene as evidence
    const titleText = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas ? canvas.toDataURL ? 'canvas-ok' : 'no-canvas' : 'no-canvas';
    });
    if (titleText === 'canvas-ok') record('TitleScene canvas rendered');

    // ── Step 3: Try TAPPING the [1] option (mobile-style interaction) ──
    // The options are pixel art text at known positions in TitleScene. Try tapping center-ish.
    if (hasTouch) {
        const { width, height } = viewport;
        const tapX = width / 2;
        const tapY = height * 0.55;  // approximate [1] option position
        await tapAt(page, tapX, tapY);
        await page.waitForTimeout(1200);
        await shot(page, slug, ++step, 'after_tap_option1');
        const s2 = await getSceneState(page);
        if (s2.active?.includes('DocumentaryScene')) record('Tap advanced to DocumentaryScene');
        else record(`Tap did NOT advance — still on ${s2.active?.join(',')}`, 'fail');
    }

    // ── Step 4: If tap didn't work (or no touch), press Enter ──
    let s3 = await getSceneState(page);
    if (!s3.active?.includes('DocumentaryScene')) {
        await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (canvas) { canvas.setAttribute('tabindex', '0'); canvas.focus(); }
        });
        await pressKey(page, 'Enter', 'Enter');
        await page.waitForTimeout(1500);
        await shot(page, slug, ++step, 'after_enter_key');
        s3 = await getSceneState(page);
        if (s3.active?.includes('DocumentaryScene')) record('Enter advanced to DocumentaryScene');
        else record(`Enter did NOT advance — still on ${s3.active?.join(',')}`, 'fail');
    }

    // ── Step 5: Watch documentary play. Screenshot at multiple time points to capture different frames. ──
    if (s3.active?.includes('DocumentaryScene')) {
        for (let i = 1; i <= 4; i++) {
            await page.waitForTimeout(2500);
            await shot(page, slug, ++step, `documentary_frame_${i}`);
        }
    }

    // ── Step 6: Skip to end via Escape ──
    await pressKey(page, 'Escape', 'Escape');
    await page.waitForTimeout(1800);
    await shot(page, slug, ++step, 'after_escape');

    // ── Step 7: EmailInbox visible? ──
    const inboxVisible = await page.evaluate(() => document.body.innerText.includes('WEBMAIL'));
    if (inboxVisible) record('EmailInbox rendered after documentary');
    else record('EmailInbox NOT rendered', 'fail');

    const inviteVisible = await page.evaluate(() => document.body.innerText.includes('You have been invited to join ArtNet'));
    if (inviteVisible) record('ArtNet invite email visible in inbox');
    else record('ArtNet invite NOT in inbox', 'fail');

    // ── Step 8: Click the ArtNet invite email to open it ──
    const inviteHandle = await page.locator('text=You have been invited to join ArtNet').first();
    let inviteClicked = false;
    try {
        await inviteHandle.click({ timeout: 3000 });
        inviteClicked = true;
    } catch { /* ignore */ }
    await page.waitForTimeout(800);
    await shot(page, slug, ++step, 'email_invite_opened');
    if (inviteClicked) {
        // Confirm read pane shows the body
        const bodyOpen = await page.evaluate(() => document.body.innerText.includes('A trusted member of ArtNet'));
        if (bodyOpen) record('Email body rendered in read pane');
        else record('Email body did NOT render', 'fail');
    } else {
        record('Could not click email row', 'fail');
    }

    // ── Step 9: Try clicking the "Sign in to ArtNet" link inside the email ──
    try {
        await page.locator('text=SIGN IN TO ARTNET').first().click({ timeout: 3000 });
        await page.waitForTimeout(800);
        await shot(page, slug, ++step, 'after_signin_click');
        record('Sign-in link clicked (handler runs — currently shows UI notification)');
    } catch (e) {
        record(`Sign-in link click failed: ${e.message.slice(0, 100)}`, 'fail');
    }

    // ── Step 10: Open Admin overlay (backtick) ──
    await pressKey(page, '`', 'Backquote');
    await page.waitForTimeout(1200);
    await shot(page, slug, ++step, 'admin_overlay');
    const adminOpen = await page.evaluate(() => document.body.innerText.includes('Admin') || document.body.innerText.includes('ADMIN'));
    if (adminOpen) record('Admin overlay opens via backtick');
    else record('Admin overlay did NOT open via backtick', 'fail');

    // ── Step 11: Click the Social Battle scaffold button ──
    try {
        await page.locator('text=Social Battle').first().click({ timeout: 3000 });
        await page.waitForTimeout(1200);
        await shot(page, slug, ++step, 'social_battle');
        const battleOpen = await page.evaluate(() => document.body.innerText.includes('CHOOSE A MOVE'));
        if (battleOpen) record('SocialBattle overlay launches with 4-button move panel');
        else record('SocialBattle overlay did NOT launch', 'fail');

        // Try clicking the Deep move
        if (battleOpen) {
            await page.locator('text=[ DEEP ]').first().click({ timeout: 3000 });
            await page.waitForTimeout(800);
            await shot(page, slug, ++step, 'social_battle_deep_move');
            // Match "LANDING" (CSS uppercases the outcome label). innerText returns
            // visually rendered text post-textTransform, but be safe with case-insensitive match.
            const responded = await page.evaluate(() => /landing/i.test(document.body.innerText));
            if (responded) record('Deep move resolved with NPC response');
            else record('Deep move did not produce a response', 'fail');
        }
    } catch (e) {
        record(`Social Battle launch failed: ${e.message.slice(0, 100)}`, 'fail');
    }

    REPORT.devices.push({ name, viewport, findings, errors: errors.slice(0, 10), pass: !findings.some(f => f.level === 'fail') });

    await browser.close();
}

(async () => {
    // Desktop
    await walkthrough({ name: 'Desktop', viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false });
    // Mobile (iPhone 13)
    const iphone = devices['iPhone 13'];
    await walkthrough({
        name: 'Mobile iPhone',
        viewport: iphone.viewport,
        hasTouch: true,
        isMobile: true,
    });

    // ── Final report ──
    console.log('\n────────────────────────────────────────');
    console.log('Walkthrough complete');
    console.log('────────────────────────────────────────');
    for (const d of REPORT.devices) {
        console.log(`\n${d.name}: ${d.pass ? '✅ PASS' : '❌ ISSUES'}`);
        const fails = d.findings.filter(f => f.level === 'fail');
        if (fails.length) {
            console.log('  failures:');
            fails.forEach(f => console.log(`    - ${f.msg}`));
        }
        if (d.errors.length) {
            console.log('  errors:');
            d.errors.slice(0, 5).forEach(e => console.log(`    - ${e.slice(0, 200)}`));
        }
    }
    console.log(`\nScreenshots: ${SS_ROOT}`);
    fs.writeFileSync(path.join(SS_ROOT, '_report.json'), JSON.stringify(REPORT, null, 2));

    const anyFail = REPORT.devices.some(d => !d.pass);
    process.exit(anyFail ? 1 : 0);
})();
