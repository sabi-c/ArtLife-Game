---
type: prompt_pack
project: Art_Life
date: 2026-05-13
target: Gemini 2.5 Flash Image (nano banana) or Imagen 3
---

# Art Life — Gemini Prompt Pack

Eight prompts. Paste into Gemini 2.5 Flash Image or Imagen 3. Run a few generations each. Keep the best, iterate.

Style invariants in every prompt:
- Pixel art, base resolution around 320x180 upscaled, crisp pixel edges
- Anchor references: Norco (2022), Backbone / Tails Noir (2022), Papers Please (2013)
- Palette: deep noir black #0a0a0f, chandelier gold #c9a84c, burgundy #8b2252, teal #2a6b6b, ivory-warm whites only, never pure white
- One dominant light source per interior, always
- Avoid: pure white, modern smartphone UI, cute or wholesome tones, noble-collector expressions, smiles that read moved-by-beauty

---

## Prompt 1: Title screen, refined

Pixel art title screen for a video game called Art Life. Aspect ratio 16:9 at approximately 320x180 base resolution upscaled with crisp pixel edges. Composition: a vintage CRT computer monitor centered on a wooden desk in a dimly lit private study at night. The CRT shows the game title ART LIFE in a serif typeface glowing faintly amber. Surrounding the monitor: a half-finished glass of red wine, a stack of art catalogs, an unopened envelope with a wax seal, a vintage rotary phone, a brass ashtray with a thin curl of cigarette smoke. Single dominant light source: a green banker's lamp casting a warm pool on the desk. Window to the left shows night sky with rain-streaked glass and blurred city lights. Visual register: Norco 2022 lo-fi pixel art crossed with Backbone 2022 shadow density. Palette: deep noir black 0a0a0f base, chandelier gold c9a84c for monitor glow and lamp pool, burgundy 8b2252 for the wine and wax seal, teal 2a6b6b accents in the smoke. Avoid pure white, modern UI, anything cute or wholesome-cozy. Mood: anticipation in a private room before a long night.

---

## Prompt 2 REDRAFTED: Documentary intro frame, Troemel register

Pixel art still frame from a lo-fi screen-recording documentary about the contemporary art market. The frame mimics the visual maximalism of Brad Troemel's video Reports: it is not designed, it is scavenged. Aspect ratio 16:9 at 320x180 base resolution upscaled. The composition is a flattened browser screen with multiple visible browser tabs open across the top (one tab says "Inigo Philbrick Vanuatu DOJ filing," another says "Beeple Christie's 69M," another shows a Sotheby's results page). The main viewport contains a chaotic collage of overlapping rectangular elements: a screenshot of an auction house live-bid interface mid-bid at forty million dollars, a phone screenshot of an Instagram art-meme account, a Twitter post with a blue check ranting about NFT prices, an AI-generated image of a painting that has been pasted into a real Christie's gallery frame, a Zillow listing for a Hamptons mansion, a price ticker scrolling at the bottom. The overall texture is "fifteen tabs deep in someone's browser at 2 AM." Pixel style: lo-fi, Norco resolution, Papers Please functional UI elements. Palette: dark browser chrome with red and blue accents, gold ticker text, scattered burgundy and teal highlights from the embedded images. Light source: implied screen glow from a single laptop in a dark room, very slight blue cast over everything. Avoid: polished documentary B-roll aesthetics, slick motion graphics, smooth gradients, anything that looks designed by a brand agency. Mood: scrolling someone's evidence board at 2 AM, the line between document and forgery dissolving.

---

## Prompt 3: ArtNet login screen

Pixel art mock-up of a fictional art-world software application called ArtNet displayed on a CRT computer monitor at login. Aspect ratio 16:9 at 320x180 base resolution upscaled. The screen shows a dark navy and gold interface: ArtNet logo at top in serif typeface, two input fields for username and password styled like late-1990s enterprise software, a small ticker bar at the bottom showing recent art sales scrolling. The CRT is angled slightly with subtle scanlines visible. Faint reflection of the user's desk environment ghosted in the monitor glass. Visual register: Papers Please functional pixel UI, Norco lo-fi resolution treatment. Palette: deep navy 1a1f3a background, gold c9a84c for headers and accents, burgundy 8b2252 for hover and active states, teal 2a6b6b for the ticker bar. Light source: the monitor's own glow lighting the surrounding desk faintly. Avoid modern flat UI, smartphone aesthetics, pure white. Mood: an administrative tool with secret power, Bloomberg Terminal repurposed for art dealers.

---

## Prompt 4: Gallery opening interior (the social-battle scene)

Pixel art three-quarter perspective view of a contemporary art gallery during opening night. Aspect ratio 16:9 at 320x180 base resolution upscaled. The composition shows a high-ceilinged gallery with ivory-warm walls reading as off-white not pure white, five large abstract paintings hung across two walls under track lighting, six NPC figures scattered through the room. Two are having an animated conversation by a painting, one stands alone studying a piece intently, two are by a refreshment table holding champagne flutes, one solo near the entrance smoking a cigarette. A refreshment table with a cheese platter, champagne glasses, a small bouquet. The protagonist figure in business-casual dark blazer stands mid-room. Single dominant light source: gallery track lighting creating warm pools on each painting and softer ambient elsewhere. Visual register: Backbone interior shadow density crossed with Crusader Kings III character readability at small size. Palette: blue-black base, chandelier gold spotlights on paintings, ivory walls, deep red wine, soft greens in the bouquet. Avoid pure white, fluorescent flat lighting, casual party tones. Mood: social theater where everyone is performing and money is unspoken but everywhere.

