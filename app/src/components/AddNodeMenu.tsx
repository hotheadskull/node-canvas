// The gallery add-node menu: miniature node cards rendered FROM the registry
// (they can never drift from the real nodes), grouped Core / All, with a
// docked preview panel that fills on hover -- description plus the "Known as"
// per-mode names, which is how the menu teaches cross-sphere reuse.

import { useMemo, useState } from 'react';
import {
  allMenuTypes,
  coreMenuTypes,
  nodeLabel,
  type CanvasMode,
  type NodeTypeDef,
} from '@node-canvas/core';

const MODE_NAMES: Record<CanvasMode, string> = {
  universal: 'Universal',
  novel: 'Novel',
  sermon: 'Sermon',
};

const GROUP_TITLES: Record<string, string> = {
  writing: 'Writing',
  knowledge: 'Knowledge',
  structure: 'Structure',
  academic: 'Paper & argument',
};

type Props = {
  onPick: (type: string) => void;
  onClose: () => void;
};

function MiniCard({
  def,
  onPick,
  onHover,
}: {
  def: NodeTypeDef;
  onPick: (type: string) => void;
  onHover: (type: string) => void;
}) {
  return (
    <button
      className="menu-card"
      data-node-type={def.type}
      onMouseEnter={() => onHover(def.type)}
      onFocus={() => onHover(def.type)}
      onClick={() => onPick(def.type)}
    >
      <span className="menu-card-accent" style={{ background: def.accent }} />
      <span className="menu-card-label">{def.labels.universal}</span>
      <span className="menu-card-line" />
    </button>
  );
}

export function AddNodeMenu({ onPick, onClose }: Props) {
  const [view, setView] = useState<'core' | 'all'>(
    () => (localStorage.getItem('nodecanvas.v2.menuView') === 'all' ? 'all' : 'core'),
  );
  const [previewType, setPreviewType] = useState<string>('note');

  const groups = useMemo(() => {
    if (view === 'core') {
      const core = coreMenuTypes();
      return [
        { title: 'Writing', types: core.filter((def) => def.category === 'writing') },
        { title: 'Knowledge', types: core.filter((def) => def.category === 'knowledge') },
      ];
    }
    return allMenuTypes().map((group) => ({
      title: GROUP_TITLES[group.category] ?? group.category,
      types: [...group.types],
    }));
  }, [view]);

  const preview = groups.flatMap((group) => group.types).find((def) => def.type === previewType)
    ?? groups[0]?.types[0];

  const switchView = (next: 'core' | 'all') => {
    setView(next);
    localStorage.setItem('nodecanvas.v2.menuView', next);
  };

  return (
    <div className="add-menu" role="dialog" aria-label="Add a node">
      <div className="add-menu-main">
        <div className="add-menu-topbar">
          <span className="add-menu-heading">Add a node</span>
          <span className="add-menu-toggle" role="tablist">
            <button
              role="tab"
              aria-selected={view === 'core'}
              className={view === 'core' ? 'is-active' : ''}
              onClick={() => switchView('core')}
            >
              Core
            </button>
            <button
              role="tab"
              aria-selected={view === 'all'}
              className={view === 'all' ? 'is-active' : ''}
              onClick={() => switchView('all')}
            >
              All
            </button>
          </span>
          <button className="add-menu-close" aria-label="Close menu" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="add-menu-groups">
          {groups.map((group) => (
            <section key={group.title}>
              <p className="add-menu-group-title">{group.title}</p>
              <div className="add-menu-grid">
                {group.types.map((def) => (
                  <MiniCard key={def.type} def={def} onPick={onPick} onHover={setPreviewType} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {preview && (
        <aside className="add-menu-preview" data-preview-for={preview.type}>
          <div className="menu-card is-preview">
            <span className="menu-card-accent" style={{ background: preview.accent }} />
            <span className="menu-card-label">{preview.labels.universal}</span>
            <span className="menu-card-line" />
            <span className="menu-card-line short" />
          </div>
          <p className="add-menu-preview-text">{preview.descriptions.universal}</p>
          {preview.ports.length > 0 && (
            <p className="add-menu-preview-ports">
              {preview.ports.some((port) => port.direction === 'give') && (
                <span className="gives">
                  Gives{' '}
                  {preview.ports
                    .filter((port) => port.direction === 'give')
                    .map((port) => port.label.toLowerCase())
                    .join(', ')}
                </span>
              )}
              {preview.ports.some((port) => port.direction === 'take') && (
                <span className="takes">
                  Takes{' '}
                  {preview.ports
                    .filter((port) => port.direction === 'take')
                    .map((port) => port.label.toLowerCase())
                    .join(', ')}
                </span>
              )}
            </p>
          )}
          <p className="add-menu-preview-kicker">Known as</p>
          <ul className="add-menu-known-as">
            {(Object.keys(MODE_NAMES) as CanvasMode[])
              .filter((mode) => mode !== 'universal')
              .map((mode) => (
                <li key={mode}>
                  {nodeLabel(preview.type, mode)} <span>in {MODE_NAMES[mode]}</span>
                </li>
              ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
