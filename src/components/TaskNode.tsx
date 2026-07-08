import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import { useStore } from '../store/useStore';

export const TaskNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const tasks: { label: string, completed: boolean }[] = data.metadata?.tasks || [];

  const updateMetadata = (newMetadata: any) => {
    updateNodeData(id, {
      metadata: { ...(data.metadata || {}), ...newMetadata }
    });
  };

  const handleTaskChange = (index: number, field: 'label' | 'completed', val: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: val };
    updateMetadata({ tasks: newTasks });
  };

  const addTask = () => {
    updateMetadata({ tasks: [...tasks, { label: '', completed: false }] });
  };

  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    updateMetadata({ tasks: newTasks });
  };

  // Calculate progress
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <>
      <NodeResizer minWidth={250} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-[#fb923c] rounded" />
      <div className="relative w-full h-full">
        <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 bg-[#fb923c] border-2 border-[#111114] rounded-full z-50 -top-2" />
        
        <div className={`relative w-full h-full flex flex-col bg-[#111114] text-white rounded-md shadow-2xl transition-colors shadow-lg duration-200 overflow-hidden border
        ${selected ? 'border-[#fb923c] scale-[1.02]' : 'border-[#9a3412]'}
      `} style={{ 
        boxShadow: selected ? '0 20px 40px rgba(251,146,60,0.2)' : '0 10px 30px rgba(0,0,0,0.5)',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(50% - 10px), calc(100% - 6px) 50%, 100% calc(50% + 10px), 100% 100%, 0 100%, 0 calc(50% + 10px), 6px 50%, 0 calc(50% - 10px))'
      }}>
      
      {/* Title Header */}
      <div className="bg-[#16161c] px-4 py-3 border-b border-[#2a2a35] flex items-center justify-between">
        <input
          type="text"
          className="bg-transparent text-sm font-bold text-[#fb923c] focus:outline-none w-full tracking-wide"
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Task List Name..."
        />
        <span className="text-xs font-mono text-gray-500">{completedCount}/{tasks.length}</span>
      </div>

      {/* Task List */}
      <div className="flex flex-col flex-1 bg-[#111114] py-2 overflow-y-auto">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center group px-3 py-1.5 hover:bg-[#1a1a24] transition-colors">
            <button 
              onClick={() => handleTaskChange(i, 'completed', !task.completed)}
              className={`flex-shrink-0 mr-3 transition-colors ${task.completed ? 'text-[#34d399]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {task.completed ? <CheckSquare size={16} /> : <div className="w-4 h-4 border border-gray-500 rounded-sm" />}
            </button>
            <input
              type="text"
              className={`w-full bg-transparent text-sm focus:outline-none transition-colors shadow-lg
                ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}
              `}
              placeholder="Enter task..."
              value={task.label}
              onChange={(e) => handleTaskChange(i, 'label', e.target.value)}
            />
            <button 
              onClick={() => removeTask(i)} 
              className="flex-shrink-0 ml-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button 
          onClick={addTask} 
          className="mx-3 mt-2 py-1.5 flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#9a3412] hover:text-[#fb923c] border border-dashed border-[#9a3412] hover:border-[#fb923c] rounded transition-colors"
        >
          <Plus size={12} /> Add Item
        </button>
      </div>

      {/* Progress Bar Footer */}
      <div className="h-1.5 w-full bg-[#1a1a24] relative">
        <div 
          className="absolute top-0 left-0 h-full bg-[#fb923c] transition-colors shadow-lg duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 bg-[#fb923c] border-2 border-[#111114] rounded-full z-50 -bottom-2" />
      </div>
    </div>
    </>
  );
});
