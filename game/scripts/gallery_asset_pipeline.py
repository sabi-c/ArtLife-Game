#!/usr/bin/env python3
"""
gallery_asset_pipeline.py — Process Antigravity gallery assets for ArtLife

Handles two types of input:
  1. Green screen (#00FF00) backgrounds (v2 prompts) — chroma key removal
  2. Near-white / checkerboard backgrounds (v1 prompts) — edge flood fill

Pipeline: detect bg type → remove bg → autocrop → resize to target → save

Usage:
  python3 scripts/gallery_asset_pipeline.py                    # Process all
  python3 scripts/gallery_asset_pipeline.py --audit            # Check sizes only
  python3 scripts/gallery_asset_pipeline.py --deploy           # Copy processed → public/
  python3 scripts/gallery_asset_pipeline.py --file bench.png   # Process one file
"""

import argparse
import sys
import shutil
from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

GAME_DIR = Path(__file__).parent.parent
RAW_DIR = GAME_DIR / 'public' / 'sprites' / 'gallery'
PROCESSED_DIR = GAME_DIR / 'assets' / 'gallery_processed'
DEPLOY_DIR = GAME_DIR / 'public' / 'sprites' / 'gallery'

# Target dimensions (width, height) for each asset
TARGET_SIZES = {
    'gallery_floor':            (288, 48),
    'gallery_walls':            (480, 48),
    'gallery_bench':            (96, 48),
    'gallery_pedestal':         (48, 48),
    'gallery_desk':             (96, 48),
    'gallery_rope':             (48, 48),
    'gallery_rope_end':         (48, 48),
    'gallery_plant':            (48, 48),
    'gallery_wine_table':       (48, 48),
    'painting_small_abstract':  (32, 32),
    'painting_medium_landscape':(48, 48),
    'painting_large_portrait':  (64, 48),
    'painting_large_modern':    (64, 48),
    'painting_small_photo':     (32, 32),
    'painting_empty_frame':     (48, 48),
    'npc_dealer':               (144, 192),
    'gallery_decorations':      (192, 48),
    'track_light':              (48, 16),
    'gallery_sign':             (96, 48),
    'red_dot':                  (16, 16),
    'price_list':               (32, 48),
}

# ─────────────────────────────────────────────
# BACKGROUND DETECTION
# ─────────────────────────────────────────────

def detect_bg_type(data):
    """Detect background type by sampling corner pixels.
    Returns: 'green' if green screen, 'white' if near-white, 'unknown'
    """
    h, w = data.shape[:2]
    # Sample 5x5 from top-left corner
    patch = data[0:5, 0:5, :3]
    avg = patch.mean(axis=(0, 1))

    # Green screen: G channel >> R and B
    if avg[1] > 200 and avg[0] < 100 and avg[2] < 100:
        return 'green'
    # Near-white: all channels > 230
    if avg[0] > 230 and avg[1] > 230 and avg[2] > 230:
        return 'white'
    return 'unknown'


# ─────────────────────────────────────────────
# BACKGROUND REMOVAL
# ─────────────────────────────────────────────

def remove_green_screen(img, tolerance=60):
    """Remove #00FF00 green screen background using color-key + flood fill."""
    rgba = img.convert('RGBA')
    data = np.array(rgba)
    h, w = data.shape[:2]

    def is_green(r, g, b):
        return (int(g) > 150 and
                int(g) - int(r) > 50 and
                int(g) - int(b) > 50 and
                abs(int(r) - int(b)) < tolerance)

    # Flood fill from edges
    visited = np.zeros((h, w), dtype=bool)
    to_remove = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        queue.append((0, x))
        queue.append((h-1, x))
    for y in range(h):
        queue.append((y, 0))
        queue.append((y, w-1))

    while queue:
        row, col = queue.popleft()
        if row < 0 or row >= h or col < 0 or col >= w:
            continue
        if visited[row, col]:
            continue
        visited[row, col] = True

        r, g, b = data[row, col, 0], data[row, col, 1], data[row, col, 2]
        if is_green(r, g, b):
            to_remove[row, col] = True
            queue.append((row - 1, col))
            queue.append((row + 1, col))
            queue.append((row, col - 1))
            queue.append((row, col + 1))

    # Also do a global pass for any green pixels (catches interior green)
    for row in range(h):
        for col in range(w):
            r, g, b = data[row, col, 0], data[row, col, 1], data[row, col, 2]
            if int(g) > 230 and int(r) < 50 and int(b) < 50:
                to_remove[row, col] = True

    data[to_remove] = [0, 0, 0, 0]
    return Image.fromarray(data)


def remove_white_bg(img, threshold=240):
    """Remove near-white background by flood-filling from edges."""
    rgba = img.convert('RGBA')
    data = np.array(rgba)
    h, w = data.shape[:2]

    def is_white(r, g, b):
        return int(r) > threshold and int(g) > threshold and int(b) > threshold

    visited = np.zeros((h, w), dtype=bool)
    to_remove = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        queue.append((0, x))
        queue.append((h-1, x))
    for y in range(h):
        queue.append((y, 0))
        queue.append((y, w-1))

    while queue:
        row, col = queue.popleft()
        if row < 0 or row >= h or col < 0 or col >= w:
            continue
        if visited[row, col]:
            continue
        visited[row, col] = True

        r, g, b = data[row, col, 0], data[row, col, 1], data[row, col, 2]
        if is_white(r, g, b):
            to_remove[row, col] = True
            queue.append((row - 1, col))
            queue.append((row + 1, col))
            queue.append((row, col - 1))
            queue.append((row, col + 1))

    data[to_remove] = [0, 0, 0, 0]
    return Image.fromarray(data)


