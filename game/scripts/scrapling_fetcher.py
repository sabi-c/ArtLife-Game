#!/usr/bin/env python3
"""
scrapling_fetcher.py — Bulk Art Scraper for ArtLife Game
=========================================================
Uses WikiArt's undocumented JSON API to fetch artwork metadata
and download images at scale. Outputs game-ready JSON bundles.

Usage:
    python scrapling_fetcher.py                    # default 3 styles, 3 pages each
    python scrapling_fetcher.py --styles all       # all available styles
    python scrapling_fetcher.py --pages 5          # 5 pages per style
    python scrapling_fetcher.py --styles "cubism,surrealism" --pages 2
"""

import os
import sys
import json
import time
import hashlib
import random
import argparse
import requests

# ── Configuration ──────────────────────────────────────────────
WIKIART_API = "https://www.wikiart.org/en/paintings-by-style"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.wikiart.org/",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, 'bundles')
IMG_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'artworks')

# Style categories available on WikiArt
ALL_STYLES = [
    'post-impressionism', 'impressionism', 'romanticism',
    'expressionism', 'baroque', 'realism', 'art-nouveau-modern',
    'surrealism', 'cubism', 'abstract-expressionism',
    'pop-art', 'minimalism', 'color-field-painting',
    'symbolism', 'northern-renaissance', 'rococo',
    'neoclassicism', 'mannerism-late-renaissance',
    'ukiyo-e', 'art-deco',
]

DEFAULT_STYLES = ['post-impressionism', 'impressionism', 'romanticism']

# Famous artists for blue-chip tier pricing
BLUE_CHIP_NAMES = [
    'gogh', 'cezanne', 'monet', 'renoir', 'picasso', 'gauguin', 'seurat',
    'turner', 'klimt', 'munch', 'rembrandt', 'vermeer', 'raphael',
    'caravaggio', 'velázquez', 'botticelli', 'titian', 'el greco',
    'rubens', 'constable', 'delacroix', 'manet', 'degas', 'pissarro',
    'sisley', 'toulouse-lautrec', 'kandinsky', 'mondrian', 'matisse',
    'dali', 'magritte', 'warhol', 'pollock', 'rothko', 'basquiat',
]


