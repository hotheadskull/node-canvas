// Tutorial step definitions. Each step SPOTLIGHTS a piece of real UI and
// waits for the user to actually perform the action (done() watches the
// document); Next always allows skipping ahead, Back returns. Pure data +
// pure predicates so the whole flow is unit-testable without a DOM.

import { stripHtml, type CanvasDocument } from '@node-canvas/core';

export type TutorialLatches = {
  /** The palette was opened at least once while the tour ran. */
  paletteSeen: boolean;
};

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector to spotlight; null centers the card with no spotlight. */
  target: string | null;
  /** True once the user performed the action (auto-advance). null = manual. */
  done: ((document: CanvasDocument, latches: TutorialLatches) => boolean) | null;
};

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Node Canvas',
    body: 'An infinite canvas of typed nodes and meaningful connections. This tour takes about two minutes, and every step waits for you to actually do the thing.',
    target: null,
    done: null,
  },
  {
    id: 'add-node',
    title: 'Add your first node',
    body: 'Click Add node in the top-left and pick a Note from the gallery.',
    target: '.toolbar-add .toolbar-button',
    done: (document) => document.nodes.length >= 1,
  },
  {
    id: 'write',
    title: 'Write something',
    body: 'Click into the node body and type a thought. Nodes grow with their text.',
    target: '.react-flow__node-canvas',
    done: (document) =>
      document.nodes.some(
        (node) =>
          (typeof node.data.content === 'string' &&
            stripHtml(node.data.content).trim() !== '') ||
          (typeof node.data.title === 'string' && node.data.title.trim() !== ''),
      ),
  },
  {
    id: 'second-node',
    title: 'Add a second node',
    body: 'Open Add node again — any type you like. Notice it never lands on top of the first.',
    target: '.toolbar-add .toolbar-button',
    done: (document) => document.nodes.length >= 2,
  },
  {
    id: 'connect',
    title: 'Connect them',
    body: 'Drag from the small DIAMOND at the top of a side rail onto the other node. Plain connections work between every pair of types, zero setup.',
    target: '.react-flow__node-canvas',
    done: (document) => document.edges.length >= 1,
  },
  {
    id: 'group',
    title: 'Group them',
    body: 'Click one node, Ctrl-click the other, then press "Group 2" in the bottom-left toolbar. Groups hold references — nodes are never trapped inside.',
    target: '.toolbar',
    done: (document) => document.assemblies.length >= 1,
  },
  {
    id: 'palette',
    title: 'The command palette',
    body: 'Press Ctrl+K. Type a few letters to jump to any node — or type a fresh thought and capture it into the Workbench without your camera ever moving.',
    target: null,
    done: (_document, latches) => latches.paletteSeen,
  },
  {
    id: 'finish',
    title: 'That is the core of it',
    body: 'Data wires, tentative ideas, the writing spine, and the packs all build on what you just did. The ? button in the bottom-left holds the reference card and replays this tour.',
    target: null,
    done: null,
  },
];
