#!/usr/bin/env python3
"""
image_to_map.py — Convert LimeZu pre-composed room images to Tiled JSON maps.

Reads layer_1 (below_player) and layer_2 (above_player) PNG images,
matches each 48x48 tile block against the tileset PNGs to find tile IDs,
and outputs a proper Tiled-compatible JSON map.

Usage:
    python3 tools/image_to_map.py <room_name> [--output <map_id>]

Example:
    python3 tools/image_to_map.py Museum_room_1 --output art_gallery
    python3 tools/image_to_map.py Museum_entrance --output museum_entrance

The room images are expected in:
    tools/moderninteriors-win/6_Home_Designs/Museum_Designs/48x48/
"""

import json
import hashlib
import os
import sys
from PIL import Image

TILE_SIZE = 48
GAME_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS_DIR = os.path.join(GAME_ROOT, 'tools', 'moderninteriors-win', '6_Home_Designs')
TILESETS_DIR = os.path.join(GAME_ROOT, 'tools', 'moderninteriors-win', '1_Interiors', '48x48')
OUTPUT_DIR = os.path.join(GAME_ROOT, 'public', 'content', 'maps')

# Tileset configuration matching our game setup
TILESETS = [
    {
        'name': 'Room_Builder_free_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', 'Room_Builder_free_48x48.png'),
        'firstgid': 1,
        'image': 'assets/tilesets/Room_Builder_free_48x48.png',
    },
    {
        'name': 'Interiors_free_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', 'Interiors_free_48x48.png'),
        'firstgid': 392,
        'image': 'assets/tilesets/Interiors_free_48x48.png',
    },
    {
        'name': '7_Art_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', '7_Art_48x48.png'),
        'firstgid': 1816,
        'image': 'assets/tilesets/7_Art_48x48.png',
    },
    {
        'name': '22_Museum_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', '22_Museum_48x48.png'),
        'firstgid': 1928,
        'image': 'assets/tilesets/22_Museum_48x48.png',
    },
    {
        'name': '1_Generic_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', '1_Generic_48x48.png'),
        'firstgid': 3880,
        'image': 'assets/tilesets/1_Generic_48x48.png',
    },
    {
        'name': '13_Conference_Hall_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', '13_Conference_Hall_48x48.png'),
        'firstgid': 5128,
        'image': 'assets/tilesets/13_Conference_Hall_48x48.png',
    },
    {
        'name': '2_LivingRoom_48x48',
        'file': os.path.join(GAME_ROOT, 'public', 'assets', 'tilesets', '2_LivingRoom_48x48.png'),
        'firstgid': 5320,
        'image': 'assets/tilesets/2_LivingRoom_48x48.png',
    },
]


def tile_hash(img, x, y, size=TILE_SIZE):
    """Get a hash of a tile at position (x,y) in the image."""
    box = (x * size, y * size, (x + 1) * size, (y + 1) * size)
    tile = img.crop(box)
    return hashlib.md5(tile.tobytes()).hexdigest()


def is_empty_tile(img, x, y, size=TILE_SIZE):
    """Check if a tile is fully transparent."""
    box = (x * size, y * size, (x + 1) * size, (y + 1) * size)
    tile = img.crop(box)
    if tile.mode != 'RGBA':
        return False
    # Check if all pixels have alpha = 0
    pixels = tile.getdata()
    return all(p[3] == 0 for p in pixels)


def build_tile_index():
    """Build a hash → (tileset_name, gid) lookup from all tileset PNGs."""
    print("Building tile index from tilesets...")
    index = {}  # hash → gid

    for ts in TILESETS:
        if not os.path.exists(ts['file']):
            print(f"  WARNING: Tileset not found: {ts['file']}")
            continue

        img = Image.open(ts['file']).convert('RGBA')
        w, h = img.size
        cols = w // TILE_SIZE
        rows = h // TILE_SIZE
        count = 0

        for ty in range(rows):
            for tx in range(cols):
                if is_empty_tile(img, tx, ty):
                    continue
                h_val = tile_hash(img, tx, ty)
                gid = ts['firstgid'] + ty * cols + tx
                if h_val not in index:
                    index[h_val] = gid
                    count += 1

        print(f"  {ts['name']}: {cols}x{rows} = {cols*rows} tiles, {count} non-empty")

    print(f"Total unique tiles indexed: {len(index)}")
    return index


