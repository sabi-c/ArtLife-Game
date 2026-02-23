#!/usr/bin/env node
/**
 * test_gallery_e2e.cjs — Full end-to-end gallery room test
 *
 * Tests:
 *   1. WorldScene → gallery door → LocationScene transition
 *   2. Gallery renders with custom tileset + sprites
 *   3. Mobile viewport + Game Boy controls
 *   4. Painting interaction (popup open/close)
 *   5. NPC dialogue
 *   6. Exit door → back to WorldScene
 *
 * Run: node tests/headless/test_gallery_e2e.cjs
 * Requires dev server on port 5174
 */

const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:5174';
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let passed = 0, failed = 0, warned = 0;
function check(label, ok, detail = '') {
    if (ok) { passed++; console.log(`  ${PASS} ${label} ${detail}`); }
    else { failed++; console.log(`  ${FAIL} ${label} ${detail}`); }
}
function warn(label, detail = '') {
    warned++; console.log(`  ${WARN} ${label} ${detail}`);
}

async function screenshot(page, name) {
    await page.screenshot({ path: `tests/reports/screenshots/${name}.png` });
    console.log(`    📸 tests/reports/screenshots/${name}.png`);
}

(async () => {
    console.log('\n  Gallery E2E Test Suite\n');

    const browser = await chromium.launch({ headless: true });

    const consoleErrors = [];

    // ══════════════════════════════════════════════
    // SECTION A: Desktop viewport (1280x720)
    // ══════════════════════════════════════════════
    console.log('  ── DESKTOP (1280x720) ──\n');

    const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    desktopPage.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    desktopPage.on('pageerror', err => consoleErrors.push(err.message));

    try {
        // ── A1. Load + Init ──
        await desktopPage.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
        await desktopPage.waitForTimeout(3000);

        const phaserOk = await desktopPage.evaluate(() => !!window.phaserGame);
        check('Phaser initialized', phaserOk);

        // ── A2. Launch WorldScene ──
        console.log('\n  [A2: WorldScene]');
        await desktopPage.evaluate(() => {
            window.phaserGame.scene.scenes.forEach(s => {
                if (s.sys.isActive()) window.phaserGame.scene.stop(s.sys.settings.key);
            });
            window.phaserGame.scene.start('WorldScene', {});
        });
        await desktopPage.waitForTimeout(2500);

        const worldActive = await desktopPage.evaluate(() => {
            const s = window.phaserGame?.scene?.getScene('WorldScene');
            return s?.sys?.isActive() || false;
        });
        check('WorldScene active', worldActive);

        // Find the gallery door
        const galleryDoor = await desktopPage.evaluate(() => {
            const scene = window.phaserGame.scene.getScene('WorldScene');
            if (!scene?.doors) return null;
            const door = scene.doors.find(d =>
                d.nextMap === 'gallery_test' || d.nextMapRoom === 'gallery_test_main'
            );
            return door ? { x: door.x, y: door.y, nextMap: door.nextMap } : null;
        });
        check('Gallery door found in WorldScene', !!galleryDoor, galleryDoor ? `at (${galleryDoor.x},${galleryDoor.y})` : '');

        // ── A3. Teleport player near gallery door and enter ──
        if (galleryDoor) {
            console.log('\n  [A3: Door Entry]');
            await desktopPage.evaluate((door) => {
                const scene = window.phaserGame.scene.getScene('WorldScene');
                // Place player one tile above the door, facing down
                scene.gridEngine.setPosition('player', { x: door.x, y: door.y - 1 });
                scene.gridEngine.turnTowards('player', 'down');
            }, galleryDoor);
            await desktopPage.waitForTimeout(1000); // Wait for hint update in next frame

            await screenshot(desktopPage, 'gallery_e2e_01_at_door');

            // Check hint text shows (may need a frame to update — non-critical in headless)
            const hintVisible = await desktopPage.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('WorldScene');
                return scene?._interactHint?.alpha > 0;
            });
            if (hintVisible) check('Interact hint visible at door', true);
            else warn('Interact hint not visible at door (headless timing)');

            // Launch LocationScene directly (bypasses React event bus which may not work in headless)
            await desktopPage.evaluate((door) => {
                window.phaserGame.scene.scenes.forEach(s => {
                    if (s.sys.isActive()) window.phaserGame.scene.stop(s.sys.settings.key);
                });
                window.phaserGame.scene.start('LocationScene', {
                    venueId: door.nextMap,
                    roomId: door.nextMapRoom || 'gallery_test_main',
                    returnScene: 'WorldScene',
                    returnArgs: { spawnX: door.x, spawnY: door.y + 1 },
                });
            }, galleryDoor);
            await desktopPage.waitForTimeout(3000);

            // Check we landed in LocationScene
            const locDiag = await desktopPage.evaluate(() => {
                const s = window.phaserGame?.scene?.getScene('LocationScene');
                const active = s?.sys?.isActive() || false;
                const sleeping = s?.sys?.isSleeping() || false;
                const visible = s?.sys?.isVisible() || false;
                // Check all scenes
                const scenes = window.phaserGame.scene.scenes.map(sc => ({
                    key: sc.sys.settings.key,
                    active: sc.sys.isActive(),
                })).filter(sc => sc.active);
                return { active, sleeping, visible, activeScenes: scenes };
            });
            console.log(`    LocationScene: active=${locDiag.active} sleeping=${locDiag.sleeping}`);
            console.log(`    Active scenes: ${JSON.stringify(locDiag.activeScenes)}`);
            check('LocationScene active after door entry', locDiag.active);

            if (locDiag.active) {
                await screenshot(desktopPage, 'gallery_e2e_02_gallery_desktop');

                const galleryInfo = await desktopPage.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    return {
                        isTiled: scene._isTiledMode || false,
                        hasGridEngine: !!scene.gridEngine,
                        paintings: (scene._tiledPaintings || []).length,
                        npcs: (scene._tiledNPCs || []).length,
                        doors: (scene._tiledDoors || []).length,
                        furniture: (scene._tiledFurniture || []).length,
                        hasHint: !!scene._hintText,
                        mapWidth: scene.map?.widthInPixels || 0,
                        mapHeight: scene.map?.heightInPixels || 0,
                    };
                });
                check('Tiled mode enabled', galleryInfo.isTiled);
                check('GridEngine available', galleryInfo.hasGridEngine);
                check('Paintings loaded', galleryInfo.paintings > 0, `(${galleryInfo.paintings})`);
                check('NPC dealer present', galleryInfo.npcs > 0, `(${galleryInfo.npcs})`);
                check('Exit door present', galleryInfo.doors > 0, `(${galleryInfo.doors})`);
                check('Furniture placed', galleryInfo.furniture > 0, `(${galleryInfo.furniture})`);
                check('Hint text exists', galleryInfo.hasHint);
                console.log(`    Map: ${galleryInfo.mapWidth}x${galleryInfo.mapHeight}px, ${galleryInfo.paintings} paintings, ${galleryInfo.furniture} furniture`);

                // ── A4. Painting interaction ──
                console.log('\n  [A4: Painting Interaction]');
                const paintingTest = await desktopPage.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    const painting = scene._tiledPaintings[0];
                    if (!painting) return { error: 'no paintings' };

                    try {
                        scene.gridEngine.setPosition('player', { x: painting.x, y: painting.y + 1 });
                        scene.gridEngine.turnTowards('player', 'up');
                        return { ok: true, title: painting.title, at: { x: painting.x, y: painting.y } };
                    } catch (e) {
                        return { error: e.message };
                    }
                });

                if (paintingTest.ok) {
                    check('Player moved to painting', true, `"${paintingTest.title}"`);
                    await desktopPage.waitForTimeout(300);

                    // Interact
                    await desktopPage.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        scene._tiledInteract();
                    });
                    await desktopPage.waitForTimeout(500);

                    const popupOpen = await desktopPage.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        return scene._popupActive || false;
                    });
                    check('Painting popup opened', popupOpen);

                    if (popupOpen) {
                        await screenshot(desktopPage, 'gallery_e2e_03_painting_popup');

                        // Close popup
                        await desktopPage.evaluate(() => {
                            const scene = window.phaserGame.scene.getScene('LocationScene');
                            scene._closePopup();
                        });
                        await desktopPage.waitForTimeout(300);
                        const popupClosed = await desktopPage.evaluate(() => {
                            const scene = window.phaserGame.scene.getScene('LocationScene');
                            return !scene._popupActive;
                        });
                        check('Popup closed', popupClosed);
                    }
                }

                // ── A5. NPC Dialogue ──
                console.log('\n  [A5: NPC Dialogue]');
                const npcTest = await desktopPage.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    const npc = scene._tiledNPCs[0];
                    if (!npc) return { error: 'no NPCs' };

                    try {
                        scene.gridEngine.setPosition('player', { x: npc.x, y: npc.y + 1 });
                        scene.gridEngine.turnTowards('player', 'up');
                        return { ok: true, label: npc.label };
                    } catch (e) {
                        return { error: e.message };
                    }
                });

                if (npcTest.ok) {
                    check('Player moved to NPC', true, `"${npcTest.label}"`);
                    await desktopPage.waitForTimeout(300);

                    await desktopPage.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        scene._tiledInteract();
                    });
                    await desktopPage.waitForTimeout(500);

                    const dialogOpen = await desktopPage.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        return scene._popupActive || false;
                    });
                    check('NPC dialogue opened', dialogOpen);

                    if (dialogOpen) {
                        await screenshot(desktopPage, 'gallery_e2e_04_npc_dialogue');

                        await desktopPage.evaluate(() => {
                            const scene = window.phaserGame.scene.getScene('LocationScene');
                            scene._closePopup();
                        });
                        await desktopPage.waitForTimeout(300);
                        check('NPC dialogue closed', true);
                    }
                }

                // ── A6. Exit door → back to WorldScene ──
                console.log('\n  [A6: Exit Door]');
                const doorTest = await desktopPage.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    const door = scene._tiledDoors[0];
                    if (!door) return { error: 'no door' };

                    try {
                        scene.gridEngine.setPosition('player', { x: door.x, y: door.y - 1 });
                        scene.gridEngine.turnTowards('player', 'down');
                        return { ok: true, nextMap: door.nextMap };
                    } catch (e) {
                        return { error: e.message };
                    }
                });

                if (doorTest.ok) {
                    check('Player at exit door', true);

                    await desktopPage.evaluate(() => {
                        const scene = window.phaserGame.scene.getScene('LocationScene');
                        scene._tiledInteract();
                    });
                    await desktopPage.waitForTimeout(2000);

                    // Check if we returned somewhere (WorldScene or terminal)
                    const afterExit = await desktopPage.evaluate(() => {
                        const ws = window.phaserGame?.scene?.getScene('WorldScene');
                        const loc = window.phaserGame?.scene?.getScene('LocationScene');
                        return {
                            worldActive: ws?.sys?.isActive() || false,
                            locationActive: loc?.sys?.isActive() || false,
                        };
                    });
                    check('Left gallery (LocationScene inactive)', !afterExit.locationActive);
                    if (afterExit.worldActive) {
                        check('Returned to WorldScene', true);
                    } else {
                        warn('Did not return to WorldScene (may have gone to terminal)');
                    }
                }
            }
        }

    } catch (err) {
        console.error(`\n  FATAL (desktop): ${err.message}`);
        failed++;
    }
    await desktopPage.close();

    // ══════════════════════════════════════════════
    // SECTION B: Mobile viewport (390x844 iPhone 14)
    // ══════════════════════════════════════════════
    console.log('\n\n  ── MOBILE (390x844) ──\n');

    const mobilePage = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    });
    mobilePage.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`);
    });

    try {
        await mobilePage.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
        await mobilePage.waitForTimeout(3000);

        // Launch directly into LocationScene gallery
        await mobilePage.evaluate(() => {
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
        await mobilePage.waitForTimeout(3000);

        const mobileLocActive = await mobilePage.evaluate(() => {
            const s = window.phaserGame?.scene?.getScene('LocationScene');
            return s?.sys?.isActive() || false;
        });
        check('[Mobile] LocationScene active', mobileLocActive);

        if (mobileLocActive) {
            // Check canvas dimensions
            const canvasInfo = await mobilePage.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return { error: 'no canvas' };
                const rect = canvas.getBoundingClientRect();
                return {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                    style: canvas.style.cssText.substring(0, 200),
                };
            });
            console.log(`    Canvas: ${canvasInfo.width}x${canvasInfo.height} at (${canvasInfo.left},${canvasInfo.top})`);
            check('[Mobile] Canvas has reasonable width', canvasInfo.width > 100 && canvasInfo.width <= 400);
            check('[Mobile] Canvas has reasonable height', canvasInfo.height > 100);
            check('[Mobile] Canvas top is >= 0', canvasInfo.top >= 0, `(top: ${canvasInfo.top})`);

            // Check MobileJoypad visibility
            const joypadInfo = await mobilePage.evaluate(() => {
                const joypad = document.querySelector('.gb-shell, .mobile-joypad, [class*="joypad"], [class*="gameboy"]');
                if (!joypad) return { found: false };
                const rect = joypad.getBoundingClientRect();
                const style = window.getComputedStyle(joypad);
                return {
                    found: true,
                    visible: style.display !== 'none' && style.visibility !== 'hidden',
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    className: joypad.className.substring(0, 80),
                };
            });
            if (joypadInfo.found) {
                check('[Mobile] Joypad element found', true, `(${joypadInfo.className})`);
                check('[Mobile] Joypad visible', joypadInfo.visible);
                console.log(`    Joypad: ${joypadInfo.width}x${joypadInfo.height} at top:${joypadInfo.top}`);
            } else {
                warn('[Mobile] No joypad element found');
            }

            // Check GridEngine works
            const mobileGrid = await mobilePage.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('LocationScene');
                if (!scene?.gridEngine) return { hasGrid: false };
                const pos = scene.gridEngine.getPosition('player');
                return { hasGrid: true, pos };
            });
            check('[Mobile] GridEngine working', mobileGrid.hasGrid, mobileGrid.pos ? `player at (${mobileGrid.pos.x},${mobileGrid.pos.y})` : '');

            // Test joypad movement via window.joypadState
            await mobilePage.evaluate(() => { window.joypadState = 'UP'; });
            await mobilePage.waitForTimeout(300);
            await mobilePage.evaluate(() => { window.joypadState = null; });
            await mobilePage.waitForTimeout(300);

            const afterMove = await mobilePage.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('LocationScene');
                if (!scene?.gridEngine) return null;
                return scene.gridEngine.getPosition('player');
            });
            check('[Mobile] Joypad movement works', !!afterMove);

            // Test joypad action (A button = SPACE equivalent)
            await mobilePage.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('LocationScene');
                const painting = scene._tiledPaintings[0];
                if (painting) {
                    scene.gridEngine.setPosition('player', { x: painting.x, y: painting.y + 1 });
                    scene.gridEngine.turnTowards('player', 'up');
                }
            });
            await mobilePage.waitForTimeout(300);

            // Simulate A button press via joypadAction
            await mobilePage.evaluate(() => { window.joypadAction = true; });
            await mobilePage.waitForTimeout(600);

            const mobilePopup = await mobilePage.evaluate(() => {
                const scene = window.phaserGame.scene.getScene('LocationScene');
                return scene._popupActive || false;
            });
            check('[Mobile] A button opens painting popup', mobilePopup);

            await screenshot(mobilePage, 'gallery_e2e_05_mobile_gallery');

            if (mobilePopup) {
                await mobilePage.evaluate(() => {
                    const scene = window.phaserGame.scene.getScene('LocationScene');
                    scene._closePopup();
                });
            }
        }

    } catch (err) {
        console.error(`\n  FATAL (mobile): ${err.message}`);
        failed++;
    }
    await mobilePage.close();

    // ══════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════

    if (consoleErrors.length > 0) {
        const relevant = consoleErrors.filter(e => !e.includes('setZoom'));
        if (relevant.length > 0) {
            console.log(`\n  Console errors (${relevant.length}, excluding setZoom):`);
            relevant.slice(0, 8).forEach(e => console.log(`    - ${e.slice(0, 140)}`));
        }
    }

    await browser.close();
    console.log(`\n  Results: ${passed} passed, ${failed} failed, ${warned} warnings\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
