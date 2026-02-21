#!/usr/bin/env python3
"""
bg_remove.py — Background Removal for ArtLife Sprites
Phase 40: Sprite Generation Pipeline

Three modes:
  1. Flood-fill mode (default): Removes contiguous background from image edges only. 
     This is the safest mode — it won't eat into dark suits or hair.
  2. Color-key mode (--colorkey): Replace ALL pixels matching a color. More aggressive.
  3. ML mode (--ml): Use rembg for complex/photographic backgrounds.

Usage:
  python scripts/bg_remove.py input.png output.png                        # Flood-fill from edges (safe default)
  python scripts/bg_remove.py input.png output.png --colorkey              # Color-key all matching pixels
  python scripts/bg_remove.py input.png output.png --ml                    # ML rembg mode
  python scripts/bg_remove.py input.png output.png --color FF00FF          # Custom color target
  python scripts/bg_remove.py input.png output.png --tolerance 20          # Wider color match
  python scripts/bg_remove.py sprites/ output/ --batch                     # Batch process folder
"""

import argparse
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque


def flood_fill_remove(img, color_hex='000000', tolerance=20):
    """
    Remove background by flood-filling from all 4 edges.
    Only removes CONTIGUOUS regions of the target color — won't eat into
    dark suits, hair, or other interior content that happens to be similar.
    """
    rgba = img.convert('RGBA')
    data = np.array(rgba)
    h, w = data.shape[:2]

    r_target = int(color_hex[0:2], 16)
    g_target = int(color_hex[2:4], 16)
    b_target = int(color_hex[4:6], 16)

    def matches(r, g, b):
        return (abs(int(r) - r_target) <= tolerance and
                abs(int(g) - g_target) <= tolerance and
                abs(int(b) - b_target) <= tolerance)

    # Track which pixels we've visited
    visited = np.zeros((h, w), dtype=bool)
    # Track which pixels to make transparent
    to_remove = np.zeros((h, w), dtype=bool)

    # Seed the flood-fill from all edge pixels
    queue = deque()
    for x in range(w):
        queue.append((0, x))     # top edge
        queue.append((h-1, x))   # bottom edge
    for y in range(h):
        queue.append((y, 0))     # left edge
        queue.append((y, w-1))   # right edge

    while queue:
        row, col = queue.popleft()
        if row < 0 or row >= h or col < 0 or col >= w:
            continue
        if visited[row, col]:
            continue
        visited[row, col] = True

        r, g, b = data[row, col, 0], data[row, col, 1], data[row, col, 2]
        if matches(r, g, b):
            to_remove[row, col] = True
            # Add 4-connected neighbors
            queue.append((row - 1, col))
            queue.append((row + 1, col))
            queue.append((row, col - 1))
            queue.append((row, col + 1))

    # Apply transparency
    data[to_remove] = [0, 0, 0, 0]
    return Image.fromarray(data)


def color_key_remove(img, color_hex='000000', tolerance=10):
    """Replace ALL pixels matching the color key with transparency (aggressive)."""
    rgba = img.convert('RGBA')
    data = np.array(rgba)

    r_target = int(color_hex[0:2], 16)
    g_target = int(color_hex[2:4], 16)
    b_target = int(color_hex[4:6], 16)

    r_diff = np.abs(data[:, :, 0].astype(int) - r_target)
    g_diff = np.abs(data[:, :, 1].astype(int) - g_target)
    b_diff = np.abs(data[:, :, 2].astype(int) - b_target)

    mask = (r_diff <= tolerance) & (g_diff <= tolerance) & (b_diff <= tolerance)
    data[mask] = [0, 0, 0, 0]

    return Image.fromarray(data)


def ml_remove(img):
    """Use rembg ML model for intelligent background removal."""
    try:
        from rembg import remove
    except ImportError:
        print("ERROR: rembg not installed. Run: pip install rembg")
        sys.exit(1)
    return remove(img)


def auto_detect_bg_color(img, sample_size=10):
    """Detect the background color by sampling corner pixels."""
    rgba = img.convert('RGBA')
    data = np.array(rgba)
    h, w = data.shape[:2]

    # Sample from all 4 corners
    corners = []
    for row in range(min(sample_size, h)):
        for col in range(min(sample_size, w)):
            corners.append(data[row, col, :3])
    for row in range(min(sample_size, h)):
        for col in range(max(0, w - sample_size), w):
            corners.append(data[row, col, :3])
    for row in range(max(0, h - sample_size), h):
        for col in range(min(sample_size, w)):
            corners.append(data[row, col, :3])
    for row in range(max(0, h - sample_size), h):
        for col in range(max(0, w - sample_size), w):
            corners.append(data[row, col, :3])

    corners = np.array(corners)
    # Most common color = background
    avg = np.median(corners, axis=0).astype(int)
    hex_str = f"{avg[0]:02X}{avg[1]:02X}{avg[2]:02X}"
    return hex_str


def process_file(input_path, output_path, mode='flood', color_hex=None, tolerance=20):
    """Process a single image file."""
    img = Image.open(input_path)

    # Auto-detect background color if not specified
    if color_hex is None:
        color_hex = auto_detect_bg_color(img)
        print(f"  Auto-detected bg color: #{color_hex}")

    if mode == 'ml':
        result = ml_remove(img)
    elif mode == 'colorkey':
        result = color_key_remove(img, color_hex, tolerance)
    else:
        result = flood_fill_remove(img, color_hex, tolerance)

    result.save(output_path)

    # Report transparency stats
    data = np.array(result)
    total = data.shape[0] * data.shape[1]
    transparent = np.sum(data[:, :, 3] == 0)
    pct = (transparent / total) * 100
    print(f"  ✓ {input_path.name} → {output_path.name}  ({pct:.1f}% transparent)")


def main():
    parser = argparse.ArgumentParser(description='Remove backgrounds from ArtLife sprites')
    parser.add_argument('input', help='Input PNG file or directory')
    parser.add_argument('output', help='Output PNG file or directory')
    parser.add_argument('--ml', action='store_true', help='Use ML-based removal (rembg)')
    parser.add_argument('--colorkey', action='store_true', help='Use aggressive color-key mode')
    parser.add_argument('--color', default=None, help='Background color hex (default: auto-detect from corners)')
    parser.add_argument('--tolerance', type=int, default=20, help='Color matching tolerance 0-255 (default: 20)')
    parser.add_argument('--batch', action='store_true', help='Process all PNGs in input directory')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.ml:
        mode = 'ml'
    elif args.colorkey:
        mode = 'colorkey'
    else:
        mode = 'flood'

    mode_labels = {'ml': 'ML (rembg)', 'colorkey': 'Color-key (aggressive)', 'flood': 'Flood-fill from edges (safe)'}
    print(f"🎨 ArtLife Sprite Background Removal")
    print(f"   Mode: {mode_labels[mode]}")
    if args.color:
        print(f"   Target color: #{args.color}")
    else:
        print(f"   Target color: auto-detect")
    print(f"   Tolerance: {args.tolerance}")
    print()

    if args.batch or input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)
        files = sorted(input_path.glob('*.png'))
        print(f"   Processing {len(files)} files...\n")
        for f in files:
            out_file = output_path / f.name
            process_file(f, out_file, mode, args.color, args.tolerance)
        print(f"\n✅ Done! {len(files)} sprites processed.")
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        process_file(input_path, output_path, mode, args.color, args.tolerance)
        print(f"\n✅ Done!")


if __name__ == '__main__':
    main()
