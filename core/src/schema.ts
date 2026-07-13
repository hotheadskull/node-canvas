// ============================================================================
// DOCUMENT SCHEMA -- the .nodecanvas file format, Zod-validated on every load
// and before every save (I9). One file per project.
//
// Format rules (I10, CRDT-compatible):
// - every entity carries a stable id; identity never derives from array index
// - ordering, where it matters, is expressed as data -- never implicit
// - schemaVersion gates migrations; changes ship with a pre-migration backup
// ============================================================================

import { z } from 'zod';
import { createId } from './ids';
import type { CanvasMode } from './registry';

export const DOCUMENT_SCHEMA_VERSION = 1;

const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const SizeSchema = z.object({
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
});

// data is passthrough: pack node types store their payloads here without the
// core schema ever needing to know about them (I8).
const NodeDataSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
  })
  .passthrough();

export const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: PositionSchema,
  size: SizeSchema.optional(),
  data: NodeDataSchema,
});

// Plain edge (I1): a relationship line. Carries no data beyond an optional
// user label. Always available between any two nodes with zero setup.
export const PlainEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
});

export const DocumentSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string(),
    canvasMode: z.enum(['universal', 'novel', 'sermon']),
    createdAt: z.string().min(1),
    nodes: z.array(NodeSchema),
    edges: z.array(PlainEdgeSchema),
  })
  .superRefine((doc, ctx) => {
    const nodeIds = new Set<string>();
    for (const node of doc.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate node id "${node.id}"` });
      }
      nodeIds.add(node.id);
    }
    const edgeIds = new Set<string>();
    for (const edge of doc.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate edge id "${edge.id}"` });
      }
      edgeIds.add(edge.id);
      for (const endpoint of [edge.source, edge.target]) {
        if (!nodeIds.has(endpoint)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `edge "${edge.id}" references missing node "${endpoint}"`,
          });
        }
      }
    }
  });

export type CanvasNode = z.infer<typeof NodeSchema>;
export type PlainEdge = z.infer<typeof PlainEdgeSchema>;
export type CanvasDocument = z.infer<typeof DocumentSchema>;

export type ParseResult =
  | { ok: true; document: CanvasDocument }
  | { ok: false; error: string };

/**
 * Load a .nodecanvas document from its JSON text. Never throws: failures are
 * surfaced as { ok: false, error } so callers must handle them (I9 -- errors
 * are surfaced, never swallowed).
 */
export function parseDocument(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    return { ok: false, error: `not valid JSON: ${(cause as Error).message}` };
  }
  const result = DocumentSchema.safeParse(json);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { ok: false, error: `invalid document: ${details}` };
  }
  return { ok: true, document: result.data };
}

export class DocumentValidationError extends Error {}

/**
 * Serialize a document to the canonical on-disk text. Validates FIRST and
 * throws DocumentValidationError rather than ever writing an invalid file
 * (I9). Output is deterministic: same document, same bytes.
 */
export function serializeDocument(document: CanvasDocument): string {
  const result = DocumentSchema.safeParse(document);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new DocumentValidationError(`refusing to save invalid document: ${details}`);
  }
  return `${JSON.stringify(result.data, null, 2)}\n`;
}

export function createEmptyDocument(name: string, canvasMode: CanvasMode = 'universal'): CanvasDocument {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    id: createId('doc'),
    name,
    canvasMode,
    createdAt: new Date().toISOString(),
    nodes: [],
    edges: [],
  };
}
