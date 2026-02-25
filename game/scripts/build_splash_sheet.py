#!/usr/bin/env python3
"""
Extract splash sprite frames from PixelLab 2x2 grid images and assemble
into a single-row spritesheet for the BootSplash animation.

Frame order: 1 → (1-2a,b,c,d) → 2 → (2-3a,b,c,d) → 3 → (3-4a,b,c,d) → 4 → (4-1a,b,c,d)
= 20 frames total in a seamless loop
"""

from PIL import Image
import os

BASE = "/Users/seb/Downloads/Manual Library/Seb's Mind/Seb's Mind/Note inbox"
OUTPUT = "/Users/seb/Downloads/Manual Library/Seb's Mind/Seb's Mind/Projects/Art-Market-Game/game/assets/processed/splash_spritesheet.png"

def extract_2x2_frames(path):
    """Extract 4 frames from a 2x2 grid image (top-left, top-right, bottom-left, bottom-right)."""
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    fw, fh = w // 2, h // 2
    frames = [
        img.crop((0, 0, fw, fh)),        # top-left = 1
        img.crop((fw, 0, w, fh)),         # top-right = 2
        img.crop((0, fh, fw, h)),         # bottom-left = 3
        img.crop((fw, fh, w, h)),         # bottom-right = 4
    ]
    return frames, (fw, fh)

def extract_gif_frames(path):
    """Extract key frames from the GIF."""
    gif = Image.open(path)
    frames = []
    for i in range(gif.n_frames):
        gif.seek(i)
        frames.append(gif.convert("RGBA").copy())
    return frames

# Step 1: Extract key frames from GIF
gif_path = os.path.join(BASE, "splash 1 2 3 4.gif")
gif_frames = extract_gif_frames(gif_path)
print(f"GIF: {len(gif_frames)} frames, size {gif_frames[0].size}")

# The GIF might be a 2x2 grid OR individual frames
# Check if it's a single image (2x2 grid) or multi-frame
if len(gif_frames) == 1:
    # It's a static 2x2 grid
    key_frames, frame_size = extract_2x2_frames(gif_path.replace('.gif', '.gif'))
    # Actually try opening as PIL
    img = gif_frames[0]
    w, h = img.size
    fw, fh = w // 2, h // 2
    key_frames = [
        img.crop((0, 0, fw, fh)),
        img.crop((fw, 0, w, fh)),
        img.crop((0, fh, fw, h)),
        img.crop((fw, fh, w, h)),
    ]
    frame_size = (fw, fh)
    print(f"Key frames extracted from 2x2 grid, frame size: {frame_size}")
else:
    # Multi-frame GIF - just take first 4 frames
    key_frames = gif_frames[:4]
    frame_size = key_frames[0].size
    # If GIF frames are 2x2 grids themselves, extract
    if frame_size[0] > 200:  # Likely a grid
        all_key = []
        for f in key_frames:
            w, h = f.size
            fw, fh = w // 2, h // 2
            all_key.append(f.crop((0, 0, fw, fh)))
        key_frames = all_key
        frame_size = key_frames[0].size
    print(f"Key frames from GIF animation, frame size: {frame_size}")

# Step 2: Extract transition frames from 'between' PNGs
between_files = [
    "splash between 1 2.png",
    "splash between 2 3.png",
    "splash between 3 4.png",
    "splash between 4 1.png",
]

between_frames = {}
for i, fname in enumerate(between_files):
    path = os.path.join(BASE, fname)
    frames, bsize = extract_2x2_frames(path)
    between_frames[i] = frames
    print(f"{fname}: 4 frames, frame size: {bsize}")

# Step 3: Assemble full animation sequence
# Order: key1, between_1_2[0..3], key2, between_2_3[0..3], key3, between_3_4[0..3], key4, between_4_1[0..3]
all_frames = []
for ki in range(4):
    all_frames.append(key_frames[ki])
    for bi in range(4):
        all_frames.append(between_frames[ki][bi])

print(f"\nTotal frames: {len(all_frames)}")
print(f"Frame size: {frame_size}")

# Normalize all frames to same size
target_w, target_h = frame_size
normalized = []
for f in all_frames:
    if f.size != (target_w, target_h):
        f = f.resize((target_w, target_h), Image.Resampling.NEAREST)
    normalized.append(f)

# Step 4: Create single-row spritesheet
sheet_w = target_w * len(normalized)
sheet_h = target_h
sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

for i, f in enumerate(normalized):
    sheet.paste(f, (i * target_w, 0))

sheet.save(OUTPUT, "PNG")
print(f"\nSpritesheet saved: {OUTPUT}")
print(f"Dimensions: {sheet_w}x{sheet_h}, {len(normalized)} frames × {target_w}x{target_h}")
