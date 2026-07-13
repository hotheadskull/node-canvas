// ============================================================================
// NODE REGISTRY -- the single source of truth for every node type (I8).
//
// Adding a node type = an entry here + a renderer in app/. If a new type ever
// needs core graph logic edited, the abstraction is broken -- stop and fix it.
//
// NEVER rename an existing `type` string: they are stored in users' documents.
//
// Two taxonomy mechanisms work together (docs/BRIEF.md revision log #7):
// - Per-mode LABELS on core nodes: the same node wears sphere-appropriate
//   names (Section = Scene / Sermon point / Body paragraph).
// - Pack node TYPES only when ports genuinely differ ("earn its place").
// Packs never gate availability (I11): every type is always reachable.
// ============================================================================

export type CanvasMode = 'universal' | 'novel' | 'sermon';

export type NodeCategory = 'writing' | 'knowledge' | 'structure';

/**
 * How a node owns its size (policy carried from /legacy):
 * - 'auto-height': width fixed so prose wraps, height grows with content.
 * - 'auto': fully self-sizing.
 * - 'fixed': the user sizes it deliberately (spatial containers).
 */
export type NodeSizing = 'auto-height' | 'auto' | 'fixed';

/** Port declaration skeleton -- behavior lands in Chunk 3 (ports & wires). */
export type PortDef = {
  id: string;
  direction: 'give' | 'take';
  dataKind: string;
  label: string;
  defaultVisible: boolean;
};

export type NodeTypeDef = {
  /** Canonical type string -- stored in user documents, never rename. */
  type: string;
  category: NodeCategory;
  /** Pack that ships this type; undefined = Universal Core. */
  pack?: string;
  /** Shown in the compact "Core" menu view (the first-touch eight). */
  coreMenu: boolean;
  /** Accent color used by menu miniatures and node chrome. */
  accent: string;
  /** Display name per canvas mode. */
  labels: Record<CanvasMode, string>;
  /** One-line purpose statement shown in the menu preview panel. */
  descriptions: Record<CanvasMode, string>;
  /** Spawn size; omit for fully self-sizing types. */
  size?: { width: number; height: number };
  sizing: NodeSizing;
  /** Give/take declarations. Empty until Chunk 3. */
  ports: readonly PortDef[];
};

const same = (text: string): Record<CanvasMode, string> => ({
  universal: text,
  novel: text,
  sermon: text,
});

export const NODE_TYPE_DEFS: readonly NodeTypeDef[] = [
  // ---------- Universal Core: writing set ----------
  {
    type: 'title',
    category: 'writing',
    coreMenu: true,
    accent: '#fbbf24',
    labels: { universal: 'Title', novel: 'Core Premise', sermon: 'Big Idea' },
    descriptions: {
      universal: 'The idea everything else should trace back to',
      novel: 'The one-sentence premise everything builds from',
      sermon: 'The one sentence every point should serve',
    },
    size: { width: 420, height: 320 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'note',
    category: 'writing',
    coreMenu: true,
    accent: '#94a3b8',
    labels: same('Note'),
    descriptions: {
      universal: 'Capture anything, decide what it is later',
      novel: 'A stray thought, not yet developed',
      sermon: 'A quick point or aside, not yet fleshed out',
    },
    size: { width: 300, height: 220 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'document',
    category: 'writing',
    coreMenu: true,
    accent: '#a78bfa',
    labels: { universal: 'Document', novel: 'Chapter', sermon: 'Sermon Manuscript' },
    descriptions: {
      universal: 'The long writing surface sections compile into',
      novel: 'Main writing canvas with the full editor',
      sermon: 'Main writing canvas with the full editor',
    },
    size: { width: 500, height: 400 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'section',
    category: 'writing',
    coreMenu: true,
    accent: '#ec4899',
    labels: { universal: 'Section', novel: 'Scene', sermon: 'Sermon Point' },
    descriptions: {
      universal: 'A piece of writing that compiles upward into a Document',
      novel: 'A single story beat, written out',
      sermon: 'One point of the message, written out',
    },
    size: { width: 400, height: 320 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'question',
    category: 'writing',
    coreMenu: true,
    accent: '#ef9f27',
    labels: same('Question'),
    descriptions: {
      universal: 'Open questions glow until answered',
      novel: 'An unresolved story question; glows until answered',
      sermon: 'An unresolved question of the text; glows until answered',
    },
    size: { width: 320, height: 220 },
    sizing: 'auto-height',
    ports: [],
  },

  // ---------- Universal Core: knowledge set ----------
  {
    type: 'person',
    category: 'knowledge',
    coreMenu: true,
    accent: '#3b82f6',
    labels: { universal: 'Person', novel: 'Character', sermon: 'Biblical Figure' },
    descriptions: {
      universal: 'People and organizations; rename propagates everywhere',
      novel: 'Who they are; aliases feed auto-linking',
      sermon: 'People and their context',
    },
    size: { width: 340, height: 300 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'place',
    category: 'knowledge',
    coreMenu: true,
    accent: '#10b981',
    labels: { universal: 'Place', novel: 'Location', sermon: 'Setting / Context' },
    descriptions: {
      universal: 'A place that matters to the work; places can nest',
      novel: 'Places and settings the story moves through',
      sermon: 'Places and historical context behind the text',
    },
    size: { width: 340, height: 280 },
    sizing: 'auto-height',
    ports: [],
  },
  {
    type: 'thing',
    category: 'knowledge',
    coreMenu: true,
    accent: '#f59e0b',
    labels: { universal: 'Thing', novel: 'Item / Relic', sermon: 'Object Lesson' },
    descriptions: {
      universal: 'A meaningful object worth tracking',
      novel: 'Important objects, artifacts, and what they mean',
      sermon: 'Parables and physical illustrations',
    },
    size: { width: 320, height: 260 },
    sizing: 'auto-height',
    ports: [],
  },
];

export const NODE_REGISTRY: Readonly<Record<string, NodeTypeDef>> = Object.fromEntries(
  NODE_TYPE_DEFS.map((def) => [def.type, def]),
);

export function isRegisteredType(type: string): boolean {
  return type in NODE_REGISTRY;
}

export function getNodeDef(type: string): NodeTypeDef | undefined {
  return NODE_REGISTRY[type];
}

export function nodeLabel(type: string, mode: CanvasMode): string {
  return NODE_REGISTRY[type]?.labels[mode] ?? type;
}

/** The compact first-touch menu (gallery "Core" view). */
export function coreMenuTypes(): NodeTypeDef[] {
  return NODE_TYPE_DEFS.filter((def) => def.coreMenu);
}

/** Every type, grouped for the scrollable "All" view. Packs never gate (I11). */
export function allMenuTypes(): { category: NodeCategory | string; types: NodeTypeDef[] }[] {
  const groups = new Map<string, NodeTypeDef[]>();
  for (const def of NODE_TYPE_DEFS) {
    const key = def.pack ?? def.category;
    const list = groups.get(key) ?? [];
    list.push(def);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([category, types]) => ({ category, types }));
}
