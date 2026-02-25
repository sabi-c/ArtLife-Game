# Scene Flow Visual Editor Plan

## The Goal
ArtLife is fundamentally a state machine that sequences distinct visual "Scenes" (e.g., `TerminalScene`, `DialogueScene`, `HaggleScene`, `WorldScene`) based on narrative conditions, player stats, and inventory items. Managing this purely through deeply nested JSON files (`events.json`, `dialogue_trees.json`) is prone to human error and difficult to visualize.

The objective is to integrate a **Visual Node-Based Game Flow Editor** into the `AdminDashboard` (or a dedicated `/editor` route). This editor will allow us to drag, drop, and connect "Scene Nodes" to author events, automatically generating the JSON that the game engine consumes.

---

## Evaluation of Node Engine Options

To accomplish this within our technical stack (React 19, Vite, Zustand, Phaser), we evaluated three primary open-source visual node engines:

### 1. React Flow (now XYFlow)
An extremely popular, highly customizable node editor built specifically for React.
- **Pros:** 
  - 100% native React. Nodes are simply React components. This means we can render actual game UI (like a miniature dialogue box or a character portrait) *inside* the node itself for true WYSIWYG authoring.
  - State management integrates perfectly with our existing `Zustand` stores.
  - Huge community, excellent documentation, and virtualization (can handle massive graphs without lag).
- **Cons:** 
  - Primarily a UI library, meaning we have to write the "engine" logic that actually parses the graph connections and traverses them in-game.

### 2. LiteGraph.js
A canvas-based library inspired by Unreal Engine's Blueprints.
- **Pros:** 
  - Specifically designed for game development and visual scripting.
  - Incredible performance; handles hundreds of nodes via raw Canvas 2D rendering.
  - Comes with an execution engine out of the box (it "runs" the graph).
- **Cons:** 
  - Not an HTML/React library. Customizing nodes to look like our React-based UI is extremely difficult because everything is drawn pixel-by-pixel on a canvas.

### 3. Rete.js
A highly modular, TypeScript-first framework for visual programming.
- **Pros:** 
  - Framework agnostic, incredibly powerful for complex logic/data processing.
  - Supports both data-flow and control-flow architectures out of the box.
- **Cons:** 
  - Much steeper learning curve. Its modularity means you have to assemble many plugins just to get a basic UI working, which is overkill for simple Scene A -> Scene B routing.

---

## 🏆 The Decision: React Flow (@xyflow/react)

Given that our UI layer is entirely built in React 19, **React Flow** is the absolute best choice. It allows us to leverage our existing React components. For example, a "Dialogue Node" in the editor can actually mount our `<DialogueBox />` component, meaning what the developer sees in the editor is exactly what the player sees in the game.

---

## Architectural Blueprint

We will build the **ArtLife Content Management Studio (CMS)**.

### 1. Node Types
We will define specific, highly styled React components mapped to our game engine:
- `TriggerNode`: The entry point (e.g., "Player enters Gallery"). Defines the spatial/temporal conditions.
- `DialogueNode`: Contains fields for Speaker Name, Text, and Tone. Outputs multiple handles (ports) for player response branches.
- `StatConditionNode`: A logic gate. E.g., "If Taste > 60 go out the True port, else go out the False port."
- `RewardNode`: Grants an Item, Cash, or Anti-Resource.
- `SceneLaunchNode`: Fires an event that mounts a specific Phaser scene (e.g., `Launch: HaggleScene(artist_id)`).

### 2. State & Storage
The React Flow instance will be managed by a new Zustand store (`useEditorStore`). When the developer clicks **[ Export Flow ]**, the graphed nodes and edges are traversed, compiled into a minimized JSON structure, and downloaded (or eventually posted to a backend). Our `EventRegistry.js` will be updated to read this graphical JSON schema.

### 3. The Backend (Future)
Since Vite runs in a local node environment, we can write a simple Express or Vite plugin that intercepts the **[ Save ]** command from the Editor and overwrites the physical `public/content/events.json` file on disk, eliminating the need to manually copy-paste JSON strings.

---

## Implementation Roadmap (Phase 7: The CMS)

**Sprint 7A: React Flow Integration**
- `npm install @xyflow/react`
- Create `/editor` route in `App.jsx`, strictly gated to `import.meta.env.DEV`.
- Implement a basic canvas with panning, zooming, and a library sidebar.