def also_check_full_tilesets(index):
    """Also index the FULL (non-free) tilesets if available, using the SAME firstgid mapping."""
    # The full Room_Builder and Interiors tilesets
    full_rb = os.path.join(TILESETS_DIR, 'Room_Builder_48x48.png')
    full_int = os.path.join(TILESETS_DIR, 'Interiors_48x48.png')

    # Also check Theme_Sorter which has themed extracts
    theme_dir = os.path.join(TILESETS_DIR, 'Theme_Sorter_48x48')

    extra_found = 0

    # Check themed tilesets that match our loaded ones
    theme_map = {
        '7_Art_48x48.png': 1816,
        '22_Museum_48x48.png': 1928,
        '1_Generic_48x48.png': 3880,
        '13_Conference_Hall_48x48.png': 5128,
        '2_LivingRoom_48x48.png': 5320,
    }

    if os.path.exists(theme_dir):
        for fname, firstgid in theme_map.items():
            fpath = os.path.join(theme_dir, fname)
            if not os.path.exists(fpath):
                continue
            img = Image.open(fpath).convert('RGBA')
            w, h = img.size
            cols = w // TILE_SIZE
            rows = h // TILE_SIZE
            for ty in range(rows):
                for tx in range(cols):
                    if is_empty_tile(img, tx, ty):
                        continue
                    h_val = tile_hash(img, tx, ty)
                    gid = firstgid + ty * cols + tx
                    if h_val not in index:
                        index[h_val] = gid
                        extra_found += 1

    if extra_found:
        print(f"  Extra tiles from Theme_Sorter: {extra_found}")

    return index


def image_to_layer(img_path, tile_index, layer_name):
    """Convert a room layer image to tile data array using the tile index."""
    if not os.path.exists(img_path):
        return None

    img = Image.open(img_path).convert('RGBA')
    w, h = img.size
    cols = w // TILE_SIZE
    rows = h // TILE_SIZE

    data = []
    matched = 0
    empty = 0
    missed = 0

    for ty in range(rows):
        for tx in range(cols):
            if is_empty_tile(img, tx, ty):
                data.append(0)
                empty += 1
            else:
                h_val = tile_hash(img, tx, ty)
                gid = tile_index.get(h_val, 0)
                data.append(gid)
                if gid > 0:
                    matched += 1
                else:
                    missed += 1

    pct = matched / (matched + missed) * 100 if (matched + missed) > 0 else 0
    print(f"  {layer_name}: {cols}x{rows}, matched={matched}, empty={empty}, missed={missed} ({pct:.1f}% match rate)")

    return {
        'data': data,
        'width': cols,
        'height': rows,
        'name': layer_name,
    }


def find_room_images(room_name):
    """Find the layer images for a room design."""
    # Search in all design subdirectories
    for subdir in os.listdir(DESIGNS_DIR):
        design_path = os.path.join(DESIGNS_DIR, subdir, '48x48')
        if not os.path.isdir(design_path):
            continue
        layer1 = os.path.join(design_path, f'{room_name}_layer_1_48x48.png')
        layer2 = os.path.join(design_path, f'{room_name}_layer_2_48x48.png')
        if os.path.exists(layer1):
            return layer1, layer2
    return None, None


def build_collision_map(layer1_data, layer2_data, width, height):
    """Generate a collision map (world layer) from the tile layers.

    Strategy: Mark as colliding any tile where layer2 has content
    (furniture/walls above player) OR where layer1 has wall tiles.
    Leave floor tiles walkable.
    """
    # Use Room_Builder tile 7 (gid 7) as collision marker — it has collides: true
    WALL_GID = 7
    collision = []

    for i in range(width * height):
        l1 = layer1_data[i] if i < len(layer1_data) else 0
        l2 = layer2_data[i] if i < len(layer2_data) else 0

        # If above_player layer has content, it's likely furniture/wall — mark as collision
        if l2 > 0:
            collision.append(WALL_GID)
        else:
            collision.append(0)

    return collision


def create_tiled_json(map_id, layer1, layer2, collision, width, height, objects=None):
    """Create a Tiled-compatible JSON map."""
    # Room_Builder collision tile properties
    rb_tiles = [
        {"id": 5, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 6, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 7, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 8, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 14, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 15, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 16, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 48, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 50, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 65, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 67, "properties": [{"name": "collides", "type": "bool", "value": True}]},
    ]

    tilesets = []
    for ts in TILESETS:
        ts_entry = {
            "columns": 16,  # default
            "firstgid": ts['firstgid'],
            "image": ts['image'],
            "imageheight": 0,
            "imagewidth": 0,
            "margin": 0,
            "name": ts['name'],
            "spacing": 0,
            "tilecount": 0,
            "tileheight": TILE_SIZE,
            "tilewidth": TILE_SIZE,
        }
        if ts['name'] == 'Room_Builder_free_48x48':
            ts_entry['tiles'] = rb_tiles
        tilesets.append(ts_entry)

    layers = [
        {
            "data": layer1,
            "height": height,
            "id": 1,
            "name": "below_player",
            "opacity": 1,
            "type": "tilelayer",
            "visible": True,
            "width": width,
            "x": 0,
            "y": 0,
        },
        {
            "data": collision,
            "height": height,
            "id": 2,
            "name": "world",
            "opacity": 1,
            "type": "tilelayer",
            "visible": True,
            "width": width,
            "x": 0,
            "y": 0,
        },
        {
            "data": layer2,
            "height": height,
            "id": 3,
            "name": "above_player",
            "opacity": 1,
            "type": "tilelayer",
            "visible": True,
            "width": width,
            "x": 0,
            "y": 0,
        },
    ]

    if objects is None:
        objects = default_objects(width, height)

    layers.append({
        "draworder": "topdown",
        "id": 4,
        "name": "objects",
        "objects": objects,
        "opacity": 1,
        "type": "objectgroup",
        "visible": True,
        "width": 0,
        "height": 0,
        "x": 0,
        "y": 0,
    })

    return {
        "compressionlevel": -1,
        "height": height,
        "infinite": False,
        "layers": layers,
        "nextlayerid": 5,
        "nextobjectid": len(objects) + 1,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.11.2",
        "tileheight": TILE_SIZE,
        "tilesets": tilesets,
        "tilewidth": TILE_SIZE,
        "type": "map",
        "version": "1.10",
        "width": width,
    }


