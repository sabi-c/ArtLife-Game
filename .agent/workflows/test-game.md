---
description: How to test ArtLife game autonomously via CLI without browser
---
// turbo-all

## CLI Test Harness

The game has a headless Node.js test runner at `game/test-cli.mjs` that imports all game managers and screens directly — no browser needed.

### Quick Commands

1. **Full automated playtest:**
```bash
node test-cli.mjs auto
```

2. **Run specific command sequence:**
```bash
node test-cli.mjs "press 2; read; press 1; read"
```

3. **Interactive REPL:**
```bash
node test-cli.mjs
```
Then type commands: `1`, `2`, `read`, `state`, `advance 5`, `back`, `auto`, `quit`

### Available Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `press N` | `p N` or just `N` | Press option number N |
| `read` | `r` | Read current screen text |
| `state` | `s` | Dump game state JSON |
| `options` | `o` | List current options |
| `back` | `b` | Pop screen (like Esc) |
| `advance N` | `a N` | Advance N weeks |
| `auto` | — | Full automated test |

### From npm

```bash
npm test           # Full playtest
npm run test:cli   # Interactive REPL
```

### Notes

- All commands run with `SafeToAutoRun: true` since they're read-only game logic
- The CLI renders with ANSI colors in the terminal
- Screen functions return `{ lines, options }` data — no DOM required
- The `HeadlessUI` class mimics `TerminalUI` interface (pushScreen/popScreen/replaceScreen)
