/**
 * SocialBattleOverlay.jsx — Gallery social-battle UI.
 *
 * Renders the 4-button move panel and the conversation read-out. Drives one move at a time;
 * each move resolves via SocialBattle.resolveMove and updates the on-screen result.
 *
 * Props:
 *   npc       — { name, spriteKey, profile, mood, relationship } — the NPC being engaged
 *   stats     — player stats { charm, wit, information, ... }
 *   onResult  — (resolution) => void   fired after each move
 *   onClose   — () => void             fired when player exits
 *
 * Integration sketch (NewWorldScene side):
 *   When player is within 2 tiles of an NPC AND faces them AND presses Space, emit:
 *     GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, OVERLAY.SOCIAL_BATTLE, { npc, ...ctx });
 *   OverlayRouter renders <SocialBattleOverlay /> with the supplied npc context.
 *   Closing the overlay returns control to NewWorldScene.
 *
 * Sprint 4 status: UI + resolver in place. NewWorldScene proximity-trigger wiring is the
 * next concrete code step — see 06_Cleanup_Roadmap.md § Sprint 4.
 */

import React, { useState, useEffect, useRef } from 'react';
import { MOVES, NPC_PROFILES, resolveMove, profileForSpriteKey } from '../managers/SocialBattle.js';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return isMobile;
}

const PALETTE = {
    bg: 'rgba(8, 10, 18, 0.92)',
    panel: '#13161f',
    panelBorder: '#33384a',
    gold: '#c9a84c',
    ivory: '#e8e4df',
    ivoryDim: '#888aa0',
    burgundy: '#8b2252',
    teal: '#2a6b6b',
    success: '#4a9e6a',
    warn: '#c9a84c',
    bad: '#c94040',
};
const FONT_MONO = '"IBM Plex Mono", "SF Mono", Courier, monospace';
const FONT_SERIF = '"Playfair Display", Georgia, serif';

const DEFAULT_NPC = {
    name: 'A Collector',
    spriteKey: 'npc_collector',
    profile: profileForSpriteKey('npc_collector'),
    mood: 0.5,
    relationship: 0,
};

const DEFAULT_STATS = {
    charm: 5, wit: 5, information: 5, taste: 5, capital: 5, reputation: 5,
};

