/**
 * emailData.js — Gmail Email Client Data Layer
 *
 * All constants, mock emails (with attachment data), AI replies,
 * helper functions, and static configuration for the Gmail UI.
 */

import { CONTACTS } from '../../../data/contacts.js';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

export const AVATAR_COLORS = ['#c44', '#1a73e8', '#f4b400', '#44aa66', '#7b1fa2', '#e67c00', '#00838f', '#c62828'];

export function getAvatarColor(name) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ════════════════════════════════════════════════════════════
// AI Companion
// ════════════════════════════════════════════════════════════

export const AI_COMPANION_NAME = 'Ari';

export const AI_THINKING_MESSAGES = [
    'Scanning email...',
    'Reading through this...',
    'Let me take a look...',
    'Analyzing the details...',
    'Checking this out...',
];

// AI-generated full replies mapped to each smart reply suggestion
export const AI_REPLIES = {
    // Margaux Bellamy — Basquiat
    'I\'d love to see it!': `Dear Margaux,\n\nThank you for thinking of me — the provenance is remarkable. I'd love to schedule a private viewing this week. I'm available Thursday or Friday afternoon.\n\nBest regards.`,
    'What\'s the condition report?': `Dear Margaux,\n\nThis is very interesting. Before I commit to a viewing, could you send over the full condition report? I'd like to review it with my conservator.\n\nAlso, has the work been subject to any restoration or inpainting?\n\nThank you.`,
    'Can we schedule a call?': `Dear Margaux,\n\nI'd prefer to discuss the details over the phone if possible. Are you available for a call tomorrow morning? I have a few questions about the provenance chain and the seller's timeline.\n\nBest.`,

    // Sotheby's — Bid Won
    'Thank you!': `Dear Sotheby's Client Services,\n\nThank you for confirming the successful bid. I'm delighted with the acquisition.\n\nPlease let me know the payment instructions and I'll arrange the wire transfer promptly.\n\nBest regards.`,
    'Please arrange shipping.': `Dear Sotheby's Client Services,\n\nPlease arrange shipping to my residence at your earliest convenience. I'll need full transit insurance and white-glove delivery.\n\nPlease send the shipping estimate and timeline.\n\nThank you.`,
    'Can I pay by wire?': `Dear Sotheby's Client Services,\n\nI'd like to arrange payment by wire transfer. Could you please send me the bank details and any reference numbers I should include?\n\nI'll process the payment within the week.\n\nThank you.`,

    // Viktor Hesse — Exhibition
    'September works perfectly!': `Dear Viktor,\n\nSeptember 15 – October 28 works perfectly for my schedule. I'm excited about the East Wing Gallery — the scale is ideal for the "Flux States" series.\n\nI'll review the exhibition agreement this week and get back to you with any questions.\n\nBest regards.`,
    'Let me review the terms.': `Dear Viktor,\n\nThank you for the generous offer. I'd like to take a few days to review the exhibition agreement and technical specifications with my team.\n\nI'll have comments back to you by end of next week.\n\nBest.`,
    'Can we schedule a walkthrough?': `Dear Viktor,\n\nBefore committing, I'd love to do a walkthrough of the East Wing Gallery. Could we schedule a visit in the coming weeks? I want to see the space in person to plan the installation.\n\nBest regards.`,

    // Art Basel
    'I\'ll be there!': `Dear Art Basel Team,\n\nThank you for the VIP invitation. I'd be delighted to attend the preview on December 2.\n\nPlease confirm my RSVP and send any additional details about the collector events.\n\nBest regards.`,
    'Can I bring a guest?': `Dear Art Basel Team,\n\nThank you for the invitation. I'd like to bring a guest — my art advisor. Is there a +1 option for VIP cardholders?\n\nPlease let me know.\n\nBest regards.`,
    'Please RSVP for me.': `Dear Art Basel Team,\n\nPlease confirm my RSVP for the VIP Preview, December 2-4. I'll be attending all three days.\n\nThank you.`,

    // Elena Vasquez — Commission
    'Looks amazing!': `Dear Elena,\n\nThe progress photos look stunning — the patina treatment is exactly what I envisioned. I can't wait to see it in person.\n\nThank you for the update!\n\nBest.`,
    'Yes, I\'d love to visit!': `Dear Elena,\n\nI'd love to visit the studio before final varnishing. How does next week look for you? I'm flexible on timing.\n\nLooking forward to seeing the piece in person.\n\nBest regards.`,
    'When can I see it?': `Dear Elena,\n\nThis looks wonderful. When would be the best time to visit the studio? I'd like to see the panel before you apply the final varnish.\n\nPlease let me know some available dates.\n\nThank you.`,

    // Christie's
    'Register my interest.': `Dear Christie's,\n\nPlease register my interest in the upcoming Post-War & Contemporary evening sale. I'm particularly interested in the Richter and Mehretu lots.\n\nPlease send the full catalogue and condition reports when available.\n\nThank you.`,
    'Send the catalogue.': `Dear Christie's,\n\nPlease send me the full catalogue for the Post-War & Contemporary evening sale. I'd also appreciate condition reports for the highlighted lots.\n\nThank you.`,
    'What are the buyer\'s premiums?': `Dear Christie's,\n\nCould you clarify the buyer's premium structure for the upcoming Post-War & Contemporary sale? I'd like to understand the full cost breakdown before placing bids.\n\nThank you.`,

    // James Thornton — Koons
    'Let\'s proceed at $1M.': `Dear James,\n\nThank you for the update. I'd like to proceed at $1,000,000 — pending review of the condition report and provenance documentation.\n\nPlease send those over at your earliest convenience and we can move forward.\n\nBest regards.`,
    'Send the condition report.': `Dear James,\n\nThank you for the follow-up. I'm very interested but I'll need to review the condition report and provenance chain before making a decision.\n\nPlease send those over when ready.\n\nBest.`,
    'I need to think about it.': `Dear James,\n\nThank you for the offer. I need some time to consider this against my current acquisition priorities. I'll get back to you within a week.\n\nBest regards.`,

    // Hauser & Wirth
    'I\'ll attend!': `Dear Hauser & Wirth,\n\nThank you for the invitation. I'll be attending the opening reception on March 8. Looking forward to seeing the Bourgeois textile works.\n\nBest regards.`,
    'Add me to the list.': `Dear Hauser & Wirth,\n\nPlease add me to the RSVP list for the Louise Bourgeois opening on March 8.\n\nThank you.`,

    // Insurance
    'Approved, send for signature.': `Dear Insurance Department,\n\nThe renewal terms look acceptable. Please send the documents for signature and I'll return them promptly.\n\nPlease also note that I may have an additional acquisition to add to the policy in the coming weeks.\n\nThank you.`,
    'Can we review the valuations?': `Dear Insurance Department,\n\nBefore I sign the renewal, I'd like to review the current appraisal values. I believe several pieces in the collection have appreciated significantly since the last assessment.\n\nCould we schedule a call to discuss an updated appraisal? I want to make sure the coverage accurately reflects current market values.\n\nThank you.`,
};

