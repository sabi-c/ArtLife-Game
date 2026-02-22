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
            top: 16,
            right: 16,
            zIndex: 1000,
            background: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #c9a84c',
            color: '#c9a84c',
            padding: '8px 16px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid rgba(201, 168, 76, 0.3)',
                paddingRight: '12px',
                textAlign: 'right'
            }}>
                <span style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>WEEK</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{timeState.week.toString().padStart(2, '0')}</span>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
            }}>
                <span style={{ fontSize: '18px', fontWeight: isNight ? 'normal' : 'bold', color: isNight ? '#7a7a8a' : '#c9a84c' }}>
                    {dayName}
                </span>
                <span style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: isNight ? '#a0a0b0' : '#fff',
                    textShadow: isNight ? 'none' : '0 0 4px rgba(255,255,255,0.4)'
                }}>
                    {hourStr}:{minStr}
                </span>
            </div>

            {isNight && (
                <div style={{
                    marginLeft: '4px',
                    fontSize: '14px',
                    opacity: 0.8
                }}>🌙</div>
            )}
        </div>
    );
}