export default function SocialBattleOverlay({
    npc = DEFAULT_NPC,
    stats = DEFAULT_STATS,
    onResult,
    onClose,
}) {
    const [log, setLog] = useState([{
        role: 'system',
        text: `You step into ${npc.name}'s orbit.`,
    }]);
    const [moodState, setMoodState] = useState(npc.mood ?? 0.5);
    const [relationshipState, setRelationshipState] = useState(npc.relationship ?? 0);
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [log]);

    const handleMove = (moveKey) => {
        if (busy) return;
        setBusy(true);
        const move = MOVES[moveKey];
        const profile = npc.profile?.landings ? npc.profile : NPC_PROFILES[npc.profile] || NPC_PROFILES.vain;

        const resolution = resolveMove({
            moveKey,
            npcProfile: profile,
            playerStats: stats,
            npcMood: moodState,
        });

        // Append player move + NPC response
        setLog(prev => [
            ...prev,
            { role: 'player', text: move.verb + '.' },
            { role: 'npc', text: resolution.line, outcome: resolution.outcome },
        ]);
        // Mood drifts slightly toward outcome
        setMoodState(prev => clamp01(prev + (resolution.outcome === 'clean' ? 0.08 : resolution.outcome === 'mixed' ? 0 : -0.10)));
        setRelationshipState(prev => Math.max(-10, Math.min(10, prev + resolution.relationshipDelta)));
        onResult?.(resolution);
        setTimeout(() => setBusy(false), 350);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: PALETTE.bg,
            color: PALETTE.ivory,
            fontFamily: FONT_MONO,
            display: 'flex', flexDirection: 'column',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
        }}>
            {/* ── Header — NPC card (stacks on mobile) ── */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '12px 14px' : '16px 28px',
                borderBottom: `1px solid ${PALETTE.panelBorder}`,
                gap: isMobile ? 10 : 18,
                alignItems: isMobile ? 'stretch' : 'center',
                background: 'rgba(0,0,0,0.45)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flex: 1,
                }}>
                    <div style={{
                        width: isMobile ? 44 : 64, height: isMobile ? 44 : 64,
                        background: PALETTE.panel,
                        border: `1px solid ${PALETTE.panelBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isMobile ? 20 : 26, color: PALETTE.gold,
                        flexShrink: 0,
                    }}>👤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontFamily: FONT_SERIF,
                            fontSize: isMobile ? 17 : 22,
                            color: PALETTE.ivory,
                            whiteSpace: isMobile ? 'nowrap' : 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>{npc.name}</div>
                        <div style={{ fontSize: 11, color: PALETTE.ivoryDim, marginTop: 4, letterSpacing: '0.05em' }}>
                            {(npc.profile?.label || npc.profile || 'Unknown').toUpperCase()}
                            {npc.profile?.description ? ` · ${npc.profile.description}` : ''}
                        </div>
                    </div>
                    {isMobile && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '6px 10px', fontSize: 10, fontFamily: FONT_MONO,
                                background: 'transparent', color: PALETTE.ivoryDim,
                                border: `1px solid ${PALETTE.panelBorder}`, cursor: 'pointer',
                                letterSpacing: '0.08em', flexShrink: 0,
                            }}
                        >EXIT</button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: isMobile ? 12 : 18, alignItems: 'center' }}>
                    <MeterColumn label="MOOD" value={moodState} max={1} positive />
                    <MeterColumn label="RAPPORT" value={(relationshipState + 10) / 20} max={1} positive />
                    {!isMobile && (
                        <button
                            onClick={onClose}
                            style={{
                                marginLeft: 12,
                                padding: '8px 14px', fontSize: 11, fontFamily: FONT_MONO,
                                background: 'transparent', color: PALETTE.ivoryDim,
                                border: `1px solid ${PALETTE.panelBorder}`, cursor: 'pointer',
                                letterSpacing: '0.08em',
                            }}
                        >[ EXIT ]</button>
                    )}
                </div>
            </div>

            {/* ── Body — conversation log + move panel (stacks on mobile) ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                minHeight: 0,
            }}>
                {/* Conversation log */}
                <div
                    ref={scrollRef}
                    style={{
                        flex: 1,
                        padding: isMobile ? '14px 16px' : '24px 32px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.25)',
                        minHeight: isMobile ? 120 : 'auto',
                        maxHeight: isMobile ? '35vh' : 'none',
                    }}>
                    {log.map((entry, i) => (
                        <LogLine key={i} entry={entry} />
                    ))}
                </div>

                {/* Move panel — 4 buttons */}
                <div style={{
                    width: isMobile ? '100%' : 280,
                    borderLeft: isMobile ? 'none' : `1px solid ${PALETTE.panelBorder}`,
                    borderTop: isMobile ? `1px solid ${PALETTE.panelBorder}` : 'none',
                    padding: isMobile ? 14 : 20,
                    display: 'flex', flexDirection: 'column', gap: 10,
                    background: PALETTE.panel,
                    overflowY: 'auto',
                }}>
                    <div style={{
                        fontSize: 10, color: PALETTE.gold,
                        letterSpacing: '0.15em',
                        marginBottom: 4,
                    }}>CHOOSE A MOVE</div>
                    <MoveButton moveKey="deep"    stats={stats} onPick={handleMove} disabled={busy} accent={PALETTE.teal} />
                    <MoveButton moveKey="quick"   stats={stats} onPick={handleMove} disabled={busy} accent={PALETTE.gold} />
                    <MoveButton moveKey="flirt"   stats={stats} onPick={handleMove} disabled={busy} accent={PALETTE.burgundy} />
                    <MoveButton moveKey="inquire" stats={stats} onPick={handleMove} disabled={busy} accent={PALETTE.ivoryDim} />

                    <div style={{
                        marginTop: 'auto',
                        paddingTop: 14,
                        borderTop: `1px solid ${PALETTE.panelBorder}`,
                        fontSize: 10, color: PALETTE.ivoryDim, lineHeight: 1.5,
                    }}>
                        Stat checks fire against the NPC's profile. Clean lands earn XP, awkward bites your rapport.
                    </div>
                </div>
            </div>
        </div>
    );
}

function MoveButton({ moveKey, stats, onPick, disabled, accent }) {
    const move = MOVES[moveKey];
    const statValue = stats?.[move.stat] ?? 5;
    return (
        <button
            onClick={() => onPick(moveKey)}
            disabled={disabled}
            style={{
                textAlign: 'left',
                padding: '12px 14px',
                background: 'transparent',
                color: PALETTE.ivory,
                border: `1px solid ${accent}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: '0.05em',
                transition: 'transform 60ms',
            }}
            onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            <div style={{ fontSize: 14, fontWeight: 700, color: accent, letterSpacing: '0.1em' }}>
                [ {move.label.toUpperCase()} ]
            </div>
            <div style={{ marginTop: 4, color: PALETTE.ivoryDim, fontSize: 10 }}>
                {move.verb}.
            </div>
            <div style={{ marginTop: 6, color: PALETTE.ivory, fontSize: 10 }}>
                {move.stat.toUpperCase()}: <span style={{ color: accent }}>{statValue}</span> / 10
            </div>
        </button>
    );
}

function MeterColumn({ label, value, max, positive }) {
    const pct = Math.max(0, Math.min(1, value / max));
    return (
        <div style={{ width: 100, textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: PALETTE.ivoryDim, letterSpacing: '0.15em' }}>{label}</div>
            <div style={{ marginTop: 4, height: 6, background: '#0a0a0f', border: `1px solid ${PALETTE.panelBorder}` }}>
                <div style={{
                    width: `${pct * 100}%`,
                    height: '100%',
                    background: positive ? PALETTE.gold : PALETTE.burgundy,
                    transition: 'width 240ms ease-out',
                }} />
            </div>
        </div>
    );
}

function LogLine({ entry }) {
    if (entry.role === 'system') {
        return (
            <div style={{
                fontStyle: 'italic',
                fontSize: 12,
                color: PALETTE.ivoryDim,
                marginBottom: 10,
            }}>{entry.text}</div>
        );
    }
    if (entry.role === 'player') {
        return (
            <div style={{
                fontSize: 13, color: PALETTE.gold,
                marginBottom: 6,
            }}>
                <span style={{ color: PALETTE.ivoryDim, marginRight: 8 }}>You:</span>{entry.text}
            </div>
        );
    }
    // npc
    const outcomeColor = entry.outcome === 'clean' ? PALETTE.success
        : entry.outcome === 'awkward' ? PALETTE.bad
        : PALETTE.warn;
    return (
        <div style={{
            fontSize: 14,
            fontFamily: FONT_SERIF,
            color: PALETTE.ivory,
            marginBottom: 14,
            paddingLeft: 12,
            borderLeft: `2px solid ${outcomeColor}`,
        }}>
            {entry.text}
            <div style={{
                fontSize: 9,
                color: outcomeColor,
                marginTop: 4,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: FONT_MONO,
            }}>
                {entry.outcome} landing
            </div>
        </div>
    );
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
