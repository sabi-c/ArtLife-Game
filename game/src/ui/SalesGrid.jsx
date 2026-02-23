/**
 * SalesGrid.jsx — 1:1 Beckmans Examensutställning Clone
 *
 * Faithful recreation of https://beckmans.college/2024/sv interaction pattern:
 * - 72-column CSS Grid with viewport-filling row heights
 * - #ededed bg, #000 text, #9b9b9b grid lines, #1400ff ultramarine accent
 * - Helvetica Neue, all weight 400, fluid font-size max(0.95rem, 0.7vw)
 * - Hover-to-expand rows (0.5s ease-out) revealing trade detail
 * - Department sections (by NPC role) with color pips
 * - Row = artist/NPC, grid cells progressively revealed at breakpoints
 *
 * Data sources:
 *   - MarketSimulator.tradeLog (NPC + player trades)
 *   - GameState.state.transactions (player-only)
 *   - ARTWORK_MAP for artwork metadata
 *   - CONTACTS for NPC grouping by role
 *
 * CSS prefix: sg-
 * Admin integration: OVERLAY.SALES_GRID via AdminDashboard button
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { GameState } from '../managers/GameState.js';
import { ARTWORK_MAP } from '../data/artworks.js';
import { CONTACTS } from '../data/contacts.js';
import './SalesGrid.css';

/**
 * Department color pips — maps NPC roles to Beckmans-style department colors.
 * These small color blocks appear in the index cell, exactly like the original.
 */
const DEPT_COLORS = {
    dealer:    '#80baff',   // Form blue
    gallerist: '#f19fff',   // Visuell Kommunikation pink
    collector: '#fff500',   // Mode yellow
    auction:   '#ff6b6b',   // Red accent
    curator:   '#6bffb8',   // Green accent
    critic:    '#ffb86b',   // Orange accent
    fixer:     '#b86bff',   // Purple accent
};

/** Resolve department label from NPC role */
function deptLabel(role) {
    const labels = {
        dealer: 'Dealers', gallerist: 'Gallerists', collector: 'Collectors',
        auction: 'Auction Houses', curator: 'Curators', critic: 'Critics', fixer: 'Fixers',
    };
    return labels[role] || role;
}

/** Format price in compact form */
function fmtPrice(p) {
    if (p >= 1000000) return `$${(p / 1000000).toFixed(1)}M`;
    if (p >= 1000) return `$${(p / 1000).toFixed(0)}k`;
    return `$${p}`;
}

/**
 * Number of "standard" filler cells per row at each breakpoint tier.
 * Mirrors the Beckmans pattern: more cells revealed as viewport grows.
 */
const STANDARD_CELLS = { xs: 3, sm: 7, md: 13, lg: 22 };

/** Generate the filler cells with progressive visibility classes */
function StandardCells({ children }) {
    const cells = [];
    // xs: always visible (3 cells)
    for (let i = 0; i < 3; i++) cells.push(<div key={`xs-${i}`} className="sg-cell-std">{i === 0 ? children : null}</div>);
    // sm: visible at ≥640px (4 more)
    for (let i = 0; i < 4; i++) cells.push(<div key={`sm-${i}`} className="sg-cell-std sg-hide-xs" />);
    // md: visible at ≥1008px (6 more)
    for (let i = 0; i < 6; i++) cells.push(<div key={`md-${i}`} className="sg-cell-std sg-hide-sm" />);
    // lg: visible at ≥1632px (9 more)
    for (let i = 0; i < 9; i++) cells.push(<div key={`lg-${i}`} className="sg-cell-std sg-hide-md" />);
    return <>{cells}</>;
}

