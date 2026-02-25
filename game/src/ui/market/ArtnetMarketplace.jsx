/**
 * ArtnetMarketplace.jsx — Artnet Market Search Page Clone
 *
 * Pixel-accurate clone of artnet.com's search/marketplace page.
 * Full search, filter, sort, masonry artwork grid, detail panel,
 * and INQUIRE → Gmail compose integration.
 *
 * Data: ARTWORKS, MarketManager, MarketSimulator, CMS snapshots
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ARTWORKS } from '../../data/artworks.js';
import { resolveArtworkUrl } from '../../utils/assets.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { fmtMoney } from '../../utils/formatMoney.js';

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ═══════════════════════════════════════════
// Artnet SVG Logo
// ═══════════════════════════════════════════
function ArtnetLogo({ height = 24, color = '#231f20' }) {
    return (
        <svg viewBox="0 0 118 32" style={{ height, fill: color, display: 'inline-block' }}>
            <path d="M23.599 27.7727L23.6973 31.4101C22.7865 31.5507 21.8657 31.6164 20.9441 31.6068C18.2401 31.6068 16.7651 30.3287 16.5193 27.7727C15.1427 30.5745 12.4386 32 8.25966 32C4.08066 32 0 29.7389 0 24.9217C0 19.6129 4.47398 18.1383 8.35799 17.4009L16.4701 15.828C16.4701 13.616 16.3718 12.3871 15.6343 11.3548C14.8969 10.3226 13.3236 9.73272 11.1604 9.73272C6.88305 9.73272 5.16229 11.3057 5.16229 15.0415L0.835799 14.4516C0.934128 11.5023 1.96658 9.33948 3.88401 8.06144C5.65393 6.88172 8.25966 6.2427 11.4062 6.2427C17.6009 6.2427 20.7475 8.99539 20.7475 14.3533V26.1014C20.7475 27.3794 20.7475 27.9693 22.1732 27.9693C22.6546 27.9608 23.1333 27.8948 23.599 27.7727ZM16.4701 19.1214L9.04629 20.7435C6.44057 21.3333 4.52315 22.0707 4.52315 24.8725C4.52315 27.1828 6.5389 28.4608 8.94796 28.4608C14.3069 28.4608 16.4701 25.659 16.4701 22.1198V19.1214ZM37.8076 6.63594C38.2009 6.58679 39.135 6.58679 39.4792 6.58679L39.3809 10.765C39.0057 10.7206 38.6277 10.7042 38.2501 10.7158C33.5794 10.7158 30.1871 12.1905 30.1871 20.1045V31.4101H25.7623V6.83257H30.1871V11.5023C30.8754 9.19201 33.7761 7.1275 37.8076 6.63594ZM49.8087 6.83257H54.8235V10.5192H49.8087V25.7573C49.8087 27.3794 50.5462 27.6743 52.3652 27.6743C53.1243 27.6502 53.8803 27.568 54.6268 27.4286L54.7251 31.4101C53.8325 31.5695 52.9278 31.6517 52.0211 31.6559C47.4488 31.6559 45.433 29.8863 45.433 25.9048V10.5192H41.8932V6.83257H45.433V0H49.8087V6.83257ZM76.9475 8.99539C78.8158 11.0108 78.865 14.2058 78.865 16.8111V31.4101H74.2927V17.0568C74.2927 14.7957 74.3418 12.7803 72.8177 11.3548C71.4411 9.97849 69.8187 9.92934 68.4421 9.92934C66.2788 9.92934 62.0507 10.8141 62.0507 17.8433V31.4101H57.6259V6.83257H62.0507V10.5684C63.2798 7.81567 65.6889 6.2427 69.622 6.2427C72.8669 6.2427 75.1776 7.1275 76.9475 8.99539ZM102.611 11.1091C104.086 13.4685 104.873 16.9585 104.676 20.4485H86.0381C86.1364 25.8556 88.398 28.4608 93.0195 28.4608C97.1985 28.4608 99.46 26.6912 100.05 22.9555L104.327 23.2995C103.246 29.0507 99.3125 32 93.0735 32C89.2879 32 86.338 30.8694 84.2239 28.4117C82.159 26.1014 81.2249 22.9063 81.2249 19.0722C81.2249 15.4347 82.2573 12.2396 84.3222 9.92934C86.4855 7.47158 89.4845 6.2427 93.0244 6.2427C96.9084 6.2427 100.596 7.91398 102.611 11.1091ZM87.2721 12.4854C86.5018 13.815 86.0949 15.3237 86.0922 16.8602H100.153C100.076 15.3153 99.6198 13.813 98.8258 12.4854C97.5475 10.6175 95.7284 9.83103 93.0735 9.83103C90.3203 9.83103 88.2554 10.8633 87.2721 12.4854ZM112.985 10.5192V25.7573C112.985 27.3794 113.723 27.6743 115.542 27.6743C116.301 27.6502 117.057 27.568 117.803 27.4286L117.902 31.4101C117.009 31.5695 116.104 31.6517 115.198 31.6559C110.625 31.6559 108.61 29.8863 108.61 25.9048V10.5192H105.07V6.83257H108.61V0H112.985V6.83257H117.995V10.5192H112.985Z" />
        </svg>
    );
}

// ═══════════════════════════════════════════
// Utility: price formatting
// ═══════════════════════════════════════════
function fmtPrice(p) {
    if (!p || p <= 0) return 'Price on Request';
    return `${fmtMoney(p)} USD`;
}

function getOwnerLabel(artwork) {
    const s = GameState?.state;
    const portfolio = s?.portfolio || [];
    if (portfolio.some(w => w.id === artwork.id)) return 'Player Collection';
    if (artwork.ownerId === 'market') return 'Gallery Listing';
    // Try to find NPC owner
    const npcs = s?.npcs || [];
    const npc = npcs.find(n => n.id === artwork.ownerId);
    if (npc) return npc.name || artwork.ownerId;
    // Fallback to ownerId prettified
    if (artwork.ownerId) return artwork.ownerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return 'Unknown';
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function ArtnetMarketplace({ onClose, onExplore }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('artworks');
    const [sortKey, setSortKey] = useState('recent');
    const [sortOpen, setSortOpen] = useState(false);
    const [filterTier, setFilterTier] = useState('all');
    const [filterGenre, setFilterGenre] = useState('all');
    const [selectedWork, setSelectedWork] = useState(null);
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const searchRef = useRef(null);
    const sortRef = useRef(null);

    // Close sort dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ESC to close
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                if (lightboxUrl) setLightboxUrl(null);
                else if (selectedWork) setSelectedWork(null);
                else if (onClose) onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxUrl, selectedWork, onClose]);

    // ── Build enriched artwork list ──
    const cmsArtworks = useCmsStore.getState().snapshots?.artworks;

    const allWorks = useMemo(() => {
        return ARTWORKS.map((artwork, i) => {
            const cms = cmsArtworks?.find?.(a => a.id === artwork.id);
            const merged = cms ? { ...artwork, ...cms } : artwork;
            let currentVal = 0;
            try { currentVal = MarketManager.calculatePrice?.(merged, false) || 0; }
            catch { currentVal = merged.basePrice || merged.askingPrice || 0; }
            const imageUrl = resolveArtworkUrl(merged);
            const owner = getOwnerLabel(merged);
            return {
                ...merged,
                currentVal,
                imageUrl,
                _owner: owner,
                _lot: i + 1,
            };
        });
    }, [cmsArtworks]);

    // ── Unique values for filters ──
    const tiers = useMemo(() => [...new Set(allWorks.map(w => w.tier).filter(Boolean))], [allWorks]);
    const genres = useMemo(() => [...new Set(allWorks.map(w => w.genre).filter(Boolean))], [allWorks]);

    // ── Artists tab data ──
    const uniqueArtists = useMemo(() => {
        const map = {};
        allWorks.forEach(w => {
            const key = w.artist || 'Unknown';
            if (!map[key]) map[key] = { name: key, count: 0, born: w.artistBorn, died: w.artistDied };
            map[key].count++;
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    }, [allWorks]);

    // ── Galleries tab data ──
    const uniqueGalleries = useMemo(() => {
        const map = {};
        allWorks.forEach(w => {
            const key = w._owner || 'Unknown';
            if (!map[key]) map[key] = { name: key, count: 0 };
            map[key].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [allWorks]);

    // ── Filter + Search + Sort ──
    const filteredWorks = useMemo(() => {
        let items = [...allWorks];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(w =>
                (w.artist || '').toLowerCase().includes(q) ||
                (w.title || '').toLowerCase().includes(q) ||
                (w.medium || '').toLowerCase().includes(q) ||
                (w._owner || '').toLowerCase().includes(q) ||
                (w.genre || '').toLowerCase().includes(q)
            );
        }

        // Filter: tier
        if (filterTier !== 'all') items = items.filter(w => w.tier === filterTier);

        // Filter: genre
        if (filterGenre !== 'all') items = items.filter(w => w.genre === filterGenre);

        // Sort
        switch (sortKey) {
            case 'price_asc': items.sort((a, b) => (a.currentVal || 0) - (b.currentVal || 0)); break;
            case 'price_desc': items.sort((a, b) => (b.currentVal || 0) - (a.currentVal || 0)); break;
            case 'artist_az': items.sort((a, b) => (a.artist || '').localeCompare(b.artist || '')); break;
            case 'year_desc': items.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0)); break;
            case 'year_asc': items.sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)); break;
            case 'title_az': items.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'recent':
            default: break; // original order
        }

        return items;
    }, [allWorks, searchQuery, filterTier, filterGenre, sortKey]);

    // ── Tab counts ──
    const tabCounts = useMemo(() => ({
        artworks: filteredWorks.length,
        artists: uniqueArtists.length,
        galleries: uniqueGalleries.length,
    }), [filteredWorks, uniqueArtists, uniqueGalleries]);

    // ── INQUIRE → Gmail ──
    const handleInquire = useCallback((work) => {
        const artist = work.artist || 'Unknown Artist';
        const title = work.title || 'Untitled';
        const owner = work._owner || 'Gallery';
        const price = work.currentVal || 0;
        const fmtP = fmtMoney(price);
        window.dispatchEvent(new CustomEvent('openGmailCompose', {
            detail: {
                to: `${owner.toLowerCase().replace(/\s+/g, '.')}@artnet.com`,
                subject: `Inquiry: ${artist} — ${title}`,
                body: `Dear ${owner},\n\nI am writing to inquire about the availability of:\n\n${artist}\n"${title}"\nListed at ${fmtP}\n\nI would appreciate any additional information regarding provenance, condition, and the possibility of a private viewing.\n\nBest regards`
            }
        }));
    }, []);

    const sortOptions = [
        { key: 'recent', label: 'Recently Added' },
        { key: 'price_asc', label: 'Sale Price (Low to High)' },
        { key: 'price_desc', label: 'Sale Price (High to Low)' },
        { key: 'artist_az', label: 'Artist Name (A to Z)' },
        { key: 'year_desc', label: 'Artwork Date (Descending)' },
        { key: 'year_asc', label: 'Artwork Date (Ascending)' },
        { key: 'title_az', label: 'Artwork Title (A to Z)' },
    ];

    // ═══════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════
    const S = {
        overlay: {
            position: 'fixed', inset: 0, zIndex: 10000,
            background: '#f2f2f2', color: '#231f20',
            fontFamily: font, fontSize: 14, lineHeight: '1.4',
            overflowY: 'auto', overflowX: 'hidden',
            WebkitFontSmoothing: 'antialiased',
        },
        header: {
            background: '#fff', borderBottom: '1px solid #e6e6e6',
            position: 'sticky', top: 0, zIndex: 100,
        },
        headerTop: {
            maxWidth: 1170, margin: '0 auto', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        },
        nav: {
            display: 'flex', gap: 24, fontSize: 15, color: '#231f20',
        },
        navLink: {
            color: '#231f20', textDecoration: 'none', cursor: 'pointer',
            padding: '4px 0', fontWeight: 400,
        },
        navRight: {
            display: 'flex', gap: 16, alignItems: 'center', fontSize: 14,
        },
        searchBar: {
            maxWidth: 1170, margin: '0 auto', padding: '12px 20px',
            display: 'flex', gap: 12, alignItems: 'center',
        },
        searchInput: {
            flex: 1, height: 40, padding: '0 16px',
            border: '1px solid #ccc', borderRadius: 4,
            fontSize: 15, fontFamily: font, color: '#231f20',
            outline: 'none', background: '#fff',
        },
        searchBtn: {
            height: 40, padding: '0 24px',
            background: '#231f20', color: '#fff',
            border: 'none', borderRadius: 4, fontSize: 14,
            fontWeight: 700, cursor: 'pointer', fontFamily: font,
        },
        main: {
            maxWidth: 1170, margin: '0 auto', padding: '0 20px 60px',
        },
        resultsHead: {
            textAlign: 'center', padding: '24px 0 16px',
            fontSize: 22, fontWeight: 400, color: '#231f20',
        },
        resultCount: {
            color: '#999', fontSize: 16, fontWeight: 400,
        },
        tabBar: {
            display: 'flex', gap: 0, borderBottom: '2px solid #e6e6e6',
            marginBottom: 20,
        },
        tab: (active) => ({
            padding: '10px 20px', fontSize: 14, cursor: 'pointer',
            color: active ? '#231f20' : '#999',
            borderBottom: active ? '2px solid #231f20' : '2px solid transparent',
            marginBottom: -2, fontWeight: active ? 700 : 400,
            background: 'none', border: 'none', borderBottomWidth: 2,
            borderBottomStyle: 'solid',
            borderBottomColor: active ? '#231f20' : 'transparent',
            fontFamily: font, transition: 'all 0.15s',
        }),
        toolbar: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, flexWrap: 'wrap', gap: 12,
        },
        filterGroup: {
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        },
        filterSelect: {
            height: 34, padding: '0 12px', border: '1px solid #ccc',
            borderRadius: 4, fontSize: 13, fontFamily: font,
            color: '#231f20', background: '#fff', cursor: 'pointer',
        },
        sortDropdown: {
            position: 'relative',
        },
        sortBtn: {
            height: 34, padding: '0 16px', border: '1px solid #ccc',
            borderRadius: 4, fontSize: 13, fontFamily: font,
            color: '#231f20', background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
        },
        sortMenu: {
            position: 'absolute', top: '100%', right: 0,
            background: '#fff', border: '1px solid #e6e6e6',
            borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 50, minWidth: 220, marginTop: 4,
        },
        sortItem: (active) => ({
            padding: '8px 16px', fontSize: 13, cursor: 'pointer',
            color: active ? '#231f20' : '#666', fontWeight: active ? 700 : 400,
            background: active ? '#f5f5f5' : 'transparent',
        }),
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
        },
        card: {
            background: '#fff', cursor: 'pointer',
            transition: 'box-shadow 0.2s',
        },
        cardImg: {
            width: '100%', aspectRatio: '3/4',
            objectFit: 'cover', display: 'block',
            background: '#e6e6e6',
        },
        cardBody: {
            padding: '10px 0',
        },
        cardArtist: {
            fontSize: 14, fontWeight: 400, color: '#231f20',
            marginBottom: 2,
        },
        cardTitle: {
            fontSize: 13, color: '#231f20', marginBottom: 2,
        },
        cardGallery: {
            fontSize: 12, color: '#999', marginBottom: 2,
        },
        cardPrice: {
            fontSize: 13, fontWeight: 400, color: '#231f20',
        },
        // Detail panel
        detail: {
            position: 'fixed', inset: 0, zIndex: 10100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        detailInner: {
            background: '#fff', width: '90%', maxWidth: 900,
            maxHeight: '90vh', overflowY: 'auto', borderRadius: 6,
            display: 'flex', flexDirection: 'row',
        },
        detailLeft: {
            flex: '0 0 50%', padding: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f5f5f5',
        },
        detailImg: {
            maxWidth: '100%', maxHeight: '60vh',
            objectFit: 'contain', cursor: 'zoom-in',
        },
        detailRight: {
            flex: 1, padding: '32px 28px', overflowY: 'auto',
        },
        detailArtist: {
            fontSize: 14, color: '#999', letterSpacing: 0.5,
            marginBottom: 4,
        },
        detailTitle: {
            fontSize: 24, fontWeight: 400, color: '#231f20',
            marginBottom: 4,
        },
        detailYear: {
            fontSize: 14, color: '#999', marginBottom: 16,
        },
        detailMeta: {
            fontSize: 13, color: '#666', lineHeight: '1.6',
            marginBottom: 12,
        },
        detailPrice: {
            fontSize: 20, fontWeight: 700, color: '#231f20',
            marginBottom: 16, marginTop: 16,
        },
        detailSection: {
            fontSize: 12, fontWeight: 700, color: '#999',
            letterSpacing: 1, textTransform: 'uppercase',
            marginTop: 16, marginBottom: 6,
        },
        detailList: {
            fontSize: 12, color: '#666', lineHeight: '1.8',
            paddingLeft: 0, listStyle: 'none',
        },
        inquireBtn: {
            display: 'inline-block', padding: '12px 32px',
            background: '#231f20', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, letterSpacing: 1,
            cursor: 'pointer', fontFamily: font, borderRadius: 0,
            textTransform: 'uppercase',
        },
        closeBtn: {
            position: 'absolute', top: 16, right: 20,
            background: 'none', border: 'none', fontSize: 24,
            cursor: 'pointer', color: '#999', fontWeight: 300,
            lineHeight: 1,
        },
        // Lightbox
        lightbox: {
            position: 'fixed', inset: 0, zIndex: 10200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
        },
        lightboxImg: {
            maxWidth: '90%', maxHeight: '90vh',
            objectFit: 'contain', cursor: 'default',
        },
        lightboxClose: {
            position: 'absolute', top: 20, right: 24,
            color: '#fff', fontSize: 28, cursor: 'pointer',
            background: 'none', border: 'none', fontWeight: 300,
        },
        // Artist/Gallery list
        listItem: {
            padding: '12px 16px', background: '#fff',
            marginBottom: 8, borderRadius: 4,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', transition: 'background 0.15s',
        },
        badge: {
            fontSize: 11, color: '#999', background: '#f5f5f5',
            padding: '2px 8px', borderRadius: 10,
        },
    };

    // ═══════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════
    return (
        <div style={S.overlay}>
            {/* ── Header ── */}
            <header style={S.header}>
                <div style={S.headerTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        <ArtnetLogo height={22} />
                        <nav style={S.nav}>
                            <span style={S.navLink}>Artworks</span>
                            <span style={S.navLink}>Artists</span>
                            <span style={S.navLink}>Auctions</span>
                            <span style={S.navLink}>Galleries</span>
                            <span style={S.navLink}>Events</span>
                            <span style={S.navLink}>News</span>
                            <span style={{ ...S.navLink, fontWeight: 700 }}>Price Database</span>
                        </nav>
                    </div>
                    <div style={S.navRight}>
                        {onExplore && (
                            <span
                                style={{ ...S.navLink, fontWeight: 700, color: '#ff4b00', cursor: 'pointer' }}
                                onClick={onExplore}
                            >
                                🗺️ Explore
                            </span>
                        )}
                        <span style={{ ...S.navLink, fontWeight: 700 }}>Buy</span>
                        <span style={{ ...S.navLink, fontWeight: 700 }}>Sell</span>
                        {onClose && typeof onClose === 'function' && (
                            <span style={{ color: '#999', cursor: 'pointer' }} onClick={onClose}>✕ Close</span>
                        )}
                    </div>
                </div>

                {/* Search bar */}
                <div style={{ ...S.searchBar, borderTop: '1px solid #e6e6e6' }}>
                    <input
                        ref={searchRef}
                        style={S.searchInput}
                        placeholder="Search artworks, artists, galleries..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur(); } }}
                    />
                    <button style={S.searchBtn} onClick={() => searchRef.current?.focus()}>Search</button>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div style={S.main}>
                {/* Results heading */}
                <div style={S.resultsHead}>
                    {searchQuery ? (
                        <>Results for "{searchQuery}" <span style={S.resultCount}>({tabCounts[activeTab]} results)</span></>
                    ) : (
                        <>Marketplace <span style={S.resultCount}>({tabCounts[activeTab]} works)</span></>
                    )}
                </div>

                {/* Tabs */}
                <div style={S.tabBar}>
                    <button style={S.tab(activeTab === 'artworks')} onClick={() => setActiveTab('artworks')}>
                        Artworks ({tabCounts.artworks})
                    </button>
                    <button style={S.tab(activeTab === 'artists')} onClick={() => setActiveTab('artists')}>
                        Artists ({tabCounts.artists})
                    </button>
                    <button style={S.tab(activeTab === 'galleries')} onClick={() => setActiveTab('galleries')}>
                        Galleries ({tabCounts.galleries})
                    </button>
                </div>

                {/* ── Artworks Tab ── */}
                {activeTab === 'artworks' && (
                    <>
                        {/* Toolbar: filters + sort */}
                        <div style={S.toolbar}>
                            <div style={S.filterGroup}>
                                <select style={S.filterSelect} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
                                    <option value="all">All Tiers</option>
                                    {tiers.map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                    ))}
                                </select>
                                <select style={S.filterSelect} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
                                    <option value="all">All Genres</option>
                                    {genres.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                                {(filterTier !== 'all' || filterGenre !== 'all') && (
                                    <button
                                        style={{ ...S.filterSelect, color: '#cc0000', borderColor: '#cc0000', cursor: 'pointer' }}
                                        onClick={() => { setFilterTier('all'); setFilterGenre('all'); }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>

                            {/* Sort dropdown */}
                            <div style={S.sortDropdown} ref={sortRef}>
                                <button style={S.sortBtn} onClick={() => setSortOpen(!sortOpen)}>
                                    Sort: {sortOptions.find(o => o.key === sortKey)?.label}
                                    <span style={{ fontSize: 10 }}>▼</span>
                                </button>
                                {sortOpen && (
                                    <div style={S.sortMenu}>
                                        {sortOptions.map(opt => (
                                            <div
                                                key={opt.key}
                                                style={S.sortItem(sortKey === opt.key)}
                                                onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                                onMouseLeave={e => e.currentTarget.style.background = sortKey === opt.key ? '#f5f5f5' : 'transparent'}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Artwork Grid */}
                        {filteredWorks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 16 }}>
                                No artworks found{searchQuery ? ` for "${searchQuery}"` : ''}.
                            </div>
                        ) : (
                            <div style={S.grid}>
                                {filteredWorks.map((work, i) => (
                                    <div
                                        key={work.id || i}
                                        style={S.card}
                                        onClick={() => setSelectedWork(work)}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                    >
                                        {work.imageUrl ? (
                                            <img
                                                src={work.imageUrl}
                                                alt={work.title}
                                                style={S.cardImg}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div style={{ ...S.cardImg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}>
                                                No Image
                                            </div>
                                        )}
                                        <div style={S.cardBody}>
                                            <div style={S.cardArtist}>{work.artist || 'Unknown Artist'}</div>
                                            <div style={S.cardTitle}>
                                                <em>{work.title || 'Untitled'}</em>
                                                {work.year ? `, ${work.year}` : ''}
                                            </div>
                                            <div style={S.cardGallery}>{work._owner}</div>
                                            <div style={S.cardPrice}>{fmtPrice(work.currentVal)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── Artists Tab ── */}
                {activeTab === 'artists' && (
                    <div>
                        {uniqueArtists.map(a => (
                            <div
                                key={a.name}
                                style={S.listItem}
                                onClick={() => { setSearchQuery(a.name); setActiveTab('artworks'); }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 400, color: '#231f20' }}>{a.name}</div>
                                    <div style={{ fontSize: 12, color: '#999' }}>
                                        {a.born ? `b. ${a.born}` : ''}
                                        {a.died ? ` – ${a.died}` : ''}
                                    </div>
                                </div>
                                <span style={S.badge}>{a.count} work{a.count !== 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Galleries Tab ── */}
                {activeTab === 'galleries' && (
                    <div>
                        {uniqueGalleries.map(g => (
                            <div
                                key={g.name}
                                style={S.listItem}
                                onClick={() => { setSearchQuery(g.name); setActiveTab('artworks'); }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                                <div style={{ fontSize: 15, color: '#231f20' }}>{g.name}</div>
                                <span style={S.badge}>{g.count} work{g.count !== 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <footer style={{
                background: '#231f20', color: '#999', padding: '32px 20px',
                textAlign: 'center', fontSize: 12,
            }}>
                <div style={{ marginBottom: 12 }}>
                    <ArtnetLogo height={18} color="#fff" />
                </div>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    {['Price Database', 'Market Alerts', 'Analytics Reports', 'Gallery Network', 'Auction House Partnerships'].map(l => (
                        <span key={l} style={{ color: '#ccc', cursor: 'pointer' }}>{l}</span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                    {['About', 'Contact', 'Jobs', 'FAQ', 'Site Map', 'Terms', 'Privacy'].map(l => (
                        <span key={l} style={{ color: '#999', cursor: 'pointer' }}>{l}</span>
                    ))}
                </div>
                <div>©2024 Artnet Worldwide Corporation. All rights reserved.</div>
            </footer>

            {/* ── Artwork Detail Panel ── */}
            {selectedWork && (
                <div style={S.detail} onClick={() => setSelectedWork(null)}>
                    <div style={S.detailInner} onClick={e => e.stopPropagation()}>
                        {/* Left: Image */}
                        <div style={S.detailLeft}>
                            {selectedWork.imageUrl ? (
                                <img
                                    src={selectedWork.imageUrl}
                                    alt={selectedWork.title}
                                    style={S.detailImg}
                                    onClick={() => setLightboxUrl(selectedWork.imageUrl)}
                                />
                            ) : (
                                <div style={{ color: '#ccc', fontSize: 14 }}>No Image Available</div>
                            )}
                        </div>

                        {/* Right: Metadata */}
                        <div style={{ ...S.detailRight, position: 'relative' }}>
                            <button style={S.closeBtn} onClick={() => setSelectedWork(null)}>✕</button>

                            <div style={S.detailArtist}>{selectedWork.artist || 'Unknown Artist'}</div>
                            <div style={S.detailTitle}>
                                <em>{selectedWork.title || 'Untitled'}</em>
                            </div>
                            <div style={S.detailYear}>{selectedWork.year || ''}</div>

                            <div style={S.detailMeta}>
                                {selectedWork.medium && <div>{selectedWork.medium}</div>}
                                {selectedWork.dimensions && <div>{selectedWork.dimensions}</div>}
                                {selectedWork.dimensionsIn && <div>{selectedWork.dimensionsIn}</div>}
                                {selectedWork.edition && <div>Edition: {selectedWork.edition}</div>}
                            </div>

                            <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>{selectedWork._owner}</div>

                            <div style={S.detailPrice}>{fmtPrice(selectedWork.currentVal)}</div>

                            <button
                                style={S.inquireBtn}
                                onClick={() => handleInquire(selectedWork)}
                                onMouseEnter={e => e.currentTarget.style.background = '#000'}
                                onMouseLeave={e => e.currentTarget.style.background = '#231f20'}
                            >
                                INQUIRE
                            </button>

                            {/* Provenance */}
                            {Array.isArray(selectedWork.provenance) && selectedWork.provenance.length > 0 && (
                                <>
                                    <div style={S.detailSection}>Provenance</div>
                                    <ul style={S.detailList}>
                                        {selectedWork.provenance.map((p, i) => <li key={i}>{typeof p === 'string' ? p : p.source || JSON.stringify(p)}</li>)}
                                    </ul>
                                </>
                            )}

                            {/* Exhibitions */}
                            {Array.isArray(selectedWork.exhibitions) && selectedWork.exhibitions.length > 0 && (
                                <>
                                    <div style={S.detailSection}>Exhibitions</div>
                                    <ul style={S.detailList}>
                                        {selectedWork.exhibitions.map((e, i) => <li key={i}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>)}
                                    </ul>
                                </>
                            )}

                            {/* Literature */}
                            {Array.isArray(selectedWork.literature) && selectedWork.literature.length > 0 && (
                                <>
                                    <div style={S.detailSection}>Literature</div>
                                    <ul style={S.detailList}>
                                        {selectedWork.literature.map((l, i) => <li key={i}>{typeof l === 'string' ? l : JSON.stringify(l)}</li>)}
                                    </ul>
                                </>
                            )}

                            {/* Description */}
                            {selectedWork.description && (
                                <>
                                    <div style={S.detailSection}>Description</div>
                                    <div style={{ fontSize: 13, color: '#666', lineHeight: '1.7' }}>
                                        {selectedWork.description}
                                    </div>
                                </>
                            )}

                            {/* Tier badge */}
                            {selectedWork.tier && (
                                <div style={{ marginTop: 20 }}>
                                    <span style={{
                                        fontSize: 11, color: '#999', background: '#f5f5f5',
                                        padding: '3px 10px', borderRadius: 10, textTransform: 'capitalize',
                                    }}>
                                        {selectedWork.tier.replace(/_/g, ' ')}
                                    </span>
                                    {selectedWork.genre && (
                                        <span style={{
                                            fontSize: 11, color: '#999', background: '#f5f5f5',
                                            padding: '3px 10px', borderRadius: 10, marginLeft: 8,
                                        }}>
                                            {selectedWork.genre}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Lightbox ── */}
            {lightboxUrl && (
                <div style={S.lightbox} onClick={() => setLightboxUrl(null)}>
                    <button style={S.lightboxClose} onClick={() => setLightboxUrl(null)}>✕</button>
                    <img src={lightboxUrl} alt="Full size" style={S.lightboxImg} onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
