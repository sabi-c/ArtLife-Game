#!/usr/bin/env node
/**
 * test_gallery_flow.cjs — Smoke test: WorldScene → Gallery door → LocationScene
 * Tests the full gallery room flow including interactions.
 *
 * Run: node tests/headless/test_gallery_flow.cjs
 * Requires dev server running on port 5174
 */

const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:5174';
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

let passed = 0, failed = 0;
function check(label, ok, detail = '') {
    if (ok) { passed++; console.log(`  ${PASS} ${label}`); }
    else { failed++; console.log(`  ${FAIL} ${label} ${detail}`); }
}

(async () => {
    console.log('\n  Gallery Flow Test\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    try {
        // ── 1. Load page ──
        await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(3000);

        const phaserExists = await page.evaluate(() => !!window.phaserGame);
        check('Phaser initialized', phaserExists);

        // ── 2. Launch WorldScene ──
        console.log('\n  [WorldScene]');
        await page.evaluate(() => {
            window.phaserGame.scene.scenes.forEach(s => {
                if (s.sys.isActive()) window.phaserGame.scene.stop(s.sys.settings.key);
            });
            window.phaserGame.scene.start('WorldScene', {});
        });
        await page.waitForTimeout(2500);

        const worldActive = await page.evaluate(() => {
            const s = window.phaserGame?.scene?.getScene('WorldScene');
            return s?.sys?.isActive() || false;
        });
        check('WorldScene active', worldActive);

        if (worldActive) {
            const worldInfo = await page.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('WorldScene');
                if (!scene?.gridEngine) return { hasGrid: false };
                const pos = scene.gridEngine.getPosition('player');
                return {
                    hasGrid: true,
                    playerPos: pos,
                    doorCount: (scene.doors || []).length,
                    npcCount: (scene.npcData || []).length,
                    dialogCount: (scene.dialogs || []).length,
                };
            });
            check('WorldScene has GridEngine', worldInfo.hasGrid);
            check('WorldScene has doors', worldInfo.doorCount > 0, `(${worldInfo.doorCount})`);
            console.log(`    Player at (${worldInfo.playerPos?.x}, ${worldInfo.playerPos?.y}), ${worldInfo.doorCount} doors, ${worldInfo.npcCount} NPCs`);

            // Check the interact hint system
            const hintExists = await page.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('WorldScene');
                return !!scene?._interactHint;
            });
            check('WorldScene has interaction hint', hintExists);
        }

        // ── 3. Launch LocationScene (gallery_test) directly ──
        console.log('\n  [LocationScene — Gallery]');
        await page.evaluate(() => {
            window.phaserGame.scene.scenes.forEach(s => {
                if (s.sys.isActive()) window.phaserGame.scene.stop(s.sys.settings.key);
            });
            window.phaserGame.scene.start('LocationScene', {
                venueId: 'gallery_test',
                roomId: 'gallery_test_main',
                returnScene: 'WorldScene',
                returnArgs: { spawnX: 12, spawnY: 10 },
            });
        });
        await page.waitForTimeout(3000);

        const locInfo = await page.evaluate(() => {
            const scene = window.phaserGame?.scene?.getScene('LocationScene');
            if (!scene?.sys?.isActive()) return { active: false, error: 'not active' };
            return {
                active: true,
                isTiledMode: scene._isTiledMode || false,
                hasGridEngine: !!scene.gridEngine,
                hasMap: !!scene.map,
                hasPlayer: !!scene.player,
                paintings: (scene._tiledPaintings || []).length,
                npcs: (scene._tiledNPCs || []).length,
                doors: (scene._tiledDoors || []).length,
                dialogs: (scene._tiledDialogs || []).length,
                hintText: scene._hintText ? true : false,
            };
        });

        check('LocationScene active', locInfo.active);
        check('Tiled mode enabled', locInfo.isTiledMode);
        check('GridEngine available', locInfo.hasGridEngine);
        check('Map loaded', locInfo.hasMap);
        check('Player sprite created', locInfo.hasPlayer);
        check('Paintings found', locInfo.paintings > 0, `(${locInfo.paintings})`);
        check('NPC found', locInfo.npcs > 0, `(${locInfo.npcs})`);
        check('Exit door found', locInfo.doors > 0, `(${locInfo.doors})`);
        check('Hint text exists', locInfo.hintText);

        if (locInfo.active) {
            console.log(`    ${locInfo.paintings} paintings, ${locInfo.npcs} NPCs, ${locInfo.doors} doors, ${locInfo.dialogs} dialogs`);
        }

        // ── 4. Try painting interaction ──
        console.log('\n  [Interactions]');
        if (locInfo.hasGridEngine && locInfo.paintings > 0) {
            // Move player to face a painting (paintings are on north wall, y=1)
            const interactResult = await page.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('LocationScene');
                if (!scene?.gridEngine) return { error: 'no gridEngine' };

                // Teleport player near a painting and face it
                const painting = scene._tiledPaintings[0];
                if (!painting) return { error: 'no painting' };

                try {
                    scene.gridEngine.setPosition('player', { x: painting.x, y: painting.y + 1 });
                    // Simulate facing up
                    scene.gridEngine.turnTowards('player', 'up');
                } catch (e) {
                    // setPosition/turnTowards may not exist, try moveTo
                    return { teleported: false, note: e.message };
                }

                return {
                    teleported: true,
                    paintingAt: { x: painting.x, y: painting.y },
                    title: painting.title,
                };
            });

            if (interactResult.teleported) {
                check('Player moved near painting', true, `"${interactResult.title}"`);

                // Trigger interaction
                await page.waitForTimeout(500);
                await page.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    scene._tiledInteract();
                });
                await page.waitForTimeout(500);

                const popupVisible = await page.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    return scene._popupActive || false;
                });
                check('Painting popup opened', popupVisible);

                if (popupVisible) {
                    // Close it
                    await page.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        scene._closePopup();
                    });
                    const closed = await page.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        return !scene._popupActive;
                    });
                    check('Popup closed', closed);
                }
            } else {
                console.log(`    (Skipping painting interaction: ${interactResult.note || interactResult.error})`);
            }
        }

        // ── 5. Screenshot ──
        await page.screenshot({ path: 'tests/reports/screenshots/gallery_room.png' });
        console.log('\n    Screenshot: tests/reports/screenshots/gallery_room.png');

        // ── 6. Runtime error report ──
        const runtimeReport = await page.evaluate(() => {
            return window.ArtLife?.report?.() || { errors: [], missingAssets: [] };
        });

        if (runtimeReport.errors?.length > 0) {
            console.log(`\n  Runtime errors: ${runtimeReport.errors.length}`);
            runtimeReport.errors.forEach(e => console.log(`    - ${e}`));
        }
        if (runtimeReport.missingAssets?.length > 0) {
            console.log(`  Missing assets: ${runtimeReport.missingAssets.length}`);
            runtimeReport.missingAssets.forEach(a => console.log(`    - ${a}`));
        }

        if (consoleErrors.length > 0) {
            console.log(`\n  Console errors (${consoleErrors.length}):`);
            consoleErrors.slice(0, 10).forEach(e => console.log(`    - ${e.slice(0, 120)}`));
        }

    } catch (err) {
        console.error(`\n  FATAL: ${err.message}`);
        failed++;
    } finally {
        await browser.close();
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
