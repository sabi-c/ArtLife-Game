import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { CHARACTERS, DRIP_OPTIONS, VICE_OPTIONS } from '../data/characters.js';
import { GameState } from '../managers/GameState.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

// ─── Stat definitions — S.P.E.C.I.A.L. for snobs ────────────────────────────
// intel is earned in-game, not chosen at creation — excluded from the builder.
const STAT_DEFS = [
    { key: 'reputation', label: 'HYPE',     short: 'HYP', desc: 'Industry attention — your buys raise artist values', color: 0x8888ff },
    { key: 'taste',      label: 'TASTE',    short: 'TST', desc: 'Curatorial eye — spot undervalued work, unlock expert talk', color: 0xffaa44 },
    { key: 'audacity',   label: 'AUDACITY', short: 'AUD', desc: 'Shamelessness — boosts haggle odds and aggressive dialogue', color: 0xee6644 },
    { key: 'access',     label: 'ACCESS',   short: 'ACC', desc: 'Network reach — bypasses quality gates and backrooms', color: 0x44bbff },
];

// Bonus points awarded per archetype difficulty (harder = more room to customise)
const BONUS_PTS = { EASY: 15, MEDIUM: 20, HARD: 25 };

// How far below base a stat can be reduced
const MAX_REDUCTION = 15;
const STAT_FLOOR   = 0;
const STAT_CEILING = 95;

/**
 * CharacterSelectScene — three-phase character creator.
 *
 * Phase 1 — ARCHETYPE : card selection (←/→ + SPACE)
 * Phase 2 — STATS     : point-buy builder (↑↓ select row, ←/→ adjust)
 * Phase 3 — NAME      : keyboard text entry (ENTER confirm, ESC back)
 *
 * Navigation: ESC always goes back one phase. No phase is skippable.
 *
 * Veteran notes:
 * – Each phase creates its own Phaser Container and destroys the previous
 *   one; no stale game-objects accumulate.
 * – Input for phases 1 + 2 uses JustDown in update() (reliable in Phaser).
 * – Input for phase 3 uses raw keyboard events with preventDefault() to
 *   block browser side-effects (back-nav, page scroll, form submit).
 * – The CHARACTERS array is never mutated; we shallow-copy on init.
 */
