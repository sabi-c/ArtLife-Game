#!/usr/bin/env python3
"""
bg_room_builder.py — Build Tiled JSON maps using pre-composed background images.

Creates maps with:
1. A visual background image (loaded as a Phaser image, not tile layer)
2. A collision-only tile layer for GridEngine (using Room_Builder_free tile 7)
3. An object layer with spawn, doors, paintings, NPCs, and dialog points

The collision map is generated from the layer_2 image — any non-transparent
pixel in the furniture/wall layer becomes a collision tile.

Usage:
    python3 tools/bg_room_builder.py <config_name>

Configs are defined in the ROOMS dict below.
"""

import json
import os
import sys
from PIL import Image

TILE_SIZE = 48
GAME_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS_DIR = os.path.join(GAME_ROOT, 'tools', 'moderninteriors-win', '6_Home_Designs')
OUTPUT_DIR = os.path.join(GAME_ROOT, 'public', 'content', 'maps')

# Collision tile: Room_Builder_free tile 7 has collides: true
WALL_GID = 7

# Room configurations — each defines a pre-composed room
ROOMS = {
    'art_gallery_museum': {
        'design': 'Museum_room_1',
        'bg_image': 'assets/rooms/art_gallery_museum.png',
        'title': 'Metropolitan Art Gallery',
        'objects': [
            {'type': 'spawn', 'x': 10, 'y': 15},
            {'type': 'door', 'x': 10, 'y': 16, 'nextMap': 'worldscene', 'label': 'Exit Gallery'},
            # Paintings on north wall (Great Wave, missing spot, Starry Night)
            {'type': 'painting', 'x': 3, 'y': 2,
             'title': 'The Great Wave', 'artist': 'Katsushika Hokusai',
             'price': '4500000', 'description': 'Woodblock print, c.1831. The most iconic image in Japanese art. This impression has exceptional color and line quality.'},
            {'type': 'painting', 'x': 8, 'y': 2,
             'title': 'The Starry Night (Study)', 'artist': 'After Vincent van Gogh',
             'price': '2800000', 'description': 'A masterful contemporary reinterpretation of the 1889 original. Thick impasto and vivid cobalt blue dominate the canvas.'},
            # Mona Lisa in the upper right alcove
            {'type': 'painting', 'x': 16, 'y': 2,
             'title': 'Portrait of a Woman (La Gioconda Study)', 'artist': 'Anonymous, 16th Century',
             'price': '8500000', 'description': 'Workshop copy attributed to a student of Leonardo. Sfumato technique, excellent condition. Provenance traces to a Florentine collection.'},
            # Paintings in arched gallery (lower section)
            {'type': 'painting', 'x': 3, 'y': 10,
             'title': 'Seascape at Sunset', 'artist': 'Contemporary School',
             'price': '120000', 'description': 'Oil on canvas. Warm palette with gold leaf accents. From a private European collection.'},
            {'type': 'painting', 'x': 10, 'y': 10,
             'title': 'The Night Watch (Fragment)', 'artist': 'After Rembrandt',
             'price': '3200000', 'description': 'A remarkable period copy of the central group. Dark varnish partially cleaned.'},
            # Display cases (dialog)
            {'type': 'dialog', 'x': 7, 'y': 12,
             'content': 'A glass display case contains three bronze figurines.\nRoman, 2nd century AD. Museum Collection.'},
            {'type': 'dialog', 'x': 12, 'y': 12,
             'content': 'Illuminated manuscript page under conservation glass.\nBook of Hours, c.1420. Northern French workshop.'},
            # NPC
            {'type': 'npc', 'x': 6, 'y': 8, 'id': 'curator_ward',
             'label': 'Curator Ward',
             'dialogue': 'Welcome to the Metropolitan Gallery. Our collection spans five centuries of Western art. The Great Wave upstairs is a recent acquisition — we outbid three other institutions.',
             'canHaggle': 'false'},
        ],
        # Manual collision refinement: clear walkable areas
        'walkable_zones': [
            # Main gallery floor (upper section)
            {'x1': 2, 'y1': 4, 'x2': 9, 'y2': 8},
            # Mona Lisa room (upper right)
            {'x1': 12, 'y1': 2, 'x2': 18, 'y2': 6},
            # Arched gallery corridor
            {'x1': 2, 'y1': 9, 'x2': 18, 'y2': 14},
            # Lower gallery
            {'x1': 2, 'y1': 14, 'x2': 18, 'y2': 16},
        ],
    },

    'museum_entrance': {
        'design': 'Museum_entrance',
        'bg_image': 'assets/rooms/museum_entrance.png',
        'title': 'Museum Entrance Hall',
        'objects': [
            {'type': 'spawn', 'x': 8, 'y': 20},
            {'type': 'door', 'x': 8, 'y': 21, 'nextMap': 'worldscene', 'label': 'Exit Museum'},
            # Ticket booth area
            {'type': 'dialog', 'x': 5, 'y': 16,
             'content': 'TICKET BOOTH\nAdmission: $25 | Members: Free\nSpecial Exhibition: $15 supplement'},
            # Display cases in upper gallery
            {'type': 'painting', 'x': 4, 'y': 3,
             'title': 'Greek Amphora (Red Figure)', 'artist': 'Attic Workshop, c.450 BC',
             'price': '850000', 'description': 'Red-figure amphora depicting the Battle of Marathon. Exceptional condition. Ex-collection Lord Elgin.'},
            {'type': 'painting', 'x': 12, 'y': 3,
             'title': 'Egyptian Scarab Collection', 'artist': 'Various, c.1500-500 BC',
             'price': '420000', 'description': 'Set of 12 carved scarabs in lapis lazuli, carnelian, and faience. Provenance: Howard Carter estate.'},
            # Artifacts on pedestals
            {'type': 'dialog', 'x': 8, 'y': 7,
             'content': 'Ancient Mesopotamian clay tablet.\nCuneiform script recording grain transactions.\nc.2100 BC, Third Dynasty of Ur.'},
            # Guard at entrance
            {'type': 'npc', 'x': 11, 'y': 18, 'id': 'museum_guard',
             'label': 'Museum Guard',
             'dialogue': 'Welcome to the museum. Photography is allowed in the main galleries, but no flash. The special exhibition closes in 30 minutes.',
             'canHaggle': 'false'},
        ],
        'walkable_zones': [
            {'x1': 1, 'y1': 3, 'x2': 14, 'y2': 9},     # Upper gallery
            {'x1': 5, 'y1': 9, 'x2': 11, 'y2': 13},     # Central corridor
            {'x1': 1, 'y1': 13, 'x2': 14, 'y2': 21},    # Entrance hall
        ],
    },

    'dinosaur_museum': {
        'design': 'Museum_room_3',
        'bg_image': 'assets/rooms/dinosaur_museum.png',
        'title': 'Natural History — Dinosaur Hall',
        'objects': [
            {'type': 'spawn', 'x': 8, 'y': 19},
            {'type': 'door', 'x': 8, 'y': 20, 'nextMap': 'worldscene', 'label': 'Exit Hall'},
            # Dinosaur painting at top
            {'type': 'painting', 'x': 8, 'y': 1,
             'title': 'Triceratops Reconstruction', 'artist': 'Natural History Collection',
             'price': '0', 'description': 'Life-size painted reconstruction of Triceratops horridus. Late Cretaceous, c.68 million years ago. Based on specimen NMNH-4842.'},
            # Skeleton displays
            {'type': 'dialog', 'x': 4, 'y': 6,
             'content': 'DINOSAUR EGG NEST\nOviraptor philoceratops. Gobi Desert, Mongolia.\n80 million years old. Note the spiral arrangement.'},
            {'type': 'dialog', 'x': 12, 'y': 6,
             'content': 'FOSSIL BED CROSS-SECTION\nMultiple species preserved in a single stratum.\nHell Creek Formation, Montana.'},
            # Large skeleton (center)
            {'type': 'painting', 'x': 5, 'y': 11,
             'title': 'Pachycephalosaurus Skeleton', 'artist': 'Natural History Collection',
             'price': '1200000', 'description': 'Complete skeleton. Late Cretaceous. The dome skull is 10 inches thick — used for head-butting contests.'},
            {'type': 'painting', 'x': 12, 'y': 11,
             'title': 'Ankylosaurus Armor Plates', 'artist': 'Natural History Collection',
             'price': '800000', 'description': 'Articulated armor plates and tail club. The biological equivalent of a medieval knight.'},
            # Central T-Rex
            {'type': 'painting', 'x': 8, 'y': 15,
             'title': 'Parasaurolophus Complete Skeleton', 'artist': 'Natural History Collection',
             'price': '2200000', 'description': 'The hollow crest functioned as a resonating chamber. When alive, this dinosaur could produce sounds audible for miles.'},
            # NPC
            {'type': 'npc', 'x': 10, 'y': 9, 'id': 'dr_chen',
             'label': 'Dr. Chen',
             'dialogue': 'The Parasaurolophus is our centerpiece. We spent three years excavating it from the Judith River Formation. Every bone is real — no casts.',
             'canHaggle': 'false'},
        ],
        'walkable_zones': [
            {'x1': 2, 'y1': 3, 'x2': 14, 'y2': 20},  # Main hall
        ],
    },

    'small_gallery': {
        'design': 'Museum_room_4',
        'bg_image': 'assets/rooms/small_gallery.png',
        'title': 'Contemporary Art Studio',
        'objects': [
            {'type': 'spawn', 'x': 8, 'y': 8},
            {'type': 'door', 'x': 8, 'y': 9, 'nextMap': 'worldscene', 'label': 'Exit'},
            # Paintings
            {'type': 'painting', 'x': 3, 'y': 2,
             'title': 'Untitled (Meridian)', 'artist': 'Kenji Nomura',
             'price': '65000', 'description': 'Oil on linen, 2025. Bold impasto technique. From the artist\'s "Pacific Crossings" series.'},
            {'type': 'painting', 'x': 8, 'y': 2,
             'title': 'Crown (Gold)', 'artist': 'Amara Osei',
             'price': '42000', 'description': 'Acrylic and gold leaf on canvas. The crown motif recurs throughout Osei\'s work — a symbol of inherent dignity.'},
            {'type': 'painting', 'x': 13, 'y': 2,
             'title': 'Binary Sunset #7', 'artist': 'Kenji Nomura',
             'price': '38000', 'description': 'Mixed media on panel. Digital print base with oil paint overlay. Nomura\'s signature blend of technology and tradition.'},
            # NPC
            {'type': 'npc', 'x': 5, 'y': 6, 'id': 'elena_ross',
             'label': 'Elena Ross',
             'dialogue': 'The Nomura pieces are selling fast. If you\'re interested in "Untitled (Meridian)", I\'d move quickly — there are two other collectors circling.',
             'canHaggle': 'true'},
        ],
        'walkable_zones': [
            {'x1': 1, 'y1': 3, 'x2': 14, 'y2': 9},
        ],
    },
}


