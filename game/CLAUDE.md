# ArtLife — Claude Code Instructions

## Autonomous Workflow
When given a plan or task list:
1. Execute all steps without waiting for approval between them
2. After completing implementation, always run `npx vite build` to verify
3. Update `07_Project/Roadmap.md` and `07_Project/README.md` with any new features or status changes
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

## Key Rules
- Never import managers directly in terminal screens — use TerminalAPI
- CSS prefix convention: `db-` (dashboard), `haggle-` (battle), `t-` (terminal), `wm-` (world map), `db-action-` (action budget), `db-cal-` (calendar)
- Terminal screens return `{ lines, options, footerHtml }` — use `type: 'raw'` for HTML injection
- MAX_ACTIONS = 4, variable costs (1-2 AP per action)
