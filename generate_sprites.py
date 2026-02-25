#!/usr/bin/env python3
"""
ArtLife — PixelLab Sprite Generator
Generates multi-animation sprite sheets for characters using the PixelLab API.

Usage:
    pip install pixellab Pillow python-dotenv
    python generate_sprites.py --character victoria_sterling
    python generate_sprites.py --character victoria_sterling --actions walk,idle,sad_walk
    python generate_sprites.py --all --static-only
    python generate_sprites.py --list

Output: game/assets/processed/{char_id}_sprites.png
Sheet layout: 4 cols × (4 dirs × N actions) rows
  Row order per action: south(down), west(left), east(right), north(up)
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent / ".env")

try:
    import pixellab
    from PIL import Image
    import io
    import base64
except ImportError:
    print("Missing dependencies. Run: pip install pixellab Pillow python-dotenv")
    sys.exit(1)

# ── Character Visual Descriptions ─────────────────────────────────────────────
NPC_VISUALS = {
    "sasha_klein": "sophisticated woman, mid-40s, silver bob haircut, navy blazer, cream silk blouse, gold earrings, pearl necklace",
    "marcus_price": "Black man, 30s, close-cropped hair, slim grey suit, thin-rimmed glasses, no tie, analytical expression",
    "elena_ross": "Latina woman, late 30s, dark curly hair, paint-stained denim jacket, hoop earrings, warm expression",
    "james_whitfield": "British man, 60s, silver hair, tweed suit, pocket square, signet ring, stern expression",
    "diana_chen": "East Asian woman, 30s, sleek black hair in bun, tailored black dress, lanyard badge, professional",
    "robert_hall": "white man, 50s, salt-and-pepper beard, navy suit, reading glasses, friendly smile",
    "yuki_tanaka": "Japanese woman, early 20s, dyed purple hair, oversized hoodie, creative messy look",
    "kwame_asante": "Ghanaian-American man, 30s, short natural hair, white t-shirt, paint on hands, thoughtful",
    "victoria_sterling": "blonde woman, late 20s, designer sunglasses pushed up, Chanel jacket, phone in hand",
    "philippe_noir": "distinguished Swiss-French man, 60s, grey hair, cashmere overcoat, minimal jewelry",
    "nina_ward": "Black British woman, 30s, natural hair, tortoiseshell glasses, blazer over turtleneck",
    "lorenzo_gallo": "Italian man, 50s, slicked-back dark hair, black turtleneck, power stance, intense eyes",
    "nico_strand": "Scandinavian man, 40s, blonde stubble, leather jacket, streetwear-adjacent, relaxed",
    "charles_vandermeer": "white man, 50s, balding, red power tie, expensive watch, aggressive energy",
    "margaux_fontaine": "French woman, 30s, chic bob, silk scarf, cigarette holder, aloof expression",
    "dr_eloise_park": "Korean-American woman, 50s, wire-rim glasses, museum curator badge, minimalist style",
}

# ── Animation action definitions ──────────────────────────────────────────────
# Each action maps to a PixelLab animate_with_text `action` string
ACTION_DEFS = {
    "walk":     {"action": "walk",            "label": "Walk"},
    "idle":     {"action": "idle breathing",  "label": "Idle/Breathing"},
    "sad_walk": {"action": "sad slow walk",   "label": "Sad Walk"},
}

DIRECTIONS = ["south", "west", "east", "north"]
FRAMES_PER_DIRECTION = 4
FRAME_SIZE = 64   # PixelLab animate-with-text only supports 64x64
OUTPUT_SCALE = 160  # Scale up to match existing sprites


def get_client():
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key:
        print("Error: Set PIXELLAB_API_KEY environment variable")
        sys.exit(1)
    return pixellab.Client(secret=key)


def generate_static_frame(client, description, direction="south"):
    """Generate a single static character frame facing a direction."""
    print(f"  Generating static frame facing {direction}...")
    response = client.generate_image_pixflux(
        description=f"{description}, full body chibi pixel art character, 2 heads tall, small body large head, top-down RPG overworld sprite, standing pose",
        image_size=dict(width=FRAME_SIZE, height=FRAME_SIZE),
        outline="selective outline",
        shading="basic shading",
        detail="medium detail",
        view="low top-down",
        direction=direction,
        no_background=True,
    )
    return response.image.pil_image()


def generate_animation(client, description, reference_image_pil, action_str, direction="south"):
    """Generate a 4-frame animation for a specific action and direction."""
    print(f"    {direction} × {action_str}...")
    response = client.animate_with_text(
        description=f"{description}, full body chibi pixel art, 2 heads tall, top-down RPG overworld sprite",
        negative_description="",
        action=action_str,
        view="low top-down",
        direction=direction,
        image_size=dict(width=FRAME_SIZE, height=FRAME_SIZE),
        reference_image=reference_image_pil,
        n_frames=FRAMES_PER_DIRECTION,
    )
    return [img.pil_image() for img in response.images]


def assemble_multi_action_sheet(all_action_frames, output_path, actions):
    """
    Assemble a multi-action sprite sheet.
    Layout: 4 cols × (4 dirs × N actions) rows
    Each action block = 4 rows (south, west, east, north)
    """
    n_actions = len(actions)
    total_rows = 4 * n_actions  # 4 directions per action
    sheet = Image.new("RGBA", (OUTPUT_SCALE * 4, OUTPUT_SCALE * total_rows), (0, 0, 0, 0))

    for action_idx, (action_name, direction_frames) in enumerate(all_action_frames):
        for dir_idx, frames in enumerate(direction_frames):
            row = action_idx * 4 + dir_idx
            for col_idx, frame in enumerate(frames):
                scaled = frame.resize((OUTPUT_SCALE, OUTPUT_SCALE), Image.NEAREST)
                sheet.paste(scaled, (col_idx * OUTPUT_SCALE, row * OUTPUT_SCALE))

    sheet.save(output_path)
    print(f"  ✅ Saved multi-action sheet: {output_path}")
    print(f"     {4} cols × {total_rows} rows ({n_actions} actions × 4 directions)")

    # Also write a JSON manifest describing the sheet layout
    manifest = {
        "frameWidth": OUTPUT_SCALE,
        "frameHeight": OUTPUT_SCALE,
        "cols": 4,
        "totalRows": total_rows,
        "actions": {}
    }
    for action_idx, (action_name, _) in enumerate(all_action_frames):
        start_row = action_idx * 4
        manifest["actions"][action_name] = {
            "startFrame": start_row * 4,
            "directions": {
                "down":  {"startFrame": (start_row + 0) * 4, "endFrame": (start_row + 0) * 4 + 3},
                "left":  {"startFrame": (start_row + 1) * 4, "endFrame": (start_row + 1) * 4 + 3},
                "right": {"startFrame": (start_row + 2) * 4, "endFrame": (start_row + 2) * 4 + 3},
                "up":    {"startFrame": (start_row + 3) * 4, "endFrame": (start_row + 3) * 4 + 3},
            }
        }

    manifest_path = output_path.with_suffix(".json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  📋 Saved manifest: {manifest_path}")

    return manifest


def generate_character(client, char_id, output_dir, actions=None, static_only=False):
    """Generate multi-action sprite sheet for one character."""
    if char_id not in NPC_VISUALS:
        print(f"  ❌ Unknown character: {char_id}")
        return

    if actions is None:
        actions = ["walk"]

    desc = NPC_VISUALS[char_id]
    print(f"\n🎨 Generating: {char_id}")
    print(f"   Description: {desc}")
    print(f"   Actions: {', '.join(actions)}")

    # Step 1: Generate a reference frame (south-facing)
    ref_image = generate_static_frame(client, desc, "south")

    # Save static reference for review
    ref_path = output_dir / f"ref_{char_id}_south.png"
    ref_scaled = ref_image.resize((OUTPUT_SCALE, OUTPUT_SCALE), Image.NEAREST)
    ref_scaled.save(ref_path)
    print(f"  💾 Saved reference: {ref_path}")

    if static_only:
        print(f"  ⏭️  Static-only mode — skipping animations")
        return

    # Step 2: Generate each action × each direction
    all_action_frames = []  # [(action_name, [dir_frames, ...]), ...]
    for action_key in actions:
        action_def = ACTION_DEFS.get(action_key)
        if not action_def:
            print(f"  ⚠️  Unknown action: {action_key}, skipping")
            continue

        print(f"  🎬 Action: {action_def['label']}")
        direction_frames = []
        for direction in DIRECTIONS:
            frames = generate_animation(client, desc, ref_image, action_def["action"], direction)
            direction_frames.append(frames)
        all_action_frames.append((action_key, direction_frames))

    # Step 3: Assemble into multi-action sprite sheet
    output_path = output_dir / f"{char_id}_sprites.png"
    assemble_multi_action_sheet(all_action_frames, output_path, actions)


def main():
    parser = argparse.ArgumentParser(description="Generate ArtLife NPC sprite sheets")
    parser.add_argument("--character", type=str, help="Character ID to generate (e.g. victoria_sterling)")
    parser.add_argument("--all", action="store_true", help="Generate all characters")
    parser.add_argument("--output", type=str, default=None, help="Output directory")
    parser.add_argument("--list", action="store_true", help="List all available characters")
    parser.add_argument("--static-only", action="store_true", help="Only generate static reference frames")
    parser.add_argument("--actions", type=str, default="walk,idle,sad_walk",
                        help="Comma-separated animation actions (default: walk,idle,sad_walk)")
    args = parser.parse_args()

    if args.list:
        print("Available characters:")
        for cid, desc in NPC_VISUALS.items():
            print(f"  {cid}: {desc[:60]}...")
        print("\nAvailable actions:")
        for k, v in ACTION_DEFS.items():
            print(f"  {k}: {v['label']} (API action: \"{v['action']}\")")
        return

    if not args.character and not args.all:
        parser.print_help()
        return

    actions = [a.strip() for a in args.actions.split(",")]

    # Resolve output directory
    script_dir = Path(__file__).parent
    output_dir = Path(args.output) if args.output else script_dir / "game" / "assets" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    client = get_client()

    # Check balance
    balance = client.get_balance()
    print(f"💰 PixelLab balance: ${balance.usd:.2f}")

    if args.all:
        for char_id in NPC_VISUALS:
            generate_character(client, char_id, output_dir, actions=actions, static_only=args.static_only)
    else:
        generate_character(client, args.character, output_dir, actions=actions, static_only=args.static_only)

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
