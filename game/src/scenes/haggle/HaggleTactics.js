/**
 * HaggleTactics.js — Menu system, tactic execution, and dialogue choice UI.
 *
 * Mixin module: exports methods that get assigned to HaggleScene.prototype.
 * All methods use `this` referring to the HaggleScene instance.
 *
 * Contains:
 *   - _renderMainMenu — 2×2 category grid (TACTICS / POWERS / INFO / DEAL)
 *   - _getCategoryHint — Tooltip text for each menu category
 *   - _renderTacticList — Scrollable tactic list with type colors and success rates
 *   - _renderDialogueChoices — Stage 3 dialogue choice selection
 *   - _renderInfoScreen — Dealer profile and round stats
 *   - _renderDealMenu — Walk Away / Extend Hand options
 *   - _addBackButton — Reusable back button for sub-menus
 *   - _renderExtendHand — Dramatic deal-closing confirmation
 *   - executeTactic — Full tactic execution pipeline (animation → resolve → feedback)
 */

import { HaggleManager } from '../../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, HAGGLE_TYPES, TACTIC_DIALOGUE_CHOICES, DIALOGUE_EFFECTIVENESS } from '../../data/haggle_config.js';
import { WebAudioService } from '../../managers/WebAudioService.js';

export const HaggleTacticsMixin = {

    /** Stage 1: 2×2 category menu (like Pokemon's FIGHT/BAG/POKEMON/RUN) */
    _renderMainMenu() {
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.menuBg?.setVisible(true);
        this.speakerTab.setText('YOUR MOVE');
        this.dialogueTextContent.setText('What will you do?');

        const { width, height } = this.scale;
        const { dlHeight, dlY, menuW } = this._uiLayout;

        // Check for extend hand / deal close conditions
        const currentState = HaggleManager.getState();
        const asking = currentState.askingPrice || 1;
        const gapPct = (currentState.gap / asking) * 100;

        // 2×2 grid in the right-side menu area
        const menuX = width - menuW - 20;
        const menuY = dlY + 8;
        const btnW = (menuW - 24) / 2;
        const btnH = (dlHeight - 28) / 2;
        const gap = 6;

        const categories = [
            { id: 'tactics', label: '⚔️ TACTICS', color: 0xc9a84c, textColor: '#c9a84c' },
            { id: 'powers', label: '⭐ POWERS', color: 0x60a5fa, textColor: '#60a5fa' },
            { id: 'info', label: '📊 INFO', color: 0x888888, textColor: '#888888' },
            { id: gapPct < 10 ? 'extend' : 'deal', label: gapPct < 10 ? '🤝 DEAL!' : '🤝 DEAL', color: gapPct < 10 ? 0x4ade80 : 0x3a8a5c, textColor: gapPct < 10 ? '#4ade80' : '#3a8a5c' },
        ];

        categories.forEach((cat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = menuX + 8 + col * (btnW + gap) + btnW / 2;
            const y = menuY + 4 + row * (btnH + gap) + btnH / 2;

            const bg = this.add.rectangle(x, y, btnW, btnH, 0x1a1a2e)
                .setStrokeStyle(2, cat.color).setInteractive({ useHandCursor: true });

            const txt = this.add.text(x, y, cat.label, {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: cat.textColor, align: 'center',
            }).setOrigin(0.5);

            bg.on('pointerover', () => { bg.setFillStyle(0x2a2a3e); this.dialogueTextContent.setText(this._getCategoryHint(cat.id)); });
            bg.on('pointerout', () => { bg.setFillStyle(0x1a1a2e); });

            bg.on('pointerdown', () => {
                WebAudioService.tactic?.();
                if (cat.id === 'tactics') this._renderTacticList(false);
                else if (cat.id === 'powers') this._renderTacticList(true);
                else if (cat.id === 'info') this._renderInfoScreen();
                else if (cat.id === 'deal') this._renderDealMenu();
                else if (cat.id === 'extend') this._renderExtendHand(width, height, dlY, dlHeight, currentState);
            });

            // Pulse the DEAL button if gap < 10%
            if (cat.id === 'extend') {
                this.tweens.add({ targets: bg, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });
            }

            this.tacticsContainer.add([bg, txt]);
        });
    },

    _getCategoryHint(id) {
        switch (id) {
            case 'tactics': return 'Choose a negotiation tactic.';
            case 'powers': return 'Use a special ability (stat-gated).';
            case 'info': return 'View the dealer\'s profile and round details.';
            case 'deal': return 'Close the deal or walk away.';
            case 'extend': return 'The gap is close! Seal the deal!';
            default: return '';
        }
    },

    /** Stage 2: List of available tactics (scrollable, with BACK button) */
    _renderTacticList(powersOnly = false) {
        this.tacticsContainer.removeAll(true);
        const { width, height } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;

        const allTactics = HaggleManager.getAvailableTactics();
        const filtered = powersOnly
            ? allTactics.filter(t => t.isBlueOption)
            : allTactics.filter(t => !t.isBlueOption && t.id !== 'walkAway');

        this.speakerTab.setText(powersOnly ? '⭐ POWERS' : '⚔️ TACTICS');
        this.dialogueTextContent.setText(powersOnly ? 'Choose a special power.' : 'Choose your tactic.');

        // Scrollable list on the left side of dialogue box
        const listX = 40;
        const listW = width - 320;
        const itemH = 36;
        const maxVisible = Math.floor((dlHeight - 10) / itemH);

        const page = this._tacticPage || 0;
        const visibleTactics = filtered.slice(page * maxVisible, (page + 1) * maxVisible);
        const totalPages = Math.ceil(filtered.length / maxVisible);

        visibleTactics.forEach((t, i) => {
            const y = dlY + 8 + i * itemH;
            const isLocked = t.locked;

            // Type colors
            let borderColor = 0x3a3a4e;
            let typeIcon = '';
            if (t.type) {
                switch (t.type) {
                    case HAGGLE_TYPES.EMOTIONAL: borderColor = 0xff88aa; typeIcon = '❤️'; break;
                    case HAGGLE_TYPES.LOGICAL: borderColor = 0x88bbff; typeIcon = '🧠'; break;
                    case HAGGLE_TYPES.AGGRESSIVE: borderColor = 0xff6666; typeIcon = '🔥'; break;
                    case HAGGLE_TYPES.FINANCIAL: borderColor = 0x88cc88; typeIcon = '💰'; break;
                }
            }

            const bg = this.add.rectangle(listX + listW / 2, y + itemH / 2, listW, itemH - 4, isLocked ? 0x0a0a0f : 0x1a1a2e)
                .setStrokeStyle(1.5, isLocked ? 0x222222 : borderColor);

            if (!isLocked) {
                bg.setInteractive({ useHandCursor: true });
                bg.on('pointerover', () => {
                    bg.setFillStyle(0x2a2a3e);
                    this.dialogueTextContent.setText(t.description || '');
                });
                bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e));
                bg.on('pointerdown', () => this._renderDialogueChoices(t));
            }

            const label = this.add.text(listX + 10, y + itemH / 2, `${typeIcon} ${t.label}`, {
                fontFamily: '"Press Start 2P"', fontSize: '9px',
                color: isLocked ? '#333' : '#e8e4df',
            }).setOrigin(0, 0.5);

            this.tacticsContainer.add([bg, label]);

            if (isLocked) {
                const lock = this.add.text(listX + listW - 10, y + itemH / 2, '🔒', {
                    fontSize: '12px'
                }).setOrigin(1, 0.5);
                this.tacticsContainer.add(lock);
            }

            // Success rate badge (right side)
            if (!isLocked && t.baseSuccess) {
                const pct = Math.round(t.baseSuccess * 100);
                const pctColor = pct >= 60 ? '#4ade80' : pct >= 40 ? '#c9a84c' : '#f87171';
                const badge = this.add.text(listX + listW - 10, y + itemH / 2, `${pct}%`, {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: pctColor,
                }).setOrigin(1, 0.5);
                this.tacticsContainer.add(badge);
            }
        });

        // Page nav (if needed)
        if (totalPages > 1) {
            const navY = dlY + dlHeight - 16;
            if (page > 0) {
                const prev = this.add.text(listX + 10, navY, '◄ PREV', {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888',
                }).setInteractive({ useHandCursor: true });
                prev.on('pointerdown', () => { this._tacticPage = page - 1; this._renderTacticList(powersOnly); });
                this.tacticsContainer.add(prev);
            }
            if (page < totalPages - 1) {
                const next = this.add.text(listX + listW - 10, navY, 'NEXT ►', {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888',
                }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
                next.on('pointerdown', () => { this._tacticPage = page + 1; this._renderTacticList(powersOnly); });
                this.tacticsContainer.add(next);
            }
            const pageText = this.add.text(listX + listW / 2, navY, `${page + 1}/${totalPages}`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555',
            }).setOrigin(0.5, 0);
            this.tacticsContainer.add(pageText);
        }

        // BACK button (right side)
        this._addBackButton(() => this._renderMainMenu());
    },

    /** Stage 3: Dialogue choice — HOW to execute the tactic */
    _renderDialogueChoices(tactic) {
        this.tacticsContainer.removeAll(true);
        const { width, height } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;

        const choices = TACTIC_DIALOGUE_CHOICES[tactic.id];

        // If no dialogue choices for this tactic, go straight to execute
        if (!choices || choices.length === 0) {
            this.executeTactic(tactic.id, tactic.label, null);
            return;
        }

        this.speakerTab.setText('💬 CHOOSE YOUR WORDS');
        this.dialogueTextContent.setText(`${tactic.label} — Pick your approach:`);

        const listX = 40;
        const listW = width - 120;
        const itemH = Math.min(50, (dlHeight - 20) / choices.length);

        choices.forEach((choice, i) => {
            const y = dlY + 10 + i * itemH;

            // Calculate effectiveness hint for current dealer
            const dealerKey = this.state.dealerTypeKey || 'patron';
            const eff = choice.effectiveness?.[dealerKey] || 'neutral';
            let effColor = 0x3a3a4e;
            let effIcon = '';
            let effLabel = '';
            if (eff === 'good') { effColor = 0x2e4e2e; effIcon = '✦'; effLabel = 'STRONG'; }
            else if (eff === 'bad') { effColor = 0x4e2e2e; effIcon = '✗'; effLabel = 'WEAK'; }
            else { effIcon = '·'; effLabel = ''; }

            const bg = this.add.rectangle(listX + listW / 2, y + itemH / 2, listW, itemH - 4, 0x1a1a2e)
                .setStrokeStyle(1.5, effColor === 0x3a3a4e ? 0x3a3a4e : effColor)
                .setInteractive({ useHandCursor: true });

            // Dialogue line
            const lineTxt = this.add.text(listX + 14, y + itemH / 2 - 6, choice.line, {
                fontFamily: '"Playfair Display"', fontSize: '14px', color: '#e8e4df', fontStyle: 'italic',
                wordWrap: { width: listW - 100 },
            }).setOrigin(0, 0.5);

            // Tone tag
            const toneTxt = this.add.text(listX + 14, y + itemH / 2 + 10, `[${choice.tone}]`, {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#555',
            }).setOrigin(0, 0.5);

            // Effectiveness hint (subtle — only shows after high intel?)
            // For now, always show a subtle hint via border color
            let effBadge = null;
            if (effLabel) {
                effBadge = this.add.text(listX + listW - 14, y + itemH / 2, `${effIcon} ${effLabel}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '7px',
                    color: eff === 'good' ? '#4ade80' : '#f87171',
                }).setOrigin(1, 0.5).setAlpha(0.7);
            }

            bg.on('pointerover', () => {
                bg.setFillStyle(eff === 'good' ? 0x1e3e1e : eff === 'bad' ? 0x3e1e1e : 0x2a2a3e);
            });
            bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e));

            bg.on('pointerdown', () => {
                // Player selected their words — execute with this dialogue choice
                this._selectedDialogue = choice;
                this.executeTactic(tactic.id, tactic.label, choice);
            });

            const elements = [bg, lineTxt, toneTxt];
            if (effBadge) elements.push(effBadge);
            this.tacticsContainer.add(elements);
        });

        // BACK button
        this._addBackButton(() => {
            this._tacticPage = 0;
            this._renderTacticList(tactic.isBlueOption || false);
        });
    },

    /** INFO screen — shows dealer profile, round stats, gap analysis */
    _renderInfoScreen() {
        this.tacticsContainer.removeAll(true);
        const { width } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;
        const state = HaggleManager.getState();

        this.speakerTab.setText('📊 INTEL');
        this.dialogueTextContent.setText('');

        const infoX = 40;
        const col2X = width / 2;

        // Left column: Dealer info
        const lines = [
            { label: 'DEALER', value: state.dealerName || 'Unknown', color: '#c9a84c' },
            { label: 'TYPE', value: (state.dealerType?.name || state.dealerTypeKey || '?').toUpperCase(), color: '#888' },
            { label: 'PATIENCE', value: `${state.patience} / ${state.maxPatience || '?'}`, color: state.patience <= 2 ? '#f87171' : '#4ade80' },
            { label: 'ROUND', value: `${state.round} / ${state.maxRounds}`, color: '#888' },
        ];

        lines.forEach((l, i) => {
            const y = dlY + 14 + i * 22;
            this.tacticsContainer.add(
                this.add.text(infoX, y, `${l.label}:`, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555' })
            );
            this.tacticsContainer.add(
                this.add.text(infoX + 100, y, l.value, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: l.color })
            );
        });

        // Right column: Price info
        const asking = state.askingPrice || 0;
        const gap = state.gap || 0;
        const offer = asking - gap;
        const gapPct = Math.round((gap / (asking || 1)) * 100);

        const priceLines = [
            { label: 'ASKING', value: `$${asking.toLocaleString()}`, color: '#f87171' },
            { label: 'YOUR OFFER', value: `$${offer.toLocaleString()}`, color: '#4ade80' },
            { label: 'GAP', value: `$${gap.toLocaleString()} (${gapPct}%)`, color: '#c9a84c' },
            { label: 'ARTWORK', value: (state.work?.title || 'Unknown').substring(0, 25), color: '#888' },
        ];

        priceLines.forEach((l, i) => {
            const y = dlY + 14 + i * 22;
            this.tacticsContainer.add(
                this.add.text(col2X, y, `${l.label}:`, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555' })
            );
            this.tacticsContainer.add(
                this.add.text(col2X + 110, y, l.value, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: l.color })
            );
        });

        // Type effectiveness hint
        const dealerStyle = state.dealerType?.style;
        if (dealerStyle) {
            const hint = this.add.text(infoX, dlY + dlHeight - 22, `Dealer style: ${dealerStyle.toUpperCase()} — choose your approach wisely.`, {
                fontFamily: '"Playfair Display"', fontSize: '12px', color: '#555', fontStyle: 'italic',
            });
            this.tacticsContainer.add(hint);
        }

        this._addBackButton(() => this._renderMainMenu());
    },

    /** DEAL menu — Walk Away or Extend Hand */
    _renderDealMenu() {
        this.tacticsContainer.removeAll(true);
        const { width } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;
        const currentState = HaggleManager.getState();
        const asking = currentState.askingPrice || 1;
        const gapPct = (currentState.gap / asking) * 100;

        this.speakerTab.setText('🤝 DEAL');
        this.dialogueTextContent.setText(`Gap: ${Math.round(gapPct)}% — $${currentState.gap?.toLocaleString() || '?'} apart.`);

        const centerX = width / 2;
        const btnW = 240;
        const btnH = 44;

        // Walk Away
        const walkY = dlY + 30;
        const walkBg = this.add.rectangle(centerX, walkY + btnH / 2, btnW, btnH, 0x2e1a1a)
            .setStrokeStyle(2, 0xc94040).setInteractive({ useHandCursor: true });
        const walkTxt = this.add.text(centerX, walkY + btnH / 2, '💨 WALK AWAY', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#f87171',
        }).setOrigin(0.5);
        walkBg.on('pointerover', () => walkBg.setFillStyle(0x4e2a2a));
        walkBg.on('pointerout', () => walkBg.setFillStyle(0x2e1a1a));
        walkBg.on('pointerdown', () => {
            // Check for dialogue choices on walkAway
            const walkTactic = { id: 'walkAway', label: '💨 Walk Away', isBlueOption: false };
            this._renderDialogueChoices(walkTactic);
        });

        // Extend Hand (only if gap < 25%)
        const elements = [walkBg, walkTxt];
        if (gapPct < 25) {
            const extendY = dlY + 30 + btnH + 10;
            const extendBg = this.add.rectangle(centerX, extendY + btnH / 2, btnW, btnH, 0x1a2e1a)
                .setStrokeStyle(2, 0x3a8a5c).setInteractive({ useHandCursor: true });
            const extendTxt = this.add.text(centerX, extendY + btnH / 2, '🤝 EXTEND HAND', {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#4ade80',
            }).setOrigin(0.5);
            extendBg.on('pointerover', () => extendBg.setFillStyle(0x2a3e2a));
            extendBg.on('pointerout', () => extendBg.setFillStyle(0x1a2e1a));
            extendBg.on('pointerdown', () => this._renderExtendHand(width, this.scale.height, dlY, dlHeight, currentState));

            if (gapPct < 10) {
                this.tweens.add({ targets: extendBg, scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
            }
            elements.push(extendBg, extendTxt);
        }

        this.tacticsContainer.add(elements);
        this._addBackButton(() => this._renderMainMenu());
    },

    /** Reusable BACK button in bottom-right of menu */
    _addBackButton(onBack) {
        const { width } = this.scale;
        const { dlHeight, dlY, menuW } = this._uiLayout;

        const btnX = width - 60;
        const btnY = dlY + dlHeight - 18;

        const backBg = this.add.rectangle(btnX, btnY, 80, 22, 0x1a1a2e)
            .setStrokeStyle(1, 0x3a3a4e).setInteractive({ useHandCursor: true });
        const backTxt = this.add.text(btnX, btnY, '◄ BACK', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#888',
        }).setOrigin(0.5);

        backBg.on('pointerover', () => { backBg.setFillStyle(0x2a2a3e); backTxt.setColor('#e8e4df'); });
        backBg.on('pointerout', () => { backBg.setFillStyle(0x1a1a2e); backTxt.setColor('#888'); });
        backBg.on('pointerdown', () => { this._tacticPage = 0; onBack(); });

        this.tacticsContainer.add([backBg, backTxt]);
    },

    _renderExtendHand(width, height, dlY, dlHeight, currentState) {
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.speakerTab.setText('═══ EXTEND HAND ═══');

        // Dim the screen
        const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(50);
        this.tacticsContainer.add(dimOverlay);

        const btnW = width - 120;
        const btnH = dlHeight - 30;
        const btnX = width / 2;
        const btnY = dlY + dlHeight / 2;

        const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a2e1a, 0.95)
            .setStrokeStyle(2, 0x3a8a5c).setInteractive({ useHandCursor: true }).setDepth(51);

        const label = this.add.text(btnX, btnY - 14, '═══ EXTEND HAND ═══', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#c9a84c'
        }).setOrigin(0.5).setDepth(52);

        const desc = this.add.text(btnX, btnY + 14, 'Accept the current terms and close the deal.', {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#8a8a9a'
        }).setOrigin(0.5).setDepth(52);

        this.tacticsContainer.add([bg, label, desc]);

        // Heartbeat pulse tween
        this.tweens.add({
            targets: bg,
            scaleX: 1.02, scaleY: 1.02,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        bg.on('pointerover', () => bg.setFillStyle(0x2a3e2a));
        bg.on('pointerout', () => bg.setFillStyle(0x1a2e1a));

        bg.on('pointerdown', () => {
            bg.disableInteractive();
            dimOverlay.destroy();

            // 3-second dramatic pause
            const pauseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(60);
            const pauseText = this.add.text(width / 2, height / 2, '...', {
                fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#c9a84c'
            }).setOrigin(0.5).setDepth(61);

            this.tweens.add({
                targets: pauseText, alpha: 0.3, duration: 500, yoyo: true, repeat: 2,
                onComplete: () => {
                    pauseOverlay.destroy();
                    pauseText.destroy();
                    // Auto-resolve at current gap price
                    const result = HaggleManager.executeTactic('walkAway');
                    // Force deal at current price
                    const state = HaggleManager.getState();
                    state.result = 'deal';
                    state.finalPrice = (state.askingPrice || 0) - (state.gap || 0);
                    state.resolved = true;
                    this.state = state;
                    this.renderResult();
                }
            });
        });
    },

    executeTactic(tacticId, label, dialogueChoice = null) {
        this.tacticsContainer.setVisible(false);
        this.menuBg?.setVisible(false);
        this.speakerTab.setText('SYSTEM');
        WebAudioService.tactic?.();

        // ── Dialogue cutscene moment ──
        // If a dialogue choice was selected, show the player's line first
        const showPlayerLine = dialogueChoice?.line;

        const proceedWithTactic = () => {
            // Look up tactic definition for animType and type
            let animType = 'slash';
            let tacticType = null;
            if (TACTICS[tacticId]) {
                animType = TACTICS[tacticId].animType;
                tacticType = TACTICS[tacticId].type;
            } else {
                const blueOpt = BLUE_OPTIONS.find(o => o.id === tacticId);
                if (blueOpt) {
                    animType = blueOpt.animType || 'charm';
                    tacticType = blueOpt.type;
                }
            }

            // Play the multi-step animation, then resolve the tactic
            this.playTacticAnimation(animType, () => {
                const result = HaggleManager.executeTactic(tacticId);

                if (!result) {
                    console.warn('[HaggleScene] executeTactic returned null for:', tacticId);
                    this.renderTactics();
                    return;
                }

                // Apply dialogue choice effectiveness modifier
                if (dialogueChoice) {
                    const dealerKey = this.state.dealerTypeKey || 'patron';
                    const eff = dialogueChoice.effectiveness?.[dealerKey] || 'neutral';
                    const mod = DIALOGUE_EFFECTIVENESS[eff] || 0;

                    if (mod !== 0) {
                        // Re-roll success with modifier applied
                        const baseRoll = result.success;
                        const adjustedChance = (result.successChance || 0.5) + mod;
                        const newRoll = Math.random() < adjustedChance;

                        // Override result if dialogue choice changed the outcome
                        if (newRoll !== baseRoll) {
                            result.success = newRoll;
                            if (eff === 'good' && newRoll) {
                                result.effectivenessMessage = 'Your words struck a chord! SUPER EFFECTIVE!';
                            } else if (eff === 'bad' && !newRoll) {
                                result.effectivenessMessage = 'Wrong approach... not very effective.';
                            }
                        } else if (eff === 'good' && newRoll) {
                            result.effectivenessMessage = 'Great choice of words! Effective!';
                        }
                    }
                }

                // Type effectiveness check
                const isSuperEffective = result.effectivenessMessage?.toLowerCase().includes('super effective');
                const isNotEffective = result.effectivenessMessage?.toLowerCase().includes('not very effective');

                // Show effectiveness flash + sound
                if (isSuperEffective) {
                    this.showEffectivenessFlash('SUPER EFFECTIVE!', '#ffcc00');
                    WebAudioService.superEffective?.();
                } else if (isNotEffective) {
                    this.showEffectivenessFlash('Not very effective...', '#666688');
                    WebAudioService.miss?.();
                } else if (result.success) {
                    this.showEffectivenessFlash('Effective!', '#88cc88');
                    WebAudioService.hit?.();
                } else {
                    WebAudioService.miss?.();
                }

                // Dealer reaction
                this.dealerHitReaction(result.success, isSuperEffective);

                // Animate bars smoothly
                this.updateBars(true);

                // Use real dealer dialogue from haggle_config instead of generic text
                const dealerDialogue = result.dialogue ? result.dialogue.replace(/"/g, '') : (result.success ? 'Interesting...' : 'I don\'t think so.');
                const priceInfo = result.priceChange ? `\n> Price shifted by $${Math.abs(result.priceChange).toLocaleString()}` : '';

                let effectText = result.success ? '✦ Effective!' : '✗ No effect.';
                if (result.effectivenessMessage) {
                    effectText = `✦ ${result.effectivenessMessage}`;
                }

                this.time.delayedCall(400, () => {
                    this.playDialogue(`> ${effectText}${priceInfo}`, () => {
                        this.time.delayedCall(800, () => {
                            this.speakerTab.setText(this.state.dealerName?.toUpperCase() || 'DEALER');
                            if (result.dealReached || result.dealFailed) {
                                this.playDialogue(result.finalDialogue ? result.finalDialogue.replace(/"/g, '') : 'We\'re done here.', () => this.renderResult());
                            } else {
                                this.playDialogue(dealerDialogue, () => this.renderTactics());
                            }
                        });
                    });
                });
            });
        };

        // ── Cutscene: show player's chosen dialogue line first ──
        if (showPlayerLine) {
            this.speakerTab.setText('YOU');
            this.playDialogue(showPlayerLine, () => {
                // Brief dramatic pause before the tactic resolves
                this.time.delayedCall(300, proceedWithTactic);
            });
        } else {
            proceedWithTactic();
        }
    },
};
