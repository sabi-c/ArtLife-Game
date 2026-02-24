/**
 * ComposeWindow.jsx — Floating compose window with contact autocomplete
 */

import React from 'react';

export default function ComposeWindow({
    composeData, setComposeData,
    showContactDropdown, setShowContactDropdown,
    contactQuery, setContactQuery,
    filteredContacts, selectContact,
    sendCompose, saveDraft, setShowCompose,
}) {
    return (
        <div className="gmail-compose">
            <div className="gmail-compose-header">
                <span className="gmail-compose-header-title">New Message</span>
                <button className="gmail-compose-header-btn" title="Minimize">—</button>
                <button className="gmail-compose-header-btn" title="Pop out">⬜</button>
                <button className="gmail-compose-header-btn" title="Close" onClick={() => {
                    saveDraft(composeData);
                    setShowCompose(false);
                    setComposeData({ to: '', subject: '', body: '' });
                }}>✕</button>
            </div>
            <div className="gmail-compose-body">
                <div className="gmail-compose-field" style={{ position: 'relative' }}>
                    <span className="gmail-compose-field-label">To</span>
                    <input
                        className="gmail-compose-field-input"
                        placeholder="Recipients"
                        value={composeData.to}
                        onChange={(e) => {
                            setComposeData(p => ({ ...p, to: e.target.value }));
                            setContactQuery(e.target.value);
                            setShowContactDropdown(true);
                        }}
                        onFocus={() => { if (composeData.to) { setContactQuery(composeData.to); setShowContactDropdown(true); } }}
                        onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    />
                    <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', cursor: 'pointer' }}>Cc</span>
                    <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', cursor: 'pointer', marginLeft: 8 }}>Bcc</span>

                    {/* Contact Autocomplete Dropdown */}
                    {showContactDropdown && filteredContacts.length > 0 && (
                        <div className="gmail-contact-dropdown">
                            {filteredContacts.map(c => (
                                <button key={c.email} className="gmail-contact-item" onMouseDown={() => selectContact(c)}>
                                    <span className="gmail-contact-avatar">{c.avatar}</span>
                                    <div className="gmail-contact-info">
                                        <div className="gmail-contact-name">{c.name}</div>
                                        <div className="gmail-contact-email">{c.email}</div>
                                    </div>
                                    <div className="gmail-contact-role">{c.role}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="gmail-compose-subject">
                    <input
                        type="text"
                        placeholder="Subject"
                        value={composeData.subject}
                        onChange={(e) => setComposeData(p => ({ ...p, subject: e.target.value }))}
                    />
                </div>
                <textarea
                    className="gmail-compose-editor"
                    placeholder="Compose email"
                    value={composeData.body}
                    onChange={(e) => setComposeData(p => ({ ...p, body: e.target.value }))}
                    style={{ resize: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14 }}
                />
            </div>
            <div className="gmail-compose-footer">
                <button className="gmail-send-btn" onClick={sendCompose} disabled={!composeData.to.trim()}>
                    <span className="gmail-send-btn-main">Send</span>
                    <span className="gmail-send-btn-arrow">▾</span>
                </button>
                <button className="gmail-compose-toolbar-icon" title="Formatting">A̲</button>
                <button className="gmail-compose-toolbar-icon" title="Attach">📎</button>
                <button className="gmail-compose-toolbar-icon" title="Link">🔗</button>
                <button className="gmail-compose-toolbar-icon" title="Emoji">😊</button>
                <button className="gmail-compose-toolbar-icon" title="Drive">△</button>
                <button className="gmail-compose-toolbar-icon" title="Photo">🖼️</button>
                <button className="gmail-compose-toolbar-icon" title="Confidential">🔒</button>
                <button className="gmail-compose-toolbar-icon" title="Signature">✍️</button>
                <button className="gmail-compose-more" title="More">⋮</button>
                <button className="gmail-compose-delete" title="Discard" onClick={() => setShowCompose(false)}>🗑️</button>
            </div>
        </div>
    );
}
