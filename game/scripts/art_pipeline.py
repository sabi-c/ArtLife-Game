#!/usr/bin/env python3
"""
art_pipeline.py — Real-World Art Sourcing & Processing Pipeline
Phase 42: Automated curation and pixelation of museum artworks.

This script manages the workflow for pulling real art into the game:
  1. Search: Queries the Met Museum API for artworks matching a term.
  2. Manifest: Creates an `art_manifest.json` with results.
  3. Approve: User manually edits the manifest to set `"approved": true`.
  4. Process: Downloads the approved high-res images, applies a pixelation filter,
              and saves them to the game's public/art/ directory.

Usage:
  python3 scripts/art_pipeline.py search "abstract expressionism" --limit 10
  python3 scripts/art_pipeline.py process
"""

import argparse
import json
import os
import requests
from io import BytesIO
from pathlib import Path
from PIL import Image

# Configuration
GAME_DIR = Path(__file__).parent.parent
MANIFEST_FILE = GAME_DIR / 'assets' / 'art_manifest.json'
RAW_ART_DIR = GAME_DIR / 'assets' / 'art_raw'
PROCESSED_ART_DIR = GAME_DIR / 'public' / 'art'

MET_SEARCH_API = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT_API = "https://collectionapi.metmuseum.org/public/collection/v1/objects/"

def search_art(query, limit=10):
    """Search the Met API and generate a manifest for user approval."""
    print(f"🔍 Searching Met Museum API for '{query}'...")
    
    # We only want objects that have images
    response = requests.get(MET_SEARCH_API, params={"q": query, "hasImages": "true"})
    if response.status_code != 200:
        print(f"❌ API Error: {response.status_code}")
        return
    
    data = response.json()
    if not data or not data.get("objectIDs"):
        print("❌ No results found.")
        return
    
    object_ids = data["objectIDs"][:limit]
    print(f"Found {data['total']} results. Fetching details for top {len(object_ids)}...")
    
    manifest = {
        "query": query,
        "results": []
    }
    
    # If appending to existing manifest, load it
    if MANIFEST_FILE.exists():
        with open(MANIFEST_FILE, 'r') as f:
            manifest = json.load(f)
            # Remove old unapproved to avoid bloat, or keep them? Let's keep them and append
    
    existing_ids = {str(item["id"]) for item in manifest.get("results", [])}
    
    added = 0
    for obj_id in object_ids:
        if str(obj_id) in existing_ids:
            continue
            
        res = requests.get(f"{MET_OBJECT_API}{obj_id}")
        if res.status_code == 200:
            item = res.json()
            if item.get("primaryImageSmall"):
                title = item.get("title", "Untitled")
                artist = item.get("artistDisplayName", "Unknown")
                year = item.get("objectDate", "Unknown date")
                image_url = item.get("primaryImageSmall")
                
                slug = "".join(x if x.isalnum() else "_" for x in title.lower())
                # prevent double underscores
                while "__" in slug:
                    slug = slug.replace("__", "_")
                slug = slug.strip("_")[:30]
                
                filename = f"art_{slug}_{obj_id}.png"
                
                manifest["results"].append({
                    "id": str(obj_id),
                    "title": title,
                    "artist": artist,
                    "year": year,
                    "image_url": image_url,
                    "filename": filename,
                    "approved": False,
                    "processed": False
                })
                added += 1
                print(f"  + Added: {title} by {artist}")

    MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ Created/Updated manifest with {added} new potential artworks.")
    print(f"📁 Please review '{MANIFEST_FILE}' and set 'approved': true for the ones you want.")