# ─────────────────────────────────────────────
# IMAGE PROCESSING
# ─────────────────────────────────────────────

def autocrop(img, padding=1):
    """Crop to non-transparent content bounds."""
    data = np.array(img)
    if data.shape[2] < 4:
        return img

    alpha = data[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)

    if not rows.any():
        return img

    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]

    rmin = max(0, rmin - padding)
    rmax = min(data.shape[0] - 1, rmax + padding)
    cmin = max(0, cmin - padding)
    cmax = min(data.shape[1] - 1, cmax + padding)

    return img.crop((cmin, rmin, cmax + 1, rmax + 1))


def process_asset(input_path, output_path, target_size=None):
    """Full pipeline: detect bg → remove → autocrop → resize → save."""
    img = Image.open(input_path)
    name = input_path.stem

    print(f"  {name}.png ({img.size[0]}x{img.size[1]} {img.mode})")

    # Detect and remove background
    data = np.array(img.convert('RGBA'))
    bg_type = detect_bg_type(data)

    if bg_type == 'green':
        img = remove_green_screen(img)
        print(f"    bg: green screen → chroma key removal")
    elif bg_type == 'white':
        img = remove_white_bg(img)
        print(f"    bg: near-white → edge flood fill")
    else:
        img = remove_white_bg(img, threshold=230)
        print(f"    bg: unknown → conservative flood fill")

    # Report transparency
    result_data = np.array(img)
    total = result_data.shape[0] * result_data.shape[1]
    transparent = np.sum(result_data[:, :, 3] == 0)
    print(f"    transparency: {transparent/total*100:.1f}%")

    # Autocrop
    img = autocrop(img)
    print(f"    cropped: {img.size[0]}x{img.size[1]}")

    # Resize to target
    if target_size:
        tw, th = target_size
        img = img.resize((tw, th), Image.NEAREST)
        print(f"    resized: {tw}x{th}")

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"    -> {output_path.name}")


# ─────────────────────────────────────────────
# COMMANDS
# ─────────────────────────────────────────────

def audit_assets(raw_dir):
    """Check all gallery assets and report status."""
    print(f"\n  Gallery Asset Audit — {raw_dir}\n")
    files = sorted(raw_dir.glob('*.png'))
    print(f"  {len(files)} PNG files\n")

    for f in files:
        img = Image.open(f)
        name = f.stem
        target = TARGET_SIZES.get(name)
        target_str = f"{target[0]}x{target[1]}" if target else "no spec"

        # Detect bg type
        data = np.array(img.convert('RGBA'))
        bg = detect_bg_type(data)

        needs = []
        if target and img.size != target:
            needs.append(f"resize→{target_str}")
        if img.mode != 'RGBA':
            needs.append("need alpha")

        status = 'OK' if not needs else ', '.join(needs)
        spec = '✓' if target else '?'
        print(f"  {spec} {f.name:40s} {img.size[0]:4d}x{img.size[1]:<4d} bg={bg:6s}  target={target_str:10s}  [{status}]")

    # Missing
    existing = {f.stem for f in files}
    missing = [n for n in TARGET_SIZES if n not in existing]
    if missing:
        print(f"\n  Missing ({len(missing)}):")
        for n in missing:
            print(f"    x {n}.png ({TARGET_SIZES[n][0]}x{TARGET_SIZES[n][1]})")


def process_all(raw_dir, output_dir):
    """Process all gallery assets."""
    print(f"\n  Gallery Asset Pipeline\n")
    files = sorted(raw_dir.glob('*.png'))
    output_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        target = TARGET_SIZES.get(f.stem)
        process_asset(f, output_dir / f.name, target)
    print(f"\n  Done! {len(files)} assets → {output_dir}/")


def deploy(processed_dir, deploy_dir):
    """Copy processed assets to public/."""
    files = sorted(processed_dir.glob('*.png'))
    if not files:
        print(f"No processed files in {processed_dir}")
        return

    print(f"\n  Deploying {len(files)} assets → {deploy_dir}/\n")
    deploy_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        dest = deploy_dir / f.name
        shutil.copy2(f, dest)
        img = Image.open(dest)
        print(f"  ✓ {f.name:40s} {img.size[0]}x{img.size[1]} {img.mode}")

    print(f"\n  Deployed!")


def main():
    parser = argparse.ArgumentParser(description='Process Antigravity gallery assets')
    parser.add_argument('--audit', action='store_true', help='Audit assets')
    parser.add_argument('--file', help='Process a single file')
    parser.add_argument('--deploy', action='store_true', help='Deploy to public/')
    parser.add_argument('--raw-dir', default=str(RAW_DIR))
    parser.add_argument('--output-dir', default=str(PROCESSED_DIR))

    args = parser.parse_args()
    raw = Path(args.raw_dir)
    out = Path(args.output_dir)

    if args.audit:
        audit_assets(raw)
    elif args.deploy:
        deploy(PROCESSED_DIR, DEPLOY_DIR)
    elif args.file:
        f = raw / args.file if not Path(args.file).is_absolute() else Path(args.file)
        process_asset(f, out / f.name, TARGET_SIZES.get(f.stem))
    else:
        process_all(raw, out)


if __name__ == '__main__':
    main()
