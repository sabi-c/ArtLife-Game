import React from 'react';

/**
 * ErrorBoundary — catches React render errors and shows a recovery screen
 * instead of a blank white page.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
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

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div style={{
                position: 'fixed', inset: 0,
                background: '#0a0a0f', color: '#e8e4df',
                fontFamily: '"Press Start 2P", monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '40px', textAlign: 'center',
                gap: '24px',
            }}>
                <div style={{ fontSize: '28px', color: '#c94040' }}>UI ERROR</div>
                <div style={{ fontSize: '10px', color: '#7a7a8a', maxWidth: '500px', lineHeight: '2' }}>
                    {this.state.error?.message || 'An unexpected error occurred in the UI layer.'}
                </div>
                <div style={{ fontSize: '8px', color: '#555', maxWidth: '600px', lineHeight: '1.8', fontFamily: 'monospace' }}>
                    {this.state.error?.stack?.split('\n').slice(0, 4).join('\n')}
                </div>
                <button
                    onClick={this.handleReload}
                    style={{
                        background: 'none', border: '1px solid #c9a84c',
                        color: '#c9a84c', fontFamily: 'inherit', fontSize: '10px',
                        padding: '12px 24px', cursor: 'pointer', marginTop: '16px',
                    }}
                >
                    [ RELOAD GAME ]
                </button>
            </div>
        );
    }
}
