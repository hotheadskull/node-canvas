// FLOW & LOGIC faces (design direction §14). These are the one place the
// canvas *reasons* about what is connected rather than just drawing it, so
// each face shows a real derivation from core/src/logic.ts -- never a
// decorative label. Everything is read-only except a Sequence's order and a
// Filter's kind, both stored on the node (I10: order is data).

import {
  filterPasses,
  gateVerdict,
  logicWiring,
  nodeLabel,
  reorderSteps,
  sequenceSteps,
  type LogicNeighbor,
} from '@node-canvas/core';
import {
  Activity,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  GitBranch,
  GitCommit,
  GitCompare,
  GitMerge,
  IterationCcw,
  Settings2,
  Split,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';

/** Shared chrome: the type's glyph and name, then whatever it derives. */
function LogicShell({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="canvas-node-body canvas-node-logic" data-face="logic">
      <div className="logic-header">
        <Icon size={13} className="logic-icon" aria-hidden />
        <span className="logic-title">{title}</span>
        {hint && <span className="logic-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** "Nothing wired yet" states say what to DO, not just that it's empty. */
function Empty({ children }: { children: ReactNode }) {
  return <p className="logic-empty">{children}</p>;
}

function NeighborRow({ entry }: { entry: LogicNeighbor }) {
  return (
    <span className="logic-row">
      <span className="logic-row-title">{entry.title}</span>
      {entry.edgeLabel && <em className="logic-row-label">{entry.edgeLabel}</em>}
    </span>
  );
}

/** SEQUENCE -- the direction calls this the most promising flow node, so it
 * is the one that actually does something: a numbered running order over
 * everything it touches, reorderable, stored as data on the node. */
export function SequenceFace({ nodeId }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeField = useCanvasStore((state) => state.setNodeField);
  const steps = useMemo(() => sequenceSteps(document, nodeId), [document, nodeId]);

  const move = (targetId: string, delta: number) => {
    const currentOrder = steps.map((step) => step.nodeId);
    const from = currentOrder.indexOf(targetId);
    setNodeField(nodeId, 'stepOrder', reorderSteps(currentOrder, targetId, from + delta));
  };

  return (
    <LogicShell icon={IterationCcw} title="Sequence" hint={steps.length > 0 ? `${steps.length} steps` : undefined}>
      {steps.length === 0 ? (
        <Empty>Connect nodes to put them in order.</Empty>
      ) : (
        <ol className="logic-steps nodrag" data-sequence>
          {steps.map((step, index) => (
            <li key={step.nodeId} className="logic-step">
              <span className="logic-step-n">{String(index + 1).padStart(2, '0')}</span>
              <NeighborRow entry={step} />
              <span className="logic-step-move">
                <button
                  aria-label={`Move ${step.title} earlier`}
                  disabled={index === 0}
                  onClick={() => move(step.nodeId, -1)}
                >
                  <ChevronUp size={11} aria-hidden />
                </button>
                <button
                  aria-label={`Move ${step.title} later`}
                  disabled={index === steps.length - 1}
                  onClick={() => move(step.nodeId, 1)}
                >
                  <ChevronDown size={11} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </LogicShell>
  );
}

/** DECISION / CONDITION -- one thing comes in, several ways out. The edge
 * label on each outgoing connection IS the branch condition. */
function BranchFace({ nodeId, icon, title, prompt }: FaceProps & { icon: LucideIcon; title: string; prompt: string }) {
  const document = useCanvasStore((state) => state.document);
  const { inputs, outputs } = useMemo(() => logicWiring(document, nodeId), [document, nodeId]);
  return (
    <LogicShell icon={icon} title={title}>
      {inputs.length > 0 && (
        <div className="logic-group">
          <p className="logic-kicker">On</p>
          {inputs.map((entry) => <NeighborRow key={entry.edgeId} entry={entry} />)}
        </div>
      )}
      {outputs.length === 0 ? (
        <Empty>{prompt}</Empty>
      ) : (
        <div className="logic-group">
          <p className="logic-kicker">Branches</p>
          {outputs.map((entry) => (
            <span key={entry.edgeId} className="logic-row is-branch">
              <ArrowDown size={10} aria-hidden className="logic-branch-arrow" />
              <span className="logic-row-title">{entry.title}</span>
              <em className="logic-row-label">{entry.edgeLabel ?? 'label this wire'}</em>
            </span>
          ))}
        </div>
      )}
    </LogicShell>
  );
}

export function DecisionFace(props: FaceProps) {
  return <BranchFace {...props} icon={GitBranch} title="Decision" prompt="Wire out one branch per choice; label each wire." />;
}
export function ConditionFace(props: FaceProps) {
  return <BranchFace {...props} icon={Settings2} title="Condition" prompt="Wire out the then and else paths." />;
}

/** AND / OR / NOT -- judged on whether their inputs have content yet. An
 * empty gate reads UNKNOWN, never "failing". */
function GateFace({ nodeId, gate, title, icon }: FaceProps & { gate: 'and' | 'or' | 'not'; title: string; icon: LucideIcon }) {
  const document = useCanvasStore((state) => state.document);
  const verdict = useMemo(() => gateVerdict(document, nodeId, gate), [document, nodeId, gate]);
  const { inputs } = useMemo(() => logicWiring(document, nodeId), [document, nodeId]);
  const state = verdict.satisfied === null ? 'unknown' : verdict.satisfied ? 'met' : 'unmet';
  return (
    <LogicShell icon={icon} title={title}>
      <p className={`logic-verdict is-${state}`} data-gate-state={state}>
        {verdict.total > 0 && (
          <span className="logic-verdict-count">
            {verdict.met}/{verdict.total}
          </span>
        )}
        {verdict.reason}
      </p>
      {inputs.length > 0 && (
        <div className="logic-group">
          {inputs.map((entry) => <NeighborRow key={entry.edgeId} entry={entry} />)}
        </div>
      )}
    </LogicShell>
  );
}

export function AndFace(props: FaceProps) { return <GateFace {...props} gate="and" title="AND" icon={GitCommit} />; }
export function OrFace(props: FaceProps) { return <GateFace {...props} gate="or" title="OR" icon={GitCommit} />; }
export function NotFace(props: FaceProps) { return <GateFace {...props} gate="not" title="NOT" icon={GitCommit} />; }

/** COMPARE -- two things side by side, which is the whole point. */
export function CompareFace({ nodeId }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const { inputs } = useMemo(() => logicWiring(document, nodeId), [document, nodeId]);
  return (
    <LogicShell icon={GitCompare} title="Compare" hint={inputs.length > 2 ? `${inputs.length} in` : undefined}>
      {inputs.length < 2 ? (
        <Empty>Wire in two or more things to compare.</Empty>
      ) : (
        <div className="logic-compare nodrag" data-compare>
          {inputs.map((entry) => (
            <span key={entry.edgeId} className="logic-compare-cell">
              {entry.title}
              {entry.edgeLabel && <em>{entry.edgeLabel}</em>}
            </span>
          ))}
        </div>
      )}
    </LogicShell>
  );
}

/** MERGE / SPLIT / TRANSFORM -- fan-in, fan-out, and in-to-out. */
function FlowFace({ nodeId, icon, title, inLabel, outLabel, prompt }: FaceProps & {
  icon: LucideIcon; title: string; inLabel: string; outLabel: string; prompt: string;
}) {
  const document = useCanvasStore((state) => state.document);
  const { inputs, outputs } = useMemo(() => logicWiring(document, nodeId), [document, nodeId]);
  if (inputs.length === 0 && outputs.length === 0) {
    return <LogicShell icon={icon} title={title}><Empty>{prompt}</Empty></LogicShell>;
  }
  return (
    <LogicShell icon={icon} title={title}>
      {inputs.length > 0 && (
        <div className="logic-group">
          <p className="logic-kicker">{inLabel}</p>
          {inputs.map((entry) => <NeighborRow key={entry.edgeId} entry={entry} />)}
        </div>
      )}
      {outputs.length > 0 && (
        <div className="logic-group">
          <p className="logic-kicker">{outLabel}</p>
          {outputs.map((entry) => <NeighborRow key={entry.edgeId} entry={entry} />)}
        </div>
      )}
    </LogicShell>
  );
}

export function MergeFace(props: FaceProps) {
  return <FlowFace {...props} icon={GitMerge} title="Merge" inLabel="Combining" outLabel="Into" prompt="Wire in the paths to combine." />;
}
export function SplitFace(props: FaceProps) {
  return <FlowFace {...props} icon={Split} title="Split" inLabel="From" outLabel="Into" prompt="Wire out the paths to branch into." />;
}
export function TransformFace(props: FaceProps) {
  return <FlowFace {...props} icon={Activity} title="Transform" inLabel="From" outLabel="Becomes" prompt="Wire what goes in and what it becomes." />;
}

/** FILTER -- keeps only the inputs of a chosen type. Unset passes all, so a
 * new Filter shows its whole input rather than looking broken. */
export function FilterFace({ nodeId }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeField = useCanvasStore((state) => state.setNodeField);
  const { kept, dropped, filterType } = useMemo(
    () => filterPasses(document, nodeId),
    [document, nodeId],
  );
  // only offer kinds actually wired in -- a list of 39 types helps nobody
  const availableTypes = useMemo(() => {
    const seen = new Set([...kept, ...dropped].map((entry) => entry.type));
    return [...seen].sort();
  }, [kept, dropped]);

  return (
    <LogicShell icon={Workflow} title="Filter">
      <label className="logic-filter-picker nodrag">
        <span>Keep</span>
        <select
          value={filterType ?? ''}
          aria-label="Filter by type"
          onChange={(event) => setNodeField(nodeId, 'filterType', event.target.value)}
        >
          <option value="">everything</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {nodeLabel(type, 'universal')}
            </option>
          ))}
        </select>
      </label>
      {kept.length === 0 && dropped.length === 0 ? (
        <Empty>Wire things in to filter them.</Empty>
      ) : (
        <div className="logic-group">
          {kept.map((entry) => <NeighborRow key={entry.edgeId} entry={entry} />)}
          {dropped.length > 0 && (
            <p className="logic-dropped">{dropped.length} filtered out</p>
          )}
        </div>
      )}
    </LogicShell>
  );
}
