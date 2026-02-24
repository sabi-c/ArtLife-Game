/**
 * ThreadView.jsx — Thread view with companion panel, messages, attachments, inline reply
 */

import React from 'react';
import { AI_COMPANION_NAME, getAvatarColor, getAttachmentIcon } from './inboxData.js';

export default function ThreadView({
    selectedEmail, emails,
    // Actions
    backToInbox, archiveEmail, deleteEmail, toggleRead,
    startReply, triggerAiReply,
    // Companion
    companionState, companionText, companionThinkMsg,
    // Reply
    replyMode, replyText, setReplyText, replyBoxRef,
    aiState, sendReply, setReplyMode,
    // Sending
    sendingState, sendProgress,
    // Attachments
    openAttachment,
    // Refs
    threadEndRef,
}) {
    return (
        <div className="gmail-thread">
            {/* Thread Header */}
            <div className="gmail-thread-header">
                <button className="gmail-thread-back" onClick={backToInbox} title="Back to inbox">←</button>
                <div className="gmail-thread-subject">{selectedEmail.subject}</div>
                <span className="gmail-thread-label">Inbox</span>
                <div className="gmail-thread-actions">
                    <button className="gmail-action-icon" title="Archive" onClick={() => archiveEmail(selectedEmail.id)}>📥</button>
                    <button className="gmail-action-icon" title="Delete" onClick={() => deleteEmail(selectedEmail.id)}>🗑️</button>
                    <button className="gmail-action-icon" title="Mark unread" onClick={() => { toggleRead(selectedEmail.id); backToInbox(); }}>✉️</button>
                    <button className="gmail-action-icon" title="Print">🖨️</button>
                </div>
            </div>

            {/* ═══ AI Companion Panel ═══ */}
            {companionState !== 'idle' && (
                <div className={`gmail-companion${companionState === 'ready' ? ' gmail-companion--ready' : ''}`}>
                    <div className="gmail-companion-header">
                        <span className="gmail-companion-avatar">🤖</span>
                        <span className="gmail-companion-name">{AI_COMPANION_NAME}</span>
                        <span className="gmail-companion-badge">AI Advisor</span>
                        {companionState === 'reading' && (
                            <span className="gmail-companion-status gmail-companion-status--reading">
                                {companionThinkMsg}<span className="gmail-dots-anim">...</span>
                            </span>
                        )}
                        {companionState === 'analyzing' && (
                            <span className="gmail-companion-status gmail-companion-status--typing">Analyzing</span>
                        )}
                        {companionState === 'ready' && (
                            <span className="gmail-companion-status gmail-companion-status--ready">✓ Ready</span>
                        )}
                    </div>
                    {(companionState === 'analyzing' || companionState === 'ready') && (
                        <div className="gmail-companion-body">
                            <div className="gmail-companion-text">
                                {companionText}
                                {companionState === 'analyzing' && <span className="gmail-companion-cursor">|</span>}
                            </div>
                            {companionState === 'ready' && selectedEmail?.smartReplies?.length > 0 && (
                                <div className="gmail-companion-actions">
                                    <span className="gmail-companion-actions-label">Suggested responses:</span>
                                    <div className="gmail-companion-chips">
                                        {selectedEmail.smartReplies.map(reply => (
                                            <button key={reply} className="gmail-companion-chip" onClick={() => triggerAiReply(reply)}>
                                                ✨ {reply}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Messages */}
            {selectedEmail.thread.map((msg) => (
                <div key={msg.id} className="gmail-message">
                    <div
                        className="gmail-message-avatar"
                        style={{ background: getAvatarColor(msg.sender) }}
                    >
                        {msg.sender.charAt(0)}
                    </div>
                    <div className="gmail-message-header">
                        <span className="gmail-message-sender">{msg.sender}</span>
                        <span className="gmail-message-email">&lt;{msg.email}&gt;</span>
                        <span className="gmail-message-time">{msg.time}</span>
                    </div>
                    <div className="gmail-message-to">to {msg.to}</div>
                    <div
                        className="gmail-message-body"
                        dangerouslySetInnerHTML={{ __html: msg.body.replace(/\n/g, '<br>') }}
                    />
                    {msg.signature && (
                        <div className="gmail-message-signature">{msg.signature}</div>
                    )}

                    {/* Per-message attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="gmail-attachments-grid">
                            {msg.attachments.map((att) => (
                                <button
                                    key={att.id}
                                    className={`gmail-attachment-card gmail-attachment-card--${att.type}`}
                                    onClick={() => openAttachment(att, msg.attachments)}
                                >
                                    <div className="gmail-attachment-card-icon">
                                        {getAttachmentIcon(att.type)}
                                    </div>
                                    <div className="gmail-attachment-card-info">
                                        <div className="gmail-attachment-card-name">{att.name}</div>
                                        <div className="gmail-attachment-card-size">{att.size}</div>
                                    </div>
                                    <div className="gmail-attachment-card-actions">
                                        <span title="Download">⬇️</span>
                                        <span title="Save to Drive">△</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Legacy attachment fallback (emails without per-message attachments) */}
            {selectedEmail.hasAttachment && (!selectedEmail.attachments || selectedEmail.attachments.length === 0) && (
                <div className="gmail-attachment">
                    <span className="gmail-attachment-icon">📄</span>
                    <div className="gmail-attachment-info">
                        <div className="gmail-attachment-name">Condition_Report_{selectedEmail.sender.replace(/\s/g, '_')}.pdf</div>
                        <div className="gmail-attachment-size">2.4 MB</div>
                    </div>
                </div>
            )}

            {/* Smart Replies */}
            {!replyMode && selectedEmail.smartReplies?.length > 0 && (
                <div className="gmail-smart-replies">
                    {selectedEmail.smartReplies.map((reply) => (
                        <button
                            key={reply}
                            className="gmail-smart-reply"
                            onClick={() => triggerAiReply(reply)}
                        >
                            ✨ {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* Reply / Forward buttons */}
            {!replyMode && (
                <div style={{ padding: '8px 24px 16px 72px' }}>
                    <div className="gmail-message-actions">
                        <button className="gmail-reply-btn" onClick={() => startReply('reply')}>↩ Reply</button>
                        <button className="gmail-reply-btn" onClick={() => startReply('replyAll')}>↩ Reply all</button>
                        <button className="gmail-reply-btn" onClick={() => startReply('forward')}>↪ Forward</button>
                    </div>
                </div>
            )}

            {/* ── Inline Reply Compose ── */}
            {replyMode && (
                <div className="gmail-inline-reply">
                    <div className="gmail-inline-reply-header">
                        <span className="gmail-inline-reply-avatar" style={{ background: '#1a73e8' }}>Y</span>
                        <div className="gmail-inline-reply-meta">
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.54)' }}>
                                    {replyMode === 'reply' ? `Reply to ${selectedEmail.sender}` :
                                        replyMode === 'replyAll' ? `Reply all to ${selectedEmail.sender}` :
                                            `Forward`}
                                </span>
                                {aiState !== 'idle' && (
                                    <span className={`gmail-ai-badge${aiState === 'thinking' ? ' gmail-ai-badge--thinking' : aiState === 'typing' ? ' gmail-ai-badge--typing' : ' gmail-ai-badge--done'}`}>
                                        {aiState === 'thinking' ? '🤖 AI thinking...' :
                                            aiState === 'typing' ? '🤖 AI writing...' :
                                                '✅ AI draft ready — review & send'}
                                    </span>
                                )}
                            </div>
                            <div className="gmail-compose-field" style={{ padding: '4px 0', border: 'none', borderBottom: '1px solid #edeff1' }}>
                                <span className="gmail-compose-field-label" style={{ width: 'auto' }}>To</span>
                                {replyMode === 'forward' ? (
                                    <input className="gmail-compose-field-input" placeholder="Add recipients..." style={{ fontSize: 13 }} />
                                ) : (
                                    <span className="gmail-compose-field-chip">
                                        <span className="gmail-compose-field-chip-avatar" style={{ background: getAvatarColor(selectedEmail.sender) }}>
                                            {selectedEmail.sender.charAt(0)}
                                        </span>
                                        {selectedEmail.sender}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <textarea
                        ref={replyBoxRef}
                        className="gmail-inline-reply-editor"
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply();
                        }}
                        rows={5}
                    />
                    {/* Sending Progress Bar */}
                    {sendingState === 'sending' && (
                        <div className="gmail-send-progress">
                            <div className="gmail-send-progress-bar" style={{ width: `${sendProgress}%` }} />
                        </div>
                    )}
                    <div className="gmail-inline-reply-footer">
                        <button
                            className={`gmail-send-btn${sendingState === 'sending' ? ' gmail-send-btn--sending' : sendingState === 'sent' ? ' gmail-send-btn--sent' : ''}`}
                            onClick={sendReply}
                            disabled={!replyText.trim() || sendingState === 'sending'}
                        >
                            <span className="gmail-send-btn-main">
                                {sendingState === 'sending' ? 'Sending...' : sendingState === 'sent' ? '✓ Sent' : 'Send'}
                            </span>
                            {sendingState === 'idle' && <span className="gmail-send-btn-arrow">▾</span>}
                        </button>
                        <button className="gmail-compose-toolbar-icon" title="Formatting">A̲</button>
                        <button className="gmail-compose-toolbar-icon" title="Attach">📎</button>
                        <button className="gmail-compose-toolbar-icon" title="Link">🔗</button>
                        <button className="gmail-compose-toolbar-icon" title="Emoji">😊</button>
                        <button className="gmail-compose-toolbar-icon" title="Drive">△</button>
                        <button className="gmail-compose-toolbar-icon" title="Photo">🖼️</button>
                        <button className="gmail-compose-delete" title="Discard" onClick={() => setReplyMode(null)}>🗑️</button>
                    </div>
                </div>
            )}

            <div ref={threadEndRef} />
        </div>
    );
}