export default function SalesGrid({ onClose }) {
    const [expandedRow, setExpandedRow] = useState(null);
    const [dataVersion, setDataVersion] = useState(0);
    const containerRef = useRef(null);
    const [rowMinHeight, setRowMinHeight] = useState(0);

    // Merge trade data from both sources
    const allTrades = useMemo(() => {
        const trades = [];
        const seen = new Set();

        for (const t of MarketSimulator.tradeLog) {
            const key = `${t.week}-${t.price}-${t.artwork}`;
            seen.add(key);
            const artData = ARTWORK_MAP[t.artwork] || null;
            trades.push({
                buyer: t.buyer || '?', seller: t.seller || '?',
                artworkId: t.artwork, title: artData?.title || t.artwork,
                artist: artData?.artist || 'Unknown', artistId: artData?.artistId || null,
                price: t.price, week: t.week, profit: null, holdWeeks: null,
                isPlayer: t.buyer === 'player' || t.seller === 'player',
            });
        }

        for (const t of (GameState.state?.transactions || [])) {
            const key = `${t.week}-${t.price}-${t.id}`;
            if (seen.has(key)) continue;
            trades.push({
                buyer: t.action === 'BUY' ? 'You' : (t.buyer || '?'),
                seller: t.action === 'SELL' ? 'You' : (t.seller || '?'),
                artworkId: t.id, title: t.title || t.id,
                artist: t.artist || 'Unknown', artistId: null,
                price: t.price, week: t.week,
                profit: t.profit ?? null, holdWeeks: t.holdWeeks ?? null,
                isPlayer: true,
            });
        }
        return trades;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataVersion]);

    // Group trades by artist, then by NPC role (department)
    const { departments, totalArtists } = useMemo(() => {
        const artistMap = new Map();
        for (const t of allTrades) {
            const name = t.artist;
            if (!artistMap.has(name)) artistMap.set(name, []);
            artistMap.get(name).push(t);
        }

        // Build sorted artist list
        const artists = [...artistMap.entries()].map(([name, trades]) => {
            const totalVolume = trades.reduce((s, t) => s + t.price, 0);
            // Find which NPC role is most associated
            const npcIds = new Set([
                ...trades.map(t => t.buyer).filter(id => id !== 'player' && id !== 'You' && id !== '?'),
                ...trades.map(t => t.seller).filter(id => id !== 'player' && id !== 'You' && id !== '?'),
            ]);
            let primaryRole = 'dealer';
            for (const id of npcIds) {
                const npc = CONTACTS.find(c => c.id === id);
                if (npc?.role) { primaryRole = npc.role; break; }
            }
            return { artist: name, trades, totalVolume, role: primaryRole };
        }).sort((a, b) => b.totalVolume - a.totalVolume);

        // Group by role into departments
        const deptMap = new Map();
        for (const a of artists) {
            if (!deptMap.has(a.role)) deptMap.set(a.role, []);
            deptMap.get(a.role).push(a);
        }

        // Order departments by total volume
        const depts = [...deptMap.entries()]
            .map(([role, artists]) => ({
                role,
                label: deptLabel(role),
                color: DEPT_COLORS[role] || '#9b9b9b',
                artists,
                totalVolume: artists.reduce((s, a) => s + a.totalVolume, 0),
            }))
            .sort((a, b) => b.totalVolume - a.totalVolume);

        return { departments: depts, totalArtists: artists.length };
    }, [allTrades]);

    // Calculate viewport-filling row height (Beckmans-style)
    useEffect(() => {
        const calculate = () => {
            const headerH = 60; // approximate sticky header height
            const available = window.innerHeight - headerH;
            // Total rows = artists + dept headers + empty spacers
            const totalRows = totalArtists + departments.length * 2 + 2;
            const minTextH = 24; // minimum readable row height
            const h = Math.max(minTextH, Math.floor(available / Math.max(totalRows, 1)));
            setRowMinHeight(h);
        };
        calculate();
        window.addEventListener('resize', calculate);
        return () => window.removeEventListener('resize', calculate);
    }, [totalArtists, departments.length]);

    const handleSeedData = useCallback(() => {
        if (!GameState.state) GameState.quickDemoInit();
        MarketSimulator.seedTradeLog();
        setDataVersion(v => v + 1);
    }, []);

    const handleRowHover = useCallback((id) => {
        setExpandedRow(id);
    }, []);

    const handleRowLeave = useCallback(() => {
        setExpandedRow(null);
    }, []);

    const handleRowClick = useCallback((id) => {
        setExpandedRow(prev => prev === id ? null : id);
    }, []);

    // Running index counter across all departments
    let globalIndex = 0;

    return (
        <div className="sg-overlay" ref={containerRef}
            style={{ '--sg-row-h': `${rowMinHeight}px` }}>

            {/* Sticky header — Beckmans-style 72-col grid */}
            <header className="sg-header-row sg-table sg-table--header">
                <div className="sg-cell-faux" />
                <div className="sg-cell-index" />
                <div className="sg-cell-name">
                    <span className="sg-cell-inner">ArtLife Sales Grid</span>
                </div>
                <StandardCells />
                <div className="sg-cell-info sg-hide-xs">
                    <span className="sg-cell-inner sg-italic">
                        {allTrades.length} trades · {totalArtists} artists
                    </span>
                </div>
                <div className="sg-cell-info-sm sg-info-pos-0">
                    <button className="sg-link" onClick={handleSeedData}>Seed Data</button>
                </div>
                <div className="sg-cell-info-sm sg-info-pos-1">
                    <button className="sg-link" onClick={onClose}>Close</button>
                </div>
            </header>

            <main className="sg-main">
                {/* Empty state */}
                {allTrades.length === 0 && (
                    <>
                        <div className="sg-table sg-empty-row" />
                        <div className="sg-table sg-empty-row" />
                        <div className="sg-table">
                            <div className="sg-cell-faux" />
                            <div className="sg-cell-index" />
                            <div className="sg-cell-name">
                                <span className="sg-cell-inner sg-italic">No trades recorded</span>
                            </div>
                            <StandardCells />
                        </div>
                        <div className="sg-table">
                            <div className="sg-cell-faux" />
                            <div className="sg-cell-index" />
                            <div className="sg-cell-name">
                                <span className="sg-cell-inner">
                                    <button className="sg-link" onClick={handleSeedData}>
                                        Seed demo data to populate the grid
                                    </button>
                                </span>
                            </div>
                            <StandardCells />
                        </div>
                    </>
                )}

                {/* Top spacer rows */}
                {allTrades.length > 0 && (
                    <>
                        <div className="sg-table sg-empty-row">
                            <div className="sg-cell-faux" /><div className="sg-cell-index" />
                            <div className="sg-cell-name" /><StandardCells />
                        </div>
                        <div className="sg-table sg-empty-row">
                            <div className="sg-cell-faux" /><div className="sg-cell-index" />
                            <div className="sg-cell-name" /><StandardCells />
                        </div>
                    </>
                )}

                {/* Department sections */}
                {departments.map((dept) => {
                    const rows = dept.artists;
                    return (
                        <React.Fragment key={dept.role}>
                            {/* Department header — color pip + italic label */}
                            <div className="sg-table sg-empty-row">
                                <div className="sg-cell-faux" />
                                <div className="sg-cell-index">
                                    <div className="sg-color-pip" style={{ backgroundColor: dept.color }} />
                                </div>
                                <div className="sg-cell-name">
                                    <span className="sg-cell-inner sg-italic">{dept.label}</span>
                                </div>
                                <StandardCells />
                            </div>

                            {/* Artist rows */}
                            {rows.map((row) => {
                                globalIndex++;
                                const isExpanded = expandedRow === row.artist;
                                const rowId = row.artist;

                                return (
                                    <React.Fragment key={rowId}>
                                        <div
                                            className={`sg-table sg-content-row${isExpanded ? ' sg-row-expanded' : ''}`}
                                            onMouseEnter={() => handleRowHover(rowId)}
                                            onMouseLeave={handleRowLeave}
                                            onClick={() => handleRowClick(rowId)}
                                        >
                                            <div className="sg-cell-faux" />
                                            <div className="sg-cell-index">
                                                <span className="sg-cell-inner sg-cell-center">
                                                    {globalIndex}
                                                </span>
                                            </div>
                                            <div className="sg-cell-name">
                                                <span className="sg-cell-inner">{row.artist}</span>
                                            </div>
                                            {/* Standard cells — one random cell gets a trade indicator */}
                                            <StandardCells>
                                                {row.trades.length > 0 && (
                                                    <div className="sg-cell-trade-pip">
                                                        <span className={`sg-trade-dot${row.trades.some(t => t.isPlayer) ? ' sg-dot-player' : ''}`}>
                                                            {row.trades.length}
                                                        </span>
                                                    </div>
                                                )}
                                            </StandardCells>
                                        </div>

                                        {/* Expanded detail — shows on hover/click */}
                                        {isExpanded && (
                                            <div className="sg-detail-row">
                                                <div className="sg-detail-inner">
                                                    {row.trades
                                                        .sort((a, b) => (b.week || 0) - (a.week || 0))
                                                        .map((trade, i) => (
                                                        <div key={i} className="sg-detail-card">
                                                            <div className="sg-detail-week">W{trade.week}</div>
                                                            <div className="sg-detail-info">
                                                                <div className="sg-detail-title">{trade.title}</div>
                                                                <div className="sg-detail-price">
                                                                    {fmtPrice(trade.price)}
                                                                    {trade.profit != null && (
                                                                        <span className={trade.profit >= 0 ? 'sg-detail-profit' : 'sg-detail-loss'}>
                                                                            {' '}{trade.profit >= 0 ? '+' : ''}{fmtPrice(trade.profit)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="sg-detail-parties">
                                                                    {trade.seller} → {trade.buyer}
                                                                    {trade.holdWeeks != null && (
                                                                        <span className="sg-detail-hold"> ({trade.holdWeeks}w)</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* Spacer row after each department */}
                            <div className="sg-table sg-empty-row">
                                <div className="sg-cell-faux" /><div className="sg-cell-index" />
                                <div className="sg-cell-name" /><StandardCells />
                            </div>
                        </React.Fragment>
                    );
                })}
            </main>
        </div>
    );
}
