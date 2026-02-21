# 🛡️ Codebase Management Protocol

> **Purpose:** To serve as the definitive guide for how the AI Agent (Antigravity/Codebase Manager) and the User collaborate to maintain a stable, production-ready codebase.

As the Codebase Manager, I follow strict protocols to ensure that high-velocity development never compromises the stability of the `main` branch or the live Cloudflare Pages deployment.

---

## 🏗️ 1. The Development Workflow (Feature Branches)

We will no longer develop directly on `main` unless it is a trivial typo fix. 

1. **Branch Creation**: For every new MVP feature (e.g., `Admin God Mode`, `Tone System`), I will create a dedicated feature branch (`git checkout -b feature/admin-dashboard`).
2. **Development**: I will write the code and manually invoke Vite (`npm run build`) to ensure there are zero syntax or compilation errors.
3. **Automated Testing**: Before ANY merge, I will run the full test suite (`npm test` and `npm run test:flow`). 
4. **Merge & Deploy**: Only when the feature is 100% verified will I merge it back into `main` and execute `git push origin main`. This trigger Cloudflare to automatically build and deploy the live MVP.

---

## 🚨 2. Error Handling & Verification Checklist

To maintain "Gaming Standards", every single code change is subjected to the following checklist before it is considered complete:

- [ ] **Compilation Check**: `npx vite build --mode development` completes with ZERO errors or unresolved imports.
- [ ] **Console Silence**: The browser console (captured via Playwright headless mode) must not throw any React `Warning:` or `ReferenceError:` exceptions during boot.
- [ ] **State Resilience**: If a state manager (GameState, PhoneManager) is modified, I verify it does not break the `autoResumedRef` page-reload persistence.
- [ ] **Visual Fallbacks**: If I am loading new image assets (e.g., character portraits, backgrounds), I must include `this.load.on('loaderror')` fail-safes (as seen in `BootScene.js`) to inject magenta placeholders instead of crashing the Phaser engine.
- [ ] **Test Coverage**: Rerun `test_game.cjs` (engine headless tests) and `test_flow.cjs` (Playwright E2E UI flow) to ensure 100% green tests. 

---

## 🗺️ 3. Issue Tracking & Roadmap Integration

I will maintain `07_Project/Roadmap.md` as our single source of truth for task tracking. Whenever you give me a new directive:
1. I will map it against the existing Roadmap.
2. I will prioritize "High Impact, Low Effort" integrations first (see the MVP Audit).
3. I will log any discovered tech-debt into the `Code_Audit.md` document for future agent refactoring phases.

---

## 🛠️ 4. Handling Dependency Constraints

- If we need a new tool (e.g., `react-flow` for the Content Studio or `inkjs` for deep narrative), I will FIRST read the `Technical_Stack.md` and `Reference_Tools_Research.md` to ensure it aligns with our architecture.
- I will always use absolute paths and explicit `.js`/`.jsx` extensions in my imports to prevent Vite module resolution errors. 
