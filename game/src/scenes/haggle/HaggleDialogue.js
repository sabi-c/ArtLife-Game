/**
 * HaggleDialogue.js — Dialogue typewriter, combat animations, and visual effects.
 *
 * Mixin module: exports methods that get assigned to HaggleScene.prototype.
 * All methods use `this` referring to the HaggleScene instance.
 *
 * Contains:
 *   - playDialogue — Character-by-character typewriter text reveal
 *   - playerLunge — Player sprite "attack" animation toward dealer
 *   - showEffectivenessFlash — "SUPER EFFECTIVE!" / "Not effective..." overlay text
 *   - dealerHitReaction — Dealer shake/knockback/tint on hit or resist bob
 *   - playTacticAnimation — Type-specific multi-step visual effects:
 *       coin (financial), shield (logical), slash (aggressive),
 *       charm (emotional), shadow (bluff), fallback flash
 */

import Phaser from 'phaser';
import { WebAudioService } from '../../managers/WebAudioService.js';

export const HaggleDialogueMixin = {

    playDialogue(text, onComplete) {
        this.tacticsContainer.setVisible(false);
        this.menuBg?.setVisible(false);
        this.dialogueTextContent.setText('');

        let i = 0;
        if (this.typeEvent) this.typeEvent.remove();

        this.typeEvent = this.time.addEvent({
            delay: 20,
            repeat: text.length - 1,
            callback: () => {
                this.dialogueTextContent.text += text[i];
                i++;
                if (i === text.length && onComplete) {
                    this.time.delayedCall(500, onComplete);
                }
            }
        });
    },

    /**
     * Play the player-side "attack lunge" — sprite moves toward dealer then snaps back.
     */
    playerLunge(onMidpoint) {
        if (!this.player) { onMidpoint?.(); return; }
        const origX = this.player.x;
        this.tweens.add({
            targets: this.player,
            x: origX + 40,
            duration: 120,
            ease: 'Power2',
            yoyo: true,
            onYoyo: () => onMidpoint?.(),
        });
    },

    /**
     * Flash "SUPER EFFECTIVE!" or "Not very effective..." text overlay.
     */
    showEffectivenessFlash(msg, color = '#c9a84c') {
        const { width, height } = this.scale;
        const txt = this.add.text(width / 2, height / 2 - 30, msg, {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color, align: 'center',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(210).setAlpha(0);

        this.tweens.add({
            targets: txt,
            alpha: 1, y: height / 2 - 50,
            duration: 300, ease: 'Back.easeOut',
            hold: 600,
            onComplete: () => {
                this.tweens.add({ targets: txt, alpha: 0, y: height / 2 - 70, duration: 300, onComplete: () => txt.destroy() });
            }
        });
    },

    /**
     * Dealer hit reaction — shake, tint, knockback based on severity.
     */
    dealerHitReaction(success, isSuperEffective) {
        if (!this.dealer) return;
        const origX = this.dealer.x;

        if (success) {
            const intensity = isSuperEffective ? 0.02 : 0.01;
            const shakeCount = isSuperEffective ? 5 : 3;
            this.cameras.main.shake(200, intensity);

            // Knockback
            this.tweens.add({
                targets: this.dealer,
                x: origX + (isSuperEffective ? 25 : 12),
                duration: 60,
                yoyo: true,
                repeat: shakeCount,
                onComplete: () => { this.dealer.x = origX; }
            });

            // Flash white then tint red
            if (this.dealer.setTint) {
                this.dealer.setTint(0xffffff);
                this.time.delayedCall(100, () => {
                    this.dealer.setTint(isSuperEffective ? 0xff4444 : 0xff8888);
                    this.time.delayedCall(400, () => { try { this.dealer.clearTint(); } catch (e) { } });
                });
            }
        } else {
            // Dealer resists — smug bob up
            this.tweens.add({
                targets: this.dealer,
                y: this.dealer.y - 8,
                duration: 150,
                yoyo: true,
                ease: 'Sine.easeOut',
            });
        }
    },

    /**
     * Enhanced tactic animation — multi-step, type-specific visual effects.
     */
    playTacticAnimation(animType, onComplete) {
        const { width, height } = this.scale;
        const dx = this.dealer?.x ?? width - 180;
        const dy = this.dealer?.y ?? height / 2 - 60;
        const px = this.player?.x ?? 180;
        const py = this.player?.y ?? height - 200;

        if (animType === 'coin') {
            // FINANCIAL — raining coins with green screen tint
            const tint = this.add.rectangle(width / 2, height / 2, width, height, 0x22aa44, 0.15).setDepth(190);
            this.tweens.add({ targets: tint, alpha: 0, duration: 800, onComplete: () => tint.destroy() });

            // Multiple coins cascade
            const emojis = ['💰', '💵', '💎', '💰', '💵'];
            emojis.forEach((e, i) => {
                const coin = this.add.text(
                    dx + Phaser.Math.Between(-60, 60),
                    dy - 160 - i * 20,
                    e, { fontSize: '28px' }
                ).setOrigin(0.5).setDepth(195).setAlpha(0);

                this.tweens.add({
                    targets: coin,
                    alpha: 1, y: dy - 20,
                    duration: 400 + i * 80,
                    delay: i * 60,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        this.tweens.add({ targets: coin, alpha: 0, scale: 0.3, duration: 200, onComplete: () => coin.destroy() });
                    }
                });
            });

            this.playerLunge();
            this.time.delayedCall(700, onComplete);

        } else if (animType === 'shield') {
            // LOGICAL — expanding hex-shield with data flash
            this.playerLunge();

            // Shield rings expanding outward
            for (let i = 0; i < 3; i++) {
                const ring = this.add.circle(px, py - 60, 30 + i * 15, 0x4488cc, 0).setStrokeStyle(2, 0x4488cc).setDepth(195);
                this.tweens.add({
                    targets: ring,
                    radius: 80 + i * 20,
                    alpha: 0,
                    duration: 500,
                    delay: i * 100,
                    onComplete: () => ring.destroy(),
                });
                // Fade the stroke
                this.tweens.add({ targets: ring, strokeAlpha: 0, duration: 500, delay: i * 100 });
            }

            // Data flash text
            const dataText = this.add.text(px + 60, py - 80, '▓▒░ HOLD ░▒▓', {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#4488cc',
            }).setDepth(196).setAlpha(0);
            this.tweens.add({
                targets: dataText, alpha: 1, duration: 150,
                hold: 300,
                onComplete: () => this.tweens.add({ targets: dataText, alpha: 0, duration: 200, onComplete: () => dataText.destroy() }),
            });

            this.time.delayedCall(600, onComplete);

        } else if (animType === 'slash') {
            // AGGRESSIVE — diagonal slash lines + red flash + heavy shake
            this.playerLunge(() => {
                // Red screen flash
                const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff2200, 0.6).setDepth(200);
                this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

                this.cameras.main.shake(250, 0.025);

                // Slash lines across dealer
                const slashGraphics = this.add.graphics().setDepth(199);
                const slashLines = [
                    { x1: dx - 60, y1: dy - 80, x2: dx + 60, y2: dy + 20 },
                    { x1: dx + 60, y1: dy - 80, x2: dx - 60, y2: dy + 20 },
                ];
                slashLines.forEach((sl, i) => {
                    this.time.delayedCall(i * 80, () => {
                        slashGraphics.lineStyle(3, 0xffffff, 1);
                        slashGraphics.lineBetween(sl.x1, sl.y1, sl.x2, sl.y2);
                    });
                });
                this.tweens.add({
                    targets: slashGraphics, alpha: 0, duration: 400, delay: 200,
                    onComplete: () => slashGraphics.destroy(),
                });

                // Impact sparks
                for (let i = 0; i < 6; i++) {
                    const spark = this.add.text(
                        dx + Phaser.Math.Between(-40, 40),
                        dy - 30 + Phaser.Math.Between(-30, 30),
                        '✦', { fontSize: '16px', color: '#ffaa00' }
                    ).setOrigin(0.5).setDepth(201);
                    this.tweens.add({
                        targets: spark,
                        x: spark.x + Phaser.Math.Between(-50, 50),
                        y: spark.y + Phaser.Math.Between(-50, 50),
                        alpha: 0, scale: 0,
                        duration: 300 + i * 50,
                        onComplete: () => spark.destroy(),
                    });
                }
            });

            this.time.delayedCall(700, onComplete);

        } else if (animType === 'charm') {
            // EMOTIONAL — hearts/stars cascade from player to dealer, pink tint
            const tint = this.add.rectangle(width / 2, height / 2, width, height, 0xff88aa, 0.12).setDepth(190);
            this.tweens.add({ targets: tint, alpha: 0, duration: 1000, onComplete: () => tint.destroy() });

            this.playerLunge();

            const charms = ['💖', '✨', '💫', '💖', '✨'];
            charms.forEach((c, i) => {
                const charm = this.add.text(px + 40, py - 80, c, { fontSize: '24px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
                this.tweens.add({
                    targets: charm,
                    x: dx + Phaser.Math.Between(-30, 30),
                    y: dy - 40 + Phaser.Math.Between(-20, 20),
                    alpha: { from: 0, to: 1 },
                    duration: 500 + i * 80,
                    delay: i * 100,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.tweens.add({ targets: charm, alpha: 0, scale: 1.5, duration: 200, onComplete: () => charm.destroy() });
                    }
                });
            });

            this.time.delayedCall(800, onComplete);

        } else if (animType === 'shadow') {
            // BLUFF — dramatic darkness, glowing eyes, reveal
            const darkness = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setDepth(190);
            this.tweens.add({ targets: darkness, alpha: 0.75, duration: 300 });

            // Mysterious eyes appear
            const eyeL = this.add.text(px + 20, py - 90, '👁', { fontSize: '20px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
            const eyeR = this.add.text(px + 50, py - 90, '👁', { fontSize: '20px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
            this.tweens.add({ targets: [eyeL, eyeR], alpha: 1, duration: 200, delay: 300 });

            // Question marks swirl around dealer
            this.time.delayedCall(500, () => {
                const marks = ['❓', '❓', '❓'];
                marks.forEach((m, i) => {
                    const angle = (i / marks.length) * Math.PI * 2;
                    const mark = this.add.text(dx, dy - 50, m, { fontSize: '18px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
                    this.tweens.add({
                        targets: mark,
                        x: dx + Math.cos(angle) * 50,
                        y: dy - 50 + Math.sin(angle) * 30,
                        alpha: 1,
                        duration: 300,
                        delay: i * 80,
                        onComplete: () => {
                            this.tweens.add({ targets: mark, alpha: 0, duration: 300, delay: 200, onComplete: () => mark.destroy() });
                        }
                    });
                });
            });

            // Reveal — light burst
            this.time.delayedCall(900, () => {
                this.tweens.add({ targets: [darkness, eyeL, eyeR], alpha: 0, duration: 300, onComplete: () => { darkness.destroy(); eyeL.destroy(); eyeR.destroy(); } });
            });

            this.time.delayedCall(1200, onComplete);

        } else {
            // Fallback — simple flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.5).setDepth(200);
            this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
            this.time.delayedCall(400, onComplete);
        }
    },
};
