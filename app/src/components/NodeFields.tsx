import { memo, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { CustomField, CustomFieldType } from './CanvasNode';
import { Plus, X } from 'lucide-react';

type Props = {
  nodeId: string;
  fields: CustomField[];
};

const FIELD_TYPES: { type: CustomFieldType; label: string }[] = [
  { type: 'text', label: 'Short text' },
  { type: 'longtext', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date/time' },
  { type: 'boolean', label: 'Checkbox' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'multiselect', label: 'Multi-select' },
  { type: 'color', label: 'Color' },
  { type: 'image', label: 'Image' },
  { type: 'url', label: 'URL' },
  { type: 'rating', label: 'Rating' },
  { type: 'reference', label: 'Node reference' },
];

function NodeFieldsComponent({ nodeId, fields }: Props) {
  const updateCustomField = useCanvasStore((state) => state.updateCustomField);
  const removeCustomField = useCanvasStore((state) => state.removeCustomField);
  const addCustomField = useCanvasStore((state) => state.addCustomField);

  const [isAdding, setIsAdding] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [selectedType, setSelectedType] = useState<CustomFieldType | null>(null);
  const [optionsInput, setOptionsInput] = useState('');

  const resetForm = () => {
    setNewFieldName('');
    setSelectedType(null);
    setOptionsInput('');
    setIsAdding(false);
  };

  const handleAddField = (type: CustomFieldType) => {
    if (!newFieldName.trim()) return;
    if (type === 'dropdown' || type === 'multiselect') {
      setSelectedType(type);
      return; // wait for options input
    }
    commitField(type);
  };

  const commitField = (type: CustomFieldType, optionsStr?: string) => {
    let options: string[] | undefined;
    if ((type === 'dropdown' || type === 'multiselect') && optionsStr) {
      options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
    }
    addCustomField(nodeId, {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type,
      value: type === 'boolean' ? false : '',
      // omit the key entirely when there are no choices: an explicit
      // `undefined` is not a valid CustomField under exactOptionalPropertyTypes
      ...(options ? { options } : {}),
    });
    resetForm();
  };

  // Field values are a union (string | number | boolean | string[]) because
  // one schema covers twelve field kinds; DOM inputs only take text, so the
  // text-ish branches funnel through here rather than casting at each site.
  const asText = (value: CustomField['value']): string =>
    value === undefined || value === null || value === false
      ? ''
      : Array.isArray(value)
        ? value.join(', ')
        : String(value);

  const renderFieldInput = (field: CustomField) => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'image':
      case 'reference': // simple text for MVP
        return (
          <input
            type="text"
            className="node-field-input"
            value={asText(field.value)}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
            placeholder="..."
          />
        );
      case 'longtext':
        return (
          <textarea
            className="node-field-input"
            value={asText(field.value)}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
            placeholder="..."
            rows={2}
          />
        );
      case 'number':
      case 'rating':
        return (
          <input
            type="number"
            className="node-field-input"
            value={asText(field.value)}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
            placeholder="0"
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            className="node-field-checkbox"
            checked={!!field.value}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.checked)}
          />
        );
      case 'date':
        return (
          <input
            type="datetime-local"
            className="node-field-input"
            value={asText(field.value)}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
          />
        );
      case 'color':
        return (
          <input
            type="color"
            className="node-field-input node-field-color"
            value={asText(field.value) || '#000000'}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
          />
        );
      case 'dropdown':
      case 'multiselect':
        return (
          <select
            className="node-field-input"
            value={asText(field.value)}
            onChange={(e) => updateCustomField(nodeId, field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="node-fields-container nodrag">
      {fields.map((field) => (
        <div key={field.id} className="node-field-row">
          <label className="node-field-label" title={field.name}>{field.name}</label>
          <div className="node-field-value">
            {renderFieldInput(field)}
          </div>
          <button 
            className="node-field-delete" 
            onClick={() => removeCustomField(nodeId, field.id)}
            title="Remove field"
          >
            <X size={10} />
          </button>
        </div>
      ))}
      
      <div className="node-field-adder">
        {isAdding ? (
          <div className="node-field-adder-form">
            {!selectedType ? (
              <>
                <input
                  type="text"
                  autoFocus
                  className="node-field-adder-input"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Field name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') resetForm();
                  }}
                />
                {newFieldName.trim() && (
                  <div className="node-field-type-selector">
                    {FIELD_TYPES.map((ft) => (
                      <button
                        key={ft.type}
                        onClick={() => handleAddField(ft.type)}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="node-field-options-input">
                <input
                  type="text"
                  autoFocus
                  className="node-field-adder-input"
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                  placeholder="Options (comma separated)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') resetForm();
                    if (e.key === 'Enter') commitField(selectedType, optionsInput);
                  }}
                />
                <button 
                  className="node-field-add-btn" 
                  onClick={() => commitField(selectedType, optionsInput)}
                >
                  Save Options
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="node-field-add-btn" onClick={() => setIsAdding(true)}>
            <Plus size={10} /> Add Property
          </button>
        )}
      </div>
    </div>
  );
}

export const NodeFields = memo(NodeFieldsComponent);
