import React from 'react';

/**
 * OverlayErrorBoundary — lighter error boundary for individual overlays.
 * Shows component name, error, and lets user CLOSE (dismiss) rather than
 * forcing a full page reload. Falls back to reload if no onClose is provided.
 *
 * Usage:
 *   <OverlayErrorBoundary name="Settings" onClose={closeOverlay}>
 *       <SettingsOverlay ... />
 *   </OverlayErrorBoundary>
 */
export class OverlayErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error(`[OverlayError] ${this.props.name || 'Unknown'} crashed:`, error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const name = this.props.name || 'Overlay';
        const onClose = this.props.onClose;

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(10, 10, 15, 0.95)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: "'SF Mono', Courier, monospace",
                padding: '40px', textAlign: 'center', gap: '16px',
            }}>
                <div style={{ fontSize: 14, color: '#c94040', letterSpacing: '0.2em' }}>
                    ■ {name.toUpperCase()} ERROR
                </div>
                <div style={{ fontSize: 12, color: '#7a7a8a', maxWidth: 500, lineHeight: 1.8 }}>
                    {this.state.error?.message || 'An unexpected error occurred.'}
                </div>
                <pre style={{
                    fontSize: 10, color: '#444', maxWidth: 600, lineHeight: 1.6,
                    fontFamily: 'monospace', overflow: 'auto', maxHeight: 120,
                    textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                    {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
                </pre>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {onClose && (
                        <button
                            onClick={() => { this.setState({ hasError: false, error: null }); onClose(); }}
                            style={{
                                background: 'none', border: '1px solid #c9a84c',
                                color: '#c9a84c', fontFamily: 'inherit', fontSize: 11,
                                padding: '10px 20px', cursor: 'pointer', letterSpacing: '0.1em',
                            }}
                        >
                            [ CLOSE ]
                        </button>
                    )}
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            background: 'none', border: '1px solid #555',
                            color: '#888', fontFamily: 'inherit', fontSize: 11,
                            padding: '10px 20px', cursor: 'pointer', letterSpacing: '0.1em',
                        }}
                    >
                        [ RETRY ]
                    </button>
                </div>
            </div>
        );
    }
}