def pixelate_image(img_data, output_path, pixel_size=64):
    """
    Downsample the image to create a pixel art effect.
    We resize down to pixel_size, then scale back up via Nearest Neighbor.
    """
    img = object
    try:
        img = Image.open(BytesIO(img_data))
        # Convert to RGB (in case of RGBA or CMYK)
        img = img.convert("RGB")
        
        # Calculate aspect ratio
        aspect = img.width / img.height
        
        if img.width > img.height:
            new_w = pixel_size
            new_h = int(pixel_size / aspect)
        else:
            new_h = pixel_size
            new_w = int(pixel_size * aspect)
            
        # Downscale to lose detail (the "pixelation" step)
        small_img = img.resize((new_w, new_h), resample=Image.Resampling.BILINEAR)
        
        # Optionally, reduce color palette here (quantize)
        # small_img = small_img.quantize(colors=16).convert("RGB")
        
        # Upscale back to a usable size (e.g. 512px) for crisp square pixels
        final_size = 512
        if new_w > new_h:
            up_w = final_size
            up_h = int(final_size / aspect)
        else:
            up_h = final_size
            up_w = int(final_size * aspect)
            
        final_img = small_img.resize((up_w, up_h), Image.Resampling.NEAREST)
        
        # Save
        final_img.save(output_path, "PNG")
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def process_approved():
    """Download and process approved artworks."""
    if not MANIFEST_FILE.exists():
        print("❌ No manifest found. Run 'search' first.")
        return
        
    with open(MANIFEST_FILE, 'r') as f:
        manifest = json.load(f)
        
    RAW_ART_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_ART_DIR.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for item in manifest.get("results", []):
        if item.get("approved") and not item.get("processed"):
            print(f"Downloading: {item['title']}...")
            url = item["image_url"]
            try:
                res = requests.get(url)
                if res.status_code == 200:
                    raw_path = RAW_ART_DIR / f"raw_{item['filename']}"
                    with open(raw_path, 'wb') as f_raw:
                        f_raw.write(res.content)
                    
                    # Process it
                    out_path = PROCESSED_ART_DIR / item['filename']
                    if pixelate_image(res.content, out_path, pixel_size=64):
                        print(f"  🎨 Pixelated and saved to {out_path.name}")
                        item["processed"] = True
                        count += 1
                    else:
                        print("  ❌ Failed to pixelate.")
                else:
                    print(f"  ❌ Failed to download. HTTP {res.status_code}")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                
        
    # Save manifest back with updated processed statuses
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    if count > 0:
        print(f"\n✅ Successfully processed {count} artworks!")
        export_to_js(manifest)
    else:
        print("\nℹ️ No approved, unprocessed artworks found.")

def export_to_js(manifest):
    """Export the processed artworks to src/data/artworks.js for the game to use."""
    js_path = GAME_DIR / 'src' / 'data' / 'artworks.js'
    
    js_content = "export const Artworks = {\n"
    
    # We only export approved and processed items
    for item in manifest.get("results", []):
        if item.get("approved") and item.get("processed"):
            # Create a safe JS key
            key = item["filename"].replace("art_", "").replace(".png", "")
            
            js_content += f"  {key}: {{\n"
            js_content += f"    id: '{item['id']}',\n"
            js_content += f"    title: `{item['title'].replace('`', '')}`,\n"
            js_content += f"    artist: `{item['artist'].replace('`', '')}`,\n"
            js_content += f"    year: '{item['year']}',\n"
            js_content += f"    sprite: '{item['filename']}',\n"
            js_content += f"  }},\n"
            
    js_content += "};\n"
    
    js_path.parent.mkdir(parents=True, exist_ok=True)
    with open(js_path, 'w') as f:
        f.write(js_content)
        
    print(f"✅ Exported game data to {js_path.relative_to(GAME_DIR)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ArtLife Real-World Art Pipeline")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Search command
    search_parser = subparsers.add_parser("search", help="Search the Met API")
    search_parser.add_argument("query", type=str, help="Search term (e.g. 'picasso')")
    search_parser.add_argument("--limit", type=int, default=10, help="Max items to fetch")
    
    # Process command
    process_parser = subparsers.add_parser("process", help="Download and pixelate approved art")
    
    args = parser.parse_args()
    
    if args.command == "search":
        search_art(args.query, args.limit)
    elif args.command == "process":
        process_approved()
    else:
        parser.print_help()
