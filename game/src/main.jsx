import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Import our original global CSS
import './style.css';

// Mount the React Application
const root = document.getElementById('root');
if (root) {
    createRoot(root).render(<App />);
} else {
    console.error('Failed to find #root element to mount React.');
}
