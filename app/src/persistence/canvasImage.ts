// ============================================================================
// CANVAS IMAGE EXPORT -- the whole canvas as a PNG or SVG.
//
// Captures the React Flow viewport layer only (nodes, edges, wires) -- never
// the toolbar/menu chrome. Bounds come from the DOCUMENT, the same lesson as
// the toolbar's Fit: onlyRenderVisibleElements means the DOM only holds
// what's on screen, so the caller must flip the store's `exportingCanvas`
// flag first (Canvas disables culling while it is set) and give React a
// frame to mount everything.
// ============================================================================

import { getViewportForBounds, type Rect } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import type { CanvasDocument } from '@node-canvas/core';

export type CanvasImageFormat = 'png' | 'svg';

/** Document-space bounding box of everything on the canvas. */
export function documentBounds(doc: CanvasDocument): Rect | null {
  const rects = [
    ...doc.nodes.map((node) => ({
      x: node.position.x,
      y: node.position.y,
      width: node.size?.width ?? 300,
      height: node.size?.height ?? 200,
    })),
    ...doc.assemblies
      .filter((assembly) => assembly.collapsed)
      .map((assembly) => ({ x: assembly.position.x, y: assembly.position.y, width: 260, height: 150 })),
  ];
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  const PAD = 60;
  return {
    x: minX - PAD,
    y: minY - PAD,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
  };
}

/**
 * Render the current .react-flow__viewport to an image data URL. The caller
 * owns the exportingCanvas flag; this function assumes every node is mounted.
 */
export async function renderCanvasImage(
  doc: CanvasDocument,
  format: CanvasImageFormat,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl) return null;
  const bounds = documentBounds(doc);
  if (!bounds) return null;

  // Cap the output near 4K on the long edge; scale down huge canvases.
  const MAX_EDGE = 4096;
  const scale = Math.min(1, MAX_EDGE / Math.max(bounds.width, bounds.height));
  const width = Math.round(bounds.width * scale);
  const height = Math.round(bounds.height * scale);
  const viewport = getViewportForBounds(bounds, width, height, 0.05, 4, 0);

  const options = {
    backgroundColor: '#07080f',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };
  const dataUrl =
    format === 'png'
      ? await toPng(viewportEl, { ...options, pixelRatio: 2 })
      : await toSvg(viewportEl, options);
  return { dataUrl, width, height };
}

/** Turn a data URL into bytes for Tauri's binary file write. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