export class CharacterSelectScene extends BaseScene {
    constructor() {
        super('CharacterSelectScene');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    create(data) {
        super.create(data);
        this.W = this.scale.width;
        this.H = this.scale.height;

        this.cameras.main.setBackgroundColor('#12121e');
        this.cameras.main.fadeIn(350, 18, 18, 28);

        // ── Shared keyboard keys (JustDown approach) ──────────────────────────
        const KC = Phaser.Input.Keyboard.KeyCodes;
        this._k = {
            left:  this.input.keyboard.addKey(KC.LEFT),
            right: this.input.keyboard.addKey(KC.RIGHT),
            up:    this.input.keyboard.addKey(KC.UP),
            down:  this.input.keyboard.addKey(KC.DOWN),
            space: this.input.keyboard.addKey(KC.SPACE),
            enter: this.input.keyboard.addKey(KC.ENTER),
            esc:   this.input.keyboard.addKey(KC.ESC),
        };

        // ── Shared state ──────────────────────────────────────────────────────
        this._phase      = null;
        this._phaseCont  = null; // current phase container (destroyed on transition)
        this._archIdx    = 0;   // selected archetype index
        this._char       = null; // committed archetype

        // Stat-builder state (populated in _enterStats)
        this._statVals   = {};
        this._baseVals   = {};
        this._bonusPts   = 0;
        this._selRow     = 0;
        this._remaining  = 0;   // cached remaining points

        // Trait-selection state (Phase 3)
        this._traitIdx      = 0;
        this._selectedTrait = null;
        this._traitCardRefs = [];

        // Drip-selection state (Phase 4)
        this._dripIdx       = 0;
        this._selectedDrip  = null;
        this._dripCardRefs  = [];

        // Vice-selection state (Phase 5 — optional)
        this._viceIdx       = 0;
        this._selectedVice  = null;
        this._viceCardRefs  = [];

        // Name-entry state
        this._enteredName = '';
        this._nameKeyHandler = null;

        this._enterArchetype();
    }

    update() {
        if (this._phase === 'archetype') this._tickArchetype();
        if (this._phase === 'stats')     this._tickStats();
        if (this._phase === 'traits')    this._tickTraits();
        if (this._phase === 'drip')      this._tickDrip();
        if (this._phase === 'vice')      this._tickVice();
        // 'name' phase is event-driven, no update() tick needed
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 1 — ARCHETYPE
    // ─────────────────────────────────────────────────────────────────────────

    _enterArchetype() {
        this._destroyPhase();
        this._phase = 'archetype';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;

        // ── Header ────────────────────────────────────────────────────────────
        c.add(this.add.text(W / 2, 34, 'APPLICANT PROFILE', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#e8e4df',
        }).setOrigin(0.5));

        c.add(this.add.text(W / 2, 56, 'SECTION 1 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        // ── Cards ────────────────────────────────────────────────────────────
        this._archPortraits = [];
        const cardW = 136, cardH = 240;
        const gap   = 158;
        const ox    = W / 2 - gap * 1.5;
        const oy    = H * 0.44;

        CHARACTERS.forEach((char, i) => {
            const x   = ox + i * gap;
            const cont = this.add.container(x, oy);
            c.add(cont);

            const bg = this.add.rectangle(0, 0, cardW, cardH, 0x14142a)
                .setStrokeStyle(2, 0x222233);
            cont.add(bg);

            // Icon
            cont.add(this.add.text(0, -cardH / 2 + 28, char.icon, { fontSize: '40px' }).setOrigin(0.5));

            // Name
            const nameObj = this.add.text(0, -cardH / 2 + 66, char.name, {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#e8e4df',
                align: 'center', wordWrap: { width: cardW - 16 },
            }).setOrigin(0.5).setLineSpacing(5);
            cont.add(nameObj);

            // Divider
            const dv = this.add.graphics();
            dv.fillStyle(0x252538, 1);
            dv.fillRect(-58, -cardH / 2 + 86, 116, 1);
            cont.add(dv);

            // Cash
            cont.add(this.add.text(0, -cardH / 2 + 100, `$${char.startingCash.toLocaleString()}`, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffd700',
            }).setOrigin(0.5));

            // Perk label
            cont.add(this.add.text(0, -cardH / 2 + 118, `"${char.perk}"`, {
                fontFamily: 'Courier', fontSize: '10px', color: '#555566', align: 'center',
            }).setOrigin(0.5));

            // Bonus points
            const bp = BONUS_PTS[char.difficulty] ?? 20;
            cont.add(this.add.text(0, -cardH / 2 + 136, `+${bp} build points`, {
                fontFamily: 'Courier', fontSize: '10px', color: '#447755',
            }).setOrigin(0.5));

            // Mini stat preview — two rows (HYP/TST then AUD/ACC)
            const stats = char.startingStats ?? {};
            const row1 = STAT_DEFS.slice(0, 2).map(s => `${s.short}:${stats[s.key]??0}`).join('  ');
            const row2 = STAT_DEFS.slice(2).map(s => `${s.short}:${stats[s.key]??0}`).join('  ');
            cont.add(this.add.text(0, -cardH / 2 + 150, row1, {
                fontFamily: 'Courier', fontSize: '8px', color: '#333355',
            }).setOrigin(0.5));
            cont.add(this.add.text(0, -cardH / 2 + 162, row2, {
                fontFamily: 'Courier', fontSize: '8px', color: '#333355',
            }).setOrigin(0.5));

            // Difficulty pill
            const dc  = char.difficultyColor ?? '#888888';
            const dhx = parseInt(dc.replace('#', ''), 16);
            const pill = this.add.graphics();
            pill.lineStyle(1, dhx, 0.9);
            pill.strokeRect(-30, cardH / 2 - 32, 60, 17);
            cont.add(pill);
            cont.add(this.add.text(0, cardH / 2 - 23, char.difficulty ?? '—', {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: dc,
            }).setOrigin(0.5));

            this._archPortraits.push({ cont, bg, nameObj });
        });

        // ── Description panel ────────────────────────────────────────────────
        const panW = Math.min(W * 0.8, 660);
        c.add(this.add.rectangle(W / 2, H * 0.84, panW, 100, 0x09090f, 0.8)
            .setStrokeStyle(1, 0x222233));

        this._archTitle = this.add.text(W / 2, H * 0.84 - 32, '', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffd700',
        }).setOrigin(0.5);
        c.add(this._archTitle);

        this._archDesc = this.add.text(W / 2, H * 0.84 - 12, '', {
            fontFamily: 'Courier', fontSize: '12px', color: '#888899',
            align: 'center', wordWrap: { width: panW - 40 },
        }).setOrigin(0.5, 0);
        c.add(this._archDesc);

        // ── Instructions ─────────────────────────────────────────────────────
        c.add(this.add.text(W / 2, H - 18, '← → select   SPACE confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333355',
        }).setOrigin(0.5));

        this._refreshArchetype();
    }

    _refreshArchetype() {
        this._archPortraits.forEach((p, i) => {
            const sel = i === this._archIdx;
            p.cont.setScale(sel ? 1.07 : 1.0);
            p.cont.setAlpha(sel ? 1.0 : 0.45);
            p.bg.setStrokeStyle(2, sel ? 0xffd700 : 0x1a1a2e);
            p.bg.fillColor = sel ? 0x1c1c38 : 0x101020;
            p.nameObj.setColor(sel ? '#ffd700' : '#555566');
        });
        const ch = CHARACTERS[this._archIdx];
        this._archTitle.setText(ch.tagline);
        this._archDesc.setText(ch.description);
    }