**Sprint 7B: Custom Node Creation**
- Build the specific React functional components for `DialogueNode`, `ConditionNode`, and `SceneNode`.
- Style them to match the Pantone Blue / Terminal aesthetic.

**Sprint 7C: Serialization & Engine Bridge**
- Write the compiler algorithm that traverses the `react-flow` Edges, converting graphical connections into nested `{ nextNodeId: "xyz" }` JSON structures.
- Update the ArtLife `StateMachine` / `SceneEngine` to ingest this new graph-based JSON syntax instead of the legacy `dialogue_trees.json` format.

---

## Technical Implementation Blueprint

Based on the current architecture (`App.jsx` React router, `GameEventBus`, `Zustand` stores), here is the exact code mapping required for the CMS integration.

### 1. The Editor Router & Environment Fencing (`App.jsx`)
We will add a dedicated route for the editor, completely bypassing the Phaser canvas initialization so developers can work purely in React space.

```javascript
// game/src/App.jsx
import CMS from './editor/CMS.jsx';

export default function App() {
    const [activeView, setActiveView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        // NEW: Load Editor if ?editor=true AND we are in dev mode
        if (params.get('editor') === 'true' && import.meta.env.DEV) return 'CMS';
        return params.get('skipBoot') ? VIEW.PHASER : VIEW.BOOT;
    });

    // ... inside render:
    if (activeView === 'CMS') {
        return <CMS />;
    }
}
```

### 2. State Management (`stores/editorStore.js`)
We must create a new Zustand store to hold the literal Canvas State (the nodes and lines drawn by the dev) so it survives hot-reloads.

```javascript
// game/src/stores/editorStore.js
import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

export const useEditorStore = create((set, get) => ({
    nodes: [],
    edges: [],
    onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
    
    // The core compiler: translates visual nodes to ArtLife JSON
    exportGraph: () => {
        const { nodes, edges } = get();
        return compileReactFlowToArtLife(nodes, edges);
    }
}));
```

### 3. Custom Node Components (`editor/nodes/`)
React Flow allows passing arbitrary React components as nodes. We will wrap existing UI elements.

```javascript
// game/src/editor/nodes/DialogueNode.jsx
import { Handle, Position } from '@xyflow/react';
import DialogueBox from '../../ui/DialogueBox.jsx'; // Reuse existing UI

export function DialogueNode({ data }) {
    return (
        <div className="custom-node" style={{ width: 400 }}>
            {/* Input port from previous node */}
            <Handle type="target" position={Position.Top} />
            
            {/* Real WYSIWYG rendering */}
            <div style={{ backgroundColor: '#0a0a0f', padding: 10 }}>
                <input value={data.speaker} onChange={data.onSpeakerChange} />
                <textarea value={data.text} onChange={data.onTextChange} />
            </div>

            {/* Output ports mapping to player response choices */}
            {data.choices.map((choice, i) => (
                <div key={i}>
                    <span>{choice.text}</span>
                    <Handle type="source" position={Position.Bottom} id={`choice-${i}`} />
                </div>
            ))}
        </div>
    );
}
```

### 4. Engine Bridge (`engines/GraphEngine.js`)
Currently, `SceneEngine.js` uses the `inkjs` library to parse `.ink` compiled JSON. Writing a `.ink` compiler from a visual graph is notoriously complex.

Instead, we will write a streamlined `GraphEngine.js` that parses the exported JSON from our Editor directly.

```javascript
// game/src/engines/GraphEngine.js
export class GraphEngine {
    constructor(editorExportedJson) {
        this.nodes = editorExportedJson.nodes;
        this.currentNodeId = editorExportedJson.triggerNodeId;
    }

    continue() {
        const current = this.nodes[this.currentNodeId];
        
        // Handle stat mutations directly via Zustand
        if (current.type === 'statMutation') {
            useGameStore.getState().updateStat(current.stat, current.amount);
            this.currentNodeId = current.nextNode;
            return this.continue(); // Auto-advance past silent nodes
        }

        // Return UI payload for DialogueBox.jsx
        if (current.type === 'dialogue') {
            return {
                speaker: current.speaker,
                text: current.text,
                choices: current.choices.map(c => c.text)
            };
        }
    }

    choose(choiceIndex) {
        const current = this.nodes[this.currentNodeId];
        this.currentNodeId = current.choices[choiceIndex].nextNode;
        return this.continue();
    }
}
```

By decoupling from Ink and using our own minimalist Graph Engine, the Editor outputs a 1:1 mapping of exactly what the React components execute, significantly reducing runtime complexity.
