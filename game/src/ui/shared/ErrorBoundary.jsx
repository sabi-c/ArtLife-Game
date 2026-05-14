import React from 'react';

/**
 * ErrorBoundary — catches React render errors and shows a recovery screen
 * instead of a blank white page.
 *
 * Recovery options:
 *   1. Reload — simple page refresh
 *   2. Clear Cache & Reload — unregisters SW, wipes caches, then reloads
 *   3. Shows error details for debugging
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, showStack: false, clearing: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] React render error:', error, info.componentStack);
    }

    handleReload() {
        window.location.reload();
    }

    async handleClearCacheAndReload() {
        this.setState({ clearing: true });
        try {
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(r => r.unregister()));
            }
            // Wipe all caches
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            // Clear localStorage game data that might be corrupted
            // (but preserve settings/saves)
        } catch (e) {
            console.warn('[ErrorBoundary] Cache clear failed:', e);
        }
        window.location.reload();
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const { error, showStack, clearing } = this.state;
        const isChunkError = error?.message?.includes('dynamically imported module')
            || error?.message?.includes('Failed to fetch')
            || error?.message?.includes('Loading chunk');

        return (
            <div style={{
                position: 'fixed', inset: 0,
                background: '#0a0a0f', color: '#e8e4df',
                fontFamily: '"IBM Plex Mono", "SF Mono", Courier, monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '40px', textAlign: 'center',
                gap: '20px',
            }}>
                <div style={{ fontSize: '24px', color: '#c94040', letterSpacing: '0.1em' }}>
                    UI ERROR
                </div>

                <div style={{ fontSize: '11px', color: '#7a7a8a', maxWidth: '500px', lineHeight: '2' }}>
                    {isChunkError
                        ? 'A new version was deployed but your browser has stale cached files. Clear cache below to fix.'
                        : (error?.message || 'An unexpected error occurred in the UI layer.')}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={() => this.handleReload()}
                        style={btnStyle('#c9a84c')}
                    >
                        RELOAD
                    </button>
                    <button
                        onClick={() => this.handleClearCacheAndReload()}
                        disabled={clearing}
                        style={btnStyle('#4aff88')}
                    >
                        {clearing ? 'CLEARING...' : 'CLEAR CACHE & RELOAD'}
                    </button>
                </div>

                {/* Collapsible error details */}
                <button
                    onClick={() => this.setState({ showStack: !showStack })}
                    style={{
                        background: 'none', border: 'none', color: '#555',
                        fontFamily: 'inherit', fontSize: '10px', cursor: 'pointer',
                        textDecoration: 'underline', marginTop: '8px',
                    }}
                >
                    {showStack ? 'Hide Details' : 'Show Details'}
                </button>

                {showStack && (
                    <pre style={{
                        fontSize: '9px', color: '#555', maxWidth: '700px',
                        lineHeight: '1.6', fontFamily: 'monospace',
                        textAlign: 'left', overflow: 'auto', maxHeight: '200px',
                        padding: '12px', background: '#111118', borderRadius: '4px',
                        border: '1px solid #1a1a2e', width: '100%',
                    }}>
                        {error?.stack || 'No stack trace available'}
                    </pre>
                )}

                <div style={{ fontSize: '9px', color: '#333', marginTop: '16px' }}>
                    If this keeps happening, try: Settings → Clear All Data
                </div>
            </div>
        );
    }
}

/** Shared button style for recovery actions */
function btnStyle(color) {
    return {
        background: 'none',
        border: `1px solid ${color}`,
        color,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '10px',
        padding: '10px 20px',
        cursor: 'pointer',
        letterSpacing: '0.05em',
    };
}
