import { BaseScene } from './BaseScene.js';
import { GameState } from '../managers/GameState.js';
import { QualityGate } from '../managers/QualityGate.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { DecisionLog } from '../managers/DecisionLog.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { ActivityLogger } from '../managers/ActivityLogger.js';
import { EventRegistry } from '../managers/EventRegistry.js';
import { SCENE_KEYS } from '../data/scene-keys.js';
import { CONTACTS } from '../data/contacts.js';
import { useUIStore } from '../stores/uiStore.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

/**
 * Dialogue / Event scene — Multi-step engine
 *
 * Supports two event formats:
 * 1. Legacy single-step: { description, choices }
 * 2. Multi-step:         { steps: [{ type, text, choices, ... }] }
 *
 * Step types: 'narrative', 'dialogue', 'choice', 'stat_change', 'reveal'
 */
export class DialogueScene extends BaseScene {
    constructor() {
        super('DialogueScene');
    }

    create(data) {
        super.create({ ...data, hideUI: true }); // BaseScene applies DOM hiding

        if (data?.eventId) {
            import('../managers/EventRegistry.js').then(({ EventRegistry }) => {
                this.eventData = EventRegistry.getEvent(data.eventId) || {};
                this._initUI(data);
            });
            return; // _initUI will continue rendering
        } else {
            this.eventData = data?.event || {};
            this._initUI(data);
        }
    }

    _initUI(data) {
        this.currentStep = 0;
        this.stepObjects = [];  // Track objects per step for cleanup
        this.isTransitioning = false;

        this.returnScene = data?.returnScene || null;
        this.returnArgs = data?.returnArgs || {};
        this.onExitCallback = data?.onExit || null;

        const { width, height } = this.scale;

        // ── Persistent background layer ──
        const bgKey = this.getCategoryBackground(this.eventData.category);
        if (this.textures.exists(bgKey)) {
            const bg = this.add.image(width / 2, height / 2, bgKey);
            bg.setDisplaySize(width, height);
            bg.setAlpha(0.4);
        }
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f, 0.6);

        // ── Persistent header ──
        const categoryLabel = this.eventData.category?.toUpperCase() || 'EVENT';
        this.add.text(width / 2, 35, categoryLabel, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#7a7a8a',
            letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(width / 2, 70, this.eventData.title, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#c9a84c',
        }).setOrigin(0.5);

        const line = this.add.graphics();
        line.lineStyle(1, 0xc9a84c, 0.5);
        line.lineBetween(width * 0.15, 95, width * 0.85, 95);

        // ── Step progress indicator (multi-step only) ──
        if (this.eventData.steps && this.eventData.steps.length > 1) {
            this.stepIndicator = this.add.text(width - 30, 35, '', {
                fontFamily: '"Press Start 2P"',
                fontSize: '7px',
                color: '#3a3a4a',
            }).setOrigin(1, 0.5);
        }

        // ── Route: multi-step or legacy ──
        if (this.eventData.steps && this.eventData.steps.length > 0) {
            this.renderStep(0);
        } else {
            this.renderLegacyEvent();
        }

        this.cameras.main.fadeIn(600, 0, 0, 0);

        // ── ESC key force-exit (safety hatch) ──
        this.input.keyboard.on('keydown-ESC', () => {
            useUIStore.getState().closeDialogue();
            this.exitToHub();
        });

