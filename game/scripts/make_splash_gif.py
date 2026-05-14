#!/usr/bin/env python3
"""Generate a GIF from the splash spritesheet for sharing / previewing."""

from PIL import Image
import os

SHEET = "/Users/seb/Downloads/Manual Library/Seb's Mind/Seb's Mind/Projects/Art-Market-Game/game/assets/processed/splash_spritesheet.png"
OUTPUT = "/Users/seb/Downloads/Manual Library/Seb's Mind/Seb's Mind/Projects/Art-Market-Game/game/assets/processed/splash_animation.gif"

FRAME_W = 128
FRAME_H = 128
TOTAL_FRAMES = 20
FPS = 6
SCALE = 3  # 128*3 = 384px for a nice big preview

sheet = Image.open(SHEET).convert("RGBA")
frames = []

for i in range(TOTAL_FRAMES):
    frame = sheet.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H))
    if SCALE != 1:
        frame = frame.resize((FRAME_W * SCALE, FRAME_H * SCALE), Image.Resampling.NEAREST)
    # Convert RGBA to RGB with black background for GIF compatibility
    bg = Image.new("RGBA", frame.size, (10, 10, 15, 255))
    bg.paste(frame, mask=frame.split()[3])
    frames.append(bg.convert("RGB"))

duration_ms = int(1000 / FPS)
frames[0].save(
    OUTPUT,
    save_all=True,
    append_images=frames[1:],
    duration=duration_ms,
    loop=0,  # infinite loop
    optimize=True,
)

print(f"GIF saved: {OUTPUT}")
print(f"{TOTAL_FRAMES} frames × {FRAME_W * SCALE}x{FRAME_H * SCALE}, {FPS}fps, {duration_ms}ms/frame")
print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
