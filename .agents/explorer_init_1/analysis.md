# ReactFlow Writing Engine: Codebase & Visual Styling Analysis

## 1. Codebase Architecture & Key File Locations

### 1.1 Canvas Setup & Configuration
- **File**: `C:\Users\hothe\.gemini\antigravity\scratch\writing-hub\src\App.tsx`
- **Key Components**:
  - `FlowCanvas` (Lines 77–387): Sets up the `<ReactFlow>` canvas container, binds custom `nodeTypes` and `edgeTypes`, manages dragging, node snapping/intersections, node duplication/deletion, and handles canvas overlays (`<CanvasSearch>`, `<ProjectManager>`, and the compiled markdown preview panel).
  - `<Background>` (Line 264): Configured as `<Background color="#2a2a35" variant={BackgroundVariant.Dots} gap={24} size={2} />` inside `<ReactFlow>`.
  - `App` (Lines 389–414): Wrapped in a `<ReactFlowProvider>` and triggers `loadInitialData()` from the store upon mounting.

### 1.2 Custom Nodes Implementation (`src/components/`)
All nodes are registered in the `nodeTypes` map (Lines 40–71 of `App.tsx`) and imported from `src/components/`.
- **`ThemeNode.tsx`** (Lines 1–215): The most critical custom node. Binds standard node types (`document`, `reference`) and legacy types (`book`, `chapter`, `scene`, `character`, `location`, `faction`, `event`, `item`, `directory`, `default`).
  - *Features*: Custom metadata theme colors, card flip structure with a 3D rotate scratchpad, SVG filters for dust degradation, and word-count progress logic (fill percentages).
- **`ItemNode.tsx`** (Lines 1–84): Used for item/artifact items with fields: Origin, current location, significance, and rules.
- **`LogicNode.tsx`** (Lines 1–110): Renders premises (P1, P2, etc.) and a conclusion in a vertical stack layout.
- **`HubNode.tsx`** (Lines 1–97): Features an octagonal shape via a CSS `clip-path` polygon. Provides a collapse/expand toggle button which collapses or expands all connected nodes.
- **`GroupNode.tsx`** (Lines 1–54): Used for grouping elements inside parent boundaries, featuring decorative border corner offsets (Art Deco corners).
- **`DeckNode.tsx`** (Lines 1–105): Implements a stacked deck layout allowing users to drag and drop nodes inside to organize them.
- **Other specialized nodes**: `RichTextEditor.tsx`, `SequenceNode.tsx`, `LoreNode.tsx`, `SnippetNode.tsx`, `MasterNode.tsx`, `PrintNode.tsx`, `InfoBoxNode.tsx`, `QuoteNode.tsx`, `StatNode.tsx`, `TaskNode.tsx`.

### 1.3 Stylesheets & Configurations
- **Tailwind CSS v4 Configuration**: Configured via `@tailwindcss/vite` in `vite.config.ts` (Line 9). Instead of a `tailwind.config.js` file, CSS variables are defined directly inside `src/App.css` using Tailwind v4 syntax.
- **Global Stylesheet**: `src/App.css` (Lines 1–107).
  - Defines the core CSS custom variables in `:root` (e.g. `--background`, `--foreground`, `--panel`, `--accent-purple`, `--accent-gold`).
  - Sets up core classes for themes: `.texture-leather`, `.texture-stone`, and `.edge-energy` animation.
- **Index Stylesheet**: `src/index.css` (Lines 1–4). Handles smooth ReactFlow node transition states.

---

## 2. Implementing the "Deadlock Matte Stone" Visual Style

The "Deadlock Matte Stone" theme calls for **Art Deco geometry** (double borders, geometric line patterns, gold/brass accents) combined with **heavy matte textures** (dark slate, basalt, slate stone).

### 2.1 CSS Variables Design
We can introduce new theme variables in `:root` in `src/App.css`:
```css
:root {
  /* Matte Stone Tones */
  --color-slate-matte: #181a1e;
  --color-basalt-matte: #0e0f12;
  --color-charcoal-matte: #121316;
  
  /* Metallic Accents */
  --color-deco-gold: #d4af37;
  --color-deco-gold-bright: #fbbf24;
  --color-deco-brass: #c5a059;
  --color-deco-bronze: #b45309;
}
```

### 2.2 Matte Stone Textures
Using the existing `/dark_stone.jpg` image from `/public`, we can define a heavy matte-stone texture style:
```css
.texture-matte-stone {
  background-image: url('/dark_stone.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  background-blend-mode: multiply;
  background-color: var(--color-slate-matte);
  box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.95);
  filter: contrast(1.1) brightness(0.7) saturate(0.8);
}
```