def generate_collision_from_layer2(design_name, width, height, walkable_zones):
    """Generate collision map from the layer_2 image (furniture/walls above player)."""
    # Find layer_2 image
    layer2_path = None
    for subdir in os.listdir(DESIGNS_DIR):
        design_path = os.path.join(DESIGNS_DIR, subdir, '48x48')
        if not os.path.isdir(design_path):
            continue
        p = os.path.join(design_path, f'{design_name}_layer_2_48x48.png')
        if os.path.exists(p):
            layer2_path = p
            break

    # Start with all tiles blocked
    collision = [WALL_GID] * (width * height)

    if layer2_path:
        img = Image.open(layer2_path).convert('RGBA')
        img_w, img_h = img.size
        cols = img_w // TILE_SIZE
        rows = img_h // TILE_SIZE

        # First pass: any tile WITHOUT layer2 content could be walkable
        for ty in range(min(rows, height)):
            for tx in range(min(cols, width)):
                box = (tx * TILE_SIZE, ty * TILE_SIZE, (tx + 1) * TILE_SIZE, (ty + 1) * TILE_SIZE)
                tile = img.crop(box)
                pixels = list(tile.getdata())
                # If mostly transparent, mark as potentially walkable
                transparent_count = sum(1 for p in pixels if p[3] < 30)
                if transparent_count > len(pixels) * 0.8:
                    collision[ty * width + tx] = 0
    else:
        # No layer2 — use walkable zones only
        collision = [WALL_GID] * (width * height)

    # Apply walkable zones (override collision)
    for zone in walkable_zones:
        for y in range(zone['y1'], zone['y2'] + 1):
            for x in range(zone['x1'], zone['x2'] + 1):
                if 0 <= x < width and 0 <= y < height:
                    collision[y * width + x] = 0

    # Always make edges walls
    for x in range(width):
        collision[x] = WALL_GID  # Top row
        collision[(height - 1) * width + x] = WALL_GID  # Bottom row
    for y in range(height):
        collision[y * width] = WALL_GID  # Left column
        collision[y * width + (width - 1)] = WALL_GID  # Right column

    # Ensure spawn and door tiles are walkable
    return collision


