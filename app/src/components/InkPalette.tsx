import { useCanvasStore } from '../store/canvasStore';

const INK_COLORS = [
  '#f1f1f2', // off-white
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#fbbf24', // yellow
  '#ef4444', // red
];

export function InkPalette() {
  const inkMode = useCanvasStore((state) => state.inkMode);
  const inkColor = useCanvasStore((state) => state.inkColor);
  const inkSize = useCanvasStore((state) => state.inkSize);
  const setInkColor = useCanvasStore((state) => state.setInkColor);
  const setInkSize = useCanvasStore((state) => state.setInkSize);
  const clearInk = useCanvasStore((state) => state.clearInk);

  if (!inkMode) return null;

  return (
    <div className="toolbar-floating-pill ink-palette" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {INK_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setInkColor(color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: color,
              border: inkColor === color ? '2px solid white' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label={`Set ink color to ${color}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label htmlFor="ink-size" style={{ fontSize: '11px', color: 'var(--obs-dimmer)' }}>
          Size
        </label>
        <input
          id="ink-size"
          type="range"
          min="1"
          max="20"
          value={inkSize}
          onChange={(e) => setInkSize(Number(e.target.value))}
          style={{ width: '80px', accentColor: inkColor }}
        />
      </div>
      <button
        className="toolbar-button"
        style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,0,0,0.2)' }}
        onClick={() => {
          if (confirm('Are you sure you want to clear all ink?')) {
            clearInk();
          }
        }}
      >
        Clear Ink
      </button>
    </div>
  );
}
