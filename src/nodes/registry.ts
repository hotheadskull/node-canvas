// ============================================================================
// NODE REGISTRY -- the single source of truth for every node type.
//
// To add a new node type:
//   1. Add an entry here (labels, descriptions, tier, accent, size).
//   2. Map its `type` to a component in App.tsx's nodeTypes.
// The create menu, spawn sizes, and palette badges all read from this file.
//
// NEVER rename an existing `type` string: they are stored in users' databases
// and referenced by the demo/tutorial project (src/store/demoData.ts).
// ============================================================================

export type CanvasMode = 'novel' | 'sermon' | 'universal';
export type NodeTier = 'writing' | 'knowledge' | 'structure';

export type NodeDef = {
  /** Canonical type string -- stored in the DB, never rename */
  type: string;
  tier: NodeTier;
  /** Accent color used by menu entries and anywhere the type needs a color */
  accent: string;
  /** Display name per canvas mode */
  labels: Record<CanvasMode, string>;
  /** One-line purpose statement per canvas mode */
  descriptions: Record<CanvasMode, string>;
  /** Spawn size; omit for self-sizing nodes (e.g. alias pills) */
  size?: { width: number; height: number };
  zIndex?: number;
  /** Show in the + Add Node menu (legacy types stay registered but hidden) */
  inMenu: boolean;
};

