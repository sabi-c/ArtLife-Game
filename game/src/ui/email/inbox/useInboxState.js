/**
 * useGmailState.js — Gmail Email Client State Hook
 *
 * Extracts all state management, derived data, and action functions
 * from GmailDesignGuide into a reusable custom hook.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    initialEmails, AI_REPLIES, AI_THINKING_MESSAGES,
    CONTACT_SUGGESTIONS, AI_COMPANION_NAME,
} from './inboxData.js';

export default function useGmailState({ onClose, initialCompose }) {
    // ═══ Core State ═══
    const [emails, setEmails] = useState(initialEmails);
    const [view, setView] = useState('inbox');               // 'inbox' | 'thread'
    const [selectedEmailId, setSelectedEmailId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('primary');
    const [activeNav, setActiveNav] = useState('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCompose, setShowCompose] = useState(!!initialCompose);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [sentEmails, setSentEmails] = useState([]);

    // ═══ Reply State ═══
    const [replyMode, setReplyMode] = useState(null);         // null | 'reply' | 'replyAll' | 'forward'
    const [replyText, setReplyText] = useState('');
    const [composeData, setComposeData] = useState(initialCompose || { to: '', subject: '', body: '' });
    const threadEndRef = useRef(null);
    const replyBoxRef = useRef(null);

    // ═══ AI State ═══
    const [aiState, setAiState] = useState('idle');            // 'idle' | 'thinking' | 'typing' | 'done'
    const [aiTypedText, setAiTypedText] = useState('');
    const [aiFullText, setAiFullText] = useState('');
    const aiIntervalRef = useRef(null);
    const [showAiAssistant, setShowAiAssistant] = useState(false);

    // ═══ AI Companion State ═══
    const [companionState, setCompanionState] = useState('idle');
    const [companionText, setCompanionText] = useState('');
    const [companionThinkMsg, setCompanionThinkMsg] = useState('');
    const companionIntervalRef = useRef(null);
    const companionTimeoutRef = useRef(null);

    // ═══ Sending Animation ═══
    const [sendingState, setSendingState] = useState('idle');
    const [sendProgress, setSendProgress] = useState(0);
    const sendTimerRef = useRef(null);

    // ═══ Feature State ═══
    const [snoozedEmails, setSnoozedEmails] = useState([]);
    const [snoozePickerId, setSnoozePickerId] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [undoToast, setUndoToast] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({ density: 'default', theme: 'default' });
    const [contactQuery, setContactQuery] = useState('');
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const undoTimerRef = useRef(null);

    // ═══ Attachment Viewer ═══
    const [viewingAttachment, setViewingAttachment] = useState(null); // { attachment, allAttachments, index }

    // ═══ Derived State ═══
    const selectedEmail = useMemo(
        () => emails.find(e => e.id === selectedEmailId),
        [emails, selectedEmailId]
    );

    const filteredContacts = useMemo(() => {
        if (!contactQuery.trim()) return [];
        const q = contactQuery.toLowerCase();
        return CONTACT_SUGGESTIONS.filter(c =>
            c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        ).slice(0, 5);
    }, [contactQuery]);

    const visibleEmails = useMemo(() => {
        let filtered = emails.filter(e => !e.archived && !e.deleted && !e.snoozed);

        if (activeNav === 'starred') filtered = filtered.filter(e => e.starred);
        else if (activeNav === 'snoozed') filtered = emails.filter(e => e.snoozed && !e.deleted);
        else if (activeNav === 'important') filtered = filtered.filter(e => e.important);
        else if (activeNav === 'trash') filtered = emails.filter(e => e.deleted);
        else if (activeNav === 'sent') return sentEmails;
        else if (activeNav === 'drafts') return drafts;
        else if (activeNav === 'all') filtered = emails.filter(e => !e.deleted);

        if (activeNav === 'inbox') {
            filtered = filtered.filter(e => e.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.sender.toLowerCase().includes(q) ||
                e.subject.toLowerCase().includes(q) ||
                e.preview.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [emails, activeNav, activeCategory, searchQuery, sentEmails, drafts]);

    const categoryBadges = useMemo(() => {
        const counts = {};
        emails.filter(e => !e.archived && !e.deleted && e.unread).forEach(e => {
            counts[e.category] = (counts[e.category] || 0) + 1;
        });
        return counts;
    }, [emails]);

    // ═══ Effects ═══

    // Check snoozed emails that should return
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setSnoozedEmails(prev => {
                const returning = prev.filter(s => s.returnTime <= now);
                if (returning.length > 0) {
                    const returnIds = new Set(returning.map(s => s.emailId));
                    setEmails(prevEmails => prevEmails.map(e =>
                        returnIds.has(e.id) ? { ...e, snoozed: false, unread: true } : e
                    ));
                    return prev.filter(s => s.returnTime > now);
                }
                return prev;
            });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
            if (companionIntervalRef.current) clearInterval(companionIntervalRef.current);
            if (companionTimeoutRef.current) clearTimeout(companionTimeoutRef.current);
            if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                if (viewingAttachment) setViewingAttachment(null);
                else if (showCompose) setShowCompose(false);
                else if (replyMode) setReplyMode(null);
                else if (view === 'thread') backToInbox();
                else onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, view, showCompose, replyMode, viewingAttachment]);

    // ═══ Actions ═══

    const toggleStar = useCallback((id, e) => {
        e?.stopPropagation();
        setEmails(prev => prev.map(em => em.id === id ? { ...em, starred: !em.starred } : em));
    }, []);

    const markRead = useCallback((id) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, unread: false } : em));
    }, []);

    const toggleRead = useCallback((id) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, unread: !em.unread } : em));
    }, []);

    const archiveEmail = useCallback((id) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, archived: true } : em));
        if (selectedEmailId === id) { setView('inbox'); setSelectedEmailId(null); }
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoToast({ type: 'archived', emailId: id });
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
    }, [selectedEmailId]);

    const deleteEmail = useCallback((id) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, deleted: true } : em));
        if (selectedEmailId === id) { setView('inbox'); setSelectedEmailId(null); }
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoToast({ type: 'deleted', emailId: id });
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
    }, [selectedEmailId]);

    const undoAction = useCallback(() => {
        if (!undoToast) return;
        const { type, emailId } = undoToast;
        if (type === 'archived') setEmails(prev => prev.map(em => em.id === emailId ? { ...em, archived: false } : em));
        else if (type === 'deleted') setEmails(prev => prev.map(em => em.id === emailId ? { ...em, deleted: false } : em));
        else if (type === 'sent') setSentEmails(prev => prev.filter(e => e.id !== emailId));
        setUndoToast(null);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }, [undoToast]);

    const snoozeEmail = useCallback((id, hours) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, snoozed: true } : em));
        setSnoozedEmails(prev => [...prev, { emailId: id, returnTime: Date.now() + hours * 3600000 }]);
        setSnoozePickerId(null);
        if (selectedEmailId === id) { setView('inbox'); setSelectedEmailId(null); }
    }, [selectedEmailId]);

    const toggleImportant = useCallback((id, e) => {
        e?.stopPropagation();
        setEmails(prev => prev.map(em => em.id === id ? { ...em, important: !em.important } : em));
    }, []);

    const saveDraft = useCallback((data) => {
        if (!data.to && !data.subject && !data.body) return;
        setDrafts(prev => [{
            id: Date.now(), sender: 'Draft', email: 'collector@artlife.game',
            subject: data.subject || '(no subject)',
            preview: data.body?.substring(0, 80) || '',
            time: 'Draft', date: new Date().toLocaleString(),
            unread: false, starred: false, hasAttachment: false,
            category: 'primary', draftData: data,
        }, ...prev]);
    }, []);

    const selectContact = useCallback((contact) => {
        setComposeData(p => ({ ...p, to: contact.email }));
        setContactQuery('');
        setShowContactDropdown(false);
    }, []);

    const openThread = useCallback((email) => {
        setSelectedEmailId(email.id);
        markRead(email.id);
        setView('thread');
        setReplyMode(null);
        setReplyText('');
        setAiState('idle');
        setShowAiAssistant(false);

        if (companionIntervalRef.current) clearInterval(companionIntervalRef.current);
        if (companionTimeoutRef.current) clearTimeout(companionTimeoutRef.current);

        setCompanionState('reading');
        setCompanionText('');
        setCompanionThinkMsg(AI_THINKING_MESSAGES[Math.floor(Math.random() * AI_THINKING_MESSAGES.length)]);

        const readDelay = 1500 + Math.random() * 500;
        companionTimeoutRef.current = setTimeout(() => {
            setCompanionState('analyzing');
            const fullEmail = emails.find(e => e.id === email.id);
            const analysis = fullEmail?.aiAnalysis || 'Interesting email. Let me think about the best response...';
            let charIdx = 0;
            companionIntervalRef.current = setInterval(() => {
                charIdx += 1 + Math.floor(Math.random() * 2);
                if (charIdx >= analysis.length) {
                    charIdx = analysis.length;
                    clearInterval(companionIntervalRef.current);
                    companionIntervalRef.current = null;
                    setTimeout(() => setCompanionState('ready'), 400);
                }
                setCompanionText(analysis.substring(0, charIdx));
            }, 20 + Math.random() * 15);
        }, readDelay);
    }, [markRead, emails]);

    const backToInbox = useCallback(() => {
        setView('inbox');
        setSelectedEmailId(null);
        setReplyMode(null);
        setReplyText('');
    }, []);

    const startReply = useCallback((mode) => {
        setReplyMode(mode);
        setReplyText('');
        setAiState('idle');
        setAiTypedText('');
        setAiFullText('');
        setShowAiAssistant(true);
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        setTimeout(() => replyBoxRef.current?.focus(), 100);
    }, []);

    const triggerAiReply = useCallback((suggestionText) => {
        const fullReply = AI_REPLIES[suggestionText] || suggestionText;
        setReplyMode('reply');
        setReplyText('');
        setAiState('thinking');
        setAiTypedText('');
        setAiFullText(fullReply);
        setShowAiAssistant(false);

        const thinkDelay = 1200 + Math.random() * 800;
        setTimeout(() => {
            setAiState('typing');
            let charIndex = 0;
            aiIntervalRef.current = setInterval(() => {
                charIndex++;
                setAiTypedText(fullReply.substring(0, charIndex));
                setReplyText(fullReply.substring(0, charIndex));
                if (charIndex >= fullReply.length) {
                    clearInterval(aiIntervalRef.current);
                    aiIntervalRef.current = null;
                    setAiState('done');
                }
            }, 18 + Math.random() * 12);
        }, thinkDelay);
    }, []);

    const sendReply = useCallback(() => {
        if (!replyText.trim() || !selectedEmailId) return;
        if (sendingState === 'sending') return;

        setSendingState('sending');
        setSendProgress(0);

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 8 + Math.random() * 15;
            if (progress >= 100) { progress = 100; clearInterval(progressInterval); }
            setSendProgress(Math.min(progress, 100));
        }, 100);

        const sendDelay = 1200 + Math.random() * 600;
        sendTimerRef.current = setTimeout(() => {
            clearInterval(progressInterval);
            setSendProgress(100);

            const now = new Date();
            const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
            const sentId = Date.now();

            setEmails(prev => prev.map(em =>
                em.id === selectedEmailId
                    ? { ...em, thread: [...em.thread, { id: `reply-${sentId}`, sender: 'You', email: 'collector@artlife.game', time: timeStr, to: selectedEmail?.sender || 'Unknown', body: replyText.replace(/\n/g, '<br>') }] }
                    : em
            ));

            setSentEmails(prev => [{
                id: sentId, sender: 'Me', email: 'collector@artlife.game',
                subject: `Re: ${selectedEmail?.subject}`, preview: replyText.substring(0, 80),
                time: 'Just now', date: timeStr, unread: false, starred: false,
                hasAttachment: false, category: 'primary',
            }, ...prev]);

            setSendingState('sent');
            setTimeout(() => { setSendingState('idle'); setSendProgress(0); }, 1500);

            setReplyMode(null);
            setReplyText('');
            setAiState('idle');
            setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            setUndoToast({ type: 'sent', emailId: sentId });
            undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
        }, sendDelay);
    }, [replyText, selectedEmailId, selectedEmail, sendingState]);

    const sendCompose = useCallback(() => {
        if (!composeData.to.trim() || !composeData.body.trim()) return;
        const sentId = Date.now();

        setSentEmails(prev => [{
            id: sentId, sender: 'Me', email: 'collector@artlife.game',
            subject: composeData.subject || '(no subject)',
            preview: composeData.body.substring(0, 80),
            time: 'Just now', date: new Date().toLocaleString(),
            unread: false, starred: false, hasAttachment: false, category: 'primary',
        }, ...prev]);

        setShowCompose(false);
        setComposeData({ to: '', subject: '', body: '' });

        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoToast({ type: 'sent', emailId: sentId });
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
    }, [composeData]);

    const bulkAction = useCallback((action) => {
        if (selectedIds.size === 0) return;
        setEmails(prev => prev.map(em => {
            if (!selectedIds.has(em.id)) return em;
            if (action === 'archive') return { ...em, archived: true };
            if (action === 'delete') return { ...em, deleted: true };
            if (action === 'read') return { ...em, unread: false };
            if (action === 'unread') return { ...em, unread: true };
            return em;
        }));
        setSelectedIds(new Set());
    }, [selectedIds]);

    const toggleSelect = useCallback((id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    // Reset emails to initial state
    const refreshEmails = useCallback(() => {
        setEmails(initialEmails());
    }, []);

    // Attachment viewer
    const openAttachment = useCallback((attachment, allAttachments) => {
        const index = allAttachments.findIndex(a => a.id === attachment.id);
        setViewingAttachment({ attachment, allAttachments, index });
    }, []);

    const closeAttachment = useCallback(() => setViewingAttachment(null), []);

    const navigateAttachment = useCallback((dir) => {
        if (!viewingAttachment) return;
        const { allAttachments, index } = viewingAttachment;
        const newIndex = index + dir;
        if (newIndex >= 0 && newIndex < allAttachments.length) {
            setViewingAttachment({
                attachment: allAttachments[newIndex],
                allAttachments,
                index: newIndex,
            });
        }
    }, [viewingAttachment]);

    // ═══ Return everything sub-components need ═══
    return {
        // Core state
        emails, view, selectedEmailId, activeCategory, activeNav,
        searchQuery, showCompose, selectedIds, sentEmails,
        selectedEmail, visibleEmails, categoryBadges,

        // Setters
        setActiveCategory, setActiveNav, setSearchQuery,
        setShowCompose, setSelectedIds,

        // Reply state
        replyMode, replyText, setReplyText, setReplyMode,
        composeData, setComposeData,
        threadEndRef, replyBoxRef,

        // AI state
        aiState, aiTypedText, showAiAssistant, setShowAiAssistant,

        // Companion state
        companionState, companionText, companionThinkMsg,

        // Sending state
        sendingState, sendProgress,

        // Features
        snoozedEmails, snoozePickerId, setSnoozePickerId,
        drafts, setDrafts, undoToast,
        showSettings, setShowSettings, settings, setSettings,
        contactQuery, setContactQuery,
        showContactDropdown, setShowContactDropdown,
        hoveredRowId, setHoveredRowId,
        filteredContacts,

        // Attachment viewer
        viewingAttachment, openAttachment, closeAttachment, navigateAttachment,

        // Actions
        toggleStar, markRead, toggleRead, archiveEmail, deleteEmail,
        undoAction, snoozeEmail, toggleImportant, saveDraft, selectContact,
        openThread, backToInbox, startReply, triggerAiReply,
        sendReply, sendCompose, bulkAction, toggleSelect, refreshEmails,
    };
}
