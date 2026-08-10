// The ADD SHEET (pt2 handoff §10): five families of icon tiles in a
// 4-column grid. An icon carries the hue instead of a stripe -- eighteen
// identical colour bars is a legend, not a menu. No borders at rest; only
// the highlighted tile gets a tinted fill + inset ring. The footer aside
// previews the highlighted type's ports. Arrow keys move, Enter places.
//
// The old Core/All split (working-set gate, 2026-07-15) retired with this
// sheet (user, 2026-08-10): every family shows at once, so every
// registered type is one click away (I11).

import { useEffect, useMemo, useState } from 'react';
import {
  DATA_KIND_STYLES,
  getNodeDef,
  NODE_TYPE_DEFS,
  type CanvasMode,
  type NodeTypeDef,
  type PortDef,
} from '@node-canvas/core';
import {
  BookMarked,
  BookOpenText,
  CalendarDays,
  CircleCheck,
  CircleDot,
  CircleHelp,
  FileText,
  Layers,
  Library,
  MapPin,
  Milestone,
  Package,
  Paperclip,
  Sparkles,
  Sprout,
  StickyNote,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';


/** Spec §10 icon table -- one lucide glyph per type. */
const SHEET_ICONS: Record<string, LucideIcon> = {
  title: Type,
  manuscript: Library,
  document: BookOpenText,
  section: FileText,
  person: UserRound,
  place: MapPin,
  thing: Package,
  event: CalendarDays,
  claim: CircleCheck,
  question: CircleHelp,
  passage: BookMarked,
  proposition: Milestone,
  source: Paperclip,
  note: StickyNote,
  plant: Sprout,
  payoff: Sparkles,
  hub: CircleDot,
};

/** Five families of four (§10). Group is the odd one out -- it gathers a
 * selection instead of spawning, so its tile is a shortcut, not a type. */
const FAMILIES: { title: string; types: string[] }[] = [
  { title: 'Structure', types: ['title', 'manuscript', 'document', 'section'] },
  { title: 'People & world', types: ['person', 'place', 'thing', 'event'] },
  { title: 'Argument', types: ['claim', 'question', 'passage', 'proposition'] },
  { title: 'Material & craft', types: ['source', 'note', 'plant', 'payoff'] },
  { title: 'Containers', types: ['hub'] },
];

const MODE_NAMES: Record<CanvasMode, string> = {
  universal: 'Universal',
  novel: 'Novel',
  sermon: 'Sermon',
};

/** The colour law, menu edition: primary give's kind, else the first
 * take's (Question and Payoff are takes-only), else neutral. */
function typeHue(def: NodeTypeDef): string {
  const give = def.ports.find((port) => port.direction === 'give');
  const take = def.ports.find((port) => port.direction === 'take');
  const kind = give?.dataKind ?? take?.dataKind ?? 'any';
  return DATA_KIND_STYLES[kind]?.hue ?? DATA_KIND_STYLES.any.hue;
}

function portHue(port: PortDef): string {
  return DATA_KIND_STYLES[port.dataKind]?.hue ?? DATA_KIND_STYLES.any.hue;
}

type Props = {
  onPick: (type: string) => void;
  onClose: () => void;
  /** Selection size (for the Group shortcut tile); omit = 0. */
  selectedCount?: number;
  onGather?: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable)
  );
}

function Tile({
  def,
  highlighted,
  onPick,
  onHover,
}: {
  def: NodeTypeDef;
  highlighted: boolean;
  onPick: (type: string) => void;
  onHover: (type: string) => void;
}) {
  const hue = typeHue(def);
  const Icon = SHEET_ICONS[def.type] ?? StickyNote;
  return (
    <button
      className={`sheet-tile ${highlighted ? 'is-highlighted' : ''}`}
      data-node-type={def.type}
      style={{ ['--tile-hue' as string]: hue }}
      onMouseEnter={() => onHover(def.type)}
      onFocus={() => onHover(def.type)}
      onClick={() => onPick(def.type)}
    >
      <Icon size={17} aria-hidden className="sheet-tile-icon" />
      <span className="sheet-tile-label">{def.labels.universal}</span>
    </button>
  );
}