def default_objects(width, height):
    """Create default spawn + door objects for a room."""
    cx = width // 2
    by = height - 1

    return [
        {
            "id": 1,
            "name": "spawn",
            "x": cx * TILE_SIZE,
            "y": (by - 1) * TILE_SIZE,
            "width": 0,
            "height": 0,
            "point": True,
            "rotation": 0,
            "type": "",
            "visible": True,
        },
        {
            "id": 2,
            "name": "door",
            "x": cx * TILE_SIZE,
            "y": by * TILE_SIZE,
            "width": 0,
            "height": 0,
            "point": True,
            "rotation": 0,
            "type": "",
            "visible": True,
            "properties": [
                {"name": "label", "type": "string", "value": "Exit"},
                {"name": "nextMap", "type": "string", "value": "worldscene"},
            ],
        },
    ]


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Convert LimeZu room images to Tiled JSON')
    parser.add_argument('room_name', help='Room design name (e.g., Museum_room_1)')
    parser.add_argument('--output', '-o', help='Output map ID (default: derived from room name)')
    parser.add_argument('--no-collision-refine', action='store_true', help='Skip collision refinement')
    args = parser.parse_args()

    room_name = args.room_name
    map_id = args.output or room_name.lower().replace(' ', '_')

    # Find room images
    layer1_path, layer2_path = find_room_images(room_name)
    if not layer1_path:
        print(f"ERROR: Could not find images for '{room_name}'")
        print(f"Looked in: {DESIGNS_DIR}/*/48x48/{room_name}_layer_1_48x48.png")
        sys.exit(1)

    print(f"Room: {room_name}")
    print(f"Layer 1: {layer1_path}")
    print(f"Layer 2: {layer2_path}")

    # Build tile index
    tile_index = build_tile_index()
    tile_index = also_check_full_tilesets(tile_index)

    # Convert layers
    print(f"\nConverting layers...")
    l1 = image_to_layer(layer1_path, tile_index, 'below_player')
    l2 = image_to_layer(layer2_path, tile_index, 'above_player') if layer2_path and os.path.exists(layer2_path) else None

    if not l1:
        print("ERROR: Failed to convert layer 1")
        sys.exit(1)

    width = l1['width']
    height = l1['height']

    l2_data = l2['data'] if l2 else [0] * (width * height)

    # Build collision map
    collision = build_collision_map(l1['data'], l2_data, width, height)

    # Refine collision: clear a walkable path from spawn to interesting areas
    if not args.no_collision_refine:
        # Clear bottom rows for entrance
        for y in range(height - 3, height):
            for x in range(width):
                idx = y * width + x
                # Only clear if it's our added collision, not an existing wall
                if collision[idx] == 7 and l1['data'][idx] > 0:
                    # Keep collision for actual wall tiles
                    pass
                elif collision[idx] == 7:
                    collision[idx] = 0

    # Create JSON
    tiled_json = create_tiled_json(map_id, l1['data'], l2_data, collision, width, height)

    # Write output
    output_path = os.path.join(OUTPUT_DIR, f'{map_id}.json')
    with open(output_path, 'w') as f:
        json.dump(tiled_json, f, indent=2)

    print(f"\nOutput: {output_path}")
    print(f"Size: {width}x{height} tiles ({width * TILE_SIZE}x{height * TILE_SIZE}px)")

    # Stats
    total = width * height
    l1_filled = sum(1 for t in l1['data'] if t > 0)
    l2_filled = sum(1 for t in l2_data if t > 0)
    col_filled = sum(1 for t in collision if t > 0)
    print(f"Layer 1 (below): {l1_filled}/{total} tiles filled")
    print(f"Layer 2 (above): {l2_filled}/{total} tiles filled")
    print(f"Collision: {col_filled}/{total} tiles blocked")


if __name__ == '__main__':
    main()