### 2.3 Art Deco Geometric Frames
To achieve the characteristic double-bordered, stepped geometric layout:
- **Stepped Inset Frame**:
  ```css
  .deco-border-frame {
    border: 2px solid var(--color-deco-gold);
    position: relative;
  }
  .deco-border-frame::before {
    content: '';
    position: absolute;
    top: 4px; left: 4px; right: 4px; bottom: 4px;
    border: 1px solid var(--color-deco-brass);
    opacity: 0.65;
    pointer-events: none;
  }
  ```
- **Stepped (Ziggurat) Corners**: Use CSS polygon `clip-path` on headers or borders:
  ```css
  .deco-ziggurat-header {
    clip-path: polygon(0 0, 12px 0, 12px 12px, calc(100% - 12px) 12px, calc(100% - 12px) 0, 100% 0, 100% 100%, 0 100%);
  }
  ```
- **Symmetric Chevron or Diamond Accents**: Embed geometric decorative badges on node headers, similar to the existing `HubNode` polygon shapes.

---

## 3. Implementing the Deep-Space/Galaxy Canvas Background

To replace the basic dots background with an immersive deep space/galaxy environment, we should structure a layered background.

### 3.1 Cosmic Background Wrapper
In `src/App.css`, replace or overlay `.react-flow__bg` with radial gradients representing colored nebulae:
```css
.react-flow-cosmic-canvas {
  background: 
    radial-gradient(circle at 20% 30%, rgba(76, 29, 149, 0.15) 0%, transparent 40%),  /* Purple nebula */
    radial-gradient(circle at 80% 70%, rgba(6, 78, 59, 0.12) 0%, transparent 45%),   /* Emerald nebula */
    radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.08) 0%, transparent 50%),  /* Rose nebula */
    linear-gradient(135deg, #030408 0%, #080512 50%, #010103 100%);                  /* Outer space void */
}
```

### 3.2 Dynamic Starfields (CSS Box-Shadow Layer)
We can add a performance-efficient star layer using `box-shadow` on a 1x1 pixel element behind ReactFlow:
```css
.cosmic-stars-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background: transparent;
}
.cosmic-stars-overlay::after {
  content: '';
  position: absolute;
  width: 1px;
  height: 1px;
  background: transparent;
  box-shadow: 
    120px 240px #fff, 350px 720px rgba(255,255,255,0.7), 840px 480px #fff,
    1420px 890px rgba(255,255,255,0.4), 1600px 150px #fff, 480px 1150px rgba(255,255,255,0.8),
    950px 1450px #fff, 1350px 250px rgba(255,255,255,0.6);
  opacity: 0.6;
}
```

### 3.3 Subtle Grid Coordinates
Inside `App.tsx` (Line 264), alter the standard Dots background to a lines/cross pattern with ultra-low opacity:
```typescript
<Background color="rgba(255, 255, 255, 0.02)" variant={BackgroundVariant.Lines} gap={60} />
```

---

## 4. Glowing Edges and Micro-Interactions

### 4.1 Custom Elastic Edge Glowing Paths (`ElasticEdge.tsx`)
In `src/components/ElasticEdge.tsx` (Lines 69–90), the edge is styled using SVG parameters. We can apply custom filters and properties to the `BaseEdge` component:
- **Glow Filter**: Define a SVG `<filter>` in `App.tsx` or directly inline inside `ElasticEdge.tsx` to generate an SVG-native glow:
  ```xml
  <filter id="edge-glow">
    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  ```
- **Applying in ElasticEdge**:
  Apply this filter directly via inline styles or class:
  ```typescript
  style={{
    ...style,
    stroke: `rgb(${r}, ${g}, ${b})`,
    strokeWidth,
    filter: 'url(#edge-glow)',
  }}
  ```

### 4.2 Interactive Micro-Interactions (CSS States)
Using CSS, we can inject rich visual responses for mouse states on edges without incurring React re-render costs:
- **Hover Action**: Focuses and brightens the edge path.
  ```css
  .react-flow__edge:hover .react-flow__edge-path {
    stroke-width: 4px !important;
    stroke: var(--color-deco-gold-bright) !important;
    filter: drop-shadow(0 0 8px var(--color-deco-gold-bright)) !important;
  }
  ```
- **Selected Action**: Animate marching ants along the edge.
  ```css
  .react-flow__edge.selected .react-flow__edge-path {
    stroke-width: 3.5px !important;
    stroke: var(--color-deco-gold) !important;
    stroke-dasharray: 8 4 !important;
    animation: energy-flow 0.3s linear infinite !important;
    filter: drop-shadow(0 0 10px var(--color-deco-gold)) !important;
  }
  ```
- **Connecting Line Interaction**: Customizes the line displayed during drag connection. In `App.tsx` `<ReactFlow>`:
  ```typescript
  connectionLineStyle={{
    stroke: '#fbbf24',
    strokeWidth: 3,
    strokeDasharray: '4 4',
    filter: 'drop-shadow(0 0 8px #fbbf24)'
  }}
  ```
