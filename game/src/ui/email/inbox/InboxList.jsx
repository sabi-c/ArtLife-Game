/**
 * InboxList.jsx — Email list with category tabs, action bar, hover actions
 */

import React from 'react';
import { CATEGORIES, SNOOZE_OPTIONS } from './inboxData.js';

export default function InboxList({
    visibleEmails, activeNav, activeCategory, setActiveCategory,
    categoryBadges, selectedIds, setSelectedIds, searchQuery,
    hoveredRowId, setHoveredRowId, snoozePickerId, setSnoozePickerId,
    // Actions
    openThread, toggleStar, toggleSelect, toggleRead, toggleImportant,
    archiveEmail, deleteEmail, snoozeEmail, bulkAction, refreshEmails,
    // Draft handling
    setComposeData, setShowCompose, setDrafts,
}) {
    return (
        <>
            {activeNav === 'inbox' && (
                <div className="gmail-category-tabs">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            className={`gmail-category-tab${activeCategory === cat.id ? ' gmail-category-tab--active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            <span className="gmail-category-tab-icon">{cat.icon}</span>
                            {cat.label}
                            {categoryBadges[cat.id] > 0 && (
                                <span className="gmail-category-tab-badge">{categoryBadges[cat.id]}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Action Bar */}
            <div className="gmail-action-bar">
                <button className="gmail-action-checkbox" title="Select all" onClick={() => {
                    if (selectedIds.size === visibleEmails.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(visibleEmails.map(e => e.id)));
                }}>
                    {selectedIds.size > 0 ? '☑' : '☐'}
                </button>
                {selectedIds.size > 0 && (
                    <>
                        <button className="gmail-action-icon" title="Archive" onClick={() => bulkAction('archive')}>📥</button>
                        <button className="gmail-action-icon" title="Delete" onClick={() => bulkAction('delete')}>🗑️</button>
                        <button className="gmail-action-icon" title="Mark as read" onClick={() => bulkAction('read')}>✉️</button>
                        <div className="gmail-action-divider" />
                    </>
                )}
                <button className="gmail-action-icon" title="Refresh" onClick={refreshEmails}>↻</button>
                <div className="gmail-pagination">
                    <span>{visibleEmails.length > 0 ? `1–${visibleEmails.length} of ${visibleEmails.length}` : 'No conversations'}</span>
                </div>
            </div>

            {/* Email List */}
            <div className="gmail-email-list">
                {visibleEmails.length === 0 && (
                    <div className="gmail-email-list-empty">
                        {searchQuery
                            ? `No results for "${searchQuery}"`
                            : activeNav === 'trash' ? 'Trash is empty'
                                : activeNav === 'starred' ? 'No starred messages'
                                    : 'No conversations'}
                    </div>
                )}
                {visibleEmails.map((email) => (
                    <div
                        key={email.id}
                        className={`gmail-email-row${email.unread ? ' gmail-email-row--unread' : ''}${selectedIds.has(email.id) ? ' gmail-email-row--selected' : ''}`}
                        onClick={() => {
                            if (email.thread) {
                                openThread(email);
                            } else if (email.draftData) {
                                setComposeData(email.draftData);
                                setShowCompose(true);
                                setDrafts(prev => prev.filter(d => d.id !== email.id));
                            }
                        }}
                        onMouseEnter={() => setHoveredRowId(email.id)}
                        onMouseLeave={() => { setHoveredRowId(null); setSnoozePickerId(null); }}
                    >
                        <button className="gmail-email-checkbox" onClick={(e) => toggleSelect(email.id, e)}>
                            {selectedIds.has(email.id) ? '☑' : '☐'}
                        </button>
                        <button
                            className={`gmail-email-star${email.starred ? ' gmail-email-star--active' : ''}`}
                            onClick={(e) => toggleStar(email.id, e)}
                        >
                            {email.starred ? '★' : '☆'}
                        </button>
                        {email.important && <span className="gmail-important-marker" title="Important">▸</span>}
                        <div className="gmail-email-sender">{email.sender}</div>
                        <div className="gmail-email-content">
                            <span className="gmail-email-subject">{email.subject}</span>
                            <span className="gmail-email-separator"> — </span>
                            <span className="gmail-email-preview">{email.preview}</span>
                        </div>
                        {email.hasAttachment && <span className="gmail-email-attachment">📎</span>}

                        {/* Time — hidden on hover */}
                        {hoveredRowId !== email.id && (
                            <span className="gmail-email-time">{email.time}</span>
                        )}

                        {/* Hover Actions */}
                        {hoveredRowId === email.id && (
                            <div className="gmail-email-hover-actions">
                                <button className="gmail-hover-icon" title="Archive" onClick={(e) => { e.stopPropagation(); archiveEmail(email.id); }}>📥</button>
                                <button className="gmail-hover-icon" title="Delete" onClick={(e) => { e.stopPropagation(); deleteEmail(email.id); }}>🗑️</button>
                                <button className="gmail-hover-icon" title={email.unread ? 'Mark as read' : 'Mark as unread'} onClick={(e) => { e.stopPropagation(); toggleRead(email.id); }}>
                                    {email.unread ? '✉️' : '📩'}
                                </button>
                                <button className="gmail-hover-icon" title="Snooze" onClick={(e) => { e.stopPropagation(); setSnoozePickerId(snoozePickerId === email.id ? null : email.id); }}>⏰</button>
                                <button className="gmail-hover-icon" title={email.important ? 'Not important' : 'Mark as important'} onClick={(e) => toggleImportant(email.id, e)}>
                                    {email.important ? '🏷️' : '🏷️'}
                                </button>
                            </div>
                        )}

                        {/* Snooze Picker */}
                        {snoozePickerId === email.id && (
                            <div className="gmail-snooze-picker" onClick={(e) => e.stopPropagation()}>
                                <div className="gmail-snooze-header">Snooze until...</div>
                                {SNOOZE_OPTIONS.map(opt => (
                                    <button key={opt.label} className="gmail-snooze-option" onClick={() => snoozeEmail(email.id, opt.hours)}>
                                        <span>{opt.icon}</span> {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
