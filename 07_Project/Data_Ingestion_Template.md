# ArtLife Data Ingestion Guide for AI Agents

Welcome, AI Scraper or Content Creator. This document defines the **exact schema requirements** for generating bulk data to feed into the ArtLife game engine. The game requires highly specific JSON structures to simulate its economic and narrative systems.

## 1. Real-World Auction Data (`real_world_data.json`)
This file powers the underlying Geometric Brownian Motion stochastic simulation. You must scrape actual auction records for an artist and format them to generate the required historical "drift".

**Path:** `game/public/content/real_world_data.json`
**Format:** A single JSON object keyed by `artist_id`.

```json
{
  "artist_basquiat_01": {
    "name": "Jean-Michel Basquiat",
    "realWorldAnchor": {
      "auctionHistory": [
        { "year": 1982, "price": 4000, "house": "Private" },
        { "year": 1984, "price": 20900, "house": "Christie's" },
        { "year": 2017, "price": 110500000, "house": "Sotheby's" }
      ],
      "volatilityIndex": 0.85
    }
  }
}
```

### Scraping Rules:
- `auctionHistory`: Provide at minimum the earliest known sale, a mid-career sale, and the peak auction record. The simulation uses the delta between the earliest and latest to calculate the annual compound growth rate (CAGR).
- `volatilityIndex`: A float between `0.10` and `1.00`. Blue-chip dead artists should be low (0.15). Highly speculative young artists should be high (0.80+).

## 2. Artwork Definitions (`game/src/data/artworks.js`)
This is the frontend data that the player interacts with in the terminal and UI dashboards.

**Path:** `game/src/data/artworks.js`
**Format:** A javascript module exporting an array of Javascript Objects.

```javascript
export const ARTWORKS = [
    {
        id: 'work_basquiat_skull',
        title: 'Untitled (Skull)',
        artistId: 'artist_basquiat_01', // MUST match real_world_data.json
        artist: 'Jean-Michel Basquiat',
        medium: 'Acrylic and mixed media on canvas',
        yearCreated: 1981,
        basePrice: 110500000, // The target value in USD
        onMarket: true, // If true, begins the game available for random purchase
        description: "One of the most iconic paintings of the 20th century, representing the inner and outer self.",
        notes: [
            { author: "Sotheby's Catalog", text: "Acquired directly from the artist by the previous owner in 1982." },
            { author: "Dealer Rumor", text: "Rumored to have been painted in exactly 48 hours during a manic episode." }
        ],
        provenanceHistory: [
            { year: 1982, owner: "Private Collection, New York" },
            { year: 2017, owner: "Yusaku Maezawa" }
        ],
        imagePath: "content/artworks/basquiat_skull.jpg" // Relative to public/ directory
    }
];
```

### Data Requirements:
- `basePrice`: This is the *anchor* fundamental price the simulation revolves around.
- `description`: 1-2 paragraphs of rich curatorial text.
- `notes`: An array of flavor text, rumors, or condition reports.
- `provenanceHistory`: A chronological list of ownership transfers to make the piece feel historically grounded.

## Instructions for Content Generation Agents
If the User asks you to "import data for Artist X" or "scrape the market for Artist Y", you must:
1. Research the artist's real-world auction history (earliest notable price, peak price).
2. Write the JSON entry to `real_world_data.json`.
3. Create 3-5 notable artworks for that artist in `artworks.js`, complete with full `notes` and `provenanceHistory`.
4. Ensure the `artistId` perfectly matches between the two files.
