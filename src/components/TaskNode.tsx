import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { BaseNode } from './BaseNode';

export const TaskNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
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
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={180}
      minHeight={150}
      icon={CheckSquare}
      accentColor="#fb923c"
      headerTitlePlaceholder="Task List..."
      showFunction={true}
      showTags={true}
      headerRight={
        <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 bg-black/20 px-1.5 py-0.5 rounded border border-[#333] ml-2">
          {completedCount}/{tasks.length}
        </span>
      }
    >
      {/* Task List */}
      <div className="flex flex-col flex-1 min-h-0 bg-[#1a1a24]/50 py-1 overflow-y-auto">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center group px-3 py-1 hover:bg-black/20 transition-colors">
            <button 
              onClick={() => handleTaskChange(i, 'completed', !task.completed)}
              className={`flex-shrink-0 mr-2 transition-colors ${task.completed ? 'text-[#34d399]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {task.completed ? <CheckSquare size={12} /> : <div className="w-3 h-3 border border-gray-500 rounded-sm" />}
            </button>
            <input
              type="text"
              className={`w-full bg-transparent text-xs focus:outline-none transition-colors
                ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}
              `}
              placeholder="Enter task..."
              value={task.label}
              onChange={(e) => handleTaskChange(i, 'label', e.target.value)}
            />
            <button 
              onClick={() => removeTask(i)} 
              className="flex-shrink-0 ml-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <div className="px-3 pb-1 mt-1">
          <button 
            onClick={addTask}
            className="w-full py-1 border border-dashed border-[#fb923c] text-[#fb923c] rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-[#fb923c]/20 transition-colors"
          >
            <Plus size={10} /> Add Task
          </button>
        </div>
      </div>

      {/* Progress Bar Footer */}
      <div className="h-1 w-full bg-[#1a1a24] relative mt-auto">
        <div 
          className="absolute top-0 left-0 h-full bg-[#fb923c] transition-all shadow-lg duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </BaseNode>
  );
});
