// The onboarding tour: a spotlight that highlights REAL UI and advances when
// the user actually performs each step's action (Next always allows skipping,
// Back returns, the counter shows where you are). Replayable from the ?
// panel. First run offers itself with a small invite card.
//
// The spotlight never blocks the canvas (pointer-events: none) and NOTHING
// here ever moves the viewport or the user's nodes (I5).

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOSED_DOCUMENT, useCanvasStore } from '../store/canvasStore';
import { TUTORIAL_STEPS, type TutorialLatches } from '../tutorial/steps';

export const TUTORIAL_DONE_KEY = 'nodecanvas.v2.tutorialDone';

type SpotRect = { left: number; top: number; width: number; height: number };

export function Tutorial() {
  const open = useCanvasStore((state) => state.tutorialOpen);
  const setOpen = useCanvasStore((state) => state.setTutorialOpen);
  // Closed tour = zero cost: subscribe to the live document only while open
  const document_ = useCanvasStore((state) => (state.tutorialOpen ? state.document : CLOSED_DOCUMENT));
  const paletteOpen = useCanvasStore((state) => state.paletteOpen);
  // The INVITE decides off the REAL canvas -- reading the closed-sentinel
  // here kept it on screen forever once nodes existed (e2e-caught: it sat
  // over a document block and ate a hover). Primitive selector = still cheap.
  const canvasEmpty = useCanvasStore(
    (state) => state.document.nodes.length === 0 && state.document.assemblies.length === 0,
  );

  const [step, setStep] = useState(0);
  const [latches, setLatches] = useState<TutorialLatches>({ paletteSeen: false });
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [inviteDismissed, setInviteDismissed] = useState(false);

  const current = TUTORIAL_STEPS[step];
  const finish = useCallback(
    (how: 'done' | 'skipped') => {
      try {
        localStorage.setItem(TUTORIAL_DONE_KEY, how);
      } catch {
        // a preference, not user data
      }
      setOpen(false);
      setStep(0);
      setLatches({ paletteSeen: false });
    },
    [setOpen],
  );

  // latch: the palette was seen while the tour ran
  useEffect(() => {
    if (open && paletteOpen) {
      setLatches((value) => (value.paletteSeen ? value : { ...value, paletteSeen: true }));
    }
  }, [open, paletteOpen]);

  // Auto-advance only when the step's condition BECOMES met while it is
  // active. A step whose action was already done on entry (the user pressed
  // Back to reread it) sits still -- Back must stick. The entry snapshot is
  // taken synchronously in render (a ref) so it can never lose the race
  // against the advance effect below.
  const entryRef = useRef<{ key: string; done: boolean }>({ key: '', done: false });
  const entryKey = `${open}:${step}`;
  if (entryRef.current.key !== entryKey) {
    const entered = TUTORIAL_STEPS[step];
    entryRef.current = {
      key: entryKey,
      done: open && entered?.done ? entered.done(document_, latches) : false,
    };
  }
  useEffect(() => {
    if (!open || !current?.done || entryRef.current.done) return;
    if (current.done(document_, latches)) {
      setStep((index) => Math.min(index + 1, TUTORIAL_STEPS.length - 1));
    }
  }, [open, current, document_, latches]);

  // spotlight tracking: re-measure the target on a light interval so the
  // highlight follows layout changes without a resize-observer web
  useEffect(() => {
    if (!open) {
      setSpot(null);
      return;
    }
    const measure = () => {
      const selector = TUTORIAL_STEPS[step]?.target;
      const element = selector ? document.querySelector(selector) : null;
      if (!element) {
        setSpot(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      const next = {
        left: Math.round(rect.left) - 6,
        top: Math.round(rect.top) - 6,
        width: Math.round(rect.width) + 12,
        height: Math.round(rect.height) + 12,
      };
      setSpot((value) =>
        value &&
        value.left === next.left &&
        value.top === next.top &&
        value.width === next.width &&
        value.height === next.height
          ? value
          : next,
      );
    };
    measure();
    const timer = setInterval(measure, 250);
    return () => clearInterval(timer);
  }, [open, step]);

  // first-run invite: fresh canvas, tour never finished or dismissed
  const invite =
    !open &&
    !inviteDismissed &&
    canvasEmpty &&
    localStorage.getItem(TUTORIAL_DONE_KEY) === null;

  if (invite) {
    return (
      <div className="tutorial-invite" data-tutorial-invite>
        <span>New here? Take the two-minute tour.</span>
        <button
          className="tutorial-invite-start"
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
        >
          Start tour
        </button>
        <button
          className="tutorial-invite-dismiss"
          onClick={() => {
            setInviteDismissed(true);
            try {
              localStorage.setItem(TUTORIAL_DONE_KEY, 'dismissed');
            } catch {
              // a preference, not user data
            }
          }}
        >
          Not now
        </button>
      </div>
    );
  }

  if (!open || !current) return null;
  const last = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="tutorial-layer" data-tutorial-step={current.id}>
      {spot && (
        <div
          className="tutorial-spotlight"
          style={{
            left: `${spot.left}px`,
            top: `${spot.top}px`,
            width: `${spot.width}px`,
            height: `${spot.height}px`,
          }}
          aria-hidden
        />
      )}
      <div
        className={`tutorial-card ${spot ? 'is-anchored' : 'is-centered'}`}
        role="dialog"
        aria-label={`Tutorial: ${current.title}`}
        // anchored cards live on the RIGHT edge at the target's height: the
        // spotlight marks the control, and the card can never sit on top of
        // the menu/toolbar the step is asking the user to click
        style={
          spot
            ? {
                left: `${Math.max(16, window.innerWidth - 356)}px`,
                top: `${Math.max(16, Math.min(spot.top, window.innerHeight - 240))}px`,
              }
            : undefined
        }
      >
        <header className="tutorial-card-header">
          <strong>{current.title}</strong>
          <button
            className="tutorial-close"
            aria-label="Leave the tour"
            onClick={() => finish('skipped')}
          >
            <X size={14} aria-hidden />
          </button>
        </header>
        <p className="tutorial-card-body">{current.body}</p>
        <footer className="tutorial-card-footer">
          <button
            className="tutorial-nav"
            disabled={step === 0}
            onClick={() => setStep((index) => Math.max(0, index - 1))}
          >
            Back
          </button>
          <span className="tutorial-counter" data-tutorial-counter>
            {`${step + 1} / ${TUTORIAL_STEPS.length}`}
          </span>
          <button
            className="tutorial-nav primary"
            onClick={() =>
              last ? finish('done') : setStep((index) => index + 1)
            }
          >
            {last ? 'Finish' : 'Next'}
          </button>
        </footer>
      </div>
    </div>
  );
}
