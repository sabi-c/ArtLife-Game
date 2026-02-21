/**
 * TerminalUI — Core text-based game renderer
 * 
 * Renders the game as styled text in a single DOM container.
 * Handles keyboard navigation (↑↓ Enter Esc) and touch/click on options.
 * Manages a screen stack for push/pop navigation.
 */
export class TerminalUI {
    constructor(container) {
        this.container = container;
        this.screenStack = [];
        this.options = [];       // Current selectable options
        this.selectedIndex = 0;  // Currently highlighted option
        this.onScreen = null;    // Current screen render function
        this._isSceneScreen = false; // Whether current screen is an event/scene (enables staggered animations)
        this._typewriterCleanup = null; // Cleanup function for active typewriter
        this._isAnimating = false; // Whether a typewriter animation is currently running
        this._animationAbort = null; // AbortController for cancelling animation

        // Notification system
        this.notificationQueue = [];
        this.isShowingNotification = false;

        // Create notification container
        this.notifBar = document.createElement('div');
        this.notifBar.className = 't-notification-bar';
        this.notifBar.style.display = 'none';
        this.container.parentElement.insertBefore(this.notifBar, this.container);

        // Bind keyboard
        document.addEventListener('keydown', (e) => this.handleKey(e));

        // ── Touch/Swipe Gestures (Agent-3: Mobile UX) ──
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;

        this.container.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this._touchStartX = touch.clientX;
            this._touchStartY = touch.clientY;
            this._touchStartTime = Date.now();
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - this._touchStartX;
            const dy = touch.clientY - this._touchStartY;
            const dt = Date.now() - this._touchStartTime;

            // Must be a quick swipe (< 400ms), mostly horizontal (1.5:1 ratio), > 50px
            if (dt < 400 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx > 0) {
                    // Swipe right → go back
                    if (this.screenStack.length > 0) {
                        this.popScreen();
                    }
                }
                // Swipe left is reserved for future use (category cycling, etc.)
            }
        }, { passive: true });
    }

    // ── Notifications ──

    showNotification(text, icon = '📱', duration = null) {
        // Get duration from settings if not specified
        if (!duration) {
            const settings = JSON.parse(localStorage.getItem('artlife_settings') || '{}');
            const speed = settings.notifSpeed || 'normal';
            duration = speed === 'slow' ? 5000 : speed === 'fast' ? 1500 : 3000;
        }

        this.notificationQueue.push({ text, icon, duration });
        if (!this.isShowingNotification) {
            this._processNotificationQueue();
        }
    }

    _processNotificationQueue() {
        if (this.notificationQueue.length === 0) {
            this.isShowingNotification = false;
            return;
        }

        this.isShowingNotification = true;
        const { text, icon, duration } = this.notificationQueue.shift();

        this.notifBar.textContent = `${icon} ${text}`;
        this.notifBar.style.display = 'block';
        this.notifBar.classList.remove('t-notif-fade-out');
        this.notifBar.classList.add('t-notif-slide-in');

        // Start fade-out before removal
        setTimeout(() => {
            this.notifBar.classList.remove('t-notif-slide-in');
            this.notifBar.classList.add('t-notif-fade-out');
        }, duration - 500);

        // Remove and process next
        setTimeout(() => {
            this.notifBar.style.display = 'none';
            this.notifBar.classList.remove('t-notif-fade-out');
            // Small gap between notifications
            setTimeout(() => this._processNotificationQueue(), 300);
        }, duration);
    }

    // ── Navigation ──

    pushScreen(renderFn) {
        if (window.lastError) window.lastError = null;
        if (this.onScreen) {
            this.screenStack.push(this.onScreen);
        }
        this.onScreen = renderFn;
        this.selectedIndex = 0;
        this.render();
    }

    popScreen() {
        if (window.lastError) window.lastError = null;
        if (this.screenStack.length > 0) {
            this.onScreen = this.screenStack.pop();
            this.selectedIndex = 0;
            this.render();
        }
    }

    replaceScreen(renderFn) {
        if (window.lastError) window.lastError = null;
        this.onScreen = renderFn;
        this.selectedIndex = 0;
        this.render();
    }

    // ── Rendering ──

    render() {
        if (!this.onScreen) return;

        const { lines, options, animated, footerHtml } = this.onScreen();
        this.options = options || [];

        // Build HTML
        let html = '';
        let lineIdx = 0; // For staggered animation delay

        // Render text lines
        lines.forEach(line => {
            lineIdx++;
            if (typeof line === 'string') {
                html += `<div class="t-line t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line)}</div>`;
            } else if (line.type === 'header' || line.style === 'header') {
                html += `<div class="t-header t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'subheader' || line.style === 'subheader') {
                html += `<div class="t-subheader t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'divider' || line.style === 'divider') {
                html += `<div class="t-divider" data-anim-line>${'─'.repeat(50)}</div>`;
            } else if (line.type === 'stat' || line.isStatRow) {
                html += `<div class="t-stat t-anim-line" data-anim-line style="--i:${lineIdx}"><span class="t-stat-label">${this.escapeHtml(line.label)}</span> <span class="t-stat-value ${line.color || ''}">${this.escapeHtml(String(line.value))}</span></div>`;
            } else if (line.type === 'news' || line.style === 'news') {
                html += `<div class="t-news t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'blank' || line.style === 'normal') {
                if (line.style === 'normal' && line.text !== '') {
                    html += `<div class="t-line t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
                } else {
                    html += `<div class="t-blank" data-anim-line>&nbsp;</div>`;
                }
            } else if (line.type === 'dim' || line.style === 'dim') {
                html += `<div class="t-dim t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'gold' || line.style === 'gold') {
                html += `<div class="t-gold t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'green' || line.style === 'green') {
                html += `<div class="t-green t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'red' || line.style === 'red') {
                html += `<div class="t-red t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'ascii-art') {
                // Pre-formatted ASCII art — no escaping, preserves whitespace
                html += `<div class="t-ascii-art">${line.text}</div>`;
            } else if (line.type === 'center') {
                const cls = line.className || '';
                html += `<div class="t-center ${cls}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'raw') {
                html += line.text;
            } else if (line.type === 'save-slot') {
                // Rich save slot card
                const m = line.meta;
                const active = line.active ? ' t-save-active' : '';
                const date = m.savedAt ? new Date(m.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?';
                const city = (m.city || 'unknown').replace(/-/g, ' ');
                html += `<div class="t-save-slot${active}">`;
                html += `<div class="t-save-header">${this.escapeHtml(m.characterIcon || '🎭')} ${this.escapeHtml(m.playerName || 'Unknown')} — ${this.escapeHtml(m.characterName || '?')}</div>`;
                html += `<div class="t-save-meta">Week ${m.week || '?'} · $${(m.cash || 0).toLocaleString()} · ${(m.portfolioCount || 0)} works · ${city}</div>`;
                html += `<div class="t-save-meta">Net Worth: $${(m.netWorth || 0).toLocaleString()} · Rep: ${m.reputation || '?'} · ${date}</div>`;
                html += `</div>`;

                // ── Scene & Cutscene Line Types (Agent-3) ──

            } else if (line.type === 'scene-header' || line.isSceneHeader) {
                // Full-width atmospheric header with title and optional location
                html += `<div class="t-scene-header">`;
                html += `<div class="t-scene-title">${this.escapeHtml(line.title)}</div>`;
                if (line.location) {
                    html += `<div class="t-scene-location">${this.escapeHtml(line.location)}</div>`;
                }
                html += `</div>`;

            } else if (line.type === 'scene-text' || line.isSceneText) {
                // Narrative prose with fade-in animation
                html += `<div class="t-scene-text" data-anim-line>${this.escapeHtml(line.text)}</div>`;

            } else if (line.type === 'dialogue' || line.isDialogue) {
                // Speaker name in gold, quoted text in italics, gold left border
                const speaker = line.speakerName || line.speaker || '???';
                html += `<div class="t-dialogue" data-anim-line>`;
                html += `<div class="t-dialogue-speaker">${this.escapeHtml(speaker)}</div>`;
                html += `<div class="t-dialogue-text" data-anim-line>"${this.escapeHtml(line.text)}"</div>`;
                html += `</div>`;

            } else if (line.type === 'scene-separator' || line.style === 'scene-sep') {
                // Decorative separator between scene beats
                html += `<div class="t-scene-separator" data-anim-line>· · ·</div>`;

            } else if (line.type === 'pixel-art-bg' || line.isPixelArt) {
                // Background image from public/backgrounds/
                const src = line.src || '';
                html += `<div class="t-pixel-art"><img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(line.alt || 'Scene')}"></div>`;

                // ── Agent-2: Section headers for categorized dashboard ──
            } else if (line.type === 'section-header' || line.style === 'section') {
                html += `<div class="t-section-header">${this.escapeHtml(line.text)}</div>`;

                // ── Agent-2: Pokémon-style Battle Header ──
            } else if (line.type === 'battle-header') {
                const gapPercent = line.gapPercent || 0;
                const gapFill = Math.min(20, Math.round(gapPercent / 5));
                const gapBar = '█'.repeat(gapFill) + '░'.repeat(20 - gapFill);
                const patBar = '❤️'.repeat(line.patience || 0) + '🖤'.repeat(Math.max(0, (line.maxPatience || 5) - (line.patience || 0)));
                html += `<div class="t-battle-header" data-anim-line>`;
                html += `<div class="t-battle-vs">`;
                html += `<div class="t-battle-card t-battle-player"><div class="t-battle-icon">👤</div><div class="t-battle-name">YOU</div><div class="t-battle-offer">$${(line.playerOffer || 0).toLocaleString()}</div></div>`;
                html += `<div class="t-battle-vs-text">⚔️</div>`;
                html += `<div class="t-battle-card t-battle-dealer"><div class="t-battle-icon">${this.escapeHtml(line.dealerIcon || '🎭')}</div><div class="t-battle-name">${this.escapeHtml(line.dealerName || 'DEALER')}</div><div class="t-battle-offer">$${(line.dealerAsk || 0).toLocaleString()}</div></div>`;
                html += `</div>`;
                html += `<div class="t-battle-round">ROUND ${line.round || 1} / ${line.maxRounds || 5}</div>`;
                html += `<div class="t-battle-gap"><span class="t-battle-gap-label">GAP ${gapPercent}%</span> <span class="t-battle-gap-bar">${gapBar}</span></div>`;
                html += `<div class="t-battle-patience">${patBar}</div>`;
                html += `</div>`;

                // ── Agent-2: Work Card for market screen ──
            } else if (line.type === 'work-card') {
                const tierClass = line.tier === 'blue-chip' ? 't-wc-gold' :
                    line.tier === 'mid-career' ? 't-wc-silver' :
                        line.tier === 'hot' ? 't-wc-teal' : 't-wc-white';
                const heatDots = line.heat ? '🔥'.repeat(Math.min(5, Math.round(line.heat / 2))) : '';
                html += `<div class="t-work-card ${tierClass}" data-anim-line>`;
                html += `<div class="t-wc-title">${this.escapeHtml(line.title || 'Untitled')}</div>`;
                html += `<div class="t-wc-meta">${this.escapeHtml(line.artist || 'Unknown')} · $${(line.price || 0).toLocaleString()} ${heatDots}</div>`;
                html += `</div>`;

            } else if (line.type === 'worldmap' || line.isWorldMap) {
                // World map — rendered as a styled box with city markers
                html += `<div class="world-map">`;
                html += `<div class="t-worldmap-header">${this.escapeHtml(line.title || '🗺️ WORLD MAP')}</div>`;
                (line.rows || []).forEach(row => {
                    html += `<div class="t-worldmap-row">${row}</div>`; // rows are pre-built HTML
                });
                if (line.legend) {
                    html += `<div class="t-worldmap-legend">${this.escapeHtml(line.legend)}</div>`;
                }
                html += `</div>`;

                // ── Atmosphere & Reveal step types (Animation Enhancement) ──
            } else if (line.type === 'atmosphere') {
                html += `<div class="t-atmosphere t-anim-line" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            } else if (line.type === 'reveal') {
                html += `<div class="t-reveal" data-anim-line style="--i:${lineIdx}">${this.escapeHtml(line.text)}</div>`;
            }
        });

        // ── BUG 6: Global Error Display ──
        if (window.lastError) {
            html += `<div class="t-line t-red" style="padding: 10px; border: 1px solid #c94040; margin: 10px 0; background: rgba(201, 64, 64, 0.1);">[ERROR] ${this.escapeHtml(window.lastError)}</div>`;
        }

        // Render options
        if (this.options.length > 0) {
            html += `<div class="t-options-section">`;
            html += `<div class="t-divider">${'─'.repeat(50)}</div>`;
            this.options.forEach((opt, i) => {
                // Section headers render as styled dividers, not selectable options
                if (opt._sectionHeader) {
                    html += `<div class="t-section-header">${this.escapeHtml(opt.label)}</div>`;
                    return;
                }
                const selected = i === this.selectedIndex;
                const cls = selected ? 't-option t-option-selected' : 't-option';
                const prefix = selected ? '▸ ' : '  ';
                const dimClass = opt.disabled ? ' t-option-disabled' : '';
                const blueClass = opt.isBlueOption ? ' t-option-blue' : '';
                html += `<div class="${cls}${dimClass}${blueClass} t-anim-option" style="--oi:${i}" data-index="${i}">${prefix}${this.escapeHtml(opt.label)}</div>`;
            });
            html += `</div>`;
        }

        // Footer HTML (e.g. ticker bar)
        if (footerHtml) {
            html += footerHtml;
        }

        this.container.innerHTML = html;
        this.container.scrollTop = this.container.scrollHeight;

        // Bind click/touch on options
        this._bindOptionClicks();

        // If animated, start typewriter reveal
        if (animated) {
            this._animatedReveal();
        }
    }

    _bindOptionClicks() {
        this.container.querySelectorAll('.t-option').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                // If animating, skip instead of selecting
                if (this._isAnimating) {
                    this._skipAnimation();
                    return;
                }
                const idx = parseInt(el.dataset.index);
                const opt = this.options[idx];
                if (opt && !opt.disabled && opt.action) {
                    this.selectedIndex = idx;
                    try {
                        opt.action();
                    } catch (err) {
                        console.error('[TerminalUI] Error executing action:', err);
                        window.lastError = err.message || String(err);
                        this.render();
                    }
                } else {
                    // Just highlight if disabled
                    this.selectedIndex = idx;
                    this.render();
                }
            });
        });
    }

    // ── Scene Transition ──

    sceneTransition() {
        // Cancel any active typewriter
        if (this._typewriterCleanup) {
            this._typewriterCleanup();
            this._typewriterCleanup = null;
        }
        const overlay = document.createElement('div');
        overlay.className = 't-scene-transition';
        document.body.appendChild(overlay);
        overlay.addEventListener('animationend', () => overlay.remove());
    }

    // ── Stat Flash — call after applyEffects to animate stat changes ──

    flashStat(selector, isPositive) {
        const el = this.container.querySelector(selector);
        if (!el) return;
        const cls = isPositive ? 'stat-flash-pos' : 'stat-flash-neg';
        el.classList.add(cls);
        el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    }

    // ── Animated Line-by-Line Reveal ──

    async _animatedReveal() {
        this._isAnimating = true;
        const controller = new AbortController();
        this._animationAbort = controller;

        // Hide all animatable lines and the options section
        const allLines = this.container.querySelectorAll('[data-anim-line]');
        const optionSection = this.container.querySelector('.t-options-section');

        allLines.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(4px)';
        });
        if (optionSection) optionSection.style.display = 'none';

        // Add skip listener (click anywhere on container)
        const skipHandler = () => this._skipAnimation();
        this.container.addEventListener('click', skipHandler, { once: true });

        try {
            for (const lineEl of allLines) {
                if (controller.signal.aborted) break;

                const text = lineEl.textContent;
                const isDialogueSpeaker = lineEl.classList.contains('t-dialogue-speaker');
                const isDivider = lineEl.classList.contains('t-divider') || lineEl.classList.contains('t-scene-separator');
                const isBlank = lineEl.classList.contains('t-blank');

                // Dividers and blanks just appear instantly
                if (isDivider || isBlank) {
                    lineEl.style.opacity = '1';
                    lineEl.style.transform = 'none';
                    continue;
                }

                // Speaker names appear instantly with glow
                if (isDialogueSpeaker) {
                    lineEl.style.opacity = '1';
                    lineEl.style.transform = 'none';
                    await this._wait(200, controller.signal);
                    continue;
                }

                // Typewriter reveal for text content
                lineEl.style.opacity = '1';
                lineEl.style.transform = 'none';
                const originalText = text;
                lineEl.textContent = '';

                // Speed: shorter lines faster, longer lines slower
                const charDelay = originalText.length > 80 ? 18 :
                    originalText.length > 40 ? 25 : 30;

                for (let i = 0; i < originalText.length; i++) {
                    if (controller.signal.aborted) {
                        lineEl.textContent = originalText;
                        break;
                    }
                    lineEl.textContent += originalText[i];
                    // Pause longer on punctuation
                    const char = originalText[i];
                    const pause = (char === '.' || char === '!' || char === '?') ? charDelay * 4 :
                        (char === ',') ? charDelay * 2 : charDelay;
                    await this._wait(pause, controller.signal);
                }

                // Brief pause between lines
                if (!controller.signal.aborted) {
                    await this._wait(80, controller.signal);
                }
                this.container.scrollTop = this.container.scrollHeight;
            }
        } catch (e) {
            // Aborted — reveal everything
        }

        // Show all remaining text and options
        allLines.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        if (optionSection) {
            optionSection.style.display = '';
            // Re-bind option clicks since they may have been hidden
            this._bindOptionClicks();
        }
        this.container.scrollTop = this.container.scrollHeight;

        this.container.removeEventListener('click', skipHandler);
        this._isAnimating = false;
        this._animationAbort = null;
    }

    _skipAnimation() {
        if (this._animationAbort) {
            this._animationAbort.abort();
        }
    }

    _wait(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal && signal.aborted) { resolve(); return; }
            const timer = setTimeout(resolve, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    resolve();
                }, { once: true });
            }
        });
    }

    // ── Input Handling ──

    handleKey(e) {
        // If animating, skip on Enter/Escape/Space
        if (this._isAnimating) {
            if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
                e.preventDefault();
                this._skipAnimation();
            }
            return;
        }
        if (this.options.length === 0) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                // Skip section headers and disabled items
                while (this.selectedIndex > 0 && this.options[this.selectedIndex]?._sectionHeader) {
                    this.selectedIndex--;
                }
                this.render();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1);
                // Skip section headers and disabled items
                while (this.selectedIndex < this.options.length - 1 && this.options[this.selectedIndex]?._sectionHeader) {
                    this.selectedIndex++;
                }
                this.render();
                break;
            case 'Enter':
                e.preventDefault();
                this.selectOption();
                break;
            case 'Escape':
                e.preventDefault();
                // Only pop if there's a screen to go back to (prevents blank screen at root)
                if (this.screenStack.length > 0) {
                    this.popScreen();
                }
                break;
            default:
                // Number keys 1-9 for quick select
                const num = parseInt(e.key);
                if (num >= 1 && num <= this.options.length) {
                    this.selectedIndex = num - 1;
                    this.selectOption();
                }
                break;
        }
    }

    selectOption() {
        const opt = this.options[this.selectedIndex];
        if (opt && !opt.disabled && opt.action) {
            opt.action();
        }
    }

    // ── Helpers ──

    escapeHtml(input) {
        const str = String(input ?? '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ── Typewriter Effect ──
    // Reveals text character by character. Returns a skip function.
    typewriterReveal(element, text, speed = 30) {
        let i = 0;
        element.textContent = '';
        const cursor = document.createElement('span');
        cursor.className = 't-cursor';
        cursor.textContent = '▌';
        element.appendChild(cursor);

        const interval = setInterval(() => {
            element.insertBefore(document.createTextNode(text[i]), cursor);
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                cursor.classList.add('t-cursor-blink');
            }
        }, speed);

        // Return skip function
        return () => {
            clearInterval(interval);
            element.textContent = text;
        };
    }
}
