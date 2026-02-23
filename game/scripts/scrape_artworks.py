import re
import os
import sys
import time
import requests
import wikipediaapi

# Paths
GAME_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTWORKS_JS_PATH = os.path.join(GAME_DIR, "src", "data", "artworks.js")
IMG_OUTPUT_DIR = os.path.join(GAME_DIR, "public", "artworks")

if not os.path.exists(IMG_OUTPUT_DIR):
    os.makedirs(IMG_OUTPUT_DIR)

def extract_artworks():
    """Extract id, artist, and title from artworks.js using regex."""
    with open(ARTWORKS_JS_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    artworks = []
    blocks = content.split('{')
    for block in blocks:
        if "id:" in block and "title:" in block and "artist:" in block:
            try:
                id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", block)
                title_match = re.search(r"title:\s*['\"]([^'\"]+)['\"]", block)
                artist_match = re.search(r"artist:\s*['\"]([^'\"]+)['\"]", block)
                
                if id_match and title_match and artist_match:
                    artworks.append({
                        "id": id_match.group(1),
                        "title": title_match.group(1),
                        "artist": artist_match.group(1)
                    })
            except Exception:
                pass
                
    return artworks

def download_image(url, save_path):
    """Download image from URL to save_path."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()
            
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    ❌ Download failed: {e}")
        return False

def scrape_wikipedia():
    artworks = extract_artworks()
    print(f"Found {len(artworks)} artworks in artworks.js")
    
    # Init Wikipedia API
    wiki = wikipediaapi.Wikipedia('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'en')
    success_count = 0
    
    for i, art in enumerate(artworks):
        print(f"\n[{i+1}/{len(artworks)}] {art['artist']} - {art['title']} ({art['id']})")
        
        filename = f"{art['id']}.jpg"
        save_path = os.path.join(IMG_OUTPUT_DIR, filename)
        
        if os.path.exists(save_path):
            print(f"    ✅ Image already exists. Skipping.")
            success_count += 1
            continue
            
        # Try finding the specific painting page first
        search_term = f"{art['title']}"
        print(f"    🔍 Searching Wikipedia for: {search_term}")
        
        page = wiki.page(search_term)
        if not page.exists() and len(art['title'].split(' ')) > 2:
            # Try appending the artist name
            search_term_2 = f"{art['title']} ({art['artist'].split()[-1]})"
            print(f"    🔍 Title not found. Trying: {search_term_2}")
            page = wiki.page(search_term_2)
            
        if not page.exists():
            print("    ❌ Wikipedia page not found. Trying artist page...")
            page = wiki.page(art['artist'])
            
        if page.exists():
            # In wikipediaapi, getting main image URL requires a direct API call to MediaWiki Action API
            # Let's query the main MediaWiki API directly to get the thumbnail/image
            
            req_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles={page.title.replace(' ', '%20')}"
            try:
                res = requests.get(req_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
                data = res.json()
                pages = data.get('query', {}).get('pages', {})
                img_url = None
                
                for pid, pdata in pages.items():
                    if 'original' in pdata and 'source' in pdata['original']:
                        img_url = pdata['original']['source']
                        break
                        
                if img_url:
                    print(f"    ⬇️ Downloading: {img_url}")
                    if download_image(img_url, save_path):
                        print(f"    ✅ Download successful!")
                        success_count += 1
                        time.sleep(1)
                        continue
                else:
                    print(f"    ❌ No main image found on page '{page.title}'.")
            except Exception as e:
                print(f"    ❌ MediaWiki API error: {e}")
                
        else:
            print("    ❌ Neither artwork nor artist found on Wikipedia.")
            
        time.sleep(1)
            
    print(f"\n🎉 Finished! Successfully downloaded/verified {success_count}/{len(artworks)} images.")

if __name__ == "__main__":
    scrape_wikipedia()