    _tickArchetype() {
        const jd = k => Phaser.Input.Keyboard.JustDown(this._k[k]);
        if (jd('left')) {
            this._archIdx = Phaser.Math.Wrap(this._archIdx - 1, 0, CHARACTERS.length);
            this._refreshArchetype();
        } else if (jd('right')) {
            this._archIdx = Phaser.Math.Wrap(this._archIdx + 1, 0, CHARACTERS.length);
            this._refreshArchetype();
        }
        if (jd('space') || jd('enter')) {
            this._char = CHARACTERS[this._archIdx];
            this._enterStats();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 2 — STAT BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    _enterStats() {
        this._destroyPhase();
        this._phase = 'stats';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;

        const char = this._char;
        const base = char.startingStats ?? { reputation: 50, taste: 50, access: 50, intel: 0 };

        // Initialise stat state
        this._baseVals = { ...base };
        this._statVals = { ...base };
        this._bonusPts = BONUS_PTS[char.difficulty] ?? 20;
        this._selRow   = 0;
        this._statRowRefs = [];

        // ── Header ───────────────────────────────────────────────────────────
        c.add(this.add.text(W / 2, 28, 'RISK ASSESSMENT', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#e8e4df',
        }).setOrigin(0.5));

        c.add(this.add.text(W / 2, 50, 'SECTION 2 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        // Archetype reminder
        c.add(this.add.text(W / 2, 70, `${char.icon}  ${char.name}`, {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#555577',
        }).setOrigin(0.5));

        // ── Points counter ────────────────────────────────────────────────────
        this._ptsLabel = this.add.text(W / 2, 96, '', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#44cc44',
        }).setOrigin(0.5);
        c.add(this._ptsLabel);

        // Sub-label explaining the system
        c.add(this.add.text(W / 2, 114, 'allocate freely — reduce a stat to free up points', {
            fontFamily: 'Courier', fontSize: '10px', color: '#2a2a44',
        }).setOrigin(0.5));

        // ── Stat rows ─────────────────────────────────────────────────────────
        const rowH   = 58;
        const rowY0  = 148;
        const barW   = 180;
        const barH   = 9;
        const barOX  = W / 2 - barW / 2 + 10; // bar left edge X

        STAT_DEFS.forEach((def, i) => {
            const ry = rowY0 + i * rowH;

            // Row highlight bg
            const hlBg = this.add.rectangle(W / 2, ry + 12, W * 0.74, rowH - 6, 0x16163a, 0)
                .setStrokeStyle(0, 0);
            c.add(hlBg);

            // Label (left-anchored)
            const label = this.add.text(W / 2 - 210, ry, def.label, {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#444455',
            }).setOrigin(0, 0.5);
            c.add(label);

            // Stat description (faint, below label, shown only when selected)
            const descTxt = this.add.text(W / 2 - 210, ry + 18, def.desc, {
                fontFamily: 'Courier', fontSize: '9px', color: '#2a2a44',
            }).setOrigin(0, 0.5).setAlpha(0);
            c.add(descTxt);

            // [◄] / [►] arrows
            const arL = this.add.text(barOX - 22, ry, '◄', {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#333355',
            }).setOrigin(0.5);
            c.add(arL);

            const arR = this.add.text(barOX + barW + 22, ry, '►', {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#333355',
            }).setOrigin(0.5);
            c.add(arR);

            // Bar track
            const track = this.add.graphics();
            track.fillStyle(0x0a0a18, 1);
            track.fillRect(barOX, ry - barH / 2, barW, barH);
            c.add(track);

            // Bar fill (dynamic)
            const fillGfx = this.add.graphics();
            c.add(fillGfx);

            // Base marker (thin vertical line — shows original archetype value)
            const baseGfx = this.add.graphics();
            c.add(baseGfx);

            // Value label (right of bar)
            const valTxt = this.add.text(barOX + barW + 44, ry, '', {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#aaaacc',
            }).setOrigin(0.5);
            c.add(valTxt);

            this._statRowRefs.push({ hlBg, label, descTxt, arL, arR, fillGfx, baseGfx, valTxt, def, barOX, barW, barH, ry });
        });

        // ── Instructions / hints ──────────────────────────────────────────────
        c.add(this.add.text(16, H - 18, 'ESC — back', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(0, 1));

        c.add(this.add.text(W - 16, H - 18, 'R — reset to base', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(1, 1));

        c.add(this.add.text(W / 2, H - 18, '↑↓ select row   ←→ adjust   SPACE confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333355',
        }).setOrigin(0.5, 1));

        // Reset key
        this._k.r = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        this._refreshStats();
    }

    _refreshStats() {
        // ── Remaining points (net delta from base) ────────────────────────────
        let netDelta = 0;
        STAT_DEFS.forEach(s => {
            netDelta += (this._statVals[s.key] ?? 0) - (this._baseVals[s.key] ?? 0);
        });
        this._remaining = this._bonusPts - netDelta;

        // Points label colour
        const rem = this._remaining;
        const ptColor = rem > Math.round(this._bonusPts * 0.4) ? '#44cc44'
                      : rem > 0                                 ? '#ffaa00'
                      : rem === 0                               ? '#cc8833'
                      :                                           '#cc3333'; // overspent (shouldn't happen)
        this._ptsLabel.setText(`${rem} POINTS REMAINING`).setColor(ptColor);

        // ── Update each stat row ──────────────────────────────────────────────
        this._statRowRefs.forEach((row, i) => {
            const { hlBg, label, descTxt, arL, arR, fillGfx, baseGfx, valTxt,
                    def, barOX, barW, barH, ry } = row;
            const val  = this._statVals[def.key] ?? 0;
            const base = this._baseVals[def.key] ?? 0;
            const sel  = i === this._selRow;
            const col  = def.color;

            // Row highlight
            hlBg.setAlpha(sel ? 1 : 0);
            hlBg.setStrokeStyle(sel ? 1 : 0, 0x3a3a66, sel ? 1 : 0);
            label.setColor(sel ? '#ccccee' : '#444455');
            descTxt.setAlpha(sel ? 0.8 : 0);
            arL.setColor(sel ? '#7788cc' : '#222233');
            arR.setColor(sel ? '#7788cc' : '#222233');

            // Bar fill — two segments: base portion (dim) + bonus (bright)
            fillGfx.clear();
            const pxPerPt = barW / STAT_CEILING;

            if (val > 0) {
                const baseFill = Math.min(val, base);
                // Base portion (dim)
                if (baseFill > 0) {
                    fillGfx.fillStyle(col, 0.4);
                    fillGfx.fillRect(barOX, ry - barH / 2, Math.round(baseFill * pxPerPt), barH);
                }
                // Bonus portion (bright) — shows points added above base
                if (val > base) {
                    fillGfx.fillStyle(col, 1.0);
                    fillGfx.fillRect(
                        barOX + Math.round(base * pxPerPt), ry - barH / 2,
                        Math.round((val - base) * pxPerPt), barH
                    );
                }
                // Deficit portion (dark-red) — shows stat reduced below base
                if (val < base) {
                    fillGfx.fillStyle(0x882222, 0.6);
                    fillGfx.fillRect(
                        barOX + Math.round(val * pxPerPt), ry - barH / 2,
                        Math.round((base - val) * pxPerPt), barH
                    );
                }
            }

            // Base marker (white hairline at original archetype value)
            baseGfx.clear();
            if (base > 0) {
                baseGfx.lineStyle(1, 0x6666aa, 0.9);
                const bx = barOX + Math.round(base * pxPerPt);
                baseGfx.lineBetween(bx, ry - barH / 2 - 5, bx, ry + barH / 2 + 5);
            }

            // Value label — show delta
            const delta = val - base;
            const dStr  = delta > 0 ? ` +${delta}` : delta < 0 ? ` ${delta}` : '';
            valTxt.setText(`${val}${dStr}`);
            valTxt.setColor(delta > 0 ? '#88ee88' : delta < 0 ? '#ee8888' : '#888899');
        });
    }

    _tickStats() {
        const jd = k => Phaser.Input.Keyboard.JustDown(this._k[k]);

        // Back to archetype
        if (jd('esc')) { this._enterArchetype(); return; }

        // Reset all stats to base
        if (this._k.r && jd('r')) {
            STAT_DEFS.forEach(s => { this._statVals[s.key] = this._baseVals[s.key] ?? 0; });
            this._refreshStats();
            return;
        }

        // Row navigation
        if (jd('up')) {
            this._selRow = Phaser.Math.Wrap(this._selRow - 1, 0, STAT_DEFS.length);
            this._refreshStats();
        } else if (jd('down')) {
            this._selRow = Phaser.Math.Wrap(this._selRow + 1, 0, STAT_DEFS.length);
            this._refreshStats();
        }

        // Stat adjustment
        if (jd('left'))  this._adjustStat(-1);
        if (jd('right')) this._adjustStat(+1);

        // Advance to trait selection
        if (jd('space') || jd('enter')) this._enterTraits();
    }

    _adjustStat(delta) {
        const def  = STAT_DEFS[this._selRow];
        const curr = this._statVals[def.key] ?? 0;
        const base = this._baseVals[def.key] ?? 0;
        const next = curr + delta;

        if (delta > 0) {
            if (this._remaining <= 0)    return; // no points left
            if (next > STAT_CEILING)     return; // hard cap
        } else {
            if (next < STAT_FLOOR)       return; // can't go negative
            if (next < base - MAX_REDUCTION) return; // can't reduce too far below base
        }

        this._statVals[def.key] = next;
        this._refreshStats();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 3 — TRAIT SELECTION
    // ─────────────────────────────────────────────────────────────────────────

    _enterTraits() {
        this._destroyPhase();
        this._phase = 'traits';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;
        const cx = W / 2;

        const char = this._char;
        const traits = char.traits ?? [];

        // ── Header ───────────────────────────────────────────────────────────
        c.add(this.add.text(cx, 28, 'COMPETITIVE ADVANTAGE', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffd700',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 50, 'SECTION 3 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 68, `${char.icon}  ${char.name}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#444466',
        }).setOrigin(0.5));

        // ── 2 × 2 Trait cards ─────────────────────────────────────────────
        this._traitCardRefs = [];
        const cardW = 192, cardH = 112;
        const hGap = 206; // center-to-center horizontal
        const topY  = H * 0.37;

        traits.forEach((trait, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const tx  = cx + (col === 0 ? -hGap / 2 : hGap / 2);
            const ty  = topY + row * 128;

            const cont = this.add.container(tx, ty);
            c.add(cont);

            const bg = this.add.rectangle(0, 0, cardW, cardH, 0x0d0d1e)
                .setStrokeStyle(1, 0x222244);
            cont.add(bg);

            // Icon
            cont.add(this.add.text(0, -34, trait.icon, { fontSize: '28px' }).setOrigin(0.5));

            // Label
            const lbl = this.add.text(0, -2, trait.label, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555566',
                align: 'center', wordWrap: { width: cardW - 16 },
            }).setOrigin(0.5);
            cont.add(lbl);

            // Short desc (truncated to fit)
            const shortDesc = trait.desc.length > 54 ? trait.desc.substring(0, 52) + '…' : trait.desc;
            const descTxt = this.add.text(0, 24, shortDesc, {
                fontFamily: 'Courier', fontSize: '8px', color: '#2a2a44',
                align: 'center', wordWrap: { width: cardW - 20 },
            }).setOrigin(0.5);
            cont.add(descTxt);

            this._traitCardRefs.push({ cont, bg, lbl, descTxt });
        });

        // ── Full description panel ────────────────────────────────────────
        const panW = Math.min(W * 0.76, 590);
        c.add(this.add.rectangle(cx, H * 0.82, panW, 72, 0x07070f, 0.95)
            .setStrokeStyle(1, 0x2a2a44));

        this._traitDescFull = this.add.text(cx, H * 0.82, '', {
            fontFamily: 'Courier', fontSize: '11px', color: '#8888aa',
            align: 'center', wordWrap: { width: panW - 40 },
        }).setOrigin(0.5);
        c.add(this._traitDescFull);

        // ── Instructions ─────────────────────────────────────────────────
        c.add(this.add.text(16, H - 18, 'ESC — back to stats', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(0, 1));

        c.add(this.add.text(cx, H - 18, '← → ↑ ↓ navigate   SPACE confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333355',
        }).setOrigin(0.5, 1));

        this._refreshTraits();
    }

    _refreshTraits() {
        const traits = this._char?.traits ?? [];
        this._traitCardRefs.forEach((ref, i) => {
            const sel = i === this._traitIdx;
            ref.cont.setScale(sel ? 1.07 : 1.0);
            ref.cont.setAlpha(sel ? 1.0 : 0.45);
            ref.bg.setStrokeStyle(sel ? 2 : 1, sel ? 0xffd700 : 0x1a1a38);
            ref.bg.fillColor = sel ? 0x1c1c38 : 0x0d0d1e;
            ref.lbl.setColor(sel ? '#ffd700' : '#444455');
            ref.descTxt.setColor(sel ? '#6677aa' : '#2a2a44');
        });
        const t = traits[this._traitIdx];
        if (t && this._traitDescFull) this._traitDescFull.setText(t.desc);
    }

    _tickTraits() {
        const traits = this._char?.traits ?? [];
        if (!traits.length) return;

        // Capture all JustDown states first (each fires only once per frame)
        const jd = k => Phaser.Input.Keyboard.JustDown(this._k[k]);
        const wEsc = jd('esc'), wL = jd('left'), wR = jd('right'),
              wU = jd('up'),   wD = jd('down'), wSp = jd('space'), wEn = jd('enter');

        if (wEsc) { this._enterStats(); return; }

        const cols = 2;
        const rows = Math.ceil(traits.length / cols);
        let col = this._traitIdx % cols;
        let row = Math.floor(this._traitIdx / cols);

        if (wL) col = Phaser.Math.Wrap(col - 1, 0, cols);
        else if (wR) col = Phaser.Math.Wrap(col + 1, 0, cols);
        if (wU) row = Phaser.Math.Wrap(row - 1, 0, rows);
        else if (wD) row = Phaser.Math.Wrap(row + 1, 0, rows);

        const nextIdx = Math.min(row * cols + col, traits.length - 1);
        if (nextIdx !== this._traitIdx) {
            this._traitIdx = nextIdx;
            this._refreshTraits();
        }

        if (wSp || wEn) {
            this._selectedTrait = traits[this._traitIdx] ?? null;
            this._enterDrip();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 4 — DRIP / AESTHETIC
    // ─────────────────────────────────────────────────────────────────────────

    _enterDrip() {
        this._destroyPhase();
        this._phase = 'drip';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;
        const cx = W / 2;

        // ── Header ───────────────────────────────────────────────────────────
        c.add(this.add.text(cx, 28, 'PRESENTATION PROFILE', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#aa88ff',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 50, 'SECTION 4 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 68, 'Your aesthetic sends a message before you open your mouth.', {
            fontFamily: 'Courier', fontSize: '10px', color: '#2a2a44',
        }).setOrigin(0.5));

        // ── 2 × 2 Drip cards ─────────────────────────────────────────────────
        this._dripCardRefs = [];
        const cardW = 192, cardH = 120;
        const hGap  = 206;
        const topY  = H * 0.38;

        DRIP_OPTIONS.forEach((drip, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const tx  = cx + (col === 0 ? -hGap / 2 : hGap / 2);
            const ty  = topY + row * 136;

            const cont = this.add.container(tx, ty);
            c.add(cont);

            const bg = this.add.rectangle(0, 0, cardW, cardH, 0x0d0d1e)
                .setStrokeStyle(1, 0x222244);
            cont.add(bg);

            cont.add(this.add.text(0, -34, drip.icon, { fontSize: '28px' }).setOrigin(0.5));

            const lbl = this.add.text(0, -4, drip.label, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555566',
                align: 'center', wordWrap: { width: cardW - 16 },
            }).setOrigin(0.5);
            cont.add(lbl);

            const flavorTxt = this.add.text(0, 22, drip.flavor, {
                fontFamily: 'Courier', fontSize: '8px', color: '#2a2a3a',
                align: 'center', wordWrap: { width: cardW - 20 },
            }).setOrigin(0.5);
            cont.add(flavorTxt);

            this._dripCardRefs.push({ cont, bg, lbl, flavorTxt });
        });

        // ── Full description panel ────────────────────────────────────────────
        const panW = Math.min(W * 0.76, 590);
        c.add(this.add.rectangle(cx, H * 0.83, panW, 72, 0x07070f, 0.95)
            .setStrokeStyle(1, 0x2a2a44));

        this._dripDescFull = this.add.text(cx, H * 0.83, '', {
            fontFamily: 'Courier', fontSize: '11px', color: '#8888aa',
            align: 'center', wordWrap: { width: panW - 40 },
        }).setOrigin(0.5);
        c.add(this._dripDescFull);

        // ── Instructions ──────────────────────────────────────────────────────
        c.add(this.add.text(16, H - 18, 'ESC — back', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(0, 1));

        c.add(this.add.text(cx, H - 18, '← → ↑ ↓ navigate   SPACE confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333355',
        }).setOrigin(0.5, 1));

        this._refreshDrip();
    }

    _refreshDrip() {
        this._dripCardRefs.forEach((ref, i) => {
            const sel = i === this._dripIdx;
            ref.cont.setScale(sel ? 1.07 : 1.0);
            ref.cont.setAlpha(sel ? 1.0 : 0.45);
            ref.bg.setStrokeStyle(sel ? 2 : 1, sel ? 0xaa88ff : 0x1a1a38);
            ref.bg.fillColor = sel ? 0x18183a : 0x0d0d1e;
            ref.lbl.setColor(sel ? '#aa88ff' : '#444455');
            ref.flavorTxt.setColor(sel ? '#5566aa' : '#2a2a3a');
        });
        const d = DRIP_OPTIONS[this._dripIdx];
        if (d && this._dripDescFull) this._dripDescFull.setText(d.desc);
    }

    _tickDrip() {
        const jd = k => Phaser.Input.Keyboard.JustDown(this._k[k]);
        const wEsc = jd('esc'), wL = jd('left'), wR = jd('right'),
              wU = jd('up'), wD = jd('down'), wSp = jd('space'), wEn = jd('enter');

        if (wEsc) { this._enterTraits(); return; }

        const cols = 2;
        const rows = Math.ceil(DRIP_OPTIONS.length / cols);
        let col = this._dripIdx % cols;
        let row = Math.floor(this._dripIdx / cols);

        if (wL) col = Phaser.Math.Wrap(col - 1, 0, cols);
        else if (wR) col = Phaser.Math.Wrap(col + 1, 0, cols);
        if (wU) row = Phaser.Math.Wrap(row - 1, 0, rows);
        else if (wD) row = Phaser.Math.Wrap(row + 1, 0, rows);

        const nextIdx = Math.min(row * cols + col, DRIP_OPTIONS.length - 1);
        if (nextIdx !== this._dripIdx) {
            this._dripIdx = nextIdx;
            this._refreshDrip();
        }

        if (wSp || wEn) {
            this._selectedDrip = DRIP_OPTIONS[this._dripIdx] ?? null;
            this._enterVice();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 5 — VICE / FLAW (optional)
    // ─────────────────────────────────────────────────────────────────────────

    _enterVice() {
        this._destroyPhase();
        this._phase = 'vice';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;
        const cx = W / 2;

        // Build all-options array: 3 vices + clean slate
        const VICE_ALL = [
            ...VICE_OPTIONS,
            { id: 'none', icon: '✨', label: 'CLEAN SLATE',
              desc: 'No vice. No edge. No curse. Boring — and proud of it.',
              buff: 'No passive curses.', curse: 'No passive buffs either.' },
        ];

        // ── Header ───────────────────────────────────────────────────────────
        c.add(this.add.text(cx, 28, 'COMPLIANCE DISCLOSURE', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ee6644',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 50, 'SECTION 5 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 68, 'Any liabilities we should know about?', {
            fontFamily: 'Courier', fontSize: '10px', color: '#2a2a44',
        }).setOrigin(0.5));

        // ── 2 × 2 Vice cards ─────────────────────────────────────────────────
        this._viceCardRefs = [];
        const cardW = 192, cardH = 112;
        const hGap  = 206;
        const topY  = H * 0.36;

        VICE_ALL.forEach((vice, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const tx  = cx + (col === 0 ? -hGap / 2 : hGap / 2);
            const ty  = topY + row * 128;

            const cont = this.add.container(tx, ty);
            c.add(cont);

            const isNone = vice.id === 'none';
            const bg = this.add.rectangle(0, 0, cardW, cardH, 0x0d0d1e)
                .setStrokeStyle(1, isNone ? 0x225522 : 0x222244);
            cont.add(bg);

            cont.add(this.add.text(0, -34, vice.icon, { fontSize: '26px' }).setOrigin(0.5));

            const lbl = this.add.text(0, -4, vice.label, {
                fontFamily: '"Press Start 2P"', fontSize: '7px',
                color: isNone ? '#225522' : '#555566',
                align: 'center', wordWrap: { width: cardW - 16 },
            }).setOrigin(0.5);
            cont.add(lbl);

            if (vice.buff) {
                const buffTxt = this.add.text(0, 18, `+ ${vice.buff}`, {
                    fontFamily: 'Courier', fontSize: '7px', color: '#336633',
                    align: 'center', wordWrap: { width: cardW - 20 },
                }).setOrigin(0.5);
                cont.add(buffTxt);
            }

            this._viceCardRefs.push({ cont, bg, lbl, vice });
        });

        // ── Full description panel ────────────────────────────────────────────
        const panW = Math.min(W * 0.76, 590);
        c.add(this.add.rectangle(cx, H * 0.84, panW, 72, 0x07070f, 0.95)
            .setStrokeStyle(1, 0x2a2a44));

        this._viceDescFull = this.add.text(cx, H * 0.84, '', {
            fontFamily: 'Courier', fontSize: '11px', color: '#8888aa',
            align: 'center', wordWrap: { width: panW - 40 },
        }).setOrigin(0.5);
        c.add(this._viceDescFull);

        // ── Instructions ──────────────────────────────────────────────────────
        c.add(this.add.text(16, H - 18, 'ESC — back', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(0, 1));

        c.add(this.add.text(cx, H - 18, '← → ↑ ↓ navigate   SPACE confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#333355',
        }).setOrigin(0.5, 1));

        this._viceAll = VICE_ALL;
        this._refreshVice();
    }

    _refreshVice() {
        const VICE_ALL = this._viceAll ?? [];
        this._viceCardRefs.forEach((ref, i) => {
            const sel = i === this._viceIdx;
            const isNone = ref.vice?.id === 'none';
            ref.cont.setScale(sel ? 1.07 : 1.0);
            ref.cont.setAlpha(sel ? 1.0 : 0.45);
            const selColor = isNone ? 0x44bb44 : 0xee6644;
            ref.bg.setStrokeStyle(sel ? 2 : 1, sel ? selColor : (isNone ? 0x225522 : 0x1a1a38));
            ref.bg.fillColor = sel ? (isNone ? 0x0d1a0d : 0x1e100a) : 0x0d0d1e;
            const lblColor = sel ? (isNone ? '#44bb44' : '#ee6644') : (isNone ? '#225522' : '#444455');
            ref.lbl.setColor(lblColor);
        });
        const v = VICE_ALL[this._viceIdx];
        if (v && this._viceDescFull) {
            const curseText = v.curse ? `\nCurse: ${v.curse}` : '';
            this._viceDescFull.setText(v.desc + curseText);
        }
    }

    _tickVice() {
        const VICE_ALL = this._viceAll ?? [];
        if (!VICE_ALL.length) return;

        const jd = k => Phaser.Input.Keyboard.JustDown(this._k[k]);
        const wEsc = jd('esc'), wL = jd('left'), wR = jd('right'),
              wU = jd('up'), wD = jd('down'), wSp = jd('space'), wEn = jd('enter');

        if (wEsc) { this._enterDrip(); return; }

        const cols = 2;
        const rows = Math.ceil(VICE_ALL.length / cols);
        let col = this._viceIdx % cols;
        let row = Math.floor(this._viceIdx / cols);

        if (wL) col = Phaser.Math.Wrap(col - 1, 0, cols);
        else if (wR) col = Phaser.Math.Wrap(col + 1, 0, cols);
        if (wU) row = Phaser.Math.Wrap(row - 1, 0, rows);
        else if (wD) row = Phaser.Math.Wrap(row + 1, 0, rows);

        const nextIdx = Math.min(row * cols + col, VICE_ALL.length - 1);
        if (nextIdx !== this._viceIdx) {
            this._viceIdx = nextIdx;
            this._refreshVice();
        }

        if (wSp || wEn) {
            const picked = VICE_ALL[this._viceIdx] ?? null;
            this._selectedVice = picked;
            this._enterName();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PHASE 6 — NAME ENTRY
    // ─────────────────────────────────────────────────────────────────────────

    _enterName() {
        this._destroyPhase();
        this._phase = 'name';
        const c = this._phaseCont = this.add.container(0, 0);
        const { W, H } = this;
        const cx = W / 2;

        const char = this._char;
        this._enteredName = '';

        // ── Header ───────────────────────────────────────────────────────────
        c.add(this.add.text(cx, 30, 'IDENTITY VERIFICATION', {
            fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ffd700',
        }).setOrigin(0.5));

        c.add(this.add.text(cx, 52, 'SECTION 6 OF 6', {
            fontFamily: 'Courier', fontSize: '11px', color: '#333355',
        }).setOrigin(0.5));

        // Archetype reminder
        c.add(this.add.text(cx, 72, `${char.icon}  ${char.name}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#444466',
        }).setOrigin(0.5));

        // ── Final stat summary card ───────────────────────────────────────────
        const sumY = 112;
        c.add(this.add.rectangle(cx, sumY, 460, 56, 0x0c0c1a, 1)
            .setStrokeStyle(1, 0x222244));

        // Cash line
        c.add(this.add.text(cx, sumY - 16, `Starting cash: $${char.startingCash.toLocaleString()}`, {
            fontFamily: 'Courier', fontSize: '11px', color: '#ffd70099',
        }).setOrigin(0.5));

        // Stat summary row
        const statSummary = STAT_DEFS.map(s => {
            const val  = this._statVals[s.key] ?? 0;
            const base = this._baseVals[s.key] ?? 0;
            const d    = val - base;
            const mark = d > 0 ? `↑${d}` : d < 0 ? `↓${Math.abs(d)}` : '';
            return `${s.short} ${val}${mark}`;
        }).join('  ');

        c.add(this.add.text(cx, sumY + 6, statSummary, {
            fontFamily: 'Courier', fontSize: '10px', color: '#444466',
        }).setOrigin(0.5));

        // ── Input field ───────────────────────────────────────────────────────
        const iy = H / 2 + 20;
        c.add(this.add.rectangle(cx, iy, 400, 52, 0x080816, 1)
            .setStrokeStyle(1, 0x5555aa));

        this._nameText = this.add.text(cx, iy, '', {
            fontFamily: '"Press Start 2P"', fontSize: '15px', color: '#e8e4df',
        }).setOrigin(0.5);
        c.add(this._nameText);

        this._cursorGlyph = this.add.text(cx, iy, '|', {
            fontFamily: '"Press Start 2P"', fontSize: '15px', color: '#ffd700',
        }).setOrigin(0, 0.5);
        c.add(this._cursorGlyph);

        this._cursorTimer = this.time.addEvent({
            delay: 480, loop: true,
            callback: () => this._cursorGlyph.setAlpha(this._cursorGlyph.alpha > 0.5 ? 0 : 1),
        });

        // Confirm hint (appears when name length > 0)
        this._confirmHintText = this.add.text(cx, iy + 44, 'ENTER to begin', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#44aa44',
        }).setOrigin(0.5).setAlpha(0);
        c.add(this._confirmHintText);

        // Back / delete hints
        c.add(this.add.text(cx, iy + 62, 'BACKSPACE — delete   ESC — back', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#2a2a44',
        }).setOrigin(0.5));

        // 18-char max label
        c.add(this.add.text(cx, iy + 78, '18 characters max', {
            fontFamily: 'Courier', fontSize: '10px', color: '#222233',
        }).setOrigin(0.5));

        this._updateNameDisplay();

        // ── Raw keyboard handler ──────────────────────────────────────────────
        this._nameKeyHandler = (e) => {
            if (this._phase !== 'name') return;

            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    if (this._enteredName.trim().length > 0) this._finishCreation();
                    return;

                case 'Backspace':
                    e.preventDefault(); // block browser back-navigation
                    this._enteredName = this._enteredName.slice(0, -1);
                    this._updateNameDisplay();
                    return;

                case 'Escape':
                    e.preventDefault();
                    this._cancelName();
                    return;

                default:
                    break;
            }

            // Printable chars only, max 18, alphanumeric + punctuation
            if (
                e.key.length === 1 &&
                this._enteredName.length < 18 &&
                /[a-zA-Z0-9 '\-.&]/.test(e.key)
            ) {
                e.preventDefault(); // prevent space from scrolling
                // Auto-capitalise first character
                const ch = this._enteredName.length === 0 ? e.key.toUpperCase() : e.key;
                this._enteredName += ch;
                this._updateNameDisplay();
            }
        };

        this.input.keyboard.on('keydown', this._nameKeyHandler);
    }

    _updateNameDisplay() {
        if (!this._nameText) return;
        this._nameText.setText(this._enteredName);
        // Cursor sits immediately after text
        this._cursorGlyph.setX(this.W / 2 + this._nameText.width / 2 + 4);
        this._confirmHintText?.setAlpha(this._enteredName.trim().length > 0 ? 1 : 0);
    }

    _cancelName() {
        this._cleanupNameEntry();
        this._enterVice();
    }

    _finishCreation() {
        this._cleanupNameEntry();
        this._phase = 'done';

        // Build final character — shallow copy so CHARACTERS is never mutated
        const finalChar = {
            ...this._char,
            playerName:    this._enteredName.trim() || 'The Dealer',
            startingStats: { ...this._statVals },
            selectedTrait: this._selectedTrait ?? null,
            selectedDrip:  this._selectedDrip  ?? null,
            selectedVice:  (this._selectedVice?.id !== 'none') ? (this._selectedVice ?? null) : null,
        };

        // "APPLICATION APPROVED" → "WELCOME TO ARTLIFE" → dashboard
        const { W, H } = this;
        const cx = W / 2;

        const approvedText = this.add.text(cx, H / 2, 'APPLICATION APPROVED', {
            fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#c9a84c',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0).setDepth(20);

        const welcomeText = this.add.text(cx, H / 2, 'WELCOME TO ARTLIFE', {
            fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0).setDepth(20);

        // Phase 1: "APPLICATION APPROVED" in gold for 0.8s
        this.tweens.add({
            targets: approvedText, alpha: 1, duration: 200,
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    approvedText.setAlpha(0);
                    // Phase 2: "WELCOME TO ARTLIFE" in white for 0.6s
                    this.tweens.add({
                        targets: welcomeText, alpha: 1, duration: 150,
                        onComplete: () => {
                            this.time.delayedCall(600, () => {
                                this.cameras.main.flash(500, 255, 255, 255);
                                this.time.delayedCall(500, () => {
                                    GameState.init(finalChar);
                                    GameState.autoSave();
                                    this.showTerminalUI();
                                    import('../terminal/screens/index.js').then(({ dashboardScreen }) => {
                                        if (this.ui) this.ui.pushScreen(dashboardScreen(this.ui));
                                        this.sys.game.canvas.style.display = 'none';
                                        // Tell React to switch to TERMINAL view
                                        GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                                        this.scene.stop();
                                    });
                                });
                            });
                        }
                    });
                });
            }
        });
    }

    _cleanupNameEntry() {
        if (this._nameKeyHandler) {
            this.input.keyboard.off('keydown', this._nameKeyHandler);
            this._nameKeyHandler = null;
        }
        if (this._cursorTimer) {
            this._cursorTimer.remove();
            this._cursorTimer = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TEST / API SHORTCUT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * confirmSelection([charIndex]) — test/API shortcut.
     * Skips all remaining phases and launches the dashboard directly.
     * Restores the old single-call contract expected by test_flow.cjs.
     */
    confirmSelection(charIndex) {
        if (this._phase === 'done') return;
        const idx = typeof charIndex === 'number' ? charIndex : this._archIdx;
        this._char = this._char ?? CHARACTERS[idx];
        if (!this._statVals || !Object.keys(this._statVals).length) {
            this._statVals = { ...(this._char.startingStats ?? {}) };
            this._baseVals = { ...(this._char.startingStats ?? {}) };
        }
        this._selectedTrait = this._selectedTrait ?? (this._char.traits?.[0] ?? null);
        this._selectedDrip  = this._selectedDrip  ?? (DRIP_OPTIONS[0] ?? null);
        this._selectedVice  = this._selectedVice  ?? null;
        this._enteredName = this._enteredName || 'The Dealer';
        this._finishCreation();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    _destroyPhase() {
        // Clean up name entry listeners before destroying the container
        this._cleanupNameEntry();
        if (this._phaseCont) {
            this._phaseCont.destroy(true);
            this._phaseCont = null;
        }
        // Remove reset key if it was added for stats phase
        if (this._k.r) {
            this.input.keyboard.removeKey(this._k.r);
            this._k.r = null;
        }
    }
}
