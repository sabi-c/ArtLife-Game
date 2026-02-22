#!/usr/bin/env node
/**
 * Room Generator — Creates Tiled JSON maps from templates.
 *
 * Usage:
 *   node tools/generate_room.js <template> <room_id> [options]
 *
 * Templates:
 *   gallery     — White-wall gallery with painting slots on north/west walls
 *   studio      — Artist studio with workbenches and easels
 *   office      — Dealer office / back room
 *   bar         — Bar / lounge for social events
 *   warehouse   — Large open space (auction house, freeport)
 *
 * Options:
 *   --width <n>     Map width in tiles (default: template-specific)
 *   --height <n>    Map height in tiles (default: template-specific)
 *   --paintings <n> Number of painting slots (gallery only, default: auto)
 *   --npcs <json>   JSON array of NPC objects
 *   --title <str>   Room title for dialog sign
 *   --dry-run       Print JSON to stdout instead of writing file
 *
 * Examples:
 *   node tools/generate_room.js gallery soho_kenji --title "Kenji Nomura: New Works"
 *   node tools/generate_room.js studio amara_studio --width 14 --height 10
 *   node tools/generate_room.js bar opening_party --npcs '[{"id":"elena_ross","label":"Elena Ross"}]'
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = join(__dirname, '..', 'public', 'content', 'maps');
const ROOMS_FILE = join(__dirname, '..', 'src', 'data', 'rooms.js');

// ── LimeZu Room_Builder_free_48x48 tile IDs (1-indexed GIDs) ──
const T = {
    // Floors
    FLOOR_WHITE:   67,   // bright white
    FLOOR_GREY:    50,   // slightly grey (variation)

    // Walls — top edge
    WALL_TL:       15,   // top-left corner
    WALL_TOP:      16,   // top wall
    WALL_TR:       17,   // top-right corner

    // Walls — sides
    WALL_LEFT:     49,   // left wall
    WALL_RIGHT:    51,   // right wall

    // Walls — bottom edge
    WALL_BL:       66,   // bottom-left corner
    WALL_BOTTOM:   66,   // bottom wall (same as BL tile)
    WALL_BR:       68,   // bottom-right corner

    // Wall overlays (world layer — upper wall detail)
    OVERLAY_A:     6,    // picture rail / upper wall
    OVERLAY_B:     7,    // picture rail variant

    // Wall overlays (above_player layer — molding)
    MOLDING_A:     23,
    MOLDING_B:     24,
};

// Room_Builder has 391 tiles (17 cols × 23 rows), firstgid=1
// Interiors starts at firstgid=392
const INTERIORS_FIRSTGID = 392;

// ── LimeZu Interiors_free_48x48 tile IDs (0-indexed → add INTERIORS_FIRSTGID for GID) ──
function I(tileId) { return tileId + INTERIORS_FIRSTGID; }

const FURN = {
    // Tables
    ROUND_TABLE:    I(214),
    DESK_TL:        I(215), DESK_TC: I(216), DESK_TR: I(217),
    DESK_BL:        I(231), DESK_BC: I(232), DESK_BR: I(233),
    COFFEE_TL:      I(247), COFFEE_TC: I(248), COFFEE_TR: I(249),
    COFFEE_BL:      I(263), COFFEE_BC: I(264), COFFEE_BR: I(265),

    // Chairs
    CHAIR_FRONT_L:  I(208), CHAIR_FRONT_R: I(209),
    CHAIR_BACK_L:   I(224), CHAIR_BACK_R:  I(225),
    STOOL:          I(341),

    // Sofas (3x2)
    RED_SOFA_TL:    I(296), RED_SOFA_TC: I(297), RED_SOFA_TR: I(298),
    RED_SOFA_BL:    I(312), RED_SOFA_BC: I(313), RED_SOFA_BR: I(314),
    BLUE_SOFA_TL:   I(704), BLUE_SOFA_TC: I(705), BLUE_SOFA_TR: I(706),
    BLUE_SOFA_BL:   I(720), BLUE_SOFA_BC: I(721), BLUE_SOFA_BR: I(722),

    // Shelving
    BOOKCASE_TL:    I(384), BOOKCASE_TR: I(385),
    BOOKCASE_BL:    I(400), BOOKCASE_BR: I(401),
    SHELF_1:        I(416), SHELF_2: I(417), SHELF_3: I(418), SHELF_4: I(419),

    // Plants / Decorations
    PLANT_TL:       I(189), PLANT_TC: I(190), PLANT_TR: I(191),
    PLANT_BL:       I(205), PLANT_BC: I(206), PLANT_BR: I(207),
    SMALL_PLANT:    I(768),

    // Paintings (wall art)
    PAINTING_A:     I(643), PAINTING_B: I(644),
    PAINTING_C:     I(648), PAINTING_D: I(649),
    PAINTING_LARGE_TL: I(645), PAINTING_LARGE_TR: I(646),

    // Lamps
    DESK_LAMP:      I(887),
    FLOOR_LAMP:     I(889),

    // Kitchen
    COUNTER_TL:     I(512), COUNTER_TC: I(513), COUNTER_TR: I(514),
    COUNTER_BL:     I(528), COUNTER_BC: I(529), COUNTER_BR: I(530),
    STOVE:          I(522),
    SINK:           I(524),

    // Rugs (3x3)
    RUG_TL:         I(442), RUG_TC: I(443), RUG_TR: I(444),
    RUG_ML:         I(458), RUG_MC: I(459), RUG_MR: I(460),
    RUG_BL:         I(474), RUG_BC: I(475), RUG_BR: I(476),

    // Gold sofa (3x2)
    GOLD_SOFA_TL:   I(707), GOLD_SOFA_TC: I(708), GOLD_SOFA_TR: I(709),
    GOLD_SOFA_BL:   I(723), GOLD_SOFA_BC: I(724), GOLD_SOFA_BR: I(725),

    // Large tables (4x3)
    DARK_TABLE_R0:  [I(160), I(161), I(162), I(163)],
    DARK_TABLE_R1:  [I(176), I(177), I(178), I(179)],
    DARK_TABLE_R2:  [I(192), I(193), I(194), I(195)],
    LIGHT_TABLE_R0: [I(165), I(166), I(167), I(168)],
    LIGHT_TABLE_R1: [I(181), I(182), I(183), I(184)],
    LIGHT_TABLE_R2: [I(197), I(198), I(199), I(200)],

    // Nightstand (2x2)
    NIGHTSTAND_TL: I(328), NIGHTSTAND_TR: I(329),
    NIGHTSTAND_BL: I(344), NIGHTSTAND_BR: I(345),

    // More paintings
    PAINTING_LARGE_BL: I(661), PAINTING_LARGE_BR: I(662),
    PAINTING_E: I(650), PAINTING_F: I(651),

    // Beige floor tiles (from Interiors)
    BEIGE_FLOOR_TL: I(70), BEIGE_FLOOR_TC: I(71), BEIGE_FLOOR_TR: I(72),
    BEIGE_FLOOR_ML: I(89), BEIGE_FLOOR_MC: I(90), BEIGE_FLOOR_MR: I(94),
    BEIGE_FLOOR_BL: I(105), BEIGE_FLOOR_BC: I(106), BEIGE_FLOOR_BR: I(110),

    // White floor tiles
    WHITE_FLOOR_TL: I(96), WHITE_FLOOR_TC: I(97), WHITE_FLOOR_TR: I(98),
    WHITE_FLOOR_ML: I(112), WHITE_FLOOR_MC: I(129), WHITE_FLOOR_MR: I(114),
    WHITE_FLOOR_BL: I(128), WHITE_FLOOR_BC: I(129), WHITE_FLOOR_BR: I(130),

    // Misc
    LAPTOP:         I(136),
    GLOBE:          I(589),
    CANDLE:         I(801),
    BARREL:         I(929),
    VASE:           I(769),
};

// Tile IDs that should have collision (Room_Builder)
const COLLISION_IDS = [5, 6, 7, 8, 14, 15, 16, 48, 50, 65, 67];

// ── Template definitions ──

// ── Helper: place a multi-tile piece ──
function placePiece(layer, x, y, rows) {
    for (let r = 0; r < rows.length; r++) {
        const row = Array.isArray(rows[r]) ? rows[r] : [rows[r]];
        for (let c = 0; c < row.length; c++) {
            setTile(layer, x + c, y + r, row[c]);
        }
    }
}

// ── Helper: fill floor with Interiors tiles (proper edges) ──
function fillBeigeFLoor(below, x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const isTop = y === y1, isBot = y === y2, isLeft = x === x1, isRight = x === x2;
            let tile;
            if (isTop && isLeft) tile = FURN.BEIGE_FLOOR_TL;
            else if (isTop && isRight) tile = FURN.BEIGE_FLOOR_TR;
            else if (isBot && isLeft) tile = FURN.BEIGE_FLOOR_BL;
            else if (isBot && isRight) tile = FURN.BEIGE_FLOOR_BR;
            else if (isTop) tile = FURN.BEIGE_FLOOR_TC;
            else if (isBot) tile = FURN.BEIGE_FLOOR_BC;
            else if (isLeft) tile = FURN.BEIGE_FLOOR_ML;
            else if (isRight) tile = FURN.BEIGE_FLOOR_MR;
            else tile = FURN.BEIGE_FLOOR_MC;
            setTile(below, x, y, tile);
        }
    }
}

const TEMPLATES = {
    museum: {
        name: 'Museum Gallery',
        defaultWidth: 18,
        defaultHeight: 14,
        generate: generateMuseum,
    },
    gallery_showcase: {
        name: 'Gallery Showcase',
        defaultWidth: 16,
        defaultHeight: 14,
        generate: generateGalleryShowcase,
    },
    gallery: {
        name: 'Gallery',
        defaultWidth: 12,
        defaultHeight: 10,
        generate: generateGallery,
    },
    studio: {
        name: 'Artist Studio',
        defaultWidth: 14,
        defaultHeight: 10,
        generate: generateStudio,
    },
    office: {
        name: 'Office',
        defaultWidth: 10,
        defaultHeight: 8,
        generate: generateOffice,
    },
    bar: {
        name: 'Bar / Lounge',
        defaultWidth: 14,
        defaultHeight: 10,
        generate: generateBar,
    },
    warehouse: {
        name: 'Warehouse',
        defaultWidth: 20,
        defaultHeight: 14,
        generate: generateWarehouse,
    },
};

// ── Map generation helpers ──

function createLayer(name, width, height, fillTile = 0) {
    return {
        data: new Array(width * height).fill(fillTile),
        height,
        id: 0, // assigned later
        name,
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width,
        x: 0,
        y: 0,
    };
}

function setTile(layer, x, y, gid) {
    if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
        layer.data[y * layer.width + x] = gid;
    }
}

function fillRect(layer, x1, y1, x2, y2, gid) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            setTile(layer, x, y, gid);
        }
    }
}

function makeObject(id, name, x, y, properties = []) {
    return {
        height: 0,
        id,
        name,
        point: true,
        ...(properties.length > 0 ? { properties } : {}),
        rotation: 0,
        type: '',
        visible: true,
        width: 0,
        x: x * 48,
        y: y * 48,
    };
}

function prop(name, value, type = 'string') {
    return { name, type, value: String(value) };
}

// ── Build standard walls ──
function buildWalls(below, world, above, w, h) {
    // Floor
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            setTile(below, x, y, (x + y) % 7 === 0 ? T.FLOOR_GREY : T.FLOOR_WHITE);
        }
    }

    // Top wall
    setTile(below, 0, 0, T.WALL_TL);
    for (let x = 1; x < w - 1; x++) setTile(below, x, 0, T.WALL_TOP);
    setTile(below, w - 1, 0, T.WALL_TR);

    // Side walls
    for (let y = 1; y < h - 1; y++) {
        setTile(below, 0, y, T.WALL_LEFT);
        setTile(below, w - 1, y, T.WALL_RIGHT);
    }

    // Bottom wall with door opening in center
    const doorX1 = Math.floor(w / 2) - 1;
    const doorX2 = Math.floor(w / 2);
    for (let x = 0; x < w; x++) {
        if (x === 0) setTile(below, x, h - 1, T.WALL_BL);
        else if (x === w - 1) setTile(below, x, h - 1, T.WALL_BR);
        else if (x === doorX1 || x === doorX2) setTile(below, x, h - 1, T.FLOOR_WHITE); // door opening
        else setTile(below, x, h - 1, T.WALL_BOTTOM);
    }

    // Wall overlays — picture rail on north wall
    for (let x = 1; x < w - 1; x++) {
        setTile(world, x, 0, x % 2 === 0 ? T.OVERLAY_A : T.OVERLAY_B);
        setTile(above, x, 0, x % 2 === 0 ? T.MOLDING_A : T.MOLDING_B);
    }
}

// ── 9 curated artworks for the museum template ──
// Pulled from src/data/artworks.js — real game data
const MUSEUM_ARTWORKS = [
    { title: 'Untitled (Crown Study)', artist: 'Jean-Michel Basquiat', price: 420000, desc: 'A fierce crown motif in oil paintstick. Neo-expressionism at its rawest.' },
    { title: 'Radiant Baby (Subway Drawing)', artist: 'Keith Haring', price: 185000, desc: 'Chalk on black paper. The iconic crawling infant radiates energy lines.' },
    { title: 'Balloon Dog (Blue) — Ed. 2/5', artist: 'Jeff Koons', price: 500000, desc: 'Mirror-polished steel. Pop culture as high art, literally reflecting the viewer.' },
    { title: 'Cowboy (Rephotograph)', artist: 'Richard Prince', price: 290000, desc: 'Appropriation art — a Marlboro ad reframed as fine art photography.' },
    { title: 'Untitled Film Still #21', artist: 'Cindy Sherman', price: 75000, desc: 'Gelatin silver print. Sherman as the arriving career woman, gazing upward.' },
    { title: 'Kyoto Study No. 4', artist: 'Yuki Tanaka', price: 18000, desc: 'Oil on linen. Atmospheric layers of Kyoto light, contemporary minimalism.' },
    { title: 'Portrait of a Man with Red Dust (II)', artist: 'Kwame Asante', price: 45000, desc: 'Mixed media on board. Texture and identity, the dust of home.' },
    { title: 'Architecture of Forgetting (III)', artist: 'Liu Wei', price: 62000, desc: 'Ink and pigment on paper. Monumental scale, the weight of memory.' },
    { title: 'Meridian (Untitled)', artist: 'Unknown Artist', price: 35000, desc: 'Oil on linen. Six feet of confident impasto. The gallery card gives nothing away.' },
];

// ── Template: Museum (18×14, hand-crafted showcase gallery) ──
// A polished museum-quality room with beige floors, picture rail molding,
// 9 paintings with real artwork data, gold sofa, reception desk, plants, lamps.
function generateMuseum(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    // ── Walls (Room_Builder) ──
    buildWalls(below, world, above, w, h);

    // ── Override floor: polished beige from Interiors tileset ──
    fillBeigeFLoor(below, 1, 1, w - 2, h - 2);

    // ── Picture rail molding on east + west walls (not just north) ──
    for (let y = 1; y < h - 1; y++) {
        setTile(world, 0, y, y % 2 === 0 ? T.OVERLAY_A : T.OVERLAY_B);
        setTile(above, 0, y, y % 2 === 0 ? T.MOLDING_A : T.MOLDING_B);
        setTile(world, w - 1, y, y % 2 === 0 ? T.OVERLAY_A : T.OVERLAY_B);
        setTile(above, w - 1, y, y % 2 === 0 ? T.MOLDING_A : T.MOLDING_B);
    }

    const objects = [];
    let objId = 1;
    let artIdx = 0;
    const artworks = opts.artworks || MUSEUM_ARTWORKS;

    // Helper: add a painting object with real artwork data
    function addPainting(x, y) {
        const art = artworks[artIdx % artworks.length];
        objects.push(makeObject(objId++, 'painting', x, y, [
            prop('title', art.title),
            prop('artist', art.artist),
            prop('price', String(art.price)),
            prop('description', art.desc),
        ]));
        artIdx++;
    }

    // ── Spawn & exit door (bottom center) ──
    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // ── North wall: 4 large paintings (2-tile wide), evenly spaced ──
    const northSlots = [2, 5, 9, 12]; // x positions for 18-wide room
    for (const px of northSlots) {
        if (px + 1 < w - 1) {
            setTile(above, px, 0, FURN.PAINTING_LARGE_TL);
            setTile(above, px + 1, 0, FURN.PAINTING_LARGE_TR);
            setTile(above, px, 1, FURN.PAINTING_LARGE_BL);
            setTile(above, px + 1, 1, FURN.PAINTING_LARGE_BR);
            addPainting(px, 2); // interaction point 1 tile below painting
        }
    }

    // ── East wall: 2 paintings ──
    const eastSlots = [3, 8];
    for (const py of eastSlots) {
        if (py < h - 2) {
            setTile(above, w - 1, py, FURN.PAINTING_C);
            addPainting(w - 2, py);
        }
    }

    // ── West wall: 2 paintings ──
    const westSlots = [3, 8];
    for (const py of westSlots) {
        if (py < h - 2) {
            setTile(above, 0, py, FURN.PAINTING_D);
            addPainting(1, py);
        }
    }

    // ── South wall near door: 1 painting ──
    setTile(above, 3, h - 1, FURN.PAINTING_A);
    addPainting(3, h - 2);

    // ── Central rug (5×3) ──
    const rugCX = Math.floor(w / 2) - 2;
    const rugCY = Math.floor(h / 2) - 1;
    // Row 0 (top)
    setTile(below, rugCX, rugCY, FURN.RUG_TL);
    setTile(below, rugCX + 1, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 2, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 3, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 4, rugCY, FURN.RUG_TR);
    // Row 1 (middle)
    setTile(below, rugCX, rugCY + 1, FURN.RUG_ML);
    setTile(below, rugCX + 1, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 2, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 3, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 4, rugCY + 1, FURN.RUG_MR);
    // Row 2 (bottom)
    setTile(below, rugCX, rugCY + 2, FURN.RUG_BL);
    setTile(below, rugCX + 1, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 2, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 3, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 4, rugCY + 2, FURN.RUG_BR);

    // ── Gold sofa (3×2) centered on rug, facing north wall ──
    const sofaX = Math.floor(w / 2) - 1;
    const sofaY = Math.floor(h / 2);
    placePiece(world, sofaX, sofaY, [
        [FURN.GOLD_SOFA_TL, FURN.GOLD_SOFA_TC, FURN.GOLD_SOFA_TR],
        [FURN.GOLD_SOFA_BL, FURN.GOLD_SOFA_BC, FURN.GOLD_SOFA_BR],
    ]);

    // ── Floor lamps flanking sofa ──
    setTile(world, rugCX - 1, rugCY + 1, FURN.FLOOR_LAMP);
    setTile(world, rugCX + 5, rugCY + 1, FURN.FLOOR_LAMP);

    // ── Reception desk (3×2) — bottom-right corner ──
    const deskX = w - 5;
    const deskY = h - 4;
    placePiece(world, deskX, deskY, [
        [FURN.DESK_TL, FURN.DESK_TC, FURN.DESK_TR],
        [FURN.DESK_BL, FURN.DESK_BC, FURN.DESK_BR],
    ]);
    // Desk accessories on above_player layer
    setTile(above, deskX, deskY, FURN.DESK_LAMP);
    setTile(above, deskX + 2, deskY, FURN.LAPTOP);
    // Chair behind desk
    setTile(world, deskX + 1, deskY + 2, FURN.CHAIR_BACK_L);

    // ── Large plants in corners ──
    // Top-left corner
    placePiece(world, 1, 1, [
        [FURN.PLANT_TL, FURN.PLANT_TR],
        [FURN.PLANT_BL, FURN.PLANT_BR],
    ]);
    // Bottom-left corner (near entrance)
    setTile(world, 1, h - 2, FURN.SMALL_PLANT);
    // Top-right corner
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);
    // Near desk
    setTile(world, w - 2, deskY - 1, FURN.VASE);

    // ── Nightstand with vase near entrance (left side) ──
    placePiece(world, 2, h - 3, [
        [FURN.NIGHTSTAND_TL, FURN.NIGHTSTAND_TR],
        [FURN.NIGHTSTAND_BL, FURN.NIGHTSTAND_BR],
    ]);

    // ── Gallery title sign (dialog object) ──
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 3, [
        prop('content', opts.title || 'Museum Gallery — Permanent Collection'),
    ]));

    // ── NPC: Elena Ross near east wall ──
    const npcs = opts.npcs || [
        { id: 'elena_ross', label: 'Elena Ross', dialogue: 'Welcome to the gallery. Everything on display is available — if you know how to ask.', canHaggle: true },
    ];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', w - 4, 5, [
            prop('id', npc.id),
            prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || 'Welcome.'),
            prop('canHaggle', npc.canHaggle !== false ? 'true' : 'false'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Gallery Showcase (hand-crafted, polished) ──
function generateGalleryShowcase(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    // Use Room_Builder walls
    buildWalls(below, world, above, w, h);

    // Override floor: polished beige from Interiors tileset
    fillBeigeFLoor(below, 1, 1, w - 2, h - 2);

    const objects = [];
    let objId = 1;

    // ── Spawn & exit door (bottom center) ──
    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // ── Central rug (5x3 using 3x3 rug tiles, stretched) ──
    const rugCX = Math.floor(w / 2) - 2;
    const rugCY = Math.floor(h / 2) - 1;
    // Row 1
    setTile(below, rugCX, rugCY, FURN.RUG_TL);
    setTile(below, rugCX + 1, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 2, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 3, rugCY, FURN.RUG_TC);
    setTile(below, rugCX + 4, rugCY, FURN.RUG_TR);
    // Row 2
    setTile(below, rugCX, rugCY + 1, FURN.RUG_ML);
    setTile(below, rugCX + 1, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 2, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 3, rugCY + 1, FURN.RUG_MC);
    setTile(below, rugCX + 4, rugCY + 1, FURN.RUG_MR);
    // Row 3
    setTile(below, rugCX, rugCY + 2, FURN.RUG_BL);
    setTile(below, rugCX + 1, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 2, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 3, rugCY + 2, FURN.RUG_BC);
    setTile(below, rugCX + 4, rugCY + 2, FURN.RUG_BR);

    // ── Gallery viewing bench (gold sofa, centered on rug) ──
    const sofaX = Math.floor(w / 2) - 1;
    const sofaY = Math.floor(h / 2);
    setTile(world, sofaX, sofaY, FURN.GOLD_SOFA_TL);
    setTile(world, sofaX + 1, sofaY, FURN.GOLD_SOFA_TC);
    setTile(world, sofaX + 2, sofaY, FURN.GOLD_SOFA_TR);
    setTile(world, sofaX, sofaY + 1, FURN.GOLD_SOFA_BL);
    setTile(world, sofaX + 1, sofaY + 1, FURN.GOLD_SOFA_BC);
    setTile(world, sofaX + 2, sofaY + 1, FURN.GOLD_SOFA_BR);

    // ── Reception desk (bottom-right corner) ──
    const deskX = w - 5;
    const deskY = h - 4;
    setTile(world, deskX, deskY, FURN.DESK_TL);
    setTile(world, deskX + 1, deskY, FURN.DESK_TC);
    setTile(world, deskX + 2, deskY, FURN.DESK_TR);
    setTile(world, deskX, deskY + 1, FURN.DESK_BL);
    setTile(world, deskX + 1, deskY + 1, FURN.DESK_BC);
    setTile(world, deskX + 2, deskY + 1, FURN.DESK_BR);
    // Desk lamp & laptop
    setTile(above, deskX, deskY, FURN.DESK_LAMP);
    setTile(above, deskX + 2, deskY, FURN.LAPTOP);
    // Chair behind desk
    setTile(world, deskX + 1, deskY + 2, FURN.CHAIR_BACK_L);

    // ── Paintings on north wall (above_player layer, evenly spaced) ──
    const paintingTiles = [FURN.PAINTING_A, FURN.PAINTING_B, FURN.PAINTING_C, FURN.PAINTING_D];
    const northPaintings = [];
    for (let i = 0; i < Math.floor((w - 4) / 3); i++) {
        const px = 2 + i * 3;
        if (px >= w - 2) break;
        // Large paintings (2-wide) alternating with small
        if (i % 2 === 0 && px + 1 < w - 2) {
            setTile(above, px, 0, FURN.PAINTING_LARGE_TL);
            setTile(above, px + 1, 0, FURN.PAINTING_LARGE_TR);
        } else {
            setTile(above, px, 0, paintingTiles[i % paintingTiles.length]);
        }
        // Interactable painting object
        northPaintings.push(px);
        objects.push(makeObject(objId++, 'painting', px, 1, [
            prop('title', `Artwork ${i + 1}`),
            prop('artist', 'Unknown Artist'),
            prop('price', String(15000 + i * 8000)),
            prop('description', 'A striking work in the current exhibition.'),
        ]));
    }

    // ── Paintings on west wall ──
    for (let y = 3; y < h - 3; y += 3) {
        setTile(above, 0, y, paintingTiles[y % paintingTiles.length]);
        objects.push(makeObject(objId++, 'painting', 1, y, [
            prop('title', `West Wall ${Math.floor(y / 3)}`),
            prop('artist', 'Unknown Artist'),
            prop('price', String(20000 + y * 3000)),
            prop('description', 'Hung on the west wall, catching the afternoon light.'),
        ]));
    }

    // ── Paintings on east wall ──
    for (let y = 3; y < h - 4; y += 4) {
        setTile(above, w - 1, y, paintingTiles[(y + 1) % paintingTiles.length]);
        objects.push(makeObject(objId++, 'painting', w - 2, y, [
            prop('title', `East Wall ${Math.floor(y / 4)}`),
            prop('artist', 'Unknown Artist'),
            prop('price', String(30000 + y * 2000)),
            prop('description', 'A contemplative piece on the east wall.'),
        ]));
    }

    // ── Decorative plants (corners and beside desk) ──
    // Large plant top-left
    setTile(world, 1, 1, FURN.PLANT_TL);
    setTile(world, 2, 1, FURN.PLANT_TR);
    setTile(world, 1, 2, FURN.PLANT_BL);
    setTile(world, 2, 2, FURN.PLANT_BR);
    // Small plants
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);
    setTile(world, 1, h - 2, FURN.SMALL_PLANT);
    setTile(world, w - 2, deskY - 1, FURN.VASE);

    // ── Floor lamps beside viewing area ──
    setTile(world, rugCX - 1, rugCY + 1, FURN.FLOOR_LAMP);
    setTile(world, rugCX + 5, rugCY + 1, FURN.FLOOR_LAMP);

    // ── Nightstand with guest book near entrance ──
    setTile(world, 2, h - 3, FURN.NIGHTSTAND_TL);
    setTile(world, 3, h - 3, FURN.NIGHTSTAND_TR);
    setTile(world, 2, h - 2, FURN.NIGHTSTAND_BL);
    setTile(world, 3, h - 2, FURN.NIGHTSTAND_BR);

    // ── Gallery sign ──
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 2, [
        prop('content', opts.title || 'Contemporary Gallery — Current Exhibition'),
    ]));

    // ── NPC dealer ──
    const npcs = opts.npcs || [{ id: 'gallery_dealer', label: 'Gallery Dealer', dialogue: 'Welcome to the gallery. Everything on display is available. Take your time.' }];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', deskX + 1, deskY - 1, [
            prop('id', npc.id), prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || 'Welcome.'),
            prop('canHaggle', npc.canHaggle !== false ? 'true' : 'false'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Gallery ──
function generateGallery(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    buildWalls(below, world, above, w, h);

    const objects = [];
    let objId = 1;

    // Spawn point (near bottom, above door)
    const spawnX = Math.floor(w / 2);
    const spawnY = h - 2;
    objects.push(makeObject(objId++, 'spawn', spawnX, spawnY));

    // Exit door
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [
        prop('nextMap', 'worldscene'),
    ]));

    // Paintings on north wall (every 2-3 tiles, skip corners)
    const paintingSlots = opts.paintings || Math.floor((w - 4) / 2);
    const paintingStyles = [
        'painting_small_abstract', 'painting_medium_landscape',
        'painting_large_portrait', 'painting_large_modern',
        'painting_small_photo',
    ];

    const paintingStartX = 2;
    const paintingSpacing = Math.max(2, Math.floor((w - 4) / paintingSlots));
    for (let i = 0; i < paintingSlots; i++) {
        const px = paintingStartX + i * paintingSpacing;
        if (px >= w - 1) break;
        objects.push(makeObject(objId++, 'painting', px, 1, [
            prop('title', `Artwork ${i + 1}`),
            prop('artist', 'Unknown Artist'),
            prop('price', String(10000 + i * 5000)),
            prop('description', 'A striking work that demands attention.'),
            prop('sprite', paintingStyles[i % paintingStyles.length]),
        ]));
    }

    // Paintings on west wall
    if (h > 6) {
        objects.push(makeObject(objId++, 'painting', 1, 3, [
            prop('title', `West Wall Piece 1`),
            prop('artist', 'Unknown Artist'),
            prop('price', '25000'),
            prop('description', 'Hung on the west wall, catching the afternoon light.'),
            prop('sprite', 'painting_large_modern'),
        ]));
    }
    if (h > 8) {
        objects.push(makeObject(objId++, 'painting', 1, 6, [
            prop('title', `West Wall Piece 2`),
            prop('artist', 'Unknown Artist'),
            prop('price', '35000'),
            prop('description', 'A quieter work, meant for contemplation.'),
            prop('sprite', 'painting_small_photo'),
        ]));
    }

    // Gallery sign
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 2, [
        prop('content', opts.title || 'Contemporary Gallery — Current Exhibition'),
    ]));

    // Tile-based furniture from Interiors tileset (placed on world layer)
    // Gallery bench (red sofa, 3x2) in center
    const benchX = Math.floor(w / 2) - 1;
    const benchY = Math.floor(h / 2);
    setTile(world, benchX, benchY, FURN.RED_SOFA_TL);
    setTile(world, benchX + 1, benchY, FURN.RED_SOFA_TC);
    setTile(world, benchX + 2, benchY, FURN.RED_SOFA_TR);
    setTile(world, benchX, benchY + 1, FURN.RED_SOFA_BL);
    setTile(world, benchX + 1, benchY + 1, FURN.RED_SOFA_BC);
    setTile(world, benchX + 2, benchY + 1, FURN.RED_SOFA_BR);

    // Desk (3x2) near back corner
    if (w > 10) {
        setTile(world, w - 4, h - 3, FURN.DESK_TL);
        setTile(world, w - 3, h - 3, FURN.DESK_TC);
        setTile(world, w - 2, h - 3, FURN.DESK_TR);
        setTile(world, w - 4, h - 2, FURN.DESK_BL);
        setTile(world, w - 3, h - 2, FURN.DESK_BC);
        setTile(world, w - 2, h - 2, FURN.DESK_BR);
        // Desk lamp on desk
        setTile(above, w - 4, h - 3, FURN.DESK_LAMP);
    }

    // Plants in corners
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);
    setTile(world, 1, h - 2, FURN.SMALL_PLANT);

    // Wall paintings from Interiors tileset (on north wall, above_player layer)
    for (let x = 2; x < w - 2; x += 3) {
        const paintingTile = [FURN.PAINTING_A, FURN.PAINTING_B, FURN.PAINTING_C, FURN.PAINTING_D];
        setTile(above, x, 0, paintingTile[x % paintingTile.length]);
    }

    // Floor lamp
    setTile(world, 1, Math.floor(h / 2), FURN.FLOOR_LAMP);

    // NPCs
    const npcs = opts.npcs || [{ id: 'gallery_dealer', label: 'Gallery Dealer', dialogue: 'Welcome to the gallery. Take your time.' }];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', w - 3, Math.floor(h / 2) + 1, [
            prop('id', npc.id),
            prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || 'Welcome.'),
            prop('canHaggle', npc.canHaggle !== false ? 'true' : 'false'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Studio ──
function generateStudio(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    buildWalls(below, world, above, w, h);

    const objects = [];
    let objId = 1;

    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // Paintings/easels along north wall (interactable objects)
    let paintIdx = 0;
    for (let x = 2; x < w - 2; x += 3) {
        objects.push(makeObject(objId++, 'painting', x, 1, [
            prop('title', `Work in Progress ${++paintIdx}`),
            prop('artist', 'Studio Artist'),
            prop('price', '0'),
            prop('description', 'An unfinished canvas on an easel. Paint is still wet.'),
            prop('sprite', 'painting_medium_landscape'),
        ]));
        // Tile painting on wall
        setTile(above, x, 0, [FURN.PAINTING_A, FURN.PAINTING_C, FURN.PAINTING_B, FURN.PAINTING_D][paintIdx % 4]);
    }

    // Workbench (desk 3x2) against east wall
    setTile(world, w - 4, Math.floor(h / 2), FURN.DESK_TL);
    setTile(world, w - 3, Math.floor(h / 2), FURN.DESK_TC);
    setTile(world, w - 2, Math.floor(h / 2), FURN.DESK_TR);
    setTile(world, w - 4, Math.floor(h / 2) + 1, FURN.DESK_BL);
    setTile(world, w - 3, Math.floor(h / 2) + 1, FURN.DESK_BC);
    setTile(world, w - 2, Math.floor(h / 2) + 1, FURN.DESK_BR);

    // Stool at workbench
    setTile(world, w - 3, Math.floor(h / 2) + 2, FURN.STOOL);

    // Shelving on west wall
    setTile(world, 1, 2, FURN.BOOKCASE_TL);
    setTile(world, 1, 3, FURN.BOOKCASE_BL);

    // Plants
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);
    setTile(world, 1, h - 2, FURN.SMALL_PLANT);

    // Dialog
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 2, [
        prop('content', opts.title || 'Artist Studio — Private'),
    ]));

    // NPCs
    const npcs = opts.npcs || [{ id: 'studio_artist', label: 'The Artist', dialogue: 'I\'m working on something new. What do you think?' }];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', 4, Math.floor(h / 2) + 1, [
            prop('id', npc.id), prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || '...'), prop('canHaggle', 'false'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Office ──
function generateOffice(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    buildWalls(below, world, above, w, h);

    const objects = [];
    let objId = 1;

    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // Desk (3x2) in center
    const deskX = Math.floor(w / 2) - 1;
    const deskY = Math.floor(h / 2) - 1;
    setTile(world, deskX, deskY, FURN.DESK_TL);
    setTile(world, deskX + 1, deskY, FURN.DESK_TC);
    setTile(world, deskX + 2, deskY, FURN.DESK_TR);
    setTile(world, deskX, deskY + 1, FURN.DESK_BL);
    setTile(world, deskX + 1, deskY + 1, FURN.DESK_BC);
    setTile(world, deskX + 2, deskY + 1, FURN.DESK_BR);
    // Laptop on desk
    setTile(above, deskX + 1, deskY, FURN.LAPTOP);

    // Chairs in front of desk
    setTile(world, deskX, deskY + 2, FURN.CHAIR_BACK_L);
    setTile(world, deskX + 2, deskY + 2, FURN.CHAIR_BACK_R);

    // Bookcase on east wall
    setTile(world, w - 2, 2, FURN.BOOKCASE_TL);
    setTile(world, w - 2, 3, FURN.BOOKCASE_BL);

    // Painting behind desk (interactable object)
    objects.push(makeObject(objId++, 'painting', Math.floor(w / 2), 1, [
        prop('title', 'The Collection'), prop('artist', 'Various'),
        prop('price', '0'), prop('description', 'A rotating selection from the private collection.'),
        prop('sprite', 'painting_large_portrait'),
    ]));
    // Also place tile painting on wall
    setTile(above, Math.floor(w / 2), 0, FURN.PAINTING_LARGE_TL);
    setTile(above, Math.floor(w / 2) + 1, 0, FURN.PAINTING_LARGE_TR);

    // Plant and lamp
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);
    setTile(world, 1, 1, FURN.FLOOR_LAMP);

    // Rug under desk area
    for (let ry = deskY - 1; ry <= deskY + 3 && ry < h - 1; ry++) {
        for (let rx = deskX - 1; rx <= deskX + 3 && rx < w - 1; rx++) {
            if (rx > 0 && ry > 0) {
                const isTop = ry === deskY - 1;
                const isBottom = ry === deskY + 3;
                const isLeft = rx === deskX - 1;
                const isRight = rx === deskX + 3;
                let rugTile;
                if (isTop && isLeft) rugTile = FURN.RUG_TL;
                else if (isTop && isRight) rugTile = FURN.RUG_TR;
                else if (isBottom && isLeft) rugTile = FURN.RUG_BL;
                else if (isBottom && isRight) rugTile = FURN.RUG_BR;
                else if (isTop) rugTile = FURN.RUG_TC;
                else if (isBottom) rugTile = FURN.RUG_BC;
                else if (isLeft) rugTile = FURN.RUG_ML;
                else if (isRight) rugTile = FURN.RUG_MR;
                else rugTile = FURN.RUG_MC;
                // Place rug on below_player layer so furniture sits on top
                setTile(below, rx, ry, rugTile);
            }
        }
    }

    // Dialog
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 2, [
        prop('content', opts.title || 'Private Office'),
    ]));

    // NPC
    const npcs = opts.npcs || [{ id: 'office_dealer', label: 'The Dealer', dialogue: 'Please, sit. Let\'s discuss business.' }];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', Math.floor(w / 2), Math.floor(h / 2), [
            prop('id', npc.id), prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || '...'), prop('canHaggle', 'true'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Bar ──
function generateBar(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    buildWalls(below, world, above, w, h);

    const objects = [];
    let objId = 1;

    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // Bar counter along north wall (using kitchen counters)
    for (let x = 2; x < w - 2; x++) {
        const isFirst = x === 2;
        const isLast = x === w - 3;
        setTile(world, x, 1, isFirst ? FURN.COUNTER_TL : isLast ? FURN.COUNTER_TR : FURN.COUNTER_TC);
        setTile(world, x, 2, isFirst ? FURN.COUNTER_BL : isLast ? FURN.COUNTER_BR : FURN.COUNTER_BC);
    }
    // Sink and stove on counter
    setTile(above, 4, 1, FURN.SINK);
    setTile(above, 6, 1, FURN.STOVE);

    // Stools at bar
    for (let x = 3; x < w - 3; x += 2) {
        setTile(world, x, 3, FURN.STOOL);
    }

    // Round tables scattered
    setTile(world, 3, Math.floor(h / 2) + 1, FURN.ROUND_TABLE);
    setTile(world, w - 4, Math.floor(h / 2) + 1, FURN.ROUND_TABLE);
    setTile(world, Math.floor(w / 2), h - 3, FURN.ROUND_TABLE);
    // Chairs around tables
    setTile(world, 2, Math.floor(h / 2) + 1, FURN.CHAIR_FRONT_L);
    setTile(world, 4, Math.floor(h / 2) + 1, FURN.CHAIR_FRONT_R);
    setTile(world, w - 5, Math.floor(h / 2) + 1, FURN.CHAIR_FRONT_L);
    setTile(world, w - 3, Math.floor(h / 2) + 1, FURN.CHAIR_FRONT_R);

    // Blue sofa along west wall
    setTile(world, 1, Math.floor(h / 2) - 1, FURN.BLUE_SOFA_TL);
    setTile(world, 1, Math.floor(h / 2), FURN.BLUE_SOFA_BL);

    // Plants
    setTile(world, 1, 1, FURN.SMALL_PLANT);
    setTile(world, w - 2, 1, FURN.SMALL_PLANT);

    // Floor lamps
    setTile(world, 1, h - 2, FURN.FLOOR_LAMP);
    setTile(world, w - 2, h - 2, FURN.FLOOR_LAMP);

    // Dialog
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 4, [
        prop('content', opts.title || 'Opening Night Reception'),
    ]));

    // NPCs
    const npcs = opts.npcs || [
        { id: 'bartender', label: 'Bartender', dialogue: 'What can I get you?' },
        { id: 'collector', label: 'A Collector', dialogue: 'Marvelous show, isn\'t it?' },
    ];
    npcs.forEach((npc, i) => {
        const nx = 3 + i * Math.floor((w - 6) / Math.max(1, npcs.length - 1));
        objects.push(makeObject(objId++, 'npc', nx, Math.floor(h / 2), [
            prop('id', npc.id), prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || '...'), prop('canHaggle', npc.canHaggle ? 'true' : 'false'),
        ]));
    });

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Template: Warehouse ──
function generateWarehouse(w, h, opts) {
    const below = createLayer('below_player', w, h);
    const world = createLayer('world', w, h);
    const above = createLayer('above_player', w, h);

    buildWalls(below, world, above, w, h);

    const objects = [];
    let objId = 1;

    const spawnX = Math.floor(w / 2);
    objects.push(makeObject(objId++, 'spawn', spawnX, h - 2));
    objects.push(makeObject(objId++, 'door', spawnX, h - 1, [prop('nextMap', 'worldscene')]));

    // Rows of display tables with auction lots
    const rows = Math.min(2, Math.floor((h - 6) / 4));
    let lotNum = 1;
    for (let row = 0; row < rows; row++) {
        const ry = 3 + row * 4;
        for (let x = 3; x < w - 3; x += 4) {
            // Coffee table as display pedestal (3x2)
            setTile(world, x, ry, FURN.COFFEE_TL);
            setTile(world, x + 1, ry, FURN.COFFEE_TC);
            setTile(world, x + 2, ry, FURN.COFFEE_TR);
            setTile(world, x, ry + 1, FURN.COFFEE_BL);
            setTile(world, x + 1, ry + 1, FURN.COFFEE_BC);
            setTile(world, x + 2, ry + 1, FURN.COFFEE_BR);

            // Painting object above each pedestal
            objects.push(makeObject(objId++, 'painting', x + 1, ry - 1, [
                prop('title', `Lot ${lotNum}`),
                prop('artist', 'Various'), prop('price', String(50000 + row * 20000 + x * 1000)),
                prop('description', 'Available for auction.'),
                prop('sprite', 'painting_medium_landscape'),
            ]));
            lotNum++;
        }
    }

    // Barrels along east wall (warehouse aesthetic)
    for (let y = 2; y < h - 2; y += 3) {
        setTile(world, w - 2, y, FURN.BARREL);
    }

    // Shelving on west wall
    setTile(world, 1, 2, FURN.BOOKCASE_TL);
    setTile(world, 2, 2, FURN.BOOKCASE_TR);
    setTile(world, 1, 3, FURN.BOOKCASE_BL);
    setTile(world, 2, 3, FURN.BOOKCASE_BR);
    if (h > 10) {
        setTile(world, 1, 5, FURN.BOOKCASE_TL);
        setTile(world, 2, 5, FURN.BOOKCASE_TR);
        setTile(world, 1, 6, FURN.BOOKCASE_BL);
        setTile(world, 2, 6, FURN.BOOKCASE_BR);
    }

    // Desk at entrance (registration)
    setTile(world, w - 5, h - 3, FURN.DESK_TL);
    setTile(world, w - 4, h - 3, FURN.DESK_TC);
    setTile(world, w - 3, h - 3, FURN.DESK_TR);
    setTile(world, w - 5, h - 2, FURN.DESK_BL);
    setTile(world, w - 4, h - 2, FURN.DESK_BC);
    setTile(world, w - 3, h - 2, FURN.DESK_BR);
    setTile(above, w - 4, h - 3, FURN.LAPTOP);

    // Wall paintings on north wall
    for (let x = 2; x < w - 2; x += 4) {
        setTile(above, x, 0, [FURN.PAINTING_A, FURN.PAINTING_B, FURN.PAINTING_C, FURN.PAINTING_D][(x / 2) % 4]);
    }

    // Floor lamps
    setTile(world, 1, Math.floor(h / 2), FURN.FLOOR_LAMP);
    setTile(world, w - 2, Math.floor(h / 2), FURN.FLOOR_LAMP);

    // Plants
    setTile(world, 1, h - 2, FURN.SMALL_PLANT);

    // Dialog
    objects.push(makeObject(objId++, 'dialog', Math.floor(w / 2), 2, [
        prop('content', opts.title || 'Auction Preview — Lots on Display'),
    ]));

    // NPCs
    const npcs = opts.npcs || [{ id: 'auctioneer', label: 'Auctioneer', dialogue: 'Preview is open. The auction begins at 7pm.' }];
    for (const npc of npcs) {
        objects.push(makeObject(objId++, 'npc', w - 4, h - 4, [
            prop('id', npc.id), prop('label', npc.label || npc.id),
            prop('dialogue', npc.dialogue || '...'), prop('canHaggle', 'false'),
        ]));
    }

    return { below, world, above, objects, nextObjectId: objId };
}

// ── Assemble final Tiled JSON ──
function assembleTiledJSON(result, w, h) {
    const { below, world, above, objects, nextObjectId } = result;

    below.id = 1;
    world.id = 2;
    above.id = 3;

    return {
        compressionlevel: -1,
        height: h,
        infinite: false,
        layers: [
            below,
            world,
            above,
            {
                draworder: 'topdown',
                id: 4,
                name: 'objects',
                objects,
                opacity: 1,
                type: 'objectgroup',
                visible: true,
                x: 0,
                y: 0,
            },
        ],
        nextlayerid: 5,
        nextobjectid: nextObjectId,
        orientation: 'orthogonal',
        renderorder: 'right-down',
        tiledversion: '1.10.0',
        tileheight: 48,
        tilesets: [
            {
                columns: 17,
                firstgid: 1,
                image: '../../assets/tilesets/Room_Builder_free_48x48.png',
                imageheight: 1104,
                imagewidth: 816,
                margin: 0,
                name: 'Room_Builder_free_48x48',
                spacing: 0,
                tilecount: 391,
                tileheight: 48,
                tiles: COLLISION_IDS.map(id => ({
                    id,
                    properties: [{ name: 'collides', type: 'bool', value: true }],
                })),
                tilewidth: 48,
            },
            {
                columns: 16,
                firstgid: INTERIORS_FIRSTGID,
                image: '../../assets/tilesets/Interiors_free_48x48.png',
                imageheight: 4272,
                imagewidth: 768,
                margin: 0,
                name: 'Interiors_free_48x48',
                spacing: 0,
                tilecount: 1424,
                tileheight: 48,
                tilewidth: 48,
            },
        ],
        tilewidth: 48,
        type: 'map',
        version: '1.10',
        width: w,
    };
}

// ── Generate rooms.js venue snippet ──
function generateVenueSnippet(roomId, template, opts) {
    const venueName = opts.title || `${template.name} — ${roomId}`;
    return `
// Auto-generated by tools/generate_room.js
const ${roomId.toUpperCase().replace(/[^A-Z0-9]/g, '_')} = {
    id: '${roomId}',
    name: '${venueName.replace(/'/g, "\\'")}',
    desc: 'Generated ${template.name.toLowerCase()} interior.',
    startRoom: '${roomId}_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: '${roomId}_main',
            venue: '${roomId}',
            tiledMap: '${roomId}',
            name: '${template.name}',
            desc: '${venueName.replace(/'/g, "\\'")}',
            look: 'A ${template.name.toLowerCase()} interior.',
            items: [],
            characters: [],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: ['${template.name.toLowerCase()}', 'tiled', 'generated'],
        }
    ],
};
// Add to VENUES array: ${roomId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}
`;
}

// ── Multi-room venue generation ──
// Each room def: { template, suffix, title, npcs, doorTo: [{dir, target, label}] }
const VENUE_PRESETS = {
    gallery_venue: {
        name: 'Gallery Venue',
        rooms: [
            {
                template: 'gallery', suffix: 'lobby', title: 'Gallery — Lobby',
                npcs: [{ id: 'receptionist', label: 'Receptionist', dialogue: 'Welcome. The exhibition is through the north door.', canHaggle: false }],
                doors: [
                    { dir: 'north', target: 'exhibition', label: 'Exhibition Hall' },
                ],
            },
            {
                template: 'gallery', suffix: 'exhibition', title: 'Main Exhibition',
                width: 16, height: 12,
                npcs: [{ id: 'gallery_dealer', label: 'Gallery Dealer', dialogue: 'Take your time. Everything here is available.', canHaggle: true }],
                doors: [
                    { dir: 'south', target: 'lobby', label: 'Back to Lobby' },
                    { dir: 'east', target: 'office', label: 'Private Office' },
                ],
            },
            {
                template: 'office', suffix: 'office', title: 'Back Office',
                npcs: [{ id: 'gallery_owner', label: 'Gallery Owner', dialogue: 'Ah, you found my office. Let\'s talk privately.', canHaggle: true }],
                doors: [
                    { dir: 'west', target: 'exhibition', label: 'Exhibition Hall' },
                ],
            },
        ],
    },
    auction_house: {
        name: 'Auction House',
        rooms: [
            {
                template: 'bar', suffix: 'foyer', title: 'Auction House — Foyer',
                npcs: [{ id: 'concierge', label: 'Concierge', dialogue: 'The preview is in the main hall. Champagne?', canHaggle: false }],
                doors: [
                    { dir: 'north', target: 'hall', label: 'Auction Hall' },
                ],
            },
            {
                template: 'warehouse', suffix: 'hall', title: 'Main Auction Hall',
                npcs: [{ id: 'auctioneer', label: 'Auctioneer', dialogue: 'Preview is open. The auction begins at 7pm.' }],
                doors: [
                    { dir: 'south', target: 'foyer', label: 'Back to Foyer' },
                    { dir: 'east', target: 'storage', label: 'Storage Room' },
                ],
            },
            {
                template: 'warehouse', suffix: 'storage', title: 'Storage & Shipping',
                width: 16, height: 10,
                npcs: [{ id: 'handler', label: 'Art Handler', dialogue: 'Careful around here. Some of these pieces are priceless.' }],
                doors: [
                    { dir: 'west', target: 'hall', label: 'Auction Hall' },
                ],
            },
        ],
    },
    artist_compound: {
        name: 'Artist Compound',
        rooms: [
            {
                template: 'studio', suffix: 'main_studio', title: 'Main Studio',
                width: 16, height: 12,
                npcs: [{ id: 'lead_artist', label: 'Lead Artist', dialogue: 'The collective works here. Feel free to look around.' }],
                doors: [
                    { dir: 'east', target: 'lounge', label: 'Artists\' Lounge' },
                ],
            },
            {
                template: 'bar', suffix: 'lounge', title: 'Artists\' Lounge',
                npcs: [
                    { id: 'artist_2', label: 'Visiting Artist', dialogue: 'This residency is everything. Pure creative freedom.' },
                    { id: 'critic', label: 'Art Critic', dialogue: 'Interesting work happening here. Off the record, of course.' },
                ],
                doors: [
                    { dir: 'west', target: 'main_studio', label: 'Main Studio' },
                ],
            },
        ],
    },
};

function generateVenue(venueId, presetName, dryRun = false) {
    const preset = VENUE_PRESETS[presetName];
    if (!preset) {
        console.error(`Unknown venue preset: ${presetName}. Available: ${Object.keys(VENUE_PRESETS).join(', ')}`);
        process.exit(1);
    }

    console.log(`\nGenerating venue: ${venueId} (${preset.name}, ${preset.rooms.length} rooms)\n`);

    const roomDefs = [];
    const bootLines = [];

    for (const roomSpec of preset.rooms) {
        const template = TEMPLATES[roomSpec.template];
        const roomMapId = `${venueId}_${roomSpec.suffix}`;
        const w = roomSpec.width || template.defaultWidth;
        const h = roomSpec.height || template.defaultHeight;

        const opts = {
            title: roomSpec.title,
            npcs: roomSpec.npcs || null,
            paintings: roomSpec.paintings || null,
        };

        // Generate the base room
        const result = template.generate(w, h, opts);

        // Add internal doors (connecting to other rooms in the venue)
        let objId = result.nextObjectId;
        for (const doorDef of (roomSpec.doors || [])) {
            let dx, dy;
            if (doorDef.dir === 'north') {
                dx = Math.floor(w / 2); dy = 1;
                // Clear wall tile for north door
                setTile(result.below, dx, 0, T.FLOOR_WHITE);
                if (dx > 0) setTile(result.below, dx - 1, 0, T.FLOOR_WHITE);
                setTile(result.world, dx, 0, 0);
                setTile(result.above, dx, 0, 0);
                if (dx > 0) { setTile(result.world, dx - 1, 0, 0); setTile(result.above, dx - 1, 0, 0); }
            } else if (doorDef.dir === 'east') {
                dx = w - 1; dy = Math.floor(h / 2);
                setTile(result.below, dx, dy, T.FLOOR_WHITE);
                setTile(result.below, dx, dy - 1, T.FLOOR_WHITE);
            } else if (doorDef.dir === 'west') {
                dx = 0; dy = Math.floor(h / 2);
                setTile(result.below, dx, dy, T.FLOOR_WHITE);
                setTile(result.below, dx, dy - 1, T.FLOOR_WHITE);
            } else { // south (default exit already has this)
                dx = Math.floor(w / 2); dy = h - 1;
            }

            const targetMapId = `${venueId}_${doorDef.target}`;
            result.objects.push(makeObject(objId++, 'door', dx, dy, [
                prop('nextMap', venueId),
                prop('nextMapRoom', `${targetMapId}_main`),
                prop('label', doorDef.label || doorDef.target),
            ]));

            // Add sign near door
            const signX = doorDef.dir === 'east' ? dx - 1 : doorDef.dir === 'west' ? dx + 1 : dx;
            const signY = doorDef.dir === 'north' ? dy + 1 : doorDef.dir === 'south' ? dy - 1 : dy - 1;
            result.objects.push(makeObject(objId++, 'dialog', signX, signY, [
                prop('content', `→ ${doorDef.label || doorDef.target}`),
            ]));
        }

        // Remove the default south exit door if this room has an explicit south door from roomSpec
        // (the template already generates a south exit to 'worldscene')
        // Only the first room (lobby/main) should have the worldscene exit

        const json = assembleTiledJSON({ ...result, nextObjectId: objId }, w, h);

        if (dryRun) {
            console.log(`--- ${roomMapId}.json ---`);
            console.log(`  Size: ${w}x${h}, Objects: ${result.objects.length}`);
        } else {
            const mapPath = join(MAPS_DIR, `${roomMapId}.json`);
            writeFileSync(mapPath, JSON.stringify(json, null, 2));
            console.log(`  Written: ${mapPath}`);
        }

        bootLines.push(`this.load.tilemapTiledJSON('map_${roomMapId}', 'content/maps/${roomMapId}.json');`);

        roomDefs.push({
            id: `${roomMapId}_main`,
            venue: venueId,
            tiledMap: roomMapId,
            name: roomSpec.title || roomSpec.suffix,
            desc: roomSpec.title || `${preset.name} — ${roomSpec.suffix}`,
            look: `A ${template.name.toLowerCase()} interior.`,
            items: [],
            characters: roomSpec.npcs ? roomSpec.npcs.map(n => ({ id: n.id })) : [],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: [template.name.toLowerCase(), 'tiled', 'generated'],
        });
    }

    // Print venue snippet
    const constName = venueId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    console.log('\n── rooms.js venue snippet ──');
    console.log(`
const ${constName} = {
    id: '${venueId}',
    name: '${preset.name} — ${venueId}',
    desc: 'Generated multi-room ${preset.name.toLowerCase()}.',
    startRoom: '${roomDefs[0].id}',
    timeLimit: 5,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: ${JSON.stringify(roomDefs, null, 8)},
};
// Add to VENUES array: ${constName}
`);

    console.log('── BootScene preload lines ──');
    for (const line of bootLines) console.log(line);

    return { roomDefs, bootLines };
}

// ── CLI ──
function main() {
    const args = process.argv.slice(2);

    // Check for venue subcommand
    if (args[0] === 'venue') {
        const presetName = args[1];
        const venueId = args[2];
        const dryRun = args.includes('--dry-run');
        if (!presetName || !venueId) {
            console.log(`
Venue Generator — Creates multi-room venues with connected doors.

Usage:
  node tools/generate_room.js venue <preset> <venue_id> [--dry-run]

Presets: ${Object.keys(VENUE_PRESETS).join(', ')}

Examples:
  node tools/generate_room.js venue gallery_venue soho_gallery
  node tools/generate_room.js venue auction_house christies
  node tools/generate_room.js venue artist_compound brooklyn_collective
`);
            process.exit(0);
        }
        generateVenue(venueId, presetName, dryRun);
        return;
    }

    if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
Room Generator — Creates Tiled JSON maps from templates.

Usage:
  node tools/generate_room.js <template> <room_id> [options]
  node tools/generate_room.js venue <preset> <venue_id> [--dry-run]

Templates: ${Object.keys(TEMPLATES).join(', ')}
Venue presets: ${Object.keys(VENUE_PRESETS).join(', ')}

Options:
  --width <n>      Map width in tiles
  --height <n>     Map height in tiles
  --paintings <n>  Number of painting slots (gallery)
  --npcs <json>    JSON array of NPCs: [{"id":"x","label":"X","dialogue":"Hi"}]
  --title <str>    Room title / sign text
  --dry-run        Print to stdout, don't write file

Examples:
  node tools/generate_room.js gallery chelsea_nomura --title "Kenji Nomura: Red Squares"
  node tools/generate_room.js venue gallery_venue soho_gallery
  node tools/generate_room.js bar vernissage --npcs '[{"id":"elena","label":"Elena Ross"}]'
`);
        process.exit(0);
    }

    const templateName = args[0];
    const roomId = args[1];
    const template = TEMPLATES[templateName];

    if (!template) {
        console.error(`Unknown template: ${templateName}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
        process.exit(1);
    }

    // Parse options
    const opts = { npcs: null, paintings: null, title: null };
    let width = template.defaultWidth;
    let height = template.defaultHeight;
    let dryRun = false;

    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--width' && args[i + 1]) { width = parseInt(args[++i]); }
        else if (args[i] === '--height' && args[i + 1]) { height = parseInt(args[++i]); }
        else if (args[i] === '--paintings' && args[i + 1]) { opts.paintings = parseInt(args[++i]); }
        else if (args[i] === '--npcs' && args[i + 1]) { opts.npcs = JSON.parse(args[++i]); }
        else if (args[i] === '--title' && args[i + 1]) { opts.title = args[++i]; }
        else if (args[i] === '--dry-run') { dryRun = true; }
    }

    // Generate
    console.log(`Generating ${template.name} room: ${roomId} (${width}x${height})`);
    const result = template.generate(width, height, opts);
    const json = assembleTiledJSON(result, width, height);

    if (dryRun) {
        console.log(JSON.stringify(json, null, 2));
    } else {
        const mapPath = join(MAPS_DIR, `${roomId}.json`);
        if (existsSync(mapPath)) {
            console.warn(`Warning: ${mapPath} already exists, overwriting.`);
        }
        writeFileSync(mapPath, JSON.stringify(json, null, 2));
        console.log(`Written: ${mapPath}`);

        // Print venue snippet
        console.log('\n── rooms.js venue snippet ──');
        console.log(generateVenueSnippet(roomId, template, opts));

        // Print BootScene preload line
        console.log('── BootScene preload line ──');
        console.log(`this.load.tilemapTiledJSON('map_${roomId}', 'content/maps/${roomId}.json');`);

        // Print pallet_town.json door object
        console.log('\n── pallet_town.json door object ──');
        console.log(JSON.stringify({
            height: 0, id: '???', name: 'door', point: true,
            properties: [
                { name: 'nextMap', type: 'string', value: roomId },
                { name: 'nextMapRoom', type: 'string', value: `${roomId}_main` },
            ],
            rotation: 0, type: '', visible: true, width: 0,
            x: '???', y: '???',
        }, null, 2));
    }
}

main();
