import { PlaywrightCrawler, Dataset } from 'crawlee';
import fs from 'fs';
import path from 'path';

// WikiArt Category: Post-Impressionism (as a rich initial test case)
const START_URL = 'https://www.wikiart.org/en/paintings-by-style/post-impressionism?select=featured#!#filterName:featured,expanded:true';

// Helper: robust hash for ID generation
function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

// Ensure output directories exist
const OUT_DIR = path.resolve('../bundles');
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            // Keep headless true for background execution, but add user agent
            headless: true,
        },
    },
    maxConcurrency: 1,
    maxRequestsPerCrawl: 50, // Limit for initial testing

    async requestHandler({ page, request, log, pushData }) {
        log.info(`Processing ${request.url}...`);

        // Wait for the painting grid to load
        await page.waitForSelector('.artworks-by-dictionary', { timeout: 15000 });

        // Scroll a few times to trigger lazy loading if needed
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel(0, 2000);
            await page.waitForTimeout(1000);
        }

        // Extract artwork cards
        const artworks = await page.$$eval('.artwork-masonry .artwork-item', els => {
            return els.map(el => {
                const imgEl = el.querySelector('img');
                const titleEl = el.querySelector('.artwork-name');
                const artistEl = el.querySelector('.artist-name');
                const yearEl = el.querySelector('.artwork-year');

                return {
                    title: titleEl ? titleEl.textContent.trim() : 'Untitled',
                    artistName: artistEl ? artistEl.textContent.trim() : 'Unknown Artist',
                    year: yearEl ? yearEl.textContent.trim().replace(/,/g, '') : '',
                    imageUrl: imgEl ? imgEl.getAttribute('src') : null,
                    // Note: WikiArt lazy loads images, so sometimes src is a placeholder. 
                    // We'll try to get the raw image-id if possible, or fallback.
                    imageId: imgEl ? imgEl.getAttribute('image-id') : null
                };
            }).filter(art => art.title && art.artistName && art.imageUrl);
        });

        log.info(`Extracted ${artworks.length} artworks from page.`);

        // Clean and push data
        for (const art of artworks) {
            // Clean WikiArt URL (remove tracking/resizing params)
            let cleanUrl = art.imageUrl;
            if (cleanUrl && cleanUrl.includes('!')) {
                cleanUrl = cleanUrl.split('!')[0];
            }

            // Create game-compatible slug string
            const artistSlug = art.artistName.toLowerCase().replace(/[^a-z0-z]+/g, '_').substring(0, 15);
            const titleSlug = art.title.toLowerCase().replace(/[^a-z0-z]+/g, '_').substring(0, 15);

            // Generate standard game properties
            const id = `${artistSlug}_${titleSlug}_${stringToHash(art.title + art.artistName)}`;

            // Heuristic Base Price
            let basePrice = 50000;
            if (['Van Gogh', 'Cezanne', 'Gauguin', 'Seurat'].some(n => art.artistName.includes(n))) {
                basePrice = 5000000 + (Math.random() * 20000000); // 5m - 25m
            } else {
                basePrice = 100000 + (Math.random() * 1000000); // 100k - 1m
            }

            // Heuristic Tier
            let tier = 'mid-career';
            if (basePrice > 5000000) tier = 'blue-chip';
            else if (basePrice > 500000) tier = 'hot';

            await pushData({
                id: id,
                title: art.title,
                artist: art.artistName,
                yearCreated: art.year,
                medium: "Oil on canvas", // Default assumption for post-impressionism
                basePrice: Math.floor(basePrice),
                tier: tier,
                genre: 'post-impressionism',
                imageUrl: cleanUrl || art.imageUrl
            });
        }
    },

    failedRequestHandler({ request, log }) {
        log.error(`Request ${request.url} failed too many times.`);
    },
});

// Run Crawlee
console.log('Starting Scraper...');
await crawler.run([START_URL]);

// Export dataset to our game's bundles directory
const outputFilename = path.join(OUT_DIR, 'batch_post_impressionism.json');
const dataset = await Dataset.open();
const data = await dataset.getData();

fs.writeFileSync(outputFilename, JSON.stringify({ artworks: data.items }, null, 2));
console.log(`\n🎉 Web scrape complete! Saved ${data.items.length} formatted artworks to ${outputFilename}`);