export const NODE_DEFS: NodeDef[] = [
  // ---------- Tier 1: Writing surfaces ----------
  {
    // NOTE: the tutorial (TutorialOverlay step 4) tells users to click
    // "Main Concept" -- keep the universal label in sync with it
    type: 'master', tier: 'writing', accent: '#fbbf24', inMenu: true,
    labels: { novel: 'Core Premise', sermon: 'Big Idea', universal: 'Main Concept' },
    descriptions: {
      novel: 'The one-sentence premise everything else builds from',
      sermon: 'The one sentence every point should serve — good Anchor candidate',
      universal: 'The overarching idea connecting your project',
    },
    size: { width: 420, height: 320 },
  },
  {
    type: 'document', tier: 'writing', accent: '#a78bfa', inMenu: true,
    labels: { novel: 'Chapter', sermon: 'Sermon Manuscript', universal: 'Document' },
    descriptions: {
      novel: 'Main writing canvas with the full editor',
      sermon: 'Main writing canvas with the full editor',
      universal: 'Main writing canvas with the full editor',
    },
    size: { width: 500, height: 400 },
  },
  {
    type: 'scene', tier: 'writing', accent: '#ec4899', inMenu: true,
    labels: { novel: 'Scene', sermon: 'Sermon Point', universal: 'Section' },
    descriptions: {
      novel: 'A single story beat, written out',
      sermon: 'One point of the message, written out',
      universal: 'A single section of the larger piece',
    },
    size: { width: 400, height: 320 },
  },

  // ---------- Tier 2: Knowledge cards ----------
  {
    // NOTE: tutorial step 13 tells users to click "Person / Entity"
    type: 'character', tier: 'knowledge', accent: '#3b82f6', inMenu: true,
    labels: { novel: 'Character', sermon: 'Biblical Figure', universal: 'Person / Entity' },
    descriptions: {
      novel: 'Who they are; aliases feed the spiderweb auto-linker',
      sermon: 'People and their context; aliases feed the spiderweb',
      universal: 'People and organizations',
    },
    size: { width: 340, height: 300 },
  },
  {
    type: 'location', tier: 'knowledge', accent: '#10b981', inMenu: true,
    labels: { novel: 'Location', sermon: 'Setting / Context', universal: 'Place' },
    descriptions: {
      novel: 'Places and settings the story moves through',
      sermon: 'Places and historical context behind the text',
      universal: 'A place that matters to the work',
    },
    size: { width: 340, height: 280 },
  },
  {
    type: 'lore', tier: 'knowledge', accent: '#14b8a6', inMenu: true,
    labels: { novel: 'Lore Entry', sermon: 'Theological Concept', universal: 'Concept' },
    descriptions: {
      novel: 'Deep dives into how your world works',
      sermon: 'Exegesis and deep dives',
      universal: 'Deep dives into topics',
    },
    size: { width: 340, height: 280 },
  },
  {
    type: 'item', tier: 'knowledge', accent: '#f59e0b', inMenu: true,
    labels: { novel: 'Item / Relic', sermon: 'Object Lesson', universal: 'Object' },
    descriptions: {
      novel: 'Important objects, artifacts, and what they mean',
      sermon: 'Parables and physical illustrations',
      universal: 'A meaningful object worth tracking',
    },
    size: { width: 320, height: 260 },
  },
  {
    type: 'quote', tier: 'knowledge', accent: '#facc15', inMenu: true,
    labels: { novel: 'Quote', sermon: 'Scripture / Quote', universal: 'Quote' },
    descriptions: {
      novel: 'Key lines, foreshadows, and their sources',
      sermon: 'Key verses and quoted sources',
      universal: 'Words worth keeping, with their source',
    },
    size: { width: 340, height: 240 },
  },
  {
    type: 'reference', tier: 'knowledge', accent: '#94a3b8', inMenu: true,
    labels: { novel: 'Quick Note', sermon: 'Talking Point', universal: 'Quick Note' },
    descriptions: {
      novel: 'A stray thought, not yet developed',
      sermon: 'A quick application point or aside — not yet fleshed out',
      universal: 'A stray thought, not yet developed',
    },
    size: { width: 300, height: 220 },
  },

  // ---------- Tier 3: Structure & flow ----------
  {
    type: 'hub', tier: 'structure', accent: '#a855f7', inMenu: true,
    labels: { novel: 'Plot Nexus', sermon: 'Concept Hub', universal: 'Hub' },
    descriptions: {
      novel: 'Wire nodes to it, then collapse them into orbit',
      sermon: 'Wire nodes to it, then collapse them into orbit',
      universal: 'Wire nodes to it, then collapse them into orbit',
    },
    size: { width: 120, height: 120 },
  },
  {
    type: 'sequence', tier: 'structure', accent: '#a855f7', inMenu: true,
    labels: { novel: 'Timeline Track', sermon: 'Sermon Flow', universal: 'Sequence' },
    descriptions: {
      novel: 'Plan story beats chronologically',
      sermon: 'Plan the points of the message in order',
      universal: 'Put things in an order that matters',
    },
    size: { width: 520, height: 220 },
  },
  {
    type: 'logic', tier: 'structure', accent: '#3b82f6', inMenu: true,
    labels: { novel: 'Logic Chain', sermon: 'Argument Map', universal: 'Logic Chain' },
    descriptions: {
      novel: 'Map causality: because X, therefore Y',
      sermon: 'Map premises to conclusions',
      universal: 'Map premises to conclusions',
    },
    size: { width: 320, height: 240 },
  },
  {
    type: 'crucible', tier: 'structure', accent: '#ef4444', inMenu: true,
    labels: { novel: 'Crucible Node', sermon: 'Doctrinal Tension', universal: 'Tension / Conflict' },
    descriptions: {
      novel: 'Combine characters & locations for conflict',
      sermon: 'Hold two truths together, unresolved',
      universal: 'Hold two ideas together for resolution',
    },
    size: { width: 340, height: 300 },
  },
  {
    type: 'alias', tier: 'structure', accent: '#f0c050', inMenu: true,
    labels: { novel: 'Quick-Link Pin', sermon: 'Quick-Link Pin', universal: 'Quick-Link Pin' },
    descriptions: {
      novel: 'A floating quick-link that bridges to a real node',
      sermon: 'A floating quick-link that bridges to a real node',
      universal: 'A floating quick-link that bridges to a real node',
    },
    zIndex: 2,
  },
  {
    type: 'task', tier: 'structure', accent: '#fb923c', inMenu: true,
    labels: { novel: 'Progress Checklist', sermon: 'Progress Checklist', universal: 'Progress Checklist' },
    descriptions: {
      novel: 'Check things off; the bar tracks completion',
      sermon: 'Check things off; the bar tracks completion',
      universal: 'Check things off; the bar tracks completion',
    },
    size: { width: 280, height: 260 },
  },
  {
    type: 'group', tier: 'structure', accent: '#a855f7', inMenu: true,
    labels: { novel: 'Group Zone', sermon: 'Group Zone', universal: 'Group Zone' },
    descriptions: {
      novel: 'A visual container -- drop nodes inside to nest them',
      sermon: 'A visual container -- drop nodes inside to nest them',
      universal: 'A visual container -- drop nodes inside to nest them',
    },
    size: { width: 400, height: 400 },
    zIndex: -1,
  },
  {
    type: 'deck', tier: 'structure', accent: '#f43f5e', inMenu: true,
    labels: { novel: 'The Deck', sermon: 'The Deck', universal: 'The Deck' },
    descriptions: {
      novel: 'Drop idea nodes onto it to stack them as cards',
      sermon: 'Drop idea nodes onto it to stack them as cards',
      universal: 'Drop idea nodes onto it to stack them as cards',
    },
    size: { width: 260, height: 320 },
  },
  {
    type: 'print', tier: 'structure', accent: '#6366f1', inMenu: true,
    labels: { novel: 'Compile & Export', sermon: 'Compile & Export', universal: 'Compile & Export' },
    descriptions: {
      novel: 'Connect writing nodes in order, compile the manuscript',
      sermon: 'Connect points in order, compile the manuscript',
      universal: 'Connect nodes in order, compile and export',
    },
    size: { width: 320, height: 280 },
  },

  // ---------- Legacy types: registered so old canvases load, hidden from menu ----------
  {
    type: 'book', tier: 'writing', accent: '#f59e0b', inMenu: false,
    labels: { novel: 'Book', sermon: 'Series', universal: 'Book' },
    descriptions: { novel: 'Legacy writing node', sermon: 'Legacy writing node', universal: 'Legacy writing node' },
    size: { width: 500, height: 400 },
  },
  {
    type: 'chapter', tier: 'writing', accent: '#3b82f6', inMenu: false,
    labels: { novel: 'Chapter', sermon: 'Manuscript', universal: 'Chapter' },
    descriptions: { novel: 'Legacy writing node', sermon: 'Legacy writing node', universal: 'Legacy writing node' },
    size: { width: 500, height: 400 },
  },
  {
    type: 'story', tier: 'writing', accent: '#8b5cf6', inMenu: false,
    labels: { novel: 'Story', sermon: 'Message', universal: 'Story' },
    descriptions: { novel: 'Legacy writing node', sermon: 'Legacy writing node', universal: 'Legacy writing node' },
    size: { width: 480, height: 380 },
  },
  {
    type: 'faction', tier: 'knowledge', accent: '#ef4444', inMenu: false,
    labels: { novel: 'Faction', sermon: 'Group', universal: 'Group of People' },
    descriptions: { novel: 'Legacy knowledge card', sermon: 'Legacy knowledge card', universal: 'Legacy knowledge card' },
    size: { width: 340, height: 280 },
  },
  {
    type: 'event', tier: 'knowledge', accent: '#6366f1', inMenu: false,
    labels: { novel: 'Event', sermon: 'Moment', universal: 'Event' },
    descriptions: { novel: 'Legacy knowledge card', sermon: 'Legacy knowledge card', universal: 'Legacy knowledge card' },
    size: { width: 340, height: 280 },
  },
  {
    type: 'snippet', tier: 'knowledge', accent: '#94a3b8', inMenu: false,
    labels: { novel: 'Idea', sermon: 'Talking Point', universal: 'Note' },
    descriptions: { novel: 'Legacy knowledge card', sermon: 'Legacy knowledge card', universal: 'Legacy knowledge card' },
    size: { width: 300, height: 220 },
  },
  {
    type: 'idea', tier: 'knowledge', accent: '#94a3b8', inMenu: false,
    labels: { novel: 'Idea', sermon: 'Talking Point', universal: 'Note' },
    descriptions: { novel: 'Legacy knowledge card', sermon: 'Legacy knowledge card', universal: 'Legacy knowledge card' },
    size: { width: 300, height: 220 },
  },
  {
    type: 'citation', tier: 'knowledge', accent: '#f59e0b', inMenu: false,
    labels: { novel: 'Citation', sermon: 'Citation', universal: 'Citation' },
    descriptions: { novel: 'Legacy knowledge card', sermon: 'Legacy knowledge card', universal: 'Legacy knowledge card' },
    size: { width: 300, height: 220 },
  },
  {
    type: 'stat', tier: 'structure', accent: '#22d3ee', inMenu: false,
    labels: { novel: 'Stat Sheet', sermon: 'Profile', universal: 'Stat Sheet' },
    descriptions: { novel: 'Legacy dossier node', sermon: 'Legacy dossier node', universal: 'Legacy dossier node' },
    size: { width: 320, height: 280 },
  },
  {
    type: 'directory', tier: 'structure', accent: '#e879f9', inMenu: false,
    labels: { novel: 'Directory', sermon: 'Directory', universal: 'Directory' },
    descriptions: { novel: 'Legacy container node', sermon: 'Legacy container node', universal: 'Legacy container node' },
    size: { width: 400, height: 300 },
  },
];

export const NODE_REGISTRY: Record<string, NodeDef> = Object.fromEntries(
  NODE_DEFS.map(d => [d.type, d])
);

export const TIER_TITLES: Record<NodeTier, string> = {
  writing: 'Writing Surfaces',
  knowledge: 'Knowledge Cards',
  structure: 'Structure & Flow',
};

export function menuNodesForTier(tier: NodeTier): NodeDef[] {
  return NODE_DEFS.filter(d => d.inMenu && d.tier === tier);
}

export function nodeLabel(type: string, mode: CanvasMode): string {
  return NODE_REGISTRY[type]?.labels[mode] ?? type;
}

export function nodeSpawnConfig(type: string): { width?: number; height?: number; zIndex: number } {
  const def = NODE_REGISTRY[type];
  return {
    width: def?.size?.width,
    height: def?.size?.height,
    zIndex: def?.zIndex ?? 1,
  };
}