def build_objects(config, tile_size=TILE_SIZE):
    """Convert config objects to Tiled JSON object format."""
    objects = []
    obj_id = 1

    for obj in config.get('objects', []):
        tiled_obj = {
            'id': obj_id,
            'name': obj['type'],
            'x': obj['x'] * tile_size,
            'y': obj['y'] * tile_size,
            'width': 0,
            'height': 0,
            'point': True,
            'rotation': 0,
            'type': '',
            'visible': True,
        }

        props = []

        if obj['type'] == 'door':
            props.append({'name': 'nextMap', 'type': 'string', 'value': obj.get('nextMap', 'worldscene')})
            props.append({'name': 'label', 'type': 'string', 'value': obj.get('label', 'Exit')})

        elif obj['type'] == 'painting':
            for key in ['title', 'artist', 'price', 'description']:
                if key in obj:
                    props.append({'name': key, 'type': 'string', 'value': str(obj[key])})

        elif obj['type'] == 'npc':
            for key in ['id', 'label', 'dialogue', 'canHaggle']:
                if key in obj:
                    props.append({'name': key, 'type': 'string', 'value': str(obj[key])})

        elif obj['type'] == 'dialog':
            if 'content' in obj:
                props.append({'name': 'content', 'type': 'string', 'value': obj['content']})

        if props:
            tiled_obj['properties'] = props

        objects.append(tiled_obj)
        obj_id += 1

    return objects


