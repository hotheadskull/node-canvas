import { useEffect, useState, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useStore } from '../store/useStore';

// First step of each lesson. Resuming or skipping always lands on one of
// these: the gated steps in between assume UI state (an open menu, a node
// that was just created) that won't exist on re-entry.
const LESSON_STARTS = [0, 1, 3, 6, 10, 12, 15, 18, 21, 22, 23];
const TOTAL_STEPS = 24;
const lessonStartAtOrBefore = (s: number) => {
  for (let i = LESSON_STARTS.length - 1; i >= 0; i--) {
    if (LESSON_STARTS[i] <= s) return LESSON_STARTS[i];
  }
  return 0;
};
const nextLessonAfter = (s: number) => LESSON_STARTS.find(l => l > s) ?? TOTAL_STEPS - 1;

export function TutorialOverlay() {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const driverRef = useRef<any>(null);
  
  const projects = useStore(state => state.projects);
  const nodes = useStore(state => state.nodes);
  const edges = useStore(state => state.edges);
  const isWarpFocusOpen = useStore(state => !!state.focusedNodeId);
  
  const startPCount = useRef(0);
  const startNCount = useRef(0);
  const startECount = useRef(0);

  // Track menus opening
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);

  useEffect(() => {
    driverRef.current = driver({
      allowClose: false,
      animate: true,
      popoverClass: 'tutorial-popover',
      onDestroyed: () => {
        setIsActive(false);
        setStepIndex(-1);
        localStorage.setItem('hasSeenTutorial', 'true');
      }
    });

    const handleOpen = (e?: any) => {
      const state = useStore.getState();
      startPCount.current = state.projects.length;
      startNCount.current = state.nodes.length;
      startECount.current = state.edges.length;
      setIsActive(true);
      // "Replay Tutorial" (fresh: true) always starts from the top; only the
      // automatic first-launch open resumes a previously interrupted run.
      if (e?.detail?.fresh) {
        localStorage.removeItem('tutorialStep');
        setStepIndex(0);
        return;
      }
      const saved = parseInt(localStorage.getItem('tutorialStep') || '0', 10);
      setStepIndex(lessonStartAtOrBefore(Number.isFinite(saved) ? saved : 0));
    };

    const handleAction = (e: any) => {
      if (e.detail?.action === 'workspace-menu') setIsWorkspaceMenuOpen(e.detail.isOpen);
      if (e.detail?.action === 'node-menu') setIsNodeMenuOpen(e.detail.isOpen);
    };

    window.addEventListener('open-tutorial', handleOpen);
    window.addEventListener('tutorial-action', handleAction);
    
    if (localStorage.getItem('hasSeenTutorial') !== 'true') {
      setTimeout(handleOpen, 500);
    }
    return () => {
      window.removeEventListener('open-tutorial', handleOpen);
      window.removeEventListener('tutorial-action', handleAction);
      driverRef.current?.destroy();
    };
  }, []);

  // Remember progress so closing (or crashing) mid-tutorial resumes at the
  // same lesson next time instead of restarting from zero
  useEffect(() => {
    if (isActive && stepIndex > 0 && stepIndex < TOTAL_STEPS - 1) {
      localStorage.setItem('tutorialStep', String(stepIndex));
    }
  }, [isActive, stepIndex]);

  // Baseline the edge count when the connect lesson starts so step 10 can
  // auto-advance the moment the user actually draws the link
  useEffect(() => {
    if (stepIndex === 10) startECount.current = useStore.getState().edges.length;
  }, [stepIndex]);

  // Handle auto-advancing based on user actions
  useEffect(() => {
    if (!isActive) return;

    if (stepIndex === 1 && isWorkspaceMenuOpen) setStepIndex(2);
    if (stepIndex === 2 && projects.length > startPCount.current) setTimeout(() => setStepIndex(3), 300);

    if ((stepIndex === 3 || stepIndex === 6 || stepIndex === 12 || stepIndex === 15 || stepIndex === 18) && isNodeMenuOpen) {
      setStepIndex(stepIndex + 1);
      startNCount.current = nodes.length;
    }

    if ((stepIndex === 4 || stepIndex === 7 || stepIndex === 13 || stepIndex === 16 || stepIndex === 19) && nodes.length > startNCount.current) {
      setTimeout(() => setStepIndex(stepIndex + 1), 300);
    }

    if (stepIndex === 8 && isWarpFocusOpen) setTimeout(() => setStepIndex(9), 300);
    if (stepIndex === 9 && !isWarpFocusOpen) setTimeout(() => setStepIndex(10), 300);
    if (stepIndex === 10 && edges.length > startECount.current) setTimeout(() => setStepIndex(11), 300);

    const onNext = () => setStepIndex(s => s + 1);
    // "Skip lesson" on action-gated steps: jump to the next lesson start so
    // a user who can't complete an action is never stranded mid-tutorial
    const onSkip = () => setStepIndex(s => nextLessonAfter(s));
    const skippable = {
      showButtons: ['next', 'close'] as any,
      nextBtnText: 'Skip lesson',
      onNextClick: onSkip,
    };

    const steps: DriveStep[] = [
      { // 0
        popover: {
          title: 'Welcome to Node Canvas',
          description: "Let's build a universe. This quick 2-minute tutorial will show you the ropes.",
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 1
        element: '#workspace-manager-btn',
        popover: {
          title: 'Open the Workspace Manager',
          description: "Everything you make lives in a Workspace. Click here to open the Workspace Manager.",
          side: "bottom",
          align: 'start',
          ...skippable
        }
      },
      { // 2
        element: '#workspace-dropdown',
        popover: {
          title: 'Create your Workspace',
          description: "Click '+ Create New Workspace' at the bottom. Type a name and click Create.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 3
        element: '#add-node-btn',
        popover: {
          title: 'Add a Main Concept',
          description: "Let's start building. Click '+ Add Node' to open the menu.",
          side: "bottom",
          align: 'end',
          ...skippable
        }
      },
      { // 4
        element: '#create-node-dropdown',
        popover: {
          title: 'Select "Main Concept"',
          description: "Click 'Main Concept' (the golden node) under Writing Surfaces. This represents the overarching idea of your project.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 5
        element: '#canvas-area',
        popover: {
          title: 'Rename it & Write',
          description: "Double-click the node's title to rename it. Click inside the node body to type a sentence. Then click 'Next'.",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 6
        element: '#add-node-btn',
        popover: {
          title: 'Add a Document',
          description: "Now let's add a place to write. Click '+ Add Node'.",
          side: "bottom",
          align: 'end',
          ...skippable
        }
      },
      { // 7
        element: '#create-node-dropdown',
        popover: {
          title: 'Select "Document"',
          description: "Click 'Document' under Writing Surfaces. This is a large writing canvas.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 8
        element: '#canvas-area',
        popover: {
          title: 'Warp Focus',
          description: "Notice the 'Expand' button in the bottom right of the Document? That opens Warp Focus, a distraction-free fullscreen editor. Click it now to enter focus mode!",
          side: "top",
          align: 'center',
          ...skippable
        }
      },
      { // 9
        element: '.warp-overlay-content',
        popover: {
          title: 'Distraction Free',
          description: "This is Warp Focus. It's just you and the text. Click '✕ Close' in the top right to return to the canvas.",
          side: "bottom",
          align: 'center',
          ...skippable
        }
      },
      { // 10
        element: '#canvas-area',
        popover: {
          title: 'Connect them',
          description: "Click and drag any of the connector dots on the edge of your Main Concept to your Document to connect them. The tutorial advances the moment the link forms (or click 'Next' if you're stuck).",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 11
        element: '#canvas-area',
        popover: {
          title: 'Edit the Connection',
          description: "Click the connecting line! You can type a label in the middle, and click the line itself to cycle through different edge types and animations. Then click 'Next'.",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 12
        element: '#add-node-btn',
        popover: {
          title: 'Add a Person',
          description: "Let's add some context. Click '+ Add Node'.",
          side: "bottom",
          align: 'end',
          showButtons: ['close']
        }
      },
      { // 13
        element: '#create-node-dropdown',
        popover: {
          title: 'Select "Person / Entity"',
          description: "Look under 'Knowledge Cards' and select 'Person / Entity'.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 14
        element: '#canvas-area',
        popover: {
          title: 'Spiderweb Auto-Linking',
          description: "If you type this Person's exact name inside your Document, the canvas will automatically draw a glowing golden link between them. Click 'Next'.",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 15
        element: '#add-node-btn',
        popover: {
          title: 'Add a Sequence',
          description: "Let's map out a flow. Click '+ Add Node'.",
          side: "bottom",
          align: 'end',
          showButtons: ['close']
        }
      },
      { // 16
        element: '#create-node-dropdown',
        popover: {
          title: 'Select "Sequence"',
          description: "Look under 'Structure & Flow' and select 'Sequence'.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 17
        element: '#canvas-area',
        popover: {
          title: 'Sequence Node',
          description: "Click the '+' button inside the Sequence node to add a few beats. You can drag connections directly from these beats to your characters or documents! Click 'Next'.",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 18
        element: '#add-node-btn',
        popover: {
          title: 'Add a Group Zone',
          description: "Let's organize. Click '+ Add Node'.",
          side: "bottom",
          align: 'end',
          showButtons: ['close']
        }
      },
      { // 19
        element: '#create-node-dropdown',
        popover: {
          title: 'Select "Group Zone"',
          description: "Look under 'Structure & Flow' and select 'Group Zone'.",
          side: "right",
          align: 'start',
          ...skippable
        }
      },
      { // 20
        element: '#canvas-area',
        popover: {
          title: 'Group Zone',
          description: "This is a visual container. You can resize it and drag your Document and Person inside it to keep your canvas tidy. Click 'Next'.",
          side: "top",
          align: 'center',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 21
        element: '#canvas-search-wrapper',
        popover: {
          title: 'Find Anything',
          description: "If your universe gets massive, use this search bar to instantly fly to any node. Click 'Next'.",
          side: "bottom",
          align: 'end',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 22
        element: '#workspace-manager-btn',
        popover: {
          title: 'Tips & Reference',
          description: "This Workspace menu contains a 'Tips & Reference' guide. It explains every node type and mechanic in detail. Click 'Next'.",
          side: "bottom",
          align: 'start',
          showButtons: ['next'],
          onNextClick: onNext
        }
      },
      { // 23
        popover: {
          title: 'Done',
          description: "That's everything you need. You're ready to build out your universe!",
          showButtons: ['next'],
          onNextClick: () => {
            localStorage.removeItem('tutorialStep');
            driverRef.current?.destroy();
          }
        }
      }
    ];

    const currentStep = steps[stepIndex];
    if (currentStep) {
      // Progress footer so users always know how far along they are
      if (currentStep.popover) {
        currentStep.popover.description =
          `${currentStep.popover.description || ''}` +
          `<div style="margin-top:10px;opacity:0.5;font-size:10px;font-weight:700;letter-spacing:0.08em;">STEP ${stepIndex + 1} OF ${steps.length}</div>`;
      }
      setTimeout(() => {
        driverRef.current?.highlight(currentStep);
      }, 100);
    } else {
      driverRef.current?.destroy();
    }
  }, [stepIndex, isActive, projects.length, nodes.length, edges.length, isWorkspaceMenuOpen, isNodeMenuOpen, isWarpFocusOpen]);

  return null;
}
