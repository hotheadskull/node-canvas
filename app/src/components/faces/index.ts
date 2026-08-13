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
import { BrainstormFace } from './BrainstormFace';

import { ReferenceFace } from './ReferenceFace';
import { SequenceFace, DecisionFace, ConditionFace, AndFace, OrFace, NotFace, CompareFace, MergeFace, SplitFace, TransformFace, FilterFace } from './LogicFaces';

export type FaceProps = {
  nodeId: string;
  title: string;
  content: string;
};

/** What "Extract" offers on selected prose (design direction §13: pull a
 * Character, Location, Theme, Event or Scene out of a big note WITHOUT
 * removing the source text). One list so every face offers the same verbs;
 * every entry must be a REGISTERED type or the extraction spawns nothing. */
export const EXTRACT_TYPES = [
  { type: 'note', label: 'Note' },
  { type: 'section', label: 'Scene / Section' },
  { type: 'person', label: 'Character / Person' },
  { type: 'place', label: 'Location' },
  { type: 'thing', label: 'Object' },
  { type: 'event', label: 'Event' },
  { type: 'question', label: 'Question' },
  { type: 'source', label: 'Source' },
];

export const NODE_FACES: Record<string, ComponentType<FaceProps>> = {
  title: TitleFace,
  brainstorm: BrainstormFace,
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
  reference: ReferenceFace,
  sequence: SequenceFace,
  decision: DecisionFace,
  condition: ConditionFace,
  and: AndFace,
  or: OrFace,
  not: NotFace,
  compare: CompareFace,
  merge: MergeFace,
  split: SplitFace,
  transform: TransformFace,
  filter: FilterFace,
};

export function faceFor(coreType: string): ComponentType<FaceProps> {
  return NODE_FACES[coreType] ?? DefaultFace;
}
