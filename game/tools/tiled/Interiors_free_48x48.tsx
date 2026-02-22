<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.11.2" name="Interiors_free_48x48" tilewidth="48" tileheight="48" tilecount="1424" columns="16">
 <image source="../../public/assets/tilesets/Interiors_free_48x48.png" width="768" height="4272"/>
 <!-- LimeZu Interiors tileset — 16 columns × 89 rows = 1424 tiles -->
 <!-- firstgid = 392 in maps (tile ID in map = tileset ID + 392) -->
 <!--
   Category reference (tileset-local IDs, add 392 for map IDs):
   Sofas:         rows 12-14  (IDs 192-239)
   Tables:        rows 9-11   (IDs 144-191)
   Desks:         rows 15-17  (IDs 240-287)
   Chairs:        rows 18-19  (IDs 288-319)
   Bookcases:     rows 20-22  (IDs 320-367)
   Plants:        rows 7-8    (IDs 112-143)
   Lamps:         rows 6-7    (IDs 96-127)
   Rugs:          rows 23-26  (IDs 368-431) — NOT collision
   Paintings:     rows 3-5    (IDs 48-95)   — decorative, above_player
   Kitchen:       rows 27-30  (IDs 432-495)
   Bathroom:      rows 31-34  (IDs 496-559)
   Electronics:   rows 35-37  (IDs 560-607)
   Beds:          rows 38-42  (IDs 608-687)
   Counters:      rows 43-46  (IDs 688-751)

   See data/interior_tile_map.json for the full mapping.
   Set collides=true on furniture tiles that should block movement.
 -->
 <!-- Common furniture collision tiles (sofas, desks, bookcases, etc.) -->
 <!-- Users should add collides=true to specific furniture in Tiled editor -->
</tileset>