        // Visible back button (top-right, tappable for mobile)
        const { width: bw } = this.scale;
        const backBtn = this.add.text(bw - 16, 12, '[ ESC: BACK ]', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
        }).setOrigin(1, 0).setDepth(102).setInteractive({ useHandCursor: true });
        backBtn.on('pointerover', () => backBtn.setColor('#c9a84c'));
        backBtn.on('pointerout', () => backBtn.setColor('#7a7a8a'));
        backBtn.on('pointerdown', () => {
            useUIStore.getState().closeDialogue();
            this.exitToHub();
        });
    }

    // ═══════════════════════════════════════════
    //  MULTI-STEP ENGINE
    // ═══════════════════════════════════════════

    renderStep(index) {
        if (index >= this.eventData.steps.length || index === 'end') {
            this.exitToHub();
            return;
        }

        this.currentStep = index;
        this.clearStepObjects();
        this.isTransitioning = false;

        // Update step indicator
        if (this.stepIndicator) {
            this.stepIndicator.setText(`${index + 1}/${this.eventData.steps.length}`);
        }

        const step = this.eventData.steps[index];

        switch (step.type) {
            case 'narrative':
                this.renderNarrativeStep(step);
                break;
            case 'dialogue':
                this.renderDialogueStep(step);
                break;
            case 'choice':
                this.renderChoiceStep(step);
                break;
            case 'stat_change':
                this.renderStatChangeStep(step);
                break;
            case 'reveal':
                this.renderRevealStep(step);
                break;
            default:
                this.renderNarrativeStep(step);
        }
    }

    advanceStep(nextStep) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Fade out current step objects
        const targets = this.stepObjects.filter(o => o && o.alpha !== undefined);
        if (targets.length > 0) {
            this.tweens.add({
                targets,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    const next = nextStep !== undefined ? nextStep : this.currentStep + 1;
                    this.renderStep(next);
                },
            });
        } else {
            const next = nextStep !== undefined ? nextStep : this.currentStep + 1;
            this.renderStep(next);
        }
    }

    clearStepObjects() {
        this.stepObjects.forEach(obj => {
            if (obj && obj.destroy) obj.destroy();
        });
        this.stepObjects = [];
    }

    // ─── NARRATIVE STEP ───────────────────────
    renderNarrativeStep(step) {
        useUIStore.getState().openDialogue({
            steps: [{
                name: 'Narrator',
                text: step.text,
                speakerSide: 'left'
            }],
            callback: () => this.advanceStep()
        });
    }

    // ─── DIALOGUE STEP ────────────────────────
    renderDialogueStep(step) {
        const speakerName = step.speakerName || step.speaker || 'Unknown';

        // Attempt to guess sprites based on NPC id (falling back to standard names if needed)
        // DialogueTreeManager sets event.id to tree.id, we can also use step.speaker.
        const leftSprite = 'player_back.png';
        const rightSprite = step.speaker ? `${step.speaker}.png` : null;

        useUIStore.getState().openDialogue({
            steps: [{
                name: speakerName.toUpperCase(),
                text: `"${step.text}"`,
                speakerSide: 'right'
            }],
            leftSprite,
            rightSprite,
            callback: () => this.advanceStep()
        });
    }

    // ─── CHOICE STEP ──────────────────────────
    renderChoiceStep(step) {
        const processedChoices = step.choices.map((choice, i) => {
            const gateResult = QualityGate.checkDetailed(choice.requires);
            return {
                ...choice,
                index: i,
                available: gateResult.met,
                lockedDetails: gateResult.details.filter(d => !d.met),
                isBlue: choice.isBlueOption || false,
            };
        });

        const uiChoices = processedChoices.map((choice, originalIndex) => {
            const shouldShow = choice.available || choice.requires;
            if (!shouldShow && choice.isBlue) return null;

            return {
                label: choice.available ? choice.label : `🔒 ${choice.label} (Requires: ${choice.lockedDetails.map(d => d.label + ' ' + d.needed).join(', ')})`,
                isBlue: choice.isBlue,
                action: choice.available ? () => {
                    useUIStore.getState().closeDialogue();
                    this.selectChoiceMultiStep(choice, originalIndex, step);
                } : null
            };
        }).filter(Boolean);

        const leftSprite = 'player_back.png';
        const rightSprite = step.speaker ? `${step.speaker}.png` : null;

        useUIStore.getState().openDialogue({
            steps: [{
                name: step.speakerName || step.speaker || 'Player',
                text: step.text || 'Choose a response...',
                speakerSide: 'left'
            }],
            choices: uiChoices,
            leftSprite,
            rightSprite
        });
    }

    selectChoiceMultiStep(choice, choiceIndex, step) {
        // Apply effects
        if (choice.effects) {
            GameState.applyEffects(choice.effects);
        }

        if (choice.triggerHaggle) {
            this.clearStepObjects();

            // Derive artwork and seller from choice context
            const sellerId = choice.npcInvolved || this.eventData?.npcInvolved ||
                this.eventData?.npcId ||
                (this.eventData?.id ? this.eventData.id.split('_').slice(0, 2).join('_') : null);
            const basePrice = Math.abs(choice.effects?.cash || 10000);
            const work = choice.work || {
                id: `dialogue_${Date.now()}`,
                title: 'Selected Artwork',
                artist: 'Various',
                year: String(new Date().getFullYear()),
            };

            // ── Resolve the actual NPC contact so haggleProfile drives the battle ──
            const npcContact = sellerId
                ? (CONTACTS || []).find(c => c.id === sellerId) || null
                : null;

            // Initialise HaggleManager state before launching HaggleScene
            const haggleStart = HaggleManager.start({
                mode: 'buy',
                work,
                npc: npcContact,
                askingPrice: basePrice,
            });

            const haggleInfo = {
                ...haggleStart,
                openingDialogue: haggleStart.openingDialogue || `Let's talk about the price.`,
                bgKey: 'bg_gallery_main_1bit_1771587911969.png',
            };

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start(SCENE_KEYS.HAGGLE, {
                    ui: this.ui,
                    haggleInfo,
                    returnScene: this.returnScene || SCENE_KEYS.LOCATION,
                    returnArgs: this.returnArgs || {},
                });
            });
            return;
        }

        // ── Launch Scene (travel events, venue transitions) ──
        // Allows choices to transition the player into a walkaround scene.
        // Example: { "launchScene": { "sceneKey": "LocationScene", "data": { "venueId": "milan_fashion_week" } } }
        if (choice.launchScene) {
            this.clearStepObjects();

            const { sceneKey, data: sceneData } = choice.launchScene;
            const targetScene = sceneKey || 'LocationScene';
            const launchData = {
                ...(sceneData || {}),
                returnScene: this.returnScene || 'MainMenuScene',
                returnArgs: this.returnArgs || {},
            };

            console.log(`[DialogueScene] Launching scene "${targetScene}" with:`, launchData);
            GameState.addNews(choice.outcome || `You decided to attend — traveling now...`);

            // Record the decision before transitioning
            DecisionLog.record({
                eventId: this.eventData.id,
                eventTitle: this.eventData.title,
                choiceIndex: choiceIndex,
                choiceLabel: choice.label,
                effects: choice.effects || {},
                tags: choice.tags || this.eventData.tags || [this.eventData.category],
                npcInvolved: choice.npcInvolved || this.eventData.npcInvolved || null,
                isBlueOption: choice.isBlueOption || false,
            });

            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.stop();
                this.scene.start(targetScene, launchData);
            });
            return;
        }

        // Record to Decision Log
        DecisionLog.record({
            eventId: this.eventData.id,
            eventTitle: this.eventData.title,
            choiceIndex: choiceIndex,
            choiceLabel: choice.label,
            effects: choice.effects || {},
            tags: choice.tags || this.eventData.tags || [this.eventData.category],
            npcInvolved: choice.npcInvolved || this.eventData.npcInvolved || null,
            isBlueOption: choice.isBlueOption || false,
        });

        // ── Activity Logger ──
        ActivityLogger.logDialogue('choice_made', {
            eventId: this.eventData.id,
            eventTitle: this.eventData.title,
            step: this.currentStep,
            choiceIndex,
            choiceLabel: choice.label,
            tone: choice.tone || null,
            isBlueOption: choice.isBlueOption || false,
            effects: choice.effects || {},
        }, choice.npcInvolved || this.eventData.npcId);

        // ── Storyline trigger check ──
        try {
            EventRegistry.checkStorylineTrigger(
                this.eventData.id, choiceIndex, choice.label,
                step?.nodeId || null
            );
        } catch (e) { console.warn('[DialogueScene] Storyline trigger check failed:', e); }

        // Schedule consequences
        if (choice.schedules) {
            choice.schedules.forEach(schedule => {
                const weeksDelay = schedule.weeksDelay || (3 + Math.floor(Math.random() * 8));
                ConsequenceScheduler.addRelative(weeksDelay, schedule.type, schedule.payload, {
                    condition: schedule.condition || null,
                    sourceEvent: this.eventData.id,
                });
            });
        }

        // Legacy decision record
        GameState.state.decisions.push({
            event: this.eventData.title,
            choice: choice.label,
            week: GameState.state.week,
        });

        if (choice.outcome) {
            GameState.addNews(choice.outcome);
        }

        // Show outcome + stat changes, then advance
        this.showOutcomeWithStats(choice, () => {
            const next = choice.nextStep !== undefined ? choice.nextStep : this.currentStep + 1;
            this.advanceStep(next);
        });
    }

    // ─── STAT CHANGE STEP ─────────────────────
    renderStatChangeStep(step) {
        const { width, height } = this.scale;

        // Apply the changes
        if (step.changes) {
            GameState.applyEffects(step.changes);
        }

        // Optional label
        if (step.label) {
            this.addStepObj(
                this.add.text(width / 2, 120, step.label, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '10px',
                    color: '#7a7a8a',
                }).setOrigin(0.5)
            );
        }

        // Optional text
        if (step.text) {
            this.addStepObj(
                this.add.text(width / 2, 148, step.text, {
                    fontFamily: '"Playfair Display"',
                    fontSize: '14px',
                    fontStyle: 'italic',
                    color: '#b8b4af',
                    wordWrap: { width: width * 0.6 },
                    align: 'center',
                }).setOrigin(0.5)
            );
        }

        // Render the stat change display
        const changes = step.changes || {};
        this.renderStatIndicators(changes, height * 0.40, () => {
            if (step.advance === 'auto') {
                this.time.delayedCall(step.delay || 1500, () => {
                    this.advanceStep();
                });
            } else {
                // Click to continue
                const prompt = this.addStepObj(
                    this.add.text(width / 2, height - 50, '▸ click to continue', {
                        fontFamily: '"Press Start 2P"',
                        fontSize: '7px',
                        color: '#4a4a5a',
                    }).setOrigin(0.5)
                );
                this.tweens.add({
                    targets: prompt,
                    alpha: 0.3,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                });
                const clickZone = this.addStepObj(
                    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
                        .setInteractive({ useHandCursor: true })
                );
                clickZone.on('pointerdown', () => this.advanceStep());
            }
        });
    }

    // ─── REVEAL STEP ──────────────────────────
    renderRevealStep(step) {
        const { width, height } = this.scale;

        // Dramatic slow fade-in of key text
        const revealText = this.addStepObj(
            this.add.text(width / 2, height * 0.40, step.text, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#c9a84c',
                wordWrap: { width: width * 0.6 },
                align: 'center',
                lineSpacing: 8,
            }).setOrigin(0.5)
        );
        revealText.setAlpha(0);

        // Slow dramatic reveal
        this.tweens.add({
            targets: revealText,
            alpha: 1,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    const prompt = this.addStepObj(
                        this.add.text(width / 2, height - 50, '▸ click to continue', {
                            fontFamily: '"Press Start 2P"',
                            fontSize: '7px',
                            color: '#4a4a5a',
                        }).setOrigin(0.5)
                    );
                    this.tweens.add({
                        targets: prompt,
                        alpha: 0.3,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                    });

                    const clickZone = this.addStepObj(
                        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
                            .setInteractive({ useHandCursor: true })
                    );
                    clickZone.on('pointerdown', () => this.advanceStep());
                });
            },
        });
    }

    // ═══════════════════════════════════════════
    //  STAT CHANGE DISPLAY (shared by both flows)
    // ═══════════════════════════════════════════

    /**
     * Renders animated stat change indicators.
     * Used by both multi-step stat_change steps and the outcome screen.
     */
    renderStatIndicators(effects, startY, onComplete) {
        const { width } = this.scale;
        const statConfig = {
            cash: { icon: '💰', label: 'Cash', color: '#c9a84c' },
            reputation: { icon: '⭐', label: 'Reputation', color: '#c9a84c' },
            intel: { icon: '🔍', label: 'Intel', color: '#88bbdd' },
            marketHeat: { icon: '🔥', label: 'Heat', color: '#cc6644' },
            suspicion: { icon: '👁', label: 'Suspicion', color: '#aa6688' },
            burnout: { icon: '💤', label: 'Burnout', color: '#7a7a8a' },
        };

        // Filter only displayable stat changes
        const displayable = Object.entries(effects).filter(([key]) => key in statConfig);
        if (displayable.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        // Container box
        const boxH = displayable.length * 32 + 20;
        const boxY = startY + boxH / 2;
        const statBox = this.addStepObj(
            this.add.rectangle(width / 2, boxY, width * 0.5, boxH, 0x0f0f1a, 0.85)
        );
        statBox.setStrokeStyle(1, 0x2a2a3e);
        statBox.setAlpha(0);
        this.tweens.add({ targets: statBox, alpha: 1, duration: 300 });

        displayable.forEach(([key, value], i) => {
            const conf = statConfig[key];
            const y = startY + 16 + i * 32;
            const isPositive = value > 0;
            const sign = isPositive ? '+' : '';
            const valueColor = isPositive ? '#4a9e6a' : '#c44a4a';

            // Format value
            let displayValue;
            if (key === 'cash') {
                displayValue = `${sign}$${Math.abs(value).toLocaleString()}`;
            } else {
                displayValue = `${sign}${value}`;
            }

            // Icon + label
            const labelText = this.addStepObj(
                this.add.text(width * 0.30, y, `${conf.icon}  ${conf.label}`, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '8px',
                    color: conf.color,
                }).setOrigin(0, 0.5)
            );

            // Value (slides in from right)
            const valueText = this.addStepObj(
                this.add.text(width * 0.68, y, displayValue, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '9px',
                    color: valueColor,
                    fontStyle: 'bold',
                }).setOrigin(1, 0.5)
            );

            // Animate: stagger each row
            labelText.setAlpha(0);
            valueText.setAlpha(0);
            valueText.setX(width * 0.75);

            this.tweens.add({
                targets: labelText,
                alpha: 1,
                duration: 300,
                delay: 200 + i * 200,
            });
            this.tweens.add({
                targets: valueText,
                alpha: 1,
                x: width * 0.68,
                duration: 400,
                delay: 300 + i * 200,
                ease: 'Back.easeOut',
            });
        });

        // Complete callback after all animations
        const totalAnimTime = 500 + displayable.length * 200;
        this.time.delayedCall(totalAnimTime, () => {
            if (onComplete) onComplete();
        });
    }

    /**
     * Shows outcome text + stat changes after a choice (both legacy and multi-step).
     */
    showOutcomeWithStats(choice, onComplete) {
        useUIStore.getState().closeDialogue();

        const { width, height } = this.scale;

        this.clearStepObjects();

        const dimOverlay = this.addStepObj(
            this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f, 0.7)
        );

        // Outcome text
        const outcomeText = this.addStepObj(
            this.add.text(width / 2, height * 0.28, choice.outcome || 'Done.', {
                fontFamily: '"Playfair Display"',
                fontSize: '15px',
                fontStyle: 'italic',
                color: '#c9a84c',
                wordWrap: { width: width * 0.6 },
                align: 'center',
            }).setOrigin(0.5)
        );
        outcomeText.setAlpha(0);

        this.tweens.add({
            targets: outcomeText,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                // Show stat changes below the outcome text
                const effects = choice.effects || {};
                this.renderStatIndicators(effects, height * 0.42, () => {
                    // Wait, then either advance or exit
                    this.time.delayedCall(1200, () => {
                        if (onComplete) {
                            onComplete();
                        }
                    });
                });
            },
        });
    }

    // ═══════════════════════════════════════════
    //  LEGACY SINGLE-STEP FORMAT (backwards compat)
    // ═══════════════════════════════════════════

    renderLegacyEvent() {
        const { width, height } = this.scale;

        // Description with typewriter
        const descText = this.add.text(width * 0.15, 120, '', {
            fontFamily: '"Playfair Display"',
            fontSize: '14px',
            color: '#e8e4df',
            wordWrap: { width: width * 0.7 },
            lineSpacing: 6,
        });

        const fullDesc = this.eventData.description;
        let charIndex = 0;
        this.time.addEvent({
            delay: 18,
            repeat: fullDesc.length - 1,
            callback: () => {
                charIndex++;
                descText.setText(fullDesc.substring(0, charIndex));
            },
        });

        const choiceStartY = Math.min(height * 0.55, 320);
        const totalTypeTime = fullDesc.length * 18;

        const processedChoices = this.eventData.choices.map((choice, i) => {
            const gateResult = QualityGate.checkDetailed(choice.requires);
            return {
                ...choice,
                index: i,
                available: gateResult.met,
                lockedDetails: gateResult.details.filter(d => !d.met),
                isBlue: choice.isBlueOption || false,
            };
        });

        let visibleIndex = 0;
        processedChoices.forEach((choice, originalIndex) => {
            const shouldShow = choice.available || choice.requires;
            if (!shouldShow && choice.isBlue) return;

            const delay = totalTypeTime + 300 + visibleIndex * 200;
            const displayIndex = visibleIndex;
            visibleIndex++;

            this.time.delayedCall(delay, () => {
                const cy = choiceStartY + displayIndex * 55;

                if (choice.available) {
                    const borderColor = choice.isBlue ? 0x4488cc : 0x3a3a4e;
                    const hoverColor = choice.isBlue ? 0x66aaee : 0xc9a84c;

                    const cardBg = this.add.rectangle(width / 2, cy + 15, width * 0.72, 45, 0x1a1a2e, 0.85);
                    cardBg.setStrokeStyle(choice.isBlue ? 2 : 1, borderColor);

                    const prefix = choice.isBlue ? '🔵  ' : `${originalIndex + 1}.  `;
                    const choiceLabel = this.add.text(width * 0.18, cy + 5, `${prefix}${choice.label}`, {
                        fontFamily: '"Playfair Display"',
                        fontSize: '13px',
                        color: choice.isBlue ? '#88bbdd' : '#b8b4af',
                        wordWrap: { width: width * 0.62 },
                    });

                    cardBg.setAlpha(0);
                    choiceLabel.setAlpha(0);
                    this.tweens.add({ targets: [cardBg, choiceLabel], alpha: 1, duration: 400 });

                    cardBg.setInteractive({ useHandCursor: true });
                    cardBg.on('pointerover', () => {
                        cardBg.setStrokeStyle(2, hoverColor);
                        choiceLabel.setColor(choice.isBlue ? '#aaddff' : '#c9a84c');
                    });
                    cardBg.on('pointerout', () => {
                        cardBg.setStrokeStyle(choice.isBlue ? 2 : 1, borderColor);
                        choiceLabel.setColor(choice.isBlue ? '#88bbdd' : '#b8b4af');
                    });
                    cardBg.on('pointerdown', () => {
                        this.selectChoiceLegacy(choice, originalIndex);
                    });
                } else {
                    const cardBg = this.add.rectangle(width / 2, cy + 15, width * 0.72, 45, 0x0f0f1a, 0.6);
                    cardBg.setStrokeStyle(1, 0x222233);

                    const reqHints = choice.lockedDetails.map(d => `${d.label} ${d.needed}`).join(', ');
                    const choiceLabel = this.add.text(width * 0.18, cy + 2, `🔒  ${choice.label}`, {
                        fontFamily: '"Playfair Display"',
                        fontSize: '12px',
                        color: '#3a3a4a',
                        wordWrap: { width: width * 0.62 },
                    });

                    this.add.text(width * 0.20, cy + 22, `Requires: ${reqHints}`, {
                        fontFamily: '"Press Start 2P"',
                        fontSize: '6px',
                        color: '#2a2a3a',
                    });

                    cardBg.setAlpha(0);
                    choiceLabel.setAlpha(0);
                    this.tweens.add({ targets: [cardBg, choiceLabel], alpha: 1, duration: 400 });
                }
            });
        });
    }

    selectChoiceLegacy(choice, choiceIndex) {
        // Apply effects
        if (choice.effects) {
            GameState.applyEffects(choice.effects);
        }

        // Record to Decision Log
        DecisionLog.record({
            eventId: this.eventData.id,
            eventTitle: this.eventData.title,
            choiceIndex: choiceIndex,
            choiceLabel: choice.label,
            effects: choice.effects || {},
            tags: choice.tags || this.eventData.tags || [this.eventData.category],
            npcInvolved: choice.npcInvolved || this.eventData.npcInvolved || null,
            isBlueOption: choice.isBlueOption || false,
        });

        // ── Activity Logger ──
        ActivityLogger.logDialogue('choice_made', {
            eventId: this.eventData.id,
            eventTitle: this.eventData.title,
            choiceIndex,
            choiceLabel: choice.label,
            isBlueOption: choice.isBlueOption || false,
            effects: choice.effects || {},
        }, choice.npcInvolved || this.eventData.npcId);

        // ── Storyline trigger check ──
        try {
            EventRegistry.checkStorylineTrigger(
                this.eventData.id, choiceIndex, choice.label
            );
        } catch (e) { console.warn('[DialogueScene] Storyline trigger check failed:', e); }

        // Schedule consequences
        if (choice.schedules) {
            choice.schedules.forEach(schedule => {
                const weeksDelay = schedule.weeksDelay || (3 + Math.floor(Math.random() * 8));
                ConsequenceScheduler.addRelative(weeksDelay, schedule.type, schedule.payload, {
                    condition: schedule.condition || null,
                    sourceEvent: this.eventData.id,
                });
            });
        }

        // Legacy decision record
        GameState.state.decisions.push({
            event: this.eventData.title,
            choice: choice.label,
            week: GameState.state.week,
        });

        if (choice.outcome) {
            GameState.addNews(choice.outcome);
        }

        // Show outcome + stat changes, then exit
        this.showOutcomeWithStats(choice, () => {
            this.exitToHub();
        });
    }

    // ═══════════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════════

    addStepObj(obj) {
        this.stepObjects.push(obj);
        return obj;
    }

    getCategoryBackground(category) {
        const map = {
            social: 'bg_social',
            market: 'bg_market',
            drama: 'bg_drama',
            personal: 'bg_personal',
            fair: 'bg_fair',
            opportunity: 'bg_opportunity',
            scandal: 'bg_drama',
        };
        return map[category] || 'bg_gallery';
    }

    exitToHub() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.returnScene) {
                this.scene.start(this.returnScene, { ...this.returnArgs, ui: this.ui });
            } else {
                GameEventBus.emit(GameEvents.SCENE_EXIT, 'DialogueScene');
                GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                this.showTerminalUI();
                if (this.onExitCallback) {
                    this.onExitCallback();
                } else if (this.ui) {
                    this.ui.popScreen(); // pop the blank trap screen
                    this.ui.render();
                    // Canvas visibility is managed by React App.jsx via UI_ROUTE event above
                }

                this.scene.stop();
            }
        });
    }
}