def build_map(room_id, config):
    """Build a complete Tiled JSON map for a room."""
    design = config['design']

    # Determine map size from preview image
    preview_path = None
    for subdir in os.listdir(DESIGNS_DIR):
        design_path = os.path.join(DESIGNS_DIR, subdir, '48x48')
        if not os.path.isdir(design_path):
            continue
        p = os.path.join(design_path, f'{design}_preview_48x48.png')
        if os.path.exists(p):
            preview_path = p
            break

    if not preview_path:
        print(f"ERROR: Cannot find preview for {design}")
        return None

    img = Image.open(preview_path)
    width = img.size[0] // TILE_SIZE
    height = img.size[1] // TILE_SIZE

    print(f"  Map size: {width}x{height} tiles ({img.size[0]}x{img.size[1]}px)")

    # Generate collision
    collision = generate_collision_from_layer2(
        design, width, height,
        config.get('walkable_zones', [])
    )

    # Ensure spawn/door positions are walkable
    for obj in config.get('objects', []):
        if obj['type'] in ('spawn', 'door'):
            idx = obj['y'] * width + obj['x']
            if 0 <= idx < len(collision):
                collision[idx] = 0

    walkable = sum(1 for t in collision if t == 0)
    blocked = sum(1 for t in collision if t > 0)
    print(f"  Collision: {walkable} walkable, {blocked} blocked ({walkable*100//(walkable+blocked)}% open)")

    # Build objects
    objects = build_objects(config)
    print(f"  Objects: {len(objects)} ({sum(1 for o in objects if o['name'] == 'painting')} paintings, {sum(1 for o in objects if o['name'] == 'npc')} NPCs)")

    # Room_Builder collision tile properties
    rb_tiles = [
        {"id": 5, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 6, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 7, "properties": [{"name": "collides", "type": "bool", "value": True}]},
        {"id": 8, "properties": [{"name": "collides", "type": "bool", "value": True}]},
    ]

    # Empty tile data for visual layers (the actual visuals come from the bg image)
    empty_layer = [0] * (width * height)

    tiled_json = {
        "compressionlevel": -1,
        "height": height,
        "infinite": False,
        "layers": [
            {
                "data": empty_layer,
                "height": height,
                "id": 1,
                "name": "below_player",
                "opacity": 1,
                "type": "tilelayer",
                "visible": True,
                "width": width,
                "x": 0, "y": 0,
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
                "x": 0, "y": 0,
            },
            {
                "data": empty_layer,
                "height": height,
                "id": 3,
                "name": "above_player",
                "opacity": 1,
                "type": "tilelayer",
                "visible": True,
                "width": width,
                "x": 0, "y": 0,
            },
            {
                "draworder": "topdown",
                "id": 4,
                "name": "objects",
                "objects": objects,
                "opacity": 1,
                "type": "objectgroup",
                "visible": True,
                "width": 0, "height": 0,
                "x": 0, "y": 0,
            },
        ],
        "nextlayerid": 5,
        "nextobjectid": len(objects) + 1,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.11.2",
        "tileheight": TILE_SIZE,
        "tilesets": [
            {
                "columns": 17,
                "firstgid": 1,
                "image": "assets/tilesets/Room_Builder_free_48x48.png",
                "imageheight": 1104,
                "imagewidth": 816,
                "margin": 0,
                "name": "Room_Builder_free_48x48",
                "spacing": 0,
                "tilecount": 391,
                "tileheight": TILE_SIZE,
                "tilewidth": TILE_SIZE,
                "tiles": rb_tiles,
            },
        ],
        "tilewidth": TILE_SIZE,
        "type": "map",
        "version": "1.10",
        "width": width,
    }

    # Store background image path as a custom property on the map
    # LocationScene will read this and display the image
    tiled_json['properties'] = [
        {"name": "bgImage", "type": "string", "value": config['bg_image']},
    ]

    return tiled_json


def main():
    if len(sys.argv) < 2 or sys.argv[1] == '--list':
        print("Available rooms:")
        for room_id, config in ROOMS.items():
            print(f"  {room_id}: {config['title']} ({config['design']})")
        if len(sys.argv) < 2:
            print("\nUsage: python3 tools/bg_room_builder.py <room_id|all>")
        return

    targets = list(ROOMS.keys()) if sys.argv[1] == 'all' else [sys.argv[1]]

    for room_id in targets:
        if room_id not in ROOMS:
            print(f"ERROR: Unknown room '{room_id}'")
            continue

        config = ROOMS[room_id]
        print(f"\nBuilding: {room_id} ({config['title']})")

        tiled_json = build_map(room_id, config)
        if not tiled_json:
            continue

        output_path = os.path.join(OUTPUT_DIR, f'{room_id}.json')
        with open(output_path, 'w') as f:
            json.dump(tiled_json, f, indent=2)

        print(f"  Written: {output_path}")


if __name__ == '__main__':
    main()