---

## Prompt 5: Character portrait, Hedge Fund Manager class (reference)

Pixel art character portrait approximately 128x128 resolution upscaled with crisp pixel edges, for a protagonist class called The Hedge Fund Manager in an art-market RPG. The character is in their early thirties, sharp jaw, narrow eyes, neatly combed hair, wearing an expensive but understated dark suit with subtle gold cufflinks. Expression: calculating, slightly amused, never warm. Background: a faint suggestion of a Bloomberg terminal glow behind them, mostly out of focus. Visual register: Norco character work with Backbone-style noir lighting on the face. Palette: deep blue background, warm tungsten skin tones with cold blue shadow on the left half of the face, gold accents on the cufflinks, sharp black for the suit. Light source: cold blue terminal glow from screen-left, warm tungsten lamp from screen-right. Avoid noble or romantic facial expressions, warm smiles, anything that reads as moved-by-beauty. Mood: someone who sees art as an asset class first.

(This prompt mirrors the existing rich_kid, hedge_fund, and insider portraits already on disk in `game/public/portraits/` (naming: `portrait_<class>.png`). Use these existing portraits as style anchors when validating the next two prompts.)

---

## Prompt 6 NEW: Character portrait, Speculator class

Pixel art character portrait approximately 128x128 resolution upscaled with crisp pixel edges, for a protagonist class called The Speculator in an art-market RPG. The character is in their late twenties, restless eyes, slightly disheveled hair, wearing an expensive but worn-in casual jacket over a graphic t-shirt with a faded crypto-logo or meme. Expression: alert, slightly manic, calculating odds in real time. Visible details: a phone in one hand mid-text, a wrist with a chunky watch, faint dark circles under the eyes. Background: a faint suggestion of a chaotic browser with multiple open tabs (a Discord channel, a crypto chart, an auction live feed) glowing behind them. Visual register: Norco character work with Backbone-style noir lighting on the face. Palette: cool blue-green background from screen glow, warm tungsten skin tones, hot red and green accents from the chart, sharp black for the jacket. Light source: cold screen glow from screen-left covering most of the face, slight warm key light from screen-right. Avoid noble or romantic facial expressions, calm composed mood, anything that reads as patient or contemplative. Mood: someone who lives on volatility and treats every art trade like a memestock position.

---

## Prompt 7 NEW: Character portrait, Curator class

Pixel art character portrait approximately 128x128 resolution upscaled with crisp pixel edges, for a protagonist class called The Curator in an art-market RPG. This is the only class allowed to lean toward genuine aesthetic feeling, but they carry an ethical conflict: their love of art is real, and the world they operate in is corrosive to that love. The character is in their early thirties, intelligent eyes, slightly drawn face, wearing a tasteful but understated black turtleneck and a thin pendant necklace. Expression: composed on the surface, conflicted underneath, the kind of face that could pivot to disappointment in a half-second. Visible details: ink-stained fingers, a paperback held loosely, the corner of a notebook visible. Background: a faint suggestion of a museum wall with one large abstract painting behind them, slightly out of focus. Visual register: Norco character work with Backbone-style noir lighting on the face. Palette: warm ivory and burgundy in the background painting, cool tungsten skin tones with deep shadow on one side, gold pendant accent, sharp black for the turtleneck. Light source: gallery overhead spotlight from screen-right warm, distant ambient from screen-left cool. Avoid open warm smiles, theme-park earnestness, anything that reads as innocent. The face must communicate someone who knows beauty and knows the cost. Mood: a connoisseur who has chosen this world and is still deciding if the choice was worth it.

---

## Prompt 8: Home interior, protagonist's apartment

Pixel art three-quarter perspective view of a contemporary loft apartment used by an art dealer. Aspect ratio 16:9 at 320x180 base resolution upscaled. The space includes: a central desk with a CRT monitor, a stack of catalogs and a wine glass on the desk, exposed brick walls with three art pieces hung, a small kitchenette with a coffee maker in the back corner, a leather chair and floor lamp in the front-right forming a reading nook, a window showing night cityscape with city-light bokeh, a doormat by the entrance with two unopened envelopes. Protagonist figure stands near the desk facing the monitor. Visual register: Norco lo-fi pixel apartment work, Backbone atmospheric interior. Palette: warm tungsten for the lamps, deep blacks in the corners, ivory-warm walls, burgundy in the wine and chair leather, teal in the curtain fabric. Light source: floor lamp in the corner plus desk lamp by the monitor. Avoid bright cheerful lighting, modern minimalist clean-white aesthetics, anything wholesome-cozy. Mood: a working space owned by someone who lives more in their inbox than in their apartment.

---

## How to use this pack

Run each prompt three to five times in Gemini 2.5 Flash Image. Take the best generation. Compare against `game/public/portraits/` (naming: `portrait_<class>.png`) for the existing three class portraits to make sure the two new portraits feel like the same family. For the scene prompts, compare against `game/public/backgrounds/bg_gallery_main_1bit.png` and the splash sequence in `_reference/Art-Life-Reference/splash 1 2 3 4.gif` to make sure the style is consistent with what's already on disk.

If a generation drifts toward warm-cozy or noble-romantic, the prompt is too generous. Tighten the "avoid" list. The Troemel-register anchor (incentives, not taste) is the corrective.
