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
import { BlocksFace } from './BlocksFace';
import { ClaimFace } from './ClaimFace';
import { DefaultFace } from './DefaultFace';
import { HubFace } from './HubFace';
import { PlaceFace, QuestionFace, ThingFace } from './KnowledgeFaces';
import { EventFace, PayoffFace, PlantFace, PersonFace } from './NovelFaces';
import { PropositionFace } from './PropositionFace';
import { SourceFace } from './SourceFace';
import { TitleFace } from './TitleFace';
import { ManuscriptFace, PassageFace, SectionFace } from './WritingFaces';

export type FaceProps = {
  nodeId: string;
  title: string;
  content: string;
};

export const NODE_FACES: Record<string, ComponentType<FaceProps>> = {
  title: TitleFace,
  document: BlocksFace,
  manuscript: ManuscriptFace,
  section: SectionFace,
  claim: ClaimFace,
  passage: PassageFace,
  proposition: PropositionFace,
  plant: PlantFace,
  payoff: PayoffFace,
  event: EventFace,
  person: PersonFace,
  place: PlaceFace,
  thing: ThingFace,
  question: QuestionFace,
  hub: HubFace,
  source: SourceFace,
};

export function faceFor(coreType: string): ComponentType<FaceProps> {
  return NODE_FACES[coreType] ?? DefaultFace;
}
