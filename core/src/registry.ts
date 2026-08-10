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

/**
 * The eleven data kinds -- a CLOSED union, because the visual system hangs
 * everything on it (colors.ts: a wire is the colour of what travels down
 * it). A pack adding a kind adds it here AND in DATA_KIND_STYLES, or the
 * compiler refuses.
 */
export type DataKind =
  | 'text'
  | 'person'
  | 'place'
  | 'thing'
  | 'cite'
  | 'claim'
  | 'prop'
  | 'plant'
  | 'event'
  | 'thread'
  | 'any';

/**
 * Port declaration. Gives always feed any number of intakes; takes declare
 * their own capacity. dataKind must match exactly for a wire to be valid
 * ('any' takes accept anything and keep the source's colour).
 */
export type PortDef = {
  id: string;
  direction: 'give' | 'take';
  dataKind: DataKind;
  label: string;
  /** Rendered as a handle by default; hidden ports live in the inspector. */
  defaultVisible: boolean;
  /** Takes only: how many live wires the intake accepts. */
  capacity?: 'one' | 'many';
  /**
   * Takes only: this intake is the node's compile spine -- wired text
   * concatenates through it in wire order (reorder wires, reorder the work).
   */
  spine?: boolean;
  /**
   * Gives only: the node flags itself while this give feeds nothing live
   * (a Plant with no Payoff is the point of the mechanic -- orphans flag
   * themselves). Spawning such a node IS the opt-in (I2).
   */
  flagWhenUnconsumed?: boolean;
  /**
   * Takes only: the node flags itself when this intake is empty (e.g. a
   * chapter serving no thread). Hygiene flags only fire for nodes already
   * participating in wiring -- port-free canvases never see them (I2).
   */
  flagWhenEmpty?: boolean;
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

const UNIVERSAL_CORE: readonly NodeTypeDef[] = [
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
    ports: [
      { id: 'thread-out', direction: 'give', dataKind: 'thread', label: 'Thread', defaultVisible: true },
      { id: 'subject-in', direction: 'take', dataKind: 'text', label: 'Subject', defaultVisible: false, capacity: 'one' },
      { id: 'complement-in', direction: 'take', dataKind: 'text', label: 'Complement', defaultVisible: false, capacity: 'one' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'text-out', direction: 'give', dataKind: 'text', label: 'Text', defaultVisible: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'sections-in', direction: 'take', dataKind: 'text', label: 'Sections', defaultVisible: true, capacity: 'many', spine: true },
      { id: 'compiled-out', direction: 'give', dataKind: 'text', label: 'Compiled text', defaultVisible: true },
      { id: 'thread-in', direction: 'take', dataKind: 'thread', label: 'Thread', defaultVisible: false, capacity: 'one', flagWhenEmpty: true },
      { id: 'footnotes-in', direction: 'take', dataKind: 'cite', label: 'Footnotes', defaultVisible: false, capacity: 'many' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
  {
    // The spine's top level (Manuscript -> Document -> Section). Registered
    // now so the type name, ports, and menu spot are reserved; its real
    // editor and compile face land in Chunk 9. Split (Chunk 6) runs the
    // spine in reverse: manuscript -> document stubs -> section stubs.
    type: 'manuscript',
    category: 'writing',
    coreMenu: false,
    accent: '#7c3aed',
    labels: { universal: 'Manuscript', novel: 'Manuscript', sermon: 'Sermon Series' },
    descriptions: {
      universal: 'The whole work; documents compile into it in wire order',
      novel: 'The full book; chapters compile into it in wire order',
      sermon: 'A series; sermons compile into it in order',
    },
    size: { width: 560, height: 440 },
    sizing: 'auto-height',
    ports: [
      { id: 'documents-in', direction: 'take', dataKind: 'text', label: 'Documents', defaultVisible: true, capacity: 'many', spine: true },
      { id: 'compiled-out', direction: 'give', dataKind: 'text', label: 'Compiled work', defaultVisible: true },
      { id: 'thread-in', direction: 'take', dataKind: 'thread', label: 'Thread', defaultVisible: false, capacity: 'one', flagWhenEmpty: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'text-out', direction: 'give', dataKind: 'text', label: 'Text', defaultVisible: true },
      { id: 'people-in', direction: 'take', dataKind: 'person', label: 'People', defaultVisible: true, capacity: 'many' },
      { id: 'place-in', direction: 'take', dataKind: 'place', label: 'Setting', defaultVisible: true, capacity: 'one' },
      { id: 'pov-in', direction: 'take', dataKind: 'person', label: 'POV', defaultVisible: false, capacity: 'one' },
      { id: 'serves-in', direction: 'take', dataKind: 'thread', label: 'Serves', defaultVisible: false, capacity: 'one' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'answer-in', direction: 'take', dataKind: 'text', label: 'Answer', defaultVisible: true, capacity: 'one' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'identity-out', direction: 'give', dataKind: 'person', label: 'Identity', defaultVisible: true },
      { id: 'bond-in', direction: 'take', dataKind: 'person', label: 'Bond', defaultVisible: true, capacity: 'many' },
      { id: 'possession-in', direction: 'take', dataKind: 'thing', label: 'Possession', defaultVisible: false, capacity: 'many' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'identity-out', direction: 'give', dataKind: 'place', label: 'Identity', defaultVisible: true },
      { id: 'contains-in', direction: 'take', dataKind: 'place', label: 'Contains', defaultVisible: false, capacity: 'many' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
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
    ports: [
      { id: 'identity-out', direction: 'give', dataKind: 'thing', label: 'Identity', defaultVisible: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },

  // ---------- Universal Core: structure set ----------
  {
    // The second container verb (pt2 handoff §7): a Group CONTAINS -- its
    // members leave the canvas; a Hub COLLECTS -- members stay where they
    // are and the hub only lists them, grouped by kind. Wire a node into
    // Subject and the hub speaks for it.
    type: 'hub',
    category: 'structure',
    coreMenu: false,
    accent: '#8e94c2',
    labels: same('Hub'),
    descriptions: {
      universal: 'Collects nodes that stay on the canvas; the roster lists them by kind',
      novel: 'A cast sheet, location index, or any roster of living nodes',
      sermon: 'A study shelf: sources, notes and figures collected in one place',
    },
    size: { width: 300, height: 260 },
    sizing: 'auto-height',
    ports: [
      { id: 'holds-in', direction: 'take', dataKind: 'any', label: 'Holds', defaultVisible: true, capacity: 'many', spine: true },
      { id: 'brief-out', direction: 'give', dataKind: 'text', label: 'Brief', defaultVisible: true },
      { id: 'subject-in', direction: 'take', dataKind: 'any', label: 'Subject', defaultVisible: true, capacity: 'one' },
    ],
  },
];

const ACADEMIC_PACK: readonly NodeTypeDef[] = [
  {
    // Earns its place: page-anchored quotes flow OUT as citations; footnote
    // and supports intakes consume them (never just a renamed Note).
    type: 'source',
    category: 'knowledge',
    pack: 'academic',
    coreMenu: false,
    accent: '#14b8a6',
    labels: { universal: 'Source', novel: 'Reference', sermon: 'Commentary / Source' },
    descriptions: {
      universal: 'Something you read; its citation flows into footnotes and claims',
      novel: 'Research behind the story; cite it where it shaped a scene',
      sermon: 'A commentary or work you lean on; cite it where it serves',
    },
    size: { width: 340, height: 260 },
    sizing: 'auto-height',
    ports: [
      { id: 'citation-out', direction: 'give', dataKind: 'cite', label: 'Citation', defaultVisible: true },
      { id: 'clip-out', direction: 'give', dataKind: 'text', label: 'Clip', defaultVisible: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
  {
    type: 'claim',
    category: 'writing',
    pack: 'academic',
    coreMenu: false,
    accent: '#f43f5e',
    labels: { universal: 'Claim', novel: 'Claim', sermon: 'Point / Proposition' },
    descriptions: {
      universal: 'Flags itself while its Supports intake is empty',
      novel: 'An assertion your world or plot depends on',
      sermon: 'A point that must be supported to stand',
    },
    size: { width: 360, height: 240 },
    sizing: 'auto-height',
    ports: [
      { id: 'claim-out', direction: 'give', dataKind: 'claim', label: 'Claim', defaultVisible: true },
      { id: 'supports-in', direction: 'take', dataKind: 'any', label: 'Supports', defaultVisible: true, capacity: 'many', spine: true, flagWhenEmpty: true },
      { id: 'rebuts-in', direction: 'take', dataKind: 'any', label: 'Rebuts', defaultVisible: false, capacity: 'many' },
      { id: 'warrant-in', direction: 'take', dataKind: 'text', label: 'Warrant', defaultVisible: false, capacity: 'one' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
];

const SERMON_PACK: readonly NodeTypeDef[] = [
  {
    // Earns its place: the studied text is a real source of structure -- it
    // splits into propositions and its props intake collects them back in
    // reading order (spine: the phrasing text compiles through it).
    type: 'passage',
    category: 'writing',
    pack: 'sermon',
    coreMenu: false,
    accent: '#2dd4bf',
    labels: same('Passage'),
    descriptions: {
      universal: 'A text under study; split it into propositions and arc how they relate',
      novel: 'A source text under study; break it into the assertions it makes',
      sermon: 'The scripture under study; split it into propositions, then arc them',
    },
    size: { width: 420, height: 300 },
    sizing: 'auto-height',
    ports: [
      { id: 'text-out', direction: 'give', dataKind: 'text', label: 'Text', defaultVisible: true },
      { id: 'props-in', direction: 'take', dataKind: 'prop', label: 'Propositions', defaultVisible: true, capacity: 'many', spine: true },
      { id: 'cite-in', direction: 'take', dataKind: 'cite', label: 'Cite', defaultVisible: false, capacity: 'one' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
  {
    // One assertion of a text. Arc wires (prop -> prop, carrying a `relation`
    // from ARC_RELATIONS) express how it serves another proposition; the Arc
    // group face and Arc room derive main points and phrasing from them.
    type: 'proposition',
    category: 'writing',
    pack: 'sermon',
    coreMenu: false,
    accent: '#34d399',
    labels: same('Proposition'),
    descriptions: {
      universal: 'One assertion of a text; arc it to other propositions with the 18 relationships',
      novel: 'A single claim a source text makes, small enough to argue with',
      sermon: 'One assertion of the passage; arcs show how it serves the main point',
    },
    size: { width: 320, height: 170 },
    sizing: 'auto-height',
    ports: [
      { id: 'prop-out', direction: 'give', dataKind: 'prop', label: 'Proposition', defaultVisible: true },
      { id: 'arc-in', direction: 'take', dataKind: 'prop', label: 'Arcs', defaultVisible: true, capacity: 'many' },
      { id: 'text-out', direction: 'give', dataKind: 'text', label: 'Text', defaultVisible: false },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
];

const NOVEL_PACK: readonly NodeTypeDef[] = [
  {
    // Earns its place: the plant/payoff pairing is REAL wiring -- an
    // unconsumed Plant flags itself (Chekhov's gun must fire).
    type: 'plant',
    category: 'writing',
    pack: 'novel',
    coreMenu: false,
    accent: '#84cc16',
    labels: { universal: 'Plant', novel: 'Plant', sermon: 'Setup' },
    descriptions: {
      universal: 'Something set up on purpose; flags itself until a Payoff resolves it',
      novel: "Chekhov's gun on the mantel; flags itself until it fires",
      sermon: 'A tension planted early in the message; flags itself until resolved',
    },
    size: { width: 320, height: 220 },
    sizing: 'auto-height',
    ports: [
      { id: 'plant-out', direction: 'give', dataKind: 'plant', label: 'Plant', defaultVisible: true, flagWhenUnconsumed: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
  {
    type: 'payoff',
    category: 'writing',
    pack: 'novel',
    coreMenu: false,
    accent: '#fb923c',
    labels: { universal: 'Payoff', novel: 'Payoff', sermon: 'Resolution' },
    descriptions: {
      universal: 'The moment a Plant resolves; wire the plants it pays off',
      novel: 'The shot in act three; wire in the plants it fires',
      sermon: 'Where the planted tension resolves in the message',
    },
    size: { width: 320, height: 220 },
    sizing: 'auto-height',
    ports: [
      { id: 'plants-in', direction: 'take', dataKind: 'plant', label: 'Resolves', defaultVisible: true, capacity: 'many', flagWhenEmpty: true },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
  {
    // Story-time fields ship NOW so the data model is ready; the continuity
    // reducer (stateAt) is post-launch by decision (BRIEF revision log #10).
    type: 'event',
    category: 'knowledge',
    pack: 'novel',
    coreMenu: false,
    accent: '#c084fc',
    labels: { universal: 'Event', novel: 'Event', sermon: 'Moment' },
    descriptions: {
      universal: 'Something that happens at a story-time; involves people by role',
      novel: 'A happening on the story clock; wire in who was involved, as what',
      sermon: 'A moment in the narrative of the text',
    },
    size: { width: 340, height: 260 },
    sizing: 'auto-height',
    ports: [
      { id: 'event-out', direction: 'give', dataKind: 'event', label: 'Event', defaultVisible: true },
      { id: 'involves-in', direction: 'take', dataKind: 'person', label: 'Involves', defaultVisible: true, capacity: 'many' },
      { id: 'notes-in', direction: 'take', dataKind: 'text', label: 'Notes', defaultVisible: false, capacity: 'many' },
    ],
  },
];

export const NODE_TYPE_DEFS: readonly NodeTypeDef[] = [
  ...UNIVERSAL_CORE,
  ...ACADEMIC_PACK,
  ...SERMON_PACK,
  ...NOVEL_PACK,
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

export function getPort(type: string, portId: string): PortDef | undefined {
  return NODE_REGISTRY[type]?.ports.find((port) => port.id === portId);
}

// ---------------------------------------------------------------------------
// Split presets (I8: presets are registry data; Split logic never knows them)
// ---------------------------------------------------------------------------

export type SplitStubSpec = { type: string; title: string };

export type SplitPreset = {
  id: string;
  /** Node types whose Split menu offers this preset. */
  forTypes: readonly string[];
  label: string;
  description: string;
  stubs: readonly SplitStubSpec[];
  /** Intake the stubs wire into; defaults to the type's spine intake. */
  intake?: string;
};

export const SPLIT_PRESETS: readonly SplitPreset[] = [
  {
    id: 'three-sections',
    forTypes: ['document'],
    label: '3 blank sections',
    description: 'Three empty sections wired in, ready to write',
    stubs: [
      { type: 'section', title: 'Section 1' },
      { type: 'section', title: 'Section 2' },
      { type: 'section', title: 'Section 3' },
    ],
  },
  {
    id: 'beat-sheet',
    forTypes: ['document'],
    label: 'Beat sheet',
    description: 'Classic five-beat structure as section stubs',
    stubs: [
      { type: 'section', title: 'Opening image' },
      { type: 'section', title: 'Inciting incident' },
      { type: 'section', title: 'Rising action' },
      { type: 'section', title: 'Climax' },
      { type: 'section', title: 'Resolution' },
    ],
  },
  {
    id: 'toulmin',
    forTypes: ['claim'],
    label: 'Toulmin scaffold',
    description: 'Grounds, Warrant, Backing, Rebuttal stubs wired into Supports',
    intake: 'supports-in',
    stubs: [
      { type: 'note', title: 'Grounds' },
      { type: 'note', title: 'Warrant' },
      { type: 'note', title: 'Backing' },
      { type: 'note', title: 'Rebuttal' },
    ],
  },
  {
    id: 'passage-propositions',
    forTypes: ['passage'],
    label: 'Passage → Propositions',
    description: 'Three proposition stubs wired in, ready to arc',
    intake: 'props-in',
    stubs: [
      { type: 'proposition', title: 'Proposition 1' },
      { type: 'proposition', title: 'Proposition 2' },
      { type: 'proposition', title: 'Proposition 3' },
    ],
  },
  {
    id: 'three-chapters',
    forTypes: ['manuscript'],
    label: '3 chapter stubs',
    description: 'Three empty documents wired into the manuscript',
    stubs: [
      { type: 'document', title: 'Chapter 1' },
      { type: 'document', title: 'Chapter 2' },
      { type: 'document', title: 'Chapter 3' },
    ],
  },
];

export function splitPresetsFor(type: string): SplitPreset[] {
  return SPLIT_PRESETS.filter((preset) => preset.forTypes.includes(type));
}

/** The node type's compile-spine intake, if it has one. */
export function spineIntakeOf(type: string): PortDef | undefined {
  return NODE_REGISTRY[type]?.ports.find((port) => port.direction === 'take' && port.spine);
}

/** The node type's first text-giving port (what Split wires stubs from). */
export function textGiveOf(type: string): PortDef | undefined {
  return NODE_REGISTRY[type]?.ports.find(
    (port) => port.direction === 'give' && port.dataKind === 'text',
  );
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
