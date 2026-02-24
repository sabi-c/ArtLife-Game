/**
 * AttachmentViewer.jsx — Full-screen lightbox for viewing attachments
 *
 * Supports:
 * - Images: renders inline with zoom controls
 * - PDFs: renders a mock PDF viewer with page preview
 * - Documents: shows download prompt
 * - Navigation between multiple attachments
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getAttachmentIcon } from './inboxData.js';

// Mock PDF page content for demo
const MOCK_PDF_PAGES = {
    'Condition_Report_Basquiat_1982.pdf': [
        {
            title: 'CONDITION REPORT', lines: [
                'Artist: Jean-Michel Basquiat',
                'Title: Untitled (Crown Study)',
                'Date: 1982',
                'Medium: Acrylic and oil stick on canvas',
                'Dimensions: 48 × 60 inches (121.9 × 152.4 cm)',
                '',
                'OVERALL CONDITION: Very Good',
                'Surface: Minor craquelure in lower right quadrant consistent with age.',
                'Canvas: Original stretcher bars, no relining.',
                'Verso: Estate stamp, exhibition labels (Whitney, Documenta).',
                'Frame: Not examined (sold unframed).',
                '',
                'PROVENANCE:',
                '• Acquired from the artist, 1983',
                '• Estate of Robert Farris Thompson',
                '• Private collection, New York',
            ]
        },
    ],
    'Exhibition_Agreement_Kunsthalle_2026.pdf': [
        {
            title: 'EXHIBITION AGREEMENT', lines: [
                'Between: Kunsthalle Bremen ("Gallery")',
                'And: [Collector Name] ("Artist/Lender")',
                '',
                'EXHIBITION DETAILS:',
                'Title: "Flux States"',
                'Duration: September 15 – October 28, 2026',
                'Location: East Wing Gallery (400 sqm)',
                '',
                'TERMS:',
                '1. Gallery provides installation, lighting, and security.',
                '2. Shipping and transit insurance to be arranged by Artist.',
                '3. Gallery retains 30% commission on any sales during exhibition.',
                '4. Gallery provides marketing and catalogue.',
                '',
                'INSURANCE: All-risk, wall-to-wall coverage provided by Gallery',
                'up to total insured value of $2,000,000.',
            ]
        },
    ],
    'Policy_Renewal_2026.pdf': [
        {
            title: 'POLICY RENEWAL — ART COLLECTION INSURANCE', lines: [
                'Policy Number: ACI-2026-0847',
                'Policyholder: [Collector Name]',
                'Renewal Date: March 15, 2026',
                '',
                'COVERAGE SUMMARY:',
                'Total Insured Value: $4,250,000',
                'Annual Premium: $12,750 (0.30%)',
                'Type: All-risk, wall-to-wall transit',
                'Deductible: $5,000 per occurrence',
                '',
                'SCHEDULE OF ITEMS:',
                '1. Basquiat "Untitled" — $850,000',
                '2. Richter "Abstraktes Bild" — $1,200,000',
                '3. Bourgeois "Fabric" series (3 pcs) — $920,000',
                '4. Mehretu "Retopistics" — $780,000',
                '5. Miscellaneous collection — $500,000',
            ]
        },
    ],
};

// Mock image content (abstract art canvas placeholder)
function MockImagePreview({ name }) {
    const colors = ['#c44', '#1a73e8', '#f4b400', '#44aa66', '#7b1fa2', '#e67c00', '#00838f'];
    const idx = name.charCodeAt(0) % colors.length;
    const idx2 = name.charCodeAt(name.length - 1) % colors.length;

    return (
        <div className="gmail-attachment-viewer-image">
            <div className="gmail-mock-artwork" style={{
                background: `linear-gradient(135deg, ${colors[idx]} 0%, ${colors[idx2]} 50%, ${colors[(idx + 2) % 7]} 100%)`,
            }}>
                <div className="gmail-mock-artwork-label">
                    🖼️ {name}
                </div>
                <div className="gmail-mock-artwork-detail">
                    <span>Preview not available in demo</span>
                    <span>Click to expand when connected to game data</span>
                </div>
            </div>
        </div>
    );
}

function MockPdfViewer({ name }) {
    const pages = MOCK_PDF_PAGES[name] || [{ title: name, lines: ['Document content preview not available.', '', 'Click download to save this file.'] }];
    const [currentPage, setCurrentPage] = useState(0);

    return (
        <div className="gmail-attachment-viewer-pdf">
            <div className="gmail-pdf-page">
                <div className="gmail-pdf-page-header">{pages[currentPage].title}</div>
                <div className="gmail-pdf-page-content">
                    {pages[currentPage].lines.map((line, i) => (
                        <div key={i} className={`gmail-pdf-line${line === '' ? ' gmail-pdf-line--empty' : line.startsWith('•') ? ' gmail-pdf-line--bullet' : ''}`}>
                            {line}
                        </div>
                    ))}
                </div>
                <div className="gmail-pdf-page-footer">
                    Page {currentPage + 1} of {pages.length}
                </div>
            </div>
            {pages.length > 1 && (
                <div className="gmail-pdf-nav">
                    <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>◀ Previous</button>
                    <button disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage(p => p + 1)}>Next ▶</button>
                </div>
            )}
        </div>
    );
}

export default function AttachmentViewer({ viewingAttachment, closeAttachment, navigateAttachment }) {
    if (!viewingAttachment) return null;

    const { attachment, allAttachments, index } = viewingAttachment;
    const hasPrev = index > 0;
    const hasNext = index < allAttachments.length - 1;

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') closeAttachment();
            else if (e.key === 'ArrowLeft' && hasPrev) navigateAttachment(-1);
            else if (e.key === 'ArrowRight' && hasNext) navigateAttachment(1);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [closeAttachment, navigateAttachment, hasPrev, hasNext]);

    return (
        <div className="gmail-attachment-viewer-overlay" onClick={closeAttachment}>
            <div className="gmail-attachment-viewer" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="gmail-attachment-viewer-header">
                    <div className="gmail-attachment-viewer-title">
                        <span className="gmail-attachment-viewer-icon">{getAttachmentIcon(attachment.type)}</span>
                        <span>{attachment.name}</span>
                        <span className="gmail-attachment-viewer-size">{attachment.size}</span>
                    </div>
                    <div className="gmail-attachment-viewer-actions">
                        <button className="gmail-attachment-viewer-btn" title="Download">
                            ⬇️ Download
                        </button>
                        <button className="gmail-attachment-viewer-btn" title="Save to Drive">
                            △ Save to Drive
                        </button>
                        <button className="gmail-attachment-viewer-close" onClick={closeAttachment}>✕</button>
                    </div>
                </div>

                {/* Content */}
                <div className="gmail-attachment-viewer-content">
                    {attachment.type === 'image' && (
                        <MockImagePreview name={attachment.name} />
                    )}
                    {attachment.type === 'pdf' && (
                        <MockPdfViewer name={attachment.name} />
                    )}
                    {attachment.type !== 'image' && attachment.type !== 'pdf' && (
                        <div className="gmail-attachment-viewer-fallback">
                            <div className="gmail-attachment-viewer-fallback-icon">{getAttachmentIcon(attachment.type)}</div>
                            <div className="gmail-attachment-viewer-fallback-name">{attachment.name}</div>
                            <div className="gmail-attachment-viewer-fallback-size">{attachment.size}</div>
                            <button className="gmail-attachment-viewer-btn">⬇️ Download</button>
                        </div>
                    )}
                </div>

                {/* Navigation arrows (when multiple attachments) */}
                {allAttachments.length > 1 && (
                    <>
                        <button
                            className={`gmail-attachment-nav gmail-attachment-nav--prev${!hasPrev ? ' gmail-attachment-nav--disabled' : ''}`}
                            onClick={() => hasPrev && navigateAttachment(-1)}
                            disabled={!hasPrev}
                        >
                            ‹
                        </button>
                        <button
                            className={`gmail-attachment-nav gmail-attachment-nav--next${!hasNext ? ' gmail-attachment-nav--disabled' : ''}`}
                            onClick={() => hasNext && navigateAttachment(1)}
                            disabled={!hasNext}
                        >
                            ›
                        </button>
                        <div className="gmail-attachment-counter">
                            {index + 1} / {allAttachments.length}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
