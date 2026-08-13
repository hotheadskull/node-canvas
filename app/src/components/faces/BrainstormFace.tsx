import { useState } from 'react';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { EXTRACT_TYPES, type FaceProps } from './index';

export interface BrainstormTopic {
  id: string;
  type: string;
  title: string;
  content: string;
}

const TOPIC_TYPES = [
  { id: 'person', label: 'Character' },
  { id: 'place', label: 'Location' },
  { id: 'event', label: 'Event' },
  { id: 'note', label: 'Note' },
];

export function BrainstormFace({ nodeId, content }: FaceProps) {
  const store = useCanvasStore();
  const node = store.document.nodes.find((n) => n.id === nodeId);
  const topics = (node?.data.topics as BrainstormTopic[]) || [];
  
  const [menuOpen, setMenuOpen] = useState(false);

  if (!node) return null;

  const addTopic = (type: string) => {
    const newTopic: BrainstormTopic = {
      id: Math.random().toString(36).slice(2, 9),
      type,
      title: '',
      content: '',
    };
    store.setNodeField(nodeId, 'topics', [...topics, newTopic]);
    setMenuOpen(false);
  };

  const updateTopic = (id: string, field: 'title' | 'content', val: string) => {
    const next = topics.map(t => t.id === id ? { ...t, [field]: val } : t);
    store.setNodeField(nodeId, 'topics', next);
  };

  const deleteTopic = (id: string) => {
    store.setNodeField(nodeId, 'topics', topics.filter(t => t.id !== id));
  };

  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  return (
    <div className="canvas-node-body brainstorm-face">
      <div className="brainstorm-dump">
        <LazyRichText
          value={content}
          onChange={(html) => store.setNodeContent(nodeId, html)}
          placeholder="Dump thoughts, ideas, and brain flow here..."
          variant="inline"
          onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
          extractTypes={EXTRACT_TYPES}
        />
      </div>
      
      <div className="brainstorm-divider">
        <span className="brainstorm-divider-label">TOPICS</span>
        <div className="brainstorm-add-menu">
          <button 
            className="brainstorm-add-btn" 
            onClick={() => setMenuOpen(!menuOpen)}
            title="Add a subnode topic"
          >
            <Plus size={14} /> Add Topic
          </button>
          {menuOpen && (
            <div className="brainstorm-menu-dropdown">
              {TOPIC_TYPES.map(t => (
                <button key={t.id} onClick={() => addTopic(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="brainstorm-topics">
        {topics.length === 0 && (
          <div className="brainstorm-empty-topics">No topics yet.</div>
        )}
        {topics.map(topic => (
          <div key={topic.id} className="brainstorm-topic-card nodrag">
            <div className="brainstorm-topic-header">
              <span className="brainstorm-topic-type">{topic.type}</span>
              <div className="brainstorm-topic-actions">
                <button 
                  onClick={() => store.extractBrainstormTopic(nodeId, topic)}
                  title="Extract to Canvas"
                  className="brainstorm-extract-btn"
                >
                  <ExternalLink size={12} />
                  Extract
                </button>
                <button 
                  onClick={() => deleteTopic(topic.id)}
                  title="Delete"
                  className="brainstorm-delete-btn"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <input 
              type="text" 
              placeholder="Title..." 
              value={topic.title}
              onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
              className="brainstorm-topic-title"
            />
            <textarea 
              placeholder="Notes..."
              value={topic.content}
              onChange={(e) => updateTopic(topic.id, 'content', e.target.value)}
              className="brainstorm-topic-notes"
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
