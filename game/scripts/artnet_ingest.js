import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_DIR = path.join(__dirname, '../src/data');
const ARTWORKS_FILE = path.join(DATA_DIR, 'artworks.js');
const IMG_DIR = path.join(__dirname, '../public/artworks');

const cleanString = (str) => {
    if (!str) return '';
    return str.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
};

const extractNumber = (str) => {
    if (!str) return null;
    const match = str.replace(/,/g, '').match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
};

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
};

async function scrapeWikiArt(url) {
    console.log(`🚀 Booting headless browser to scrape WikiArt: ${url}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('👀 Navigating to page...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('⏳ Waiting for content to render...');
        await page.waitForSelector('article', { timeout: 10000 }).catch(() => { });
        await new Promise(r => setTimeout(r, 2000));

        console.log('🧠 Extracting data...');
        const data = await page.evaluate(() => {
            const extractText = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim() : '';
            };

            // WikiArt specific selectors
            const title = extractText('article h3') || extractText('h1') || extractText('.article-name');
            const artist = extractText('article h5 span[itemprop="name"]') || extractText('article h4 a') || extractText('.artist-name');
            const yearStr = extractText('article h5 span[itemprop="dateCreated"]') || '';
            const medium = extractText('article ul li span[itemprop="artMedium"]') || extractText('.dictionary-values') || '';
            const genre = extractText('article ul li span[itemprop="artGenre"]') || '';

            let imgUrl = '';
            const imgEl = document.querySelector('img[itemprop="image"]');
            if (imgEl && imgEl.src) {
                imgUrl = imgEl.src;
                // Wikiart uses !HalfHd.jpg or similar suffixes for scaled images. Try to get the original.
                imgUrl = imgUrl.split('!')[0];
            } else {
                // fallback
                const fallbackImg = document.querySelector('.ms-zoom-cursor');
                if (fallbackImg) imgUrl = fallbackImg.src.split('!')[0];
            }

            return { title, artist, yearStr, medium, genre, imgUrl };
        });

        console.log('Extraction result:', JSON.stringify(data, null, 2));

        if (!data.artist || !data.title || !data.imgUrl) {
            throw new Error("Missing core data (Title, Artist, or Image). Check URL or Selectors.");
        }

        const cleanArtist = cleanString(data.artist);
        const cleanTitle = cleanString(data.title);
        const yearMatch = data.yearStr.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : '';

        // Ensure medium falls into generic logical categories if possible
        let cleanMedium = cleanString(data.medium);
        if (cleanMedium.toLowerCase().includes('oil')) cleanMedium = 'Oil painting';
        else if (cleanMedium.toLowerCase().includes('acrylic')) cleanMedium = 'Acrylic painting';

        // Base Price heuristic based on year and "vibe" (very naive logic for the game)
        let basePrice = 50000;
        const yearNum = parseInt(year);
        if (yearNum) {
            if (yearNum < 1900) basePrice = 2500000; // Impressionist/Classic
            else if (yearNum < 1950) basePrice = 1000000; // Modern
            else if (yearNum < 1980) basePrice = 500000; // Post-War
            else basePrice = 100000; // Contemporary
        }

        console.log(`\n✅ Parsed Artwork:`);
        console.log(`   Title:  ${cleanTitle}`);
        console.log(`   Artist: ${cleanArtist}`);
        console.log(`   Year:   ${year}`);
        console.log(`   Medium: ${cleanMedium}`);
        console.log(`   Price:  $${basePrice.toLocaleString()}`);

        const artistSlug = cleanArtist.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const titleSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        const imgFilename = `wiki_${artistSlug}_${titleSlug}.jpg`;

        console.log(`\n🖼️ Downloading image to: ${imgFilename}`);
        const targetPath = path.join(IMG_DIR, imgFilename);

        try {
            await downloadImage(data.imgUrl, targetPath);
            console.log('✅ Image downloaded successfully.');
        } catch (imgErr) {
            console.error('❌ Failed to download image:', imgErr.message);
            throw imgErr; // Abort if we don't have the picture
        }

        const artworkId = `art_${artistSlug.slice(0, 5)}_${Date.now().toString().slice(-6)}`;
        const artistId = `artist_${artistSlug}`;

        const newArtwork = {
            id: artworkId,
            title: cleanTitle,
            artist: cleanArtist,
            artistId: artistId,
            year: year,
            medium: cleanMedium || 'Painting',
            askingPrice: basePrice,
            basePrice: basePrice,
            genre: (data.genre || 'contemporary painting').toLowerCase(),
            tier: basePrice > 500000 ? 'blue-chip' : basePrice >= 100000 ? 'hot' : 'mid-career',
            sprite: imgFilename,
            _source: 'data'
        };

        console.log(`\n📝 Injecting into data files...`);
        let artworksContent = fs.readFileSync(ARTWORKS_FILE, 'utf8');

        const match = artworksContent.match(/(export const ARTWORKS = \[)([\s\S]*?)(\];)/);
        if (match) {
            let newObjStr = JSON.stringify(newArtwork, null, 4);
            // Fix keys quote styling
            newObjStr = newObjStr.replace(/"([^"]+)":/g, '$1:');

            const updatedContent = artworksContent.replace(
                /(export const ARTWORKS = \[)([\s\S]*?)(\];)/,
                `$1$2,\n    ${newObjStr}\n$3`
            );
            fs.writeFileSync(ARTWORKS_FILE, updatedContent, 'utf8');
            console.log(`✅ Appended ${newArtwork.id} to ARTWORKS_FILE`);
        } else {
            console.log("❌ Could not parse ARTWORKS array in file. Skipped writing.");
        }

        console.log(`\n🎉 Done! Scraper finished.`);

    } catch (e) {
        console.error('\n❌ Scrape Failed:', e.message);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

const url = process.argv[2];
if (!url) {
    console.error("Please provide a Wikiart URL.\nExample: node scripts/artnet_ingest.js 'https://www.wikiart.org/en/claude-monet/water-lilies-1915'");
    process.exit(1);
}

scrapeWikiArt(url);