// ════════════════════════════════════════════════════════════
// Mock Email Data (with attachments)
// ════════════════════════════════════════════════════════════

export const initialEmails = () => [
    {
        id: 1, sender: 'Margaux Bellamy', email: 'margaux@bellamy.art',
        subject: 'Private Sale — Basquiat "Untitled" 1982',
        preview: 'Dear collector, I have a rare early Basquiat that just came off a private estate...',
        time: '10:07 AM', date: 'Feb 23, 2026', unread: true, starred: true, hasAttachment: true,
        category: 'primary', archived: false, deleted: false,
        aiAnalysis: `Margaux is offering a 1982 Basquiat "Crown Study" at $285K — with Whitney Biennial and Documenta provenance. That's strong lineage. She says "negotiable," which means there's room to push. I'd ask for the condition report first — never commit without it. 💡 Tip: Basquiat '82 works have appreciated 14% YoY. This could be a smart play.`,
        attachments: [
            { id: 'att1-1', name: 'Condition_Report_Basquiat_1982.pdf', type: 'pdf', size: '2.4 MB', preview: null },
            { id: 'att1-2', name: 'Basquiat_Crown_Study_1982.jpg', type: 'image', size: '3.1 MB', preview: '🖼️' },
        ],
        thread: [
            {
                id: 'm1', sender: 'Margaux Bellamy', email: 'margaux@bellamy.art',
                time: 'Feb 23, 2026, 10:07 AM', to: 'me',
                body: `Dear collector,\n\nI have a <b>rare early Basquiat</b> that just came off a private estate. Before it goes to auction, I wanted to offer it to a select few.\n\nThis particular work — "Untitled (Crown Study)" from 1982 — has impeccable provenance:\n\n• Acquired directly from the artist, 1983\n• Estate of Robert Farris Thompson\n• Exhibited: Whitney Biennial 1985, Documenta IX\n\nThe asking price is <b>$285,000</b> — negotiable for the right buyer.\n\nPlease let me know if you'd like to schedule a private viewing at my gallery this week.`,
                signature: 'Margaux Bellamy — Bellamy Advisory, New York / Paris',
                attachments: [
                    { id: 'att1-1', name: 'Condition_Report_Basquiat_1982.pdf', type: 'pdf', size: '2.4 MB' },
                    { id: 'att1-2', name: 'Basquiat_Crown_Study_1982.jpg', type: 'image', size: '3.1 MB' },
                ],
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
        aiAnalysis: `Congrats! 🎉 You won the Twombly at $892K hammer. Total with premium is $1.115M — that's within the estimate range. Payment is due in 30 days. I'd arrange the wire ASAP to build rapport with Sotheby's client services. Better terms next time.`,
        attachments: [],
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
        aiAnalysis: `Viktor's offering the East Wing Gallery at Kunsthalle Bremen — 400 sqm, that's a serious space. Two windows available: Sept or Jan. I'd go for September — it aligns with the fall gallery season. The exhibition agreement is attached. Review the insurance and shipping terms carefully.`,
        attachments: [
            { id: 'att3-1', name: 'Exhibition_Agreement_Kunsthalle_2026.pdf', type: 'pdf', size: '1.8 MB' },
            { id: 'att3-2', name: 'East_Wing_Technical_Specs.pdf', type: 'pdf', size: '945 KB' },
        ],
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
                attachments: [
                    { id: 'att3-1', name: 'Exhibition_Agreement_Kunsthalle_2026.pdf', type: 'pdf', size: '1.8 MB' },
                    { id: 'att3-2', name: 'East_Wing_Technical_Specs.pdf', type: 'pdf', size: '945 KB' },
                ],
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
        aiAnalysis: `VIP Preview access for Art Basel Miami — Dec 2-4. This is premium networking territory. First View on Dec 2 is where the deals happen. I'd RSVP immediately. The collector dinners are invitation-only — being there in person opens doors. 🌴`,
        attachments: [],
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
        aiAnalysis: `Elena's commission is nearly done — 84" × 120" panel, 3 weeks out. She's offering a studio visit before final varnishing. I'd take it — seeing the work in person lets you request adjustments before it's permanent. Plus it deepens the artist relationship. 🎨`,
        attachments: [
            { id: 'att5-1', name: 'Commission_Progress_Front.jpg', type: 'image', size: '4.2 MB' },
            { id: 'att5-2', name: 'Commission_Progress_Detail.jpg', type: 'image', size: '3.8 MB' },
        ],
        thread: [
            {
                id: 'm5', sender: 'Elena Vasquez', email: 'elena@vasquezgallery.com',
                time: 'Feb 20, 2026, 2:15 PM', to: 'me',
                body: `Hi,\n\nJust wanted to give you a quick update. The third panel is almost complete and the patina treatment is curing beautifully.\n\nI've attached progress photos. The scale is 84" × 120" as discussed. Expect completion in <b>3 weeks</b>.\n\nWould you like to visit the studio to see it before final varnishing?`,
                signature: 'Elena Vasquez Studio, Mexico City',
                attachments: [
                    { id: 'att5-1', name: 'Commission_Progress_Front.jpg', type: 'image', size: '4.2 MB' },
                    { id: 'att5-2', name: 'Commission_Progress_Detail.jpg', type: 'image', size: '3.8 MB' },
                ],
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
        aiAnalysis: `Christie's flagship Post-War & Contemporary sale. Richter "Abstraktes Bild" at $8-12M estimate — that's strong. The Mehretu works are interesting too. I'd register interest early for priority catalogue access. Request condition reports for anything you're considering.`,
        attachments: [],
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
        aiAnalysis: `James from White Cube is following up on the Koons. Asking $1.2M but hinting $950K-$1.05M is achievable. That's a 12-20% discount signal. I'd wait for the condition report before countering. If the provenance is clean, $1M is a fair offer. Don't show too much interest.`,
        attachments: [],
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
        aiAnalysis: `Market intel: Blue-chip up 12%, emerging down 8%. The Basquiat at $45M Phillips is notable — supports the pricing on Margaux's offer. Asian demand is driving the surge. Keep an eye on Mehretu — $9.6M at Christie's positions her for continued growth. 📊`,
        attachments: [],
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
        aiAnalysis: `Hauser & Wirth showing Bourgeois textile works — rarely seen pieces from the estate. Opening March 8. These events are great for networking with serious collectors and gallery directors. I'd attend the reception. The Bourgeois market is stable and historically resilient.`,
        attachments: [],
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
        aiAnalysis: `Insurance renewal due March 15. Total insured: $4.25M at 0.3% premium ($12,750/yr). Before signing, I'd request updated appraisals — several pieces have likely appreciated. If the Twombly acquisition goes through, you'll need a mid-term adjustment anyway. ⚠️ Don't let this lapse.`,
        attachments: [
            { id: 'att10-1', name: 'Policy_Renewal_2026.pdf', type: 'pdf', size: '1.2 MB' },
            { id: 'att10-2', name: 'Collection_Appraisal_Summary.pdf', type: 'pdf', size: '856 KB' },
        ],
        thread: [
            {
                id: 'm10', sender: 'Insurance Dept.', email: 'claims@artinsure.com',
                time: 'Feb 15, 2026, 9:00 AM', to: 'me',
                body: `Your annual collection insurance policy is due for renewal on <b>March 15, 2026</b>.\n\nBased on your updated appraisals:\n• Total insured value: <b>$4,250,000</b>\n• Annual premium: <b>$12,750</b> (0.3%)\n• Coverage: All-risk, wall-to-wall transit\n\nPlease review the attached renewal documents and return signed copy by March 1.`,
                attachments: [
                    { id: 'att10-1', name: 'Policy_Renewal_2026.pdf', type: 'pdf', size: '1.2 MB' },
                    { id: 'att10-2', name: 'Collection_Appraisal_Summary.pdf', type: 'pdf', size: '856 KB' },
                ],
            },
        ],
        smartReplies: ['Approved, send for signature.', 'Can we review the valuations?'],
    },
];

// ════════════════════════════════════════════════════════════
// Navigation & UI Constants
// ════════════════════════════════════════════════════════════

export const NAV_ITEMS = [
    { icon: '📥', label: 'Inbox', id: 'inbox' },
    { icon: '⭐', label: 'Starred', id: 'starred' },
    { icon: '⏰', label: 'Snoozed', id: 'snoozed' },
    { icon: '📨', label: 'Sent', id: 'sent' },
    { icon: '📝', label: 'Drafts', id: 'drafts' },
    { icon: '🏷️', label: 'Important', id: 'important' },
    { icon: '📦', label: 'All Mail', id: 'all' },
    { icon: '🗑️', label: 'Trash', id: 'trash' },
];

export const CATEGORIES = [
    { id: 'primary', label: 'Primary', icon: '📥' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'promotions', label: 'Promotions', icon: '🏷️' },
    { id: 'updates', label: 'Updates', icon: '💬' },
];

export const LABEL_ITEMS = [
    { icon: '●', label: 'Gallery Business', color: '#c44' },
    { icon: '●', label: 'Auction Alerts', color: '#f4b400' },
    { icon: '●', label: 'Insurance', color: '#1a73e8' },
    { icon: '●', label: 'Travel / Art Fairs', color: '#44aa66' },
];

export const SNOOZE_OPTIONS = [
    { label: 'Later today', hours: 4, icon: '☀️' },
    { label: 'Tomorrow', hours: 24, icon: '📅' },
    { label: 'This weekend', hours: 72, icon: '🌴' },
    { label: 'Next week', hours: 168, icon: '📆' },
];

export const DEFAULT_SIGNATURE = '\n\n—\nSent from ArtLife\nArt Collector & Dealer';

// Contact suggestions for compose autocomplete
export const CONTACT_SUGGESTIONS = (() => {
    try {
        return CONTACTS.map(c => ({
            name: c.name,
            email: `${c.id.replace(/_/g, '.')}@artworld.com`,
            role: c.title || c.role,
            avatar: c.emoji || c.name.charAt(0),
        }));
    } catch { return []; }
})();

// Attachment type icons
export const ATTACHMENT_ICONS = {
    pdf: '📄',
    image: '🖼️',
    document: '📋',
    spreadsheet: '📊',
    default: '📎',
};

export function getAttachmentIcon(type) {
    return ATTACHMENT_ICONS[type] || ATTACHMENT_ICONS.default;
}
