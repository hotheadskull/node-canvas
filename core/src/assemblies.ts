// ============================================================================
// ASSEMBLIES -- reference-based grouping (I3) with structurally lossless
// collapse (I4). NOT built on React Flow parentId nesting.
//
// The load-bearing facts:
// - memberIds are REFERENCES. Nothing here ever copies, moves, or deletes a
//   member node. A node may belong to any number of assemblies.
// - `collapsed` is a view flag. Collapse transforms nothing, which is why
//   collapse/expand cannot lose data -- there is nothing to restore.
// - The assembly id is a valid plain-edge endpoint: external connections
//   attach to the face, so inner deletions never orphan them.
// ============================================================================

import { GraphError } from './graph';
import { createId } from './ids';
import type { Assembly, CanvasDocument } from './schema';

function assemblyById(document: CanvasDocument, id: string): Assembly | undefined {
  return document.assemblies.find((assembly) => assembly.id === id);
}

function requireAssembly(document: CanvasDocument, id: string): Assembly {
  const assembly = assemblyById(document, id);
  if (!assembly) {
    throw new GraphError(`assembly "${id}" not found`);
  }
  return assembly;
}

function entityExists(document: CanvasDocument, id: string): boolean {
  return (
    document.nodes.some((node) => node.id === id) ||
    document.assemblies.some((assembly) => assembly.id === id)
  );
}

/** True if adding `memberId` to `assemblyId` would create a membership cycle. */
function wouldCycle(document: CanvasDocument, assemblyId: string, memberId: string): boolean {
  if (assemblyId === memberId) return true;
  const member = assemblyById(document, memberId);
  if (!member) return false; // nodes cannot contain assemblies
  return member.memberIds.some((inner) => wouldCycle(document, assemblyId, inner));
}

export function createAssembly(
  document: CanvasDocument,
  name: string,
  memberIds: readonly string[],
  position: { x: number; y: number },
  idFactory: (prefix: string) => string = createId,
): { document: CanvasDocument; assemblyId: string } {
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) {
    throw new GraphError('an assembly needs at least one member');
  }
  for (const memberId of unique) {
    if (!entityExists(document, memberId)) {
      throw new GraphError(`cannot assemble: "${memberId}" not found`);
    }
  }
  const assembly: Assembly = {
    id: idFactory('asm'),
    name,
    memberIds: unique,
    position,
    collapsed: false,
  };
  for (const memberId of unique) {
    if (wouldCycle({ ...document, assemblies: [...document.assemblies, assembly] }, assembly.id, memberId)) {
      throw new GraphError(`adding "${memberId}" would make the assembly contain itself`);
    }
  }
  return {
    document: { ...document, assemblies: [...document.assemblies, assembly] },
    assemblyId: assembly.id,
  };
}

export function addMember(
  document: CanvasDocument,
  assemblyId: string,
  memberId: string,
): CanvasDocument {
  const assembly = requireAssembly(document, assemblyId);
  if (!entityExists(document, memberId)) {
    throw new GraphError(`cannot add member: "${memberId}" not found`);
  }
  if (assembly.memberIds.includes(memberId)) {
    return document;
  }
  if (wouldCycle(document, assemblyId, memberId)) {
    throw new GraphError(`adding "${memberId}" would make the assembly contain itself`);
  }
  return {
    ...document,
    assemblies: document.assemblies.map((candidate) =>
      candidate.id === assemblyId
        ? { ...candidate, memberIds: [...candidate.memberIds, memberId] }
        : candidate,
    ),
  };
}

/** Remove a member REFERENCE. The member itself is untouched (I3). */
export function removeMember(
  document: CanvasDocument,
  assemblyId: string,
  memberId: string,
): CanvasDocument {
  const assembly = requireAssembly(document, assemblyId);
  if (!assembly.memberIds.includes(memberId)) {
    throw new GraphError(`"${memberId}" is not a member of "${assemblyId}"`);
  }
  return {
    ...document,
    assemblies: document.assemblies.map((candidate) =>
      candidate.id === assemblyId
        ? { ...candidate, memberIds: candidate.memberIds.filter((id) => id !== memberId) }
        : candidate,
    ),
  };
}

/**
 * Delete the assembly. Members are NEVER deleted (I3); edges attached to the
 * face go with the face, and parent assemblies drop the reference.
 */
export function deleteAssembly(document: CanvasDocument, assemblyId: string): CanvasDocument {
  requireAssembly(document, assemblyId);
  return {
    ...document,
    assemblies: document.assemblies
      .filter((assembly) => assembly.id !== assemblyId)
      .map((assembly) =>
        assembly.memberIds.includes(assemblyId)
          ? { ...assembly, memberIds: assembly.memberIds.filter((id) => id !== assemblyId) }
          : assembly,
      ),
    edges: document.edges.filter(
      (edge) => edge.source !== assemblyId && edge.target !== assemblyId,
    ),
  };
}

