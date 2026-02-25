import React, { useState, useEffect } from 'react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CalendarHUD({ visible }) {
    const [timeState, setTimeState] = useState({
        week: 1,
        dayOfWeek: 1,
        hour: 8,
        minute: 0,
        cash: 0,
        portfolioCount: 0,
        marketHeat: 50,
    });

    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            const state = window._artLifeState;
            if (state) {
                const portfolio = state.portfolio || state.collection || [];
                setTimeState({
                    week: state.week || 1,
                    dayOfWeek: state.dayOfWeek || 1,
                    hour: state.hour || 8,
                    minute: state.minute || 0,
                    cash: state.cash ?? state.wealth ?? 0,
                    portfolioCount: Array.isArray(portfolio) ? portfolio.length : 0,
                    marketHeat: state.marketHeat ?? 50,
                });
            }
        }, 200);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    const dayName = DAYS[Math.max(0, Math.min(timeState.dayOfWeek - 1, 6))] || 'MON';
    const hourStr = timeState.hour.toString().padStart(2, '0');
    const minStr = timeState.minute.toString().padStart(2, '0');

    const isNight = timeState.hour >= 19 || timeState.hour < 6;

    // Market indicator
    const mh = timeState.marketHeat;
    const marketIcon = mh >= 65 ? '\u25B2' : mh <= 35 ? '\u25BC' : '\u2550';
    const marketColor = mh >= 65 ? '#4ade80' : mh <= 35 ? '#f87171' : 'var(--dim)';

    const cashStr = '$' + timeState.cash.toLocaleString();

    const isSmall = typeof window !== 'undefined' && window.innerWidth < 500;

    return (
        <>
        <div style={{
            position: 'absolute',
            top: isSmall ? 10 : 20,
            right: isSmall ? 10 : 20,
            zIndex: 1000,
            background: 'var(--bg)',
            // Fake scanlines via linear-gradient over the background
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
            backgroundSize: `100% 4px, 100% 100%`,
            border: '1px solid var(--border)',
            color: 'var(--gold)',
            padding: isSmall ? '6px 10px' : '10px 20px',
            fontFamily: 'var(--font)',
            display: 'flex',
            alignItems: 'center',
            gap: isSmall ? '8px' : '16px',
            fontSize: isSmall ? '0.85em' : '1em',
            pointerEvents: 'none',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 255, 255, 0.05)',
            textShadow: '0 0 4px var(--gold)',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
        }}>
            {/* Blinking recording/status dot */}
            <div style={{
                width: 8, height: 8,
                background: 'var(--red)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--red)',
                animation: 'pulse 2s infinite'
            }} />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px dotted var(--dim)',
                paddingRight: '16px',
                textAlign: 'right'
            }}>
                <span style={{ fontSize: '10px', color: 'var(--dim)', letterSpacing: '2px' }}>SYS.WEEK</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--fg)' }}>{timeState.week.toString().padStart(2, '0')}</span>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px'
            }}>
                <span style={{ fontSize: '16px', color: 'var(--dim)', fontWeight: 'bold' }}>
                    {dayName}
                </span>
                <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'var(--fg)',
                    letterSpacing: '1px'
                }}>
                    {hourStr}:{minStr}
                </span>
            </div>

            {isNight && (
                <div style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--blue)',
                    opacity: 0.8
                }}>[NIGHT_OP]</div>
            )}
        </div>

        {/* Second row — game stats */}
        <div style={{
            position: 'absolute',
            top: isSmall ? 52 : 72,
            right: isSmall ? 10 : 20,
            zIndex: 1000,
            background: 'var(--bg)',
            backgroundImage: `linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))`,
            backgroundSize: '100% 4px, 100% 100%',
            border: '1px solid var(--border)',
            borderTop: 'none',
            padding: isSmall ? '4px 10px' : '6px 20px',
            fontFamily: 'var(--font)',
            display: 'flex',
            alignItems: 'center',
            gap: isSmall ? '10px' : '16px',
            fontSize: isSmall ? '0.75em' : '0.85em',
            pointerEvents: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
        }}>
            <span style={{ color: '#c9a84c', fontWeight: 'bold', letterSpacing: 1 }}>{cashStr}</span>
            <span style={{ color: 'var(--dim)', fontSize: '9px', letterSpacing: 2 }}>PALLET TOWN</span>
            <span style={{ color: 'var(--fg)', fontSize: '10px' }}>ART:{timeState.portfolioCount}</span>
            <span style={{ color: marketColor, fontWeight: 'bold', fontSize: '12px' }}>{marketIcon}</span>
        </div>

        <style>{`
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.2; transform: scale(0.8); }
                100% { opacity: 1; transform: scale(1); }
            }
        `}</style>
        </>
    );
}