# ── Helpers ────────────────────────────────────────────────────
def string_to_hash(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()[:8]


def generate_id(artist, title):
    a_slug = "".join(c if c.isalnum() else '_' for c in artist.lower())[:15]
    t_slug = "".join(c if c.isalnum() else '_' for c in title.lower())[:15]
    return f"{a_slug}_{t_slug}_{string_to_hash(artist + title)}"


def estimate_price_and_tier(artist, style):
    """Heuristic pricing: blue-chip names get millions, others get hundreds of thousands."""
    is_famous = any(n in artist.lower() for n in BLUE_CHIP_NAMES)

    if is_famous:
        base_price = random.randint(2_000_000, 25_000_000)
    elif style in ('impressionism', 'post-impressionism', 'baroque', 'romanticism'):
        base_price = random.randint(200_000, 2_000_000)
    else:
        base_price = random.randint(50_000, 500_000)

    if base_price > 5_000_000:
        tier = 'blue-chip'
    elif base_price > 500_000:
        tier = 'hot'
    elif base_price > 150_000:
        tier = 'mid-career'
    else:
        tier = 'emerging'

    return base_price, tier


MEDIUM_BY_STYLE = {
    'post-impressionism': 'Oil on canvas',
    'impressionism': 'Oil on canvas',
    'romanticism': 'Oil on canvas',
    'expressionism': 'Oil on canvas',
    'baroque': 'Oil on canvas',
    'realism': 'Oil on canvas',
    'surrealism': 'Oil on canvas',
    'cubism': 'Oil on canvas',
    'abstract-expressionism': 'Acrylic on canvas',
    'pop-art': 'Screenprint on paper',
    'minimalism': 'Acrylic on canvas',
    'color-field-painting': 'Acrylic on canvas',
    'art-nouveau-modern': 'Oil on canvas',
    'symbolism': 'Oil on canvas',
    'northern-renaissance': 'Oil on wood panel',
    'rococo': 'Oil on canvas',
    'neoclassicism': 'Oil on canvas',
    'mannerism-late-renaissance': 'Oil on wood panel',
    'ukiyo-e': 'Woodblock print on paper',
    'art-deco': 'Gouache on paper',
}


def download_image(url, save_path):
    """Download image with retry logic."""
    if os.path.exists(save_path) and os.path.getsize(save_path) > 1024:
        return True  # Already downloaded
    try:
        res = requests.get(url, headers=HEADERS, stream=True, timeout=15)
        if res.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in res.iter_content(8192):
                    f.write(chunk)
            return True
        elif res.status_code == 429:
            print(f"      ⏳ Rate limited. Sleeping 5s...")
            time.sleep(5)
            return download_image(url, save_path)  # Retry once
        else:
            print(f"      ❌ HTTP {res.status_code}")
    except Exception as e:
        print(f"      ❌ {e}")
    return False


def fetch_wikiart_page(style, page):
    """Fetch one page of paintings from WikiArt JSON API."""
    url = f"{WIKIART_API}/{style}?json=2&page={page}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            return res.json()
        else:
            print(f"    ❌ API returned {res.status_code} for {url}")
    except Exception as e:
        print(f"    ❌ API error: {e}")
    return None


# ── Main Scraper ───────────────────────────────────────────────
def scrape(styles, pages_per_style, download_images=True):
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)

    all_artworks = []
    seen_ids = set()
    stats = {'styles': 0, 'pages': 0, 'artworks': 0, 'images_ok': 0, 'images_fail': 0}

    for style in styles:
        stats['styles'] += 1
        print(f"\n{'='*60}")
        print(f"  🎨 STYLE: {style.upper().replace('-', ' ')}")
        print(f"{'='*60}")

        for page in range(1, pages_per_style + 1):
            stats['pages'] += 1
            print(f"\n  📄 Page {page}/{pages_per_style}")

            data = fetch_wikiart_page(style, page)
            if not data:
                continue

            paintings = data.get('Paintings', [])
            if not paintings:
                print(f"    ⚠️ No more paintings. Moving to next style.")
                break

            print(f"    Found {len(paintings)} paintings")

            for p in paintings:
                title = p.get('title', '').strip()
                artist = p.get('artistName', '').strip()
                if not title or not artist:
                    continue

                art_id = generate_id(artist, title)
                if art_id in seen_ids:
                    continue
                seen_ids.add(art_id)

                # Image URL (strip WikiArt resize params)
                img_url = p.get('image', '')
                if img_url and '!' in img_url:
                    img_url = img_url.split('!')[0]

                # Download image
                img_downloaded = False
                if download_images and img_url:
                    filename = f"{art_id}.jpg"
                    save_path = os.path.join(IMG_DIR, filename)
                    img_downloaded = download_image(img_url, save_path)
                    if img_downloaded:
                        stats['images_ok'] += 1
                    else:
                        stats['images_fail'] += 1

                base_price, tier = estimate_price_and_tier(artist, style)
                medium = MEDIUM_BY_STYLE.get(style, 'Oil on canvas')

                artwork_doc = {
                    "id": art_id,
                    "title": title,
                    "artist": artist,
                    "yearCreated": str(p.get('year', '')),
                    "medium": medium,
                    "genre": style,
                    "basePrice": base_price,
                    "tier": tier,
                    "sprite": f"/artworks/{art_id}.jpg" if img_downloaded else None,
                    "wikiartUrl": f"https://www.wikiart.org{p.get('paintingUrl', '')}",
                }

                all_artworks.append(artwork_doc)
                stats['artworks'] += 1

            # Be kind to the API
            time.sleep(1)

    # ── Save Bundle ────────────────────────────────────────────
    bundle_name = 'artworks_bundle_1.json'
    out_file = os.path.join(OUT_DIR, bundle_name)
    with open(out_file, 'w') as f:
        json.dump({"artworks": all_artworks}, f, indent=2)

    # ── Summary ────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  🎉 SCRAPE COMPLETE")
    print(f"{'='*60}")
    print(f"  Styles scraped:  {stats['styles']}")
    print(f"  Pages fetched:   {stats['pages']}")
    print(f"  Artworks saved:  {stats['artworks']}")
    print(f"  Images OK:       {stats['images_ok']}")
    print(f"  Images failed:   {stats['images_fail']}")
    print(f"  Bundle:          {out_file}")
    print(f"{'='*60}\n")

    return all_artworks


# ── CLI ────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Bulk Art Scraper for ArtLife Game')
    parser.add_argument('--styles', type=str, default=None,
                        help='Comma-separated styles or "all" for everything')
    parser.add_argument('--pages', type=int, default=3,
                        help='Number of pages per style (default: 3)')
    parser.add_argument('--no-images', action='store_true',
                        help='Skip image downloads (metadata only)')
    args = parser.parse_args()

    if args.styles == 'all':
        styles = ALL_STYLES
    elif args.styles:
        styles = [s.strip() for s in args.styles.split(',')]
    else:
        styles = DEFAULT_STYLES

    scrape(styles, args.pages, download_images=not args.no_images)
