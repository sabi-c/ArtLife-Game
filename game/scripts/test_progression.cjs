const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    console.log('Loading http://127.0.0.1:5173/ ...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 1. Check active scenes
    const active1 = await page.evaluate(() => {
        const g = window.phaserGame;
        if (!g) return ['NO PHASER'];
        return g.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    });
    console.log('1. Active:', active1.join(', '));

    // 2. TitleScene → IntroScene
    await page.evaluate(() => {
        window.phaserGame.scene.getScene('TitleScene').confirmSelection();
    });
    await page.waitForTimeout(1500);

    const active2 = await page.evaluate(() =>
        window.phaserGame.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key)
    );
    console.log('2. After start:', active2.join(', '));

    // 3. Skip intro
    await page.evaluate(() => {
        const intro = window.phaserGame.scene.getScene('IntroScene');
        if (intro && intro.scene.isActive()) intro._skipToSelect();
    });
    await page.waitForTimeout(1000);

    const active3 = await page.evaluate(() =>
        window.phaserGame.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key)
    );
    console.log('3. After skip:', active3.join(', '));

    // 4. CharacterSelect → Dashboard
    await page.evaluate(() => {
        const cs = window.phaserGame.scene.getScene('CharacterSelectScene');
        if (cs && cs.scene.isActive()) cs.confirmSelection(0);
    });
    await page.waitForTimeout(4000);

    const dashResult = await page.evaluate(() => {
        const t = document.getElementById('terminal');
        return {
            visible: t && t.style.display !== 'none',
            hasEgo: t && t.innerHTML.includes('EGO TERMINAL'),
            hasTicker: t && t.innerHTML.includes('ticker-track'),
            hasMarketDesk: t && t.innerHTML.includes('MARKET DESK'),
            hasDossier: t && t.innerHTML.includes('DOSSIER'),
        };
    });
    console.log('4. Dashboard:', JSON.stringify(dashResult));

    if (errors.length) console.log('\nErrors:\n' + errors.join('\n'));
    else console.log('\n✅ Full flow works — no errors!');

    await browser.close();
})();
