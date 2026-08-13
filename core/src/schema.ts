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

/** The twelve field kinds a user can add to any node (design direction
 * 2026-08-12 §4). `reference` holds a node id; `multiselect` holds a list. */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'longtext',
  'number',
  'boolean',
  'date',
  'dropdown',
  'multiselect',
  'color',
  'image',
  'url',
  'rating',
  'reference',
] as const;

// Custom fields are a CORE feature, not pack payload: any node can grow the
// structure its user invents. Validated here so a hand-edited or foreign
// file can never smuggle a malformed field past load (I9).
export const CustomFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(CUSTOM_FIELD_TYPES),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  /** dropdown / multiselect choices. */
  options: z.array(z.string()).optional(),
});

// data is passthrough: pack node types store their payloads here without the
// core schema ever needing to know about them (I8).
const NodeDataSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.string().optional(),
    fields: z.array(CustomFieldSchema).optional(),
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
// sourceHandle/targetHandle record WHICH side of each node the user attached
// to -- a v1 lesson (its F7-10a test): edges that don't persist their handles
// cannot be rendered back onto multi-handle nodes.
export const PlainEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});

// Data wire: a typed give->take connection between named ports. status
// 'tentative' is a dashed candidate placement ("this might go here") that
// carries no data until committed. storyTime stamps possession/effect wires.
// relation names HOW the source serves the target (the sermon pack's 18
// arcing relationships live here); core stores the id, arcs.ts owns the list.
export const WireSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourcePort: z.string().min(1),
  target: z.string().min(1),
  targetPort: z.string().min(1),
  status: z.enum(['live', 'tentative']),
  label: z.string().optional(),
  storyTime: z.number().finite().optional(),
  relation: z.string().min(1).optional(),
});

// Assembly (I3): a REFERENCE list, never a copy. memberIds point at nodes or
// other assemblies (nesting); a node can belong to many assemblies at once.
// `collapsed` is a pure view flag -- collapsing transforms NOTHING in the
// graph, which is what makes collapse/expand structurally lossless (I4).
// The assembly's own id can be an edge endpoint: external connections attach
// to the FACE, so deleting inner nodes never breaks them (Blender lesson).
export const AssemblySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  memberIds: z.array(z.string().min(1)),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  collapsed: z.boolean(),
});

export const StrokeSchema = z.object({
  id: z.string().min(1),
  color: z.string(),
  size: z.number().positive(),
  points: z.array(z.tuple([z.number(), z.number(), z.number()])), // x, y, pressure
});

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(PlainEdgeSchema),
  wires: z.array(WireSchema),
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
    wires: z.array(WireSchema),
    assemblies: z.array(AssemblySchema),
    ink: z.array(StrokeSchema).optional(),
    templates: z.array(TemplateSchema).optional(),
  })
  .superRefine((doc, ctx) => {
    const nodeIds = new Set<string>();
    for (const node of doc.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate node id "${node.id}"` });
      }
      nodeIds.add(node.id);
    }
    const assemblyIds = new Set<string>();
    for (const assembly of doc.assemblies) {
      if (assemblyIds.has(assembly.id) || nodeIds.has(assembly.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate assembly id "${assembly.id}"`,
        });
      }
      assemblyIds.add(assembly.id);
    }
    // plain edges may attach to nodes OR assembly faces
    const endpointIds = new Set([...nodeIds, ...assemblyIds]);
    const edgeIds = new Set<string>();
    for (const edge of doc.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate edge id "${edge.id}"` });
      }
      edgeIds.add(edge.id);
      for (const endpoint of [edge.source, edge.target]) {
        if (!endpointIds.has(endpoint)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `edge "${edge.id}" references missing node "${endpoint}"`,
          });
        }
      }
    }
    const wireIds = new Set<string>();
    for (const wire of doc.wires) {
      if (wireIds.has(wire.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate wire id "${wire.id}"` });
      }
      wireIds.add(wire.id);
      for (const endpoint of [wire.source, wire.target]) {
        if (!nodeIds.has(endpoint)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `wire "${wire.id}" references missing node "${endpoint}"`,
          });
        }
      }
    }
    // membership integrity: members exist; no membership cycles
    for (const assembly of doc.assemblies) {
      const seen = new Set<string>();
      for (const memberId of assembly.memberIds) {
        if (seen.has(memberId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `assembly "${assembly.id}" lists member "${memberId}" twice`,
          });
        }
        seen.add(memberId);
        if (!nodeIds.has(memberId) && !assemblyIds.has(memberId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `assembly "${assembly.id}" references missing member "${memberId}"`,
          });
        }
      }
    }
    const byId = new Map(doc.assemblies.map((assembly) => [assembly.id, assembly]));
    const reaches = (fromId: string, targetId: string, path: Set<string>): boolean => {
      if (fromId === targetId) return true;
      if (path.has(fromId)) return false;
      path.add(fromId);
      const assembly = byId.get(fromId);
      if (!assembly) return false;
      return assembly.memberIds.some((memberId) => reaches(memberId, targetId, path));
    };
    for (const assembly of doc.assemblies) {
      if (assembly.memberIds.some((memberId) => reaches(memberId, assembly.id, new Set()))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `assembly "${assembly.id}" contains itself (membership cycle)`,
        });
      }
    }
  });

export type CanvasNode = z.infer<typeof NodeSchema>;
export type PlainEdge = z.infer<typeof PlainEdgeSchema>;
export type DataWire = z.infer<typeof WireSchema>;
export type Assembly = z.infer<typeof AssemblySchema>;
export type Stroke = z.infer<typeof StrokeSchema>;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type CustomField = z.infer<typeof CustomFieldSchema>;
export type CanvasTemplate = z.infer<typeof TemplateSchema>;
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
    wires: [],
    assemblies: [],
  };
}
