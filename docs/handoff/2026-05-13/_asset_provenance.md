---
type: provenance_log
project: Art_Life
date_started: 2026-05-13
status: active
purpose: One-line provenance entry per asset added to the game. Audit trail.
---

# Art Life — Asset Provenance Log

One line per asset added to the game. Source model, seed/candidate context, date, prompt reference. This is what legal review will ask for if the game ships and someone files a claim.

Append to the bottom. Do not edit prior entries unless you're correcting a factual error.

---

## Format

```
- <filename> — <source model/tool>, <seed or "no seed">, <candidate context>, <YYYY-MM-DD>. Source prompt: <doc reference>.
```

## Entries

### Pre-existing assets (audit baseline 2026-05-13)

These assets were on disk before this provenance log existed. Source unknown / pre-spec. If you regenerate any of them, log the new entry below and mark the old one superseded.

- `portraits/portrait_rich_kid.png` — pre-existing, source unknown, 2026-05-13 baseline.
- `portraits/portrait_hedge_fund.png` — pre-existing, source unknown, 2026-05-13 baseline.
- `portraits/portrait_insider.png` — pre-existing, source unknown, 2026-05-13 baseline.
- `backgrounds/bg_title.png` — pre-existing.
- `backgrounds/bg_gallery*.png` (multiple variants) — pre-existing.
- `backgrounds/bg_auction.png` — pre-existing.
- Category backgrounds (`bg_drama`, `bg_fair`, `bg_market`, `bg_opportunity`, `bg_personal`, `bg_social`) — pre-existing.
- All dealer sprites (`sprites/dealer_*.png`, 8 files) — pre-existing.
- All gallery NPC spritesheets (`sprites/gallery/npc_*.png`, 11 files, LimeZu format) — pre-existing.
- All gallery environmental objects (`sprites/gallery/*.png`, 20 files) — pre-existing.

### New entries

(none yet — add new asset entries below this line as they land)

---

## Why this log matters

1. **Legal cover.** Documents that AI-generated images came from your prompt + a specific model, not from scraping or plagiarism.
2. **Regeneration.** Lets you re-run the same prompt with the same seed to produce a near-identical variant.
3. **Style anchoring.** Reading the log shows which prompts produced the strongest results and informs future generations.
4. **Audit trail.** If the game ships and someone files a copyright claim, this log is your defense.

## When to update

- Every time a new asset lands in `game/public/` that wasn't there before.
- When regenerating an existing asset (mark the old entry superseded, add the new one).
- Never remove old entries — they're part of the audit history.
