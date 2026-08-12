import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

type ImageData = {
  mediaUrl?: string;
  mediaType?: string;
};

type ImageNodeProps = NodeProps<Node<ImageData>>;

export const ImageNode = memo(function ImageNode(props: ImageNodeProps) {
  const { data, selected } = props;

  return (
    <div
      className={`node-face ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      {data.mediaUrl ? (
        <img
          src={data.mediaUrl}
          alt="User uploaded media"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-node)',
            pointerEvents: 'none', // Prevents browser image dragging instead of node dragging
          }}
        />
      ) : (
        <div style={{ padding: '20px', color: 'var(--text-dim)' }}>Missing media</div>
      )}
    </div>
  );
});
