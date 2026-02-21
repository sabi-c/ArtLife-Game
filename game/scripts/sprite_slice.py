#!/usr/bin/env python3
"""
sprite_slice.py — Spritesheet Slicer for ArtLife
Phase 40: Sprite Generation Pipeline

Cuts a spritesheet grid into individual frames or validates spritesheet dimensions.

Usage:
  python scripts/sprite_slice.py player_walk.png --tile 16                    # Slice 16×16 frames
  python scripts/sprite_slice.py player_walk.png --tile 16 --output frames/   # Save to directory
  python scripts/sprite_slice.py player_walk.png --tile 16 --info             # Just print info
  python scripts/sprite_slice.py player_walk.png --tile 16 --resize 64 64     # Resize sheet to 64×64 first
"""

import argparse
import sys
from pathlib import Path
from PIL import Image


def get_sheet_info(img, tile_size):
    """Calculate frame count and grid dimensions."""
    cols = img.width // tile_size
    rows = img.height // tile_size
    total = cols * rows
    return cols, rows, total


def slice_sheet(img, tile_size):
    """Slice an image into tile_size × tile_size frames."""
    cols, rows, total = get_sheet_info(img, tile_size)
    frames = []
    
    for row in range(rows):
        for col in range(cols):
            x = col * tile_size
            y = row * tile_size
            frame = img.crop((x, y, x + tile_size, y + tile_size))
            frames.append(frame)
    
    return frames


def main():
    parser = argparse.ArgumentParser(description='Slice ArtLife spritesheets into individual frames')
    parser.add_argument('input', help='Input spritesheet PNG')
    parser.add_argument('--tile', type=int, default=16, help='Tile size in pixels (default: 16)')
    parser.add_argument('--output', default=None, help='Output directory for sliced frames')
    parser.add_argument('--info', action='store_true', help='Just print sheet info, don\'t slice')
    parser.add_argument('--resize', nargs=2, type=int, metavar=('W', 'H'),
                       help='Resize the sheet to W×H before slicing (uses NEAREST for pixel art)')
    parser.add_argument('--prefix', default='frame', help='Filename prefix for sliced frames')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)
    
    img = Image.open(input_path).convert('RGBA')
    
    # Resize if requested (using NEAREST to preserve pixel art)
    if args.resize:
        w, h = args.resize
        img = img.resize((w, h), Image.NEAREST)
        print(f"📐 Resized to {w}×{h}")
    
    cols, rows, total = get_sheet_info(img, args.tile)
    
    print(f"🎨 ArtLife Spritesheet Slicer")
    print(f"   Input: {input_path.name} ({img.width}×{img.height})")
    print(f"   Tile:  {args.tile}×{args.tile}")
    print(f"   Grid:  {cols} columns × {rows} rows = {total} frames")
    
    if img.width % args.tile != 0 or img.height % args.tile != 0:
        print(f"\n⚠️  WARNING: Image dimensions ({img.width}×{img.height}) don't divide evenly by tile size ({args.tile}).")
        print(f"   Consider resizing with: --resize {cols * args.tile} {rows * args.tile}")
    
    if args.info:
        # Direction mapping for 4×4 walking sheets
        if cols == 4 and rows == 4:
            print(f"\n   Walking sheet layout detected:")
            print(f"   Row 0 (frames 0-3):  facing DOWN")
            print(f"   Row 1 (frames 4-7):  facing LEFT")
            print(f"   Row 2 (frames 8-11): facing RIGHT")
            print(f"   Row 3 (frames 12-15): facing UP")
        return
    
    # Slice
    frames = slice_sheet(img, args.tile)
    
    # Output
    if args.output:
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for i, frame in enumerate(frames):
            out_path = output_dir / f"{args.prefix}_{i:02d}.png"
            frame.save(out_path)
        
        print(f"\n✅ Saved {total} frames to {output_dir}/")
    else:
        # Default: save next to input with _sliced suffix
        output_dir = input_path.parent / f"{input_path.stem}_frames"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for i, frame in enumerate(frames):
            out_path = output_dir / f"{args.prefix}_{i:02d}.png"
            frame.save(out_path)
        
        print(f"\n✅ Saved {total} frames to {output_dir}/")


if __name__ == '__main__':
    main()
