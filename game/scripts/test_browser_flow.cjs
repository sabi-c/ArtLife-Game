const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 730 } });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Fresh load with cache disabled
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const getActive = () => page.evaluate(() =>
        window.phaserGame.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key)
    );

    const cx = 640, cy = 365; // center of viewport

    // Screenshot 1: Title
    await page.screenshot({ path: 'reports/screenshots/flow_01_title.png' });
    console.log('1. TITLE:', await getActive());

    // Click to start new game
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'reports/screenshots/flow_02_intro_start.png' });
    console.log('2. INTRO START:', await getActive());

    // Click through all 6 lines of dialogue
    for (let i = 0; i < 12; i++) {
        await page.mouse.click(cx, cy);
        await page.waitForTimeout(600);
    }

    // Wait for ACCESS GRANTED + fade
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'reports/screenshots/flow_03_charselect.png' });
    console.log('3. CHAR SELECT:', await getActive());

    // Navigate character select: press Space to confirm archetype (Nepo Baby)
    await page.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32 }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32 }));
    });
    await page.waitForTimeout(500);

    // Check phase
    let phase = await page.evaluate(() => {
        const cs = window.phaserGame.scene.getScene('CharacterSelectScene');
        return cs?._phase;
    });
    console.log('   Phase after Space:', phase);

    // If Space didn't work (JustDown timing), use API
    if (phase === 'archetype') {
        await page.evaluate(() => {
            const cs = window.phaserGame.scene.getScene('CharacterSelectScene');
            cs._char = cs._char || (function() {
                const chars = cs.__proto__.constructor.toString(); // can't access CHARACTERS this way
                return null;
            })();
            // Just simulate the space press via the tick
            cs._k.space.isDown = true;
        });
        await page.waitForTimeout(100);
        phase = await page.evaluate(() => {
            const cs = window.phaserGame.scene.getScene('CharacterSelectScene');
            return cs?._phase;
        });
        console.log('   Phase after retry:', phase);
    }

    // Screenshot whatever phase we're at
    await page.screenshot({ path: 'reports/screenshots/flow_04_phase2.png' });

    // Use confirmSelection API to fast-forward through all 6 phases
    await page.evaluate(() => {
        const cs = window.phaserGame.scene.getScene('CharacterSelectScene');
        if (cs && cs.scene.isActive()) cs.confirmSelection(0);
    });
    console.log('4. Called confirmSelection(0)');

    // Wait for APPLICATION APPROVED + WELCOME TO ARTLIFE + flash
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'reports/screenshots/flow_05_dashboard.png' });

    const dashState = await page.evaluate(() => {
        const t = document.getElementById('terminal');
        const canvas = document.querySelector('canvas');
        return {
            scenes: window.phaserGame.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key),
            terminalDisplay: t?.style.display,
            terminalHasContent: (t?.innerHTML?.length || 0) > 50,
            hasEgoTerminal: t?.innerHTML?.includes('EGO TERMINAL'),
            canvasDisplay: canvas?.style.display,
        };
    });
    console.log('5. DASHBOARD:', JSON.stringify(dashState, null, 2));

    if (errors.length) console.log('\nErrors:', errors);
    else console.log('\n✅ Full flow completed — no errors');

    await browser.close();
})();
