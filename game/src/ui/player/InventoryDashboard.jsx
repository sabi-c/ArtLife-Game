import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import './PlayerDashboard.css'; // Reusing for consistent neo-noir styles

export default function InventoryDashboard({ onClose }) {
    const [visible, setVisible] = useState(false);

    // Subscribe to the inventory store
    const [items, setItems] = useState(() => useInventoryStore.getState().items);

    useEffect(() => {
        const unsub = useInventoryStore.subscribe((state) => setItems(state.items));
        return unsub;
    }, []);

    // Entrance animation
    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 250); // Matches CSS transition time
    };

    return (
        <div className={`pd-overlay ${visible ? 'visible' : ''}`} onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
        }}>
            <div className="pd-container" style={{ maxWidth: '800px' }}>
                <header className="pd-header">
                    <h2 className="pd-title">INVENTORY / ARTIFACTS</h2>
                    <button className="pd-close-btn" onClick={handleClose}>[ ESC ]</button>
                </header>

                <div className="pd-content" style={{ marginTop: 20 }}>
                    {items.length === 0 ? (
                        <div style={{ color: '#555', fontFamily: 'monospace', textAlign: 'center', padding: '40px' }}>
                            // NO ITEMS ACQUIRED YET //
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                            {items.map((item, idx) => (
                                <div key={idx} style={{
                                    border: '1px solid #333', padding: '15px', background: '#0a0a0f',
                                    transition: 'border-color 0.2s ease', cursor: 'default'
                                }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#c9a84c'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
                                >
                                    <div style={{ fontSize: '10px', color: '#c9a84c', marginBottom: '5px', fontFamily: 'monospace' }}>
                                        {item.type?.toUpperCase() || 'ARTIFACT'}
                                    </div>
                                    <div style={{ color: '#eaeaea', fontFamily: '"Playfair Display", serif', fontSize: '18px', marginBottom: '10px' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>
                                        Acquired: {new Date(item.acquiredAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
