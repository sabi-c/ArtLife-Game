/**
 * test_worldscene.cjs — Headless WorldScene tileset diagnostic
 * 
 * Launches the game in headless Chromium, navigates to WorldScene,
 * and captures all console output to diagnose tileset loading issues.
 * 
 * Usage: node tests/headless/test_worldscene.cjs
 */

const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
        const text = `[${msg.type()}] ${msg.text()}`;
        logs.push(text);
        // Print WorldScene-related logs immediately
        if (msg.text().includes('[WorldScene]') || msg.text().includes('[BootScene]') || msg.text().includes('tileset')) {
            console.log(text);
        }
    });
    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
        logs.push(`[PAGE ERROR] ${err.message}`);
    });

    console.log('Opening http://localhost:5175/...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 15000 });

    console.log('\nWaiting 5s for BootScene to preload...');
    await page.waitForTimeout(5000);

    // Check Phaser state
    const state = await page.evaluate(() => {
        return {
            phaserGame: !!window.phaserGame,
            sceneKeys: window.phaserGame?.scene?.keys ? Object.keys(window.phaserGame.scene.keys) : [],
            activeScenes: window.phaserGame?.scene?.getScenes(true)?.map(s => s.sys.settings.key) || [],
            textureCount: window.phaserGame?.textures?.getTextureKeys()?.length || 0,
            worldTilesets: ['world', 'world2', 'grounds', 'grounds2'].map(k => ({
                key: k,
                exists: window.phaserGame?.textures?.exists(k) || false
            })),
            tilemapCache: {
                pallet_town: window.phaserGame?.cache?.tilemap?.has('pallet_town') || false,
                map_pallet_town: window.phaserGame?.cache?.tilemap?.has('map_pallet_town') || false,
            },
        };
    });
    console.log('\n=== Phaser State ===');
    console.log(JSON.stringify(state, null, 2));

    // Launch WorldScene
    console.log('\n=== Launching WorldScene ===');
    await page.evaluate(() => {
        if (!window.phaserGame) return 'No phaserGame';
        const scenes = window.phaserGame.scene;
        // Stop all active scenes except BootScene
        scenes.getScenes(true).forEach(s => {
            scenes.stop(s.sys.settings.key);
        });
        // Start WorldScene
        scenes.start('WorldScene');
        return 'WorldScene started';
    });

    // Wait for WorldScene to preload and create
    console.log('Waiting 8s for WorldScene to preload + create...');
    await page.waitForTimeout(8000);

    // Check final state
    const finalState = await page.evaluate(() => {
        return {
            activeScenes: window.phaserGame?.scene?.getScenes(true)?.map(s => s.sys.settings.key) || [],
            worldTilesets: ['world', 'world2', 'grounds', 'grounds2'].map(k => ({
                key: k,
                exists: window.phaserGame?.textures?.exists(k) || false
            })),
            tilemapCache: {
                pallet_town: window.phaserGame?.cache?.tilemap?.has('pallet_town') || false,
            },
            allTextures: window.phaserGame?.textures?.getTextureKeys()?.sort() || [],
        };
    });
    console.log('\n=== Final State After WorldScene Launch ===');
    console.log(JSON.stringify(finalState, null, 2));

    // Print all WorldScene-related logs
    console.log('\n=== All WorldScene Console Logs ===');
    logs.filter(l => l.includes('WorldScene') || l.includes('tileset') || l.includes('PAGE ERROR') || l.includes('GridEngine'))
        .forEach(l => console.log(l));

    await browser.close();
    console.log('\nDone.');
})();
