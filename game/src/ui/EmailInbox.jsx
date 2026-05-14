/**
 * EmailInbox.jsx — Diegetic email inbox view.
 *
 * Rendered after DocumentaryScene finishes. The "file terminates and an email arrives."
 * One unread email: ArtNet membership invitation. Clicking the email opens an in-place
 * read pane.
 *
 * The next routing step (clicking the ArtNet invite link inside the email body) is
 * intentionally held per Seb's "hold off on ArtNet login" instruction — the link is
 * visually present but disabled / hover-only. Wire the click handler when ArtNet entry
 * is approved.
 *
 * Visual register: pixel-OS frame, late-1990s enterprise mail client, monospace, gold
 * + navy + ivory palette per Art_Style_Guide.md. Never pure white.
 */

import React, { useState, useEffect } from 'react';
import { VIEW } from '../core/views.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

// Hook to track viewport breakpoints. Re-renders the component when window width crosses 768.
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
    bg: '#0a0d18',
    chrome: '#141826',
    panel: '#1a1f30',
    panelBorder: '#33384a',
    gold: '#c9a84c',
    ivory: '#e8e4df',
    ivoryDim: '#888aa0',
    accentBurgundy: '#8b2252',
    accentTeal: '#2a6b6b',
    unread: '#c9a84c',
    readGray: '#555a6e',
};

const FONT_MONO = '"IBM Plex Mono", "SF Mono", Courier, monospace';
const FONT_SERIF = '"Playfair Display", Georgia, serif';

const SEED_EMAILS = [
    {
        id: 'artnet-invite',
        from: 'invites@artnet.global',
        fromDisplay: 'ArtNet Global Member Services',
        subject: 'You have been invited to join ArtNet.',
        preview: 'A trusted member has flagged your profile for early access. Membership review enclosed.',
        body: [
            'To the recipient,',
            '',
            'A trusted member of ArtNet has flagged your profile for early access.',
            '',
            'ArtNet is a private platform for art-market professionals. Membership grants access to ' +
            'private sale records, dealer reputational data, the live auction feed, the underwriter ' +
            'directory, and the marketplace.',
            '',
            'Your invitation expires in 72 hours.',
            '',
            'Click the secure link below to authenticate and complete your member profile.',
            '',
            '  [ Sign in to ArtNet → ]',
            '',
            'Regards,',
            'ArtNet Global Member Services',
            'Reference: ANV-INV-2026-' + Math.floor(Math.random() * 9000 + 1000),
        ],
        unread: true,
        timestamp: 'Today, 2:47 AM',
        linkAction: 'artnet_login',   // intentionally not wired in Sprint 2 — Seb held
    },
    {
        id: 'system-welcome',
        from: 'no-reply@webmail.local',
        fromDisplay: 'Webmail Service',
        subject: 'Welcome to your inbox.',
        preview: 'Your account is active. This message is sent automatically and requires no response.',
        body: [
            'Your inbox is now active.',
            '',
            'You will receive periodic updates from ArtNet and other connected platforms here.',
            '',
            'No further action is required.',
        ],
        unread: false,
        timestamp: 'Yesterday, 11:18 PM',
        linkAction: null,
    },
];

