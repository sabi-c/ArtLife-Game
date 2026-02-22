import React, { useState, useEffect } from 'react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CalendarHUD({ visible }) {
    const [timeState, setTimeState] = useState({
        week: 1,
        dayOfWeek: 1,
        hour: 8,
        minute: 0
    });

    useEffect(() => {
        if (!visible) return;

        // Poll GameState.state to keep HUD in sync without a full React context wrapper yet.
        // We poll because GameState is currently a static object, not a Zustand store.
        const interval = setInterval(() => {
            const state = window._artLifeState;
            if (state) {
                setTimeState({
                    week: state.week || 1,
                    dayOfWeek: state.dayOfWeek || 1,
                    hour: state.hour || 8,
                    minute: state.minute || 0
                });
            }
        }, 200);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    const dayName = DAYS[Math.max(0, Math.min(timeState.dayOfWeek - 1, 6))] || 'MON';
    const hourStr = timeState.hour.toString().padStart(2, '0');
    const minStr = timeState.minute.toString().padStart(2, '0');

    // Determine am/pm style formatting or thematic color changes based on time
    const isNight = timeState.hour >= 19 || timeState.hour < 6;

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1000,
            background: 'var(--bg)',
            // Fake scanlines via linear-gradient over the background
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
            backgroundSize: `100% 4px, 100% 100%`,
            border: '1px solid var(--border)',
            color: 'var(--gold)',
            padding: '10px 20px',
            fontFamily: 'var(--font)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
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
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.2; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
