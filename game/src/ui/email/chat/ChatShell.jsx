/**
 * iMessageUI.jsx — Apple iMessage Chat Client
 *
 * Fully interactive iMessage clone with:
 * - Contact list sidebar with search
 * - Chat bubble layout (sent/received with tails)
 * - Typing indicator animation
 * - Message timestamps + read receipts
 * - AI auto-reply simulation
 * - Send messages with Enter
 *
 * Accessible via admin dashboard → TOOLS → iMessage UI
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import './chat.css';

// ════════════════════════════════════════════════════════════
// Mock Data — Art world characters
// ════════════════════════════════════════════════════════════

const CONTACTS = [
    {
        id: 'margaux', name: 'Margaux Bellamy', avatar: 'M', color: '#ff6b6b',
        status: 'online', lastSeen: 'now',
        messages: [
            { id: 1, sender: 'them', text: 'Hey! I have that Basquiat study you were asking about. $285K, negotiable.', time: '10:02 AM', read: true },
            { id: 2, sender: 'me', text: 'Margaux! That\'s amazing news. Can you send the condition report?', time: '10:05 AM', read: true },
            { id: 3, sender: 'them', text: 'Of course — sending it over now. The provenance is impeccable: direct from the estate.', time: '10:07 AM', read: true },
            { id: 4, sender: 'them', text: 'Whitney Biennial 1985, Documenta IX. You won\'t find a better chain.', time: '10:07 AM', read: true },
            { id: 5, sender: 'me', text: 'That\' incredible. When can I see it in person?', time: '10:10 AM', read: true },
            { id: 6, sender: 'them', text: 'Thursday or Friday work? I can keep the gallery open late for a private viewing.', time: '10:12 AM', read: false },
        ],
    },
    {
        id: 'viktor', name: 'Viktor Hesse', avatar: 'V', color: '#4ecdc4',
        status: 'online', lastSeen: '2m ago',
        messages: [
            { id: 1, sender: 'me', text: 'Viktor, thanks for considering the Kunsthalle for Flux States!', time: '9:30 AM', read: true },
            { id: 2, sender: 'them', text: 'Of course! The East Wing Gallery is 400 sqm — perfect for your 12 works.', time: '9:45 AM', read: true },
            { id: 3, sender: 'them', text: 'We have two windows: Sep 15–Oct 28 or Jan 12–Feb 23. What works?', time: '9:46 AM', read: false },
        ],
    },
    {
        id: 'elena', name: 'Elena Vasquez', avatar: 'E', color: '#45b7d1',
        status: 'offline', lastSeen: '1h ago',
        messages: [
            { id: 1, sender: 'them', text: 'Progress photos of Architecture of Forgetting III attached! 📷', time: 'Yesterday', read: true },
            { id: 2, sender: 'them', text: 'The patina treatment is curing beautifully. 84"×120" as discussed.', time: 'Yesterday', read: true },
            { id: 3, sender: 'me', text: 'Elena these look INCREDIBLE. Can I visit the studio?', time: 'Yesterday', read: true },
            { id: 4, sender: 'them', text: 'Would love that! Come to Mexico City anytime in the next 3 weeks 🇲🇽', time: 'Yesterday', read: false },
        ],
    },
    {
        id: 'james', name: 'James Thornton', avatar: 'J', color: '#96e6a1',
        status: 'online', lastSeen: 'now',
        messages: [
            { id: 1, sender: 'them', text: 'Great meeting you at the studio yesterday.', time: '4:30 PM', read: true },
            { id: 2, sender: 'them', text: 'The Koons is listed at $1.2M but the client is flexible. I think $950K–$1.05M is doable.', time: '4:32 PM', read: true },
            { id: 3, sender: 'me', text: 'Very interesting. Send me the condition report and provenance?', time: '4:45 PM', read: true },
            { id: 4, sender: 'them', text: 'Sending by EOD. Let me know your thoughts once you review.', time: '4:48 PM', read: false },
        ],
    },
    {
        id: 'sophia', name: 'Sophia Chen', avatar: 'S', color: '#dda0dd',
        status: 'offline', lastSeen: '3h ago',
        messages: [
            { id: 1, sender: 'them', text: 'Are you going to Art Basel Miami this year?', time: 'Tuesday', read: true },
            { id: 2, sender: 'me', text: 'Yes! Got the VIP preview invitation. You?', time: 'Tuesday', read: true },
            { id: 3, sender: 'them', text: 'Same! Let\'s coordinate dinners. I have reservations at Casa Tua on the 3rd.', time: 'Tuesday', read: true },
            { id: 4, sender: 'me', text: 'Perfect — count me in!', time: 'Tuesday', read: true },
        ],
    },
    {
        id: 'artbot', name: 'ArtLife AI', avatar: '🤖', color: '#1a73e8',
        status: 'online', lastSeen: 'now',
        messages: [
            { id: 1, sender: 'them', text: 'Welcome to ArtLife! I\'m your AI art advisor. How can I help you today?', time: '8:00 AM', read: true },
            { id: 2, sender: 'me', text: 'What should I know about the current post-war contemporary market?', time: '8:05 AM', read: true },
            { id: 3, sender: 'them', text: 'Great question! Blue-chip contemporary prices surged 12% in Q1, driven by strong Asian demand. Key indicators:', time: '8:06 AM', read: true },
            { id: 4, sender: 'them', text: '• Basquiat "Untitled" — $45M at Phillips\n• Kusama Infinity Net — $12.8M at Sotheby\'s\n• Mehretu "Retopistics" — $9.6M at Christie\'s', time: '8:06 AM', read: true },
            { id: 5, sender: 'them', text: 'Emerging artist markets saw an 8% correction though. Good time to acquire from newer names with institutional backing.', time: '8:07 AM', read: false },
        ],
    },
];

// AI auto-reply data per contact
const AI_AUTO_REPLIES = {
    margaux: [
        'I\'ll hold it for you until Friday. Just let me know.',
        'By the way, I also have a small Basquiat drawing from \'84 if you\'re interested.',
        'The collector dinners at Basel might be a good place to discuss this further.',
    ],
    viktor: [
        'September is looking great. I\'ll send the technical specs for the lighting rig.',
        'We can also arrange press coverage through our PR team — ArtForum is interested.',
        'The opening reception can accommodate up to 200 guests.',
    ],
    elena: [
        'I\'ll have the studio cleaned up for your visit! 🎨',
        'You\'ll love it in person — the scale is really something else.',
        'Should I arrange a car from the airport? I know a great driver.',
    ],
    james: [
        'Condition report sent! Check your email.',
        'I think if you move quickly, we can close at $1M. Client needs the cash by Q2.',
        'I also have a Hirst spot painting if you\'re expanding the collection.',
    ],
    sophia: [
        'Also, I heard Pace is doing a private dinner on the 2nd. Want me to get you on the list?',
        'Just got confirmed for the Rubell family brunch too 🥂',
        'Did you see the Artnet article about the surge in blue-chip prices?',
    ],
    artbot: [
        'I can also help you track specific artists or auction lots. Just let me know what you\'re watching.',
        'Based on your collection profile, you might want to look at: Amoako Boafo, Jadé Fadojutimi, or Flora Yukhnovich.',
        'I\'ve noticed strong institutional interest in digital art. Have you considered any NFT-adjacent works from established artists?',
        'Your portfolio is currently weighted 60% post-war, 30% contemporary, 10% emerging. Want me to run a diversification analysis?',
    ],
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export default function IMessageUI({ onClose }) {
    const [contacts, setContacts] = useState(CONTACTS);
    const [activeContactId, setActiveContactId] = useState('margaux');
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const activeContact = useMemo(() =>
        contacts.find(c => c.id === activeContactId), [contacts, activeContactId]
    );

    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        const q = searchQuery.toLowerCase();
        return contacts.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.messages.some(m => m.text.toLowerCase().includes(q))
        );
    }, [contacts, searchQuery]);

    // Scroll to bottom on new messages
    useEffect(() => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, [activeContact?.messages?.length]);

    // Focus input on contact change
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeContactId]);

    const sendMessage = useCallback(() => {
        if (!inputText.trim()) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        const newMsg = {
            id: Date.now(),
            sender: 'me',
            text: inputText.trim(),
            time: timeStr,
            read: false,
        };

        setContacts(prev => prev.map(c =>
            c.id === activeContactId
                ? { ...c, messages: [...c.messages, newMsg] }
                : c
        ));
        setInputText('');

        // AI auto-reply after a delay
        const replies = AI_AUTO_REPLIES[activeContactId];
        if (replies && replies.length > 0) {
            setIsTyping(true);
            const delay = 1500 + Math.random() * 2000;
            setTimeout(() => {
                const replyText = replies[Math.floor(Math.random() * replies.length)];
                const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                setContacts(prev => prev.map(c =>
                    c.id === activeContactId
                        ? {
                            ...c, messages: [...c.messages, {
                                id: Date.now() + 1,
                                sender: 'them',
                                text: replyText,
                                time: replyTime,
                                read: false,
                            }]
                        }
                        : c
                ));
                setIsTyping(false);
            }, delay);
        }
    }, [inputText, activeContactId]);

    // Keyboard
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // Group messages by time proximity
    const groupedMessages = useMemo(() => {
        if (!activeContact) return [];
        const msgs = activeContact.messages;
        const groups = [];
        for (let i = 0; i < msgs.length; i++) {
            const msg = msgs[i];
            const prev = msgs[i - 1];
            const showAvatar = !prev || prev.sender !== msg.sender;
            const showTail = !msgs[i + 1] || msgs[i + 1].sender !== msg.sender;
            groups.push({ ...msg, showAvatar, showTail });
        }
        return groups;
    }, [activeContact]);

    return (
        <div className="imsg-overlay">
            {/* ═══ Sidebar ═══ */}
            <div className={`imsg-sidebar${mobileShowChat ? ' imsg-sidebar--hidden' : ''}`}>
                <div className="imsg-sidebar-header">
                    <button className="imsg-sidebar-close" onClick={onClose}>←</button>
                    <h2 className="imsg-sidebar-title">Messages</h2>
                    <button className="imsg-sidebar-compose">✏️</button>
                </div>
                <div className="imsg-search">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="imsg-contact-list">
                    {filteredContacts.map((contact) => {
                        const lastMsg = contact.messages[contact.messages.length - 1];
                        const unread = contact.messages.filter(m => m.sender === 'them' && !m.read).length;
                        return (
                            <div
                                key={contact.id}
                                className={`imsg-contact${activeContactId === contact.id ? ' imsg-contact--active' : ''}`}
                                onClick={() => { setActiveContactId(contact.id); setMobileShowChat(true); }}
                            >
                                <div className="imsg-contact-avatar" style={{ background: contact.color }}>
                                    {contact.avatar}
                                    {contact.status === 'online' && <span className="imsg-contact-online" />}
                                </div>
                                <div className="imsg-contact-info">
                                    <div className="imsg-contact-top">
                                        <span className="imsg-contact-name">{contact.name}</span>
                                        <span className="imsg-contact-time">{lastMsg?.time}</span>
                                    </div>
                                    <div className="imsg-contact-preview">
                                        {lastMsg?.sender === 'me' ? 'You: ' : ''}{lastMsg?.text.substring(0, 50)}{lastMsg?.text.length > 50 ? '...' : ''}
                                    </div>
                                </div>
                                {unread > 0 && <span className="imsg-contact-badge">{unread}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Chat Area ═══ */}
            <div className={`imsg-chat${!mobileShowChat ? ' imsg-chat--hidden' : ''}`}>
                {/* Chat Header */}
                <div className="imsg-chat-header">
                    <button
                        className="imsg-chat-header-back"
                        style={{ display: 'none' }}
                        onClick={() => setMobileShowChat(false)}
                    >←</button>
                    <div className="imsg-chat-header-avatar" style={{ background: activeContact?.color }}>
                        {activeContact?.avatar}
                    </div>
                    <div className="imsg-chat-header-info">
                        <div className="imsg-chat-header-name">{activeContact?.name}</div>
                        <div className="imsg-chat-header-status">
                            {activeContact?.status === 'online' ? (
                                <><span className="imsg-status-dot" />Active now</>
                            ) : (
                                `Last seen ${activeContact?.lastSeen}`
                            )}
                        </div>
                    </div>
                    <div className="imsg-chat-header-actions">
                        <button className="imsg-chat-header-btn">📞</button>
                        <button className="imsg-chat-header-btn">📹</button>
                        <button className="imsg-chat-header-btn">ℹ️</button>
                    </div>
                </div>

                {/* Messages */}
                <div className="imsg-messages">
                    <div className="imsg-messages-date">Today</div>
                    {groupedMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`imsg-bubble-row${msg.sender === 'me' ? ' imsg-bubble-row--sent' : ' imsg-bubble-row--received'}`}
                        >
                            {msg.sender !== 'me' && msg.showAvatar && (
                                <div className="imsg-bubble-avatar" style={{ background: activeContact?.color }}>
                                    {activeContact?.avatar}
                                </div>
                            )}
                            {msg.sender !== 'me' && !msg.showAvatar && (
                                <div className="imsg-bubble-avatar-spacer" />
                            )}
                            <div className={`imsg-bubble${msg.showTail ? ' imsg-bubble--tail' : ''}`}>
                                <div className="imsg-bubble-text">{msg.text}</div>
                                <div className="imsg-bubble-meta">
                                    <span className="imsg-bubble-time">{msg.time}</span>
                                    {msg.sender === 'me' && (
                                        <span className={`imsg-bubble-read${msg.read ? ' imsg-bubble-read--seen' : ''}`}>
                                            {msg.read ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="imsg-bubble-row imsg-bubble-row--received">
                            <div className="imsg-bubble-avatar" style={{ background: activeContact?.color }}>
                                {activeContact?.avatar}
                            </div>
                            <div className="imsg-bubble imsg-typing-bubble">
                                <div className="imsg-typing-dots">
                                    <span className="imsg-typing-dot" />
                                    <span className="imsg-typing-dot" />
                                    <span className="imsg-typing-dot" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="imsg-input-bar">
                    <button className="imsg-input-btn">+</button>
                    <div className="imsg-input-field">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="iMessage"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        />
                        <button className="imsg-input-emoji">😊</button>
                    </div>
                    <button
                        className={`imsg-send-btn${inputText.trim() ? ' imsg-send-btn--active' : ''}`}
                        onClick={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
