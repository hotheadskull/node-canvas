import { useCanvasStore } from '../store/canvasStore';
import { Eraser } from 'lucide-react';

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
  const inkEraserMode = useCanvasStore((state) => state.inkEraserMode);
  const setInkEraserMode = useCanvasStore((state) => state.setInkEraserMode);
  const clearInk = useCanvasStore((state) => state.clearInk);

  if (!inkMode) return null;

  return (
    <div className="selection-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '8px 16px', background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: '8px', backdropFilter: 'blur(6px)' }}>
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
        <button
          onClick={() => setInkEraserMode(!inkEraserMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: inkEraserMode ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            border: inkEraserMode ? '1px solid white' : '1px solid transparent',
            color: 'white',
            cursor: 'pointer',
            padding: 0,
            marginLeft: '4px'
          }}
          title="Eraser Mode"
          aria-label="Toggle Eraser Mode"
        >
          <Eraser size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
        {[2, 4, 8, 12, 16].map((size) => (
          <button
            key={size}
            onClick={() => setInkSize(size)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              backgroundColor: inkSize === size ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: inkSize === size ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
            title={`Size ${size}`}
            aria-label={`Set ink size to ${size}`}
          >
            <div style={{
              width: `${Math.min(16, size + 2)}px`,
              height: `${Math.min(16, size + 2)}px`,
              borderRadius: '50%',
              backgroundColor: inkSize === size ? inkColor : '#666',
            }} />
          </button>
        ))}
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