export default function EmailInbox() {
    const [emails, setEmails] = useState(SEED_EMAILS);
    const [openId, setOpenId] = useState(null);
    const [hoverId, setHoverId] = useState(null);
    const isMobile = useIsMobile();

    // Subtle terminal-blip on entry
    useEffect(() => {
        document.title = 'Inbox (1) — Webmail';
    }, []);

    const openEmail = (id) => {
        setOpenId(id);
        setEmails(prev => prev.map(e => e.id === id ? { ...e, unread: false } : e));
    };

    const openEmailObj = emails.find(e => e.id === openId);

    // On mobile, when no email is open: show list only (sidebar hidden).
    // When an email is open: show the read pane only with a back button.
    // Desktop: three-pane side-by-side as before.
    const mobileBackButton = isMobile && openEmailObj ? (
        <button
            onClick={() => setOpenId(null)}
            style={{
                padding: '8px 12px',
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: PALETTE.gold,
                background: 'transparent',
                border: `1px solid ${PALETTE.gold}`,
                marginBottom: 14,
                cursor: 'pointer',
                letterSpacing: '0.08em',
            }}
        >← INBOX</button>
    ) : null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: PALETTE.bg,
            color: PALETTE.ivory,
            fontFamily: FONT_MONO,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* ── Browser-chrome bar ── */}
            <div style={{
                background: PALETTE.chrome,
                borderBottom: `1px solid ${PALETTE.panelBorder}`,
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                fontSize: 11,
                letterSpacing: '0.05em',
                color: PALETTE.ivoryDim,
            }}>
                <span style={{ color: PALETTE.gold, fontWeight: 700 }}>WEBMAIL</span>
                <span>·</span>
                <span>inbox</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: PALETTE.readGray }}>
                    webmail.local/inbox
                </span>
            </div>

            {/* ── Responsive layout: 3-pane on desktop, single-pane stack on mobile ── */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Sidebar: folders — hidden on mobile when an email is open */}
                {(!isMobile) && (
                    <div style={{
                        width: 180,
                        background: PALETTE.panel,
                        borderRight: `1px solid ${PALETTE.panelBorder}`,
                        padding: '20px 0',
                        fontSize: 11,
                        flexShrink: 0,
                    }}>
                        <div style={{ padding: '6px 18px', color: PALETTE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>FOLDERS</div>
                        <div style={folderItem(true)}>📥  Inbox <span style={{ marginLeft: 6, color: PALETTE.unread }}>{emails.filter(e => e.unread).length}</span></div>
                        <div style={folderItem(false)}>📤  Sent</div>
                        <div style={folderItem(false)}>📝  Drafts</div>
                        <div style={folderItem(false)}>🗑️  Trash</div>
                        <div style={{ height: 20 }} />
                        <div style={{ padding: '6px 18px', color: PALETTE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>FILTERS</div>
                        <div style={folderItem(false)}>★  Starred</div>
                        <div style={folderItem(false)}>🏢  Galleries</div>
                        <div style={folderItem(false)}>💸  Sales</div>
                    </div>
                )}

                {/* Email list — full width on mobile when no email open; hidden on mobile when email open */}
                {(!isMobile || !openEmailObj) && (
                <div style={{
                    width: isMobile ? '100%' : 360,
                    flexShrink: 0,
                    borderRight: isMobile ? 'none' : `1px solid ${PALETTE.panelBorder}`,
                    overflowY: 'auto',
                }}>
                    <div style={{
                        padding: '10px 16px',
                        borderBottom: `1px solid ${PALETTE.panelBorder}`,
                        fontSize: 10,
                        color: PALETTE.ivoryDim,
                        letterSpacing: '0.1em',
                    }}>
                        {emails.length} MESSAGES · {emails.filter(e => e.unread).length} UNREAD
                    </div>
                    {emails.map(email => (
                        <div
                            key={email.id}
                            onClick={() => openEmail(email.id)}
                            onMouseEnter={() => setHoverId(email.id)}
                            onMouseLeave={() => setHoverId(null)}
                            style={{
                                padding: '14px 16px',
                                borderBottom: `1px solid ${PALETTE.panelBorder}`,
                                cursor: 'pointer',
                                background: openId === email.id
                                    ? '#252a40'
                                    : hoverId === email.id
                                        ? '#1d2235'
                                        : 'transparent',
                                borderLeft: openId === email.id ? `3px solid ${PALETTE.gold}` : '3px solid transparent',
                            }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                fontSize: 11, fontWeight: email.unread ? 700 : 400,
                                color: email.unread ? PALETTE.ivory : PALETTE.readGray,
                            }}>
                                <span>{email.fromDisplay}</span>
                                <span style={{ fontSize: 9, color: PALETTE.readGray }}>{email.timestamp}</span>
                            </div>
                            <div style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: email.unread ? PALETTE.ivory : PALETTE.readGray,
                                fontWeight: email.unread ? 600 : 400,
                            }}>
                                {email.unread && <span style={{ color: PALETTE.unread, marginRight: 6 }}>●</span>}
                                {email.subject}
                            </div>
                            <div style={{
                                marginTop: 4, fontSize: 10, color: PALETTE.ivoryDim,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}>
                                {email.preview}
                            </div>
                        </div>
                    ))}
                </div>
                )}

                {/* Read pane — full width on mobile when an email is open; hidden on mobile when none open */}
                {(!isMobile || openEmailObj) && (
                <div style={{
                    flex: 1, padding: isMobile ? '16px 18px' : '24px 32px',
                    overflowY: 'auto',
                    background: PALETTE.bg,
                    minWidth: 0,
                }}>
                    {mobileBackButton}
                    {!openEmailObj && (
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            height: '100%', color: PALETTE.readGray, gap: 12,
                        }}>
                            <div style={{ fontSize: 36, opacity: 0.4 }}>📧</div>
                            <div style={{ fontSize: 12, letterSpacing: '0.1em' }}>Select a message.</div>
                            <div style={{ fontSize: 10, color: PALETTE.readGray, marginTop: 8 }}>
                                The file has terminated. You have one new message.
                            </div>
                        </div>
                    )}

                    {openEmailObj && (
                        <div>
                            <div style={{
                                fontFamily: FONT_SERIF,
                                fontSize: 20, color: PALETTE.ivory,
                                marginBottom: 14,
                                letterSpacing: '0.01em',
                            }}>
                                {openEmailObj.subject}
                            </div>
                            <div style={{
                                fontSize: 11, color: PALETTE.ivoryDim,
                                marginBottom: 4,
                            }}>
                                From: <span style={{ color: PALETTE.ivory }}>{openEmailObj.fromDisplay}</span>
                                <span style={{ color: PALETTE.readGray, marginLeft: 6 }}>&lt;{openEmailObj.from}&gt;</span>
                            </div>
                            <div style={{
                                fontSize: 11, color: PALETTE.ivoryDim,
                                marginBottom: 18,
                            }}>
                                Received: <span style={{ color: PALETTE.ivory }}>{openEmailObj.timestamp}</span>
                            </div>
                            <div style={{
                                borderTop: `1px solid ${PALETTE.panelBorder}`,
                                paddingTop: 18,
                                fontSize: 13, lineHeight: 1.65,
                                color: PALETTE.ivory,
                            }}>
                                {openEmailObj.body.map((line, i) => {
                                    if (line.trim() === '[ Sign in to ArtNet → ]') {
                                        // The invite link. Wiring deferred per Seb until ArtNet entry approved.
                                        // For Sprint 2 the link is visually present and clickable, but routes
                                        // to a "held" placeholder. When approved, replace handler with
                                        // GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.BOOT).
                                        return (
                                            <a
                                                key={i}
                                                href="#artnet-signin"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    // ── Sprint 2 placeholder ──
                                                    // Replace next line with: GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.BOOT);
                                                    GameEventBus.emit(GameEvents.UI_NOTIFICATION,
                                                        'ArtNet entry held — wire when approved (EmailInbox.jsx).');
                                                }}
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: 8, marginBottom: 8,
                                                    padding: '10px 18px',
                                                    fontFamily: FONT_MONO,
                                                    fontSize: 12, fontWeight: 700,
                                                    color: PALETTE.gold,
                                                    background: 'transparent',
                                                    border: `1px solid ${PALETTE.gold}`,
                                                    letterSpacing: '0.08em',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                [ SIGN IN TO ARTNET → ]
                                            </a>
                                        );
                                    }
                                    return (
                                        <div key={i} style={{ minHeight: '1em', whiteSpace: 'pre-wrap' }}>{line}</div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* ── Status bar ── */}
            <div style={{
                background: PALETTE.chrome,
                borderTop: `1px solid ${PALETTE.panelBorder}`,
                padding: '6px 16px',
                fontSize: 10,
                color: PALETTE.ivoryDim,
                display: 'flex', justifyContent: 'space-between',
            }}>
                <span>Connected · webmail.local</span>
                <span style={{ color: PALETTE.readGray }}>
                    Press <kbd style={kbdStyle}>F1</kbd> for help · <kbd style={kbdStyle}>~</kbd> for admin
                </span>
            </div>
        </div>
    );
}

function folderItem(active) {
    return {
        padding: '8px 18px',
        fontSize: 11,
        color: active ? PALETTE.ivory : PALETTE.ivoryDim,
        background: active ? '#252a40' : 'transparent',
        borderLeft: active ? `3px solid ${PALETTE.gold}` : '3px solid transparent',
        cursor: 'default',
    };
}

const kbdStyle = {
    background: PALETTE.panel,
    border: `1px solid ${PALETTE.panelBorder}`,
    borderRadius: 2,
    padding: '1px 4px',
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: PALETTE.ivory,
};
