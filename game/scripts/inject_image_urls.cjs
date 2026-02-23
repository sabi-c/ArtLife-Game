#!/usr/bin/env node
/**
 * inject_image_urls.js
 * 
 * Reads the scraper bundle (artworks_bundle_1.json) and injects the WikiArt
 * CDN image URL into each artwork entry in artworks.js.
 * 
 * This allows images to load directly from WikiArt's servers, eliminating the
 * need to ship 635MB of local image files through GitHub.
 * 
 * The resolveImageUrl() helper in BloombergTerminal.jsx and ArtworkEditor.jsx
 * already checks imageUrl first, so this is a non-breaking change.
 * 
 * Usage: node scripts/inject_image_urls.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BUNDLE_PATH = path.join(__dirname, 'bundles', 'artworks_bundle_1.json');
const ARTWORKS_PATH = path.join(__dirname, '..', 'src', 'data', 'artworks.js');

// WikiArt's image URL pattern uses uploads[0-9].wikiart.org/images/...
// The page URL contains the artist slug + painting slug
// We can derive the image CDN URL from the painting page JSON API

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.wikiart.org/',
};

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: HEADERS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

async function main() {
    // Step 1: Load bundle
    console.log('📦 Loading bundle...');
    const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf-8'));
    const bundleArtworks = bundle.artworks;
    console.log(`   Found ${bundleArtworks.length} artworks in bundle`);

    // Step 2: For each artwork with a wikiartUrl, fetch the painting detail to get image CDN URL
    // WikiArt painting detail API: append ?json=2 to page URL
    const imageUrls = new Map(); // id -> CDN URL
    let fetched = 0, failed = 0, cached = 0;

    // Check if we already have a cache file
    const CACHE_PATH = path.join(__dirname, 'bundles', 'image_urls_cache.json');
    let cache = {};
    if (fs.existsSync(CACHE_PATH)) {
        cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        cached = Object.keys(cache).length;
        console.log(`   Cache: ${cached} URLs already resolved`);
    }

    for (let i = 0; i < bundleArtworks.length; i++) {
        const art = bundleArtworks[i];
        const id = art.id;

        // Use cache if available
        if (cache[id]) {
            imageUrls.set(id, cache[id]);
            continue;
        }

        if (!art.wikiartUrl) continue;

        // Fetch painting detail
        const detailUrl = art.wikiartUrl + '?json=2';
        try {
            const detail = await fetchJson(detailUrl);
            let imgUrl = detail.image || detail.ImageUrl || detail.imageUrl || '';
            // Strip WikiArt resize params (everything after !)
            if (imgUrl && imgUrl.includes('!')) {
                imgUrl = imgUrl.split('!')[0];
            }
            if (imgUrl) {
                imageUrls.set(id, imgUrl);
                cache[id] = imgUrl;
                fetched++;
                if (fetched % 20 === 0) {
                    console.log(`   Fetched ${fetched}/${bundleArtworks.length - cached}...`);
                    // Save cache incrementally
                    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
                }
            } else {
                console.log(`   ⚠️ No image URL for: ${art.title}`);
                failed++;
            }
        } catch (err) {
            console.log(`   ❌ Failed for ${art.title}: ${err.message}`);
            failed++;
        }

        // Rate limit: 200ms between requests
        await new Promise(r => setTimeout(r, 200));
    }

    // Save final cache
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`\n✅ Resolved ${imageUrls.size} image URLs (${fetched} new, ${cached} cached, ${failed} failed)`);

    // Step 3: Inject imageUrl into artworks.js
    console.log('\n📝 Injecting imageUrl into artworks.js...');
    let content = fs.readFileSync(ARTWORKS_PATH, 'utf-8');
    let injected = 0;

    for (const [id, url] of imageUrls) {
        // Find the artwork entry by its id and add imageUrl after the sprite line
        // Pattern: sprite: '/artworks/xxx.jpg', (or sprite: 'xxx.png',)
        // We want to add: imageUrl: 'https://uploads.wikiart.org/...',
        const idPattern = `id: '${id}'`;
        const idIndex = content.indexOf(idPattern);
        if (idIndex === -1) continue;

        // Check if imageUrl already exists for this artwork
        const nextArtworkIndex = content.indexOf("id: '", idIndex + 1);
        const section = content.slice(idIndex, nextArtworkIndex === -1 ? undefined : nextArtworkIndex);
        if (section.includes('imageUrl:')) continue;

        // Find the sprite line in this artwork's section
        const spriteMatch = section.match(/sprite:\s*'[^']*',?\s*\n/);
        if (spriteMatch) {
            const insertPoint = idIndex + spriteMatch.index + spriteMatch[0].length;
            const indent = spriteMatch[0].match(/^\s*/)[0] || '        ';
            const newLine = `${indent}imageUrl: '${url}',\n`;
            content = content.slice(0, insertPoint) + newLine + content.slice(insertPoint);
            injected++;
        }
    }

    fs.writeFileSync(ARTWORKS_PATH, content);
    console.log(`✅ Injected ${injected} imageUrl entries into artworks.js`);
    console.log(`\n🎉 Done! Images will now load from WikiArt CDN.`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
