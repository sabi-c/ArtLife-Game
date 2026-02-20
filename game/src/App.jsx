import React, { useEffect, useState } from 'react';
import Phaser from 'phaser';

import { createPhaserGame } from './phaserInit.js';
import DialogueBox from './ui/DialogueBox.jsx';
import { ErrorBoundary } from './ui/ErrorBoundary.jsx';

export default function App() {
    const [game, setGame] = useState(null);
    const [phaserError, setPhaserError] = useState(null);

    useEffect(() => {
        let phaserInstance;
        try {
            phaserInstance = createPhaserGame();
            setGame(phaserInstance);
        } catch (err) {
            console.error('[App] Phaser init failed:', err);
            setPhaserError(err.message || 'Phaser failed to initialise.');
        }

        return () => {
            if (phaserInstance) phaserInstance.destroy(true);
        };
    }, []);

    if (phaserError) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0f',
                color: '#c94040', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '16px', padding: '40px',
            }}>
                <div style={{ fontSize: '20px' }}>ENGINE ERROR</div>
                <div style={{ fontSize: '12px', color: '#7a7a8a' }}>{phaserError}</div>
                <button onClick={() => window.location.reload()}
                    style={{ background: 'none', border: '1px solid #c9a84c', color: '#c9a84c', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    [ RELOAD ]
                </button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            {/* The React UI Layer sits on top */}
            <DialogueBox />

            {/* The Phaser Canvas Layer sets up in this div */}
            <div id="phaser-game-container" />
        </ErrorBoundary>
    );
}
