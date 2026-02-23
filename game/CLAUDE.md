# ArtLife — Claude Code Instructions

## Autonomous Workflow
When given a plan or task list:
1. Execute all steps without waiting for approval between them
2. After completing implementation, always run `npx vite build` to verify
3. Update `../07_Project/Roadmap.md` and `../07_Project/README.md` (relative to `game/` — these live at repo root `Art-Market-Game/07_Project/`) with any new features or status changes
4. When all tasks are done, play a completion sound: `afplay /System/Library/Sounds/Glass.aiff`
5. Provide a concise summary of what was done, files changed, and build status

## Iteration Protocol
After completing a sprint or plan:
- Review the Roadmap for next tasks
- Check for any regressions by scanning recent changes
- Suggest the next logical sprint (2-3 tasks) based on priority
- If the user says "continue" or "keep going", pick up the next tasks autonomously

## Permissions
- All git operations (add, commit, push) are pre-approved for this project
- All build/test commands (vite, npm) are pre-approved
- File edits within game/src/ are pre-approved
- Doc updates to 07_Project/ are pre-approved

## Build & Test
- `npx vite build` — must pass clean before any commit
- `npm run test:flow` — Playwright tests (needs dev server)
- `npm test` — unit tests (needs dev server on port 5175)

## Documentation Standards
**All code changes MUST include proper documentation.** This is a prerequisite for every task.

### JSDoc Headers
Every file should have a module-level JSDoc comment explaining:
- What the file does (1-2 sentences)
- Key exports and their purpose
- Dependencies and side effects
- Example usage where helpful

### Inline Comments
- Document **why**, not what — code should be self-explanatory for the "what"
- Complex algorithms, state transitions, and business logic MUST have comments
- Magic numbers must be explained (e.g., `// 0.45 = slight positive bias for heat`)
- Event bus emissions must document what listeners expect

### Architecture Decision Records
When making architectural decisions (new patterns, data flow changes, system integrations):
- Add a brief comment at the decision point
- Update `07_Project/README.md` if it affects the overall architecture
- Note alternatives considered and why they were rejected

### State Shape Documentation
Any changes to `GameState.state` fields must be documented:
- In the field's declaration (in `init()` and `quickDemoInit()`)
- In the consuming code that reads the field
- Both methods must stay in sync — every field in `init()` must exist in `quickDemoInit()`

## Key Rules
- Never import managers directly in terminal screens — use TerminalAPI
- CSS prefix convention: `db-` (dashboard), `haggle-` (battle), `t-` (terminal), `wm-` (world map), `db-action-` (action budget), `db-cal-` (calendar), `bb-` (Bloomberg terminal), `sh-` (Seventh House gallery), `ts-` (Tearsheet), `an-` (Artnet), `sb-` (Sotheby's), `dp-` (Deitch Projects)
- Terminal screens return `{ lines, options, footerHtml }` — use `type: 'raw'` for HTML injection
- MAX_ACTIONS = 4, variable costs (1-2 AP per action)
- `GameState.init()` and `GameState.quickDemoInit()` must have identical field sets
- All Phaser asset paths MUST be relative (no leading `/`) for GitHub Pages compatibility
- Canvas visibility is managed by React effect in App.jsx — never set it in isolation

## Common Pitfalls (Known Bugs to Avoid)
- `window.joypadState` / `window.joypadAction` must be polled in update(), not via event listeners
- Phaser keyboard input only works when canvas has focus — set `tabindex="0"` and call `.focus()`
- `GameEventBus` is a singleton — dynamic imports in tests may get a different instance
- BootScene must be stopped before launching other scenes via DEBUG_LAUNCH_SCENE
- The `#terminal` div (z-index 10) must be hidden when Phaser canvas is active
