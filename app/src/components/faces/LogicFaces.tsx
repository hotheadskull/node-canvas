import { EXTRACT_TYPES, type FaceProps } from './index';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { Split, GitMerge, GitBranch, GitCommit, Settings2, GitCompare, IterationCcw, Activity } from 'lucide-react';

function LogicFaceBase({ nodeId, content, icon: Icon, title, placeholder }: FaceProps & { icon: any, title: string, placeholder: string }) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  
  return (
    <div className="canvas-node-body canvas-node-logic">
      <div className="logic-header">
        <Icon size={14} className="logic-icon" />
        <span className="logic-title">{title}</span>
      </div>
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder={placeholder}
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
    </div>
  );
}

export function SequenceFace(props: FaceProps) { return <LogicFaceBase {...props} icon={IterationCcw} title="Sequence" placeholder="Next step..." /> }
export function DecisionFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitBranch} title="Decision" placeholder="Branch on..." /> }
export function ConditionFace(props: FaceProps) { return <LogicFaceBase {...props} icon={Settings2} title="Condition" placeholder="If / Then / Else..." /> }
export function AndFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitCommit} title="AND" placeholder="All must be true..." /> }
export function OrFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitCommit} title="OR" placeholder="Any can be true..." /> }
export function NotFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitCommit} title="NOT" placeholder="Must be false..." /> }
export function CompareFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitCompare} title="Compare" placeholder="Comparison logic..." /> }
export function MergeFace(props: FaceProps) { return <LogicFaceBase {...props} icon={GitMerge} title="Merge" placeholder="Combine paths..." /> }
export function SplitFace(props: FaceProps) { return <LogicFaceBase {...props} icon={Split} title="Split" placeholder="Branch paths..." /> }
export function TransformFace(props: FaceProps) { return <LogicFaceBase {...props} icon={Activity} title="Transform" placeholder="Transformation logic..." /> }
export function FilterFace(props: FaceProps) { return <LogicFaceBase {...props} icon={Settings2} title="Filter" placeholder="Filter conditions..." /> }