export function AddNodeMenu({ onPick, onClose, selectedCount = 0, onGather }: Props) {
  const [previewType, setPreviewType] = useState<string>('note');
  const groups = useMemo(() => {
    // families first; anything registered but not yet in a family (a new
    // pack type) still lands in a trailing group so I11 can never break
    const familied = new Set(FAMILIES.flatMap((family) => family.types));
    const grouped = FAMILIES.map((family) => ({
      title: family.title,
      types: family.types.flatMap((type) => {
        const def = getNodeDef(type);
        return def ? [def] : [];
      }),
    }));
    const strays = NODE_TYPE_DEFS.filter((def) => !familied.has(def.type));
    if (strays.length > 0) grouped.push({ title: 'More', types: [...strays] });
    return grouped;
  }, []);

  // one flat order for the arrow keys; the grid is 4 columns wide
  const flat = useMemo(() => groups.flatMap((group) => group.types), [groups]);
  const highlightIndex = Math.max(
    0,
    flat.findIndex((def) => def.type === previewType),
  );
  const preview = flat.find((def) => def.type === previewType) ?? flat[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const move = (delta: number) => {
        event.preventDefault();
        const next = flat[Math.min(flat.length - 1, Math.max(0, highlightIndex + delta))];
        if (next) setPreviewType(next.type);
      };
      switch (event.key) {
        case 'ArrowRight':
          move(1);
          break;
        case 'ArrowLeft':
          move(-1);
          break;
        case 'ArrowDown':
          move(4);
          break;
        case 'ArrowUp':
          move(-4);
          break;
        case 'Enter':
          if (preview) {
            event.preventDefault();
            onPick(preview.type);
          }
          break;
        case 'Escape':
          onClose();
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flat, highlightIndex, preview, onPick, onClose]);

  return (
    <div className="add-menu" role="dialog" aria-label="Add a node">
      <div className="add-menu-main">
        <div className="add-menu-topbar">
          <span className="add-menu-heading">Add a node</span>
          <button className="add-menu-close" aria-label="Close menu" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="add-menu-groups">
          {groups.map((group) => (
            <section key={group.title}>
              <p className="add-menu-group-title">{group.title}</p>
              <div className="sheet-grid">
                {group.types.map((def) => (
                  <Tile
                    key={def.type}
                    def={def}
                    highlighted={preview?.type === def.type}
                    onPick={onPick}
                    onHover={setPreviewType}
                  />
                ))}
                {group.title === 'Containers' && (
                  <button
                    className="sheet-tile is-shortcut"
                    style={{ ['--tile-hue' as string]: DATA_KIND_STYLES.any.hue }}
                    disabled={selectedCount < 2 || !onGather}
                    title={
                      selectedCount >= 2
                        ? `Gather the ${selectedCount} selected plates into a group`
                        : 'Group contains — select 2+ plates on the canvas first (⌘G)'
                    }
                    onClick={() => {
                      onGather?.();
                      onClose();
                    }}
                  >
                    <Layers size={17} aria-hidden className="sheet-tile-icon" />
                    <span className="sheet-tile-label">
                      Group{selectedCount >= 2 ? ` ${selectedCount}` : ''}
                    </span>
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
      {preview && (
        <aside className="add-menu-preview" data-preview-for={preview.type}>
          <p className="add-menu-preview-name" style={{ color: typeHue(preview) }}>
            {preview.labels.universal}
          </p>
          <p className="add-menu-preview-text">{preview.descriptions.universal}</p>
          {preview.ports.length > 0 && (
            <div className="add-menu-preview-ports" aria-label="Ports">
              {preview.ports.map((port) => (
                <span key={port.id} className="preview-port">
                  <i
                    className={`preview-slot ${port.direction === 'give' ? 'is-give' : 'is-take'}`}
                    style={{ ['--port-color' as string]: portHue(port) }}
                    aria-hidden
                  />
                  {port.label}
                  <em>
                    {port.dataKind} · {port.direction === 'give' ? 'out' : 'in'}
                  </em>
                </span>
              ))}
            </div>
          )}
          <p className="add-menu-preview-kicker">Ideas on how to use</p>
          <ul className="add-menu-known-as">
            {(Object.keys(MODE_NAMES) as CanvasMode[])
              .filter((mode) => mode !== 'universal')
              .map((mode) => {
                const desc = preview.descriptions[mode];
                if (!desc || desc === preview.descriptions.universal) return null;
                return (
                  <li key={mode}>
                    <span style={{ color: '#b9b9c2' }}>• {desc}</span>
                  </li>
                );
              })}
          </ul>
        </aside>
      )}
    </div>
  );
}
