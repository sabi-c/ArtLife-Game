import Phaser from 'phaser';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { VIEW } from '../core/views.js';

/**
 * DocumentaryScene — Entry-flow documentary intro in the Troemel scavenged-screen register.
 *
 * Played after TitleScene Enter. Visually a flattened browser with multiple tabs,
 * stacked rectangles of screenshots, an auction live-bid mid-bid, a Sotheby's results
 * page, an Instagram art-meme account, a Twitter rant about NFT prices, a Zillow listing,
 * a price ticker scrolling. The line between document and forgery dissolving.
 *
 * Visual register is locked: lo-fi, Norco resolution, Papers Please functional UI weight.
 * Asset slots are placeholders right now. When the Gemini prompt pack lands real frames,
 * drop them into `public/documentary/frame_01.png` ... `frame_08.png` and they will be
 * picked up automatically. The frames-not-found fallback below renders a stylized
 * scavenged-screen approximation using Phaser primitives so the flow never breaks.
 *
 * On finish, emits UI_ROUTE → VIEW.EMAIL_INBOX. The file terminates and an email arrives.
 */
export class DocumentaryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DocumentaryScene' });
    }

    init(data) {
        this.ui = data?.ui ?? null;
        this._finished = false;
    }

    preload() {
        // Slot loader: try to load up to 8 documentary frames. Missing frames silently fall
        // back to procedural placeholder rendering (see _renderProceduralFrame below).
        this._frameKeys = [];
        for (let i = 1; i <= 8; i++) {
            const key = `doc_frame_${String(i).padStart(2, '0')}`;
            this._frameKeys.push(key);
            // BootScene's loaderror handler logs and substitutes a 1x1 pink pixel so this never crashes.
            this.load.image(key, `documentary/frame_${String(i).padStart(2, '0')}.png`);
        }
    }

    create() {
        const { width, height } = this.scale;

        // ── Background: dim browser-chrome dark ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x0c0e14).setDepth(-1);
        this.cameras.main.setBackgroundColor('#0c0e14');

        // ── Browser-tab bar across the top ──
        this._renderTabBar(width);

        // ── Frame stage: where each documentary frame renders ──
        this._frameStage = this.add.container(0, 0).setDepth(2);

        // ── Subtitle / caption strip at the bottom ──
        this._captionBg = this.add.rectangle(width / 2, height - 60, width, 80, 0x000000, 0.7).setDepth(5);
        this._captionText = this.add.text(width / 2, height - 60, '', {
            fontFamily: '"IBM Plex Mono", Courier, monospace',
            fontSize: '14px',
            color: '#e8e4df',
            align: 'center',
            wordWrap: { width: Math.min(900, width * 0.85) }
        }).setOrigin(0.5).setDepth(6);

        // ── Skip hint ──
        this.add.text(16, height - 20, 'ESC — skip documentary', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#444455',
        }).setOrigin(0, 1).setDepth(10);

        // ── Scanline overlay for CRT texture ──
        const scanlines = this.add.graphics().setDepth(20);
        scanlines.fillStyle(0x000000, 0.06);
        for (let y = 0; y < height; y += 3) {
            scanlines.fillRect(0, y, width, 1);
        }

        // ── Frame sequence (caption + duration in ms). Hooks the real assets if present, otherwise
        //    falls back to a procedural composite of rectangles labelled as screenshots. ──
        this._frames = [
            { caption: 'Inigo Philbrick — Vanuatu, DOJ filing, 86 months federal time.', dur: 3200 },
            { caption: 'Beeple. Christie\'s. Sixty-nine million. The first JPEG.', dur: 3200 },
            { caption: 'Salvator Mundi. Last seen on a Saudi yacht.', dur: 3000 },
            { caption: 'Documenta 15. Censorship and counter-censorship.', dur: 3000 },
            { caption: 'Lisa Schiff. Six and a half million. Ponzi.', dur: 3000 },
            { caption: 'Cattelan banana. Auction record for duct tape.', dur: 3000 },
            { caption: 'Christie\'s annual sales — down. The cycle corrects.', dur: 3000 },
            { caption: 'Welcome to ArtLife.', dur: 4000 },
        ];
        this._frameIdx = 0;

        // ── Keyboard ──
        this._keys = {
            enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            esc: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
        };

        this.input.on('pointerdown', () => this._advance());

        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.time.delayedCall(700, () => this._showFrame());
    }

    update() {
        if (this._finished) return;
        if (Phaser.Input.Keyboard.JustDown(this._keys.esc)) { this._finish(); return; }
        if (Phaser.Input.Keyboard.JustDown(this._keys.enter) ||
            Phaser.Input.Keyboard.JustDown(this._keys.space)) {
            this._advance();
        }
    }

    /**
     * Render the browser tab strip at the top, with multiple "real" research tabs visible.
     * Mimics the Troemel scavenged-screen register: lots of open tabs, evidence-board energy.
     */
    _renderTabBar(width) {
        const tabBar = this.add.container(0, 0).setDepth(8);
        // Narrow viewport (phones): collapse to a single condensed status strip.
        // Wide viewport (tablet+): the full multi-tab evidence-board strip.
        const isNarrow = width < 720;

        if (isNarrow) {
            // Single strip with abbreviated tab + "+N more" indicator. Stays inside the viewport.
            const bg = this.add.rectangle(width / 2, 18, width, 36, 0x1a1d28).setOrigin(0.5);
            tabBar.add(bg);
            const txt = this.add.text(12, 12, '◉ Inigo Philbrick Vanuatu DOJ  · 6 more tabs', {
                fontFamily: 'Courier, monospace',
                fontSize: '10px',
                color: '#c9a84c',
            }).setOrigin(0, 0);
            tabBar.add(txt);
            return;
        }

        const tabBg = this.add.rectangle(width / 2, 18, width, 36, 0x1a1d28).setOrigin(0.5);
        tabBar.add(tabBg);

        const tabs = [
            'Inigo Philbrick Vanuatu DOJ',
            'Beeple Christie\'s 69M',
            'Sotheby\'s 2024 results',
            'Salvator Mundi yacht',
            'Documenta 15 censorship',
            'Lisa Schiff fraud',
            'Cattelan banana auction',
        ];

        let xOff = 12;
        tabs.forEach((label, i) => {
            const w = Math.min(160, label.length * 7);
            // Skip tabs that would overflow the viewport — show only what fits.
            if (xOff + w + 4 > width - 12) return;
            const tab = this.add.rectangle(xOff + w / 2, 18, w, 28, i === 0 ? 0x0c0e14 : 0x222633)
                .setStrokeStyle(1, 0x33384a);
            const txt = this.add.text(xOff + 8, 8, label, {
                fontFamily: 'Courier, monospace',
                fontSize: '9px',
                color: i === 0 ? '#c9a84c' : '#888aa0',
            }).setOrigin(0, 0);
            tabBar.add([tab, txt]);
            xOff += w + 4;
        });
    }

    _showFrame() {
        if (this._finished) return;
        if (this._frameIdx >= this._frames.length) {
            this._finish();
            return;
        }

        const idx = this._frameIdx;
        const frame = this._frames[idx];
        this._frameIdx++;

        // Clear previous frame content
        this._frameStage.removeAll(true);

        const { width, height } = this.scale;
        const stageX = width / 2;
        const stageY = height / 2;
        const stageW = Math.min(900, width * 0.85);
        const stageH = Math.min(440, height * 0.60);

        const key = this._frameKeys[idx];
        const hasRealAsset = this.textures.exists(key) && this.textures.get(key)?.source?.[0]?.width > 8;

        if (hasRealAsset) {
            // Real asset — center it
            const img = this.add.image(stageX, stageY, key);
            // Scale to fit while preserving aspect
            const tex = this.textures.get(key).source[0];
            const scale = Math.min(stageW / tex.width, stageH / tex.height);
            img.setScale(scale);
            this._frameStage.add(img);
        } else {
            // Procedural placeholder — stacked rectangles labelled as screenshots
            this._renderProceduralFrame(stageX, stageY, stageW, stageH, idx);
        }

        // Caption fade
        this._captionText.setAlpha(0);
        this._captionText.setText(frame.caption);
        this.tweens.add({
            targets: this._captionText,
            alpha: 1,
            duration: 400,
        });

        // Auto-advance after duration
        this._frameTimer = this.time.delayedCall(frame.dur, () => this._showFrame());
    }

    /**
     * Procedural scavenged-screen approximation for when real assets aren't loaded yet.
     * Renders 4-6 overlapping rectangles as "screenshots" with labels, plus a ticker
     * crawl at the bottom edge.
     */
    _renderProceduralFrame(cx, cy, w, h, idx) {
        const left = cx - w / 2;
        const top = cy - h / 2;

        // Base "tab content" background
        const bg = this.add.rectangle(cx, cy, w, h, 0x10131c).setStrokeStyle(1, 0x2a2f40);
        this._frameStage.add(bg);

        // Stacked "screenshot" rectangles — auction screens, social media, charts
        const tiles = [
            { dx: -0.30, dy: -0.20, w: 0.42, h: 0.28, color: 0x2a1a1a, label: 'AUCTION  LIVE BID: $40,200,000', accent: 0xc94040 },
            { dx: 0.18, dy: -0.18, w: 0.34, h: 0.32, color: 0x1a1f2a, label: '@artworldspeak  [meme]', accent: 0x88aaff },
            { dx: -0.08, dy: 0.12, w: 0.38, h: 0.28, color: 0x141a14, label: 'CHRISTIE\'S RESULTS — 2024', accent: 0x4a9e6a },
            { dx: 0.26, dy: 0.18, w: 0.32, h: 0.22, color: 0x1f1a2a, label: 'twitter.com/  blue-check  rants', accent: 0xaa66cc },
            { dx: -0.32, dy: 0.20, w: 0.28, h: 0.22, color: 0x1a2024, label: 'zillow  Hamptons  $24M', accent: 0xc9a84c },
        ];

        const ax = (idx % 2 === 0) ? 1 : -1;
        tiles.forEach((t, i) => {
            const tx = cx + t.dx * w * ax;
            const ty = cy + t.dy * h;
            const tw = w * t.w;
            const th = h * t.h;
            const rect = this.add.rectangle(tx, ty, tw, th, t.color).setStrokeStyle(2, t.accent);
            const label = this.add.text(tx - tw / 2 + 8, ty - th / 2 + 6, t.label, {
                fontFamily: '"IBM Plex Mono", Courier, monospace',
                fontSize: '10px',
                color: '#cfd2dc',
            }).setOrigin(0, 0);
            // Slight rotation for chaotic stacked feel
            const rot = (i - 2) * 0.012;
            rect.setRotation(rot);
            label.setRotation(rot);
            this._frameStage.add([rect, label]);
        });

        // Ticker strip across the bottom of the stage
        const tickerBg = this.add.rectangle(cx, top + h - 12, w, 18, 0x0a0a0f).setStrokeStyle(1, 0xc9a84c);
        const tickerTxt = this.add.text(left + 8, top + h - 20, ' SPX 5,234 ▲   ART INDEX 412.7 ▼   BTC 67k ▲   NFT VOL —87%   FED MINUTES 14:00 EST ', {
            fontFamily: '"IBM Plex Mono", Courier, monospace',
            fontSize: '10px',
            color: '#c9a84c',
        }).setOrigin(0, 0);
        this._frameStage.add([tickerBg, tickerTxt]);

        // Animate ticker scroll
        this.tweens.add({
            targets: tickerTxt,
            x: left - tickerTxt.width,
            duration: 12000,
            ease: 'Linear',
            repeat: -1,
        });
    }

    _advance() {
        if (this._finished) return;
        if (this._frameTimer) {
            this._frameTimer.remove();
            this._frameTimer = null;
        }
        this._showFrame();
    }

    _finish() {
        if (this._finished) return;
        this._finished = true;

        if (this._frameTimer) this._frameTimer.remove();
        this.input.keyboard.removeAllKeys();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop();
            // The file terminates. Now check your inbox.
            GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.EMAIL_INBOX);
        });
    }
}
