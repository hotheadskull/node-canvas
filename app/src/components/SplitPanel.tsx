// The split panel (Observatory §9) -- replaces the fixed preset list.
// Into (stepper + type), Titles (numbered / blank / paste), Wire back,
// Keep text, a dashed preview of the resulting stubs, Split, and Save as
// preset. The built-in registry presets and the user's saved ones are the
// same panel with the fields pre-filled. Splitting is recursive and
// unlimited -- nothing marks a node as already split.

import {
  allMenuTypes,
  DATA_KIND_STYLES,
  getNodeDef,
  nodeLabel,
  spineIntakeOf,
  splitPresetsFor,
  type SplitPreset,
} from '@node-canvas/core';
import { Bookmark, Minus, Plus, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore, type SplitPanelConfig } from '../store/canvasStore';

function spineHue(type: string): string {
  const give = getNodeDef(type)?.ports.find((port) => port.direction === 'give');
  return (give && DATA_KIND_STYLES[give.dataKind]?.hue) ?? DATA_KIND_STYLES.any.hue;
}

/** Types whose give can feed this intake kind (panel's type picker). */
function feedableTypes(intakeKind: string | undefined): string[] {
  return allMenuTypes()
    .flatMap((group) => group.types.map((def) => def.type))
    .filter((type) => {
      if (intakeKind === undefined) return true;
      const gives = getNodeDef(type)?.ports.filter((port) => port.direction === 'give') ?? [];
      if (intakeKind === 'any') return gives.length > 0;
      return gives.some((port) => port.dataKind === intakeKind);
    });
}

export function SplitPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const document = useCanvasStore((state) => state.document);
  const splitWithConfig = useCanvasStore((state) => state.splitWithConfig);
  const runPreset = useCanvasStore((state) => state.splitNode);
  const customPresets = useCanvasStore((state) => state.customPresets);
  const saveCustomPreset = useCanvasStore((state) => state.saveCustomPreset);

  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const intake = node ? spineIntakeOf(node.type) : undefined;
  const types = useMemo(() => feedableTypes(intake?.dataKind), [intake?.dataKind]);
  const presets = node ? splitPresetsFor(node.type) : [];

  const [type, setType] = useState(types[0] ?? 'section');
  const [count, setCount] = useState(3);
  const [titleMode, setTitleMode] = useState<'numbered' | 'blank' | 'paste'>('numbered');
  const [pasted, setPasted] = useState('');
  const [wireBack, setWireBack] = useState(true);
  const [keepText, setKeepText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');

  if (!node) return null;

  const config: SplitPanelConfig = {
    type,
    count,
    titleMode,
    ...(titleMode === 'paste' ? { pastedTitles: pasted.split('\n') } : {}),
    wireBack,
    keepText,
  };
  const label = getNodeDef(type) ? nodeLabel(type, 'universal') : type;
  const previewTitles =
    titleMode === 'paste'
      ? pasted.split('\n').map((line) => line.trim()).filter((line) => line !== '')
      : Array.from({ length: count }, (_, index) =>
          titleMode === 'numbered' ? `${label} ${String(index + 1).padStart(2, '0')}` : 'Untitled',
        );

  const prefill = (preset: SplitPreset) => {
    const oneType = new Set(preset.stubs.map((stub) => stub.type));
    if (oneType.size !== 1 || preset.intake !== undefined) {
      // heterogeneous or custom-intake presets run as themselves
      runPreset(nodeId, preset.id);
      onClose();
      return;
    }
    setType(preset.stubs[0]!.type);
    setCount(preset.stubs.length);
    setTitleMode('paste');
    setPasted(preset.stubs.map((stub) => stub.title).join('\n'));
  };

  return (
    <div className="split-panel nodrag" data-split-panel>
      {(presets.length > 0 || customPresets.length > 0) && (
        <div className="split-panel-presets">
          {presets.map((preset) => (
            <button key={preset.id} className="split-preset-chip" title={preset.description} onClick={() => prefill(preset)}>
              {preset.label}
            </button>
          ))}
          {customPresets.map((preset) => (
            <button
              key={preset.id}
              className="split-preset-chip is-custom"
              onClick={() => {
                setType(preset.config.type);
                setCount(preset.config.count);
                setTitleMode(preset.config.titleMode);
                setPasted((preset.config.pastedTitles ?? []).join('\n'));
                setWireBack(preset.config.wireBack);
                setKeepText(preset.config.keepText);
              }}
            >
              <Bookmark size={10} aria-hidden /> {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="split-panel-row">
        <span className="split-panel-label">Into</span>
        <span className="split-stepper">
          <button aria-label="Fewer" onClick={() => setCount((value) => Math.max(1, value - 1))}>
            <Minus size={11} aria-hidden />
          </button>
          <span className="split-stepper-count">{titleMode === 'paste' ? previewTitles.length : count}</span>
          <button aria-label="More" onClick={() => setCount((value) => Math.min(24, value + 1))}>
            <Plus size={11} aria-hidden />
          </button>
        </span>
        <select
          className="split-type-picker"
          aria-label="Child type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          style={{ borderLeft: `3px solid ${spineHue(type)}` }}
        >
          {types.map((candidate) => (
            <option key={candidate} value={candidate}>
              {nodeLabel(candidate, 'universal')}
            </option>
          ))}
        </select>
      </div>

      <div className="split-panel-row">
        <span className="split-panel-label">Titles</span>
        <span className="split-segmented" role="radiogroup" aria-label="Title mode">
          {(['numbered', 'blank', 'paste'] as const).map((mode) => (
            <button
              key={mode}
              role="radio"
              aria-checked={titleMode === mode}
              className={titleMode === mode ? 'is-active' : ''}
              onClick={() => setTitleMode(mode)}
            >
              {mode === 'numbered' ? 'Numbered' : mode === 'blank' ? 'Blank' : 'Paste a list'}
            </button>
          ))}
        </span>
      </div>
      {titleMode === 'paste' && (
        <textarea
          className="split-paste"
          placeholder={'One title per line…'}
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          rows={4}
        />
      )}

      <div className="split-panel-row">
        <label className="split-toggle">
          <input type="checkbox" checked={wireBack} onChange={(event) => setWireBack(event.target.checked)} />
          Wire back
          <small>each child feeds this node's spine</small>
        </label>
        <label className="split-toggle">
          <input type="checkbox" checked={keepText} onChange={(event) => setKeepText(event.target.checked)} />
          Keep text
          <small>move this prose into child 1</small>
        </label>
      </div>

      <div className="split-preview" data-split-preview>
        {previewTitles.map((title, index) => (
          <span key={`${index}-${title}`} className="split-preview-stub">
            <em>{String(index + 1).padStart(2, '0')}</em> {title}
          </span>
        ))}
      </div>

      <div className="split-panel-actions">
        {saving ? (
          <>
            <input
              className="split-preset-name"
              placeholder="Preset name…"
              value={presetName}
              autoFocus
              onChange={(event) => setPresetName(event.target.value)}
            />
            <button
              className="split-action"
              disabled={presetName.trim() === ''}
              onClick={() => {
                saveCustomPreset(presetName.trim(), config);
                setSaving(false);
                setPresetName('');
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <button
              className="split-action is-primary"
              onClick={() => {
                splitWithConfig(nodeId, config);
                onClose();
              }}
            >
              <Scissors size={11} aria-hidden /> Split
            </button>
            <button className="split-action" onClick={() => setSaving(true)}>
              <Bookmark size={11} aria-hidden /> Save as preset
            </button>
          </>
        )}
      </div>
    </div>
  );
}
