const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('[Haggle') || t.includes('ERROR') || t.includes('warn')) console.log('BROWSER:', t);
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.game.start(0));
    await page.waitForTimeout(500);

    const opts = await page.evaluate(() => window.game.options());
    const mIdx = opts.findIndex(o => o.includes('Browse Market'));
    await page.evaluate((n) => window.game.press(n + 1), mIdx);
    await page.waitForTimeout(200);

    const mOpts = await page.evaluate(() => window.game.options());
    const inspIdx = mOpts.findIndex(o => o.includes('Inspect'));
    await page.evaluate((n) => window.game.press(n + 1), inspIdx);
    await page.waitForTimeout(200);

    const iOpts = await page.evaluate(() => window.game.options());
    const haggleIdx = iOpts.findIndex(o => o.toLowerCase().includes('haggle'));
    await page.evaluate((n) => window.game.press(n + 1), haggleIdx);

    // Wait for HaggleScene to fully start + opening dialogue to finish (1s delay + typing)
    await page.waitForTimeout(6000);

    let hs = await page.evaluate(() => window.game.haggleState());
    console.log('After 6s - HaggleScene state:', JSON.stringify(hs));

    // Get canvas CSS dimensions
    const canvasCSS = await page.evaluate(() => {
        const c = window.phaserGame && window.phaserGame.canvas;
        if (!c) return null;
        const rect = c.getBoundingClientRect();
        return { cssW: rect.width, cssH: rect.height, cssLeft: rect.left, cssTop: rect.top, pixelW: c.width, pixelH: c.height };
    });
    console.log('Canvas CSS dimensions:', JSON.stringify(canvasCSS));

    // The tactic buttons are in the lower portion of the dialogue box area
    // Dialogue box is at height - dlHeight - 40 = h - 120 - 40 = h - 160
    // Each button is ~(dlHeight - padY*3) / 2 = (120 - 45) / 2 = 37.5px tall
    // In CSS space: tactics grid starts at about cssH - 160 (CSS pixels)
    const cssW = canvasCSS ? canvasCSS.cssW : 800;
    const cssH = canvasCSS ? canvasCSS.cssH : 600;

    // Scale factor: canvas CSS size vs game size
    const scaleX = canvasCSS ? canvasCSS.cssW / canvasCSS.pixelW : 1;
    const scaleY = canvasCSS ? canvasCSS.cssH / canvasCSS.pixelH : 1;
    console.log('Scale factors:', scaleX.toFixed(3), scaleY.toFixed(3));

    // Phaser game pixel coords for first tactic button (top-left of 2x2 grid)
    // dlHeight=120, dlY=h-120-40, padX=20, padY=15, btnH~37.5
    // Button 1 center: x=30+20 + btnW/2, y=dlY+15 + btnH/2
    // In CSS pixels: scale by scaleX/scaleY
    const gameH = canvasCSS ? canvasCSS.pixelH : 600;
    const gameW = canvasCSS ? canvasCSS.pixelW : 800;
    const dlHeight = 120;
    const dlY = gameH - dlHeight - 40;
    const padX = 20;
    const padY = 15;
    const btnW = (gameW - 60 - padX * 3) / 2;
    const btnH = (dlHeight - padY * 3) / 2;
    const btn1GameX = 30 + padX + btnW / 2;
    const btn1GameY = dlY + padY + btnH / 2;
    const btn1CssX = btn1GameX * scaleX;
    const btn1CssY = btn1GameY * scaleY;
    console.log(`Tactic btn1 game coords: (${Math.round(btn1GameX)}, ${Math.round(btn1GameY)})`);
    console.log(`Tactic btn1 CSS coords: (${Math.round(btn1CssX)}, ${Math.round(btn1CssY)})`);

    // Check what's at that CSS coordinate
    const topEl = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tagName: el.tagName, id: el.id, cls: (el.className || '').substring(0, 40) } : null;
    }, { x: btn1CssX, y: btn1CssY });
    console.log('Element at tactic area:', JSON.stringify(topEl));

    // Click it
    await page.mouse.click(btn1CssX, btn1CssY);
    await page.waitForTimeout(3000);

    hs = await page.evaluate(() => window.game.haggleState());
    console.log('After tactic click - HaggleScene state:', JSON.stringify(hs));

    const errors = await page.evaluate(() => window.ArtLife.report());
    if (errors.errors.length || errors.sceneErrors.length) {
        console.log('ERRORS:', JSON.stringify(errors));
    }

    await browser.close();
})().catch(e => { console.error('CRASH:', e.message, e.stack); process.exit(1); });
