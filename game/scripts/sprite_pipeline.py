#!/usr/bin/env python3
"""
sprite_pipeline.py — Full Sprite Generation Pipeline for ArtLife
Phase 40: Structured batch processing, naming, and dataset management.

This script manages the end-to-end workflow:
  1. Reads a sprite_jobs.json manifest of assets to generate
  2. For each job, constructs the full prompt from templates
  3. Outputs a ready-to-run prompt list (for Antigravity generate_image calls)
  4. Processes raw outputs through bg_remove (green screen chroma key)
  5. Deploys final PNGs to the correct game directory
  6. Updates the Asset_Manifest.md tracking document

Usage:
  python3 scripts/sprite_pipeline.py --list                      # Show all jobs and status
  python3 scripts/sprite_pipeline.py --process raw/              # Process all raw images in folder
  python3 scripts/sprite_pipeline.py --deploy                    # Deploy processed to public/
  python3 scripts/sprite_pipeline.py --prompts                   # Print all ready-to-use prompts
  python3 scripts/sprite_pipeline.py --process-one raw/img.png   # Process a single image

Directory Structure:
  game/
  ├── scripts/
  │   ├── sprite_pipeline.py    ← this file
  │   ├── bg_remove.py          ← background removal
  │   └── sprite_slice.py       ← spritesheet slicing
  └── assets/
      ├── raw/                  ← drop generated images here (unprocessed)
      ├── processed/            ← bg-removed PNGs land here
      └── sprite_jobs.json      ← job manifest
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

GAME_DIR = Path(__file__).parent.parent  # game/
RAW_DIR = GAME_DIR / 'assets' / 'raw'
PROCESSED_DIR = GAME_DIR / 'assets' / 'processed'
JOBS_FILE = GAME_DIR / 'assets' / 'sprite_jobs.json'
DEPLOY_DIRS = {
    'portrait':    GAME_DIR / 'public' / 'sprites',
    'walking':     GAME_DIR / 'public' / 'sprites',
    'background':  GAME_DIR / 'public' / 'backgrounds',
    'tile':        GAME_DIR / 'public' / 'tiles',
    'object':      GAME_DIR / 'public' / 'objects',
}
LOG_FILE = GAME_DIR / 'assets' / 'pipeline_log.jsonl'

# ─────────────────────────────────────────────
# PROMPT TEMPLATES
# ─────────────────────────────────────────────

STYLE_PREFIX = (
    "1-bit pixel art, pure black and white monochrome, retro Macintosh aesthetic, "
    "halftone dithering and bitmap gradients, highly pixelated 8-bit style, slightly softer contrast"
)

GREENSCREEN_BG = "Solid bright green chroma key background (#00FF00). The background must be a perfectly uniform solid bright green (#00FF00) color with zero variation."

TEMPLATES = {
    'portrait': (
        f"{STYLE_PREFIX}. {GREENSCREEN_BG} "
        "Upper-body portrait of {description}. {clothing}. "
        "Expression: {expression}. Bust shot, centered, facing slightly {facing}. "
        "512x512 resolution."
    ),
    'walking': (
        f"{STYLE_PREFIX}. Pure black background (#000000). "
        "Top-down RPG character spritesheet. 16x16 pixel sprites in a 4x4 grid "
        "(64px wide x 64px tall). {description}. "
        "Row 1: facing down (idle, step-left, idle, step-right). "
        "Row 2: facing left (idle, step-left, idle, step-right). "
        "Row 3: facing right (idle, step-left, idle, step-right). "
        "Row 4: facing up (idle, step-left, idle, step-right). "
        "Consistent pose across all frames."
    ),
    'background': (
        f"{STYLE_PREFIX}. "
        "Wide establishing shot of {description}. {lighting}. "
        "{atmosphere}. Moody, cinematic composition. 512x512 resolution."
    ),
    'object': (
        f"{STYLE_PREFIX}. {GREENSCREEN_BG} "
        "{description}. Isolated object, no background elements besides the green. "
        "Clean edges, suitable for game sprite. {size} resolution."
    ),
    'tile': (
        f"{STYLE_PREFIX}. {GREENSCREEN_BG} "
        "Top-down 2D orthographic RPG game asset tile (straight on perspective). "
        "{description}. "
        "Modular building block, perfectly tileable. Clean edges, isolated on the green background. "
        "512x512 resolution."
    ),
}

# ─────────────────────────────────────────────
# NAMING CONVENTION
# ─────────────────────────────────────────────
# Format: {category}_{id}.png
# Examples:
#   portrait_elena_ross.png
#   walking_player_class1.png
#   bg_gallery_main.png
#   obj_pedestal_marble.png

def generate_filename(job):
    """Generate standardized filename from job data."""
    prefixes = {
        'portrait': 'portrait',
        'walking': 'walk',
        'background': 'bg',
        'object': 'obj',
        'tile': 'tile',
    }
    prefix = prefixes.get(job['category'], job['category'])
    slug = job['id'].replace(' ', '_').replace('-', '_').lower()
    return f"{prefix}_{slug}.png"


# ─────────────────────────────────────────────
# CORE FUNCTIONS
# ─────────────────────────────────────────────

def load_jobs():
    """Load the sprite jobs manifest."""
    if not JOBS_FILE.exists():
        print(f"No jobs file found at {JOBS_FILE}")
        print("Creating template...")
        create_template_jobs()
        return load_jobs()
    
    with open(JOBS_FILE) as f:
        return json.load(f)


def create_template_jobs():
    """Create a template sprite_jobs.json with example entries."""
    JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    template = {
        "version": 1,
        "style_prefix": STYLE_PREFIX,
        "greenscreen": GREENSCREEN_BG,
        "jobs": [
            {
                "id": "elena_ross",
                "category": "portrait",
                "name": "Elena Ross",
                "description": "a confident gallery owner in her 40s, sharp features, slicked-back dark hair",
                "clothing": "Navy power suit, gold statement earrings, gold necklace",
                "expression": "confident knowing smirk",
                "facing": "right",
                "status": "done",
                "output_file": "dealer_shark.png",
                "notes": "Original sprite, already in game"
            },
            {
                "id": "art_critic",
                "category": "portrait",
                "name": "Art Critic",
                "description": "an older female art critic in her 50s, horn-rimmed glasses, silver bob haircut",
                "clothing": "Black turtleneck and dark blazer, holding a small notebook",
                "expression": "skeptical analytical expression",
                "facing": "left",
                "status": "done",
                "output_file": "portrait_art_critic.png",
                "notes": "Green screen test — verified clean"
            },
            {
                "id": "julian_vance",
                "category": "portrait",
                "name": "Julian Vance",
                "description": "a competitive male art collector in his late 30s, slicked-back dark hair, sharp jawline",
                "clothing": "Expensive tailored charcoal suit with gold cufflinks",
                "expression": "intense calculating stare with a slight competitive smirk",
                "facing": "right",
                "status": "done",
                "output_file": "dealer_rival.png",
                "notes": "Processed via flood-fill"
            },
            {
                "id": "young_artist",
                "category": "portrait",
                "name": "Young Artist",
                "description": "a young emerging artist in their mid-20s, messy dark hair, small hoop earring",
                "clothing": "Paint-stained denim jacket over a worn t-shirt",
                "expression": "passionate excited expression",
                "facing": "left",
                "status": "done",
                "output_file": "dealer_artist.png",
                "notes": "Processed via flood-fill"
            },
            {
                "id": "margaux_villiers",
                "category": "portrait",
                "name": "Margaux Villiers",
                "description": "an elegant art advisor in her 50s, refined features, perfectly styled silver hair",
                "clothing": "Cream silk blouse, pearl necklace, vintage Hermès scarf, subtle makeup",
                "expression": "warm but calculating knowing smile",
                "facing": "right",
                "status": "todo"
            },
            {
                "id": "auctioneer",
                "category": "portrait",
                "name": "The Auctioneer",
                "description": "a distinguished auctioneer in his 60s, salt-and-pepper hair, strong jawline",
                "clothing": "Black tuxedo, white bow tie, pocket square, gold gavel pin on lapel",
                "expression": "commanding authoritative expression",
                "facing": "left",
                "status": "todo"
            },
            {
                "id": "tech_collector",
                "category": "portrait",
                "name": "Tech Collector",
                "description": "a young tech billionaire art collector in his early 30s, clean-shaven, modern hairstyle",
                "clothing": "Casual luxury — black cashmere sweater, no tie, expensive watch, AirPods in one ear",
                "expression": "disruptive confident energy, slight smirk",
                "facing": "right",
                "status": "todo"
            },
            {
                "id": "gallery_assistant",
                "category": "portrait",
                "name": "Gallery Assistant",
                "description": "a young gallery assistant in their 20s, short stylish hair, friendly face",
                "clothing": "All-black outfit, thin headset microphone, gallery lanyard",
                "expression": "helpful warm smile",
                "facing": "left",
                "status": "todo"
            },
            {
                "id": "gallery_main",
                "category": "background",
                "name": "Gallery Main Hall",
                "description": "a luxurious white-walled contemporary art gallery interior with hardwood floor, high ceiling, minimalist track lighting, large paintings in gold frames",
                "lighting": "Evening lighting with dramatic shadows",
                "atmosphere": "A few silhouetted figures examining artwork. Prestigious exclusive atmosphere",
                "status": "done",
                "output_file": "bg_gallery_main.png"
            },
            {
                "id": "gallery_backroom",
                "category": "background",
                "name": "Gallery Back Room",
                "description": "a dimly lit gallery storage and viewing room with wooden crates, easels with paintings leaning against them, exposed brick wall, concrete floor",
                "lighting": "Single warm hanging lamp casting a cone of light",
                "atmosphere": "Secretive exclusive atmosphere, a leather chair and small table with papers",
                "status": "todo"
            },
            {
                "id": "player_class1",
                "category": "walking",
                "name": "Player — Hedge Fund Collector",
                "description": "A stylish art collector in a dark charcoal suit with a briefcase, dark hair. 8-bit noir aesthetic",
                "status": "done",
                "output_file": "player_walk.png"
            }
        ]
    }
    
    with open(JOBS_FILE, 'w') as f:
        json.dump(template, f, indent=2)
    print(f"✅ Created template at {JOBS_FILE}")


def list_jobs(data):
    """Print a formatted list of all jobs and their status."""
    print(f"\n🎨 ArtLife Sprite Pipeline — {len(data['jobs'])} jobs\n")
    
    status_icons = {'todo': '⬜', 'generating': '🔄', 'raw': '📸', 'processed': '✂️', 'done': '✅'}
    
    by_category = {}
    for job in data['jobs']:
        cat = job['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(job)
    
    for category, jobs in by_category.items():
        done = sum(1 for j in jobs if j['status'] == 'done')
        print(f"  {category.upper()} ({done}/{len(jobs)} done)")
        for job in jobs:
            icon = status_icons.get(job['status'], '❓')
            filename = generate_filename(job)
            output = job.get('output_file', filename)
            print(f"    {icon} {job['name']:30s} → {output}")
        print()
    
    total = len(data['jobs'])
    done = sum(1 for j in data['jobs'] if j['status'] == 'done')
    print(f"  Total: {done}/{total} complete\n")


def print_prompts(data):
    """Print ready-to-use prompts for all TODO jobs."""
    todo = [j for j in data['jobs'] if j['status'] == 'todo']
    
    if not todo:
        print("✅ No pending jobs! All sprites generated.")
        return
    
    print(f"\n🎨 Ready-to-use prompts for {len(todo)} pending jobs:\n")
    print("=" * 80)
    
    for i, job in enumerate(todo, 1):
        template = TEMPLATES.get(job['category'])
        if not template:
            print(f"  ⚠️  No template for category '{job['category']}'")
            continue
        
        # Fill template with job data
        prompt = template.format(**{k: v for k, v in job.items() if isinstance(v, str)})
        filename = generate_filename(job)
        
        print(f"\n--- Job {i}: {job['name']} ({job['category']}) ---")
        print(f"Output filename: {filename}")
        print(f"Prompt:\n{prompt}")
        print()
    
    print("=" * 80)
    print(f"\nAfter generating, save raw images to: {RAW_DIR}/")
    print(f"Then run: python3 scripts/sprite_pipeline.py --process {RAW_DIR}/")


def process_raw(raw_path, data):
    """Process raw generated images through bg_remove."""
    import subprocess
    
    raw_path = Path(raw_path)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    if raw_path.is_dir():
        files = sorted(raw_path.glob('*.png'))
    else:
        files = [raw_path]
    
    if not files:
        print(f"No PNG files found in {raw_path}")
        return
    
    print(f"\n🎨 Processing {len(files)} raw images...\n")
    
    bg_remove_script = Path(__file__).parent / 'bg_remove.py'
    
    for f in files:
        out_file = PROCESSED_DIR / f.name
        
        # Determine removal mode based on job category
        # Green screen portraits use chroma key, backgrounds stay as-is
        is_background = 'bg_' in f.name or 'background' in f.name.lower()
        
        if is_background:
            # Backgrounds don't need bg removal, just copy
            import shutil
            shutil.copy2(f, out_file)
            print(f"  📋 {f.name} → copied (background, no removal)")
        else:
            # Green screen removal
            cmd = [
                sys.executable, str(bg_remove_script),
                str(f), str(out_file),
                '--color', '00FF00',
                '--tolerance', '50'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout.strip().split('\n')[-1])  # Last line has the ✓
            else:
                print(f"  ❌ {f.name}: {result.stderr}")
        
        # Log the processing
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': 'process',
            'input': str(f),
            'output': str(out_file),
            'mode': 'copy' if is_background else 'greenscreen'
        }
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, 'a') as lf:
            lf.write(json.dumps(log_entry) + '\n')
    
    print(f"\n✅ Processed files in: {PROCESSED_DIR}/")
    print(f"   Next: python3 scripts/sprite_pipeline.py --deploy")


def deploy(data):
    """Deploy processed sprites to the correct public/ directories."""
    if not PROCESSED_DIR.exists():
        print("No processed files found. Run --process first.")
        return
    
    files = sorted(PROCESSED_DIR.glob('*.png'))
    if not files:
        print("No processed PNGs to deploy.")
        return
    
    print(f"\n🚀 Deploying {len(files)} sprites...\n")
    
    import shutil
    for f in files:
        # Determine category from filename prefix
        if f.name.startswith('portrait_') or f.name.startswith('dealer_') or f.name.startswith('walk_'):
            dest_dir = DEPLOY_DIRS['portrait']
        elif f.name.startswith('bg_'):
            dest_dir = DEPLOY_DIRS['background']
        elif f.name.startswith('obj_'):
            dest_dir = DEPLOY_DIRS.get('object', DEPLOY_DIRS['portrait'])
        elif f.name.startswith('tile_'):
            dest_dir = DEPLOY_DIRS.get('tile', DEPLOY_DIRS['portrait'])
        else:
            dest_dir = DEPLOY_DIRS['portrait']
        
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f.name
        shutil.copy2(f, dest)
        print(f"  ✓ {f.name} → {dest.relative_to(GAME_DIR)}")
        
        # Log deployment
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': 'deploy',
            'file': f.name,
            'destination': str(dest)
        }
        with open(LOG_FILE, 'a') as lf:
            lf.write(json.dumps(log_entry) + '\n')
    
    print(f"\n✅ Deployed! Sprites are live in the game.")


def main():
    parser = argparse.ArgumentParser(description='ArtLife Sprite Generation Pipeline')
    parser.add_argument('--list', action='store_true', help='List all jobs and status')
    parser.add_argument('--prompts', action='store_true', help='Print prompts for pending jobs')
    parser.add_argument('--process', metavar='PATH', help='Process raw images (file or directory)')
    parser.add_argument('--process-one', metavar='FILE', help='Process a single raw image')
    parser.add_argument('--deploy', action='store_true', help='Deploy processed sprites to public/')
    parser.add_argument('--init', action='store_true', help='Create template sprite_jobs.json')
    
    args = parser.parse_args()
    
    if args.init:
        create_template_jobs()
        return
    
    data = load_jobs()
    
    if args.list:
        list_jobs(data)
    elif args.prompts:
        print_prompts(data)
    elif args.process:
        process_raw(args.process, data)
    elif args.process_one:
        process_raw(args.process_one, data)
    elif args.deploy:
        deploy(data)
    else:
        # Default: show status
        list_jobs(data)
        print("  Commands:")
        print("    --prompts     Print prompts for TODO items")
        print("    --process     Process raw images through bg_remove")
        print("    --deploy      Deploy processed sprites to game")


if __name__ == '__main__':
    main()
