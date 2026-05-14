#!/usr/bin/env node
/**
 * test_entry_flow.cjs — Smoke test for the 2026-05-13 entry flow rebuild.
 *
 * Verifies:
 *   1. Page loads
 *   2. TitleScene is the first Phaser scene to become active
 *   3. Pressing Enter transitions to DocumentaryScene
 *   4. ESC during DocumentaryScene routes to EmailInbox view (VIEW.EMAIL_INBOX)
 *   5. EmailInbox renders the ArtNet invite email
 *
 * Run: node tests/headless/test_entry_flow.cjs
 * Requires: dev server on port 5175 (or set TEST_PORT)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_PORT = process.env.TEST_PORT || '5175';
const BASE = `http://localhost:${TEST_PORT}/`;
const SS = path.join(__dirname, 'reports', 'screenshots', 'entry_flow');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

let passed = 0, failed = 0;
const browserErrors = [];

function assert(cond, label, note = '') {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}${note ? '  → ' + note : ''}`); }
}

async function waitForScene(page, sceneKey, timeoutMs = 6000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const isActive = await page.evaluate((key) => {
            try {
                const scenes = window.phaserGame?.scene?.scenes ?? [];
                return scenes.some(s => s.sys?.settings?.key === key && s.sys?.isActive?.());
            } catch { return false; }
        }, sceneKey);
        if (isActive) return true;
        await page.waitForTimeout(200);
    }
    return false;
}

async function waitForReactView(page, viewKey, timeoutMs = 6000) {
    // The simplest probe: look for distinctive DOM strings rendered by each view.
    const probeByView = {
        EMAIL_INBOX: 'WEBMAIL',  // chrome bar in EmailInbox.jsx
    };
    const probe = probeByView[viewKey];
    if (!probe) return false;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const found = await page.evaluate((p) => document.body.innerText.includes(p), probe);
        if (found) return true;
        await page.waitForTimeout(200);
    }
    return false;
}

(async () => {
    console.log(`[entry_flow] Connecting to ${BASE}`);
    const browser = await chromium.launch({ headless: true });
    // serviceWorkers:'block' prevents the cached PWA service worker (registered by
    // a prior `npm run build`) from intercepting dev-mode /@vite/client requests.
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        serviceWorkers: 'block',
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
        if (msg.type() === 'error') browserErrors.push(msg.text());
    });
    page.on('pageerror', (err) => browserErrors.push('PAGE ERROR: ' + err.message));

    try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (err) {
        console.log(`  ❌ Could not connect to dev server at ${BASE}`);
        console.log(`     ${err.message}`);
        console.log(`     Start it with: cd game && npm run dev`);
        await browser.close();
        process.exit(2);
    }

    // ── Test 1: page loads ──
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS, '01_initial.png'), fullPage: false });
    const hasPhaser = await page.evaluate(() => typeof window.phaserGame !== 'undefined');
    assert(hasPhaser, 'Phaser game initialised');

    // ── Test 2: TitleScene becomes active ──
    const titleActive = await waitForScene(page, 'TitleScene', 8000);
    await page.screenshot({ path: path.join(SS, '02_title.png'), fullPage: false });
    assert(titleActive, 'TitleScene becomes active');

    // ── Test 3: Trigger TitleScene start action → DocumentaryScene ──
    // We focus the canvas, then dispatch a real KeyboardEvent. Phaser's keyboard
    // plugin listens on window for keydown events.
    await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.setAttribute('tabindex', '0');
            canvas.focus();
        }
        // Dispatch Enter as a real bubbling KeyboardEvent on window so Phaser hears it.
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    });
    await page.waitForTimeout(1500);
    const docActive = await waitForScene(page, 'DocumentaryScene', 6000);
    await page.screenshot({ path: path.join(SS, '03_documentary.png'), fullPage: false });
    assert(docActive, 'DocumentaryScene becomes active after Enter');

    // ── Test 4: ESC during documentary → EmailInbox view ──
    await page.waitForTimeout(2000); // let a few frames play
    await page.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS, '04_email_inbox.png'), fullPage: false });

    const emailInboxRendered = await waitForReactView(page, 'EMAIL_INBOX', 4000);
    assert(emailInboxRendered, 'EmailInbox React view renders after documentary');

    // ── Test 5: ArtNet invite email is in the inbox ──
    const hasInviteEmail = await page.evaluate(() => {
        return document.body.innerText.includes('You have been invited to join ArtNet');
    });
    assert(hasInviteEmail, 'ArtNet invitation email is in the inbox');

    // ── Test 6: No console errors ──
    // Expected non-failures while assets are still being generated:
    //   "Asset failed to load" — placeholder substitution by BootScene loaderror handler
    //   "Failed to process file: %s image doc_frame_NN" — DocumentaryScene procedural fallback path
    //   favicon, sw.js cache misses
    const filteredErrors = browserErrors.filter(e =>
        !e.includes('Asset failed to load') &&
        !e.includes('favicon.ico') &&
        !e.includes('Failed to load resource') &&
        !e.includes('Failed to process file') &&  // DocumentaryScene procedural fallback expected
        !e.includes('doc_frame_')                 // explicit per-frame missing-asset noise
    );
    assert(filteredErrors.length === 0,
        `No unexpected browser errors (saw ${filteredErrors.length})`,
        filteredErrors.slice(0, 3).join(' | '));

    console.log('');
    console.log(`Tests: ${passed} passed, ${failed} failed`);
    console.log(`Screenshots: ${SS}`);
    if (browserErrors.length > 0) {
        console.log(`Browser errors logged: ${browserErrors.length} (see filtered above)`);
    }

    await browser.close();
    process.exit(failed === 0 ? 0 : 1);
})();
