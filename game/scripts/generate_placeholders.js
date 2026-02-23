import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { ARTWORKS } from '../src/data/artworks.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMG_DIR = path.resolve(__dirname, '../public/artworks');

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

// Ensure unique colors based on artist name string hash
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Adjust color lightness
function adjustLightness(hex, amt) {
    let usePound = false;
    if (hex[0] == "#") { hex = hex.slice(1); usePound = true; }
    let num = parseInt(hex, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

let createdCount = 0;

for (const art of ARTWORKS) {
    const filename = `${art.id}.jpg`;
    const outputPath = path.join(IMG_DIR, filename);

    // Skip if existing file (from Wikipedia or manual download) is > 0 bytes
    if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 1024) {  // Valid image
            console.log(`[SKIP] ${filename} already exists.`);
            continue;
        }
    }

    const canvas = createCanvas(800, 800);
    const ctx = canvas.getContext('2d');

    // Base colors
    const baseColor = stringToColor(art.artist + art.genre);
    const altColor = adjustLightness(baseColor, 40);
    const darkColor = adjustLightness(baseColor, -60);

    // Background Fill
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 800, 800);

    // Draw some abstract shapes based on genre/tier
    if (art.tier === 'classic' || art.genre === 'pop-art') {
        // Bold geometry
        ctx.fillStyle = altColor;
        ctx.beginPath();
        ctx.arc(400, 400, 250, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 20;
        ctx.stroke();
    } else if (art.genre === 'abstract' || art.genre === 'neo-expressionism') {
        // Splatters / jagged lines
        ctx.strokeStyle = altColor;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.lineTo(700, 700);
        ctx.moveTo(700, 100);
        ctx.lineTo(100, 700);
        ctx.stroke();

        ctx.fillStyle = darkColor;
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(Math.random() * 700, Math.random() * 700, 100, 100);
        }
    } else {
        // Minimalist blocks
        ctx.fillStyle = altColor;
        ctx.fillRect(150, 150, 500, 200);
        ctx.fillStyle = darkColor;
        ctx.fillRect(150, 450, 500, 200);
    }

    // Artist / Title text overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 650, 800, 150);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText((art.title || '').substring(0, 40), 400, 700);

    ctx.font = '24px Helvetica';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(art.artist || 'Unknown Artist', 400, 740);

    // Save
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    fs.writeFileSync(outputPath, buffer);
    console.log(`[GEN] Created placeholder -> ${filename}`);
    createdCount++;
}

console.log(`\n🎉 Generated ${createdCount} placeholder images for missing artworks!`);
