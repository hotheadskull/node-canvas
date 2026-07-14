// Per-type node FACES -- the body a node type renders inside the shared
// chrome (header, rails, ports, resizer stay in CanvasNode). This is the
// app-side counterpart of registry invariant I8: giving a type a unique look
// means dropping a component here, never editing CanvasNode or core.
//
// Faces land with the chunk that gives the type its behavior:
// - title: big-text display (shipped early at user request)
// - document: compile view (Chunk 5)
// - section/document/manuscript: real editors (Chunk 9, TipTap)
// - person/place/thing: dossier faces as derivations arrive
// - specialist types: Chunks 13-15

import type { ComponentType } from 'react';
import { DefaultFace } from './DefaultFace';
import { DocumentFace } from './DocumentFace';
import { PropositionFace } from './PropositionFace';
import { TitleFace } from './TitleFace';

export type FaceProps = {
  nodeId: string;
  title: string;
  content: string;
};

export const NODE_FACES: Record<string, ComponentType<FaceProps>> = {
  title: TitleFace,
  document: DocumentFace,
  manuscript: DocumentFace,
  // every spine-intake type gets the compile face: ordered intake list,
  // Split presets, preview. claim was MISSING here -- its Toulmin split had
  // no UI entry point (found while building the sermon pack).
  claim: DocumentFace,
  passage: DocumentFace,
  proposition: PropositionFace,
};

export function faceFor(coreType: string): ComponentType<FaceProps> {
  return NODE_FACES[coreType] ?? DefaultFace;
}
