/**
 * GmailDesignGuide.jsx — Full Gmail Email Client
 *
 * Fully interactive email client with:
 * - Inbox with search, category tabs, read/unread, star, archive, delete
 * - Thread view with inline reply compose
 * - Send replies that appear in the thread
 * - Compose new emails
 * - Reply / Reply All / Forward
 * - Mobile responsive
 *
 * Accessible via admin dashboard → Email tab → TOOLS → Gmail Design Guide
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './GmailDesignGuide.css';

// ════════════════════════════════════════════════════════════
// Mock Data — each email has its own thread
// ════════════════════════════════════════════════════════════

const AVATAR_COLORS = ['#c44', '#1a73e8', '#f4b400', '#44aa66', '#7b1fa2', '#e67c00', '#00838f', '#c62828'];
const getAvatarColor = (name) => AVATAR_COLORS[Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

// AI-generated full replies mapped to each smart reply suggestion
const AI_REPLIES = {
    // Margaux Bellamy — Basquiat
    'I\'d love to see it!': `Hi Margaux,\n\nThank you for thinking of me — this sounds extraordinary. A 1982 Crown Study with that provenance is exactly the kind of piece I've been looking for.\n\nI'd love to schedule a private viewing this week. I'm available Thursday or Friday afternoon. Does either work for you?\n\nLooking forward to it.`,
    'What\'s the condition report?': `Hi Margaux,\n\nThis sounds like a remarkable piece. Before I commit to a viewing, would you mind sending over the condition report? I'd also appreciate any high-resolution images you have, particularly of the verso and any areas of restoration.\n\nI'm very interested but want to do my due diligence first.\n\nThanks so much.`,
    'Can we schedule a call?': `Hi Margaux,\n\nThanks for reaching out about this — a 1982 Basquiat with Whitney provenance is certainly worth a conversation.\n\nWould you have time for a quick call this week? I have a few questions about the provenance chain and the seller's timeline. I'm free most afternoons.\n\nBest regards.`,

    // Sotheby's — Bid Won
    'Thank you!': `Dear Sotheby's Client Services,\n\nThank you for confirming. I'm delighted with the result — the Twombly has been on my wish list for years.\n\nI'll arrange the wire transfer this week. Please send over the payment details and any shipping/insurance forms at your convenience.\n\nBest regards.`,
    'Please arrange shipping.': `Dear Client Services,\n\nCongratulations confirmed — please proceed with arranging shipping to my residence in New York. I'd like to use your recommended fine art handlers with climate-controlled transit.\n\nPlease also arrange wall-to-wall insurance coverage. I'll process the wire transfer within the week.\n\nThank you.`,
    'Can I pay by wire?': `Dear Client Services,\n\nThank you for the wonderful news. I'd like to arrange payment by wire transfer.\n\nCould you please send me the bank details and any required documentation? I'll aim to complete the transfer within 10 business days.\n\nRegards.`,

    // Viktor Hesse — Exhibition
    'September works perfectly!': `Dear Viktor,\n\nExcellent news — the September 15 – October 28 window is perfect. That gives me ample time to prepare the works and coordinate shipping from my studios.\n\nI've reviewed the attached agreement. A few minor points to discuss, but overall it looks great.\n\nShall we schedule a call next week to finalize the details? I'd also love to arrange a walkthrough of the East Wing space.\n\nWarm regards.`,
    'Let me review the terms.': `Dear Viktor,\n\nThank you for the generous offer — the East Wing Gallery sounds ideal for the scale of these works.\n\nI'll review the exhibition agreement with my advisor this week and get back to you with any questions. In the meantime, could you share the technical specifications for the lighting rig and wall load capacity?\n\nLooking forward to making this happen.`,
    'Can we schedule a walkthrough?': `Dear Viktor,\n\nThis is wonderful — I'm very excited about the possibility. Before committing to dates, I'd love to visit the East Wing Gallery in person to assess the space.\n\nWould it be possible to arrange a walkthrough sometime in the next few weeks? I could fly to Bremen on fairly short notice.\n\nBest regards.`,

    // Art Basel
    'I\'ll be there!': `Dear Art Basel VIP Team,\n\nThank you for the invitation — I wouldn't miss it. Please confirm my RSVP for the First View on December 2.\n\nI'll also be attending the collector dinners if there are still spots available.\n\nSee you in Miami.`,
    'Can I bring a guest?': `Dear Art Basel Team,\n\nThank you for the kind invitation. I'd love to attend the VIP Preview.\n\nQuick question — is my invitation transferable, or may I bring a guest? My partner is also an avid collector and would love to join for the First View.\n\nPlease let me know, and consider this my RSVP.`,
    'Please RSVP for me.': `Dear Art Basel Team,\n\nPlease confirm my attendance for the full VIP Preview, December 2-4. I'll be arriving December 1.\n\nIf there are any collector dinners or private gallery events during the week, I'd love to be included.\n\nThank you.`,

    // Elena Vasquez — Commission
    'Looks amazing!': `Hi Elena,\n\nThe progress photos look absolutely stunning — the patina treatment is exactly what I envisioned. The scale is going to be incredible in the space I have planned for it.\n\nI'm thrilled with how this is progressing. Please keep me updated as you approach the final stages.`,
    'Yes, I\'d love to visit!': `Hi Elena,\n\nI would love to visit the studio before varnishing! It would be great to see the piece at full scale and discuss any final adjustments in person.\n\nI could fly to Mexico City next week or the week after — whatever works best for your schedule. Just let me know.`,
    'When can I see it?': `Hi Elena,\n\nThis is looking wonderful. When would be the best time to visit the studio? I want to see it in the flesh before the final varnish coat goes on.\n\nI'm flexible on dates — just need a day or two notice to arrange the trip.\n\nThanks for the update!`,

    // Christie's — Catalogue
    'Register my interest.': `Dear Christie's,\n\nPlease register my interest in the following lots from the upcoming Post-War & Contemporary evening sale:\n\n• Gerhard Richter, Abstraktes Bild (1992)\n• Julie Mehretu — both works\n\nI'd also like to request condition reports and provenance documentation for these pieces.\n\nBest regards.`,
    'Send the catalogue.': `Dear Christie's,\n\nThank you for the preview. Could you please send me the full printed catalogue for the Post-War & Contemporary evening sale?\n\nMy shipping address is on file. I'd also appreciate being added to the specialist preview list for any pre-sale exhibitions.\n\nThank you.`,
    'What are the buyer\'s premiums?': `Dear Christie's,\n\nThank you for the notification. Before I register any bids, could you confirm the current buyer's premium schedule?\n\nAlso, are there any private treaty opportunities available for the Richter before the live auction?\n\nRegards.`,

    // James Thornton — Koons
    'Let\'s proceed at $1M.': `Dear James,\n\nThank you for the follow-up — great meeting you as well.\n\nI'm prepared to make an offer of $1,000,000 for the Koons, subject to satisfactory review of the condition report and provenance documentation you mentioned.\n\nPlease convey this to your client, and let me know how they'd like to proceed.\n\nBest regards.`,
    'Send the condition report.': `James,\n\nThanks again for a productive studio visit. I'm quite interested in the piece.\n\nWhen you have a moment, please send over the condition report and provenance papers. I'd also appreciate any exhibition history documentation you have.\n\nLet's reconnect once I've had a chance to review everything.\n\nCheers.`,
    'I need to think about it.': `James,\n\nThanks for the details on the Koons — it's a compelling piece at that price range.\n\nI'd like to take a few days to consider it against my current acquisition priorities. Could you let me know the seller's timeline? I don't want to miss the window if there are other interested parties.\n\nI'll be in touch by end of week.`,

    // Artnet News (no replies)

    // Hauser & Wirth
    'I\'ll attend!': `Dear Hauser & Wirth,\n\nPlease RSVP me for the opening reception of Louise Bourgeois: The Fabric of Memory on March 8.\n\nI'm a long-time admirer of Bourgeois' textile works — this exhibition sounds extraordinary. Will there be a catalogue, and are any of the works available for acquisition?\n\nLooking forward to it.`,
    'Add me to the list.': `Dear Hauser & Wirth,\n\nPlease add me to the RSVP list for the Bourgeois opening on March 8.\n\nI'd also be interested in any private collector previews or guided tours with the curator, if available.\n\nThank you.`,

    // Insurance
    'Approved, send for signature.': `Dear Insurance Department,\n\nI've reviewed the renewal documents and everything looks in order. Please send the final policy for e-signature at your convenience.\n\nOne note: I'll be adding two new acquisitions to the policy next month — please flag this for a mid-term adjustment.\n\nThank you for the prompt renewal notice.`,
    'Can we review the valuations?': `Dear Insurance Department,\n\nBefore I sign the renewal, I'd like to review the current appraisal values. I believe several pieces in the collection have appreciated significantly since the last assessment.\n\nCould we schedule a call to discuss an updated appraisal? I want to make sure the coverage accurately reflects current market values.\n\nThank you.`,
};

const initialEmails = () => [
    {
        id: 1, sender: 'Margaux Bellamy', email: 'margaux@bellamy.art',
        subject: 'Private Sale — Basquiat "Untitled" 1982',
        preview: 'Dear collector, I have a rare early Basquiat that just came off a private estate...',
        time: '10:07 AM', date: 'Feb 23, 2026', unread: true, starred: true, hasAttachment: true,
        category: 'primary', archived: false, deleted: false,
        thread: [
            {
                id: 'm1', sender: 'Margaux Bellamy', email: 'margaux@bellamy.art',
                time: 'Feb 23, 2026, 10:07 AM', to: 'me',
                body: `Dear collector,\n\nI have a <b>rare early Basquiat</b> that just came off a private estate. Before it goes to auction, I wanted to offer it to a select few.\n\nThis particular work — "Untitled (Crown Study)" from 1982 — has impeccable provenance:\n\n• Acquired directly from the artist, 1983\n• Estate of Robert Farris Thompson\n• Exhibited: Whitney Biennial 1985, Documenta IX\n\nThe asking price is <b>$285,000</b> — negotiable for the right buyer.\n\nPlease let me know if you'd like to schedule a private viewing at my gallery this week.`,
                signature: 'Margaux Bellamy — Bellamy Advisory, New York / Paris',
            },
        ],
        smartReplies: ['I\'d love to see it!', 'What\'s the condition report?', 'Can we schedule a call?'],
    },
    {
        id: 2, sender: 'Sotheby\'s', email: 'notifications@sothebys.com',
        subject: 'Lot #47 — Your Bid Was Successful',
        preview: 'Your bid on Lot #47 — "Untitled" by Cy Twombly was successful...',
        time: '8:45 PM', date: 'Feb 22, 2026', unread: true, starred: false, hasAttachment: false,
        category: 'updates', archived: false, deleted: false,
        thread: [
            {
                id: 'm2', sender: 'Sotheby\'s', email: 'notifications@sothebys.com',
                time: 'Feb 22, 2026, 8:45 PM', to: 'me',
                body: `Your bid on <b>Lot #47 — "Untitled" by Cy Twombly</b> was successful.\n\n<b>Final hammer price:</b> $892,000\n<b>Buyer's premium (25%):</b> $223,000\n<b>Total:</b> $1,115,000\n\nPayment is due within 30 days. Congratulations.\n\nPlease contact our client services team to arrange shipping and insurance.`,
            },
        ],
        smartReplies: ['Thank you!', 'Please arrange shipping.', 'Can I pay by wire?'],
    },
    {
        id: 3, sender: 'Viktor Hesse', email: 'v.hesse@kunsthalle.de',
        subject: 'Re: Exhibition Proposal — "Flux States"',
        preview: 'Thank you for considering the Kunsthalle for your upcoming show...',
        time: 'Feb 22', date: 'Feb 22, 2026', unread: false, starred: false, hasAttachment: true,
        category: 'primary', archived: false, deleted: false,
        thread: [
            {
                id: 'm3a', sender: 'You', email: 'collector@artlife.game',
                time: 'Feb 20, 2026, 3:15 PM', to: 'Viktor Hesse',
                body: `Dear Viktor,\n\nI'm writing to propose an exhibition at the Kunsthalle for my upcoming series "Flux States." The collection consists of 12 mixed-media works exploring the intersection of digital and physical materialisms.\n\nWould you be open to discussing the possibility?`,
            },
            {
                id: 'm3b', sender: 'Viktor Hesse', email: 'v.hesse@kunsthalle.de',
                time: 'Feb 22, 2026, 9:30 AM', to: 'me',
                body: `Thank you for considering the Kunsthalle for your upcoming show. I've reviewed the portfolio and I think we can accommodate a 6-week run in our <b>East Wing Gallery</b> (400 sqm).\n\nAvailable windows:\n• September 15 – October 28, 2026\n• January 12 – February 23, 2027\n\nPlease find attached our standard exhibition agreement and technical specifications.`,
                signature: 'Viktor Hesse — Director, Kunsthalle Bremen',
            },
        ],
        smartReplies: ['September works perfectly!', 'Let me review the terms.', 'Can we schedule a walkthrough?'],
    },
    {
        id: 4, sender: 'Art Basel', email: 'vip@artbasel.com',
        subject: 'VIP Preview Invitation — Art Basel Miami 2026',
        preview: 'You are cordially invited to the VIP Preview of Art Basel Miami Beach...',
        time: 'Feb 21', date: 'Feb 21, 2026', unread: false, starred: true, hasAttachment: false,
        category: 'promotions', archived: false, deleted: false,
        thread: [
            {
                id: 'm4', sender: 'Art Basel', email: 'vip@artbasel.com',
                time: 'Feb 21, 2026, 11:00 AM', to: 'me',
                body: `You are cordially invited to the <b>VIP Preview</b> of Art Basel Miami Beach, December 2-4.\n\nYour collector tier grants access to:\n• First View: December 2, 11 AM – 7 PM\n• VIP Lounge by Ruinart\n• Exclusive collector dinners\n\nPlease RSVP by November 1.`,
            },
        ],
        smartReplies: ['I\'ll be there!', 'Can I bring a guest?', 'Please RSVP for me.'],
    },
    {
        id: 5, sender: 'Elena Vasquez', email: 'elena@vasquezgallery.com',
        subject: 'Commission Update — "Architecture of Forgetting III"',
        preview: 'Hi, just wanted to give you a quick update on the third panel...',
        time: 'Feb 20', date: 'Feb 20, 2026', unread: false, starred: false, hasAttachment: true,
        category: 'primary', archived: false, deleted: false,
        thread: [
            {
                id: 'm5', sender: 'Elena Vasquez', email: 'elena@vasquezgallery.com',
                time: 'Feb 20, 2026, 2:15 PM', to: 'me',
                body: `Hi,\n\nJust wanted to give you a quick update. The third panel is almost complete and the patina treatment is curing beautifully.\n\nI've attached progress photos. The scale is 84" × 120" as discussed. Expect completion in <b>3 weeks</b>.\n\nWould you like to visit the studio to see it before final varnishing?`,
                signature: 'Elena Vasquez Studio, Mexico City',
            },
        ],
        smartReplies: ['Looks amazing!', 'Yes, I\'d love to visit!', 'When can I see it?'],
    },
    {
        id: 6, sender: 'Christie\'s', email: 'lots@christies.com',
        subject: 'Upcoming: Post-War & Contemporary Art — May 2026',
        preview: 'Preview now open for our flagship Post-War & Contemporary evening sale...',
        time: 'Feb 19', date: 'Feb 19, 2026', unread: false, starred: false, hasAttachment: false,
        category: 'promotions', archived: false, deleted: false,
        thread: [
            {
                id: 'm6', sender: 'Christie\'s', email: 'lots@christies.com',
                time: 'Feb 19, 2026, 10:00 AM', to: 'me',
                body: `Preview now open for our flagship <b>Post-War & Contemporary</b> evening sale.\n\nHighlights include:\n• Gerhard Richter, <i>Abstraktes Bild</i> (1992) — Est. $8-12M\n• Two significant works by Julie Mehretu\n• A major Yoshitomo Nara from the Saatchi Collection\n\nOnline preview: <a href="#">View catalogue</a>\nLive auction: May 15, 2026`,
            },
        ],
        smartReplies: ['Register my interest.', 'Send the catalogue.', 'What are the buyer\'s premiums?'],
    },
    {
        id: 7, sender: 'James Thornton', email: 'j.thornton@whitecube.com',
        subject: 'Follow-up from Studio Visit',
        preview: 'Great meeting you yesterday. As discussed, I\'ll send over the condition report...',
        time: 'Feb 18', date: 'Feb 18, 2026', unread: false, starred: false, hasAttachment: false,
        category: 'primary', archived: false, deleted: false,
        thread: [
            {
                id: 'm7', sender: 'James Thornton', email: 'j.thornton@whitecube.com',
                time: 'Feb 18, 2026, 4:30 PM', to: 'me',
                body: `Great meeting you yesterday. As discussed, I'll send over the condition report and provenance documentation for the Koons by end of week.\n\nThe asking is <b>$1.2M</b> but there's room given the client's timeline. I think <b>$950K–$1.05M</b> is achievable.\n\nLet me know your thoughts.`,
                signature: 'James Thornton — Senior Director, White Cube London',
            },
        ],
        smartReplies: ['Let\'s proceed at $1M.', 'Send the condition report.', 'I need to think about it.'],
    },
    {
        id: 8, sender: 'Artnet News', email: 'digest@artnet.com',
        subject: 'Market Wrap: Blue-Chip Prices Surge 12% in Q1',
        preview: 'This week in the art market: Blue-chip contemporary prices rose 12% in Q1...',
        time: 'Feb 17', date: 'Feb 17, 2026', unread: false, starred: false, hasAttachment: false,
        category: 'social', archived: false, deleted: false,
        thread: [
            {
                id: 'm8', sender: 'Artnet News', email: 'digest@artnet.com',
                time: 'Feb 17, 2026, 8:00 AM', to: 'me',
                body: `<b>Market Wrap — Week of Feb 17</b>\n\nBlue-chip contemporary prices rose <b>12% in Q1</b>, driven by strong Asian demand. Meanwhile, emerging artist markets saw a correction of 8%.\n\n<b>Notable sales this week:</b>\n• Basquiat "Untitled" — $45M at Phillips\n• Kusama Infinity Net — $12.8M at Sotheby's\n• Julie Mehretu "Retopistics" — $9.6M at Christie's\n\n<a href="#">Read full analysis →</a>`,
            },
        ],
        smartReplies: [],
    },
    {
        id: 9, sender: 'Hauser & Wirth', email: 'info@hauserwirth.com',
        subject: 'New Exhibition: Louise Bourgeois — "The Fabric of Memory"',
        preview: 'Join us for the opening reception of Louise Bourgeois: The Fabric of Memory...',
        time: 'Feb 16', date: 'Feb 16, 2026', unread: false, starred: false, hasAttachment: false,
        category: 'promotions', archived: false, deleted: false,
        thread: [
            {
                id: 'm9', sender: 'Hauser & Wirth', email: 'info@hauserwirth.com',
                time: 'Feb 16, 2026, 12:00 PM', to: 'me',
                body: `Join us for the opening reception of <b>Louise Bourgeois: The Fabric of Memory</b>, featuring rarely seen textile works from the artist's estate.\n\n<b>Opening:</b> March 8, 6–9 PM\n<b>Location:</b> Hauser & Wirth, 22nd Street, New York\n<b>Exhibition runs:</b> March 8 – May 3, 2026\n\nRSVP required. <a href="#">Reserve your spot →</a>`,
            },
        ],
        smartReplies: ['I\'ll attend!', 'Add me to the list.'],
    },
    {
        id: 10, sender: 'Insurance Dept.', email: 'claims@artinsure.com',
        subject: 'Policy Renewal — Collection Coverage 2026',
        preview: 'Your annual collection insurance policy is due for renewal on March 15, 2026...',
        time: 'Feb 15', date: 'Feb 15, 2026', unread: false, starred: false, hasAttachment: true,
        category: 'updates', archived: false, deleted: false,
        thread: [
            {
                id: 'm10', sender: 'Insurance Dept.', email: 'claims@artinsure.com',
                time: 'Feb 15, 2026, 9:00 AM', to: 'me',
                body: `Your annual collection insurance policy is due for renewal on <b>March 15, 2026</b>.\n\nBased on your updated appraisals:\n• Total insured value: <b>$4,250,000</b>\n• Annual premium: <b>$12,750</b> (0.3%)\n• Coverage: All-risk, wall-to-wall transit\n\nPlease review the attached renewal documents and return signed copy by March 1.`,
            },
        ],
        smartReplies: ['Approved, send for signature.', 'Can we review the valuations?'],
    },
];

const NAV_ITEMS = [
    { icon: '📥', label: 'Inbox', id: 'inbox' },
    { icon: '⭐', label: 'Starred', id: 'starred' },
    { icon: '📨', label: 'Sent', id: 'sent' },
    { icon: '📝', label: 'Drafts', id: 'drafts' },
    { icon: '📦', label: 'All Mail', id: 'all' },
    { icon: '🗑️', label: 'Trash', id: 'trash' },
];

const LABEL_ITEMS = [
    { icon: '●', label: 'Gallery Business', color: '#c44' },
    { icon: '●', label: 'Auction Alerts', color: '#f4b400' },
    { icon: '●', label: 'Insurance', color: '#1a73e8' },
    { icon: '●', label: 'Travel / Art Fairs', color: '#44aa66' },
];

const CATEGORIES = [
    { id: 'primary', label: 'Primary', icon: '📥' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'promotions', label: 'Promotions', icon: '🏷️' },
    { id: 'updates', label: 'Updates', icon: '💬' },
];

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export default function GmailDesignGuide({ onClose, initialCompose }) {
    // ── State ──
    const [emails, setEmails] = useState(initialEmails);
    const [view, setView] = useState('inbox');           // 'inbox' | 'thread' | 'sent'
    const [selectedEmailId, setSelectedEmailId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('primary');
    const [activeNav, setActiveNav] = useState('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCompose, setShowCompose] = useState(!!initialCompose);
    const [replyMode, setReplyMode] = useState(null);     // null | 'reply' | 'replyAll' | 'forward'
    const [replyText, setReplyText] = useState('');
    const [composeData, setComposeData] = useState(initialCompose || { to: '', subject: '', body: '' });
    const [sentEmails, setSentEmails] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const threadEndRef = useRef(null);
    const replyBoxRef = useRef(null);
    const [aiState, setAiState] = useState('idle');        // 'idle' | 'thinking' | 'typing' | 'done'
    const [aiTypedText, setAiTypedText] = useState('');
    const [aiFullText, setAiFullText] = useState('');
    const aiIntervalRef = useRef(null);
    const [showAiAssistant, setShowAiAssistant] = useState(false);

    // ── Derived ──
    const selectedEmail = useMemo(() => emails.find(e => e.id === selectedEmailId), [emails, selectedEmailId]);

    const visibleEmails = useMemo(() => {
        let filtered = emails.filter(e => !e.archived && !e.deleted);

        // Nav filter
        if (activeNav === 'starred') filtered = filtered.filter(e => e.starred);
        else if (activeNav === 'trash') filtered = emails.filter(e => e.deleted);
        else if (activeNav === 'sent') return sentEmails;
        else if (activeNav === 'all') filtered = emails.filter(e => !e.deleted);

        // Category filter (only for inbox)
        if (activeNav === 'inbox') {
            filtered = filtered.filter(e => e.category === activeCategory);
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.sender.toLowerCase().includes(q) ||
                e.subject.toLowerCase().includes(q) ||
                e.preview.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [emails, activeNav, activeCategory, searchQuery, sentEmails]);

    const categoryBadges = useMemo(() => {
        const counts = {};
        emails.filter(e => !e.archived && !e.deleted && e.unread).forEach(e => {
            counts[e.category] = (counts[e.category] || 0) + 1;
        });
        return counts;
    }, [emails]);

    // ── Actions ──
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
    }, [selectedEmailId]);

    const deleteEmail = useCallback((id) => {
        setEmails(prev => prev.map(em => em.id === id ? { ...em, deleted: true } : em));
        if (selectedEmailId === id) { setView('inbox'); setSelectedEmailId(null); }
    }, [selectedEmailId]);

    const openThread = useCallback((email) => {
        setSelectedEmailId(email.id);
        markRead(email.id);
        setView('thread');
        setReplyMode(null);
        setReplyText('');
    }, [markRead]);

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
        setShowAiAssistant(true); // Show AI assistant when starting a reply
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        setTimeout(() => replyBoxRef.current?.focus(), 100);
    }, []);

    // AI Smart Reply — thinking → typing → done
    const triggerAiReply = useCallback((suggestionText) => {
        const fullReply = AI_REPLIES[suggestionText] || suggestionText;
        setReplyMode('reply');
        setReplyText('');
        setAiState('thinking');
        setAiTypedText('');
        setAiFullText(fullReply);
        setShowAiAssistant(false); // Dismiss assistant when AI starts

        // Phase 1: "Thinking" for 1.2–2s
        const thinkDelay = 1200 + Math.random() * 800;
        setTimeout(() => {
            setAiState('typing');
            let charIndex = 0;
            // Phase 2: Typewriter at variable speed
            aiIntervalRef.current = setInterval(() => {
                charIndex++;
                setAiTypedText(fullReply.substring(0, charIndex));
                setReplyText(fullReply.substring(0, charIndex));
                if (charIndex >= fullReply.length) {
                    clearInterval(aiIntervalRef.current);
                    aiIntervalRef.current = null;
                    setAiState('done');
                }
            }, 18 + Math.random() * 12); // ~20-30ms per char = realistic typing
        }, thinkDelay);
    }, []);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => { if (aiIntervalRef.current) clearInterval(aiIntervalRef.current); };
    }, []);

    const sendReply = useCallback(() => {
        if (!replyText.trim() || !selectedEmailId) return;

        const now = new Date();
        const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

        const newMessage = {
            id: `reply-${Date.now()}`,
            sender: 'You',
            email: 'collector@artlife.game',
            time: timeStr,
            to: selectedEmail?.sender || 'Unknown',
            body: replyText.replace(/\n/g, '<br>'),
        };

        setEmails(prev => prev.map(em =>
            em.id === selectedEmailId
                ? { ...em, thread: [...em.thread, newMessage] }
                : em
        ));

        // Also add to sent
        setSentEmails(prev => [{
            id: Date.now(),
            sender: 'Me',
            email: 'collector@artlife.game',
            subject: `Re: ${selectedEmail?.subject}`,
            preview: replyText.substring(0, 80),
            time: 'Just now',
            date: timeStr,
            unread: false,
            starred: false,
            hasAttachment: false,
            category: 'primary',
        }, ...prev]);

        setReplyMode(null);
        setReplyText('');
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [replyText, selectedEmailId, selectedEmail]);

    const sendCompose = useCallback(() => {
        if (!composeData.to.trim() || !composeData.body.trim()) return;

        setSentEmails(prev => [{
            id: Date.now(),
            sender: 'Me',
            email: 'collector@artlife.game',
            subject: composeData.subject || '(no subject)',
            preview: composeData.body.substring(0, 80),
            time: 'Just now',
            date: new Date().toLocaleString(),
            unread: false,
            starred: false,
            hasAttachment: false,
            category: 'primary',
        }, ...prev]);

        setShowCompose(false);
        setComposeData({ to: '', subject: '', body: '' });
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

    // ── Keyboard ──
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                if (showCompose) setShowCompose(false);
                else if (replyMode) setReplyMode(null);
                else if (view === 'thread') backToInbox();
                else onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, view, showCompose, replyMode, backToInbox]);

    // ── Render ──
    return (
        <div className="gmail-guide-overlay">
            {/* ═══ Top Bar ═══ */}
            <div className="gmail-topbar">
                <button className="gmail-topbar-hamburger" title="Menu">☰</button>
                <div className="gmail-topbar-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="22" viewBox="0 0 75 56" fill="none">
                        <path d="M67.6 0H7.4L37.5 22.5L67.6 0Z" fill="#EA4335" />
                        <path d="M67.6 0L37.5 22.5V56H67.6C71.7 56 75 52.6 75 48.5V7.5C75 3.4 71.7 0 67.6 0Z" fill="#FBBC04" />
                        <path d="M0 7.5V48.5C0 52.6 3.3 56 7.4 56H37.5V22.5L7.4 0C3.3 0 0 3.4 0 7.5Z" fill="#34A853" />
                        <path d="M0 7.5V12L37.5 34.5L75 12V7.5C75 3.4 71.7 0 67.6 0L37.5 22.5L7.4 0C3.3 0 0 3.4 0 7.5Z" fill="#C5221F" />
                    </svg>
                    Gmail
                </div>
                <div className="gmail-topbar-search">
                    <span className="gmail-topbar-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search mail"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#5f6368' }}
                            onClick={() => setSearchQuery('')}
                        >✕</button>
                    )}
                </div>
                <div className="gmail-topbar-actions">
                    <button className="gmail-topbar-icon" title="Help">❓</button>
                    <button className="gmail-topbar-icon" title="Settings">⚙️</button>
                    <div className="gmail-topbar-avatar" title="Account">S</div>
                </div>
                <button className="gmail-topbar-close" onClick={onClose}>✕ Close</button>
            </div>

            <div className="gmail-main">
                {/* ═══ Sidebar ═══ */}
                <div className="gmail-sidebar">
                    <button className="gmail-compose-btn" onClick={() => { setShowCompose(true); setComposeData({ to: '', subject: '', body: '' }); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#001d35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Compose
                    </button>

                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            className={`gmail-nav-item${activeNav === item.id ? ' gmail-nav-item--active' : ''}`}
                            onClick={() => { setActiveNav(item.id); setView('inbox'); setSelectedEmailId(null); }}
                        >
                            <span className="gmail-nav-icon">{item.icon}</span>
                            <span className="gmail-nav-label">{item.label}</span>
                            {item.id === 'inbox' && categoryBadges.primary > 0 && (
                                <span className="gmail-nav-count">{Object.values(categoryBadges).reduce((a, b) => a + b, 0)}</span>
                            )}
                            {item.id === 'drafts' && <span className="gmail-nav-count">0</span>}
                            {item.id === 'sent' && sentEmails.length > 0 && (
                                <span className="gmail-nav-count">{sentEmails.length}</span>
                            )}
                        </button>
                    ))}

                    <hr className="gmail-nav-divider" />
                    <div style={{ padding: '8px 24px', fontSize: 12, color: '#5f6368', fontWeight: 500 }}>LABELS</div>
                    {LABEL_ITEMS.map((item) => (
                        <button key={item.label} className="gmail-nav-item">
                            <span className="gmail-nav-icon" style={{ color: item.color, fontSize: 10 }}>{item.icon}</span>
                            <span className="gmail-nav-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* ═══ Content ═══ */}
                <div className="gmail-content">
                    {/* ── Inbox View ── */}
                    {view === 'inbox' && (
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
                                <button className="gmail-action-icon" title="Refresh" onClick={() => setEmails(initialEmails())}>↻</button>
                                <div className="gmail-pagination">
                                    <span>{visibleEmails.length > 0 ? `1–${visibleEmails.length} of ${visibleEmails.length}` : 'No conversations'}</span>
                                </div>
                            </div>

                            {/* Email List */}
                            <div className="gmail-email-list">
                                {visibleEmails.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#5f6368', fontSize: 14 }}>
                                        {searchQuery ? `No results for "${searchQuery}"` : activeNav === 'trash' ? 'Trash is empty' : activeNav === 'starred' ? 'No starred messages' : 'No conversations'}
                                    </div>
                                )}
                                {visibleEmails.map((email) => (
                                    <div
                                        key={email.id}
                                        className={`gmail-email-row${email.unread ? ' gmail-email-row--unread' : ''}${selectedIds.has(email.id) ? ' gmail-email-row--selected' : ''}`}
                                        onClick={() => email.thread ? openThread(email) : null}
                                    >
                                        <button className="gmail-email-checkbox" onClick={(e) => toggleSelect(email.id, e)}>
                                            {selectedIds.has(email.id) ? '☑' : '☐'}
                                        </button>
                                        <button
                                            className={`gmail-email-star${(email.starred || (emails.find(em => em.id === email.id)?.starred)) ? ' gmail-email-star--active' : ''}`}
                                            onClick={(e) => toggleStar(email.id, e)}
                                        >
                                            {(email.starred || (emails.find(em => em.id === email.id)?.starred)) ? '★' : '☆'}
                                        </button>
                                        <div className="gmail-email-sender">{email.sender}</div>
                                        <div className="gmail-email-content">
                                            <span className="gmail-email-subject">{email.subject}</span>
                                            <span className="gmail-email-separator"> — </span>
                                            <span className="gmail-email-preview">{email.preview}</span>
                                        </div>
                                        {email.hasAttachment && <span className="gmail-email-attachment">📎</span>}
                                        <span className="gmail-email-time">{email.time}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Thread View ── */}
                    {view === 'thread' && selectedEmail && (
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
                                </div>
                            ))}

                            {/* Attachment indicator */}
                            {selectedEmail.hasAttachment && (
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
                                                    <input
                                                        className="gmail-compose-field-input"
                                                        placeholder="Add recipients..."
                                                        style={{ fontSize: 13 }}
                                                    />
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
                                    <div className="gmail-inline-reply-footer">
                                        <button className="gmail-send-btn" onClick={sendReply} disabled={!replyText.trim()}>
                                            <span className="gmail-send-btn-main">Send</span>
                                            <span className="gmail-send-btn-arrow">▾</span>
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
                    )}
                </div>
            </div>

            {/* ═══ Compose Window ═══ */}
            {showCompose && (
                <div className="gmail-compose">
                    <div className="gmail-compose-header">
                        <span className="gmail-compose-header-title">New Message</span>
                        <button className="gmail-compose-header-btn" title="Minimize">—</button>
                        <button className="gmail-compose-header-btn" title="Pop out">⬜</button>
                        <button className="gmail-compose-header-btn" title="Close" onClick={() => setShowCompose(false)}>✕</button>
                    </div>
                    <div className="gmail-compose-body">
                        <div className="gmail-compose-field">
                            <span className="gmail-compose-field-label">To</span>
                            <input
                                className="gmail-compose-field-input"
                                placeholder="Recipients"
                                value={composeData.to}
                                onChange={(e) => setComposeData(p => ({ ...p, to: e.target.value }))}
                            />
                            <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', cursor: 'pointer' }}>Cc</span>
                            <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', cursor: 'pointer', marginLeft: 8 }}>Bcc</span>
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
            )}

            {/* ═══ MOBILE LAYOUT ═══ */}
            {/* Mobile Search Bar — visible only on narrow viewports */}
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

            {/* Mobile Inbox Rows */}
            {view === 'inbox' && (
                <div className="gmail-mobile-inbox gmail-mobile-only" style={{ flex: 1, overflowY: 'auto', paddingBottom: 128, flexDirection: 'column' }}>
                    {visibleEmails.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#5D5C5D', fontSize: 14 }}>
                            {searchQuery ? `No results for "${searchQuery}"` : 'No conversations'}
                        </div>
                    )}
                    {visibleEmails.map((email) => (
                        <div key={email.id} className="gmail-mobile-email-row" onClick={() => email.thread ? openThread(email) : null}>
                            <div className="gmail-mobile-email-avatar" style={{ background: getAvatarColor(email.sender) }}>
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

            {/* Mobile Thread View */}
            {view === 'thread' && selectedEmail && (
                <div className="gmail-mobile-thread gmail-mobile-only" style={{ flex: 1, overflowY: 'auto', paddingBottom: 180, flexDirection: 'column' }}>
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
                    <div style={{ padding: '16px 16px 8px' }}>
                        <div className="gmail-mobile-thread-subject">{selectedEmail.subject}</div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#333', background: '#eee', padding: '2px 6px', borderRadius: 4 }}>
                            Inbox
                        </span>
                    </div>
                    {selectedEmail.thread.map((msg) => (
                        <div key={msg.id} className="gmail-mobile-message">
                            <div className="gmail-mobile-message-header">
                                <div className="gmail-mobile-message-avatar" style={{ background: getAvatarColor(msg.sender) }}>
                                    {msg.sender.charAt(0)}
                                </div>
                                <div className="gmail-mobile-message-meta">
                                    <div className="gmail-mobile-message-sender">{msg.sender}</div>
                                    <div className="gmail-mobile-message-to">to {msg.to}</div>
                                </div>
                                <span className="gmail-mobile-message-time">{msg.time.split(',').pop()?.trim()}</span>
                            </div>
                            <div
                                className="gmail-mobile-message-body"
                                dangerouslySetInnerHTML={{ __html: msg.body.replace(/\n/g, '<br>') }}
                            />
                            {msg.signature && (
                                <div style={{ fontSize: 13, color: '#5D5C5D', marginTop: 12, fontStyle: 'italic' }}>{msg.signature}</div>
                            )}
                        </div>
                    ))}
                    {selectedEmail.hasAttachment && (
                        <div className="gmail-attachment" style={{ marginLeft: 16, marginRight: 16 }}>
                            <span className="gmail-attachment-icon">📄</span>
                            <div className="gmail-attachment-info">
                                <div className="gmail-attachment-name">Condition_Report.pdf</div>
                                <div className="gmail-attachment-size">2.4 MB</div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Smart Replies */}
                    {!replyMode && selectedEmail.smartReplies?.length > 0 && (
                        <div className="gmail-mobile-only" style={{ padding: '8px 16px', gap: 8, flexWrap: 'wrap' }}>
                            {selectedEmail.smartReplies.map((reply) => (
                                <button
                                    key={reply}
                                    className="gmail-smart-reply"
                                    onClick={() => triggerAiReply(reply)}
                                    style={{ fontSize: 13, padding: '6px 12px' }}
                                >
                                    ✨ {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Inline reply for mobile */}
                    {replyMode && (
                        <div style={{ margin: '8px 16px 16px', border: '1px solid #dadce0', borderRadius: 8, background: '#fff' }}>
                            <textarea
                                ref={replyBoxRef}
                                className="gmail-inline-reply-editor"
                                placeholder="Write your reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
                                rows={4}
                            />
                            <div style={{ display: 'flex', padding: '8px 12px', gap: 8 }}>
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

            {/* Mobile Reply/Forward Bar */}
            {view === 'thread' && selectedEmail && !replyMode && (
                <div className="gmail-mobile-reply-bar">
                    <button className="gmail-mobile-reply-btn gmail-mobile-reply-btn--forward" onClick={() => startReply('forward')}>
                        ↪ Forward
                    </button>
                    <button className="gmail-mobile-reply-btn gmail-mobile-reply-btn--reply" onClick={() => startReply('reply')}>
                        ↩ Reply
                    </button>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <div className="gmail-mobile-bottomnav">
                <button
                    className={`gmail-mobile-nav-item${activeNav === 'inbox' ? ' gmail-mobile-nav-item--active' : ''}`}
                    onClick={() => { setActiveNav('inbox'); setView('inbox'); setSelectedEmailId(null); }}
                >
                    <span className="gmail-mobile-nav-icon">✉️</span>
                    {Object.values(categoryBadges).reduce((a, b) => a + b, 0) > 0 && (
                        <span className="gmail-mobile-nav-badge">{Object.values(categoryBadges).reduce((a, b) => a + b, 0)}</span>
                    )}
                    Mail
                </button>
                <button className="gmail-mobile-nav-item" onClick={() => { setActiveNav('all'); setView('inbox'); }}>
                    <span className="gmail-mobile-nav-icon">🎥</span>
                    Meet
                </button>
            </div>

            {/* ═══ AI Assistant Popup ═══ */}
            {showAiAssistant && replyMode && selectedEmail?.smartReplies?.length > 0 && (
                <div className="gmail-ai-assistant">
                    <div className="gmail-ai-assistant-header">
                        <span className="gmail-ai-assistant-icon">🤖</span>
                        <span className="gmail-ai-assistant-title">AI Reply Assistant</span>
                        <button className="gmail-ai-assistant-close" onClick={() => setShowAiAssistant(false)}>✕</button>
                    </div>
                    <div className="gmail-ai-assistant-body">
                        <div className="gmail-ai-assistant-prompt">What would you like to reply?</div>
                        <div className="gmail-ai-assistant-suggestions">
                            {selectedEmail.smartReplies.map((reply) => (
                                <button
                                    key={reply}
                                    className="gmail-ai-assistant-chip"
                                    onClick={() => triggerAiReply(reply)}
                                >
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
        </div>
    );
}
