import Phaser from 'phaser';

/**
 * IntroScene — Cinematic narrator intro before CharacterSelectScene.
 *
 * Veteran-coder notes:
 * - Input uses JustDown in update() rather than keyboard event listeners.
 *   Event listeners in Phaser can be unreliable if the scene was paused/
 *   resumed or if another scene consumed the event. JustDown is frame-safe.
 * - _finished guard prevents double-advancing (user spam-clicking last line).
 * - typeTimer is stored so skip-to-end can remove it reliably.
 */
export class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    init(data) {
        this.ui = data?.ui ?? null;
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#060608');

        // ── Scanline overlay ──
        const scanlines = this.add.graphics();
        scanlines.fillStyle(0x000000, 0.04);
        for (let y = 0; y < height; y += 4) {
            scanlines.fillRect(0, y, width, 1);
        }
        scanlines.setDepth(10);

        // ── Internal state ──
        this.step       = 0;
        this.isTyping   = false;
        this.typeTimer  = null;
        this._finished  = false; // prevents double-advance spam

        this.dialogueLines = [
            "The art market moves $67 billion a year.",
            "Most of it happens in rooms you're not in.",
            "Every week, you have three actions. Spend them carefully.",
            "Buy low. Build reputation. Know when to walk away.",
            "The market rewards patience — and punishes hesitation.",
            "Now. Tell me who you are.",
        ];

        // ── Main text ──
        const textW = Math.min(680, width * 0.8);
        this.mainText = this.add.text(width / 2, height * 0.42, '', {
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '22px',
            color: '#d4d0cc',
            align: 'center',
            wordWrap: { width: textW },
        }).setOrigin(0.5).setDepth(5);

        // ── Continue prompt ▼ ──
        this.continuePrompt = this.add.text(width / 2, height * 0.68, '▼', {
            fontFamily: 'Courier',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5).setAlpha(0).setDepth(5);

        this.tweens.add({
            targets: this.continuePrompt,
            y: height * 0.68 + 8,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // ── Line counter (dim, top-right) ──
        this._lineCounter = this.add.text(width - 16, 16, '', {
            fontFamily: 'Courier', fontSize: '10px', color: '#333344',
        }).setOrigin(1, 0).setDepth(5);

        // ── ESC hint ──
        this.add.text(16, height - 20, 'ESC — skip', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333344',
        }).setOrigin(0, 1).setDepth(5);

        // ── Keyboard — JustDown in update() is more reliable than event listeners ──
        this._keys = {
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            esc:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
        };

        // Pointer / touch support
        this.input.on('pointerdown', () => {
            if (!this._finished) this.advanceDialogue();
        });

        // ── Start ──
        this.cameras.main.fadeIn(600, 6, 6, 8);
        this.time.delayedCall(800, () => this.typeNextLine());
    }

    update() {
        if (this._finished) return;

        if (Phaser.Input.Keyboard.JustDown(this._keys.esc)) {
            this._skipToSelect();
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(this._keys.space) ||
            Phaser.Input.Keyboard.JustDown(this._keys.enter)) {
            this.advanceDialogue();
        }
    }

    typeNextLine() {
        if (this._finished) return;

        if (this.step >= this.dialogueLines.length) {
            this.finishIntro();
            return;
        }

        this.isTyping = true;
        this.continuePrompt.setAlpha(0);
        this.mainText.setText('');

        const line = this.dialogueLines[this.step];
        this.step++;

        // Update line counter
        this._lineCounter.setText(`${this.step} / ${this.dialogueLines.length}`);

        let charIndex = 0;
        this.typeTimer = this.time.addEvent({
            delay: 28,
            repeat: line.length - 1,
            callback: () => {
                charIndex++;
                this.mainText.setText(line.substring(0, charIndex));
                if (charIndex >= line.length) {
                    this.isTyping = false;
                    this.continuePrompt.setAlpha(1);
                }
            },
        });
    }

    advanceDialogue() {
        if (this._finished) return;

        if (this.isTyping) {
            // Skip to full text immediately
            if (this.typeTimer) {
                this.typeTimer.remove();
                this.typeTimer = null;
            }
            const currentLine = this.dialogueLines[this.step - 1];
            if (currentLine) this.mainText.setText(currentLine);
            this.isTyping = false;
            this.continuePrompt.setAlpha(1);
        } else {
            this.typeNextLine();
        }
    }

    finishIntro() {
        if (this._finished) return;
        this._finished = true;

        // Kill all input
        this.input.keyboard.removeAllKeys();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CharacterSelectScene', { ui: this.ui });
        });
    }

    _skipToSelect() {
        if (this._finished) return;
        this._finished = true;

        this.input.keyboard.removeAllKeys();
        this.input.removeAllListeners();

        // No fade on ESC — immediate jump
        this.scene.start('CharacterSelectScene', { ui: this.ui });
    }
}
