/**
 * MobileLayout.jsx — Mobile-specific views for Gmail UI
 *
 * Renders separately from desktop layout, shown only on narrow viewports via CSS.
 * Contains: mobile search bar, mobile inbox rows, mobile thread view,
 * mobile reply bar, and mobile bottom nav.
 */

import React from 'react';
import { getAvatarColor } from './inboxData.js';

export default function MobileLayout({
    // State
    view, activeNav, searchQuery, setSearchQuery,
    visibleEmails, selectedEmail, categoryBadges,
    replyMode, replyText, setReplyText, setReplyMode,
    // Refs
    replyBoxRef, threadEndRef,
    // Actions
    openThread, toggleStar, backToInbox, archiveEmail, deleteEmail,
    startReply, triggerAiReply, sendReply,
    setActiveNav,
}) {
    const totalUnread = Object.values(categoryBadges).reduce((a, b) => a + b, 0);

    return (
        <>
            {/* ═══ Mobile Search Bar ═══ */}
            {view === 'inbox' && (
                <div className="gmail-mobile-searchbar gmail-mobile-only">
                    <span>☰</span>
                    <input
                        type="text"
                        placeholder="Search in email"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="gmail-mobile-searchbar-avatar">S</div>
                </div>
            )}

            {/* ═══ Mobile Inbox ═══ */}
            {view === 'inbox' && (
                <div className="gmail-mobile-inbox gmail-mobile-only">
                    {visibleEmails.length === 0 && (
                        <div className="gmail-mobile-empty">
                            {searchQuery ? `No results for "${searchQuery}"` : 'No conversations'}
                        </div>
                    )}
                    {visibleEmails.map((email) => (
                        <div
                            key={email.id}
                            className="gmail-mobile-email-row"
                            onClick={() => email.thread ? openThread(email) : null}
                        >
                            <div
                                className="gmail-mobile-email-avatar"
                                style={{ background: getAvatarColor(email.sender) }}
                            >
                                {email.sender.charAt(0)}
                            </div>
                            <div className="gmail-mobile-email-body">
                                <div className="gmail-mobile-email-top">
                                    <span className={`gmail-mobile-email-sender${!email.unread ? ' gmail-mobile-email-sender--read' : ''}`}>
                                        {email.sender}
                                    </span>
                                    <span className="gmail-mobile-email-time">{email.time}</span>
                                </div>
                                <div className="gmail-mobile-email-subject">{email.subject}</div>
                                <div className="gmail-mobile-email-preview">{email.preview}</div>
                            </div>
                            <button
                                className={`gmail-mobile-email-star${email.starred ? ' gmail-mobile-email-star--active' : ''}`}
                                onClick={(e) => toggleStar(email.id, e)}
                            >
                                {email.starred ? '★' : '☆'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ Mobile Thread ═══ */}
            {view === 'thread' && selectedEmail && (
                <div className="gmail-mobile-thread gmail-mobile-only">
                    <div className="gmail-mobile-thread-header">
                        <button className="gmail-mobile-thread-back" onClick={backToInbox}>←</button>
                        <div style={{ flex: 1 }} />
                        <div className="gmail-mobile-thread-icons">
                            <button className="gmail-mobile-thread-icon" onClick={() => archiveEmail(selectedEmail.id)}>📥</button>
                            <button className="gmail-mobile-thread-icon" onClick={() => deleteEmail(selectedEmail.id)}>🗑️</button>
                            <button className="gmail-mobile-thread-icon">✉️</button>
                            <button className="gmail-mobile-thread-icon">⋮</button>
                        </div>
                    </div>

                    <div className="gmail-mobile-thread-title">
                        <div className="gmail-mobile-thread-subject">{selectedEmail.subject}</div>
                        <span className="gmail-mobile-thread-badge">Inbox</span>
                    </div>

                    {selectedEmail.thread.map((msg) => (
                        <div key={msg.id} className="gmail-mobile-message">
                            <div className="gmail-mobile-message-header">
                                <div
                                    className="gmail-mobile-message-avatar"
                                    style={{ background: getAvatarColor(msg.sender) }}
                                >
                                    {msg.sender.charAt(0)}
                                </div>
                                <div className="gmail-mobile-message-meta">
                                    <div className="gmail-mobile-message-sender">{msg.sender}</div>
                                    <div className="gmail-mobile-message-to">to {msg.to}</div>
                                </div>
                                <span className="gmail-mobile-message-time">
                                    {msg.time.split(',').pop()?.trim()}
                                </span>
                            </div>
                            <div
                                className="gmail-mobile-message-body"
                                dangerouslySetInnerHTML={{ __html: msg.body.replace(/\n/g, '<br>') }}
                            />
                            {msg.signature && (
                                <div className="gmail-mobile-message-sig">{msg.signature}</div>
                            )}

                            {/* Per-message attachment cards (mobile) */}
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="gmail-attachments-grid" style={{ marginLeft: 0, marginRight: 0 }}>
                                    {msg.attachments.map(att => (
                                        <div key={att.id} className={`gmail-attachment-card gmail-attachment-card--${att.type}`}>
                                            <div className="gmail-attachment-card-icon">
                                                {att.type === 'pdf' ? '📄' : att.type === 'image' ? '🖼️' : '📎'}
                                            </div>
                                            <div className="gmail-attachment-card-info">
                                                <div className="gmail-attachment-card-name">{att.name}</div>
                                                <div className="gmail-attachment-card-size">{att.size}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Mobile Smart Replies */}
                    {!replyMode && selectedEmail.smartReplies?.length > 0 && (
                        <div className="gmail-mobile-smart-replies gmail-mobile-only">
                            {selectedEmail.smartReplies.map((reply) => (
                                <button
                                    key={reply}
                                    className="gmail-smart-reply gmail-smart-reply--mobile"
                                    onClick={() => triggerAiReply(reply)}
                                >
                                    ✨ {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Mobile Inline Reply */}
                    {replyMode && (
                        <div className="gmail-mobile-reply-compose">
                            <textarea
                                ref={replyBoxRef}
                                className="gmail-inline-reply-editor"
                                placeholder="Write your reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply();
                                }}
                                rows={4}
                            />
                            <div className="gmail-mobile-reply-actions">
                                <button className="gmail-send-btn" onClick={sendReply} disabled={!replyText.trim()}>
                                    <span className="gmail-send-btn-main">Send</span>
                                </button>
                                <button className="gmail-compose-toolbar-icon" title="Attach">📎</button>
                                <button className="gmail-compose-delete" onClick={() => setReplyMode(null)}>🗑️</button>
                            </div>
                        </div>
                    )}

                    <div ref={threadEndRef} />
                </div>
            )}

            {/* ═══ Mobile Reply/Forward Bar ═══ */}
            {view === 'thread' && selectedEmail && !replyMode && (
                <div className="gmail-mobile-reply-bar">
                    <button
                        className="gmail-mobile-reply-btn gmail-mobile-reply-btn--forward"
                        onClick={() => startReply('forward')}
                    >
                        ↪ Forward
                    </button>
                    <button
                        className="gmail-mobile-reply-btn gmail-mobile-reply-btn--reply"
                        onClick={() => startReply('reply')}
                    >
                        ↩ Reply
                    </button>
                </div>
            )}

            {/* ═══ Mobile Bottom Nav ═══ */}
            <div className="gmail-mobile-bottomnav">
                <button
                    className={`gmail-mobile-nav-item${activeNav === 'inbox' ? ' gmail-mobile-nav-item--active' : ''}`}
                    onClick={() => { setActiveNav('inbox'); backToInbox(); }}
                >
                    <span className="gmail-mobile-nav-icon">✉️</span>
                    {totalUnread > 0 && (
                        <span className="gmail-mobile-nav-badge">{totalUnread}</span>
                    )}
                    Mail
                </button>
                <button
                    className="gmail-mobile-nav-item"
                    onClick={() => setActiveNav('all')}
                >
                    <span className="gmail-mobile-nav-icon">🎥</span>
                    Meet
                </button>
            </div>
        </>
    );
}
