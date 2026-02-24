/**
 * InboxShell.jsx — Gmail Email Client Shell
 *
 * Composes sub-components: InboxList, ThreadView, ComposeWindow,
 * AttachmentViewer, MobileLayout.
 * Layout: topbar, sidebar, content area, overlays
 */

import React from 'react';
import './inbox.css';

import useInboxState from './useInboxState.js';
import { NAV_ITEMS, LABEL_ITEMS, AI_COMPANION_NAME } from './inboxData.js';

import InboxList from './InboxList.jsx';
import ThreadView from './ThreadView.jsx';
import ComposeWindow from './ComposeWindow.jsx';
import AttachmentViewer from './AttachmentViewer.jsx';
import MobileLayout from './MobileLayout.jsx';

export default function InboxShell({ onClose, initialCompose }) {
    const state = useInboxState({ onClose, initialCompose });

    const {
        emails, view, selectedEmail, activeCategory, activeNav,
        searchQuery, showCompose, selectedIds, sentEmails,
        visibleEmails, categoryBadges,
        setActiveCategory, setActiveNav, setSearchQuery,
        setShowCompose, setSelectedIds,
        replyMode, replyText, setReplyText, setReplyMode,
        composeData, setComposeData,
        threadEndRef, replyBoxRef,
        aiState, showAiAssistant, setShowAiAssistant,
        companionState, companionText, companionThinkMsg,
        sendingState, sendProgress,
        snoozedEmails, snoozePickerId, setSnoozePickerId,
        drafts, setDrafts, undoToast,
        showSettings, setShowSettings, settings, setSettings,
        contactQuery, setContactQuery,
        showContactDropdown, setShowContactDropdown,
        hoveredRowId, setHoveredRowId,
        filteredContacts,
        viewingAttachment, openAttachment, closeAttachment, navigateAttachment,
        toggleStar, toggleRead, archiveEmail, deleteEmail,
        undoAction, snoozeEmail, toggleImportant, saveDraft, selectContact,
        openThread, backToInbox, startReply, triggerAiReply,
        sendReply, sendCompose, bulkAction, toggleSelect, refreshEmails,
    } = state;

    return (
        <div className="gmail-guide-overlay">
            {/* ═══ Top Bar ═══ */}
            <div className="gmail-topbar">
                <button className="gmail-topbar-hamburger" title="Menu">☰</button>
                <div className="gmail-topbar-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="22" viewBox="0 0 75 56" fill="none">
                        <path d="M67.6 0H7.4L37.5 22.5L67.6 0Z" fill="#EA4335" />
                        <path d="M0 7.3V48.7C0 52.6 3.2 55.8 7.1 55.8H11.3V17.3L37.5 33.7L63.7 17.3V55.8H67.9C71.8 55.8 75 52.6 75 48.7V7.3L37.5 29.3L0 7.3Z" fill="#C5221F" />
                        <path d="M0 7.3L37.5 29.3V33.7L11.3 17.3V55.8H7.1C3.2 55.8 0 52.6 0 48.7V7.3Z" fill="#FBBC04" />
                        <path d="M75 7.3L37.5 29.3V33.7L63.7 17.3V55.8H67.9C71.8 55.8 75 52.6 75 48.7V7.3Z" fill="#34A853" />
                    </svg>
                    <span className="gmail-topbar-title">ArtLife Mail</span>
                </div>
                <div className="gmail-search-bar">
                    <span className="gmail-search-icon">🔍</span>
                    <input
                        className="gmail-search-input"
                        placeholder="Search mail"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="gmail-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>
                <div className="gmail-topbar-actions">
                    <button className="gmail-topbar-icon" title="Help">❓</button>
                    <div className="gmail-settings-wrapper">
                        <button className="gmail-topbar-icon" title="Settings" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
                        {showSettings && (
                            <div className="gmail-settings-panel">
                                <div className="gmail-settings-header">
                                    <span>Quick settings</span>
                                    <button className="gmail-settings-close" onClick={() => setShowSettings(false)}>✕</button>
                                </div>
                                <div className="gmail-settings-section">
                                    <div className="gmail-settings-label">Display density</div>
                                    {['default', 'comfortable', 'compact'].map(d => (
                                        <label key={d} className="gmail-settings-radio">
                                            <input type="radio" name="density" checked={settings.density === d} onChange={() => setSettings(p => ({ ...p, density: d }))} />
                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                        </label>
                                    ))}
                                </div>
                                <div className="gmail-settings-section">
                                    <div className="gmail-settings-label">Inbox type</div>
                                    {['default', 'important-first', 'unread-first', 'starred-first'].map(t => (
                                        <label key={t} className="gmail-settings-radio">
                                            <input type="radio" name="theme" checked={settings.theme === t} onChange={() => setSettings(p => ({ ...p, theme: t }))} />
                                            {t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="gmail-topbar-avatar">S</div>
                </div>
            </div>

            {/* ═══ Main Layout ═══ */}
            <div className="gmail-main">
                {/* Sidebar */}
                <div className="gmail-sidebar">
                    <button className="gmail-compose-btn" onClick={() => { setShowCompose(true); setComposeData({ to: '', subject: '', body: '' }); }}>
                        <span className="gmail-compose-btn-icon">✏️</span>
                        <span className="gmail-compose-btn-text">Compose</span>
                    </button>

                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            className={`gmail-nav-item${activeNav === item.id ? ' gmail-nav-item--active' : ''}`}
                            onClick={() => { setActiveNav(item.id); if (view !== 'inbox') backToInbox(); }}
                        >
                            <span className="gmail-nav-icon">{item.icon}</span>
                            <span className="gmail-nav-label">{item.label}</span>
                            {item.id === 'inbox' && categoryBadges.primary > 0 && (
                                <span className="gmail-nav-count">{Object.values(categoryBadges).reduce((a, b) => a + b, 0)}</span>
                            )}
                            {item.id === 'snoozed' && snoozedEmails.length > 0 && (
                                <span className="gmail-nav-count">{snoozedEmails.length}</span>
                            )}
                            {item.id === 'drafts' && drafts.length > 0 && (
                                <span className="gmail-nav-count">{drafts.length}</span>
                            )}
                            {item.id === 'sent' && sentEmails.length > 0 && (
                                <span className="gmail-nav-count">{sentEmails.length}</span>
                            )}
                        </button>
                    ))}

                    <hr className="gmail-nav-divider" />
                    <div className="gmail-nav-section-label">LABELS</div>
                    {LABEL_ITEMS.map((item) => (
                        <button key={item.label} className="gmail-nav-item">
                            <span className="gmail-nav-icon gmail-nav-icon--label" style={{ color: item.color }}>{item.icon}</span>
                            <span className="gmail-nav-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* ═══ Content Area ═══ */}
                <div className="gmail-content">
                    {view === 'inbox' && (
                        <InboxList
                            visibleEmails={visibleEmails}
                            activeNav={activeNav}
                            activeCategory={activeCategory}
                            setActiveCategory={setActiveCategory}
                            categoryBadges={categoryBadges}
                            selectedIds={selectedIds}
                            setSelectedIds={setSelectedIds}
                            searchQuery={searchQuery}
                            hoveredRowId={hoveredRowId}
                            setHoveredRowId={setHoveredRowId}
                            snoozePickerId={snoozePickerId}
                            setSnoozePickerId={setSnoozePickerId}
                            openThread={openThread}
                            toggleStar={toggleStar}
                            toggleSelect={toggleSelect}
                            toggleRead={toggleRead}
                            toggleImportant={toggleImportant}
                            archiveEmail={archiveEmail}
                            deleteEmail={deleteEmail}
                            snoozeEmail={snoozeEmail}
                            bulkAction={bulkAction}
                            refreshEmails={refreshEmails}
                            setComposeData={setComposeData}
                            setShowCompose={setShowCompose}
                            setDrafts={setDrafts}
                        />
                    )}

                    {view === 'thread' && selectedEmail && (
                        <ThreadView
                            selectedEmail={selectedEmail}
                            emails={emails}
                            backToInbox={backToInbox}
                            archiveEmail={archiveEmail}
                            deleteEmail={deleteEmail}
                            toggleRead={toggleRead}
                            startReply={startReply}
                            triggerAiReply={triggerAiReply}
                            companionState={companionState}
                            companionText={companionText}
                            companionThinkMsg={companionThinkMsg}
                            replyMode={replyMode}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            replyBoxRef={replyBoxRef}
                            aiState={aiState}
                            sendReply={sendReply}
                            setReplyMode={setReplyMode}
                            sendingState={sendingState}
                            sendProgress={sendProgress}
                            openAttachment={openAttachment}
                            threadEndRef={threadEndRef}
                        />
                    )}
                </div>
            </div>

            {/* ═══ Compose Window ═══ */}
            {showCompose && (
                <ComposeWindow
                    composeData={composeData}
                    setComposeData={setComposeData}
                    showContactDropdown={showContactDropdown}
                    setShowContactDropdown={setShowContactDropdown}
                    contactQuery={contactQuery}
                    setContactQuery={setContactQuery}
                    filteredContacts={filteredContacts}
                    selectContact={selectContact}
                    sendCompose={sendCompose}
                    saveDraft={saveDraft}
                    setShowCompose={setShowCompose}
                />
            )}

            {/* ═══ Mobile Layout ═══ */}
            <MobileLayout
                view={view}
                activeNav={activeNav}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                visibleEmails={visibleEmails}
                selectedEmail={selectedEmail}
                categoryBadges={categoryBadges}
                replyMode={replyMode}
                replyText={replyText}
                setReplyText={setReplyText}
                setReplyMode={setReplyMode}
                replyBoxRef={replyBoxRef}
                threadEndRef={threadEndRef}
                openThread={openThread}
                toggleStar={toggleStar}
                backToInbox={backToInbox}
                archiveEmail={archiveEmail}
                deleteEmail={deleteEmail}
                startReply={startReply}
                triggerAiReply={triggerAiReply}
                sendReply={sendReply}
                setActiveNav={setActiveNav}
            />

            {/* ═══ AI Assistant Popup ═══ */}
            {showAiAssistant && replyMode && selectedEmail?.smartReplies?.length > 0 && (
                <div className="gmail-ai-assistant">
                    <div className="gmail-ai-assistant-header">
                        <span className="gmail-ai-assistant-icon">🤖</span>
                        <span className="gmail-ai-assistant-title">{AI_COMPANION_NAME} — Reply Assistant</span>
                        <button className="gmail-ai-assistant-close" onClick={() => setShowAiAssistant(false)}>✕</button>
                    </div>
                    <div className="gmail-ai-assistant-body">
                        {companionState === 'ready' && companionText && (
                            <div className="gmail-ai-assistant-context">
                                <div className="gmail-ai-assistant-context-label">📧 Email summary</div>
                                <div className="gmail-ai-assistant-context-text">{companionText.substring(0, 120)}...</div>
                            </div>
                        )}
                        <div className="gmail-ai-assistant-prompt">How would you like to respond?</div>
                        <div className="gmail-ai-assistant-suggestions">
                            {selectedEmail.smartReplies.map((reply) => (
                                <button key={reply} className="gmail-ai-assistant-chip" onClick={() => triggerAiReply(reply)}>
                                    ✨ {reply}
                                </button>
                            ))}
                        </div>
                        <div className="gmail-ai-assistant-custom">
                            <input
                                type="text"
                                placeholder="Or describe what you want to say..."
                                className="gmail-ai-assistant-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        triggerAiReply(e.target.value.trim());
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Undo Toast ═══ */}
            {undoToast && (
                <div className="gmail-undo-toast">
                    <span>
                        {undoToast.type === 'sent' ? 'Message sent.'
                            : undoToast.type === 'archived' ? 'Conversation archived.'
                                : 'Conversation moved to Trash.'}
                    </span>
                    <button className="gmail-undo-btn" onClick={undoAction}>Undo</button>
                </div>
            )}

            {/* ═══ Attachment Viewer Lightbox ═══ */}
            <AttachmentViewer
                viewingAttachment={viewingAttachment}
                closeAttachment={closeAttachment}
                navigateAttachment={navigateAttachment}
            />
        </div>
    );
}
