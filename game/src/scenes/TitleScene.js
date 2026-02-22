import Phaser from 'phaser';
import { SceneTransition } from '../utils/SceneTransition.js';
import { SCENE_KEYS } from '../data/scene-keys.js';
import { GameState } from '../managers/GameState.js';
import { SettingsManager } from '../managers/SettingsManager.js';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    init(data) {
        this.ui = data.ui;
        this.selectedIndex = 0;
        GameState.seedDemoSave(); // ensure at least one profile exists for testing
        this.hasSave = GameState.hasSave();
        this.showingSlots = false;
        this.slotItems = [];
    }

    preload() {
        // No background image — pure terminal aesthetic
    }

    create() {
        const { width, height } = this.scale;

        // ── Background ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x060608).setDepth(-1);
        this.cameras.main.setBackgroundColor('#060608');

        // ── Scanlines ──
        const scanlineGfx = this.add.graphics();
        scanlineGfx.lineStyle(1, 0xffffff, 0.03);
        for (let y = 0; y < height; y += 4) {
            scanlineGfx.moveTo(0, y);
            scanlineGfx.lineTo(width, y);
        }
        scanlineGfx.strokePath();

        // ── Institutional Header ──
        this.add.text(width / 2, height * 0.25, 'ARTLIFE SECURE TERMINAL', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#c9a84c',
            align: 'center',
            letterSpacing: 3
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.31, '── MEMBERSHIP PORTAL ──', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#c9a84c',
            align: 'center',
            letterSpacing: 3
        }).setOrigin(0.5);

        // ── Subtitle ──
        this.add.text(width / 2, height * 0.39, 'Authenticated access for registered members.', {
            fontFamily: 'Courier, monospace',
            fontSize: '11px',
            color: '#444455',
            align: 'center'
        }).setOrigin(0.5);

        // ── Menu Options ──
        const menuY = height * 0.55;
        const gap = 36;

        this.menuItems = [];

        // Option 1: New Application
        const opt1 = this.add.text(width / 2, menuY, '[1] SUBMIT NEW APPLICATION', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#e8e4df',
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .setPadding(10, 8, 10, 8);
        opt1.on('pointerdown', () => { this.selectedIndex = 0; this.updateCursorPosition(); this.confirmSelection(); });
        this.menuItems.push({ text: opt1, action: () => this.startNewGame(), enabled: true });

        // Option 2: Load (Authenticate Dossier)
        const loadColor = this.hasSave ? '#e8e4df' : '#333344';
        const opt2 = this.add.text(width / 2, menuY + gap, '[2] AUTHENTICATE DOSSIER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: loadColor,
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .setPadding(10, 8, 10, 8);
        opt2.on('pointerdown', () => { this.selectedIndex = 1; this.updateCursorPosition(); this.confirmSelection(); });
        this.menuItems.push({ text: opt2, action: () => this.showSaveSlots(), enabled: this.hasSave });

        // Option 3: Quick Start (skip character creator, load demo profile)
        const opt3 = this.add.text(width / 2, menuY + gap * 2, '[3] QUICK START (DEMO)', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#888899',
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .setPadding(10, 8, 10, 8);
        opt3.on('pointerdown', () => { this.selectedIndex = 2; this.updateCursorPosition(); this.confirmSelection(); });
        this.menuItems.push({ text: opt3, action: () => this.quickStart(), enabled: true });

        // ── Save slot display area (initially hidden) ──
        this.slotContainer = this.add.container(0, 0).setVisible(false);

        // ── Blinking Cursor ──
        this.cursor = this.add.text(0, 0, '_', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#c9a84c'
        });
        this.tweens.add({
            targets: this.cursor,
            alpha: 0,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Stepped',
            easeParams: [1]
        });
        this.updateCursorPosition();

        // ── Footer ──
        this.add.text(width / 2, height * 0.92, '© 2024 ArtLife Capital Holdings. All rights reserved.', {
            fontFamily: 'Courier, monospace',
            fontSize: '8px',
            color: '#222233',
            align: 'center'
        }).setOrigin(0.5);

        // ── Input ──
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.oneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.twoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.threeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.fourKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
        this.fiveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    updateCursorPosition() {
        const items = this.showingSlots ? this.slotItems : this.menuItems;
        if (items.length === 0) return;
        const item = items[this.selectedIndex];
        if (!item) return;
        const t = item.text;
        this.cursor.setPosition(t.x + t.width / 2 + 8, t.y - t.height / 2);

        items.forEach((mi, i) => {
            if (!mi.enabled) {
                mi.text.setColor('#333344');
            } else {
                mi.text.setColor(i === this.selectedIndex ? '#e8e4df' : '#888899');
            }
        });
    }

    update() {
        const items = this.showingSlots ? this.slotItems : this.menuItems;
        const maxIdx = items.length - 1;

        if (Phaser.Input.Keyboard.JustDown(this.escKey) && this.showingSlots) {
            this.hideSaveSlots();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.updateCursorPosition();
        } else if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
            this.selectedIndex = Math.min(maxIdx, this.selectedIndex + 1);
            this.updateCursorPosition();
        } else if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.confirmSelection();
        }

        // Number keys
        if (!this.showingSlots) {
            if (Phaser.Input.Keyboard.JustDown(this.oneKey)) {
                this.selectedIndex = 0;
                this.updateCursorPosition();
                this.confirmSelection();
            } else if (Phaser.Input.Keyboard.JustDown(this.twoKey)) {
                this.selectedIndex = 1;
                this.updateCursorPosition();
                this.confirmSelection();
            } else if (Phaser.Input.Keyboard.JustDown(this.threeKey)) {
                this.selectedIndex = 2;
                this.updateCursorPosition();
                this.confirmSelection();
            }
        } else {
            // Slot number keys (1-5)
            const slotKeys = [this.oneKey, this.twoKey, this.threeKey, this.fourKey, this.fiveKey];
            slotKeys.forEach((key, i) => {
                if (Phaser.Input.Keyboard.JustDown(key) && i < items.length && items[i].enabled) {
                    this.selectedIndex = i;
                    this.updateCursorPosition();
                    this.confirmSelection();
                }
            });
        }
    }

    confirmSelection() {
        const items = this.showingSlots ? this.slotItems : this.menuItems;
        const item = items[this.selectedIndex];
        if (item && item.enabled) {
            item.action();
        }
    }

    showSaveSlots() {
        const { width, height } = this.scale;
        const slots = GameState.getSaveSlots();

        // Hide main menu items
        this.menuItems.forEach(mi => mi.text.setVisible(false));

        // Build slot list
        this.slotContainer.removeAll(true);
        this.slotItems = [];

        const headerText = this.add.text(width / 2, height * 0.48, 'SELECT DOSSIER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#c9a84c',
            align: 'center'
        }).setOrigin(0.5);
        this.slotContainer.add(headerText);

        const startY = height * 0.55;
        const gap = 32;
        let slotIdx = 0;

        for (let i = 0; i < GameState.MAX_SLOTS; i++) {
            const slotData = slots[i];
            if (!slotData) continue;

            const meta = slotData.meta;
            const charName = meta.characterName || 'Unknown';
            const playerName = meta.playerName || charName;
            const weekStr = `Wk ${meta.week}`;
            const cashStr = `$${(meta.cash || 0).toLocaleString()}`;
            const label = `[${i + 1}] ${playerName} · ${charName} · ${weekStr} · ${cashStr}`;

            const slotText = this.add.text(width / 2, startY + slotIdx * gap, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '9px',
                color: '#e8e4df',
                align: 'center'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true })
                .setPadding(10, 6, 10, 6);

            const capturedSlotIndex = i;
            const capturedSlotIdx = slotIdx;
            slotText.on('pointerdown', () => { this.selectedIndex = capturedSlotIdx; this.updateCursorPosition(); this.confirmSelection(); });

            this.slotContainer.add(slotText);
            this.slotItems.push({
                text: slotText,
                action: () => this.loadSlot(capturedSlotIndex),
                enabled: true
            });
            slotIdx++;
        }

        // Back option
        const backText = this.add.text(width / 2, startY + slotIdx * gap + 12, '[ESC] BACK', {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: '#888899',
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
            .setPadding(10, 6, 10, 6);
        backText.on('pointerdown', () => { this.selectedIndex = slotIdx; this.updateCursorPosition(); this.confirmSelection(); });
        this.slotContainer.add(backText);
        this.slotItems.push({
            text: backText,
            action: () => this.hideSaveSlots(),
            enabled: true
        });

        this.slotContainer.setVisible(true);
        this.showingSlots = true;
        this.selectedIndex = 0;
        this.updateCursorPosition();
    }

    hideSaveSlots() {
        this.slotContainer.setVisible(false);
        this.slotItems = [];
        this.menuItems.forEach(mi => mi.text.setVisible(true));
        this.showingSlots = false;
        this.selectedIndex = 0;
        this.updateCursorPosition();
    }

    startNewGame() {
        this.input.keyboard.removeAllKeys();
        this.input.removeAllListeners('pointerdown');

        // Respect intro style setting — cinematic goes through IntroScene, skip goes straight to creator
        const introStyle = SettingsManager.get('introStyle') || 'cinematic';
        const targetScene = introStyle === 'skip' ? SCENE_KEYS.CHARACTER_SELECT : SCENE_KEYS.INTRO;
        SceneTransition.irisWipeToScene(this, targetScene, { ui: this.ui }, 600);
    }

    quickStart() {
        // Ensure demo profile exists in slot 0, then load it
        if (!localStorage.getItem('artlife_slot_0')) {
            // Temporarily bypass hasSave check to force seed
            const origHasSave = GameState.hasSave.bind(GameState);
            GameState.hasSave = () => false;
            GameState.seedDemoSave();
            GameState.hasSave = origHasSave;
        }
        this.loadSlot(0);
    }

    loadSlot(slotIndex) {
        const success = GameState.load(slotIndex);
        if (!success) return;

        this.input.keyboard.removeAllKeys();
        this.input.removeAllListeners('pointerdown');

        // Show terminal UI and push dashboard
        if (this.ui) {
            this.ui.container.style.display = '';
        }

        import('../terminal/screens/index.js').then(({ dashboardScreen }) => {
            if (this.ui) this.ui.pushScreen(dashboardScreen(this.ui));
            this.sys.game.canvas.style.display = 'none';
            this.scene.stop();
        });
    }
}