/** Alias with the UI's name: dissolve the group, keep every node (I3). */
export const unpackAssembly = deleteAssembly;

/**
 * Duplicate = a NEW reference list over the SAME members (I3: never copies
 * member nodes). The copy lands offset so both faces are visible.
 */
export function duplicateAssembly(
  document: CanvasDocument,
  assemblyId: string,
  idFactory: (prefix: string) => string = createId,
): { document: CanvasDocument; assemblyId: string } {
  const original = requireAssembly(document, assemblyId);
  const copy: Assembly = {
    ...original,
    id: idFactory('asm'),
    name: `${original.name} (copy)`,
    memberIds: [...original.memberIds],
    position: { x: original.position.x + 60, y: original.position.y + 60 },
  };
  return {
    document: { ...document, assemblies: [...document.assemblies, copy] },
    assemblyId: copy.id,
  };
}

/** Collapse/expand: a view-flag flip. The graph is untouched (I4). */
export function setAssemblyCollapsed(
  document: CanvasDocument,
  assemblyId: string,
  collapsed: boolean,
): CanvasDocument {
  requireAssembly(document, assemblyId);
  return {
    ...document,
    assemblies: document.assemblies.map((assembly) =>
      assembly.id === assemblyId ? { ...assembly, collapsed } : assembly,
    ),
  };
}

export function moveAssembly(
  document: CanvasDocument,
  assemblyId: string,
  position: { x: number; y: number },
): CanvasDocument {
  requireAssembly(document, assemblyId);
  return {
    ...document,
    assemblies: document.assemblies.map((assembly) =>
      assembly.id === assemblyId ? { ...assembly, position } : assembly,
    ),
  };
}

export function renameAssembly(
  document: CanvasDocument,
  assemblyId: string,
  name: string,
): CanvasDocument {
  requireAssembly(document, assemblyId);
  return {
    ...document,
    assemblies: document.assemblies.map((assembly) =>
      assembly.id === assemblyId ? { ...assembly, name } : assembly,
    ),
  };
}

// ---------------------------------------------------------------------------
// Derivations (pure views over membership; the UI renders these)
// ---------------------------------------------------------------------------

/** Transitive member NODE ids (through nested assemblies). */
export function memberNodeIds(document: CanvasDocument, assemblyId: string): string[] {
  const result: string[] = [];
  const visit = (id: string, path: Set<string>) => {
    if (path.has(id)) return;
    path.add(id);
    const assembly = assemblyById(document, id);
    if (!assembly) {
      if (document.nodes.some((node) => node.id === id)) result.push(id);
      return;
    }
    for (const memberId of assembly.memberIds) visit(memberId, path);
  };
  for (const memberId of assemblyById(document, assemblyId)?.memberIds ?? []) {
    visit(memberId, new Set([assemblyId]));
  }
  return [...new Set(result)];
}

/**
 * Everything hidden from the canvas because SOME assembly containing it
 * (directly or transitively) is collapsed. Returns node ids and assembly ids.
 */
export function hiddenIds(document: CanvasDocument): Set<string> {
  const hidden = new Set<string>();
  for (const assembly of document.assemblies) {
    if (!assembly.collapsed) continue;
    for (const nodeId of memberNodeIds(document, assembly.id)) hidden.add(nodeId);
    const markAssemblies = (id: string, path: Set<string>) => {
      if (path.has(id)) return;
      path.add(id);
      const inner = assemblyById(document, id);
      if (!inner) return;
      if (id !== assembly.id) hidden.add(id);
      for (const memberId of inner.memberIds) markAssemblies(memberId, path);
    };
    markAssemblies(assembly.id, new Set());
  }
  return hidden;
}

/**
 * Where a connection endpoint should DRAW right now: the outermost collapsed
 * assembly containing it, or the endpoint itself when visible. This is
 * display-only remapping -- the stored edge never changes.
 */
export function displayEndpoint(document: CanvasDocument, endpointId: string): string {
  let outermost = endpointId;
  const containers = (id: string): Assembly[] =>
    document.assemblies.filter((assembly) => assembly.memberIds.includes(id));
  const visit = (id: string, path: Set<string>) => {
    if (path.has(id)) return;
    path.add(id);
    for (const container of containers(id)) {
      if (container.collapsed) outermost = container.id;
      visit(container.id, path);
    }
  };
  visit(endpointId, new Set());
  return outermost;
}
